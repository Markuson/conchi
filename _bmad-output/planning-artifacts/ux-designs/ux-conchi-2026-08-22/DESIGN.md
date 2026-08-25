---
name: Conchi — Design System
status: final
updated: 2026-08-23
sources:
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/prd.md
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/addendum.md
---

# Conchi Design System

## Philosophy

Warm, precise, and slightly worn. The visual language references old accounting ledgers and typewriter-era documents — monospace data, ruled hairlines, amber ink — held in a modern, minimal shell. Chrome is invisible; data has character.

Three layers, never mixed:
1. **Character** — Special Elite for hero numbers only. The total you see first when you open the app.
2. **Precision** — Courier Prime for all data. Typewriter DNA, legible at small sizes.
3. **Shell** — System UI for everything else. Nav, buttons, labels. Gets out of the way.

---

## Color Palette

All components reference semantic tokens, never raw hex values.

### Dark Mode (default)

| Token | Value | Usage |
|---|---|---|
| `bg` | `#18140f` | Screen background |
| `surface` | `#201a13` | Cards, raised surfaces, bottom nav |
| `surface-alt` | `#261e15` | Confirmation card, modals |
| `text-primary` | `#fdfaf4` | Primary text, amounts |
| `text-secondary` | `#b09870` | Labels, secondary info, Conchi quote |
| `text-tertiary` | `#7a6a50` | Dates, subcategories, muted chrome |
| `accent` | `#c8922a` | FAB, active nav tab, active chips, Accept button |
| `accent-muted` | `rgba(200,146,42,0.18)` | Accent background tints |
| `accent-underline` | `rgba(200,146,42,0.55)` | Decorative underline on hero total |
| `rule` | `rgba(253,250,244,0.07)` | Row dividers, section separators |
| `border` | `rgba(253,250,244,0.11)` | Card borders, input borders |
| `danger` | `#8b2020` | Delete actions |
| `danger-bg` | `rgba(139,32,32,0.22)` | Inline delete confirmation background |
| `nav-bg` | `#18140f` | Bottom navigation bar |

### Light Mode

| Token | Value | Usage |
|---|---|---|
| `bg` | `#faf6ee` | Screen background |
| `surface` | `#fdf9f3` | Cards, bottom nav |
| `surface-alt` | `#fffcf5` | Confirmation card |
| `text-primary` | `#1a1510` | Primary text |
| `text-secondary` | `#7a6a50` | Labels, secondary info |
| `text-tertiary` | `#9a8a68` | Dates, muted |
| `accent` | `#b8860b` | Active states (darker amber for contrast) |
| `accent-muted` | `rgba(184,134,11,0.12)` | Accent tints |
| `accent-underline` | `rgba(184,134,11,0.45)` | Decorative underline |
| `rule` | `rgba(26,21,16,0.09)` | Row dividers |
| `border` | `rgba(26,21,16,0.12)` | Borders |
| `danger` | `#8b1a1a` | Delete actions |
| `danger-bg` | `rgba(139,26,26,0.10)` | Delete confirmation |
| `nav-bg` | `#f2ede2` | Bottom nav background |

### Raw Palette Reference

```
Dark base:   #18140f → #201a13 → #261e15
Light base:  #faf6ee → #fdf9f3 → #fffcf5
Amber dark:  #c8922a
Amber light: #b8860b
Text dark:   #fdfaf4
Text light:  #1a1510
```

---

## Typography

Three fonts. Three roles. No overlap.

### Font Stack

```
Special Elite  →  'Special Elite', cursive
                  Google Fonts: fonts.google.com/specimen/Special+Elite

Courier Prime  →  'Courier Prime', Courier, monospace
                  Google Fonts: fonts.google.com/specimen/Courier+Prime

System UI      →  -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif
```

### Role Assignments

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Hero total | Special Elite | 32px | 400 | Home header balance amount |
| Month section total | Special Elite | 13px | 400 | Right of month header, `accent` color |
| Confirmation card amount | Special Elite | 28px | 400 | Editable, top of Confirmation Card |
| Row amount | Courier Prime | 15px | 700 | Right side of expense row |
| Row category | Courier Prime | 13px | 400 | Left primary |
| Row subcategory / date | Courier Prime | 10px | 400 | Secondary; subcategory uppercase |
| Drum picker — selected | Courier Prime | 13px | 700 | Center item, uppercase |
| Drum picker — ghost | Courier Prime | 10px | 400 | Above/below items, 28% opacity |
| Field values | Courier Prime | 12px | 400 | Description, date, attachment filename |
| Conchi quote | Courier Prime italic | 12px | 400 | Confirmation Card, personality line |
| Section header | System UI | 10px | 600 | CONNEXIÓ, VISUALITZACIÓ — uppercase |
| Field label | System UI | 9px | 600 | Descripció, Context, Data — uppercase |
| Nav label | System UI | 10px | 500 | Inici, Estadístiques |
| Button text | System UI | 11px | 700 | Acceptar, Descartar, Eliminar — uppercase |
| Filter chip | System UI | 11px | 500 | Analytics filter chips |

