-- Таблицы для синхронизации «Конспектів». Вставьте целиком в Supabase → SQL Editor → Run.

-- 1) Отметки и настройки (progress, library) — по одной записи на пользователя и ключ
create table if not exists public.kv (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 2) Очередь ссылок: с телефона добавляем, ноутбук забирает и обрабатывает
create table if not exists public.queue (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  url        text not null,
  kind       text not null default 'add' check (kind in ('add', 'reprocess', 'delete')),
  status     text not null default 'queued' check (status in ('queued', 'processing', 'done', 'error')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Защита: каждый видит и меняет только свои строки
alter table public.kv    enable row level security;
alter table public.queue enable row level security;

drop policy if exists "own kv"    on public.kv;
drop policy if exists "own queue" on public.queue;
create policy "own kv"    on public.kv    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own queue" on public.queue for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Доступ только вошедшим (анонимным — нет)
revoke all on public.kv, public.queue from anon;
grant select, insert, update, delete on public.kv, public.queue to authenticated;
