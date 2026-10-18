<div align="center">

# 🥭 Formango

### Forms that look like you made them on purpose.

Design a form the way you design a poster. Share one link. People fill it in on their phone.
Everyone can download a PDF that looks exactly like your design.

![The Formango home page](docs/screenshots/landing.png)

**Live demo:** _add your Cloudflare Pages link here after deploying (steps further down)_

</div>

---

## Why Formango exists

Most form tools make every form look the same. A generic grey box, a generic blue button, and no way to make it feel like your brand, your event, or your wedding.

The other option is a PDF form. Then people have to open an editor, or print it, write on it, and scan it back. On a phone that is a bad evening.

**Formango is the middle path.** You get the freedom of a design tool and the ease of a normal online form, and at the end you still get a proper PDF.

## What makes it different

| | Typical form builder | Typical PDF form | **Formango** |
|---|---|---|---|
| Looks like your brand | Barely | Yes | **Yes, you place every element yourself** |
| Easy to fill on a phone | Yes | No | **Yes** |
| Gives a nice PDF copy | Rarely, and it looks different | Yes | **Yes, and it matches the screen** |
| Needs an account to fill | Sometimes | No | **No** |
| Ads and tracking | Often | No | **None** |
| Cost | Free tier with limits, then paid | Paid editor | **Runs on free tiers only** |

## What you can do

**Design**
- Drag text, shapes, lines, and images onto a canvas, like Canva. Snap guides, undo and redo, zoom, layers, align and distribute, keyboard shortcuts.
- Pick a **mobile form** (grows as you add things) or a fixed **A4 page**.
- Start from one of **nine templates**: contact form, event registration, customer feedback, a dark newsletter sign-up, a wedding RSVP, a support request, a lunch order, an insurance information sheet, and an A4 job application.

**Collect**
- Short and long text, dropdowns, checkboxes, radio buttons, dates.
- **Signatures** people can draw, type, or upload (handy on a laptop with no touchscreen).
- **File uploads** where you choose the allowed types and the maximum size.
- **"Add person" lists.** A repeating group lets a respondent add as many entries as they need (family members, previous jobs, guests). You set the questions once.
- Required fields, email, phone, and number checks, with friendly messages. Boxes turn green when they are filled.

**Share**
- Publish to get a link. Close it any time. Edit your draft freely: the public link only changes when you press Republish.
- Respondents need no account. The page is built for thumbs first.

**Read the results**
- A responses table with search, sorting, and a side panel for every answer.
- Download any response as a **PDF that matches your design**, or export everything as a **CSV** that opens correctly in Excel and Google Sheets.
- A **fillable blank PDF** for people who still want paper.

**Respect people**
- No ads, no trackers, no third-party scripts, no fonts loaded from other companies. Plain-language privacy page.

## A quick tour

1. **Home page.** Browse presets, preview one, and start from it.
2. **My forms.** Your forms as cards with live thumbnails, status, and response counts.
3. **Builder.** The canvas, the toolbar that changes with what you select, and a live preview on desktop and phone.
4. **Fill page.** What your respondents see. Validation as they go, a thank-you screen, and a PDF copy.
5. **Responses.** Every answer, searchable, exportable.

---

# For developers

Everything below is about how it is built.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | React 19, TypeScript (strict), Vite | Fast, and the type checker guards the one shared document format |
| Styling | Tailwind CSS v4, shadcn/ui, lucide icons | Small accessible parts styled from a single theme file (`src/styles/theme.css`) |
| State | Zustand + zundo | A plain document store with undo that never touches UI state |
| Canvas | react-moveable | Drag and resize mechanics only. Snapping is our own tested code (`src/lib/snap.ts`) |
| Validation | Zod | Every import, saved form, and server row is validated before it is trusted |
| Routing | React Router | Lazy routes keep the builder and PDF code out of the fill page bundle |
| PDF | pdf-lib + @pdf-lib/fontkit | PDFs are drawn in the browser. No server, and loaded only when needed |
| Backend | Supabase (Postgres, Auth, Storage) | Accounts and data on the free tier, protected by Row Level Security |
| Hosting | Cloudflare Pages | Free static hosting with headers and SPA fallback |
| Tests | Vitest, Testing Library, Playwright, axe | Unit, component, real-browser (Chromium and Firefox), PDF pixel match, accessibility |

There is no server code to host. The browser talks to Supabase directly, and the database rules decide who may see what.

## The big idea: one document

Every form is a single JSON document (`FormDoc`, defined in `src/types/doc.ts` and `docs/schema.md`). It holds the page settings and a list of elements (text, shapes, lines, images, fields, and the submit button) with their positions in plain document pixels.

```
                  +------------------------------+
                  |   FormDoc  (one JSON object) |
                  +--------------+---------------+
                                 |
     +-------------+-------------+-------------+--------------+
     |             |                           |              |
  Builder     Preview / Fill page         PDF exporter     Supabase
  (edit)      (respondent view)           (pdf-lib)        forms.doc (jsonb)
     \_____________/                             |
   one set of element renderers          draws the same coordinates
```

