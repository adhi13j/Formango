// Security check against the real Supabase project (task 3.8). Run: node scripts/rls-check.mjs
// It signs up two throwaway users, tries things each of them must NOT be able to do, and prints a table.
// Needs .env.local with the URL and publishable key. Never uses a service_role key.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
const stamp = Date.now().toString(36);
const password = `Test-${stamp}-pass`;

async function signUp(label) {
  const c = client();
  const email = `formango.${label}.${stamp}@gmail.com`;
  const { data, error } = await c.auth.signUp({ email, password });
  if (error || !data.session) throw new Error(`sign up failed for ${label}: ${error?.message ?? 'no session (is "Confirm email" off?)'}`);
  return { c, id: data.user.id };
}

const doc = {
  version: 1, title: 'RLS test',
  page: { preset: 'mobile', width: 390, height: 844, autoHeight: true, background: '#FFFFFF', outerBackground: '#FFF1D6', margin: 20 },
  elements: [],
};

const a = await signUp('a');
const b = await signUp('b');
const anon = client();

// --- A creates two forms: one to publish, one to keep private ---
const { data: pub } = await a.c.from('forms').insert({ title: 'Public', doc }).select('id,updated_at').single();
const { data: priv } = await a.c.from('forms').insert({ title: 'Private', doc }).select('id').single();
const slug = `t${stamp}`.slice(0, 8);
await a.c.from('forms').update({ published_doc: doc, form_rev: 1, published: true, slug }).eq('id', pub.id);

// --- logged out ---
let r = await anon.from('forms').select('id');
check('logged out cannot list forms', !r.error && r.data.length === 0);
r = await anon.from('responses').select('id');
check('logged out cannot list responses', !r.error && r.data.length === 0);
r = await anon.rpc('get_published_form', { p_slug: slug });
check('anyone can read a published form through the RPC (no draft column)', !r.error && r.data.length === 1 && !('doc' in r.data[0]));
r = await anon.from('forms').insert({ title: 'x', doc });
check('logged out cannot create forms', Boolean(r.error));

// --- responses ---
r = await anon.from('responses').insert({ form_id: pub.id, form_rev: 1, answers: { a: 'hello' } });
check('anon can submit to a published form', !r.error, r.error?.message);
r = await anon.from('responses').insert({ form_id: pub.id, form_rev: 99, answers: { a: 'wrong revision' } });
check('anon cannot submit to the wrong revision', Boolean(r.error));
r = await anon.from('responses').insert({ form_id: priv.id, form_rev: 0, answers: { a: 'private' } });
check('anon cannot submit to an unpublished form', Boolean(r.error));
r = await anon.from('responses').insert({ form_id: pub.id, form_rev: 1, answers: { big: 'x'.repeat(320000) } });
check('oversized answers are rejected', Boolean(r.error));
r = await anon.from('responses').insert({ form_id: pub.id, form_rev: 1, answers: { a: 'read me?' } }).select();
check('anon cannot read back what it inserted', Boolean(r.error) || !r.data || r.data.length === 0);

// --- owner and other user ---
r = await a.c.from('responses').select('id').eq('form_id', pub.id);
check('owner reads own responses', !r.error && r.data.length >= 1, `rows ${r.data?.length}`);
r = await b.c.from('forms').select('id');
check('user B sees none of user A forms', !r.error && r.data.length === 0);
r = await b.c.from('responses').select('id').eq('form_id', pub.id);
check('user B cannot read user A responses', !r.error && r.data.length === 0);
r = await b.c.from('forms').update({ title: 'hacked' }).eq('id', pub.id).select();
check('user B cannot edit user A forms', !r.error && r.data.length === 0);
r = await b.c.from('forms').delete().eq('id', priv.id).select();
check('user B cannot delete user A forms', !r.error && r.data.length === 0);
const rows = await b.c.from('responses').select('id').eq('form_id', pub.id);
r = await b.c.from('responses').delete().eq('form_id', pub.id).select();
check('user B cannot delete user A responses', !r.error && r.data.length === 0 && rows.data.length === 0);
r = await anon.from('forms').update({ title: 'anon' }).eq('id', pub.id).select();
check('logged out cannot edit forms', !r.error && r.data.length === 0);
r = await a.c.from('forms').insert({ title: 'steal', doc, owner_id: b.id }).select();
check('a user cannot create a form owned by someone else', Boolean(r.error) || r.data.length === 0);

// --- storage ---
const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
r = await a.c.storage.from('form-assets').upload(`${a.id}/${pub.id}/t.png`, png);
check('owner can upload an image into their folder', !r.error, r.error?.message);
r = await b.c.storage.from('form-assets').upload(`${a.id}/${pub.id}/evil.png`, png);
check("user B cannot upload into user A's folder", Boolean(r.error));
r = await anon.storage.from('form-assets').upload(`${a.id}/${pub.id}/evil2.png`, png);
check('logged out cannot upload images', Boolean(r.error));
r = await anon.storage.from('response-files').upload(`${pub.id}/resp1/f1`, png);
check('anon can attach a file to a published form', !r.error, r.error?.message);
r = await anon.storage.from('response-files').upload(`${priv.id}/resp1/f1`, png);
check('anon cannot attach a file to an unpublished form', Boolean(r.error));
r = await anon.storage.from('response-files').download(`${pub.id}/resp1/f1`);
check('anon cannot read response files', Boolean(r.error));
r = await b.c.storage.from('response-files').download(`${pub.id}/resp1/f1`);
check('user B cannot read user A response files', Boolean(r.error));
r = await a.c.storage.from('response-files').download(`${pub.id}/resp1/f1`);
check('the owner can read response files', !r.error, r.error?.message);

// --- close the form ---
await a.c.from('forms').update({ published: false }).eq('id', pub.id);
r = await anon.rpc('get_published_form', { p_slug: slug });
check('a closed form is not readable', !r.error && r.data.length === 0);
r = await anon.from('responses').insert({ form_id: pub.id, form_rev: 1, answers: { a: 'late' } });
check('a closed form takes no answers', Boolean(r.error));

// --- clean up what we can ---
await a.c.storage.from('form-assets').remove([`${a.id}/${pub.id}/t.png`]);
await a.c.storage.from('response-files').remove([`${pub.id}/resp1/f1`]);
await a.c.from('forms').delete().in('id', [pub.id, priv.id]);

const width = Math.max(...results.map((x) => x.name.length));
for (const x of results) console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.name.padEnd(width)}  ${x.detail}`);
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
