# Layout spec

Every screen: what is on it, where it sits, how it behaves. Wireframes are schematic. Sizes are approximate unless marked **exact**. Colors and fonts come from `theme.md`. Data shapes come from `schema.md`.

---

## Screen map

| # | Screen | Route | Who sees it | Phase |
|---|--------|-------|-------------|-------|
| 3 | Builder | `/builder` (guest, saves locally) and `/forms/:id/edit` (logged in) | Anyone / owner | 1 |
| 4 | Fill page | preview inside builder, then `/f/:slug` | Respondents | 2 |
| 6 | PDF output | generated in the browser | Owner and respondent | 2 |
| 2 | My forms | `/forms` | Logged-in owner | 3 |
| 5 | Responses | `/forms/:id/responses` | Owner | 3 |
| 1 | Login / landing | `/` | Visitors | 4 |

Screen numbers match the original sketch. **Build order follows the Phase column**, not the numbers.

**Flow:** Landing → Login → My forms → Builder → Publish link → Fill page → Responses → PDF

---

## Global conventions

- **Top bar:** 56px **exact**, white, 1px bottom border. App screens use it. The fill page does not.
- **Cards:** white, 1px border, 12px radius, `shadow-sm`.
- **One primary button per view** (mango). Others are secondary (cream) or ghost.
- **Breakpoints:** mobile < 640, tablet 640 to 1023, desktop ≥ 1024.
- **The builder is desktop-first.** On screens under 1024px wide it shows a friendly "Open Formango on a larger screen to design forms" message with a button to preview the current form. Do not try to build a phone editor.
- **Everything the respondent touches is mobile-first.**
- Loading uses skeletons, not spinners, for lists. Spinners only inside buttons.
- Every list and panel has an **empty state** (icon, one line, one action).

---

## Page size presets (decided when the form is created)

