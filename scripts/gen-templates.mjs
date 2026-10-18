// Generates src/templates/*.json. Run with: node scripts/gen-templates.mjs && npx prettier --write src/templates
// Templates are plain FormDoc JSON; this script only exists so layouts are easy to tweak by number.
import { writeFileSync } from 'node:fs';

const C = {
  ink: '#2A1805', mango: '#FF9F1C', tangerine: '#F08400', butter: '#FFCF78', cream: '#FFF1D6',
  white: '#FFFFFF', border: '#A58B6A', muted: '#7A5C3A', divider: '#C9B497', guava: '#F2667A',
  berry: '#CF3340', teal: '#1F8A8A', sky: '#3B82C4', violet: '#6D5BD0', leaf: '#4C9A2A',
};

const base = (id, name, x, y, width, height) => ({ id, name, x, y, width, height, locked: false, hidden: false });

const rect = (id, name, x, y, w, h, o = {}) => ({
  ...base(id, name, x, y, w, h), type: 'shape', shape: o.shape ?? 'rect', fill: o.fill ?? null,
  stroke: o.stroke ?? null, strokeWidth: o.strokeWidth ?? 0, radius: o.radius ?? 0, opacity: o.opacity ?? 1,
});
const circle = (id, name, x, y, size, o = {}) => rect(id, name, x, y, size, size, { ...o, shape: 'ellipse' });
const line = (id, name, x, y, w, o = {}) => ({
  ...base(id, name, x, y, w, o.thickness ?? 2), type: 'line', color: o.color ?? C.divider,
  thickness: o.thickness ?? 2, style: o.style ?? 'solid',
});

// Rough height of wrapped text. The app recomputes the exact height when the template loads.
const guessHeight = (t, w, size, lh) => Math.ceil(Math.max(1, Math.ceil((t.length * size * 0.52) / w)) * size * lh);
const text = (id, name, t, x, y, w, o = {}) => {
  const size = o.size ?? 16, lh = o.lh ?? 1.3;
  return {
    ...base(id, name, x, y, w, guessHeight(t, w, size, lh)), type: 'text', text: t, role: o.role ?? 'body',
    fontFamily: o.font ?? 'dm-sans', fontSize: size, fontWeight: o.weight ?? 400, color: o.color ?? C.ink,
    align: o.align ?? 'left', lineHeight: lh, autoHeight: true,
  };
};

const HEIGHTS = { text: 72, date: 72, dropdown: 72, longtext: 140, signature: 144, file: 96 };
const rows = (n) => 24 + 32 * n;
const KIND_LABELS = { image: 'Images', pdf: 'PDF', document: 'Documents', spreadsheet: 'Spreadsheets' };
const fileHint = (o) => `${(o.fileKinds?.length ? o.fileKinds : Object.keys(KIND_LABELS)).map((k) => KIND_LABELS[k]).join(', ')} up to ${o.maxFileMb ?? 5} MB`;
const field = (id, key, fieldType, label, x, y, w, o = {}) => ({
  ...base(id, o.name ?? label, x, y, w, o.height ?? (['radio', 'checkbox'].includes(fieldType) ? rows((o.options ?? []).length) : HEIGHTS[fieldType])),
  type: 'field', fieldType, key, label, placeholder: o.placeholder ?? (fieldType === 'file' ? fileHint(o) : ''), required: o.required ?? false,
  validation: o.validation ?? 'none', options: o.options ?? [],
  fileKinds: o.fileKinds ?? [], maxFileMb: o.maxFileMb ?? 5,
  labelStyle: { fontFamily: o.labelFont ?? 'dm-sans', fontSize: 14, fontWeight: 700, color: o.labelColor ?? C.ink },
  inputStyle: {
    fontFamily: o.inputFont ?? 'dm-sans', fontSize: 16, textColor: o.inputText ?? C.ink, fill: o.inputFill ?? C.white,
    stroke: o.stroke ?? C.border, strokeWidth: o.strokeWidth ?? 1, radius: o.radius ?? 8,
  },
});
const button = (id, label, x, y, w, o = {}) => ({
  ...base(id, 'Submit button', x, y, w, o.height ?? 48), type: 'button', label, fontFamily: o.font ?? 'dm-sans',
  fontSize: 16, fontWeight: 700, textColor: o.text ?? C.ink, fill: o.fill ?? C.mango, radius: o.radius ?? 12,
});

