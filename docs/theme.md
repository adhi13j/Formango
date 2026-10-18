# Theme: mango

Warm, friendly, slightly playful. Think ripe mango on cream paper, with dark brown ink instead of black.

- **Source of truth:** `theme.css`. Copy it to `src/styles/theme.css` and import it once in `src/index.css`.
- **Visual check:** open `theme-preview.html` in a browser. It shows every color, live contrast ratios, and sample components. Approve the look before Phase 0 ends.
- **Scope:** this theme styles the **app UI** only. Colors inside a user's form come from the form document (see "Default document palette" below).

---

## Rules (read these before styling anything)

1. **Use semantic tokens in components** (`bg-primary`, `text-muted-foreground`, `border-border`), not raw palette values and never hex codes. Raw palette (`mango-100`) is allowed only for decorative surfaces like the landing hero.
2. **Text on mango is dark ink, never white.** White on mango-500 fails contrast. `--primary-foreground` is `ink-900`.
3. **No pure black or pure grey anywhere.** Use `ink-*` and `cream-*`.
4. **One primary button per view.** Everything else is secondary or ghost.
5. **Accent text on light backgrounds uses `mango-800`.** `mango-700` is for icons and large text only (about 3.8:1 on white).
6. **Selection and snap guides are NOT orange.** Use `--selection` (indigo) and `--guide` (pink) so they stay visible on top of orange designs.
7. **Focus ring is always visible:** 2px `--ring` with 2px offset. Never remove outlines without replacing them.
8. **Light mode only for v1.** Tokens are structured so a dark theme can be added later.

---

## Palette

### Mango (brand)

| Token | Hex | Use |
|---|---|---|
| mango-50 | #FFF9EE | Subtle tinted sections |
| mango-100 | #FFF1D6 | Accent backgrounds, selected states, hover on ghost buttons |
| mango-200 | #FFE2AB | Badges, soft highlights |
| mango-300 | #FFCF78 | Gradient start, illustrations |
| mango-400 | #FFB84A | Illustrations, progress fills |
| **mango-500** | **#FF9F1C** | **Primary buttons, focus ring, brand mark** |
| mango-600 | #F08400 | Primary hover and pressed |
| mango-700 | #C76A00 | Icons and large text on light |
| mango-800 | #8F4D06 | Accent text on light backgrounds |
| mango-900 | #5C3207 | Rare. Strong emphasis |

### Ink (text)

| Token | Hex | Use |
|---|---|---|
| ink-900 | #2A1805 | Body text, headings, text on mango |
| ink-700 | #4A3219 | Secondary headings |
| ink-500 | #7A5C3A | Muted text, placeholders, helper text |
| ink-400 | #A58B6A | Input borders, disabled icons. Never body text |
| ink-300 | #C9B497 | Decorative dividers only |

### Cream (surfaces)

| Token | Hex | Use |
|---|---|---|
| cream-50 | #FFFCF7 | App background |
| cream-100 | #FFF6E8 | Secondary surfaces, muted backgrounds, field fills |
| cream-200 | #F6EAD7 | Builder workspace (area around the page) |
| cream-300 | #EBDCC3 | Dividers on cream |
| cream-400 | #E0CBA8 | Strong borders |
| white | #FFFFFF | Cards, popovers, the form page itself |

### Status

| Meaning | Text | Background | Solid |
|---|---|---|---|
| Success | leaf-700 #2F6B16 | leaf-100 #E6F4DC | leaf-500 #4C9A2A |
| Error | berry-700 #A12633 | berry-100 #FDE7E9 | berry-500 #CF3340 |
| Warning | sun-700 #7A5600 | sun-100 #FFF4CC | sun-500 #E5A100 |

Solid status colors are for icons and bars. Text uses the 700 shade.

### Editor-only

| Token | Hex | Use |
|---|---|---|
| selection | #4F46E5 | Selected element outline and resize handles |
| guide | #FF2D87 | Snap guide lines while dragging |
| workspace | #F6EAD7 | Builder background around the page |

---

## Semantic tokens

| Token | Maps to |
|---|---|
| background | cream-50 |
| foreground | ink-900 |
| card, popover | white |
| primary | mango-500 |
| primary-foreground | ink-900 |
| primary-hover | mango-600 |
| secondary, muted | cream-100 |
| muted-foreground | ink-500 |
| accent | mango-100 |
| accent-foreground | mango-800 |
| destructive | berry-500 (text on it: white) |
| border | #F0E3CF |
| border-strong | cream-400 |
| input (control border) | ink-400 |
| ring | mango-500 |

---

## Contrast (verify, don't trust)

Approximate ratios. `theme-preview.html` computes them live, and Phase 0 includes a script that fails the build if a pair drops below its minimum.

| Pair | Ratio | Needs |
|---|---|---|
| ink-900 on cream-50 (body) | about 16:1 | 4.5 |
| ink-500 on cream-50 (muted) | about 6:1 | 4.5 |
| ink-900 on mango-500 (primary button) | about 8.3:1 | 4.5 |
| mango-800 on white (accent text) | about 6.5:1 | 4.5 |
| mango-700 on white (icons only) | about 3.8:1 | 3 |
| white on berry-500 (destructive) | about 5:1 | 4.5 |
| ink-400 on white (input border) | about 3.2:1 | 3 |

---

## Typography

| Role | Font | Weights | Notes |
|---|---|---|---|
| UI and body | DM Sans | 400, 500, 700 | Self-hosted |
| Display (landing hero, big headings) | Poppins | 600 | Use sparingly |

Scale (px / line height): 12/16 caption, 14/20 small and controls, 16/24 body, 18/28 lead, 24/32 H3, 32/40 H2, 48/56 H1 (landing only).

Self-host fonts. Do not load from Google Fonts at runtime (privacy, speed, offline PDF consistency). Document fonts are listed in `spec.md`.

---

## Shape, depth, spacing, motion

- **Radius:** 12px cards and popovers, 8px inputs and buttons, 999px pills and chips.
- **Shadows (warm, never grey):** `shadow-sm` for cards at rest, `shadow-md` for popovers and hover lift, `shadow-lg` for modals, `shadow-page` for the form page in the builder.
- **Spacing:** 4px base unit. Common gaps: 8, 12, 16, 24, 32. Page padding: 16 on mobile, 24 on tablet, 32 on desktop.
- **Motion:** 120ms for hover and focus, 200ms for panels and popovers, `cubic-bezier(0.2, 0.8, 0.2, 1)`. Respect `prefers-reduced-motion` by disabling transforms and keeping only opacity fades.
- **Icons:** lucide-react, 20px default, 1.75 stroke.

---

## Default document palette (colors offered to users for their forms)

Shown as swatches in the builder's color picker. Users can also enter any hex.

| Name | Hex |
|---|---|
| Mango | #FF9F1C |
| Tangerine | #F08400 |
| Butter | #FFCF78 |
| Cream | #FFF1D6 |
| Ink | #2A1805 |
| White | #FFFFFF |
| Leaf | #4C9A2A |
| Teal | #1F8A8A |
| Sky | #3B82C4 |
| Violet | #6D5BD0 |
| Guava | #F2667A |
| Berry | #CF3340 |

---

## Changing the theme later

1. Edit `theme.css` only.
2. Mirror the `:root` values in `theme-preview.html`.
3. Re-run the contrast script (`npm run check:contrast`).
4. Never fix a color by hard-coding a hex in a component.
