# Spec: Formango (working title)

A web app for designing forms like documents, filling them as easily as Google Forms, and exporting the result as a PDF that matches the design.

---

## 1. The problem

- Google Forms looks generic and cannot be styled.
- A PDF form makes people open an editor, or print, write, and scan.
- Designers who want a branded form have no simple middle path.

## 2. The idea

1. The owner **designs** a form on a Canva-style canvas: own layout, colors, fonts, logo, shapes, and form fields.
2. Respondents open a link and **fill it in the browser**. On phones it behaves like a normal mobile form.
3. Each submission can be downloaded as a **PDF that looks like the design**, with the answers filled in. The owner can also download a **fillable blank PDF**.

## 3. Users

| User | Goal |
|---|---|
| Owner (designer) | Make a good-looking form fast, share a link, read responses, get PDFs |
| Respondent | Fill a form on any device in under a minute, optionally keep a PDF copy |
| Guest | Try the builder without an account (`/builder`, saves in the browser only) |

---

## 4. Core concepts

- **Form document:** one JSON object holding the page settings and a list of elements (`schema.md`). It is the single source of truth.
- **Size preset:** *Mobile form* (390px wide, grows) or *A4 document* (794 x 1123, fixed). Chosen when creating a form.
- **Element:** text, shape, line, image, or field. Fields carry the label, options, and validation.
- **Shared renderers:** one set of React components draws elements for the builder, preview, and fill page. The PDF exporter mirrors the same geometry. Do not build separate layouts per screen.

---

## 5. Scope by phase

| Phase | Outcome | Owner can test |
|---|---|---|
| 0 | Project, theme, tooling | App runs, themed page, tests pass |
| **1** | **Working page builder (local only)** | **Design a form, undo, preview, reload, export and import JSON** |
| 2 | Fill page and PDF | Fill the form, download filled and fillable PDFs |
| 3 | Accounts, saving, sharing, responses | Publish a link, receive responses, CSV and PDF |
| 4 | Landing, login, presets, polish, deploy | Live URL with README |

### Must have (v1)
Builder with 7 field types, text, shapes, lines, images, templates (2 minimum), snapping, undo/redo, zoom, layers, preview, size presets, local autosave, JSON export/import, fill page with validation, filled PDF, accounts, publish link (published snapshot separate from the draft), responses table, CSV export, deploy.

### Should have (if time allows)
Fillable blank PDF, third and fourth templates, keyboard shortcut cheat sheet, multi-select align and distribute, copy/paste, duplicate form.

### If time slips, cut in this order
Fillable PDF, layout grid, marquee selection, lock and hide, A4 List view, align and distribute. Never cut PDF visual fidelity or the draft/published split.

### Later / out of scope for v1
Rotation, grouping, multi-page forms, rich text inside one text box, conditional logic, custom fonts upload, non-Latin scripts, email notifications, payments, teams and sharing for editing, dark mode, real-time collaboration, A4 pagination of long mobile forms, ads, analytics, CAPTCHA (add Cloudflare Turnstile if spam appears).

---

## 6. Tech stack

Install the **latest stable** version of each package at project start and record exact versions in `package-lock.json`. Check each library's current docs before using its API, because APIs change (especially Tailwind v4, shadcn/ui, and react-moveable).

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | SPA. No server code |
| Routing | React Router | Browser router. Needs SPA fallback on the host |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui | Tokens from `theme.css` |
| Icons | lucide-react | |
| State | Zustand + zundo | Doc store with undo history, separate UI store |
| Canvas interaction | react-moveable | Drag, resize, snap guides. Marquee selection via custom code or `selecto` |
| IDs | nanoid | |
| Validation | Zod | Doc schema and answer validation |
| PDF | pdf-lib + @pdf-lib/fontkit | Browser only. **Lazy-load** (dynamic import) so it is not in the main bundle |
| Backend | Supabase (Postgres, Auth, Storage) | `@supabase/supabase-js`. Phase 3 |
| Hosting | Cloudflare Pages | Free tier. Phase 4 |
| Tests | Vitest + Testing Library; Playwright smoke test in Phase 4 | |
| Quality | ESLint, Prettier, `tsc --noEmit` | |

**Zero-cost rule:** no paid services. If a free tier is exceeded, the app degrades, it does not bill. Verify current free-tier limits (Supabase projects can pause when inactive) before launch.

### Fonts for forms (self-hosted, static TTF files)

| Id | Family | Weights | Use |
|---|---|---|---|
| dm-sans | DM Sans | 400, 700 | Clean default |
| inter | Inter | 400, 700 | Neutral |
| poppins | Poppins | 400, 700 | Friendly headings |
| playfair | Playfair Display | 400, 700 | Elegant headings |
| lora | Lora | 400, 700 | Serif body |
| space-grotesk | Space Grotesk | 400, 700 | Techy |
| caveat | Caveat | 400, 700 | Handwriting accents |

