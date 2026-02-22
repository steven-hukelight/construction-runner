// migrate_all.ts
// Main entry point for Firestore → Supabase migration
// Usage: DRY_RUN=true npx ts-node migrate_all.ts [collection]

import { migrateUsers } from './users';
import { migrateSites } from './sites';
import { migrateTasks } from './tasks';
import { migrateNotices } from './notices';
import { migrateCertifications } from './certifications';
import { migrateProfiles } from './profiles';
import { migrateDeliveries } from './deliveries';
import { migrateBriefings } from './briefings';
import { migrateCompanies } from './companies';

const DRY_RUN = process.env.DRY_RUN === 'true';
const RESUME = process.env.RESUME === 'true';

async function main() {
  console.log('Starting Firestore → Supabase migration...');
  await migrateUsers({ DRY_RUN, RESUME });
  await migrateSites({ DRY_RUN, RESUME });
  await migrateTasks({ DRY_RUN, RESUME });
  await migrateNotices({ DRY_RUN, RESUME });
  await migrateCertifications({ DRY_RUN, RESUME });
  await migrateProfiles({ DRY_RUN, RESUME });
  await migrateDeliveries({ DRY_RUN, RESUME });
  await migrateBriefings({ DRY_RUN, RESUME });
  await migrateCompanies({ DRY_RUN, RESUME });
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
      console.error(`Migration failed for ${col}:`, e)
      break
    }
  }
}

main().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
