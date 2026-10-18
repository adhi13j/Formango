# Conventions

How the code is organized and written. Follow these so the project stays consistent and easy to explain in an interview.

---

## 1. Folder structure

```
formango/
  CLAUDE.md
  docs/                      all project docs (already here, with decisions.md)
  .github/workflows/ci.yml   runs npm run check on push
  public/
    fonts/ (+ licenses/)  favicon.svg  _redirects  _headers
  scripts/
    check-contrast.ts
  supabase/
    schema.sql
  src/
    app/                     App.tsx, routes.tsx, ErrorBoundary.tsx, providers
    pages/                   one file per route: Landing, Forms, Builder, Fill, Responses, Privacy, NotFound
    features/
      builder/               Canvas, Rail, Flyouts, toolbar/, LayersPopover, PreviewBar, dialogs/
      fill/                  FillForm, ListView, SignaturePad, SuccessScreen
      forms/                 FormCard, FormsGrid, ChooseSizeDialog
      responses/             ResponsesTable, ResponsePanel, csv.ts
      auth/                  AuthProvider, LoginCard, RequireAuth
    components/
      ui/                    shadcn components (generated, lightly edited)
      elements/              ElementView + Text/Shape/Line/Image/Field views (shared renderers)
      common/                Logo, EmptyState, ColorPicker, Kbd, etc.
    store/                   docStore.ts, uiStore.ts
    lib/
      geometry.ts  answers.ts  persistence.ts  fonts.ts  constants.ts  slug.ts
      text/layoutText.ts
      repo/                  formsRepo.ts, responsesRepo.ts (interfaces + implementations)
      supabase.ts
    pdf/                     exportPdf.ts, drawElement.ts, drawField.ts, helpers.ts
    templates/               *.json
    types/                   doc.ts, doc.schema.ts
    styles/                  theme.css, fonts.css
    test/                    setup.ts
```

Rule of thumb: **`lib/` and `pdf/` contain no React.** `components/elements/` contains no store access (props in, JSX out). Only `features/` and `pages/` talk to stores.

---

## 2. Naming

- Files: `PascalCase.tsx` for components, `camelCase.ts` for modules, `kebab-case.json` for templates and data.
- Components and types `PascalCase`, functions and variables `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- Booleans start with `is`, `has`, `can`, `should`.
- Event handlers: `onSomething` for props, `handleSomething` for implementations.
- Store actions are verbs (`addElement`), selectors are nouns (`selectedElements`).
- Branches: `feat/...`, `fix/...`. Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

---

## 3. TypeScript

- `strict` on. **No `any`.** Use `unknown` and narrow, or Zod to parse.
- Discriminated unions on `type` / `fieldType`. Use exhaustive `switch` with a `never` check so adding a new element type breaks the build until every place handles it.
- Prefer `type` imports (`import type`). Avoid enums, use string unions.
- Never mutate store state. Return new objects (or use immer only if it is already in the project).
- Public functions in `lib/` and `pdf/` have explicit return types.

---

## 4. React

- Function components and hooks only.
- Keep components small. If a file passes about 250 lines, split it.
- `React.memo` on element views. Pass **stable** props. Select the smallest slice from Zustand (`useDocStore(s => s.doc.elements.find(...))` with a shallow equality) so unrelated changes do not re-render.
- No state derived in effects when it can be computed during render (`useMemo` only when profiling shows a cost).
- Effects clean up listeners, observers, and timers.
- No inline object or array props on memoized children inside hot paths.

---

## 5. State rules

- **Doc store holds only the `FormDoc`** (and history). Anything else (selection, zoom, mode, clipboard) goes in the UI store, so undo never touches UI state.
- All doc changes go through store actions, which run `normalize()` (clamp, min size, recompute auto heights, round).
- **Gestures write once.** During drag or resize, mutate the DOM only; commit on gesture end.
- Server state (Supabase) lives in the repo layer. UI code never calls `supabase` directly.

---

## 6. Rendering rules (editor, fill, PDF must agree)

- Units are document pixels. Zoom is a CSS transform on the page wrapper only.
- Text is laid out by `layoutText` and rendered as one `<h2>` or `<p>` (from `role`) containing one span per line. The PDF reuses the same lines.
- During a resize gesture, auto-height text re-lays out from a local transient width (component state or ref) so it re-wraps live. The store is still written once at gesture end.
- Continuous controls (opacity slider, color drag, size stepper held down) pause history while active and commit one entry at the end, like nudging with arrow keys.
- Borders are **inside** the box (`box-sizing: border-box`). The PDF insets stroked geometry by half the stroke width to match.
- Colors are stored as `#RRGGBB` uppercase. Reject or normalize anything else.
- Never use `dangerouslySetInnerHTML`. Never inject user strings into `style` text or URLs without validation.