### Letter Spacing

| Context | Value |
|---|---|
| Section headers (uppercase) | `0.14em` |
| Field labels (uppercase) | `0.12em` |
| Button text (uppercase) | `0.10em` |
| Nav labels | `0.06em` |
| Row amounts | `-0.01em` |
| Drum picker items | `0.08em` |

---

## Spacing

Base unit: `4px`.

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon gaps, tight internal padding |
| `sm` | 8px | Between related elements |
| `md` | 12px | Standard internal padding |
| `lg` | 16px | Section gaps |
| `xl` | 24px | Screen horizontal edge padding |
| `2xl` | 32px | Between major sections |

Screen horizontal padding: `24px` on all screens.

---

## Elevation & Shadows

| Context | Value |
|---|---|
| Standard card | `0 2px 8px rgba(0,0,0,0.18)` |
| Confirmation card (bottom sheet) | `0 -4px 24px rgba(0,0,0,0.28)` |
| Bottom navigation bar | `0 -1px 0 rgba(0,0,0,0.12)` |
| FAB (dark mode) | `0 4px 16px rgba(200,146,42,0.50), 0 2px 6px rgba(0,0,0,0.35)` |
| FAB (light mode) | `0 4px 16px rgba(184,134,11,0.38), 0 2px 6px rgba(26,21,16,0.20)` |
| Conchi bubble | `0 2px 12px rgba(0,0,0,0.30)` |

---

## Border Radius

| Element | Value |
|---|---|
| Buttons | 4px |
| Input fields | 4px |
| Filter chips | 20px (pill) |
| Confirmation card | 20px top corners, 0 bottom |
| FAB | 50% (circle) |
| FAB radial fan mini-buttons | 50% (circle) |
| Conchi bubble | 50% (circle) |
| Swipe action buttons | 0 (flush with row) |

---

## Components

### Bottom Navigation Bar

**Pattern:** notched/cradle — smooth Bézier cutout at top-center. FAB sits elevated above the bar surface, partially inside the notch.

**Structure (left to right):**
1. Home tab — house icon + "Inici"
2. FAB notch — curved cutout, FAB floats above
3. Analytics tab — bar chart icon + "Estadístiques"

**Tab states:**
- Active: icon + label in `accent`
- Inactive: icon + label in `text-tertiary`
- Minimum tap target: 44×44px

**Bar:**
- Height: 64px + device safe area padding
- Background: `nav-bg`
- Top edge: 1px `rule`
- Shadow: `0 -1px 0 rgba(0,0,0,0.12)`

---

### FAB

- Shape: circle, 56px diameter
- Color: `accent`
- Icon: + sign, 24px, weight 300, `bg` color
- Elevation: 8px above the nav bar surface
- Shadow: FAB shadow token

**Radial fan (on tap):**
Three mini circular buttons fan upward in an arc above the FAB. Semi-transparent backdrop closes the fan on tap-outside.

| Arm | Icon | Label | Action |
|---|---|---|---|
| Left | ✏️ | Escriure | Text entry overlay |
| Center | 📷 | Càmera | Camera / photo library |
| Right | 📄 | PDF | File picker (PDF only) |

Mini button: 44px diameter circle, `accent` background. Label: System UI 9px, `text-secondary`, above each button.

---

### Conchi Bubble

Persistent floating avatar. Always visible top-right of every screen. Dual purpose: status indicator + Settings entry point.

- Shape: circle, 48px diameter
- Position: absolute, header area, right-aligned
- Shadow: Conchi bubble shadow token
- Tap: opens Settings (from any screen)

**States:**

| State | Asset | Trigger | Duration |
|---|---|---|---|
| Idle | `conchi-idle.png` | Default / after completion / after error revert | Permanent until changed |
| Working | `conchi-working.png` | Phase 2 begins (SSE pending) | Until SSE response |
| Error | `conchi-error.png` | Error event | 10 seconds, then auto-reverts to Idle |

Transition: crossfade ~200ms between states.

**Pixel art asset recolor mapping** (current → Folio palette):

| Element | Target value |
|---|---|
| Dark outlines, jacket, hair | `#2c1a0a` |
| Amber bow, accent elements | `#c8922a` |
| Collar / cuffs | `#fdfaf4` |
| Book cover | `#4a2e12` |
| Error glitch (RGB pixels) | Keep as-is — intentional contrast signal |

---

### Expense Row

Single-line. No content wraps on the collapsed state.

**Collapsed:**
```
Alimentació              €47.80
Supermercat    22 ago  📎 🏷
```

- Padding: 13px vertical × 24px horizontal
- Bottom edge: 1px `rule`
- Background: `bg`
- Left — Category: Courier Prime 13px, `text-primary`
- Left — Subcategory: Courier Prime 10px, `text-tertiary`, uppercase, 0.06em
- Right — Amount: Courier Prime 15px 700, `text-primary`
- Right — Date: Courier Prime 10px, `text-tertiary`
- Right — Indicators (amber, 10px, below date): 📎 if attachment; 🏷 if context. Not reserved when absent.

