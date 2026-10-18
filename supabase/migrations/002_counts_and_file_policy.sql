-- Run this once in the Supabase SQL editor if you created the database before these were added.
-- (A fresh database made from schema.sql already has them.)

create or replace function public.my_response_counts()
returns table (form_id uuid, total bigint)
language sql security invoker stable as $$
  select r.form_id, count(*) from public.responses r group by r.form_id
$$;
grant execute on function public.my_response_counts() to authenticated;

create or replace function public.form_is_published(p_form text)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.forms f where f.id::text = p_form and f.published)
$$;
revoke all on function public.form_is_published(text) from public;
grant execute on function public.form_is_published(text) to anon, authenticated;

drop policy if exists "respondents upload files to published forms" on storage.objects;
create policy "respondents upload files to published forms" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'response-files'
    and public.form_is_published((storage.foldername(name))[1])
  );