Because everything reads the same document, a new feature (a field type, a template, an import) is mostly "teach the document about it" and the builder, fill page, PDF, and database follow.

Four rules keep it honest:

1. **One set of element renderers** (`src/components/elements`). The editor, preview, fill page, and thumbnails all draw elements with the same components. They never touch a store.
2. **One text layout engine** (`src/lib/text/layoutText.ts`). It breaks text into lines by summing per-character widths with kerning and ligatures off. The screen and the PDF draw those same lines, so wrapping cannot differ.
3. **Gestures write once.** While you drag or resize, only the DOM moves. One store update happens when you let go, which is one undo step.
4. **Coordinates are integers in document pixels.** Zoom is a CSS transform on the page wrapper and is never stored.

## Data flow

**Designing (guest, no account)**

```
canvas gesture ─► docStore action ─► normalize() ─► new FormDoc
                                           │
                                           ├─► undo history (zundo)
                                           └─► autosave (500 ms) ─► IndexedDB
```

`normalize()` clamps and rounds geometry, enforces minimum sizes, recomputes auto heights (text, radio lists, repeating groups), and guarantees exactly one submit button.

**Designing (signed in)**

```
docStore change ─► autosave (1.5 s) ─► upload data-URL images to Storage
                                     ─► UPDATE forms SET doc = … WHERE id = … AND updated_at = <loaded>
                                          0 rows updated  ─► conflict banner (Reload / Overwrite)
```

**Publishing and filling**

```
Publish ─► flush pending save ─► copy doc to published_doc, form_rev + 1, slug on first publish
Respondent opens /f/<slug> ─► RPC get_published_form(slug)  (published copy only, never the draft)
   fill ─► validate (blur, change, submit) ─► INSERT into responses (form_id, form_rev, answers)
        └► files go to the private response-files bucket
```

**Reading results and PDFs**

```
Owner opens /forms/:id/responses ─► SELECT responses (RLS: own forms only) ─► table, search, CSV
PDF: FormDoc + answers ─► applyGroupRows (grow repeating groups) ─► draw shapes, text lines,
     images, fields ─► Uint8Array ─► Blob download
```

Answers are keyed by element id. Checkboxes are lists of strings, signatures are PNG data URLs, files are file names, and a repeating group is a JSON list of entries keyed by column id.

## Repeating groups ("Add person")

A group is one field element that holds a list of small forms.

- The element stores a height for one sample entry plus the add button.
- `src/lib/groups.ts` computes the real layout for any number of entries. The screen (`GroupView`) and the PDF (`drawField`) both use it.
- `applyGroupRows` moves everything that starts below a group down (or up) by the difference. A fixed A4 page and its PDF grow to fit.
- Each question inside an entry is drawn by the normal field code, so labels, validation, green borders, and PDF drawing are shared.

## Folder map

```
src/
  app/           App shell, router, error boundary
  pages/         One file per route (Landing, Login, Forms, Responses, PublicFill, ...)
  features/
    builder/     Canvas, selection and snapping, toolbar, panels, dialogs, autosave hooks
    fill/        FillForm, FormView, ListView (A4 on phones), success screen
    forms/       My forms cards, new form, guest handoff
    responses/   Response side panel
    auth/        AuthProvider, RequireAuth, login card
    landing/     Preset cards and preview
  components/
    elements/    The shared element renderers (text, shape, line, image, fields, groups, button)
    ui/          shadcn components
    common/      Logo, header, small shared parts
  lib/           Pure logic with no React: geometry, snap, text layout, answers, groups, csv, files
    repo/        formsRepo, responsesRepo, assets (all talk to Supabase)
  pdf/           exportPdf and its drawing modules
  store/         docStore (document + undo), uiStore (selection, zoom), cloudStore
  templates/     Template JSON, generated by scripts/gen-templates.mjs
  types/         doc.ts (types) and doc.schema.ts (Zod, migrations)
e2e/             Playwright specs
scripts/         contrast check, template generator, security check, local static server
supabase/        schema.sql and migrations
docs/            spec, layout, schema, theme, conventions, decisions, handoff notes
```

The rule of thumb: `lib/` and `pdf/` contain no React, and `components/elements/` has no store access.

## Security model

- **Row Level Security is the security.** The browser only holds the public (publishable) key.
- Only a form's owner can read or change its row. Nobody else can read a draft.
- Respondents read a form through one database function that returns the published copy only, and insert answers only into a published form at its current revision.
- Uploaded files go to a private bucket that only the owner can read. Images used in designs go to a public bucket, writable only inside the owner's own folder.
- Size limits are enforced in the database (draft and published document, and answers).
- No `dangerouslySetInnerHTML`, no SVG uploads, spreadsheet formulas are neutralized in CSV, and a Content Security Policy is set in `public/_headers`.
- `node scripts/rls-check.mjs` signs up two throwaway users and tries 27 forbidden actions against the real project.

## Testing

