# SiteHub Snapshot Tests Summary

## Overview

Snapshot tests cover both mobile (Flutter) and web (Next.js) UIs to ensure visual and structural stability.

---

## Mobile Golden Tests (Flutter)

**Location:** `sitehub_worker_Ready/test/`  
**Goldens:** `sitehub_worker_Ready/test/goldens/`  
**Device size:** 390×844

| Test | Golden File |
|------|-------------|
| Message bubble (sent) | `message_bubble_sent.png` |
| Message bubble (received) | `message_bubble_received.png` |
| Asset card | `asset_card.png` |
| Delivery card | `delivery_card.png` |
| Task list item | `task_list_item.png` |
| Near miss list item | `near_miss_list_item.png` |
| Pre-induction section card | `pre_induction_section_card.png` |
| Primary button | `button_primary.png` |
| Secondary button | `button_secondary.png` |
| Input unfocused | `input_unfocused.png` |
| Input focused | `input_focused.png` |

**Run:** `cd sitehub_worker_Ready && flutter test test/widget_snapshots_test.dart`  
**Update:** `flutter test test/widget_snapshots_test.dart --update-goldens`

---

## Web Snapshot Tests (Jest)

**Location:** `sitehub-admin/tests/snapshots/`  
**Snapshots:** `sitehub-admin/tests/snapshots/__snapshots__/`

| Test | Description |
|------|-------------|
| Messaging thread list | Thread list with last message and date |
| Messaging message list | Message list with sender and body |
| Asset table rows | Name, type, serial, status columns |
| Delivery table rows | Reference, site, status, scheduled columns |
| Task table rows | Title, status columns |
| Pre-induction admin view | Section cards with status |
| RAMS list | Title, status, version with links |

**Run:** `cd sitehub-admin && npm run test:snapshots`  
**Update:** `npm run update-snapshots`

---

## Scripts

| Script | Location | Action |
|--------|----------|--------|
| `npm run test:snapshots` | Root | Run web + mobile snapshot tests |
| `npm run update-snapshots` | Root | Update all snapshots |
| `npm run test:snapshots` | sitehub-admin | Run web snapshots only |
| `npm run update-snapshots` | sitehub-admin | Update web snapshots only |

---

## CI Behaviour

- Snapshot tests **fail** when output differs from stored snapshots
- This catches unintended UI regressions
- Update snapshots only after intentional UI changes and review

---

## Files Added

### Mobile
- `sitehub_worker_Ready/test/widgets/snapshot_widgets.dart` – Snapshot-testable widgets
- `sitehub_worker_Ready/test/widget_snapshots_test.dart` – Golden test cases
- `sitehub_worker_Ready/test/goldens/*.png` – 11 golden images

### Web
- `sitehub-admin/tests/snapshots/mockData.ts` – Stable mock data
- `sitehub-admin/tests/snapshots/SnapshotComponents.tsx` – Presentational components
- `sitehub-admin/tests/snapshots/web.snapshot.test.tsx` – Snapshot test cases
- `sitehub-admin/tests/snapshots/__snapshots__/web.snapshot.test.tsx.snap` – 7 snapshots
- `sitehub-admin/tests/snapshots/SNAPSHOT_TESTS.md` – Documentation

### Root
- `package.json` – `test:snapshots`, `update-snapshots` scripts
