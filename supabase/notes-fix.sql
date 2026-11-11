-- Добавка к notes.sql: разрешить перезаписывать картинки. Вставьте в SQL Editor → Run.
drop policy if exists "frames read" on storage.objects;
create policy "frames read" on storage.objects for select to authenticated using (bucket_id = 'frames');
