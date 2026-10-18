# Data model

Everything the user designs is **one JSON document** (`FormDoc`). The builder edits it, the fill page renders it, the PDF exporter draws it, and the database stores it in a single `jsonb` column. If you keep that one idea intact, the project stays small.

---

## 1. Coordinates and units

- All positions and sizes are in **document pixels** (`px`), origin at the **top-left** of the page.
- The editor applies a zoom transform on top. **Never store zoomed values.**
- Sizes are integers except where noted. Round to whole pixels on drag end.
- PDF export converts px to points (see `todo.md` Phase 2).

---

## 2. Types (`src/types/doc.ts`)

```ts
export type PagePreset = 'mobile' | 'a4';
export type FontId =
  | 'dm-sans' | 'inter' | 'poppins' | 'playfair' | 'lora' | 'space-grotesk' | 'caveat';

export interface FormDoc {
  version: 1;                    // bump + write a migration when the shape changes
  title: string;                 // 1 to 120 chars. Source of truth: forms.title is derived from it on save
  page: PageSettings;
  elements: DocElement[];        // array order = z-order. Last item is on top
  // No id (the database row id identifies a form) and no recent colors
  // (a user preference, kept in the UI store and localStorage so it never enters undo or exports).
}

export interface PageSettings {
  preset: PagePreset;
  width: number;                 // mobile 390, a4 794
  height: number;                // mobile: MINIMUM height 844. a4: fixed 1123
  autoHeight: boolean;           // mobile true, a4 false
  background: string;            // page color, hex
  outerBackground: string;       // color around the page in preview/fill on desktop, hex
  margin: number;                // layout grid margin: mobile 20, a4 40
}

interface BaseElement {
  id: string;                    // nanoid(10)
  type: 'text' | 'shape' | 'line' | 'image' | 'field' | 'button';
  name: string;                  // shown in Layers, e.g. "Heading", "Email"
  x: number; y: number;
  width: number; height: number;
  locked: boolean;               // locked = can't move/resize/delete from canvas
  hidden: boolean;               // hidden = not rendered in preview, fill, PDF
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;                  // plain text, \n for new lines
  role: 'heading' | 'body';      // semantics only: heading renders <h2>, body renders <p>
  fontFamily: FontId;
  fontSize: number;              // 8 to 120
  fontWeight: 400 | 700;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;            // multiplier 1.0 to 2.0, default 1.3
  autoHeight: boolean;           // height follows content when true (default)
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse';
  fill: string | null;           // null = transparent
  stroke: string | null;
  strokeWidth: number;           // 0 to 20
  radius: number;                // rect only, 0 to 200 (clamped to half the shorter side)
  opacity: number;               // 0 to 1
}

export interface LineElement extends BaseElement {
  type: 'line';                  // horizontal only in v1. height is fixed to thickness
  color: string;
  thickness: number;             // 1 to 20
  style: 'solid' | 'dashed';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;                   // data URL in Phase 1. Storage URL from Phase 3
  alt: string;
  radius: number;
  opacity: number;
  fit: 'cover' | 'contain';
}

export type FieldType =
  | 'text' | 'longtext' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'signature' | 'file' | 'group';
export type GroupColumnType = 'text' | 'number' | 'date' | 'dropdown' | 'radio';
export interface GroupColumn { id: string; label: string; type: GroupColumnType; required: boolean; options: string[] }
export type FileKind = 'image' | 'pdf' | 'document' | 'spreadsheet';

export interface FieldElement extends BaseElement {
  type: 'field';
  fieldType: FieldType;
  key: string;                   // unique slug used as PDF field name. Frozen at creation: never
                                 // regenerated when the label changes. Answers are keyed by `id`, not `key`
  label: string;
  placeholder: string;           // text, longtext, dropdown only
  required: boolean;
  validation: 'none' | 'email' | 'phone' | 'number';   // text only
  options: string[];             // dropdown, radio, checkbox. 1 to 50 items, unique
  fileKinds: FileKind[];         // file only. Empty means any supported kind. Extensions per kind: lib/fileTypes.ts
  maxFileMb: number;             // file only. 1 to 25, default 5
  columns: GroupColumn[];        // group only: the questions asked in each entry (1 to 8)
  itemLabel: string;             // group only: "Person" (entry titles read "Person 1", "Person 2")
  addLabel: string;              // group only: "Add person"
  minRows: number;               // group only: 0 to 30
  maxRows: number;               // group only: 1 to 30, default 10
  perRow: 1 | 2;                 // group only: questions side by side in an entry
  labelStyle: { fontFamily: FontId; fontSize: number; fontWeight: 400 | 700; color: string };
  inputStyle: {
    fontFamily: FontId; fontSize: number; textColor: string;
    fill: string; stroke: string; strokeWidth: number; radius: number;
  };
}

/** The Submit button. Exactly one per form: created with the doc, cannot be deleted or duplicated,
 *  but it can be moved, resized, hidden-by-design never (it is always shown), and restyled. Not drawn in PDFs. */
export interface ButtonElement extends BaseElement {
  type: 'button';
  label: string;                 // 1 to 30 chars, default "Submit"
  fontFamily: FontId; fontSize: number; fontWeight: 400 | 700;
  textColor: string;             // default ink-900
  fill: string;                  // default mango-500
  radius: number;                // default 12
}

export type DocElement =
  | TextElement | ShapeElement | LineElement | ImageElement | FieldElement | ButtonElement;
```

