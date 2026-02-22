# SiteHub Snapshot Tests

Snapshot tests ensure UI stability across the SiteHub mobile (Flutter) and web (Next.js) apps.

---

## Running Snapshot Tests

### Web (sitehub-admin)

```bash
cd sitehub-admin
npm run test:snapshots
```

### Mobile (sitehub_worker_Ready)

```bash
cd sitehub_worker_Ready
flutter test test/widget_snapshots_test.dart
```

### Both (from project root)

```bash
npm run test:snapshots
```

---

## Updating Snapshots

**Only run this when you intentionally changed the UI and want to accept the new output.**

### Web

```bash
cd sitehub-admin
npm run update-snapshots
```

Or: `npm test -- tests/snapshots/ -u`

### Mobile

```bash
cd sitehub_worker_Ready
flutter test test/widget_snapshots_test.dart --update-goldens
```

### Both (from project root)

```bash
npm run update-snapshots
```

---

## Safe Update Workflow

1. **Run tests first** – Confirm which snapshots are failing:
   ```bash
   npm run test:snapshots
   ```

2. **Review diffs** – Decide if changes are intentional or a regression.

3. **Update only when intentional** – If the new UI is correct:
   ```bash
   npm run update-snapshots
   ```

4. **Commit** – Include both test files and snapshot files:
   - `sitehub-admin/tests/snapshots/__snapshots__/*.snap`
   - `sitehub_worker_Ready/test/goldens/*.png`

---

## CI Behaviour

- **Snapshot tests fail** when the rendered output differs from the stored snapshot.
- This catches unintended UI changes.
- Update snapshots only after explicit review and approval.

---

## Mobile Golden Tests (Flutter)

| Component | Golden File |
|-----------|-------------|
| Message bubble (sent) | `goldens/message_bubble_sent.png` |
| Message bubble (received) | `goldens/message_bubble_received.png` |
| Asset card | `goldens/asset_card.png` |
| Delivery card | `goldens/delivery_card.png` |
| Task list item | `goldens/task_list_item.png` |
| Near miss list item | `goldens/near_miss_list_item.png` |
| Pre-induction section card | `goldens/pre_induction_section_card.png` |
| Primary button | `goldens/button_primary.png` |
| Secondary button | `goldens/button_secondary.png` |
| Input unfocused | `goldens/input_unfocused.png` |
| Input focused | `goldens/input_focused.png` |

**Device size:** 390×844 (iPhone 14 Pro)

---

## Web Snapshot Tests (Jest)

| Component | Snapshot |
|-----------|----------|
| Messaging thread list | `web.snapshot.test.tsx.snap` |
| Messaging message list | `web.snapshot.test.tsx.snap` |
| Asset table rows | `web.snapshot.test.tsx.snap` |
| Delivery table rows | `web.snapshot.test.tsx.snap` |
| Task table rows | `web.snapshot.test.tsx.snap` |
| Pre-induction admin view | `web.snapshot.test.tsx.snap` |
| RAMS list | `web.snapshot.test.tsx.snap` |

**Mock data:** Stable fixtures in `mockData.ts` ensure deterministic output.