const mobile = (o = {}) => ({
  preset: 'mobile', width: 390, height: 844, autoHeight: true, background: o.background ?? C.white,
  outerBackground: o.outer ?? C.cream, margin: 20,
});
const a4 = (o = {}) => ({
  preset: 'a4', width: 794, height: 1123, autoHeight: false, background: o.background ?? C.white,
  outerBackground: o.outer ?? C.cream, margin: 40,
});
const doc = (title, page, elements) => ({ version: 1, title, page, elements });

// ---------------------------------------------------------------------------------------------
const contact = doc('Contact us', mobile(), [
  rect('c-band', 'Header band', 0, 0, 390, 128, { fill: C.mango }),
  text('c-title', 'Title', 'Contact us', 20, 44, 350, { role: 'heading', font: 'poppins', size: 28, weight: 700 }),
  text('c-intro', 'Intro', 'Questions, ideas, or just saying hello? Send us a note and we will reply within a day.', 20, 152, 350),
  field('c-name', 'name', 'text', 'Your name', 20, 238, 350, { required: true, placeholder: 'Jane Doe', name: 'Name' }),
  field('c-email', 'email', 'text', 'Email', 20, 326, 350, { required: true, validation: 'email', placeholder: 'jane@example.com', name: 'Email' }),
  field('c-message', 'message', 'longtext', 'Message', 20, 414, 350, { required: true, placeholder: 'How can we help?', height: 150, name: 'Message' }),
  button('c-submit', 'Send', 20, 596, 350),
]);

const event = doc('Event registration', mobile(), [
  rect('e-band', 'Header band', 0, 0, 390, 150, { fill: C.mango }),
  text('e-title', 'Title', 'Event registration', 20, 50, 350, { role: 'heading', font: 'poppins', size: 28, weight: 700 }),
  text('e-sub', 'Date and place', 'Saturday 14 March, 10:00. Riverside Hall.', 20, 98, 350, { weight: 700 }),
  field('e-name', 'full-name', 'text', 'Full name', 20, 178, 350, { required: true, name: 'Full name' }),
  field('e-email', 'email', 'text', 'Email', 20, 266, 350, { required: true, validation: 'email', name: 'Email' }),
  field('e-ticket', 'ticket-type', 'radio', 'Ticket type', 20, 354, 350, { required: true, options: ['Standard', 'VIP', 'Student'], name: 'Ticket type' }),
  field('e-diet', 'dietary-needs', 'checkbox', 'Dietary needs', 20, 490, 350, { options: ['Vegetarian', 'Vegan', 'Gluten free', 'Nut allergy'], name: 'Dietary needs' }),
  field('e-sign', 'signature', 'signature', 'Signature', 20, 658, 350, { required: true, name: 'Signature' }),
  button('e-submit', 'Register', 20, 834, 350),
]);

