// Migration script to assign companyId to documents missing it
// Run this script once. It is idempotent.

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collections = [
  'sites',
  'rams',
  'operatives',
  'attendance',
  'deliveries',
  'tasks',
  'notices',
  'certifications',
  'settings',
];

const TEST_COMPANY_ID = 'test company ltd';

async function migrateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.companyId || data.companyId === '' || data.companyId === null) {
      batch.update(doc.ref, { companyId: TEST_COMPANY_ID });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} documents in ${collectionName}`);
  } else {
    console.log(`No updates needed for ${collectionName}`);
  }
}

async function runMigration() {
  for (const collection of collections) {
    await migrateCollection(collection);
  }
  console.log('Migration complete.');
}

runMigration().catch(console.error);
