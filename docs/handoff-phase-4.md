## Phase 4 handoff (final)

**What works**
- Home page (`/`): scrolling preset cards with a preview and "Use this template", login and sign up with a show-password toggle, a phone layout, and a redirect to My forms when you are signed in.
- `/privacy` in plain language, linked from the home page and the fill page. `robots.txt`, page titles, a description, and share-card tags (`public/og.png`).
- Security headers and a Content Security Policy in `public/_headers`, SPA refresh support in `public/_redirects`, and a weekly keep-alive workflow. `node scripts/serve-dist.mjs` serves the build with those headers: the PDF, templates, builder, and public form all ran with no CSP errors.
- README with architecture, setup, deploy steps, decisions, limits, and what I learned.

**Automated checks (all pass in `npm run check`)**: 228 unit tests, about 215 browser tests in Chromium and Firefox, the PDF pixel comparison for every template, axe accessibility checks (WCAG 2.1 A and AA) on the home page (desktop and phone), login, privacy, the builder, and the fill page, contrast pairs, and the production build.

**Lighthouse** (built site, served with the real headers)
| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Fill page, desktop | 94 | 100 | 96 | 63 (on purpose: the page says "noindex") |
| Home page, desktop | 88 | 95 | 96 | 100 |
| Fill page, phone with slow network simulated | 64 | 100 | 96 | 63 |

The phone number is the pessimistic Lighthouse simulation (slow 4G, 4x slower CPU). The main script is about 130 KB compressed; the fill route loads about 250 KB compressed in total, under the 300 KB target.

**What I could not do for you**
1. **Run the SQL migration** `supabase/migrations/002_counts_and_file_policy.sql` (SQL editor). Until then respondents cannot attach files to a published form, and "My forms" shows no response counts. Then run `node scripts/rls-check.mjs`: it should say 27 of 27 (it said 25 of 27 before, both failures are the file policy).
2. **Deploy to Cloudflare Pages** (steps in the README), then set the Supabase Site URL, add the two GitHub variables for the keep-alive job, and replace the contact line in `src/pages/Privacy.tsx`. After that, tag `v1.0.0`.
3. **Manual QA I cannot do here**: Safari and iPhone checks, screen reader (VoiceOver or NVDA), the fillable PDF in Acrobat and a phone viewer, and visual polish. These are the unticked items in `docs/qa-checklist.md`.
4. **Push**: git needs your sign-in. The history was rewritten to remove the co-author lines, so use `git push --force-with-lease origin main` and `git push --force origin --tags`.

**Known limits**: see the README.