const feedback = doc('Customer feedback', mobile({ outer: '#FCE3E7' }), [
  rect('f-band', 'Header', 0, 0, 390, 196, { fill: C.berry }),
  circle('f-dot1', 'Decoration', 270, 18, 150, { fill: C.guava, opacity: 0.55 }),
  circle('f-dot2', 'Decoration', 290, 120, 70, { fill: C.butter, opacity: 0.8 }),
  text('f-title', 'Title', 'How did we do?', 20, 56, 330, { role: 'heading', font: 'poppins', size: 32, weight: 700, color: C.white }),
  text('f-sub', 'Subtitle', 'Two minutes of your time helps us a lot.', 20, 138, 250, { color: C.white }),
  field('f-rate', 'overall', 'radio', 'Overall, how was your visit?', 20, 232, 350, { required: true, options: ['Loved it', 'It was fine', 'Could be better'], name: 'Rating', stroke: C.berry }),
  field('f-which', 'visit', 'dropdown', 'Which visit was it?', 20, 368, 350, { options: ['Today', 'This week', 'This month', 'Longer ago'], name: 'Visit' }),
  field('f-liked', 'stood-out', 'checkbox', 'What stood out?', 20, 456, 350, { options: ['Friendly staff', 'Speed', 'Value', 'Atmosphere'], name: 'Stood out' }),
  field('f-more', 'comments', 'longtext', 'Anything else?', 20, 616, 350, { placeholder: 'Tell us more (optional)', height: 130, name: 'Comments' }),
  field('f-mail', 'email', 'text', 'Email (if you want a reply)', 20, 770, 350, { validation: 'email', name: 'Email' }),
  button('f-submit', 'Send feedback', 20, 874, 350, { fill: C.berry, text: C.white, font: 'poppins' }),
]);

const darkField = { labelColor: C.cream, inputFill: C.cream, stroke: C.butter, strokeWidth: 0, radius: 12 };
const newsletter = doc('Newsletter sign-up', mobile({ background: C.ink, outer: '#1B1003' }), [
  circle('n-sun', 'Sun', 232, 28, 128, { fill: C.mango }),
  circle('n-moon', 'Small circle', 236, 180, 32, { fill: C.butter, opacity: 0.9 }),
  text('n-tag', 'Tag', 'WEEKLY', 20, 64, 160, { font: 'space-grotesk', size: 14, weight: 700, color: C.mango }),
  text('n-title', 'Title', 'Get the good stuff', 20, 92, 200, { role: 'heading', font: 'playfair', size: 36, weight: 700, color: C.white, lh: 1.15 }),
  text('n-body', 'Intro', 'One short email every Friday: the best things we found this week. No spam, ever.', 20, 204, 350, { color: C.cream }),
  line('n-line', 'Divider', 20, 272, 350, { color: C.muted, thickness: 1 }),
  field('n-name', 'first-name', 'text', 'First name', 20, 300, 350, { name: 'First name', ...darkField }),
  field('n-email', 'email', 'text', 'Email', 20, 388, 350, { required: true, validation: 'email', placeholder: 'you@example.com', name: 'Email', ...darkField }),
  field('n-topics', 'interests', 'checkbox', 'What do you like?', 20, 476, 350, { options: ['Design', 'Code', 'Food', 'Travel'], name: 'Interests', ...darkField, inputText: C.cream, stroke: C.butter, strokeWidth: 1, inputFill: C.ink }),
  button('n-submit', 'Count me in', 20, 656, 350, { radius: 24 }),
  text('n-fine', 'Fine print', 'Unsubscribe with one click, any time.', 20, 720, 350, { size: 13, color: C.butter }),
]);

