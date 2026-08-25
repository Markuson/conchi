---
name: Conchi — Experience Specification
status: final
updated: 2026-08-23
sources:
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/prd.md
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/addendum.md
---

# Conchi Experience Specification

## Language

- **Default:** Català (ca)
- **Optional:** English (en), configurable in Settings → Visualització → Idioma
- Spanish is never used anywhere in the app
- All UI copy in this document is written in Catalan

---

## Navigation Structure

```
App shell
├── Inici (Home)           ← bottom nav left tab
├── Estadístiques          ← bottom nav right tab
├── Configuració           ← tap Conchi bubble (from any screen)
│   └── Gestió de contextos  ← navigate from Configuració
└── Edició completa        ← navigate from swipe → Editar, or Confirmation Card
```

**Bottom navigation — notched/cradle pattern:**
- Left: Inici (house icon)
- Center: FAB (amber circle, radial fan on tap)
- Right: Estadístiques (bar chart icon)

Active tab: icon + label in `accent`. Inactive: `text-tertiary`.

**Conchi bubble:** always visible, top-right of every screen. Tap → Configuració.

---

## Screen: Inici (Home)

### Header

```
€224.60                    [Conchi bubble]
agost 2026
```

- Total: reflects the **selected period only** — both header total and list are filtered together
- Period sublabel:
  - Mes actual → actual month name + year (e.g. "agost 2026")
  - Últims 30 dies → "últims 30 dies"
  - Últims 7 dies → "últims 7 dies"
  - Setmana actual → "setmana actual"
- Period is set in Configuració → Visualització → Periode per defecte
- No app name shown in the header

### Expense List

Order: newest first. Grouping: by calendar month.

**Month section header:**
```
AGOST 2026 ─────────────── €224.60
```
Left: month + year. Right: month subtotal (amber, Special Elite).

**Expense row — collapsed:**
```
Alimentació              €47.80
Supermercat    22 ago  📎 🏷
```
- Left: category name (primary) + subcategory (secondary, uppercase, muted)
- Right: amount (primary, bold) + date (secondary, muted)
- Indicators below date: 📎 if attachment present, 🏷 if context assigned. Not shown when absent.
- Tap → accordion expand

**Expense row — expanded (accordion):**
```
Alimentació              €47.80
Supermercat    22 ago  📎 🏷
┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈
Descripció   compra setmanada
Context      Llar compartida
📎 rebut_mercadona.jpg  [Obrir]
```
Tap again to collapse. "Obrir" link opens the attachment (image viewer or PDF viewer).

**Expense row — swipe-revealed (left or right, symmetric):**
```
│ 👁 Veure │ ✏️ Editar │ 🗑 Eliminar │
```
- Veure (amber): opens attachment viewer. Only shown if attachment exists.
- Editar (neutral): navigates to Full Edit screen.
- Eliminar (danger): triggers inline delete confirmation.

**Delete confirmation — inline:**
```
Segur?                      [Eliminar]   ← danger background
```
Tap outside: cancels. Tap Eliminar: entry deleted, row animates out.

### Empty State
```
        [Conchi idle — larger render]
   Encara no hi ha despeses.
   Afegeix-ne una amb el botó +.
```

---

## Screen: Estadístiques (Analytics)

### Filter Chips

Horizontal scrollable row, always visible below the header. Four filters:

| Chip | Options | Behaviour |
|---|---|---|
| Periode | Mes actual / Últims 30 dies / Últims 7 dies / Setmana actual | Single select, drum picker |
| Categoria | All categories | Single or multi-select |
| Subcategoria | Subcategories of selected Categoria | Dependent on Categoria |
| Context | All defined contexts | Single select. Hidden if no contexts exist. |

Active chip: amber. Tap chip → drum roll picker or list picker opens.

### Chart Area

Swipeable between chart types. Swipe left/right to switch.

1. **Gràfic de sectors** (donut/pie) — proportional spend by category with legend
2. **Gràfic de barres** (bar chart) — total spend per category, horizontal bars

Page-dot indicator below chart shows current chart type. User's last selection persists.

Chart area height: ~40% of screen. Data from Analytics Endpoint (n8n), reflects active filters.

### Filtered Expense List

Below the chart. Same row anatomy as Inici (collapsed + accordion expand). Only entries matching all active filters are shown. Month section headers group visible entries.

### Empty State
```
Cap resultat per als filtres actius.
[Modificar filtres]
```

---

## Screen: Configuració (Settings)

Accessed by tapping the Conchi bubble from any screen.

Grouped sections:

### CONNEXIÓ
- **URL del webhook** — n8n webhook endpoint URL (text input)
- **Endpoint SSE** — n8n SSE endpoint URL for receiving results (text input)

### VISUALITZACIÓ
- **Periode per defecte** — drum/picker: Mes actual / Últims 30 dies / Últims 7 dies / Setmana actual
- **Idioma** — Català (default) / English
- **Tema** — Clar / Fosc / Sistema

### CONTEXTOS
- "Gestió de contextos ›" — navigates to Context Manager screen

