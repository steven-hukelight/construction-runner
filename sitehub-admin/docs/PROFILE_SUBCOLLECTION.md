# Profile subcollection (user profile under user doc)

Profile data is stored under each user document so it can never have a different company than the user.

## Structure

- **`users/{userId}`** – User document (email, role, **companyId**, name, uid, etc.). This is the only place `companyId` is stored for the user.
- **`users/{userId}/profile/data`** – Single document with extended profile fields (displayName, phone, avatar, bio, jobTitle, emergencyContactName, etc.). No `companyId` is stored here.

Login and company context always use the **user** document’s `companyId`. Profile fields (phone, avatar, displayName) are synced to the user doc for quick access and profile-completion badges.

## Migrating from the old "profiles" collection

If you had a top-level **`profiles`** collection where each doc had `userId` and sometimes a different `companyId`:

1. The app no longer reads or writes that collection.
2. To move existing profile data into the subcollection for a user:
   - For each user doc `users/{userId}`, get the old profile doc (e.g. `profiles` where `userId == userId` or doc id = userId).
   - Write that data (excluding `companyId`) into `users/{userId}/profile/data`.

Example (Node script or Firebase console): for each profile doc with `userId`, set `users/{userId}/profile/data` with the same fields (displayName, phone, avatar, bio, etc.) and leave `companyId` only on the user doc.
