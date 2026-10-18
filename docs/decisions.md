# Decisions

Date, decision, reason. Newest at the bottom.

## 2026-10-18: doc review before Phase 0

| Decision | Reason |
|---|---|
| Docs live in `docs/`; the app is scaffolded in the existing folder, not a nested `formango/` | `CLAUDE.md` and every doc reference `docs/`. Avoids a nested duplicate project |
| Public forms are served from `published_doc`; the builder autosaves only the draft `doc`. Responses store `form_rev` | Otherwise respondents see half-edited forms, and edits break existing responses |
| Answers are keyed by element `id`. `FieldElement.key` is frozen at creation and only names PDF fields | CSV, PDF, and answers must agree on one identifier |
| `recentColors` removed from `FormDoc`, kept in the UI store and localStorage | A preference, not form content. Avoids undo noise and polluted exports |
| `page.submit` (label, fill, text color) added to the schema | The old "first non-white shape fill" heuristic could not be controlled by the designer |
| `TextElement.role` ('heading' or 'body') added | Fill page accessibility target needs real headings |
| `FormDoc.id` removed; `forms.title` derived from `doc.title` | One source of truth for each |
| Radio and checkbox default height is 88 (18 + 6 + 2 x 32), not 108 | The documented formula and the table disagreed |
| A4 layout grid uses a 6px gutter (54px columns) | 12px gutter gave 48.5px columns, which breaks the integer rule |
| Phone fill view of a Mobile form scales to screen width, clamped 0.85 to 1.15 | Phones are 320 to 430px wide, so "1:1 at 390" does not exist |
| List view (A4 on phones) is a deliberate exception to "no parallel layouts" | Same elements and renderers, different arrangement. Pinch-zooming an A4 page is unacceptable on phones |
| woff2 for the browser, TTF only for PDF export; kerning and ligatures off everywhere | Smaller fill page; pdf-lib does not kern, so this keeps line widths equal (verify in spike 0.5b) |
| Playwright added in Phase 0 and used from Phase 1; PDF visual match automated with pdfjs-dist and pixelmatch (dev only) | jsdom cannot test Moveable or zoom math, and manual PDF comparison does not repeat |
| `check:fast` per task, full `check` per phase and in CI | Production builds on every commit slow the loop |
| Fillable PDF, align/distribute, copy/paste are "should have" and built last | Spec and todo disagreed. Protects the core path if time slips |
| Time estimates in `todo.md` replaced with sizes | The hour estimates were unrealistic |
| Supabase email confirmation off for the demo; weekly keep-alive Action | Free mailer limit and free-tier project pausing |

## 2026-10-18: owner answers

- **Guest persistence storage: IndexedDB via `idb-keyval`** (owner agreed). Handles a 4 MB doc with images. localStorage stays only for small preferences such as recent colors.
- **Past response snapshots: keep only the current published snapshot** (default adopted, owner asked for the simple option). Answers to fields removed in a later republish show as "removed field". Keeping every past version is out of scope.
- **Public form fetch: expose only `id, slug, published_doc, form_rev` to anonymous visitors** (default adopted), through a view or RPC. Implemented and tested in Phase 3. No owner action needed.

## 2026-10-18: Phase 0 font spike (task 0.5b) results

Measured 112 samples (7 fonts x 2 weights x 2 sizes x 4 strings, including kerning pairs and ligature words) in headless Chrome on Linux, comparing DOM, canvas, and pdf-lib widths from the same TTFs.

