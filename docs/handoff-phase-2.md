## Phase 2 handoff

**What works**
- Fill form with validation (required, email, phone, number, lengths, options, dates), focus on the first error, honeypot and 2 second guard, success screen, "Submit another response".
- Signature pad: Draw, Type (Caveat), or Upload. File upload fields with allowed kinds and size limit. Boxes turn green when filled.
- `/fill/local` fills the design saved in this browser and stores responses in IndexedDB. Preview in the builder uses the same form and saves nothing.
- PDF: filled copy (success screen button, or "Download blank PDF" in the menu) and fillable PDF (menu). Lazy loaded, so the fill route stays small.
- 9 templates, including the new Insurance proposal info sheet. Automated PDF visual match test for the kitchen sink and every template.

**How to run**: `npm run dev`, open `/builder`. `npm run check` runs everything.

**What to try**
1. Templates, Contact form, Preview, press Send straight away (it asks you to wait), then fill and send.
2. Leave required fields empty and send after 2 seconds: errors show and the first field is focused.
3. Use a form with a signature: try Draw, Type, and Upload.
4. Add a File upload field, open File rules, change types and size, then try a wrong file in Preview.
5. Fill a form, press Download my copy (PDF), and compare it with the design.
6. Menu, Download fillable PDF, open it in your PDF viewer, and type into the fields.
7. Menu, Open fill page in a new tab: submit twice (responses stay in this browser).
8. Open `/fill/local` at 390px wide (DevTools) and check there is no sideways scroll.
9. Templates, Insurance proposal info: check the layout, then Preview it.

**Known limits**
- Responses are stored only in this browser until Phase 3.
- File answers keep the file name; the bytes are not uploaded yet.
- Mobile forms export as one tall PDF page, not A4 pages.
- Fillable PDFs are untested in Acrobat and phone viewers (only inspected in pdf.js). Please try one or two.
- Text in the PDF is checked in Chromium only. Firefox and Safari may round text differently.
- Characters outside the Latin fonts (for example ₹) become `?` in the PDF.

**Decisions**: see `docs/decisions.md` (Phase 2 section).

**Questions for you**
1. Is the fill experience and the PDF what you pictured?
2. Should the green border also appear on the Submit button's form (no), or be a per-form setting?
3. Ready for Phase 3 (accounts, publish link, responses table)? It needs you to create a free Supabase project.

**Screenshots**: `docs/screenshots/`, sample files in `exports/`.
