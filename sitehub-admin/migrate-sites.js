/**
 * Migration script to add flat latitude, longitude, and radiusMeters fields
 * to existing sites for mobile app compatibility.
 * 
 * Run with: node migrate-sites.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateSites() {
  console.log('🔍 Fetching all sites...');
  
  const sitesSnapshot = await db.collection('sites').get();
  console.log(`📊 Found ${sitesSnapshot.size} sites`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const doc of sitesSnapshot.docs) {
    const data = doc.data();
    const updates = {};
    
    // Extract latitude and longitude
    let lat = data.latitude;
    let lng = data.longitude;
    let radiusMeters = data.radiusMeters;
    
    // Check nested geofence structure
    if (data.geofence) {
      if (data.geofence.center) {
        lat = data.geofence.center.lat;
        lng = data.geofence.center.lng;
      }
      if (data.geofence.radiusMeters) {
        radiusMeters = data.geofence.radiusMeters;
      }
    }
    
    // Also check location structure
    if (!lat && !lng && data.location) {
      lat = data.location.lat;
      lng = data.location.lng;
    }
    
    // Only update if we found coordinates
    if (lat !== undefined && lng !== undefined) {
      const needsUpdate = 
        data.latitude !== lat || 
        data.longitude !== lng || 
        data.radiusMeters !== radiusMeters;
      
      if (needsUpdate) {
        updates.latitude = lat;
        updates.longitude = lng;
        updates.radiusMeters = radiusMeters || null;
        
        await doc.ref.update(updates);
        console.log(`✅ Updated site: ${data.name} (${doc.id})`);
        console.log(`   → lat: ${lat}, lng: ${lng}, radius: ${radiusMeters || 'none'}`);
        updated++;
      } else {
        console.log(`⏭️  Skipped site: ${data.name} (already has flat fields)`);
        skipped++;
      }
    } else {
      console.log(`⚠️  Warning: Site "${data.name}" (${doc.id}) has no coordinates`);
      skipped++;
    }
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`   Updated: ${updated} sites`);
  console.log(`   Skipped: ${skipped} sites`);
  console.log(`   Total: ${sitesSnapshot.size} sites`);
}

migrateSites()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