| Finding | Evidence |
|---|---|
| Chrome on Linux rounds every glyph advance to whole pixels by default, so DOM and canvas widths were up to 26px (about 4.6%) wider than the PDF on a 560px line | Poppins 700 16px: DOM 581px, PDF 555.14px |
| Fix: `text-rendering: geometricPrecision` on all form text (CSS) and `ctx.textRendering = 'geometricPrecision'` when measuring | DOM then 555.14px, canvas 555.14px, PDF 555.136px |
| Canvas cannot turn ligatures off (`fi`, `ffi`), so whole-string `measureText` differed from the DOM by up to 17.6px | Space Grotesk 28px "fi fl ffi ffl office" |
| Fix: **measure the sum of per-character advances** (cache each character per font), never whole strings | Max difference 0.015px vs DOM and 0.004px vs PDF over all 112 samples |
| Kerning and ligatures must be off in the DOM (`font-kerning: none; font-variant-ligatures: none`) and in the PDF (`embedFont(bytes, { features: { kern: false, liga: false, clig: false, calt: false } })`) | With kerning on, DOM vs PDF differed by up to 24px |
| pdf-lib `embedFont(..., { subset: true })` keeps only the glyphs it has drawn (4 glyphs for "abc"). Characters typed later into a fillable field would not render | Subset font program 667 bytes vs 44,448 bytes for the full font |
| Decision: filled PDFs may subset, fillable PDFs embed the full font (`subset: false`) | The extra size is about 45 KB per font |

Consequences: `layoutText` (task 1.3) measures per-character advances with geometricPrecision, `.doc-text` sets all three CSS properties, and PDF export passes the feature flags. A cross-browser check (Chrome, Firefox, Safari) of line breaks is added to the Phase 1 QA, since other browsers may round differently.

## 2026-10-18: Phase 0 build decisions

| Decision | Reason |
|---|---|
| Use `react-router` (v7+), import `RouterProvider` from `react-router/dom`, not `react-router-dom` | Current docs recommend it |
| `shadcn init` is not run. `components.json` is hand-written and components are added with `npx shadcn add` | `init` overwrites the theme colour variables. The CLI also installed a stray `cn` npm package when it could not resolve `@/lib/utils`, which was removed in favour of a local `cn()` |
| ESLint kept, oxlint (the Vite template default) removed | CLAUDE.md requires ESLint with no-`any` rules |
| `check:contrast` runs `node scripts/check-contrast.ts` (Node runs TypeScript directly) and reads its pairs from `docs/theme-preview.html`; it also fails if `src/styles/theme.css` differs from `docs/theme.css` | No `tsx` dependency, one list of pairs, and the two theme copies cannot drift |
| Semantic-token pairs (`--primary-foreground` on `--primary`, etc.) added to the contrast list | Otherwise changing `--primary-foreground` could not fail the check |
| `--color-primary-hover` mapped in `theme.css` and used by the button | The theme says hover is mango-600 and shadcn defaults to a 90% opacity mix |
| Prettier ignores `*.md`, `docs/`, and `src/styles/theme.css` | It reformatted the doc tables and lowercased the theme hex values |
| `/dev/theme` is a dev-only route (`import.meta.env.DEV`) and the Builder route is lazy | Keeps the theme page out of production and the builder out of the fill page bundle |
| Commit messages start with `done: <task>` | Owner preference |

## 2026-10-18: Phase 1 build decisions

