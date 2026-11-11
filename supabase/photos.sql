-- Хранилище для фото конспектов (бакет «photos»), раунд 7.
-- Выполнить один раз в Supabase → SQL Editor. Бакет приватный: каждый видит и грузит только свою папку <id пользователя>/…
-- Существующие таблицы и правила не трогает.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos own insert" on storage.objects;
drop policy if exists "photos own select" on storage.objects;
drop policy if exists "photos own delete" on storage.objects;

create policy "photos own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos own select" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