const wedding = doc('Wedding RSVP', mobile({ background: '#FFFBF3', outer: '#EFE0C4' }), [
  circle('w-ring', 'Ring', 45, 16, 300, { stroke: C.butter, strokeWidth: 3 }),
  text('w-script', 'Script', 'We are getting married!', 20, 100, 350, { font: 'caveat', size: 30, weight: 700, color: C.muted, align: 'center' }),
  text('w-names', 'Names', 'Anna & Marco', 20, 150, 350, { role: 'heading', font: 'playfair', size: 34, weight: 700, align: 'center' }),
  text('w-when', 'Date and place', 'Saturday 6 June · 4 pm\nLakeside Gardens', 20, 222, 350, { font: 'lora', size: 16, align: 'center', color: C.muted }),
  line('w-line', 'Divider', 130, 340, 130, { color: C.butter, thickness: 2 }),
  field('w-name', 'name', 'text', 'Your name', 20, 364, 350, { required: true, name: 'Name', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  field('w-att', 'attending', 'radio', 'Will you join us?', 20, 452, 350, { required: true, options: ['Joyfully accepts', 'Regretfully declines'], name: 'Attending', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  field('w-guests', 'guests', 'dropdown', 'How many guests (including you)?', 20, 548, 350, { options: ['1', '2', '3', '4'], name: 'Guests', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  field('w-diet', 'dietary', 'checkbox', 'Dietary needs', 20, 636, 350, { options: ['Vegetarian', 'Vegan', 'Gluten free'], name: 'Dietary', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  field('w-song', 'song', 'text', 'A song that gets you dancing', 20, 764, 350, { placeholder: 'Optional', name: 'Song', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  field('w-note', 'note', 'longtext', 'A note for the couple', 20, 852, 350, { height: 110, name: 'Note', labelFont: 'lora', inputFont: 'lora', radius: 4 }),
  button('w-submit', 'Send RSVP', 20, 994, 350, { font: 'lora', radius: 24 }),
]);

const support = doc('Support request', mobile({ outer: '#D5ECEC' }), [
  rect('s-band', 'Header', 0, 0, 390, 150, { fill: C.teal }),
  circle('s-dot', 'Decoration', 296, 22, 72, { fill: C.white, opacity: 0.2 }),
  text('s-title', 'Title', 'Support request', 20, 48, 300, { role: 'heading', font: 'space-grotesk', size: 30, weight: 700, color: C.white }),
  text('s-sub', 'Subtitle', 'Tell us what went wrong. We answer within one working day.', 20, 96, 320, { color: C.white, size: 15 }),
  field('s-name', 'name', 'text', 'Name', 20, 180, 350, { required: true, name: 'Name', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  field('s-email', 'email', 'text', 'Email', 20, 268, 350, { required: true, validation: 'email', name: 'Email', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  field('s-cat', 'category', 'radio', 'What is it about?', 20, 356, 350, { required: true, options: ['A bug', 'Billing', 'A question'], name: 'Category', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  field('s-pri', 'priority', 'dropdown', 'How urgent is it?', 20, 492, 350, { options: ['Low', 'Normal', 'High', 'Urgent'], name: 'Priority', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  field('s-desc', 'description', 'longtext', 'What happened?', 20, 580, 350, { required: true, height: 150, name: 'Description', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  field('s-file', 'screenshot', 'file', 'Screenshot or document', 20, 754, 350, { fileKinds: ['image', 'pdf'], maxFileMb: 10, name: 'Attachment', labelFont: 'space-grotesk', inputFont: 'space-grotesk' }),
  button('s-submit', 'Send request', 20, 874, 350, { fill: C.ink, text: C.white, font: 'space-grotesk' }),
]);

const lunch = doc('Lunch order', mobile({ outer: '#FFE3B0' }), [
  rect('l-band', 'Header', 0, 0, 390, 168, { fill: C.mango }),
  circle('l-plate', 'Plate', 240, 24, 130, { fill: C.butter }),
  circle('l-plate2', 'Plate centre', 262, 46, 86, { fill: C.cream }),
  text('l-title', 'Title', 'Lunch order', 20, 52, 220, { role: 'heading', font: 'poppins', size: 32, weight: 700 }),
  text('l-sub', 'Subtitle', 'Orders close at 11:00 sharp.', 20, 104, 220, { weight: 700 }),
  field('l-name', 'name', 'text', 'Name', 20, 200, 350, { required: true, name: 'Name', radius: 12 }),
  field('l-main', 'main', 'radio', 'Pick your main', 20, 288, 350, { required: true, options: ['Burger', 'Falafel wrap', 'Caesar salad', 'Soup of the day'], name: 'Main', radius: 12 }),
  field('l-extra', 'extras', 'checkbox', 'Add extras', 20, 468, 350, { options: ['Fries', 'Drink', 'Cookie', 'Extra sauce'], name: 'Extras', radius: 12 }),
  field('l-time', 'pickup', 'dropdown', 'Pickup time', 20, 636, 350, { required: true, options: ['12:00', '12:30', '13:00', '13:30'], name: 'Pickup time', radius: 12 }),
  field('l-notes', 'notes', 'longtext', 'Notes for the kitchen', 20, 724, 350, { height: 100, name: 'Notes', radius: 12 }),
  button('l-submit', 'Place order', 20, 852, 350, { fill: C.ink, text: C.mango, font: 'poppins', radius: 24 }),
]);

const COL = 345, RIGHT = 409;
const job = doc('Job application', a4({ outer: '#E8DCC4' }), [
  rect('j-head', 'Header', 0, 0, 794, 170, { fill: C.ink }),
  circle('j-sun', 'Decoration', 660, 24, 90, { fill: C.mango }),
  circle('j-sun2', 'Decoration', 624, 96, 36, { fill: C.butter }),
  text('j-title', 'Title', 'Job application', 40, 44, 520, { role: 'heading', font: 'playfair', size: 40, weight: 700, color: C.white, lh: 1.2 }),
  text('j-sub', 'Subtitle', 'Tell us about yourself. We read every application.', 40, 108, 520, { font: 'lora', size: 16, color: C.butter }),
  rect('j-accent', 'Accent', 40, 148, 80, 6, { fill: C.mango, radius: 3 }),
  text('j-s1', 'Section: about you', 'ABOUT YOU', 40, 200, 300, { font: 'space-grotesk', size: 13, weight: 700, color: C.muted }),
  field('j-name', 'full-name', 'text', 'Full name', 40, 226, COL, { required: true, name: 'Full name' }),
  field('j-mail', 'email', 'text', 'Email', RIGHT, 226, COL, { required: true, validation: 'email', name: 'Email' }),
  field('j-phone', 'phone', 'text', 'Phone', 40, 314, COL, { validation: 'phone', name: 'Phone' }),
  field('j-role', 'position', 'dropdown', 'Position', RIGHT, 314, COL, { required: true, options: ['Designer', 'Engineer', 'Product manager', 'Other'], name: 'Position' }),
  field('j-start', 'start-date', 'date', 'Earliest start date', 40, 402, COL, { name: 'Start date' }),
  field('j-pay', 'salary', 'text', 'Expected salary', RIGHT, 402, COL, { validation: 'number', name: 'Salary' }),
  line('j-rule', 'Divider', 40, 502, 714, { thickness: 1 }),
  text('j-s2', 'Section: experience', 'EXPERIENCE', 40, 522, 300, { font: 'space-grotesk', size: 13, weight: 700, color: C.muted }),
  field('j-cover', 'cover-note', 'longtext', 'Why do you want this job?', 40, 548, 714, { required: true, height: 170, name: 'Cover note' }),
  field('j-cv', 'cv', 'file', 'Your CV', 40, 742, COL, { required: true, fileKinds: ['pdf', 'document'], maxFileMb: 5, name: 'CV' }),
  field('j-link', 'portfolio', 'text', 'Portfolio link', RIGHT, 742, COL, { placeholder: 'https://', name: 'Portfolio' }),
  line('j-rule2', 'Divider', 40, 860, 714, { thickness: 1 }),
  field('j-sign', 'signature', 'signature', 'Signature', 40, 884, COL, { required: true, name: 'Signature' }),
  field('j-date', 'date-signed', 'date', 'Date', RIGHT, 884, COL, { required: true, name: 'Date signed' }),
  button('j-submit', 'Submit application', 514, 1035, 240, { font: 'poppins' }),
  text('j-fine', 'Fine print', 'By applying you agree that we may contact you about this role.', 40, 1048, 440, { size: 12, color: C.muted }),
]);


// ---- Insurance proposal information sheet (for a Development Officer to key in) ------------------
const proposal = (() => {
  const els = [];
  const L = 20, W = 350, HALF = 170, R = 200;
  let y = 0;
  const f = (...args) => els.push(field(...args));
  const advance = (h, gap = 16) => { const top = y; y += h + gap; return top; };
  const section = (id, title, hint) => {
    els.push(line(`${id}-rule`, 'Divider', L, advance(2, 14), W, { color: C.divider, thickness: 1 }));
    els.push(text(`${id}-h`, title, title, L, advance(26, hint ? 4 : 14), W, { role: 'heading', font: 'space-grotesk', size: 20, weight: 700 }));
    if (hint) els.push(text(`${id}-t`, `${title} note`, hint, L, advance(guessHeight(hint, W, 14, 1.3), 14), W, { size: 14, color: C.muted }));
  };
  const heightOf = (type, o) => o.height ?? (['radio', 'checkbox'].includes(type) ? rows((o.options ?? []).length) : HEIGHTS[type] ?? 72);
  const one = (id, key, type, label, o = {}) => {
    const h = heightOf(type, o);
    f(id, key, type, label, L, advance(h), W, { labelFont: 'space-grotesk', inputFont: 'space-grotesk', ...o, height: h });
  };
  const pair = (a, b) => {
    const h = Math.max(heightOf(a[2], a[4] ?? {}), heightOf(b[2], b[4] ?? {}));
    const top = advance(h);
    const look = { labelFont: 'space-grotesk', inputFont: 'space-grotesk' };
    f(a[0], a[1], a[2], a[3], L, top, HALF, { ...look, ...a[4], height: heightOf(a[2], a[4] ?? {}) });
    f(b[0], b[1], b[2], b[3], R, top, HALF, { ...look, ...b[4], height: heightOf(b[2], b[4] ?? {}) });
  };

  y = 0;
  els.push(rect('p-band', 'Header band', 0, 0, 390, 196, { fill: C.teal }));
  els.push(circle('p-dot', 'Decoration', 300, 24, 70, { fill: C.white, opacity: 0.18 }));
  els.push(text('p-title', 'Title', 'Insurance proposal: information sheet', L, 40, 300, { role: 'heading', font: 'space-grotesk', size: 26, weight: 700, color: C.white, lh: 1.2 }));
  els.push(text('p-sub', 'Subtitle', 'Give these details to your Development Officer. They will enter them on the ANANDA proposal screens. Nothing here is submitted to an insurer.', L, 118, 340, { size: 14, color: C.white }));
  y = 220;

  section('a', 'Development Officer', 'Filled in by your officer, or leave blank.');
  pair(['a-name', 'do-name', 'text', 'Officer name', { name: 'Officer name' }], ['a-code', 'do-code', 'text', 'Agency code', { name: 'Agency code' }]);

  section('b', '1. Your details', 'Write names exactly as they appear on your ID.');
  one('b-name', 'full-name', 'text', 'Full name', { required: true });
  one('b-father', 'father-or-spouse', 'text', "Father's or spouse's name", { required: true });
  pair(['b-dob', 'dob', 'date', 'Date of birth', { required: true }], ['b-gender', 'marital', 'dropdown', 'Marital status', { options: ['Single', 'Married', 'Widowed', 'Divorced'], required: true }]);
  one('b-sex', 'gender', 'radio', 'Gender', { required: true, options: ['Female', 'Male', 'Other'] });
  pair(['b-mobile', 'mobile', 'text', 'Mobile number', { required: true, validation: 'phone' }], ['b-email', 'email', 'text', 'Email', { validation: 'email' }]);
  one('b-addr', 'address', 'longtext', 'Full postal address', { required: true, height: 110 });
  pair(['b-pin', 'pin-code', 'text', 'PIN code', { required: true, validation: 'number' }], ['b-city', 'city', 'text', 'City or town', { required: true }]);

  section('c', '2. Identity', 'Upload clear photos or scans. Aadhaar, PAN, or passport are usual.');
  pair(['c-pan', 'pan', 'text', 'PAN', { name: 'PAN' }], ['c-aadhaar', 'aadhaar-last-4', 'text', 'Aadhaar (last 4 digits)', { validation: 'number' }]);
  one('c-id', 'id-proof', 'file', 'ID proof', { required: true, fileKinds: ['image', 'pdf'], maxFileMb: 5 });
  one('c-addr', 'address-proof', 'file', 'Address proof', { required: true, fileKinds: ['image', 'pdf'], maxFileMb: 5 });
  one('c-photo', 'photo', 'file', 'Passport-size photo', { required: true, fileKinds: ['image'], maxFileMb: 2 });

  section('d', '3. Work and income');
  pair(['d-job', 'occupation', 'text', 'Occupation', { required: true }], ['d-edu', 'education', 'dropdown', 'Education', { options: ['Below 10th', '10th or 12th', 'Graduate', 'Postgraduate', 'Other'] }]);
  pair(['d-inc', 'annual-income', 'text', 'Yearly income (Rs)', { required: true, validation: 'number' }], ['d-emp', 'employer', 'text', 'Employer or business']);
  one('d-proof', 'income-proof', 'file', 'Income proof (optional)', { fileKinds: ['image', 'pdf', 'spreadsheet'], maxFileMb: 5 });

  section('e', '4. The cover you want');
  one('e-plan', 'plan', 'text', 'Plan name or number (if you know it)', { placeholder: 'Or write "advise me"' });
  pair(['e-sum', 'sum-assured', 'text', 'Cover amount (Rs)', { required: true, validation: 'number' }], ['e-term', 'term-years', 'text', 'Policy term (years)', { validation: 'number' }]);
  one('e-mode', 'premium-mode', 'radio', 'How will you pay?', { required: true, options: ['Yearly', 'Half-yearly', 'Quarterly', 'Monthly'] });
  one('e-existing', 'existing-cover', 'text', 'Existing life policies (insurer and cover)', { placeholder: 'Write "none" if none' });

  section('f', '5. Nominee', 'Who receives the benefit.');
  pair(['f-name', 'nominee-name', 'text', 'Nominee name', { required: true }], ['f-rel', 'nominee-relationship', 'text', 'Relationship', { required: true }]);
  pair(['f-dob', 'nominee-dob', 'date', 'Nominee date of birth', { required: true }], ['f-share', 'nominee-share', 'text', 'Share (%)', { validation: 'number' }]);

  section('g', '6. Health', 'Honest answers keep claims simple later.');
  pair(['g-height', 'height-cm', 'text', 'Height (cm)', { validation: 'number' }], ['g-weight', 'weight-kg', 'text', 'Weight (kg)', { validation: 'number' }]);
  one('g-tob', 'tobacco', 'radio', 'Do you use tobacco or alcohol?', { required: true, options: ['No', 'Tobacco', 'Alcohol', 'Both'] });
  one('g-cond', 'conditions', 'checkbox', 'Any of these now or before?', { options: ['Diabetes', 'High blood pressure', 'Heart condition', 'Cancer', 'Surgery in last 5 years', 'None of these'] });
  one('g-note', 'health-notes', 'longtext', 'Details, medicines, or hospital stays', { height: 100 });

  section('h', '7. Premium payment');
  pair(['h-bank', 'bank-name', 'text', 'Bank name', {}], ['h-ifsc', 'ifsc', 'text', 'IFSC code', {}]);
  one('h-cheque', 'cancelled-cheque', 'file', 'Cancelled cheque or passbook page', { fileKinds: ['image', 'pdf'], maxFileMb: 5 });

  section('i', '8. Your confirmation');
  one('i-ok', 'declaration', 'checkbox', 'Declaration', { required: true, options: ['I confirm these details are true'], height: 56 });
  one('i-sign', 'signature', 'signature', 'Signature', { required: true });
  one('i-date', 'date-signed', 'date', 'Date', { required: true });
  
  els.push(button('p-submit', 'Send to my officer', L, y, W, { fill: C.ink, text: C.white, font: 'space-grotesk' }));
  return doc('Insurance proposal information', mobile({ outer: '#D5ECEC' }), els);
})();

const out = {
  'contact-form': contact,
  'event-registration': event,
  'customer-feedback': feedback,
  'newsletter-signup': newsletter,
  'wedding-rsvp': wedding,
  'support-request': support,
  'lunch-order': lunch,
  'job-application': job,
  'insurance-proposal': proposal,
};
for (const [name, value] of Object.entries(out)) {
  writeFileSync(new URL(`../src/templates/${name}.json`, import.meta.url), JSON.stringify(value, null, 2) + '\n');
}