### SOBRE
- **Versió** — app version number (display only)

---

## Screen: Gestió de contextos (Context Manager)

Accessed from Configuració → CONTEXTOS.

List of all defined contexts:
```
Llar compartida                ✏️  🗑
Despeses personals             ✏️  🗑
Negoci                         ✏️  🗑
```
- Tap ✏️: edit context name (inline or push to name-edit screen)
- Tap 🗑: inline delete confirmation ("Segur?")

**Add context:** "+ Afegir context" button at bottom. Opens a simple input screen with a single name field. Save creates the context and returns to the list.

### Empty State
```
Encara no tens cap context.
[+ Afegir context]
```

---

## Screen: Edició completa (Full Edit)

Accessed from swipe → Editar on any expense row, or from the Confirmation Card.

All fields visible and editable:
- Import (amount)
- Categoria (drum picker)
- Subcategoria (drum picker, dependent on Categoria)
- Data
- Descripció
- Context (drum picker — select existing, or create new via "+ Nou context" option in the picker)
- Adjunt (attachment — view / replace / remove)

Context creation from Full Edit screen resolves OQ-14 — both Settings and Full Edit are confirmed context creation surfaces.

Save: updates entry via n8n endpoint.

---

## FAB — Radial Fan

Tapping the FAB opens a radial fan. Three mini-buttons arc upward. Semi-transparent backdrop behind fan; tap outside or tap FAB again to close without action.

```
  ✏️        📷        📄
Escriure  Càmera    PDF

          [ + ]          ← FAB
```

| Option | Icon | Label | Action |
|---|---|---|---|
| Escriure | ✏️ | Escriure | Opens text input overlay. User types entry. Submits to n8n on send. |
| Càmera | 📷 | Càmera | Opens camera or photo library. Selected image uploaded via n8n. |
| PDF | 📄 | PDF | Opens file picker filtered to PDF. Selected file uploaded via n8n. |

---

## Interaction: Two-Phase Loading

When an entry is submitted via any FAB option:

### Phase 1 — Enviant
*(HTTP POST in-flight, awaiting 200 from n8n)*

- FAB shows inline spinner
- User cannot submit another entry
- Duration: typically < 1 second on a local network
- On failure: error toast + Conchi bubble switches to Error state

### Phase 2 — Processant
*(n8n processing the entry, awaiting SSE push)*

- FAB returns to normal
- Conchi bubble switches to **Working** state
- App is **fully browsable** — user can scroll Inici or switch to Estadístiques
- Small persistent top banner: *"La Conchita ho està mirant..."* (optional implementation detail)
- Duration: variable

### Completion
- SSE response arrives
- Conchi bubble returns to **Idle** state
- Confirmation Card rises from the bottom

### Error
- SSE returns error, or timeout
- Conchi bubble switches to **Error** state — auto-reverts to Idle after 10 seconds
- Error message: *"Alguna cosa ha anat malament. Torna-ho a provar."*

---

## Conchi Bubble States

| State | Asset | Trigger | Behaviour |
|---|---|---|---|
| Idle | `conchi-idle.png` | Default / after completion / after error revert | Permanent until state change |
| Working | `conchi-working.png` | Phase 2 begins | Until SSE response or error |
| Error | `conchi-error.png` | Any error event | 10 seconds, then auto-reverts to Idle |

Transition: crossfade ~200ms. Tap always opens Configuració regardless of state.

---

## Interaction: Confirmation Card

Appears after a successful Phase 2 response from Conchita. User reviews extracted data, corrects if needed, then accepts or discards.

**Field behaviour:**
- **Import:** tap → numeric keyboard. Editable.
- **Categoria / Subcategoria:** drum pickers, side by side. Conchita's suggestion pre-selected.
- **Data:** tap → date picker or inline edit. Defaults to today.
- **Descripció:** tap → keyboard. Editable inline on the card.
- **Context:** drum picker, same pattern as Categoria. Only shown if contexts exist. "—" if none selected.
- **Adjunt:** filename shown if file was submitted. "Obrir" opens the file for review. Not replaceable from this card.
- **Conchi quote:** short italic personality line (not editable). Examples: *"Registrat. Com sempre."*, *"Tot en ordre."*

**Buttons:**
- Descartar → entry is discarded, card dismisses, no data saved
- Acceptar → entry is saved, card dismisses, row appears at top of Inici list

---

## Open Questions (UX scope)

| ID | Question | Status |
|---|---|---|
| OQ-1 | Widget deep-link UX for camera capture | Deferred to widget development |
| OQ-2 | Special Elite scope | Resolved — hero-only (home total, month total, card amount) |
| OQ-4 | Conchi quote strings per state/context | Deferred to content/copywriting phase |
| OQ-5 | Custom date range picker for Analytics | Deferred to V1.1 |
| OQ-6 | Additional empty state illustrations | Deferred |
| OQ-11 | Two-phase loading UX | Resolved — see Two-Phase Loading section |
| OQ-14 | Context creation surfaces | Resolved — Configuració (Context Manager) + Full Edit screen |
