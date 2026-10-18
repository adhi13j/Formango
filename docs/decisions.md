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
