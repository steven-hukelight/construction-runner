const admin = require("firebase-admin");

function initFirebase() {
  if (admin.apps.length) return;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      const serviceAccount = require("../firebase-admin/serviceAccountKey.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (e) {
    console.error("Failed to initialize Firebase:", e.message);
    process.exit(1);
  }
}

initFirebase();
const db = admin.firestore();

async function runMigration() {
  console.log("Starting Pre‑Induction migration...");

  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();

    console.log(`Processing user: ${uid}`);

    // -----------------------------------------------------
    // 1. Ensure preInductionStatus exists
    // 2. Ensure adminPreInductionOverride exists
    // -----------------------------------------------------
    const userUpdates = {};
    if (!userData.preInductionStatus) {
      userUpdates.preInductionStatus = "not_started";
    }
    if (userData.adminPreInductionOverride === undefined) {
      userUpdates.adminPreInductionOverride = false;
    }
    if (Object.keys(userUpdates).length > 0) {
      await userDoc.ref.update(userUpdates);
      if (userUpdates.preInductionStatus) console.log(`  - Added preInductionStatus`);
      if (userUpdates.adminPreInductionOverride !== undefined)
        console.log(`  - Added adminPreInductionOverride`);
    }

    // -----------------------------------------------------
    // 3. Grandfather existing site inductions
    // -----------------------------------------------------
    const siteInductionsRef = userDoc.ref.collection("siteInductions");
    const siteInductionsSnap = await siteInductionsRef.get();

    for (const siteDoc of siteInductionsSnap.docs) {
      const siteData = siteDoc.data();

      // Only add grandfathered if missing
      if (siteData.grandfathered === undefined) {
        await siteDoc.ref.update({
          grandfathered: true,
        });
        console.log(`  - Marked site induction ${siteDoc.id} as grandfathered`);
      }
    }
  }

  console.log("Migration complete.");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
