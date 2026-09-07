# CSS source of truth

- **Active global styles:** `app/globals.css` (imported from `app/layout.tsx`).
- **Removed (March 2026):** `styles/globals.css` was never imported. It duplicated theme tokens and contained an alternate dark/purple sidebar concept (Quicksand, legacy `.dark` class variables). If you need that experiment, recover it from git history before the deletion commit.

Tailwind’s `content` paths no longer scan `./styles/**/*.css` unless you add new files there.
