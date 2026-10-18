# QA checklist

Manual test scripts. Claude Code runs the relevant section before each phase checkpoint and reports results. The owner uses **Phase 1** to test the page builder.

Mark each line pass or fail. For every fail, write what happened and what you expected.

Test browsers: latest Chrome (main), Safari, Firefox. Desktop window sizes: 1280 x 800 and 1920 x 1080.

---

## Phase 1: Page builder

### A. First run
- [ ] Opening `/builder` with no saved design shows the **Choose size** dialog with Mobile form preselected.
- [ ] Choosing Mobile form shows a 390px wide white page on the tan workspace with the empty-state hint.
- [ ] Choosing A4 document shows a 794 x 1123 page, fit to the window.
- [ ] Window under 1024px wide shows the "use a larger screen" message, with no broken layout.
- [ ] No console errors or warnings on load.

### B. Adding things
- [ ] Click each of the 7 field types: it appears at the center of the visible area and is selected.
- [ ] Drag each field type from the panel onto the page: it lands under the cursor.
- [ ] Add Heading, Subheading, Body text, Rectangle, Rounded rectangle, Circle, Line.
- [ ] Upload a PNG, a JPG, a WebP. Upload a 10 MB image (rejected with a message). Upload an SVG (rejected with an explanation).
- [ ] Adding 150 elements stops with a toast, with no crash.
- [ ] Adding the same item 5 times in a row does not stack them perfectly on top of each other.

### C. Selecting
- [ ] Click selects, Shift-click adds, clicking empty page deselects, Esc deselects.
- [ ] Marquee drag selects only intersecting elements. Starting a marquee on an element drags that element instead.
- [ ] Ctrl/Cmd+A selects all unlocked elements.
- [ ] Hover shows a thin outline on the element under the cursor.
- [ ] Hidden and locked elements behave as described in `layout.md`.

### D. Moving, resizing, snapping
- [ ] Drag moves smoothly. Release commits. **One Ctrl+Z restores the position before the drag.**
- [ ] Arrow keys nudge 1px, Shift+arrow 10px. Holding the key then releasing is one undo step.
- [ ] Pink guides appear when aligning to page edges, page center, margins, and other elements' edges and centers. Holding Alt disables snapping.
- [ ] Resize from all 8 handles. Image corners keep aspect ratio. Shift locks ratio on shapes.
- [ ] Text with auto height only resizes width and re-wraps. Radio and checkbox fields keep the height from their options.
- [ ] Minimum sizes are enforced. Elements cannot leave the page horizontally. On A4 they cannot leave vertically. On mobile the page grows when you drag below the bottom.
- [ ] **Zoom check:** at 200% zoom, dragging an element by 100 screen px moves it 50 doc px (use the Position popover to confirm). Same at 50%.
- [ ] Multi-select drag moves all together as one undo step. Multi-select shows no resize handles.
- [ ] Align and distribute produce exact results (verify numbers in Position popover).

### E. Editing text and fields
- [ ] Double-click text edits in place. Esc, click-away, and Ctrl+Enter commit. Empty text becomes "Text".
- [ ] After committing, line breaks match what you saw while editing (within one line).
- [ ] Line breaks for the same text are identical in Chrome, Firefox, and Safari (text uses geometricPrecision, no kerning or ligatures).
- [ ] Double-click a field label edits it. Required toggle adds a red asterisk.
- [ ] Options editor: add, remove (cannot go below 1), reorder, rename, paste multiple lines, duplicates are removed, max 50.
- [ ] Changing options on radio/checkbox updates the field height.
- [ ] Changing font, size, weight, color, alignment, line height updates immediately for one or many selected text elements.
- [ ] Color popover: swatches, recent colors, hex input rejects invalid values, "No fill" works on shapes.
- [ ] Field style popover changes label font and color, input fill, border, radius, text color.
- [ ] Position popover numeric inputs clamp and commit on Enter or blur.

### F. Layers
- [ ] Bring to front, forward, backward, send to back change stacking visibly.
- [ ] Layers popover lists in z-order, selecting, renaming, hiding, locking, and reordering work.

