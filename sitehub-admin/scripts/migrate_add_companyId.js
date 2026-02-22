
const admin = require("firebase-admin");
const serviceAccount = require("../firebase-admin/serviceAccountKey.json");

// Initialize Firebase Admin SDK with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = admin.firestore();

// List all collections to update
const collections = [
  "sites",
  "operatives",
  "attendance",
  "tasks",
  "notices",
  "deliveries",
  "rams",
  "certifications",
];


// Helper: assign all missing companyId to 'test company' for migration
const TEST_COMPANY_ID = 'iQlyANp6sZVztRrAeJGr';
async function getCompanyIdForDoc(doc) {
  // Only assign if companyId is missing
  return !doc.companyId ? TEST_COMPANY_ID : null;
}

async function migrateCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({ companyId: TEST_COMPANY_ID });
      updated++;
      console.log(`[${collectionName}] Updated ${doc.id} with companyId: ${TEST_COMPANY_ID}`);
    }
  }
  console.log(`[${collectionName}] Migration complete. Updated: ${updated}`);
}

async function main() {
  for (const col of collections) {
    await migrateCollection(col);
  }
  console.log("Migration finished.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
