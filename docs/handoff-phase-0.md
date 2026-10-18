## Phase 0 handoff

**What works**
- Vite + React 19 + strict TypeScript, `@/` alias, Tailwind v4 with the mango theme tokens, shadcn `button`.
- Seven document fonts plus the UI fonts, self-hosted (woff2 for the browser, TTF for the PDF).
- Routes: `/` (landing placeholder), `/builder` (lazy placeholder), `*` (friendly 404), and a dev-only `/dev/theme` page.
- Error boundary and route error element show a "Something went wrong" page with a Reload button.
- Checks: ESLint (no `any`, no `console.log`), Prettier, Vitest (11 tests), Playwright (10 tests), contrast check (19 pairs), CI workflow.

**How to run**
```
npm install
npm run dev            # http://localhost:5173 (theme page at /dev/theme)
npm run check:fast     # lint, typecheck, unit tests
npm run check          # everything, including build and browser tests
npx playwright install chromium   # once, for the browser tests
```
No env vars needed in Phases 0 to 2.

**What to try**
1. Run `npm run dev`, open `/dev/theme`. Compare it with `docs/theme-preview.html` (buttons, colours, fonts). Screenshot: `docs/screenshots/phase-0-theme.png`.
2. Open `/`, click "Try the builder". The tab title changes per route.
3. Open `/anything-else`: the 404 page, "Go home" returns to `/`.
4. In `docs/theme.css` temporarily set `--primary-foreground` to `#FFFFFF` (also in `src/styles/theme.css`), run `npm run check:contrast`: it fails. Revert.
5. Open the Network tab: all fonts come from your own origin, no Google requests.

**Known issues / limitations**
- The project is not on GitHub yet (the `gh` CLI is not installed here), so CI has not run. Create an empty repo and give me the URL.
- Fonts were generated from Google's variable fonts (static instances, Latin subset). Licenses are in `public/fonts/licenses/`.
- Text widths were only verified in headless Chrome on Linux. Phase 1 QA adds a Firefox and Safari check.
- The `test` and `check` scripts need Chromium for Playwright.

**Decisions I made (also in `docs/decisions.md`)**
- `react-router` v7+ is installed instead of `react-router-dom` (the current docs recommend it).
- `shadcn init` skipped: `components.json` is hand-written so the theme variables are never overwritten. shadcn installed a stray `cn` package; removed.
- ESLint kept (oxlint removed). The contrast script runs on Node's built-in TypeScript support, so there is no `tsx` dependency.
- Spike result: `geometricPrecision`, no kerning or ligatures, per-character width sums. DOM, canvas, and PDF widths then agree within 0.02px (before this fix they differed by up to 26px).
- Commit messages start with `done:`.

**Questions for you**
1. Do you approve the look (theme page and `docs/theme-preview.html`)? Phase 1 starts after your OK.
2. Send me the GitHub repo URL (private is fine) so I can push and turn CI on.

**Screenshots:** `docs/screenshots/phase-0-theme.png`, `docs/screenshots/phase-0-landing.png`