### G. Zoom and navigation
- [ ] Fit, 100%, +, -, Ctrl+wheel, Ctrl +/-/0/1 all work. Range stops at 25% and 300%.
- [ ] Ctrl+wheel zoom keeps the point under the cursor in place.
- [ ] Space + drag pans. Scrollbars behave. Page stays centered when smaller than the window.
- [ ] Resizing the browser window refits the page while in fit mode.
- [ ] Text stays crisp at 300%.

### H. Undo, redo, persistence
- [ ] Undo and redo work for add, delete, edit, style change, reorder, preset switch, template apply.
- [ ] Undo/redo buttons disable correctly. 100-step history limit does not crash.
- [ ] Reload the page: the design is restored exactly, including zoom reset to fit.
- [ ] A large design (several images, doc near the size limit) still saves and reloads, or fails with the error banner and a working backup download (no silent loss).
- [ ] Save status shows Saving then Saved.
- [ ] Manually corrupt the saved JSON in DevTools: the app loads a blank doc, shows the toast, and does not crash.
- [ ] Fill local storage to its limit (or simulate failure): the error banner appears with a working **Download backup**.
- [ ] Export JSON then Import JSON restores the same design. Importing a broken file shows a clear error and changes nothing.

### I. Size presets and templates
- [ ] Switching Mobile to A4 and back shows the confirm dialog, keeps all elements, and clamps them. Undo reverses it.
- [ ] Both templates load, look polished, are fully editable, and undo restores the previous design.
- [ ] Layout grid toggle shows/hides the extra snap lines.

### J. Preview
- [ ] Preview hides all editing chrome and looks identical to the edit view.
- [ ] Desktop mode shows the outer background around a mobile-preset page. Phone mode shows a 390px frame.
- [ ] An A4 form in Phone mode shows List view with no horizontal scroll.
- [ ] All field types are interactive. Reset answers clears them. Esc exits. Nothing is saved.

### K. Keyboard and accessibility
- [ ] Every shortcut in the `?` dialog works. None fire while typing in an input.
- [ ] Tab reaches every toolbar control in a logical order, focus is always visible, and dialogs trap and restore focus.
- [ ] A keyboard-only user can add a field, edit its label, move it, delete it, undo.
- [ ] Screen reader announces the selected element and save status (spot check with VoiceOver or NVDA).
- [ ] With "reduce motion" on, no animations other than fades.

### L. Performance
- [ ] With 100 elements: drag, resize, and zoom stay smooth. React Profiler shows only the moved elements re-render.
- [ ] No memory growth after 50 add/delete cycles (check heap in DevTools).

### M. Hygiene
- [ ] `npm run check` passes (lint, types, tests, contrast, build).
- [ ] No `console.log`, no unused code, no hex colors in components.

---

## Phase 2: Fill and PDF

### Fill page
- [ ] Mobile form on a 390px viewport: no zoom needed, no horizontal scroll, inputs at least 16px (iOS does not zoom on focus).
- [ ] Mobile form on desktop: outer background fills the sides, page centered with shadow.
- [ ] A4 form on desktop: page fits the window. On a phone: List view with correct reading order.
- [ ] Validation: required, email, phone, number, max length. Errors show under fields with icon and text. First error is focused and scrolled into view.
- [ ] Radio and checkbox groups work with keyboard (arrows, space) and are announced as groups.
- [ ] Signature: draw with mouse and touch, clear, empty pad counts as no answer, typed fallback works, PNG under 60 KB.
- [ ] Honeypot filled or submit under 2 seconds: no submission recorded (and no visible error shown to a human who just submitted fast, instead show "Please wait a moment").
- [ ] Success screen appears, and "Submit another response" resets the form.

