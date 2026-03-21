-- =============================================================================
-- Construction Runner REBUILD - STEP 6: BACKFILL USER REFERENCES
-- =============================================================================
-- Run after REBUILD_05_INSERT_DATA.sql
-- Maps firebase_uid to users.id (UUID)
-- =============================================================================

-- Profiles: user_id from users.firebase_uid = profiles.firebase_uid
UPDATE profiles
SET user_id = u.id
FROM users u
WHERE profiles.firebase_uid = u.firebase_uid
  AND profiles.user_id IS NULL;

-- Deliveries: created_by from users.firebase_uid = deliveries.firebase_uid
UPDATE deliveries
SET created_by = u.id
FROM users u
WHERE deliveries.firebase_uid = u.firebase_uid
  AND deliveries.created_by IS NULL;

-- User pre-induction profile: user_id from firebase_uid
UPDATE user_pre_induction_profile
SET user_id = u.id
FROM users u
WHERE user_pre_induction_profile.firebase_uid = u.firebase_uid
  AND user_pre_induction_profile.user_id IS NULL;

-- Optional: add profile_id to users (reverse link)
-- UPDATE users u
-- SET profile_id = p.id
-- FROM profiles p
-- WHERE p.firebase_uid = u.firebase_uid;
-- Note: users table doesn't have profile_id in this schema; profile references user.