| What | Where | How to run |
|---|---|---|
| Pure logic (geometry, snapping, text, answers, groups, CSV, schema, repos with a mocked client) | `src/**/*.test.ts` | `npm test` |
| Real-browser behavior (drag at zoom, undo, fill and validation, downloads) in Chromium and Firefox | `e2e/` | `npm run test:e2e` |
| PDF matches the screen: renders every template both ways and compares pixels | `e2e/pdf-visual.spec.ts` | part of `test:e2e` |
| Accessibility (axe, WCAG 2.1 A and AA) | `e2e/a11y.spec.ts` | part of `test:e2e` |
| 100-element performance | `e2e/perf.spec.ts` | `npm run test:perf` |
| Theme color contrast | `scripts/check-contrast.ts` | `npm run check:contrast` |
| Database security | `scripts/rls-check.mjs` | `node scripts/rls-check.mjs` |
| Full flow on the real backend (makes throwaway accounts) | `e2e/cloud.spec.ts` | `E2E_CLOUD=1 npx playwright test e2e/cloud.spec.ts --project=chromium` |

`npm run check:fast` runs lint, types, and unit tests. `npm run check` runs everything above except the two that touch the real backend.

## Run it yourself

```bash
npm install
cp .env.example .env.local     # then fill in the two values below
npm run dev
```

The builder works without any setup as a guest, saving in your browser. For accounts, sharing, and responses:

1. Make a free project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`. If your database was made earlier, also run the files in `supabase/migrations/`.
3. Authentication, Sign In / Providers, Email: turn **Confirm email** off for a demo. The free mailer only sends a few emails an hour.
4. Put the project URL and the **publishable** key in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Never use or commit the `service_role` key.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build and local preview |
| `npm run check:fast` | Lint, types, unit tests |
| `npm run check` | Everything, including the contrast check, build, and browser tests |
| `node scripts/gen-templates.mjs` | Regenerate the template JSON files |
| `node scripts/serve-dist.mjs` | Serve `dist/` with the real headers, to test the Content Security Policy |

## Deploy (Cloudflare Pages, free)

1. Push the repository to GitHub.
2. Cloudflare dashboard, Workers and Pages, create a Pages project from it. Framework Vite, build command `npm run build`, output `dist`. Add `NODE_VERSION` (22 or newer) and the two `VITE_` variables.
3. In Supabase, Authentication, URL Configuration: set the Site URL to your Pages address.
4. `public/_redirects` makes page refreshes work. `public/_headers` sets the security headers and Content Security Policy.
5. Keep the free database awake: in GitHub, Settings, Secrets and variables, Actions, Variables, add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `.github/workflows/keepalive.yml` pings it weekly.
6. Replace the contact line in `src/pages/Privacy.tsx` with your own.

## Design decisions

Every decision has its reason written down in [`docs/decisions.md`](docs/decisions.md). A few worth knowing:

- The submit button is a real, movable element, but it cannot be deleted or duplicated.
- Drafts autosave with a conditional update, so a second tab cannot silently overwrite the first.
- A published form is a copy taken at publish time. Editing never changes the live link until you republish.
- The green "filled" border is screen-only, so the PDF keeps exactly the border you designed.
- Images are uploaded during autosave and swapped for URLs, which keeps drafts small.

## Documentation

| File | What it covers |
|---|---|
| `docs/spec.md` | What and why, scope, requirements |
| `docs/layout.md` | Every screen, region by region |
| `docs/schema.md` | The document format and the database |
| `docs/theme.md`, `docs/theme.css` | Colors, type, spacing |
| `docs/conventions.md` | Folder layout, naming, code rules |
| `docs/decisions.md` | Decisions and their reasons |
| `docs/qa-checklist.md` | Manual test checklist |
| `docs/handoff-phase-*.md` | What each phase delivered and how it was checked |

## Limits and roadmap

- Fonts are Latin only (seven families). Other characters become `?` in PDFs, with a warning.
- A long mobile form exports as one tall PDF page, not A4 pages.
- The responses page loads the newest 1000 responses and pages through them in the browser.
- Fillable PDFs were verified in pdf.js. Try them in Acrobat and a phone viewer.
- Not built yet: multi-page forms, conditional logic ("show this if..."), email notifications, teams, CAPTCHA, custom fonts, dark mode, rotation.

## What building it taught me

- **Screen and PDF text only match if you plan for it.** Browsers round glyph widths and apply kerning and ligatures. PDF libraries do not. Measuring per-character widths with kerning off made the browser, canvas, and PDF agree to a hundredth of a pixel.
- **A visual test beats a long checklist.** Rendering the same document as a web page and as a PDF and comparing pixels found off-by-a-pixel bugs no unit test would have.
- **Make the data format the product.** One validated JSON document made repeating groups, templates, import, and export cheap to add.
- **Put security in the database.** Writing the "what must not be possible" tests first found a policy that silently blocked respondents.

## License

Add your license here. The bundled fonts are open source (SIL Open Font License); their licenses are in `public/fonts/licenses/`.
