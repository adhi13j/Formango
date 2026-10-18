# To-do list (in order)

Work **top to bottom**. One task at a time. After each task: run the checks in `CLAUDE.md`, then commit with a clear message (`done: 1.11 move, resize and snapping`).

**Stop at the end of every phase** and write a short handoff note (what works, what to click, known issues) so the owner can test. **Phase 1 is the first milestone: the owner must be able to test the page builder.**

Task format: **Do** (what to build), **Details** (the small things that make it good), **Done when** (how to verify).

| Phase | Goal | Size |
|---|---|---|
| 0 | Setup, theme, PDF spike | M |
| 1 | Page builder, local only | XL (many sessions) |
| 2 | Fill page and PDF export | L |
| 3 | Accounts, sharing, responses | L |
| 4 | Landing, polish, deploy | M |

Sizes replace the old hour estimates, which were unrealistic (Moveable snapping and PDF pixel matching alone take far longer). A task should fit about one working session. If it does not, split it and tick the pieces.

**Per task:** run `npm run check:fast` before each commit. Run the full `npm run check` at the end of each phase (CI also runs it).

---

# Phase 0: Setup

- [x] **0.1 Create the project**
  - **Do:** in the existing project folder (it already holds `CLAUDE.md` and `docs/`), scaffold Vite in place: `npm create vite@latest . -- --template react-ts` (keep the existing files when asked), then `git init`.
  - **Details:** add `.gitignore` (node_modules, dist, .env, .env.local, .DS_Store). Create `.env.example` with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` (empty). Create a GitHub repo and push, so there is an off-machine backup from day one.
  - **Done when:** `npm run dev` serves the default page. First commit made and pushed.

- [x] **0.2 TypeScript strictness and aliases**
  - **Do:** in `tsconfig`, enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. Add path alias `@/*` to `src/*` in both tsconfig and `vite.config.ts`.
  - **Done when:** `import x from '@/lib/x'` works and `npm run typecheck` (`tsc --noEmit`) passes.

- [x] **0.3 Tooling and scripts**
  - **Do:** install ESLint (typescript-eslint, react-hooks plugin), Prettier. Add scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `check:contrast`, `check:fast` (lint, typecheck, test), `check` (check:fast, check:contrast, build, and Playwright once task 0.7 adds it). Add `.github/workflows/ci.yml` running `npm ci` and `npm run check` on push (free for public repos).
  - **Details:** Prettier: single quotes, semicolons, 100 columns, trailing commas. Lint must fail on unused vars and on `any` (use `unknown` and narrow).
  - **Done when:** `npm run check` passes on the empty project.

- [x] **0.4 Tailwind v4 and shadcn/ui**
  - **Do:** follow the current Tailwind v4 Vite install (`@tailwindcss/vite`). Copy `docs/theme.css` to `src/styles/theme.css`. Import order in `src/index.css`: `@import "tailwindcss"; @import "./styles/theme.css";`. Initialize shadcn/ui, choose neutral base, and make sure it uses the semantic tokens from `theme.css` (do **not** let it overwrite the color variables).
  - **Add shadcn components on demand**, in the task that first needs them. For this task add only `button` (to prove the theme). Likely later: input, label, select, popover, dialog, dropdown-menu, tooltip, toggle, toggle-group, slider, tabs, sonner, skeleton, separator, scroll-area, switch.
  - **Details:** global styles: `html { height: 100% }`, `body { min-height: 100% }`, `-webkit-font-smoothing: antialiased`, `box-sizing: border-box` everywhere. Set the focus ring globally to 2px `--ring` with 2px offset.
  - **Done when:** a test page shows a mango `Button` with dark text, a cream card, and matches `theme-preview.html`.

- [x] **0.5 Fonts**
  - **Do:** get static font files for the 7 fonts in `spec.md` (weights 400 and 700) plus the UI weights (DM Sans 400, 500, 700; Poppins 600). Keep the TTFs in `public/fonts/ttf/` (used by the PDF exporter) and generate woff2 copies in `public/fonts/` (used by `@font-face`) with the license files in `public/fonts/licenses/`. Write `src/styles/fonts.css` with `@font-face` rules (woff2, `font-display: swap` for UI fonts). Create `src/lib/fonts.ts` exporting `FONTS: Record<FontId, { label, family, files: {400: {woff2, ttf}, 700: {woff2, ttf}} }>`, `loadFonts(ids)` (loads only the given fonts) and `loadAllFonts()` (builder) that call `document.fonts.load('400 16px "<family>"')` and the 700 variant, resolving when done (timeout 4s, never rejects). The fill page calls `loadFonts` with just the fonts the doc uses.
  - **Details:** do not use Google Fonts links. File names lowercase with hyphens. Set `font-kerning: none` and `font-variant-ligatures: none` globally for form content (see `spec.md`).
  - **Done when:** DevTools Network shows fonts served from your own origin, and `loadAllFonts()` resolves in the console.

- [x] **0.5b PDF text spike (about 1 hour, throwaway)**
  - **Do:** in a scratch page, embed Poppins and Playfair TTFs with pdf-lib and fontkit, draw a few wrapped paragraphs (left, center, right) using line breaks from a canvas `measureText` with `fontKerning = 'none'`, and overlay the DOM rendering of the same text.
  - **Details:** check line widths, baselines, and that explicit alignment using `font.widthOfTextAtSize` agrees with the DOM within 1px per line. Also check that an AcroForm text field with a **subset** embedded font fails to show typed characters outside the subset, and that a full (non-subset) font works.
  - **Done when:** the result is written to `docs/decisions.md` (kerning setting that works, subset policy for fillable PDFs). If the match is worse than about 1px, change the plan before building 1.3. Delete the scratch code afterwards.

- [x] **0.6 Contrast check script**
  - **Do:** `scripts/check-contrast.ts` (run with `tsx` or node) that parses `src/styles/theme.css`, resolves the tokens, and checks the pairs listed in `docs/theme-preview.html` (same minimums). Exit code 1 and a readable table on failure. Wire to `npm run check:contrast` and include it in `npm run check`.
  - **Done when:** it passes now, and fails if you temporarily change `--primary-foreground` to white.

- [x] **0.7 Test setup**
  - **Do:** install Vitest, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. Add `src/test/setup.ts`. Add one trivial passing test.
  - **Details:** canvas `measureText` does not exist in jsdom. Add a small mock in the setup (width = characters x 0.5 x font size) used only by tests.
  - **Done when:** `npm test` passes.
  - **Also:** install Playwright (Chromium only) with `npm run test:e2e` and one trivial test that loads `/`. Add it to `npm run check`. Real e2e tests arrive in 1.11 and 2.x.

- [x] **0.8 Folder structure and router skeleton**
  - **Do:** create the folders from `conventions.md`. Install `react-router-dom`. Routes: `/` (placeholder "Landing"), `/builder` (placeholder), `*` (NotFound page with a link home).
  - **Details:** `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/ErrorBoundary.tsx` (friendly fallback with Reload button). Add `<title>` per route. Add favicon (a simple mango SVG in `public/favicon.svg`) and `lang="en"`.
  - **Done when:** all three routes render, an intentionally thrown error shows the fallback.

- [x] **0.9 Phase 0 checkpoint**
  - **Do:** run `npm run check`. Commit. Write the handoff note. Ask the owner to open `docs/theme-preview.html` and the running app and approve the look before Phase 1.

---

# Phase 1: Page builder, local only

Goal: by the end, the owner can open `/builder`, design a form, undo and redo, preview it, reload the page and still have it, and export and import JSON. No backend.

**Recommended order** (vertical slice first, so something visible exists early): 1.1, 1.2, 1.3, 1.4, **1.8, 1.9** (render a hard-coded doc), 1.5, 1.6, 1.10, 1.11, **mini-checkpoint A** (owner tries move, resize, snap), 1.12, 1.13, 1.14, **mini-checkpoint B**, 1.17, 1.18, 1.19, 1.20, 1.21, then the optional items 1.15 (copy/paste part), 1.16 (align and distribute), then 1.22. Task 1.7 is folded into 1.3.

**Task splitting:** 1.9 (static renderers first, then interactive fields), 1.11 (move and resize, then snapping, then per-type resize rules and multi-select) and 1.14 (toolbar scaffold and color popover, then options editor, then the rest) are each too big for one session. Split them and tick the parts.

- [x] **1.1 Types and schema**
  - **Do:** create `src/types/doc.ts` exactly as in `docs/schema.md` (note: no `id` and no `recentColors` on `FormDoc`; `page.submit` and `TextElement.role` exist). Create `src/types/doc.schema.ts` (Zod) mirroring it, plus `migrate()` and `createBlankDoc(preset)`.
  - **Details:** constants in `src/lib/constants.ts`: page presets, element defaults table, min sizes (width 80, text min width 40, field min height per `schema.md`), max elements 150, snap threshold 6, zoom range 0.25 to 3, default palette from `theme.md`.
  - **Done when:** unit tests: blank doc validates, a doc with an unknown element type fails, `migrate` returns a valid doc for version 1.

- [x] **1.2 Geometry helpers (pure functions, fully tested)**
  - **Do:** `src/lib/geometry.ts`: `clamp`, `rectOf(el)`, `rectsIntersect`, `unionRect`, `clampToPage(el, page, displayHeight)`, `displayHeight(doc)`, `screenToDoc(point, containerRect, zoom, scroll)`, `snapToGrid`, `alignElements(els, mode)`, `distributeElements(els, axis)`.
  - **Done when:** tests cover each function including edge cases (zero-size, negative coordinates, 3 elements distribute).

- [x] **1.3 Text layout engine**
  - **Do:** `src/lib/text/layoutText.ts`: `layoutText({ text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight, maxLines? }) => { lines: string[]; height: number; lineHeightPx: number }` using a cached offscreen canvas with the exact font string (`"700 28px Poppins"`), `ctx.textRendering = 'geometricPrecision'` and `ctx.fontKerning = 'none'`. **Measure the sum of per-character advances** (cache `measureText(char).width` per font and character), never a whole string, so ligatures cannot change widths (see the 0.5b results in `decisions.md`). Also add the fonts-ready gate here (old task 1.7): the builder shows a skeleton until `loadAllFonts()` resolves (max 4s) so measurement is correct on first render.
  - **Details:** preserve explicit `\n`. Break on spaces. A word longer than `maxWidth` breaks by character. Collapse trailing spaces on each line. Empty lines count. Cache by key to avoid re-measuring. Also export `fontMetrics(fontFamily, fontSize, weight)` returning `ascent` and `descent` from `fontBoundingBoxAscent/Descent` (fallback `0.8 / 0.2` times size). `height = lines.length * fontSize * lineHeight`.
  - **Why it matters:** the same line breaks are used by the editor, the fill page, and the PDF, so text never wraps differently between screen and PDF. **Render text as one div per line** (`white-space: pre`) using these lines.
  - **Done when:** tests (with the canvas mock) cover wrapping, long words, newlines, empty text, and caching.

- [x] **1.4 Doc store with undo/redo**
  - **Do:** `src/store/docStore.ts` with Zustand + zundo. State: `doc`. Actions: `loadDoc`, `newDoc(preset)`, `setTitle`, `setPage(partial)`, `switchPreset(preset)`, `addElement(el)`, `updateElement(id, patch)`, `updateElements(patches[])`, `removeElements(ids)`, `duplicateElements(ids)`, `reorder(ids, 'front'|'forward'|'backward'|'back')`, `setLocked`, `setHidden`, `renameElement`. Recent colors are **not** doc state: keep them in the UI store (`recentColors`, max 12, persisted in localStorage) with `pushRecentColor(hex)`. Expose `pauseHistory()` and `resumeHistory()` so continuous controls (sliders, color drag, held steppers, arrow-key nudging) commit one history entry.
  - **Details:** history limit 100, `partialize` to `doc` only, and **ignore changes that do not alter the doc** (equality check) so undo does not fill with no-ops. Every action runs through a `normalize()` step: clamp to page, enforce min sizes, recompute heights of auto-height text (via `layoutText`) and of radio/checkbox fields (per `schema.md`), cap elements at 150, round to integers. Gestures commit **once** at the end (see 1.9), so one drag = one undo step. `duplicateElements` offsets copies by +16,+16, keeps names with " copy" appended, new ids.
  - **UI store** (`src/store/uiStore.ts`, not in history): `selectedIds`, `editingId`, `zoom`, `fitMode`, `activeRail`, `mode: 'edit'|'preview'`, `previewDevice: 'desktop'|'phone'`, `snapEnabled`, `gridEnabled`, `clipboard`, `saveStatus`, `layersOpen`.
  - **Done when:** tests for add, update, delete, reorder, duplicate, undo/redo, clamping, min-size enforcement, and "no-op change adds no history".

- [x] **1.5 Local persistence**
  - **Do:** `src/lib/persistence.ts`: save to `localStorage['formango:builder:doc:v1']` debounced 500ms after any doc change; load on startup through Zod and `migrate`.
  - **Details:** apply the storage decision in `decisions.md` (IndexedDB via `idb-keyval`, or localStorage with lower guest limits). The key names below are for localStorage; mirror them if IndexedDB is chosen. Set `saveStatus` to `saving` then `saved`. Wrap every storage call in try/catch (quota, private mode). On failure set status `error` and show a banner with **Download backup (JSON)**. On invalid stored data: toast "Couldn't restore your last design", keep the raw string available for download, load a blank doc. Add `beforeunload` warning only while status is `error`.
  - **Export/import:** `exportJson()` downloads `<title-slug>.formango.json`. `importJson(file)` validates with Zod, shows specific errors, and asks before replacing a non-empty doc.
  - **Done when:** edit, reload, and the design is back. Corrupt the localStorage value by hand and the app recovers.

- [x] **1.6 App shell for the builder**
  - **Do:** build the layout from `layout.md` section 3: top bar (56), contextual toolbar (48), rail (72), flyout (280), workspace, bottom bar (44). Use CSS grid. The workspace is the only scrolling region.
  - **Details:** top bar: logo, editable title (click to edit, Enter commits, Esc cancels, empty falls back to "Untitled form", max 120), undo and redo buttons (disabled when impossible, with tooltips showing shortcuts), save status, Preview toggle, Publish (disabled, tooltip "Coming soon"), overflow menu (New design, Export JSON, Import JSON, Keyboard shortcuts). Below 1024px width show the "use a larger screen" message. Rail buttons are real `<button>`s with `aria-pressed`. Flyout closes on Esc and on canvas click.
  - **Choose size dialog:** if no saved doc exists, or on "New design", show a dialog with the two presets (visual cards with a small illustration, name, one-line description). Mobile form is preselected.
  - **Done when:** shell renders at 1280px and 1920px widths without overflow, tab order is logical, and the title edits and persists.

- [x] **1.7 Fonts ready gate**: merged into 1.3. Verify when 1.8 lands: no layout jump after first paint when using Poppins or Playfair.

- [x] **1.8 Canvas, page, and zoom**
  - **Do:** `src/features/builder/Canvas.tsx`: scroll workspace containing a sizer div (`width = pageWidth*zoom + padding`, `height = displayHeight*zoom + padding`) and the page div with `transform: scale(zoom)`, `transform-origin: 0 0`, absolutely positioned and centered when smaller than the viewport.
  - **Details:** fit zoom = `min(1, (workspaceWidth - 160) / pageWidth)`, recomputed on resize (ResizeObserver) while `fitMode` is on. Manual zoom turns off fit mode. Zoom with Ctrl/Cmd+wheel keeps the point under the cursor fixed (adjust scroll). Buttons, presets, and shortcuts (`Ctrl +`, `Ctrl -`, `0`, `1`) go through one `setZoom(value, anchor?)` function that clamps 0.25 to 3 and rounds to 1%. Space + drag pans (cursor `grab`/`grabbing`). The page has `shadow-page` and the page background color. Mobile preset: page height follows `displayHeight(doc)`.
  - **Done when:** zoom 25% to 300% works smoothly, text stays sharp, page stays centered, scrollbars behave, and fit mode follows window resize.

- [x] **1.9 Element renderers**
  - **Do:** `src/components/elements/` with `ElementView.tsx` and one component per type: `TextView`, `ShapeView`, `LineView`, `ImageView`, `FieldView`. Props: `{ el, mode }`. Memoize with `React.memo` and compare by element reference.
  - **Details:**
    - Every element root: `position:absolute; left:x; top:y; width; height; box-sizing:border-box`. `data-element-id` attribute for hit testing. `pointer-events: none` on children in `edit` mode, so the root receives all pointer events.
    - Text: lines from `layoutText`, rendered as an `<h2>` (role heading) or `<p>` (role body) containing one span per line (`display: block`, `white-space: pre`), `line-height` in px, alignment applied per line, `overflow: visible`. Screen readers and text selection then treat it as one paragraph.
    - Shape: rect or ellipse with fill, stroke (CSS border, border-box), radius clamped to half the shorter side, opacity. `null` fill is transparent.
    - Line: a div with height = thickness; dashed uses a repeating gradient or `border-top: dashed` so the pattern is stable.
    - Image: `<img>` with `object-fit`, radius, opacity, `alt`, `draggable=false`. Broken image shows a placeholder icon, not a broken glyph.
    - Field: label line (single line, truncated with an ellipsis via measurement), required asterisk in berry after the label, then the input area per `schema.md` anatomy. In `edit` mode the input area is **visual only** (placeholder or "Option 1" rows, caret-free). In `preview` and `fill` modes use **real** `<input>`, `<textarea>`, `<select>`, radio and checkbox inputs, custom-styled to match `inputStyle`, with `aria-labelledby` pointing to the label and `fieldset`/`legend` for groups. Use 16px minimum font size for real inputs on mobile.
    - Hidden elements: render nothing in `preview`/`fill`, render at 30% opacity with a dashed outline in `edit`.
  - **Done when:** a hard-coded test doc with one of each element renders correctly in edit and preview, text matches a manual browser-wrapped comparison within 1px per line.

- [x] **1.10 Selection**
  - **Do:** `useSelection` logic in the canvas: click selects, Shift/Cmd-click toggles, click empty page or workspace clears, Esc clears, marquee drag selects intersecting elements (compute in doc coordinates, not DOM), Ctrl/Cmd+A selects all unlocked, hover outline on the element under the cursor.
  - **Details:** hit testing uses topmost element under the pointer (reverse z-order, skipping hidden). Locked elements are selectable but not draggable. Marquee rectangle uses `--selection` at 10% fill and 1px border. Marquee must not start when the pointer is on an element.
  - **Done when:** all selection paths work with 20 overlapping elements, including locked and hidden ones.

- [x] **1.11 Move, resize, and snapping with react-moveable**
  - **Do:** render `<Moveable>` for the current selection with `draggable`, `resizable`, `snappable`.
  - **Details (important):**
    - **Gesture performance:** during `onDrag`/`onResize`, apply the transform and size directly to the DOM node (what Moveable gives you). Do **not** write to the store on every pointer move. On `onDragEnd`/`onResizeEnd`, compute final x, y, width, height in **document pixels**, round to integers, run `normalize`, and call `updateElements` **once**. That makes one gesture equal one undo step.
    - **Live text re-wrap:** while resizing an auto-height text element, re-run `layoutText` from a transient local width (ref or component state, not the store) so the text re-wraps during the gesture instead of jumping at the end.
    - **Zoom correctness:** verify with a **Playwright** test (jsdom cannot do layout) that dragging 100 screen px at 200% zoom moves the element 50 doc px and that Ctrl+Z restores it in one step. If Moveable's events are not already in the element's local coordinate space, convert deltas by dividing by `zoom`. Use the library's `zoom` option so handles stay a constant on-screen size.
    - **Snap targets:** page edges, page horizontal and vertical centers, page margin lines, layout grid columns (when the grid toggle is on), and edges/centers of all other non-hidden elements (`elementGuidelines`). Threshold = `6 / zoom` doc px. Hold **Alt** to disable. Guide lines use `--guide`. Show a small size badge while resizing.
    - **Resize rules:** 8 handles for single selection; corner handles keep aspect ratio for images; Shift locks ratio for shapes; text with `autoHeight` allows width only (east/west handles) and recomputes height; fields with radio/checkbox lock height to the computed value; lines resize width only; enforce min sizes; clamp to page.
    - **Multi-select:** move only (no resize), one history entry.
    - **Locked** elements: Moveable not attached.
    - **Starting a drag on an unselected element:** select it on pointer down, then forward the event to Moveable's `dragStart` so one press-and-drag moves it without a separate click.
    - Keep the selection chrome colors from `theme.md`.
  - **Done when:** drag, resize, and snap feel smooth at 50%, 100%, and 200% zoom with 100 elements, guides appear and disappear correctly, and undo restores the pre-gesture state in one step.
  - **Mini-checkpoint A (short stop):** after this task, tell the owner how to run it and ask them to try move, resize, snap, zoom, and undo. This is the riskiest interaction code, so catch feel problems before building more on top.

- [x] **1.12 Add elements: rail panels**
  - **Do:** implement the flyout panels from `layout.md`. **Click** adds at the center of the visible workspace area (converted to doc coordinates, clamped, offset by +16 for repeated adds to avoid perfect stacking). **Drag** from the panel onto the page uses HTML5 drag and drop with a custom MIME type (`application/x-formango-element`) and drops at the cursor.
  - **Details:** new element becomes selected and the flyout stays open. Defaults come from the table in `schema.md`. Field `key` is a slug of the label, made unique (`email`, `email-2`). New elements get a readable `name` ("Short text", "Heading"). Respect the 150 element cap with a toast. Uploads: accept PNG, JPG, WebP up to 5 MB; downscale to max 1600px on the long side with a canvas, re-encode (WebP or JPEG 0.85, PNG if transparent), reject if the result is over 1.5 MB, then add as a data URL. Reject SVG with an explanation.
  - **Done when:** each of the 7 fields, 3 text presets, 3 shapes, line, and image can be added by click and by drag, and appear exactly under the drop point.

- [x] **1.13 Inline text editing**
  - **Do:** double-click a text element (or Enter with it selected) shows an overlay `<textarea>` that matches the element's font, size, color, alignment, line height, and width, auto-growing. Esc or click outside commits. The toolbar stays usable. Double-click a field label edits the label the same way (single line).
  - **Details:** while editing, Moveable is hidden. Empty text commits as "Text" (never leave an invisible element). `Ctrl+Enter` also commits. Pasting strips formatting. Max 2000 chars for text, 120 for labels.
  - **Done when:** edit, commit, undo, and redo work, and the final render has the same line breaks as the editing view within one line.

- [x] **1.14 Contextual toolbar**
  - **Do:** implement every toolbar variant from `layout.md` as small components in `src/features/builder/toolbar/`. Every control updates through `updateElements` so multi-selection edits apply to all selected elements of the same type.
  - **Details:**
    - **Color popover:** 12 default swatches, recent colors, hex input (validate `#RGB` and `#RRGGBB`, normalize to uppercase `#RRGGBB`), "No fill" where allowed, live preview of the current value, adds to recent colors on commit (max 12, deduped).
    - **Font select:** each option rendered in its own font; typing to filter is optional.
    - **Size stepper:** type or use up/down arrows, clamp 8 to 120, Enter commits.
    - **Options editor (dropdown, radio, checkbox):** popover list with add, remove (min 1), reorder up/down, inline rename, de-duplicate on commit, max 50, and an "Add option" button that focuses the new row. Pasting multiple lines creates multiple options.
    - **Position popover:** X, Y, W, H numeric inputs, clamped, commit on blur or Enter.
    - **Layer menu:** the four operations, disabled when already at the end.
    - **Page settings (nothing selected):** page color, outer background, preset menu (with the confirm dialog from `layout.md`), grid toggle, and Submit button label, fill, and text color (`page.submit`).
    - Controls show **mixed** state when the selection has different values.
    - All icon-only buttons have tooltips and `aria-label`s.
  - **Done when:** every control changes the canvas immediately, is undoable, and works with multi-selection.
  - **Mini-checkpoint B (short stop):** ask the owner to build a small form with the toolbar and report anything awkward.

- [x] **1.15 Keyboard shortcuts**
  - **Do:** one hook `useEditorShortcuts` attached at the builder root.
  - **Shortcuts:** Delete/Backspace remove; Ctrl/Cmd+D duplicate; Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z and Ctrl+Y redo; Ctrl/Cmd+C, X, V copy, cut, paste (optional "should have", build last; internal clipboard, paste offset +16 that grows per paste); arrows nudge 1px, Shift+arrows 10px; Ctrl/Cmd+A select all; `[` and `]` layer backward and forward, with Ctrl/Cmd to send to back and front; Enter edit text; Esc cascade (close popover, stop editing, clear selection); `?` opens the shortcut dialog; Ctrl/Cmd +, -, 0, 1 zoom; Space pan.
  - **Details:** ignore shortcuts while focus is in an input, textarea, select, or contenteditable, and while a dialog is open. Prevent the browser default only for shortcuts we handle. Nudging with held arrow keys coalesces into one history entry (commit on keyup). Build the shortcut dialog from the same shortcut list so docs never drift.
  - **Done when:** every shortcut works on Mac and Windows modifier keys and none fire while typing in a toolbar input.

- [x] **1.16 Layers popover and alignment tools**
  - **Do:** layers popover per `layout.md` (select, rename, hide, lock, reorder buttons). Multi-select toolbar (align and distribute are "should have", build after the rest of Phase 1): align left, center, right, top, middle, bottom, and distribute horizontally or vertically (3+ elements).
  - **Done when:** hiding and locking reflect on canvas immediately, renaming persists, and align/distribute produce exact pixel results (covered by the geometry tests from 1.2).

- [x] **1.17 Templates**
  - **Do:** `src/templates/contact-form.json` and `event-registration.json` (mobile preset, using the theme colors and fields: name, email, message; name, email, ticket type radio, dietary checkboxes, signature). Template card thumbnails render live from the JSON using the same renderers at 0.25 scale.
  - **Details:** templates must validate against the Zod schema (add a test that loads every template JSON). Applying a template replaces the doc after confirm if the current page has elements, and is undoable.
  - **Done when:** both templates look good (header band, spacing on the 20px margin) and are fully editable.

- [x] **1.18 Preview mode**
  - **Do:** the Preview toggle switches `mode` to `preview`. Hide the toolbar, rail, flyout, Moveable, and guides. Show a slim bar with **Desktop | Phone** and **Reset answers** and **Exit preview**.
  - **Details:** Desktop: page centered on `outerBackground` filling the workspace, page keeps its width. Phone: workspace becomes a 390px wide frame with rounded corners. For an A4 form in Phone mode, render **List view** (`layout.md`). Fields are real and interactive and nothing is saved. Esc exits.
  - **Done when:** preview matches the edit view exactly in Desktop mode, and the outer background color shows around a mobile-preset page.

- [x] **1.19 Empty, error, and loading states**
  - **Do:** empty-page hint, the save error banner, the unsupported-screen message, toasts for add limits and import errors, error boundary around the canvas so a bad element cannot blank the app.
  - **Done when:** each state can be triggered and looks intentional.

- [x] **1.20 Accessibility pass for the builder**
  - **Do:** tab through the whole shell. Add `aria-label`s, `role="toolbar"` on the contextual toolbar, `aria-live="polite"` for the save status and toasts, focus return after closing popovers and dialogs, visible focus rings. Selected element announces its name and type via a visually hidden live region.
  - **Done when:** a keyboard-only user can add a field, edit its label, move it with arrows, delete it, and undo.

- [x] **1.21 Tests and performance check**
  - **Do:** finish unit tests (store, geometry, layoutText, persistence, schema, templates). Add a component test for ElementView in each mode. Add a dev-only "Add 100 elements" menu item (hidden in production builds) and profile dragging with React DevTools and the browser Performance tab.
  - **Done when:** `npm run check` passes. Dragging with 100 elements shows no long tasks over 50ms and no re-render of unselected elements (verify with the React Profiler).

- [ ] **1.22 Phase 1 checkpoint (STOP and hand to owner)**
  - **Do:** run the full `npm run check` (including Playwright), then `docs/qa-checklist.md` section "Phase 1" yourself and fix failures. Tag `phase-1`. Commit. Write the handoff note: how to run, what to click, known limitations, screenshots. **Wait for the owner to test the builder before starting Phase 2.**

---

# Phase 2: Fill page and PDF export

- [ ] **2.1 Answers state and validation**
  - **Do:** `src/lib/answers.ts`: `validateAnswers(doc, answers) => Record<elementId, string>` (error messages), `isEmptyAnswer`, `formatDate`. Rules in `schema.md` (required, email, phone, number, max lengths, options must exist).
  - **Details:** messages are short and human ("Enter a valid email", "This field is required"). Hidden fields are skipped. Trim whitespace before validating.
  - **Done when:** tests cover every field type and rule.

- [ ] **2.2 Fill page component**
  - **Do:** `src/features/fill/FillForm.tsx` renders Page view or List view (from `layout.md`) based on preset and viewport width (A4 + width under 640 = List view). Reuse `ElementView` in `fill` mode. Keep answers in local state keyed by element id.
  - **Details:** Page view of a Mobile form on a phone scales to the screen width, clamped 0.85 to 1.15 (`layout.md`). A4 Page view scales down to fit a narrow window (never up). Load only the fonts the doc uses (`loadFonts`). The Submit button uses `page.submit`. List view sorts by `y` then `x`, skips shapes and lines, sticky Submit. Submit is rendered by the app (see `layout.md`). Validate on blur, then on change after the first error, and on submit; focus and scroll to the first error. Honeypot input (visually hidden, `tabindex=-1`, `autocomplete=off`), and block submission faster than 2 seconds after mount. Success screen with "Download my copy (PDF)" and "Submit another response".
  - **Done when:** the form works with keyboard only and on a 390px wide viewport with no horizontal scroll.

- [ ] **2.3 Signature pad**
  - **Do:** `SignaturePad.tsx` inside the signature field in `fill`/`preview` mode. Pointer Events, canvas scaled by `devicePixelRatio`, smooth strokes (quadratic curves between midpoints), `touch-action: none` on the canvas, Clear button, line color `ink-900`, width 2.5px.
  - **Details:** logical size 400 x 150, exported with `toDataURL('image/png')` after cropping to the ink bounds with 8px padding and re-scaling down so output stays under about 60 KB. Track `hasInk` so an empty pad counts as no answer. Keyboard users get a text fallback input "Type your name" that renders in the Caveat font as the signature (draw to canvas and export).
  - **Done when:** drawing is smooth on mouse and touch, Clear works, and the answer is a valid PNG data URL under the size limit.

- [ ] **2.4 Local submit stub**
  - **Do:** for now, "Submit" saves to `localStorage['formango:builder:responses:v1']` as `{ id, createdAt, answers }[]` through a `ResponsesRepo` interface (`create`, `list`). Phase 3 swaps the implementation to Supabase without touching the UI.
  - **Done when:** submitting twice stores two entries and they survive a reload.

- [ ] **2.5 PDF exporter: setup and geometry**
  - **Do:** `src/pdf/exportPdf.ts` with `exportPdf(doc, answers | null, { mode: 'filled' | 'fillable' }) => Promise<Uint8Array>`. Lazy-load pdf-lib and fontkit with dynamic `import()` on first use.
  - **Details:**
    - **Page size and scale:** A4 = 595.28 x 841.89 pt, `scale = 595.28 / page.width`. Mobile preset: page width 595.28 pt, height `displayHeight * scale`.
    - **Coordinates:** PDF origin is bottom-left. For an element, `pdfY = pageHeightPt - (el.y + el.height) * scale`. Centralize this in one `toPdfRect(el)` helper and test it.
    - **Colors:** `hexToRgb01()` helper. Opacity via the `opacity` and `borderOpacity` options.
    - **Fonts:** fetch the TTFs once (cache the bytes), register `fontkit`, `embedFont(bytes, { subset: true, features: { kern: false, liga: false, clig: false, calt: false } })` for filled mode. In fillable mode embed the **full** font (`subset: false`) so characters typed later still render (confirmed by spike 0.5b). Cache embedded fonts per document.
    - **Missing glyphs:** wrap text encoding in try/catch, replace unsupported characters with `?`, and return a `warnings: string[]` list so the UI can tell the user.
  - **Done when:** a doc with only a page background and a rectangle exports a correct PDF whose rectangle lines up with the builder (check visually).

- [ ] **2.6 PDF exporter: drawing elements**
  - **Details:**
    - **Shapes:** rect with radius drawn with `drawSvgPath` using a rounded-rect path (remember SVG paths are y-down, so position the path origin at the element's top-left in PDF space). Ellipse with `drawEllipse`. **Stroke alignment:** CSS borders are inside the box, PDF strokes are centered, so inset the geometry by `strokeWidth / 2`.
    - **Lines:** `drawLine` with thickness, dash array `[6, 4]` x scale for dashed.
    - **Text:** use `lines` from `layoutText` (do **not** re-wrap). Each line is drawn at `x` by alignment (left, center via `(boxWidth - lineWidth) / 2`, right), baseline `lineTop + (lineHeightPx - (ascent + descent)) / 2 + ascent` using the same `fontMetrics` as the editor. Measure line widths with the embedded font for alignment.
    - **Images:** rasterize each image element to an offscreen canvas at 2x the element size (cap 2400px) applying fit, corner radius, and opacity, then embed as PNG (if radius, opacity, or transparency) or JPEG 0.9. Convert WebP this way too, since pdf-lib embeds only PNG and JPEG.
    - **Order and visibility:** z-order as in the array, skip hidden.
  - **Done when:** an automated Playwright test renders each element type in both presets, converts the exported PDF to PNG with `pdfjs-dist` (dev dependency), and compares it with the DOM screenshot using `pixelmatch` within a small tolerance. Also build the `/dev/pdf-compare` page (DOM on the left, PDF in an `<iframe>` from a Blob URL on the right) as a debugging aid.

- [ ] **2.7 PDF exporter: fields (filled mode)**
  - **Details:**
    - Draw the label (single line, truncated with an ellipsis), required asterisk, and the input box with fill, border, and radius (inset by half the stroke).
    - `text`/`dropdown`/`date`: one line of answer text vertically centered in the box, truncated with an ellipsis. Dropdown adds a chevron drawn with two lines at the right. Date uses `DD MMM YYYY`.
    - `longtext`: wrap with `layoutText` inside the box padded 12px, stop when out of space and end the last line with an ellipsis.
    - `radio`: per option row (32px): circle, filled dot if selected, option text.
    - `checkbox`: per option row: rounded square (16px, radius 4), checkmark drawn with two lines if selected.
    - `signature`: embed the PNG, `contain` inside the box with 8px padding. No signature: draw the muted hint "Not signed".
    - Unanswered fields still draw their empty box so the layout is intact.
  - **Done when:** a fully filled test submission looks right for all 7 field types in both presets, and a submission with empty optional fields looks intentional.

- [ ] **2.8 PDF exporter: fillable mode** (should have, first thing cut if time slips)
  - **Do:** same drawing but fields become real AcroForm fields (`PDFForm`).
  - **Details:** text field per `text`/`date`; multiline for `longtext`; dropdown with `addOptions`; radio group with one option per row; one checkbox per option named `<key>__<index>`; signature drawn as a labeled empty box (pdf-lib cannot create signature fields). Field names use the element `key`. Set widget border color, width, background, text color, and font size from `inputStyle`. Mark `required` fields. Call `form.updateFieldAppearances(font)` with an embedded font so text renders in viewers. Open the result in Chrome, Preview/Acrobat, and a mobile viewer to confirm fields are fillable.
  - **Done when:** the exported blank PDF can be typed into in at least two viewers, and the fields line up with the design.

- [ ] **2.9 Download UI**
  - **Do:** `downloadPdf(doc, answers, mode)` creates a Blob, an `<a download>`, clicks it, and revokes the URL. Wire: builder top bar overflow menu "Download fillable PDF", success screen "Download my copy (PDF)". Show a spinner in the button while generating, a toast on warnings (missing glyphs), and an error toast on failure with the error logged.
  - **Details:** file name `<title-slug>-<YYYY-MM-DD>.pdf` (slug: lowercase, hyphens, ASCII, fallback `form`).
  - **Done when:** both downloads work on desktop Chrome and iOS Safari, and the main bundle does not contain pdf-lib (check the build output).

- [ ] **2.10 Phase 2 checkpoint (STOP)**
  - **Do:** run `qa-checklist.md` section "Phase 2". Commit. Handoff note with screenshots of the builder, fill page on desktop and phone width, and sample PDFs.

---

# Phase 3: Accounts, sharing, responses

- [ ] **3.1 Supabase project**
  - **Do:** (owner creates the free project) in Auth settings **turn off email confirmation** for the demo (the free built-in mailer allows only a few emails per hour; note this in the README). Set `.env.local` with the URL and anon key. Run the SQL from `docs/schema.md` section 6 and save it as `supabase/schema.sql`. Install `@supabase/supabase-js`. Create `src/lib/supabase.ts` (single client, throws a helpful error if env vars are missing).
  - **Done when:** a test call to `forms` returns an empty array when logged out (RLS on) and no secrets are committed.

- [ ] **3.2 Auth**
  - **Do:** `AuthProvider` with session state, `useAuth()` (`user`, `loading`, `signUp`, `signIn`, `signOut`). Email and password. Protected-route wrapper for `/forms/*`.
  - **Details:** show friendly errors (wrong password, already registered, weak password under 8 chars). Keep the user on the page they wanted after login (`redirectTo`). Handle email confirmation if the project requires it (show a "Check your inbox" state). Never log tokens.
  - **Done when:** sign up, sign out, and sign in work, and `/forms` redirects to login when logged out.

- [ ] **3.3 Forms repository**
  - **Do:** `src/lib/repo/formsRepo.ts`: `list()`, `get(id)`, `create(doc)`, `saveDoc(id, doc, title)`, `rename`, `duplicate`, `remove` (also deletes the form's Storage folder), `publish(id)` (generates slug on first publish, copies `doc` to `published_doc`, increments `form_rev`, sets `published=true`), `unpublish(id)`, `getPublishedBySlug(slug)` (returns `published_doc` and `form_rev` only, never the draft). Validate every loaded `doc` with Zod and `migrate`.
  - **Done when:** each method has a test with a mocked client, and error cases return typed errors the UI can display.

- [ ] **3.4 Builder on Supabase** (split into four tasks: 3.4a autosave and conflicts, 3.4b image uploads, 3.4c guest handoff, 3.4d publish dialog)
  - **Do:** route `/forms/:id/edit` loads the doc into the same builder. Autosave debounced 1.5s, skip when unchanged, show the same save status. Save with a conditional update (`where id = ... and updated_at = <loaded value>`); zero rows updated means a conflict, so show a banner "This form changed in another tab" with **Reload** and **Overwrite**. Autosave writes only the draft `doc`.
  - **Images:** on add (and on first save for existing data URLs) upload to Storage `form-assets/<uid>/<formId>/<nanoid>.<ext>`, store the public URL in `src`. Keep the data URL until the upload finishes. Respect the new 1.5 MB doc limit.
  - **Guest handoff:** after login, if a guest design exists in localStorage, offer "Save your design to your account?" and create the form from it.
  - **Publish:** the top-bar Publish button now opens a dialog: Publish/Unpublish toggle, the link, **Copy link**, an "Unpublished changes" notice with **Republish** when `doc` differs from `published_doc`, QR code is optional later. Link format `${origin}/f/${slug}`.
  - **Done when:** edit, reload, and the changes persist; two tabs show the conflict banner; publish returns a working link.

- [ ] **3.5 My forms page**
  - **Do:** build screen 2 from `layout.md`. Thumbnails render the doc live (scaled `ElementView` in preview mode, `pointer-events: none`, `contain: strict` for performance), cropped 16:10 from the top. Menu: Responses, Copy link, Duplicate, Delete (confirm dialog naming the form). New form flow: Choose size dialog, create, navigate to the builder.
  - **Details:** skeleton while loading, empty state, optimistic delete with undo toast for 5 seconds, error toast on failure. Response counts via a single grouped query (not one per card).
  - **Done when:** creating, duplicating, and deleting forms works and the list stays correct after reload.

- [ ] **3.6 Public fill route**
  - **Do:** `/f/:slug` loads `getPublishedBySlug`, shows the fill page (no app chrome), sets `<title>` to the form title and `<meta name="robots" content="noindex">`. States: loading skeleton, not found, closed.
  - **Details:** swap the `ResponsesRepo` to Supabase insert (`form_id`, `form_rev`, `answers`). Handle failures with a retry button and keep the answers in memory. After a successful submit, the PDF download uses the same in-memory answers.
  - **Done when:** a logged-out incognito window can open the link, submit, and download the PDF, and cannot read anything else.

- [ ] **3.7 Responses page**
  - **Do:** build screen 5 from `layout.md`: metric cards, search, table, side panel with all answers and **Download PDF**, delete response, pagination (25 per page, server-side `range`), **Export CSV** per `schema.md` section 7.
  - **Done when:** CSV opens correctly in Excel and Google Sheets with accents and commas, a cell starting with `=` is neutralized, and the per-response PDF matches the design.

- [ ] **3.8 Security verification**
  - **Do:** run the RLS tests in `qa-checklist.md` section "Security": logged out cannot list forms or responses; user B cannot read or edit user A's forms, responses, or assets; anon can insert a response only into a published form; oversized `answers` is rejected.
  - **Done when:** all pass, and the results are written into the handoff note.

- [ ] **3.9 Phase 3 checkpoint (STOP)**
  - **Do:** `npm run check`, commit, handoff note.

---

# Phase 4: Landing, polish, deploy

- [ ] **4.1 Landing and login page**
  - **Do:** build screen 1 from `layout.md`: nav, mango gradient presets panel with the diagonal edge and the auto-scrolling staggered preset cards (rendered from the template JSON), login card with sign up toggle and "Try the builder without an account". Redirect logged-in users to `/forms`.
  - **Details:** presets scroll via CSS animation on a duplicated list (seamless loop), pause on hover and focus-within, static under `prefers-reduced-motion`. Mobile layout per `layout.md`. Add 2 more templates if time allows (invoice request, feedback form).
  - **Done when:** it looks like the sketch, works at 390px, 768px, and 1440px, and there is no layout shift.

- [ ] **4.2 Privacy page and footer**
  - **Do:** `/privacy` with plain-language text: what the app stores, that form owners can read responses, how to delete data, contact placeholder. Footer link on landing and fill page.

- [ ] **4.3 Polish pass**
  - **Do:** consistent spacing and focus states, hover and active states for every button, favicon, `<title>` and meta description per route, Open Graph tags (static image of the landing screenshot), 404 page, loading states, copy review (short, friendly, no jargon), remove `console.log`s and dead code.

- [ ] **4.4 Performance and accessibility audit**
  - **Do:** run Lighthouse on the landing and fill pages (targets in `spec.md`). Check bundle sizes (`vite build` report), lazy-load the builder, PDF, and Moveable chunks. Run an automated accessibility check (axe) on the fill page and the builder shell and fix issues.

- [ ] **4.5 Deploy to Cloudflare Pages**
  - **Do:** push to GitHub, create a Pages project: framework Vite, build command `npm run build`, output directory `dist`, set `NODE_VERSION`, add the two env vars. Add `public/_redirects` containing `/* /index.html 200` for SPA routing. Add `public/_headers` with security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a CSP allowing self, `data:` and `blob:` images, and your Supabase origin for `connect-src` and `img-src`). In Supabase Auth settings add the production URL as Site URL and redirect URL.
  - **CSP gotchas:** React inline `style=` attributes need `style-src-attr 'unsafe-inline'` (or the CSP breaks the canvas), and previewing a PDF blob in an `<iframe>` needs `frame-src blob:`. Test the CSP in a preview deploy before relying on it.
  - **Keep-alive:** add a free scheduled GitHub Action that pings the Supabase REST endpoint weekly so the free project does not pause.
  - **Done when:** the live URL works for signup, build, publish, fill, PDF, and a hard refresh on `/forms` and `/f/<slug>` does not 404.

- [ ] **4.6 README and demo assets**
  - **Do:** README with a one-paragraph pitch, live link, screenshot of the builder, GIF of building and exporting, feature list, tech stack and why, architecture diagram, how to run locally (env vars, SQL), design decisions (single JSON doc, shared renderers, one text layout engine for screen and PDF, RLS), limitations, and roadmap. Add a short "What I learned" section.

- [ ] **4.7 Final QA and handoff**
  - **Do:** run all sections of `qa-checklist.md`, fix issues, tag `v1.0.0`, write the final handoff note.