Use **static** fonts (not variable). The browser loads **woff2** versions via `@font-face` (smaller, and the fill page loads only the fonts the form uses). The PDF exporter fetches the matching **TTF** only when exporting. Both are the same font data, so metrics are identical. **Screen, measurement, and PDF must produce identical widths.** Verified in the Phase 0 spike (see `decisions.md`): use `text-rendering: geometricPrecision` (browsers otherwise round glyph advances to whole pixels), turn kerning and ligatures off (`font-kerning: none; font-variant-ligatures: none`, and `features: { kern: false, liga: false, clig: false, calt: false }` in pdf-lib), and measure text as the **sum of per-character advances**, never `measureText` on a whole string (canvas cannot disable ligatures). With that, all three agree within 0.02px. UI fonts also need DM Sans 500 and Poppins 600. All are open-license (SIL OFL). Keep the license files in `public/fonts/licenses/`. Latin scripts only in v1. If an answer contains characters the font lacks, show a warning and fall back to the closest available glyphs instead of failing.

---

## 7. Architecture

```
            +-----------------------------+
            |  FormDoc (JSON)             |
            +--------------+--------------+
                           |
   +-----------+-----------+------------+-------------+
   |           |                        |             |
Builder    Preview /               PDF exporter   Supabase
(edit)     Fill page               (pdf-lib)      (forms.doc jsonb)
   \_________/                          |
  shared element renderers        draws same coordinates
```

Folders and naming rules live in `conventions.md`. Routes are listed in `layout.md`.

### Render modes

`ElementView` takes `mode: 'edit' | 'preview' | 'fill'`.
- `edit`: inert content (inputs are visual only), selection and Moveable handled by the canvas layer, **not** by the element.
- `preview`: interactive inputs, answers kept in local state, nothing saved.
- `fill`: same as preview plus validation, and answers are submitted.

### PDF pipeline

1. Load fonts (fetch the TTFs once, cache in memory), embed with fontkit.
2. Create page(s) at the size from `layout.md`.
3. Draw in z-order: page background, then each non-hidden element.
4. Fields: filled mode draws box, label, and answer; fillable mode creates AcroForm fields.
5. Return `Uint8Array`, trigger download with a Blob URL, revoke it afterwards.

Details and edge cases are in `todo.md` (Phase 2).

---

## 8. Non-functional requirements

**Performance**
- Dragging and resizing stays smooth (about 60 fps) with 100 elements on a mid-range laptop.
- Only elements that changed re-render. Do not re-render the whole canvas on each pointer move.
- Initial JS under 300 KB gzipped for the fill page route. Builder and pdf-lib are code-split.
- Lighthouse on the fill page: Performance 90+, Accessibility 95+, Best Practices 95+.

**Accessibility**
- The fill page is **fully accessible**: real `<label>`, `<input>`, `<select>`, fieldset/legend for radio and checkbox groups, visible focus, error messages linked with `aria-describedby`, logical tab order (the sorted reading order, **not** DOM insertion order).
- The builder is keyboard operable: every toolbar control reachable by Tab, shortcuts listed in a help dialog (`?`), selected element can be moved with arrows, Esc closes popovers.
- Color contrast per `theme.md`. Do not rely on color alone for errors.
- Respect `prefers-reduced-motion`.

**Security and privacy**
- Row Level Security on every table (`schema.md`). Never ship the `service_role` key.
- Treat all form content and answers as untrusted. Render text with React (no `dangerouslySetInnerHTML`). Validate imported JSON with Zod. Allow only `data:image/png|jpeg|webp` and the project's own Storage URLs as image sources. Do not allow SVG uploads.
- CSV export guards against formula injection.
- A **Privacy** page exists and the fill page links to it. Say plainly what is collected and who can see it (the form owner).
- No third-party scripts, trackers, or fonts from CDNs in v1.

**Browsers:** latest Chrome, Edge, Firefox, Safari, and iOS Safari 16+. Test pointer interactions with mouse and trackpad. Touch editing in the builder is not required.

**Reliability**
- Autosave never blocks typing. If saving fails, keep the local copy and show a banner.
- Never lose work silently: warn on closing the tab with unsaved changes (`beforeunload`) when the last save failed.

---

## 9. Success criteria

The project is "good" when:
1. A new visitor can build a styled 6-field form in under 5 minutes without instructions.
2. The PDF is visually indistinguishable from the builder page.
3. A form filled on a phone needs no zooming or horizontal scrolling.
4. It deploys to a live URL at no cost, and the README has screenshots and a short demo GIF.
5. No console errors, strict TypeScript passes, tests pass, Lighthouse targets are met.

---

## 10. Assumptions made (change if wrong)

- App name is a placeholder: **Formango**.
- Single-user ownership (no teams). Email and password auth only in v1.
- Responses are visible only to the form owner.
- Form content is public to anyone with the link once published.
- English UI only. Dates formatted `DD MMM YYYY` in the PDF and by the browser locale in the UI.
- Signature is a drawn image, not a legally binding e-signature.
