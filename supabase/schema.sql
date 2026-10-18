-- Formango database. Run this whole file once in the Supabase SQL editor (Dashboard > SQL editor).
-- Safe to read: nothing here contains secrets. Row Level Security protects every table.

create extension if not exists pgcrypto;

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled form' check (char_length(title) <= 120),
  doc jsonb not null check (pg_column_size(doc) < 1500000),            -- the draft the builder autosaves
  published_doc jsonb check (pg_column_size(published_doc) < 1500000), -- the snapshot respondents see
  form_rev integer not null default 0,                                  -- +1 on every publish
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

-- Owners do everything with their own forms. Nobody else can read a form row, so the private
-- draft (`doc`) is never exposed. Respondents get the published snapshot through get_published_form.
create policy "owner manages own forms" on public.forms
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Public reading of a published form: only the fields a respondent needs, never the draft.
create or replace function public.get_published_form(p_slug text)
returns table (id uuid, title text, published_doc jsonb, form_rev integer)
language sql security definer set search_path = public stable as $$
  select f.id, f.title, f.published_doc, f.form_rev
  from public.forms f
  where f.slug = p_slug and f.published and f.published_doc is not null
$$;
revoke all on function public.get_published_form(text) from public;
grant execute on function public.get_published_form(text) to anon, authenticated;

-- Used by the insert policy: does this form currently accept answers for this snapshot?
create or replace function public.form_accepts(p_form uuid, p_rev integer)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.forms f where f.id = p_form and f.published and f.form_rev = p_rev
  )
$$;
revoke all on function public.form_accepts(uuid, integer) from public;
grant execute on function public.form_accepts(uuid, integer) to anon, authenticated;

create policy "anyone submits to published forms" on public.responses
  for insert to anon, authenticated
  with check (public.form_accepts(form_id, form_rev));

create policy "owner reads responses" on public.responses
  for select to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

create policy "owner deletes responses" on public.responses
  for delete to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

-- Images used in designs. Public to read (they appear on public forms), writable only by the owner
-- inside their own folder: form-assets/<user id>/<form id>/<file>
insert into storage.buckets (id, name, public) values ('form-assets', 'form-assets', true)
  on conflict do nothing;
create policy "owners upload own assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete own assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- Files respondents upload through file fields. Private: only the form owner can read them.
-- Path: response-files/<form id>/<response id>/<file>. 25 MB limit per file.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('response-files', 'response-files', false, 26214400)
  on conflict do nothing;
create policy "respondents upload files to published forms" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.forms f
      where f.id::text = (storage.foldername(name))[1] and f.published
    )
  );
create policy "owners read response files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.forms f
      where f.id::text = (storage.foldername(name))[1] and f.owner_id = auth.uid()
    )
  );

-- Response counts for the "My forms" page, in one query. Runs with the caller's rights, so Row
-- Level Security still applies: you only count responses of your own forms.
create or replace function public.my_response_counts()
returns table (form_id uuid, total bigint)
language sql security invoker stable as $$
  select r.form_id, count(*) from public.responses r group by r.form_id
$$;
grant execute on function public.my_response_counts() to authenticated;