### Field anatomy

A field is **one element** containing a label and an input area. They move and resize together.

- `labelHeight = round(labelStyle.fontSize * 1.3)`, then a **6px gap**, then the input area.
- `text`, `longtext`, `dropdown`, `date`: input area is a rounded box filling the rest of the element.
- `signature`: input area is a dashed box. Respondents draw with mouse, finger, or trackpad, **type** their name in a script font, or **upload** an image of a signature. All three produce one PNG. Min height 120.
- `group` (repeating group, "Add person"): the field holds a list of small forms. The designer sets the questions once (`columns`). Respondents press the add button to get another copy and can remove entries. The element's stored height is the height of **one sample entry plus the add button** (`groupDesignHeight`, computed like radio heights, so only the width can be resized). On the fill page and in the PDF the group takes the height of its real entries and **everything that starts below it moves down** (or up) by the difference (`applyGroupRows`); items beside or above it stay. A fixed A4 page grows to fit, and the PDF page grows with it. Each question is drawn as a normal field (`cellField`), so labels, required marks, validation, green borders, and PDF drawing are shared.
- `file`: input area is a dashed box with an upload icon, the allowed types, and the size limit. After a file is chosen it shows the file name, size, and a remove button. Rejects wrong types and oversize files with a message.
- `radio` and `checkbox`: input area is a vertical list of options, **32px per row**. When `options` or font size changes, **recompute `height`** automatically (`labelHeight + 6 + options.length * 32`). A single "I agree" checkbox is a field with one option.
- Minimum sizes: width 80, height = label + 6 + 32 for single-box fields. For radio/checkbox the height is always computed from the row count (32px per row), so it has no separate minimum.

### Defaults for new elements

| Element | Mobile size (w x h) | A4 size (w x h) | Notes |
|---|---|---|---|
| Heading text | 350 x auto | 714 x auto | `role: 'heading'`, DM Sans 700, 28px, ink-900 |
| Body text | 350 x auto | 714 x auto | `role: 'body'`, DM Sans 400, 16px, ink-900 |
| text field | 350 x 72 | 350 x 72 | Label "Short answer" |
| longtext field | 350 x 140 | 714 x 140 | Label "Long answer" |
| dropdown | 350 x 72 | 350 x 72 | Options "Option 1", "Option 2" |
| radio | 350 x 88 | 350 x 88 | 2 options (18 + 6 + 2 x 32) |
| checkbox | 350 x 88 | 350 x 88 | 2 options (18 + 6 + 2 x 32) |
| date | 350 x 72 | 350 x 72 | Label "Date" |
| signature | 350 x 144 | 350 x 144 | Label "Signature" (18 + 6 + 120 minimum box) |
| group | full width x about 276 | full width x about 276 | Label "Family members", questions Name, Relationship, Status; "Add person" |
| file | 350 x 96 | 350 x 96 | Label "Upload a file", images and PDF, 5 MB |
| button | 350 x 48 | 714 x 48 (240 wide in templates) | "Submit", mango fill, ink text, radius 12. Mobile: 80px above the page bottom (page height minus 80 minus 48). A4: at the bottom margin |
| rect shape | 350 x 120 | 714 x 120 | Fill mango-100, no stroke, radius 12 |
| line | 350 x 2 | 714 x 2 | ink-300, solid |
| image | natural ratio, max width 350 | max width 714 | `fit: 'cover'` |

