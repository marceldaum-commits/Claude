-- Kali Level Up – Supabase-Schema für die geräteübergreifende Synchronisierung
-- Im Supabase-Dashboard: SQL Editor → New query → diesen Inhalt einfügen → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: Jede Person sieht und ändert NUR ihre eigene Zeile.
alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_insert_own" on public.progress;
drop policy if exists "progress_update_own" on public.progress;

create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);

create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kein DELETE-Policy: Der Lernstand kann über die App nicht gelöscht werden (Schutz vor Verlust).