### PDF
- [ ] **Visual match** (automated Playwright + pdfjs + pixelmatch test passes; `/dev/pdf-compare` for debugging): every element type lines up within about 1px in both presets (shapes, borders, rounded corners, lines, images with cover and contain, text with all three alignments, all 7 field types).
- [ ] Text line breaks in the PDF are identical to the screen. Test long words, explicit newlines, and 3-line paragraphs in all 7 fonts.
- [ ] Filled PDF: empty optional fields still draw their boxes. Long text is truncated with an ellipsis, not overflowing. Date shows `DD MMM YYYY`.
- [ ] Signature image appears inside the box without distortion.
- [ ] Fillable PDF (if built) opens and can be typed into with characters not present in the form's own text, in Chrome and one other viewer (Preview, Acrobat, or a phone viewer). Dropdown, radio, checkbox work. Required fields flagged.
- [ ] Text with an unsupported character shows the warning toast and the PDF still downloads.
- [ ] File name follows the pattern. Download works on desktop Chrome, Safari, and iOS Safari.
- [ ] Build output: pdf-lib is in a separate lazy chunk, not the main bundle.
- [ ] Open the PDF at 400% zoom: text and shapes stay vector-sharp.

---

## Phase 3: Accounts and responses

### Auth and forms
- [ ] Sign up, sign in, sign out. Wrong password and duplicate email show friendly errors.
- [ ] Visiting `/forms` logged out redirects to login and returns afterwards.
- [ ] Create a form (both presets), edit, reload: it persists. Rename, duplicate, delete (with undo toast).
- [ ] Two tabs editing the same form show the conflict banner, and Reload and Overwrite both work.
- [ ] Guest design offer appears after first login and saves correctly.
- [ ] Images are uploaded to Storage, and the saved doc contains URLs, not data URLs.

### Publishing and responses
- [ ] Publish returns a working link. Unpublish makes it show "This form is closed".
- [ ] Editing the draft after publishing does **not** change what the public link shows until **Republish**. A response submitted before a republish still appears correctly (removed fields shown as "removed field").
- [ ] In an **incognito window**, open the link, submit on a phone-size viewport, and download the PDF.
- [ ] Responses appear in the owner's table within a refresh. Search, sort, pagination, side panel, per-response PDF, delete all work.
- [ ] CSV: opens correctly in Excel and Google Sheets, accents preserved, commas and quotes escaped, a cell starting with `=` is prefixed with `'`.

### Security (must all pass)
- [ ] Logged out: cannot list `forms` or `responses`, cannot read an unpublished form, cannot insert into an unpublished form.
- [ ] Anon: can read a **published** form's snapshot and insert a response into it, nothing else. Anon cannot read the private draft `doc`. An insert with a stale `form_rev` is rejected.
- [ ] User B cannot read, edit, or delete user A's forms, responses, or Storage files (try with the Supabase client in the console).
- [ ] An `answers` payload over the size limit is rejected.
- [ ] `service_role` key appears nowhere in the repo or bundle (search the `dist` folder).
- [ ] Malicious text in a label or answer (`<script>`, `"><img onerror=...>`) renders as plain text everywhere, including the PDF and CSV.

---

## Phase 4: Final

- [ ] Landing matches the sketch, presets scroll smoothly, pause on hover, and are static with reduced motion.
- [ ] Login, sign up, "Try the builder" all work. Logged-in users skip to `/forms`.
- [ ] Layouts verified at 390, 768, 1280, and 1920 widths.
- [ ] Lighthouse (fill page): Performance 90+, Accessibility 95+, Best Practices 95+. Landing: same targets.
- [ ] axe finds no serious or critical issues on landing, fill page, and the builder shell.
- [ ] Production URL: signup, build, publish, fill, PDF all work. Hard refresh on `/forms` and `/f/<slug>` works.
- [ ] Privacy page linked from landing and fill page.
- [ ] README has screenshots, GIF, setup steps, and design decisions.
- [ ] Playwright smoke test passes.
- [ ] Fresh clone works: `npm install`, set env, `npm run dev`.

---

## Bug report format (for the owner)

```
Where: (screen, element type, preset)
Steps: 1. ... 2. ... 3. ...
Expected:
Actual:
Browser and window size:
Screenshot or screen recording: (if possible)
```
