/**
 * Consolidate duplicate user documents in Firestore.
 *
 * Fixes users created with wrong doc IDs (from old .add() flow):
 * - users/{randomId} with uid in data (legacy)
 * - users/{authUid} (canonical - what mobile expects)
 *
 * This script:
 * 1. Finds users where doc.id !== data.uid (wrong doc ID)
 * 2. Merges data into users/{authUid}
 * 3. Copies profile, preInductionProfile, and other subcollections
 * 4. Deletes the duplicate (randomId) doc
 *
 * Usage: node scripts/consolidate-duplicate-users.js [--dry-run]
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(
  __dirname,
  "..",
  "firebase-admin",
  "serviceAccountKey.json"
);

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Subcollections to copy (profile is critical; others may contain user-specific data)
const SUBCOLLECTIONS_TO_COPY = [
  "profile",
  "preInductionProfile",
  "certifications",
  "medicalHistory",
  "siteInductions",
  "briefingAcknowledgements",
];

function toPlainObject(obj) {
  if (obj == null) return obj;
  if (typeof obj.toDate === "function") return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(toPlainObject);
  if (typeof obj === "object" && obj.constructor?.name === "Object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toPlainObject(v);
    }
    return out;
  }
  return obj;
}

async function copySubcollection(srcCollectionRef, destCollectionRef) {
  const snapshot = await srcCollectionRef.get();
  if (snapshot.empty) return 0;
  // Firestore batches limited to 500 ops
  const batchSize = 400;
  let count = 0;
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    for (const doc of chunk) {
      const data = toPlainObject(doc.data());
      const destDocRef = destCollectionRef.doc(doc.id);
      batch.set(destDocRef, data, { merge: true });
      count++;
    }
    await batch.commit();
  }
  return count;
}

async function copyAllSubcollections(fromUserRef, toUserRef) {
  const copied = {};
  const subcollections = await fromUserRef.listCollections();
  for (const sub of subcollections) {
    if (!SUBCOLLECTIONS_TO_COPY.includes(sub.id)) {
      console.log(`  Skipping subcollection ${sub.id} (not in list)`);
      continue;
    }
    const count = await copySubcollection(sub, toUserRef.collection(sub.id));
    copied[sub.id] = count;
    if (count > 0) {
      console.log(`  Copied ${sub.id}: ${count} doc(s)`);
    }
  }
  return copied;
}

async function consolidateDuplicates(dryRun) {
  const usersSnap = await db.collection("users").get();
  const toProcess = [];
  const seen = new Set(); // Avoid processing same doc twice

  // Pass 1: doc.id !== data.uid (legacy approval flow - has uid in data)
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const authUid = data.uid?.toString?.() || data.uid;
    if (!authUid) continue;
    if (doc.id === authUid) continue;
    toProcess.push({ legacyDocId: doc.id, authUid, data });
    seen.add(doc.id);
  }

  // Pass 2: duplicates by email (e.g. POST /api/users with .add() - no uid in data)
  const byEmail = new Map();
  for (const doc of usersSnap.docs) {
    const email = doc.data().email?.toString?.().trim?.()?.toLowerCase?.();
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push({ doc, data: doc.data() });
  }

  for (const [email, docs] of byEmail) {
    if (docs.length < 2) continue;
    let authUid = null;
    for (const { doc, data } of docs) {
      const uid = data.uid?.toString?.() || data.uid;
      if (uid && doc.id === uid) {
        authUid = uid;
        break;
      }
    }
    if (!authUid) {
      try {
        const authUser = await admin.auth().getUserByEmail(email);
        authUid = authUser.uid;
      } catch {
        console.log(`  Could not resolve auth uid for ${email}, skipping`);
        continue;
      }
    }
    for (const { doc } of docs) {
      if (doc.id === authUid) continue;
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      toProcess.push({
        legacyDocId: doc.id,
        authUid,
        data: doc.data(),
      });
    }
  }

  if (toProcess.length === 0) {
    console.log("No duplicate user documents found.");
    return;
  }

  console.log(`Found ${toProcess.length} user(s) with wrong doc ID:\n`);

  for (const { legacyDocId, authUid, data } of toProcess) {
    console.log(`\n--- ${data.email || "unknown"} ---`);
    console.log(`  Legacy doc: users/${legacyDocId}`);
    console.log(`  Canonical: users/${authUid}`);

    const canonicalRef = db.collection("users").doc(authUid);
    const legacyRef = db.collection("users").doc(legacyDocId);

    if (dryRun) {
      console.log(`  [DRY RUN] Would merge and copy subcollections to users/${authUid}`);
      const legacySubs = await legacyRef.listCollections();
      for (const sub of legacySubs) {
        const snap = await sub.get();
        console.log(`  [DRY RUN] Would copy ${sub.id}: ${snap.size} doc(s)`);
      }
      console.log(`  [DRY RUN] Would delete users/${legacyDocId}`);
      continue;
    }

    // Merge user doc: prefer legacy doc fields (usually richer), ensure uid is authUid
    const legacyData = toPlainObject(data);
    delete legacyData.uid;
    const mergeData = {
      ...legacyData,
      uid: authUid,
    };
    await canonicalRef.set(mergeData, { merge: true });
    console.log(`  Merged user data into users/${authUid}`);

    // Copy subcollections from legacy to canonical (profile etc.)
    const copied = await copyAllSubcollections(legacyRef, canonicalRef);

    // Delete legacy doc and its subcollections (must delete subcollection docs before parent)
    async function deleteCollection(ref, batchSize = 400) {
      const snapshot = await ref.limit(batchSize).get();
      if (snapshot.empty) return;
      const batch = db.batch();
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snapshot.size === batchSize) await deleteCollection(ref, batchSize);
    }
    const legacySubs = await legacyRef.listCollections();
    for (const sub of legacySubs) {
      await deleteCollection(sub);
    }
    await legacyRef.delete();
    console.log(`  Deleted duplicate users/${legacyDocId}`);
  }

  console.log("\nDone.");
}

const dryRun = process.argv.includes("--dry-run");

consolidateDuplicates(dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
