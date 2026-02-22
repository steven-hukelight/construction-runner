// Usage: node scripts/set-superuser-claim.js <user_email>
// This script sets the 'superuser' custom claim for a Firebase Auth user by email.

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin/serviceAccountKey.json'); // Update path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node set-superuser-claim.js <user_email>');
  process.exit(1);
}

async function setSuperuserClaim() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { superuser: true, role: 'superuser' });
    console.log(`Superuser claim set for ${email}`);
  } catch (err) {
    console.error('Error setting superuser claim:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

setSuperuserClaim();
