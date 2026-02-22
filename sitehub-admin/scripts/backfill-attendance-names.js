/*
 Backfill attendance names for records missing `name`.
 Requires Firebase Admin credentials via environment variables.

 Env options:
 - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON
 or
 - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
*/

// Load .env.local if available
try {
  require("dotenv").config({ path: ".env.local" });
} catch (_) {
  // dotenv may not be installed; script will use process.env as-is
}

const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return admin;

  try {
    // Prefer application default credentials if available
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      return admin;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return admin;
    }

    // Fall back to default init (may work in deployed environments)
    admin.initializeApp();
    return admin;
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e && e.message ? e.message : e);
    process.exit(1);
  }
}

async function resolveName(db, operativeId) {
  try {
    // Try user doc
    const userDoc = await db.collection("users").doc(operativeId).get();
    if (userDoc.exists) {
      const u = userDoc.data() || {};
      if (u.name && typeof u.name === "string") return u.name;
      if (u.email && typeof u.email === "string") return u.email.split("@")[0];
    }
    // Try profile by userId
    const profilesSnap = await db.collection("profiles").where("userId", "==", operativeId).limit(1).get();
    if (!profilesSnap.empty) {
      const p = profilesSnap.docs[0].data() || {};
      if (p.displayName && typeof p.displayName === "string") return p.displayName;
    }
    // Try profile by userId
  } catch (e) {
    // Non-fatal: fall through
  }
  return null;
}

async function run() {
  const adminSDK = initAdmin();
  const db = adminSDK.firestore();

  console.log("Scanning attendance collection for missing names...");
  const snap = await db.collection("attendance").get();
  let total = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    total += 1;
    const data = doc.data() || {};
    if (data.name && typeof data.name === "string" && data.name.trim().length > 0) continue;
    // Try direct hints on the document
    const directHints = [data.displayName, data.userName, data.operativeName, data.user?.name];
    const fromDirect = directHints.find((n) => n && typeof n === "string" && n.trim().length > 0);
    if (fromDirect) {
      await doc.ref.update({ name: fromDirect });
      updated += 1;
      continue;
    }
    const operativeId = data.operativeId;
    const uid = data.userId || data.uid || operativeId;
    if (!uid || typeof uid !== "string") continue;

    const name = await resolveName(db, uid);
    if (name) {
      await doc.ref.update({ name });
      updated += 1;
      if (updated % 25 === 0) {
        console.log(`Updated ${updated} records so far...`);
      }
    }
  }

  console.log(`Processed ${total} attendance records. Updated ${updated} missing names.`);
}

run().then(() => {
  console.log("Backfill complete.");
  process.exit(0);
}).catch((e) => {
  console.error("Backfill failed:", e && e.message ? e.message : e);
  process.exit(1);
});
