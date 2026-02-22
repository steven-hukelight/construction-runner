/*
 Backfill attendance site names for records missing `siteName` but having `siteId`.
 Loads credentials from .env.local via dotenv when available.
*/

try {
  require("dotenv").config({ path: ".env.local" });
} catch (_) {}

const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return admin;
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      return admin;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      return admin;
    }
    admin.initializeApp();
    return admin;
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e?.message || e);
    process.exit(1);
  }
}

async function run() {
  const adminSDK = initAdmin();
  const db = adminSDK.firestore();

  console.log("Scanning attendance for missing siteName...");
  const snap = await db.collection("attendance").get();
  let total = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    total += 1;
    const data = doc.data() || {};
    let siteName = (data.siteName || "").toString().trim();
    let siteId = (data.siteId || "").toString().trim();

    // If nested site object present, adopt its fields
    if (!siteName && data.site && typeof data.site === "object") {
      siteName = (data.site.name || "").toString().trim();
      siteId = siteId || (data.site.id || "").toString().trim();
    }

    if (!siteName && siteId) {
      try {
        const siteDoc = await db.collection("sites").doc(siteId).get();
        if (siteDoc.exists) {
          const s = siteDoc.data() || {};
          const name = (s.name || "").toString().trim();
          if (name) {
            await doc.ref.update({ siteName: name });
            updated += 1;
            if (updated % 25 === 0) console.log(`Updated ${updated} records so far...`);
          }
        }
      } catch (_) {}
    }
  }

  console.log(`Processed ${total} attendance records. Updated ${updated} site names.`);
}

run().then(() => {
  console.log("Backfill complete.");
  process.exit(0);
}).catch((e) => {
  console.error("Backfill failed:", e?.message || e);
  process.exit(1);
});
