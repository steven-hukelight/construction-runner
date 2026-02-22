# UI Wireframes: Subcontractor Operatives & Induction Status Banner

**Style:** Linear.app-inspired, light theme, electric blue accents, clean spacing, rounded corners, minimal typography.

---

## 1. Subcontractor Operatives (Mobile)

### Layout
- **Root:** Full-viewport column; safe-area aware; background `#FAFAFA` or white.

### Components (top to bottom)

| Component | Description |
|-----------|-------------|
| **AppBar** | Fixed top. White bg, no shadow or very subtle. Left: back chevron (electric blue). Center: title "Subcontractor operatives" (font ~17px, semibold, dark gray). Right: optional overflow menu or empty. Height ~56px. |
| **Site selector** | Full-width card or dropdown below app bar. Rounded (12px). White bg, light gray border. Label "Site" above; dropdown showing current site name. Electric blue focus/selected state. Padding 16px horizontal. |
| **Scrollable list** | Single scroll region below selector. No horizontal scroll. |
| **Company section** | For each company: (1) **Section header** — company name only, left-aligned, 14px semibold, dark gray (`#1F2937`), uppercase or title case, letter-spacing optional. 8–12px top margin, 4px bottom. (2) **Operative cards** — one per operative. |
| **Operative card** | White card, 12px radius, 8px margin bottom. Row: left **avatar** (circle, ~40px, electric blue tint bg, initial or placeholder), **content** (name 15px semibold, optional status/role 12px muted), right **chevron** (gray). Tap target min 44px. Padding ~14px horizontal, ~12px vertical. Subtle border or shadow. |
| **Empty state** | Centered block if no operatives: icon (optional), "No operatives assigned" + short subtitle. Muted gray text. |
| **Loading** | Full-width skeleton cards or single centered spinner (electric blue). |

### Spacing & tokens
- Page padding: 16px horizontal.
- Section spacing: 16–20px between company groups.
- Electric blue: `#2563EB` (or Linear-like blue).

---

## 2. Subcontractor Operatives (Web)

### Layout
- **Root:** Centered content column; max-width ~720px or 900px; margin auto; padding 24–32px.

### Components (top to bottom)

| Component | Description |
|-----------|-------------|
| **Page header** | Row: back link or breadcrumb (electric blue, 14px); below it title "Subcontractor operatives" (24–28px, semibold, dark gray). Optional short description 14px muted. Bottom margin 24px. |
| **Site selector** | Inline or card. Label "Site"; dropdown or combobox, white bg, rounded 8–12px, border. Electric blue focus ring. Width fit-content or ~280px. |
| **Table or list container** | Rounded (12px) white panel; optional very light border. |
| **Company section** | Same idea as mobile: **section header** (company name, 14px semibold, dark gray), then operatives. More horizontal space; sections can use more padding. |
| **Operative row** | Row layout: **avatar** (circle, ~36px), **name** (15px semibold), **status/role** (14px muted), **chevron** or "View" link (electric blue). Hover: light gray bg row. Padding 12–16px vertical, 16px horizontal. Optional row divider (1px light gray). |
| **Empty state** | Centered in panel; icon + "No operatives assigned to this site" + optional secondary text. |
| **Loading** | Table skeleton rows or spinner in panel. |

### Spacing & tokens
- Section gap: 24px.
- Panel padding: 20–24px.
- Same electric blue and typography scale as mobile.

---

## 3. Induction Status Banner (Mobile)

### Layout
- **Placement:** Inline in the main scroll (e.g. below app bar or dashboard header), full width, within page padding.

### Components

| Component | Description |
|-----------|-------------|
| **Banner container** | Single full-width row. Rounded 12px. Padding 14–16px horizontal, 12–14px vertical. Min height ~52px. Two variants: **incomplete** (amber/light yellow bg, e.g. `#FFFBEB`, border 1px amber) and **complete** (light green bg, e.g. `#F0FDF4`, border 1px green). |
| **Left: icon** | 20–24px icon: warning/alert for incomplete, checkmark for complete. Amber for incomplete, green for complete. |
| **Center: text block** | **Title** (e.g. "Induction required" or "Induction complete") — 14px semibold, dark gray. **Subtitle** (e.g. "Complete to access site" or "You’re cleared for this site") — 12px, muted. Stacked; 2px gap. |
| **Right: action** | For incomplete: primary button "Complete induction" — electric blue bg, white text, 12px, rounded 8px, padding 10px 14px. For complete: optional "View" link (electric blue) or nothing. |
| **Dismiss** | Optional: small X or "Dismiss" text, top-right or inline, for persistent banners. |

### Spacing & tokens
- Margin below banner: 16px.
- Same electric blue for primary action.

---

## 4. Induction Status Banner (Web)

### Layout
- **Placement:** Inline in main content (e.g. below page title or dashboard header); same max-width as page content; full width of content area.

### Components

| Component | Description |
|-----------|-------------|
| **Banner container** | Horizontal bar. Rounded 12px. Padding 16–20px horizontal, 14–16px vertical. Same two variants: incomplete (amber tint) and complete (green tint). Slightly larger than mobile. |
| **Left: icon** | 24px icon; same semantics as mobile (warning vs checkmark). |
| **Center: text block** | **Title** 15px semibold; **Subtitle** 13px muted. Inline or stacked; comfortable line height. |
| **Right: action** | "Complete induction" button (electric blue, rounded 8px, padding 10px 18px) for incomplete; "View" link or no CTA for complete. |
| **Dismiss** | Optional dismiss control; aligned right or after the CTA. |

### Spacing & tokens
- Margin below: 20–24px.
- Align with page content padding and max-width.

---

## Shared design tokens (reference only)

| Token | Value |
|-------|--------|
| Electric blue | `#2563EB` |
| Blue hover | Slightly darker or 90% opacity |
| Text primary | `#1F2937` or `#111827` |
| Text muted | `#6B7280` or `#9CA3AF` |
| Border | `#E5E7EB` or `#F3F4F6` |
| Background page | `#FFFFFF` / `#FAFAFA` |
| Radius card | 12px |
| Radius button | 8px |
| Font | System UI or Inter-style; semibold for headings. |

---

*Component-level wireframes only. No full code; no modifications to existing components.*