---

## 7. Styling

- Tailwind utility classes with the theme tokens. No hex codes in components (the only hex values live in `theme.css`, the default palette constant, and templates).
- Use `cn()` (clsx + tailwind-merge) for conditional classes.
- Component variants through `class-variance-authority` as shadcn does.
- Transitions only on `opacity`, `transform`, `background-color`, `border-color`, `box-shadow`. Durations from `theme.md`.
- Responsive utilities mobile-first (`sm:`, `lg:`).
- Touch targets at least 44px on the fill page.

---

## 8. Accessibility

- Every control is a real `button`, `a`, `input`, or `select`. No clickable divs.
- Icon-only buttons have `aria-label` and a tooltip.
- Visible focus on everything. Trap focus in dialogs, restore focus on close (shadcn does this, do not break it).
- Errors use text and an icon, linked with `aria-describedby`, and `aria-invalid` on the input.
- Live regions for save status and toasts.
- Respect `prefers-reduced-motion`.
- On the fill page, DOM and tab order follow reading order (sorted by `y`, then `x`), not insertion order.

---

## 9. Errors and edge cases

- Never let an exception blank the app: error boundaries around the canvas, the fill form, and each route.
- Network calls: timeout, retry button, preserved user input.
- Parse all external data (imports, localStorage, Supabase rows) with Zod. On failure show a message, keep the raw data downloadable, fall back safely.
- User-facing messages are short and say what to do next. No stack traces or raw error text.
- Log errors with `console.error` in one helper (`logError(context, error)`) so it can be swapped later. No `console.log` in committed code.

---

## 10. Testing

- **Unit tests** for everything pure: geometry, `layoutText`, answers and validation, store actions and undo, CSV, slug, schema and templates, PDF coordinate helpers.
- **Component tests** for `ElementView` modes, the options editor, the signature pad's empty state, and the fill form validation.
- **Manual** checklists in `qa-checklist.md` for drag, snap, zoom, and PDF visual match (automating pixel interactions costs more than it saves for v1).
- **Playwright from Phase 1** (jsdom has no layout, so Moveable cannot be tested without a real browser). Keep it to a few tests: drag at 200% zoom moves an element 50 doc px as one undo step; add a field, reload, it is still there; fill-page validation. From Phase 2 add the **PDF visual match** test: render the PDF to PNG with `pdfjs-dist` (dev dependency), screenshot the same doc in the DOM, compare with `pixelmatch`.
- Test names describe behavior: `it('keeps one history entry per drag')`.
- Do not mock what you can run for real. Mock only the network and canvas measurement.

---

## 11. Dependencies

- Add a dependency only when it removes real work and is maintained. Record why in the PR/commit message.
- Pin nothing by hand. Let the lockfile do it. Commit the lockfile.
- After adding or upgrading, run `npm run check`.
- Do not add: heavy UI kits, date libraries (use `Intl`), lodash (write the 3 helpers), CSS-in-JS.

---

## 12. Git hygiene

- Work on `main` with small commits (solo project), tag each phase (`phase-1`, ...). Push to GitHub from Phase 0 as a backup. Short branches only for risky experiments.
- Each task commit passes `npm run check:fast` (lint, typecheck, unit tests). The full `npm run check` (adds contrast, build, Playwright) runs at phase end and in GitHub Actions CI.
- Never commit `.env*` (except `.env.example`), secrets, or build output.
- Update docs in the same commit when behavior changes (`layout.md`, `schema.md`).
