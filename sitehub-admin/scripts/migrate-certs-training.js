/**
 * Migration script to move certifications/training from users/{uid} into profiles/{profileId}
 * and ensure `userId` is set on all records. Safe to re-run.
 *
 * Run with: node scripts/migrate-certs-training.js
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
    console.error('Missing credentials. Set env vars or add service-account.json in sitehub-admin/.');
    process.exit(1);
  }
}

initAdmin();
const db = admin.firestore();

async function migrate() {
  console.log('Fetching users...');
  const usersSnap = await db.collection('users').get();
  let moved = 0;
  let ensured = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const user = userDoc.data();
    const profileId = user.profileId;

    // Process both collections
    for (const kind of ['certifications', 'training']) {
      const colRef = userDoc.ref.collection(kind);
      const docsSnap = await colRef.get();
      if (docsSnap.empty) continue;

      for (const d of docsSnap.docs) {
        const data = d.data();
        const withUserId = { ...data, userId: uid };

        // Always ensure userId on user-path doc
        if (!data.userId) {
          await d.ref.set({ userId: uid }, { merge: true });
          ensured++;
        }

        // Mirror to profile if available
        if (profileId) {
          const target = db.collection('profiles').doc(profileId).collection(kind).doc(d.id);
          await target.set(withUserId, { merge: true });
          moved++;
        }
      }
    }
  }

  console.log(`\nMigration complete. Moved: ${moved}, Ensured userId: ${ensured}`);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