Default field styles: label ink-900 14px 700; input fill `#FFFFFF`, stroke ink-400 (`#A58B6A`) 1px, radius 8, text ink-900 16px (use 16px minimum on mobile so iOS does not zoom on focus).

New elements are placed at the center of the visible viewport (click-to-add) or under the cursor (drag-to-add), then clamped to the page.

### Page presets

| Preset | width | height | autoHeight | margin | Layout grid |
|---|---|---|---|---|---|
| mobile | 390 | 844 (minimum) | true | 20 | 2 columns: x=20 w=350 full, or x=20 w=170 and x=200 w=170 (10px gutter) |
| a4 | 794 | 1123 | false | 40 | 12 columns inside the margin, 6px gutter (columns are exactly 54px, so snap lines stay integers) |

`displayHeight` (derived, not stored):
`autoHeight ? max(page.height, lowestElementBottom + 80) : page.height`. Hidden elements are ignored when finding the lowest bottom.

New doc defaults: `background: '#FFFFFF'`, `outerBackground: '#FFF1D6'` (mango-100), plus one Submit button element. Older drafts without a button (or with the removed `page.submit`) get one when they are loaded; extra buttons are dropped.

---

## 3. Answers (a submission)

```ts
export type Answers = Record<string, string | string[]>;   // key = FieldElement.id
```

| fieldType | Stored as |
|---|---|
| text, longtext, dropdown, radio | `string` |
| date | `string`, ISO `YYYY-MM-DD` |
| checkbox | `string[]` of selected option labels |
| signature | `string`, PNG data URL, max about 60 KB (draw on a 400 x 150 canvas) |
| group | `string`, a JSON list of entries keyed by column id, for example `[{"c1":"Asha","c2":"Mother","c3":"Living"}]`. Empty entries and cells are dropped when a response is stored |
| file | `string`, the file name. The bytes are kept beside the answers in memory in Phase 2 and uploaded to Storage in Phase 3 |

Empty answers are **omitted**, not stored as empty strings. Validate required fields, `email`, `phone` (7 to 15 digits, allow `+ - ( )` and spaces), `number`, and max length (text 200, longtext 2000).

---

## 4. Validation and migration (`src/types/doc.schema.ts`)

- Build a **Zod** schema mirroring the types. Parse on: JSON import, localStorage load, Supabase load.
- If parsing fails: do not crash. Show a toast, keep the raw value in memory for download, and load a blank doc.
- `migrate(raw)`: switch on `raw.version`, upgrade step by step. Version 1 has no migration yet, but keep the function so the pattern exists.
- Limits enforced on load and on add: max **150 elements**, max title 120, image data URL max **1.5 MB**, whole doc max about **4 MB** (Phase 1) or **1.5 MB** (Phase 3, images in Storage).
- Guest persistence (Phase 1) must survive that size. localStorage holds about 5M characters, so a 4 MB doc plus a backup copy can fail. Open decision, see `decisions.md`: store the guest doc in IndexedDB (`idb-keyval`), or keep localStorage and lower the guest limits (doc about 2 MB, images downscaled to 1000px).

---

## 5. Example document (trimmed)

```json
{
  "version": 1,
  "title": "Event registration",
  "page": { "preset": "mobile", "width": 390, "height": 844, "autoHeight": true,
            "background": "#FFFFFF", "outerBackground": "#FFF1D6", "margin": 20 },
  "elements": [
    { "id": "e1", "type": "shape", "name": "Header band", "x": 0, "y": 0, "width": 390, "height": 120,
      "locked": false, "hidden": false, "shape": "rect", "fill": "#FF9F1C", "stroke": null,
      "strokeWidth": 0, "radius": 0, "opacity": 1 },
    { "id": "e2", "type": "text", "name": "Title", "x": 20, "y": 40, "width": 350, "height": 40,
      "locked": false, "hidden": false, "text": "Event registration", "role": "heading", "fontFamily": "poppins",
      "fontSize": 28, "fontWeight": 700, "color": "#2A1805", "align": "left", "lineHeight": 1.3,
      "autoHeight": true }
  ]
}
```

---

## 6. Supabase (Phase 3)

