-- Конспекты в базе (вместо GitHub). Вставьте целиком в Supabase → SQL Editor → Run.
-- Можно запускать повторно — ничего не сломается.

-- 1) Конспекты: одна строка на видео
create table if not exists public.notes (
  id         text primary key,                 -- id видео на YouTube
  item       jsonb not null,                   -- строка для списка (название, обложка, счётчики)
  summary    jsonb not null,                   -- сам конспект
  meta       jsonb not null,                   -- кадры, главы, длительность
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null default now()
);

-- 2) Общие данные сайта (например, «Огляд тем»)
create table if not exists public.site (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Читать могут все (сайт открыт и без входа, как раньше на GitHub), менять — только вошедший
alter table public.notes enable row level security;
alter table public.site  enable row level security;
drop policy if exists "read notes"  on public.notes;
drop policy if exists "write notes" on public.notes;
drop policy if exists "read site"   on public.site;
drop policy if exists "write site"  on public.site;
create policy "read notes"  on public.notes for select to anon, authenticated using (true);
create policy "write notes" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read site"   on public.site  for select to anon, authenticated using (true);
create policy "write site"  on public.site  for all to authenticated using (true) with check (true);
grant select on public.notes, public.site to anon;
grant select, insert, update, delete on public.notes, public.site to authenticated;

-- 3) Хранилище картинок (кадры): открыто для просмотра, загружать — только вошедший
insert into storage.buckets (id, name, public) values ('frames', 'frames', true)
  on conflict (id) do update set public = true;
drop policy if exists "frames upload" on storage.objects;
drop policy if exists "frames update" on storage.objects;
drop policy if exists "frames delete" on storage.objects;
drop policy if exists "frames read" on storage.objects;
create policy "frames upload" on storage.objects for insert to authenticated with check (bucket_id = 'frames');
create policy "frames update" on storage.objects for update to authenticated using (bucket_id = 'frames');
create policy "frames delete" on storage.objects for delete to authenticated using (bucket_id = 'frames');
-- перезапись картинки (upsert) требует ещё и права «читать»
create policy "frames read" on storage.objects for select to authenticated using (bucket_id = 'frames');
