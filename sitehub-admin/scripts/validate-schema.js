/**
 * Validate Firestore records across profiles, users, certifications, and training
 * to ensure cross-platform integration rules are met.
 *
 * Run with: node scripts/validate-schema.js
 */

const admin = require('firebase-admin');

function initAdmin() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return;
  }
  try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Missing credentials. Set env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) or add service-account.json in sitehub-admin/.');
    process.exit(1);
  }
}

initAdmin();

const db = admin.firestore();

async function main() {
  const report = {
    profilesMissingUserId: [],
    usersMissingProfileId: [],
    certsMissingUserId: [],
    trainingMissingUserId: [],
  };

  console.log('Scanning profiles for userId...');
  const profilesSnap = await db.collection('profiles').get();
  for (const doc of profilesSnap.docs) {
    const d = doc.data();
    if (!d.userId) report.profilesMissingUserId.push(doc.id);
  }

  console.log('Scanning users for profileId...');
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const d = doc.data();
    if (!d.profileId) report.usersMissingProfileId.push(doc.id);
  }

  console.log('Scanning collectionGroup(certifications) for userId...');
  const certsSnap = await db.collectionGroup('certifications').get();
  for (const doc of certsSnap.docs) {
    const d = doc.data();
    if (!d.userId) report.certsMissingUserId.push(pathToString(doc.ref.path));
  }

  console.log('Scanning collectionGroup(training) for userId...');
  const trainingSnap = await db.collectionGroup('training').get();
  for (const doc of trainingSnap.docs) {
    const d = doc.data();
    if (!d.userId) report.trainingMissingUserId.push(pathToString(doc.ref.path));
  }

  console.log('\nIntegration Validation Report');
  console.log('--------------------------------');
  console.log('Profiles missing userId:', report.profilesMissingUserId.length);
  if (report.profilesMissingUserId.length) console.log(report.profilesMissingUserId.join(', '));

  console.log('Users missing profileId:', report.usersMissingProfileId.length);
  if (report.usersMissingProfileId.length) console.log(report.usersMissingProfileId.join(', '));

  console.log('Certifications missing userId:', report.certsMissingUserId.length);
  if (report.certsMissingUserId.length) console.log(report.certsMissingUserId.join('\n'));

  console.log('Training missing userId:', report.trainingMissingUserId.length);
  if (report.trainingMissingUserId.length) console.log(report.trainingMissingUserId.join('\n'));

  console.log('\nDone.');
}

function pathToString(p) {
  return Array.isArray(p) ? p.join('/') : p;
}

main().catch((e) => {
  console.error('Validation failed:', e);
  process.exit(1);
});