The designer picks one in a "Choose size" step (like Canva's start screen), and can switch later from the bottom bar.

| Preset | Canvas | Height | Best for |
|---|---|---|---|
| **Mobile form** (default) | 390px wide | Starts at 844px, **grows** as elements are added | Anything filled on a phone. Behaves like Google Forms |
| **A4 document** | 794 x 1123px | Fixed, one page | Formal printed or emailed documents |

- **Desktop fill view of a Mobile form:** the 390px page sits centered, and the **outer background color** (`page.outerBackground`) fills the rest of the screen, exactly like a Google Form. The page has `shadow-page`.
- **Phone fill view of a Mobile form:** phones are 320 to 430px wide, so the page scales to the screen width (`scale = screenWidth / 390`, clamped to 0.85 to 1.15, centered over the outer background if narrower). No pinch zoom needed. CSS scaling does not change computed font size, so iOS still sees 16px inputs.
- **Desktop fill view of an A4 form:** fixed page, centered, scaled down if the window is narrower than the page.
- **Phone fill view of an A4 form:** switches to **List view** (below). Never ask people to pinch and zoom.
- Switching presets keeps all elements. Elements are re-clamped inside the new width (never silently deleted). A confirm dialog explains this first.

### List view (A4 forms on phones)

This is a deliberate exception to "no parallel layouts": it is a different arrangement of the **same elements and renderers**, not a second document. (Logged in `decisions.md`.)

A single-column, top-to-bottom version of the same form:
- Order: elements sorted by `y`, then `x`. Includes text, fields, and images. **Skips** shapes and lines.
- Text uses its own font, color, and alignment, scaled to fit (never below 14px).
- Fields render full width with the field's own label and input styles.
- Background uses the page background. The outer area uses the outer background.
- Submit button is sticky at the bottom, safe-area aware.
- The answers and the PDF are identical to the Page view.

---

## 3. Builder (Phase 1, the core screen)

Inspired by Canva: left rail of tools, **contextual toolbar** on top that changes with the selection, large centered page, **no permanent right panel**.

```
+----------------------------------------------------------------------------+
| Formango   Untitled form      [undo][redo]        [Preview]  [Publish]      |  top bar 56
+----------------------------------------------------------------------------+
| (contextual toolbar. Changes with selection)                                |  48
+------+------------------------------------------------------------------   +
| rail |  workspace (cream-200)                                              |
| 72px |            +------------------+                                      |
| Fields|           | page (white)     |   [selected element + handles]      |
| Elems |           |                  |                                      |
| Tmpl  |           |                  |                                      |
| Upload|           +------------------+                                      |
+------+------------------------------------------------------------------   +
| [Mobile form v]        [-]  100%  [+]  [Fit]                    [Layers]    |  bottom 44
+----------------------------------------------------------------------------+
```

When a rail item is clicked, a **flyout panel (280px)** slides out beside the rail and pushes nothing (it overlays the workspace). Click the same item, press Esc, or click the canvas to close it.

### Regions

| Region | Size | Contents |
|---|---|---|
| Top bar | 56px | Logo (links home), editable title (click to rename, Enter saves), undo, redo, save status ("Saved" / "Saving…" / "Offline"), Preview toggle, Publish (disabled until Phase 3, shows "Coming soon" tooltip; from Phase 3 the dialog shows "Unpublished changes" and **Republish** when the draft differs from the published snapshot), Export JSON in an overflow menu |
| Contextual toolbar | 48px | Content depends on selection (below). When nothing is selected it shows **Page settings** |
| Rail | 72px wide, icon + 11px label | Fields, Elements, Templates, Uploads |
| Flyout | 280px | Content for the active rail item |
| Workspace | Remaining | Shows the form's **outer background color** (so the Outer background control gives instant feedback), scrolls both ways, page centered with at least 80px padding around it |
| Bottom bar | 44px | Page size chip (opens the size menu), zoom out, zoom % (click for presets: 50, 75, 100, 150, 200), zoom in, Fit, Layers button |

### Rail panels

**Fields**: a list of 7 cards (icon, name, one-line hint): Short text, Long text, Dropdown, Checkbox, Radio, Date, Signature. Click to add at viewport center, or drag onto the page.

**Elements**:
- *Text*: three big presets: Heading, Subheading, Body. Click or drag to add.
- *Shapes*: Rectangle, Rounded rectangle, Circle/ellipse, Line.
- *Divider*: thin line preset.

**Templates**: scrollable cards (2 starter templates in Phase 1: **Contact form** and **Event registration**, both in the mobile preset). Clicking one asks "Replace current design?" if the page is not empty.

**Uploads**: "Upload image" button (PNG, JPG, WebP, max 5 MB before downscale) and a grid of images already used in this form. Click to add.

### Contextual toolbar by selection

| Selection | Controls (left to right) |
|---|---|
| **Nothing** | Page color swatch, Outer background swatch, Size preset menu, Layout grid toggle, Submit button (label, fill, text color) |
| **Text** | Font family, size stepper, color, bold, align (3 buttons), line height popover, **\|** layer menu, duplicate, delete, lock, Position popover |
| **Field** | Label (inline input), required toggle, type-specific button (Options… for dropdown, radio, checkbox; Placeholder… for text, longtext, dropdown; Validation select for text), **Style popover** (label font, label color, input fill, border color, border width, radius, text color), **\|** layer, duplicate, delete, lock, Position |
| **Shape** | Fill, border color, border width, corner radius (rect), opacity, **\|** layer, duplicate, delete, lock, Position |
| **Line** | Color, thickness, solid/dashed, **\|** layer, duplicate, delete, lock, Position |
| **Image** | Replace, fit (cover/contain), corner radius, opacity, alt text, **\|** layer, duplicate, delete, lock, Position |
| **Multiple** | Align (left, center, right, top, middle, bottom), distribute (horizontal, vertical, needs 3+), duplicate, delete, group move only |

- **Position popover:** numeric X, Y, W, H.
- **Layer menu:** Bring to front, Forward, Backward, Send to back.
- **Color popover:** default document palette (12 swatches from `theme.md`), recent colors, hex input, "No fill" option where allowed. Always shows the current value.
- On narrow desktop widths the toolbar scrolls horizontally. Never wrap to two rows.

### Canvas behavior

- **Select:** click an element. Shift-click adds or removes. Drag on empty workspace to marquee-select. Click empty space or press Esc to deselect.
- **Move:** drag. Arrow keys nudge 1px, Shift + arrow 10px.
- **Resize:** 8 handles on single selection (corners keep aspect ratio for images, free for others; hold Shift to lock ratio on shapes). Text elements with auto height only resize width.
- **Snapping:** threshold 6px (screen pixels, converted for zoom). Snaps to page edges, page center lines, page margins, and other elements' edges and centers. Shows pink guide lines while snapped. Hold **Alt** to temporarily disable snapping.
- **Layout grid** (toggle, on by default for mobile preset): extra snap lines at the margin and column positions from `schema.md`.
- **Clamping:** elements cannot leave the page horizontally. A4: cannot leave vertically. Mobile: the page grows when elements go below the bottom.
- **Text editing:** double-click a text element (or press Enter when selected) to edit in place. Esc or click outside commits. The toolbar stays usable while editing.
- **Field editing:** double-click a field's label to edit it in place.
- **Zoom:** Ctrl/Cmd + scroll, Ctrl/Cmd + `+`/`-`, `0` = fit, `1` = 100%. Range 25% to 300%. Default on open: fit to width (never above 100%).
- **Pan:** scroll, or hold Space and drag.
- **Selection chrome:** 2px `--selection` outline, white 8px handles with selection border, size badge ("350 x 72") under the element while resizing.
- **Locked elements** show a small lock icon when selected and cannot be dragged.
- **Hover:** 1px selection-color outline on the element under the cursor.

### Layers popover (bottom right)

Opens upward from the Layers button. Lists elements top-to-bottom in z-order. Each row: icon, name (double-click to rename), eye (hide), lock, up and down arrows. Click a row to select the element. Empty state: "Nothing on this page yet".

### Preview mode

Toggled from the top bar. Hides all editing chrome and renders the form exactly as a respondent sees it, **including the outer background and the device behavior**:
- Segmented control: **Desktop | Phone** to simulate the screen size.
- Fields are interactive. Nothing is saved. A "Reset answers" link clears them.
- Exit with the same toggle or Esc.

### States

- **Empty page:** centered hint on the page: "Add a field or element from the left" with two quick buttons (Add heading, Add field).
- **Autosave:** every change saves locally after 500ms. Status text in the top bar. 
- **Error:** if local storage fails or is full, show a persistent banner with "Download backup (JSON)".

---

## 4. Fill page (Phase 2)

What respondents see. No account, no editor, no app chrome.

```
Desktop, mobile-preset form:                Phone:
+------------------------------------+      +--------------+
|  (outer background color)          |      |####header####|
|        +--------------+            |      | Name         |
|        |####header####|            |      | [          ] |
|        | Name         |            |      | Email        |
|        | [          ] |            |      | [          ] |
|        | Email        |            |      |   [ Submit ] |
|        | [          ] |            |      +--------------+
|        |   [ Submit ] |            |
|        +--------------+            |
+------------------------------------+
```

- The page renders the **same element renderers** as the builder, in `fill` mode.
- Submit is **not a design element**. The app renders it below the last element, styled from `page.submit` (label, fill, text color), which the designer edits in Page settings. In Page view it sits inside the page under the content, and the page grows to fit it. In List view it is sticky at the bottom. The PDF does not include it.
- Inline validation: errors appear under the field in berry-700 with an icon, the first invalid field is scrolled into view and focused. Validate on blur, then on change after the first error.
- Required fields show a red asterisk after the label.
- After submit: success state replaces the form (check icon, "Thanks, your response was recorded", **Download my copy (PDF)**, "Submit another response").
- Closed form (unpublished): "This form is closed" with no data.
- Not found: friendly 404 with link home.
- Includes a hidden honeypot input and a minimum 2 second fill time.
- Small footer line outside the page: "Made with Formango" (link). **No ads in v1.**

---

## 6. PDF output (Phase 2)

Generated **in the browser** with pdf-lib. The PDF is a drawing of the document at its saved coordinates, so it matches the builder.

```
+------------------------------+
|####### Event registration ###|   shapes, text, images at saved positions
|                              |
| Name                         |   field label (label style)
| [ Asha R.                  ] |   input box (input style) with the answer
| Ticket                       |
| [ Standard                 ] |
| Signature                    |
| [   Asha (drawn image)     ] |
+------------------------------+
```

| Mode | Behavior |
|---|---|
| **Filled** (default) | Draws the design plus the respondent's answers flattened into the page |
| **Fillable blank** | Draws the design plus real AcroForm fields people can type into in any PDF reader (signature becomes a drawn box) |

- **A4 preset:** one A4 page (595.28 x 841.89 pt), 1:1 mapping at `scale = 595.28 / 794`.
- **Mobile preset (v1):** one tall page, width 595.28 pt, height = `displayHeight * (595.28 / 390)`. Proper A4 pagination is a later improvement.
- Footer line is not added. The design is the document.
- File name: `<form title slug>-<YYYY-MM-DD>.pdf`.

---

## 2. My forms (Phase 3)

```
+------------------------------------------------------------+
| Formango      Presets      My forms                 Avatar |
+------------------------------------------------------------+
|  Your forms                                  [ + New form ]|
|  +-------+  +-------+  +-------+  +-------+  +---          |
|  | + New |  |[thumb]|  |[thumb]|  |[thumb]|  |[th          |
|  |       |  | title |  | title |  | title |  | ti          |
|  |       |  | 12 res|  | 3 res |  | Draft |  |             |
|  +-------+  +-------+  +-------+  +-------+  +---          |
|  <------------ horizontal scroll ------------>             |
+------------------------------------------------------------+
```

| Region | Contents |
|---|---|
| Nav | Left: logo and "Presets". Center: "My forms" (active). Right: avatar menu (Account, Log out) |
| Header row | "Your forms" and the primary "+ New form" button |
| Card row | **Horizontal scroll**, snap-scrolling, cards about 220px wide so the last one is partly visible. On mobile it becomes a vertical grid of 2 columns |

**Card:** thumbnail (live scaled render of the form, 16:10 crop from the top), title, status chip (Draft / Published), response count, "Edited 2h ago". Click opens the Builder. A "⋯" menu: Responses, Copy link, Duplicate, Delete (with confirm).
**First card** is dashed "+ New". It opens the **Choose size** dialog (Mobile form, A4 document) then creates the form and opens the Builder.
**Empty state:** only the "+ New" card and the line "Create your first form".
**Loading:** 4 skeleton cards.

---

## 5. Responses (Phase 3)

```
+------------------------------------------------------------+
| < Forms   Event registration       [Copy link] [Export CSV]|
+------------------------------------------------------------+
|  +---------+   +---------+   +---------+                   |
|  | Total   |   | Today   |   | Last    |                   |
|  | 48      |   | 6       |   | 2h ago  |                   |
|  +---------+   +---------+   +---------+                   |
|  [ search........ ]                                        |
|  Submitted     Name        Email              PDF          |
|  ------------------------------------------------          |
|  Today 10:41   Asha R.     asha@mail.com      [dl]         |
+------------------------------------------------------------+
```

- Metric cards: Total, Today, Last response. (No view count in v1, it needs tracking.)
- Table shows submitted time plus the first 2 to 3 fields. Click a row to open a side panel with all answers and a **Download PDF** button. Row action: Delete (confirm).
- Search filters on any field. Sort by submitted time (default newest first). Paginate 25 per page.
- **Empty state:** share link with copy button and "Responses will appear here".

---

## 1. Landing and login (Phase 4)

```
+------------------------------------------------------------+
| Formango   Presets                         Login / Sign up |
+------------------------------------------------------------+
|  ###############\                                          |
|  # Presets      \        +--------------------+            |
|  # scroll by     \       |  Welcome back      |            |
|  #  [card]        \      |  [ email        ]  |            |
|  #     [card]     /      |  [ password     ]  |            |
|  #               /       |  [ Log in ]        |            |
|  ###############/        |  Try the builder   |            |
|                          +--------------------+            |
+------------------------------------------------------------+
```

| Region | Size | Contents |
|---|---|---|
| Nav | 56px | Left: logo, "Presets". Right: "Login / Sign up" |
| Presets panel | Left about 62% | Mango gradient panel with a **diagonal right edge** (`clip-path: polygon(0 0, 100% 0, 74% 100%, 0 100%)`). Holds a slowly auto-scrolling, slightly staggered column of preset form cards |
| Login card | Right about 38% | Title, email, password, "Log in", toggle to sign up, divider, **"Try the builder without an account"** link to `/builder` |

- Presets scroll continuously and pause on hover and when `prefers-reduced-motion` is set (then they are static).
- Clicking a preset opens a read-only preview modal with a "Use this template" button (sends to login, then creates the form).
- **Mobile:** presets become a short horizontal strip above the card. The diagonal edge becomes a straight edge.
- Auth errors show inline under the field. Password needs 8+ characters. "Show password" toggle.
