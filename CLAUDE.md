# CLAUDE.md

Instructions for Claude Code. Read this first, every session.

## What we are building

**Formango** (working title): a web app where people design forms like documents on a Canva-style canvas, share a link, let respondents fill them in the browser (phone-friendly), and export the result as a PDF that matches the design. The owner is a student building a portfolio piece. Quality, clarity, and a working demo matter more than feature count.

## Read these, in this order

1. `docs/spec.md`: what and why, stack, scope, requirements
2. `docs/layout.md`: every screen, region by region
3. `docs/schema.md`: the data model (one JSON document) and the database
4. `docs/theme.md` and `docs/theme.css`: colors, type, spacing (open `docs/theme-preview.html` to see them)
5. `docs/conventions.md`: folders, naming, code rules
6. `docs/todo.md`: **the ordered task list. This drives your work**
7. `docs/qa-checklist.md`: how to test each phase

If documents disagree, this priority wins: `schema.md` (data), then `layout.md` (UI), then `spec.md`, then `todo.md`. Tell the owner about the conflict and propose a fix to the docs.

## How to work

1. Take the **next unchecked task** in `todo.md`. Do not skip ahead and do not start a later phase early.
2. Before using a library API, **check its current documentation** (Tailwind v4, shadcn/ui, react-moveable, pdf-lib, Supabase). Do not rely on memory for APIs that change.
3. Build the task fully, including its **Details**, then verify its **Done when**.
4. Run `npm run check:fast` (lint, typecheck, unit tests) before each task commit. Run the full `npm run check` (adds contrast check, build, Playwright) at the end of each phase. CI runs the full check on every push. Fix everything before committing.
5. Commit with a message that starts with `done: <task number> <what>` (for example `done: 1.3 text layout engine`), or `fix:` for a later bug fix. Tick the task's checkbox in `todo.md` in the same commit.
6. **At the end of each phase, stop.** Write a handoff note (below) and wait for the owner. Phase 1 ends with the owner testing the page builder. Phase 1 also has two short mini-checkpoints (after 1.11 and 1.14), marked in `todo.md`. Split any task that will not fit one session and tick the pieces.
7. If a task is ambiguous or a doc is wrong, ask one concise question or make the smallest sensible choice and note it in `docs/decisions.md` (create it on first use: date, decision, reason).

## Non-negotiable rules

- **Zero cost.** No paid services, no paid tiers, no credit card requirements. No server code to host. If something needs money, stop and ask.
- **The `FormDoc` JSON is the single source of truth.** The builder, preview, fill page, and PDF all derive from it. Do not create parallel layouts.
- **One set of element renderers** (`components/elements`) for builder, preview, and fill. No store access inside them.
- **One text layout engine** (`lib/text/layoutText.ts`). The editor, fill page, and PDF use the same lines so wrapping never differs.
- **Gestures write once.** Drag and resize mutate the DOM while the pointer moves and commit a single store update at the end (one undo step).
- **TypeScript strict, no `any`.** Parse all external data (imports, localStorage, Supabase) with Zod.
- **Theme tokens only.** No hex codes in components. Text on mango is dark ink, never white.
- **No new dependency** without a clear reason. Never add heavy UI kits, lodash, date libraries, or CSS-in-JS.
- **Security:** never commit secrets or `.env*` (except `.env.example`). Never use or expose the Supabase `service_role` key. RLS must protect every table. Never use `dangerouslySetInnerHTML`. Escape CSV formulas. No SVG uploads.
- **Do not build** anything listed under "Later / out of scope" in `spec.md` unless the owner asks.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run check:contrast` | Verify theme contrast pairs |
| `npm run check:fast` | Lint, typecheck, unit tests. **Must pass before every task commit** |
| `npm run test:e2e` | Playwright (a few real-browser tests) |
| `npm run check` | Everything: check:fast, contrast, build, e2e. Must pass at each phase end and in CI |

## Environment variables

`.env.local` (never committed). `.env.example` is committed with empty values.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Phases 0 to 2 need no env vars.

## Definition of done (every task)

- Works as described in the task's **Done when**.
- Has unit tests if the logic is pure, component tests if it is interactive and simple.
- Keyboard accessible with visible focus and labels.
- Has loading, empty, and error states where data is involved.
- No console errors or warnings, no leftover `console.log`.
- Matches `layout.md` and `theme.md`.
- Docs updated if behavior changed.

## Defaults the owner did not specify (assume these, tell the owner if they matter)

- English only. UI copy is short, friendly, plain language.
- Desktop-first builder, mobile-first fill page. The builder does not need to work on phones.
- Latin fonts only. Unsupported glyphs fall back with a warning.
- No analytics, no tracking, no third-party scripts or CDN fonts.
- No ads in v1 (the owner will handle that later). Leave no ad placeholders in the UI, but keep the layout free of anything that would block adding them later.
- Email and password auth only. Single owner per form.
- Public form links are unlisted (`noindex`) but not secret.
- Autosave everywhere. Never lose work silently.
- Browser support: latest Chrome, Edge, Firefox, Safari, iOS Safari 16+.
- Dates use `DD MMM YYYY` in PDFs and the browser locale in the UI.
- Files and exports are named with a lowercase ASCII slug of the form title.

## Things easy to forget (check these as you go)

- Wait for fonts before measuring text (`loadAllFonts`).
- Round all stored positions and sizes to integers.
- Coordinates are in document px. Never store zoomed values.
- Re-clamp elements when the preset or page size changes. Never silently delete them.
- Radio and checkbox field heights depend on their option count.
- Hidden elements do not render in preview, fill, or PDF.
- Fill page reading order and tab order is sorted by `y`, then `x`.
- Inputs on the fill page use at least 16px font on mobile.
- Revoke Blob URLs after downloads.
- Lazy-load pdf-lib, the builder, and Moveable so the fill page stays small.
- SPA fallback is needed on the host (`public/_redirects`).
- Add `noindex` to fill pages and set a real `<title>` per route.
- Keep `theme-preview.html` in sync when `theme.css` changes.
- Remove the dev-only "Add 100 elements" tool from production builds.

## Handoff note template (end of every phase)

```
## Phase N handoff
What works: (short list)
How to run: (commands, env)
What to try: (5 to 10 concrete clicks)
Known issues / limitations:
Decisions I made (also in docs/decisions.md):
Questions for you:
Screenshots: (attached or paths)
```

## When you are unsure

Prefer the simpler option that matches the docs. Prefer shipping a working slice over a perfect one. Ask the owner when a choice would change how the product looks or behaves.