Run in the Supabase SQL editor. Keep the final SQL in `supabase/schema.sql` in the repo.

```sql
create extension if not exists pgcrypto;

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled form' check (char_length(title) <= 120),
  doc jsonb not null check (pg_column_size(doc) < 1500000),          -- the draft the builder autosaves
  published_doc jsonb check (pg_column_size(published_doc) < 1500000), -- snapshot respondents see
  form_rev integer not null default 0,                                 -- +1 on every publish
  published_at timestamptz,
  slug text unique,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forms_owner_idx on public.forms (owner_id, updated_at desc);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  form_rev integer not null,   -- which published snapshot these answers belong to
  answers jsonb not null check (pg_column_size(answers) < 300000),
  created_at timestamptz not null default now()
);
create index responses_form_idx on public.responses (form_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger forms_touch before update on public.forms
  for each row execute function public.touch_updated_at();

alter table public.forms enable row level security;
alter table public.responses enable row level security;

create policy "owner manages own forms" on public.forms
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "anyone reads published forms" on public.forms
  for select to anon, authenticated using (published = true);

create policy "anyone submits to published forms" on public.responses
  for insert to anon, authenticated
  with check (exists (select 1 from public.forms f
    where f.id = form_id and f.published and f.form_rev = responses.form_rev));

create policy "owner reads responses" on public.responses
  for select to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

create policy "owner deletes responses" on public.responses
  for delete to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

-- Image storage
insert into storage.buckets (id, name, public) values ('form-assets', 'form-assets', true)
  on conflict do nothing;
create policy "owners upload own assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete own assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text);
```

Notes:
- **Draft vs published.** The builder autosaves `doc` only. `publish(id)` copies `doc` into `published_doc`, increments `form_rev`, sets `published_at`, and sets `published = true`. The fill page and the public link read `published_doc`, never `doc`, so respondents never see half-edited changes. Respondents and the owner's response views (side panel, per-response PDF) render `published_doc`, and a response stores the `form_rev` it was submitted against. Keeping every past snapshot is out of scope for v1: if the owner republishes after deleting or renaming fields, old answers for removed field ids are shown as "removed field" in the panel and as extra columns in the CSV. The publish dialog shows "Unpublished changes" with a **Republish** button when `doc` differs from `published_doc`.
- **Decided:** there is no public select policy on `forms`. Respondents read a published form through the RPC `get_published_form(slug)`, which returns only `id, title, published_doc, form_rev`, and the response insert policy calls `form_accepts(form_id, form_rev)`. The draft `doc` is never readable by anyone but its owner. The final SQL is `supabase/schema.sql`. There is also a private `response-files` bucket for respondent file uploads (owner can read, anyone can add to a published form).
- Optimistic concurrency: save with `update ... where id = $1 and updated_at = $loadedUpdatedAt` and treat zero rows updated as a conflict. Do not check-then-write.
- Deleting a form must also delete its Storage folder `form-assets/<uid>/<formId>/` (Storage does not cascade).
- The anon key is public by design. **RLS is the security.** Never put the `service_role` key in client code or the repo.
- Asset path: `form-assets/<user id>/<form id>/<nanoid>.<ext>`.
- Slug: `nanoid(8)` from the alphabet `0123456789abcdefghijklmnopqrstuvwxyz`, generated on first publish. On unique violation, retry up to 3 times.
- Unpublishing keeps existing responses but the public URL shows "This form is closed".
- Test every policy: a logged-out user must not be able to read responses or unpublished forms, and user A must not be able to see user B's data (see `qa-checklist.md`).

---

## 7. CSV export rules

- First column `Submitted at` (ISO 8601). Then one column per **field** element in the current `published_doc`, ordered by `y` then `x`, header = label (append ` (2)` for duplicates). Answers whose field id no longer exists go in trailing `(removed field)` columns.
- Checkbox answers joined with `; `. Signature column contains `[signature]`.
- Wrap every cell in quotes and double any inner quote.
- **CSV injection guard:** if a cell starts with `=`, `+`, `-`, `@`, tab or carriage return, prefix it with `'`. Known trade-off: legitimate values such as `+1 555 0100` gain a leading `'`.
- Add a UTF-8 BOM so Excel opens non-ASCII text correctly.
- File name: `<form title slug>-responses-<YYYY-MM-DD>.csv`.
