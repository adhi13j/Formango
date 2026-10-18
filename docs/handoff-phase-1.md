## Phase 1 handoff

**What works** (all in `/builder`, nothing needs a backend)
- First run asks for a size (Mobile form or A4). Everything autosaves to the browser (IndexedDB) and survives a reload. A corrupted save loads a blank page, shows a toast and keeps a downloadable backup.
- Add 7 field types, 3 text styles, 3 shapes, a line, a divider and images, by click or by dragging from the left panel. Click-added items land in the visible area and never stack on top of each other.
- Select, shift-click, drag a box to select several, Ctrl/Cmd+A. Move, resize (8 handles, ratio rules for images and shapes), snap to page edges, center, margins, layout grid and other elements, with pink guides. Hold Alt to move freely.
- Undo and redo (100 steps, one drag is one step), zoom 25% to 300% (buttons, Ctrl+wheel, shortcuts), Space+drag to pan.
- Contextual toolbar for text, fields (label, required, options, placeholder, validation, style), shapes, lines, images, multiple selections (align, distribute), and page settings (page color, outer background, size, grid, submit button).
- Double-click text or a field label to edit in place. Layers popover (hide, lock, reorder, rename). Position popover with exact numbers.
- Two templates, Preview (desktop and phone, A4 becomes a list on phones), JSON export and import, "Save your current work first?" before New design.
- Keyboard: every shortcut listed under `?`, a keyboard-only add/edit/move/delete/undo flow is tested.

**How to run**
```
npm install
npx playwright install chromium firefox   # once, for the browser tests
npm run dev                               # http://localhost:5173/builder
npm run check                             # lint, types, 145 unit tests, contrast, build, 136 browser tests (Chromium + Firefox), 2 perf tests
```

**What to try**
1. Open `/builder`, choose Mobile form, open Templates and use "Event registration".
2. Click the heading and press Enter, type a new title, press Esc. Press Ctrl+Z.
3. Select the "Ticket type" field, open Options, add an option: the field grows.
4. Drag a field near the page center and a column line: pink guides appear. Hold Alt while dragging: no snapping.
5. Select two fields with a drag box, use the align buttons, then move them together and press Ctrl+Z once.
6. Change Page color and Outer background (nothing selected). Both update live.
7. Zoom to 200% and drag something 100 screen pixels: it moves 50 document pixels.
8. Press Preview, try Phone, type in the fields, press Reset answers, then Esc.
9. More actions, Export JSON, delete everything, Import JSON.
10. Reload the page: your design is back. Open More actions, New design: you are asked to save first.

**Known issues and limitations**
- Signature fields are a drawn box for now. The signature pad, validation messages, and PDF export are Phase 2.
- Text width was verified in Chromium and Firefox on Linux only. Safari and Windows are not tested yet (the QA checklist lists a three-browser line-break check).
- No screen reader (VoiceOver, NVDA) pass was done, only automated checks and a keyboard-only test.
- In a development build, selecting an element among 100 can take about 120 ms. Dragging is smooth (no long tasks).
- `qa-checklist.md` items that need a human eye are still unticked: visual polish, VoiceOver, memory growth over 50 add and delete cycles, and Safari.
- Not on GitHub CI yet because the CI workflow has not run (push when ready).

**Decisions I made** (also in `docs/decisions.md`): own snapping code, group moves through a proxy box, free-space placement of new elements, outer background shown in the editor, `role="group"` instead of `fieldset`, Firefox added to browser tests.

**Questions for you**
1. Is the editor feel right (drag, resize, snapping, toolbar layout)? This is the part most likely to need your refinement.
2. Should the outer background keep showing in the editor, or go back to a fixed neutral workspace?
3. Anything in the toolbar you expected that is missing?

**Screenshots:** `docs/screenshots/phase-1-builder.png`, `docs/screenshots/phase-1-preview-phone.png`
