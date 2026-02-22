/**
 * Migration: role "worker" → "operative"
 *
 * Scans all users where role == "worker" and updates to role == "operative".
 * Safe to run multiple times (idempotent).
 *
 * Usage: node scripts/migrate-worker-to-operative.js
 * Requires: Firebase Admin SDK env vars (FIREBASE_PROJECT_ID, etc.) or GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require("firebase-admin");

function init() {
  if (admin.apps.length) return admin.firestore();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    admin.initializeApp();
  }
  return admin.firestore();
}

async function main() {
  const db = init();

  // Migrate lowercase "worker"
  const snapWorker = await db.collection("users").where("role", "==", "worker").get();
  // Migrate uppercase "WORKER"
  const snapWORKER = await db.collection("users").where("role", "==", "WORKER").get();

  const allDocs = new Map();
  snapWorker.docs.forEach((d) => allDocs.set(d.id, d));
  snapWORKER.docs.forEach((d) => allDocs.set(d.id, d));

  console.log(`Found ${allDocs.size} users with role "worker" or "WORKER".`);

  let updated = 0;
  for (const doc of allDocs.values()) {
    await db.collection("users").doc(doc.id).update({ role: "operative" });
    updated++;
    console.log(`  Updated ${doc.id} (${doc.data()?.email ?? "no email"})`);
  }

  console.log(`\nDone. Updated ${updated} user(s) to role "operative".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