| Decision | Reason |
|---|---|
| Snapping is our own pure function (`lib/snap.ts`, unit tested) in document px; react-moveable only provides pointer mechanics (`snappable` is off) | Moveable's snapping works in screen space and needed conversion for zoom and page offset. Ours is testable and exact at any zoom. Guides are drawn in the overlay |
| During a move only the DOM transform changes. During a resize only the dragged element receives a live width and height (so text and fields re-wrap) and the store is written once on release | "Gestures write once". Letting React move the element while Moveable tracks its own transform made the two double-count |
| Multi-select moves through one invisible box over the selection (`group-proxy`), not Moveable's group mode | Group events never fired in react-moveable 0.56 in this setup. The box forwards shift-clicks and plain clicks to the element underneath |
| An unselected element is selected synchronously on `pointerdown` so Moveable is attached before the `mousedown` that follows | Forwarding `dragStart` by hand did not work. This gives one press-and-drag |
| New elements go to the visible center, then slide below anything they would overlap | Stacking every new field on the same spot hid the earlier ones. Also satisfies "never stack exactly" |
| Radio and checkbox groups use `role="radiogroup"` / `role="group"` with `aria-labelledby`, not `<fieldset>` | Positioned `<legend>` is unreliable across browsers (Firefox is the owner's browser). Same semantics for screen readers |
| Outer background color is also the editor's workspace color | The spec only showed it in preview, so changing it looked broken |
| Fit zoom rounds down to a whole percent | Rounding up made the page 1px too wide and caused sideways scrolling |
| Signature default height is 144 (18 + 6 + 120 minimum box), not 140 | Normalization raised 140 to 144 anyway |
| Shortcuts ignore Enter and Space on buttons, links and menu items; overlays only block shortcuts for dialogs, menus and listboxes (not tooltips) | Otherwise keyboard users could not activate a focused button, and a tooltip blocked Ctrl+Z |
| Focus moves to the canvas after an element is added | A keyboard-only user can then press Enter to edit, arrows to move, Delete to remove |
| The builder grid uses `minmax(0, 1fr)` | Without it the canvas content widened the layout and the window could not shrink |
| Playwright runs in Chromium and Firefox; the 100-element timing tests run alone in a `perf` project | The owner uses Firefox; timing is meaningless while other tests compete for the CPU |
| Signature fields show a drawn box in preview for now | The signature pad is task 2.3 |

## 2026-10-18: Owner feedback after the Phase 1 test

| Decision | Reason |
|---|---|
| The Submit button is a real element (`type: 'button'`), one per form, always present, movable and restyleable, never deletable or duplicable. `page.submit` is removed | Owner: "keep the button by default in the form and no option to remove it, it should be moveable". `ensureSubmitButton()` runs in `normalizeDoc` and `parseDoc`, so old drafts and imports get one and extras are dropped |
| On mobile (auto-height) pages the button slides down when something is added at or below it, in the same undo step. On A4 it is an ordinary blocker | The button should stay last on a growing page without the owner dragging it every time |
| The button is omitted from PDFs | A PDF has nothing to submit |
| "Page has content" ignores the button (`hasContent`) | Otherwise New design, templates, and import would always ask to confirm on a blank page |
| The layout grid button now draws the columns (faint bands) and snaps to them. Default off | The old button toggled invisible snap lines, so it looked broken |
| Boxes get a green border (`leaf-500`) once they hold an answer, in Preview and on the fill page only. Radio and checkbox marks turn green when checked. The PDF keeps the designed stroke | Owner idea. Screen-only so the PDF still matches the design |
| New `file` field: `fileKinds` (image, pdf, document, spreadsheet) and `maxFileMb` (1 to 25, default 5). The answer is the file name; the bytes live in an in-memory map until Phase 3 uploads them to Storage | Owner request. Spec had file upload out of scope; moved in. Types are checked by extension (browsers report unreliable MIME types) |
| Signature fields will offer Draw, Type (script font), and Upload in the Phase 2 pad | Owner: drawing with a trackpad is awkward on a laptop |
| Templates are generated by `scripts/gen-templates.mjs` (8 now: contact, event, customer feedback, newsletter (dark), wedding RSVP, support request (file upload), lunch order, job application (A4)). They are normalized when loaded so thumbnails show real text heights | Owner asked for more designed templates. A test checks they validate, stay inside the margins, and do not stack content on top of each other |

## 2026-10-18: Phase 2 build decisions

| Decision | Reason |
|---|---|
| File upload fields start with a short placeholder (`Images, PDF up to 5 MB`) that the owner can edit or clear. The box no longer draws a second automatic rules line. It follows the File rules popover until the owner edits it | Owner: the automatic line took too much room. An empty placeholder shows "Choose a file" |
| The fill form (`FillForm`) is also the builder's Preview. Preview submits show the success screen and save nothing | One code path for validation and the thanks screen. `/fill/local` fills the design saved in this browser and keeps responses in IndexedDB (not localStorage, as `todo.md` said) because signatures are images |
| Validation runs on blur, then on change once a field has an error, and for every field on submit (focus and scroll to the first error). Submits under 2 seconds show "Please wait a moment". A filled honeypot pretends to succeed and stores nothing | `layout.md` fill page rules |
| Text answers are trimmed, empty ones dropped, and hidden or unknown field ids ignored (`cleanAnswers`) | What is stored should only hold real answers |
| Dates in PDFs use `DD MMM YYYY` with a two-digit day | Matches `spec.md` |
| Native inputs now get `text-rendering: geometricPrecision` and no kerning (`.doc-text input, textarea, select`) | Browsers reset these on form controls, so typed text was wider than the PDF text |
| Fonts must be loaded before elements render (`fontsUsedBy` on the fill page) | Lines laid out with fallback widths stayed cached and wrapped differently from the PDF |
| PDF export draws the design with shared `layoutText` lines. Images go through a canvas first (fit, rounding, opacity), then PNG or JPEG. Stroke geometry is inset by half the stroke. The Submit button is not drawn | `todo.md` 2.5 to 2.7 |
| Fillable PDFs: real AcroForm text fields, dropdowns, radio groups, one checkbox per option (`<key>__<index>`). Full fonts are embedded. Widgets cannot round corners, so radio and checkbox marks are plain squares and circles. Signature and file fields stay drawn boxes | pdf-lib cannot create signature or file widgets |
| The automated visual test compares the DOM and the PDF rendered by pdf.js with pixelmatch, ignoring regions that differ by design (native date, textarea wrapping, signature pad, file box, placeholders, green borders). It allows 1.5 percent of pixels to differ | Anti-aliasing differs between the browser and pdf.js, mostly for light text on dark colors. A one pixel text offset costs far more than that |
| `/dev/pdf-compare` is dev-only. `pdfjs-dist`, `pixelmatch`, and `pngjs` are dev dependencies | Needed only for the visual test |
| The ₹ sign is not in the form fonts, so templates write "Rs". Missing characters become `?` in the PDF with a warning toast | Fonts are Latin only (`CLAUDE.md`) |
| New template "Insurance proposal info" (mobile, 8 sections, file uploads, signature). It is a neutral information sheet for a Development Officer to key into ANANDA, with no insurer branding. Exported copies are in `exports/` | Owner request |

## 2026-10-18: Repeating groups

| Decision | Reason |
|---|---|
| New field type `group` ("Add person"). The designer defines the questions once; respondents add as many entries as they like | Owner: the ANANDA family details screen. A fixed canvas cannot hold an unknown number of fields, so entries are rows inside one element |
| The element keeps a stored height for one sample entry and the add button. Real heights come from `layoutGroup`, and `applyGroupRows` moves everything that starts below a group | Keeps the canvas model (absolute positions in document px) and the single JSON source of truth. Items beside or above a group do not move |
| A group's answer is a JSON string of entries keyed by column id, so `Answers` stays `string \| string[]` | No change to the answers type, storage, or CSV plumbing. Parsed with a tolerant `parseRows` |
| Questions inside entries are drawn by the normal field renderers and PDF code through `cellField` | One implementation of labels, validation messages, green borders, and PDF drawing |
| Errors inside a group use ids like `groupId.row.columnId`. A new empty entry does not show errors until submit | Leaving an empty new entry alone should not look like a mistake until the person sends the form |
| A fixed A4 page and its PDF grow when groups make the content longer | Better than clipping or silently overlapping. Proper pagination is still a later improvement |
| Blank and fillable PDFs show three empty entries per group (or the fewest allowed if more). Fillable cells are real form fields named `<key>__<row>__<column id>` | A paper copy needs room to write several people |