**Expanded (accordion):**
```
Alimentació              €47.80
Supermercat    22 ago  📎 🏷
┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈
Descripció   compra setmanada
Context      Llar compartida
📎 rebut_mercadona.jpg  [Obrir]
```

Dashed separator: 1px dashed `rule`. Expanded labels: System UI 9px `text-secondary`. Expanded values: Courier Prime 12px `text-primary`. "Obrir": System UI 10px `accent`.

**Swipe-revealed (left or right — symmetric):**
```
│ 👁 Veure │ ✏️ Editar │ 🗑 Eliminar │
```
- Veure: `accent` bg — only shown when attachment exists
- Editar: `surface` bg, `text-secondary`
- Eliminar: `danger` bg, white text

**Delete inline confirmation:**
Row bg transitions to `danger-bg`. Content replaced with:
```
Segur?                      [Eliminar]
```
Tap outside: cancels. Tap Eliminar: row animates out.

---

### Month Section Header

```
AGOST 2026 ─────────────── €224.60
```

- Left: System UI 10px, `text-secondary`, uppercase, 0.14em
- Fill: hairline 1px `rule`
- Right: Special Elite 13px, `accent`
- Padding: 8px vertical × 24px horizontal
- Background: `bg` (no contrast from rows)

---

### Confirmation Card

Bottom sheet rising from below. Appears after Conchita processes an entry.

- Border-radius: 20px top, 0 bottom
- Background: `surface-alt`
- Shadow: confirmation card shadow token

**Anatomy (top → bottom):**

1. **Drag handle** — 36×4px pill, `text-tertiary` @ 14% opacity, centered, 10px top padding
2. **Amount** — Special Elite 28px, `text-primary`. Editable on tap (numeric keyboard). 2px `accent-underline` bar below.
3. **Drum pickers — Categoria | Subcategoria** — side by side, hairline separator between columns.
   - Label: System UI 9px uppercase `text-secondary`
   - Ghost above: Courier Prime 10px, 28% opacity
   - Selected: Courier Prime 13px 700 `text-primary` uppercase
   - Ghost below: Courier Prime 10px, 28% opacity
   - Track: top + bottom 1px `rule`
4. **Data** — System UI 9px label + Courier Prime 12px value. Editable. Defaults to today.
5. **Descripció** — System UI 9px label + Courier Prime 12px value. Editable inline.
6. **Context drum** — System UI 9px label + drum picker (same pattern as Categoria). Only shown if contexts exist. Shows "—" if none selected.
7. **Attachment** — 📎 + Courier Prime 11px filename + System UI 10px "Obrir" in `accent`. Only shown if file present.
8. **Conchi quote** — Courier Prime italic 12px, `text-secondary`. e.g. *"Registrat. Com sempre."*
9. **Buttons** — 24px horizontal padding, 10px gap between:
   - Descartar: transparent, 1px `border`, `text-secondary`, 4px radius, 44px height
   - Acceptar: `accent` bg, `bg` text, weight 700, 4px radius, 44px height

---

### Filter Chips (Analytics)

Horizontal scrollable row. 24px edge padding, 8px gap.

- Height: 30px
- Horizontal padding: 12px
- Radius: 20px (pill)
- Font: System UI 11px 500

| State | Background | Border | Text |
|---|---|---|---|
| Inactive | `surface` | 1px `border` | `text-secondary` |
| Active | `accent-muted` | 1px `accent` | `accent` |

---

### Buttons

| Variant | Background | Border | Text | Radius | Height |
|---|---|---|---|---|---|
| Primary (Acceptar) | `accent` | `accent` +10% lighter | `bg` (dark) | 4px | 44px |
| Secondary (Descartar) | transparent | `border` | `text-secondary` | 4px | 44px |
| Danger (Eliminar) | `danger` | `danger` | white | 4px | 44px |

Font: System UI 11px 700, uppercase, 0.10em spacing.

---

## Decorative Elements

- **Hero total underline:** 32×2px rect, `accent-underline`, border-radius 1px. Displayed below the home header total.
- **Hairline rules:** 1px `rule` between every expense row and as section separators.
- **Dashed separator:** 1px dashed `rule` between collapsed and expanded accordion content.

---

## App Icon

Provided asset (`noname.png`). Warm amber background (~`#c8922a`) with dark silhouette of Conchita — glasses, bun, bow collar. Rounded square shape following Android adaptive icon guidelines.

---

## Conchi Pixel Art Assets

Three PNG assets with transparent backgrounds. Recolor required before production (see recolor mapping above).

| Filename | State | Description |
|---|---|---|
| `conchi-idle.png` | Idle | Sitting at desk, hands folded on accounting book, pen alongside |
| `conchi-working.png` | Working | Writing in book with one hand, holding "CONCHI" calculator with the other |
| `conchi-error.png` | Error | Both hands on head, frustrated, RGB pixel glitch artifacts around figure |
