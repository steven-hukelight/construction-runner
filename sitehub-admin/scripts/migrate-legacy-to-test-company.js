/**
 * Data migration: assign missing companyId to Test Company.
 *
 * - Scans: sites, rams, operatives, attendance, deliveries, tasks, notices,
 *   users, certifications, settings.
 * - For each document: if companyId is missing, null, or empty, set it to
 *   the Test Company ID. If companyId already exists (e.g. Briars, Wiltons),
 *   do NOT modify it.
 * - Idempotent and safe: only updates missing companyId.
 * - If no "Test Company" exists, creates one automatically.
 *
 * Usage:
 *   node scripts/migrate-legacy-to-test-company.js
 *   # Or: TEST_COMPANY_ID=<firestore-company-doc-id> node scripts/migrate-legacy-to-test-company.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("../firebase-admin/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = admin.firestore();

const COLLECTIONS = [
  "sites",
  "rams",
  "operatives",
  "attendance",
  "deliveries",
  "tasks",
  "notices",
  "users",
  "certifications",
  "settings",
];

function isEmpty(val) {
  return val === undefined || val === null || val === "";
}

async function resolveTestCompanyId() {
  const envId = process.env.TEST_COMPANY_ID;
  if (envId && String(envId).trim()) return String(envId).trim();

  let snap = await db.collection("companies").where("name", "==", "Test Company").limit(1).get();
  if (snap.empty) {
    snap = await db.collection("companies").where("name", "==", "Test Company Ltd").limit(1).get();
  }

  if (!snap.empty) return snap.docs[0].id;

  // Create "Test Company" if it doesn't exist
  console.log("No Test Company found. Creating 'Test Company'...");
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const ref = await db.collection("companies").add({
    name: "Test Company",
    inviteCode,
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("Created Test Company with ID:", ref.id);
  return ref.id;
}

async function migrateCollection(collectionName, testCompanyId) {
  const snapshot = await db.collection(collectionName).get();
  let updated = 0;
  const batch = db.batch();
  const BATCH_SIZE = 500;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const current = data.companyId;
    if (isEmpty(current)) {
      batch.update(doc.ref, { companyId: testCompanyId });
      updated++;
      batchCount++;
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`[${collectionName}] Updated ${updated} document(s) with companyId=${testCompanyId}`);
  return updated;
}

async function main() {
  const testCompanyId = await resolveTestCompanyId();
  console.log("Using Test Company ID:", testCompanyId);

  let total = 0;
  for (const col of COLLECTIONS) {
    try {
      const count = await migrateCollection(col, testCompanyId);
      total += count;
    } catch (e) {
      console.error(`[${col}] Error:`, e.message);
    }
  }

  console.log("Migration complete. Total documents updated:", total);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
