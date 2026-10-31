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
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "progress_insert_own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "progress_update_own" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Nicht angemeldete Zugriffe bekommen nichts; Löschen ist gar nicht erlaubt (Schutz vor Verlust).
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;
revoke delete, truncate, references, trigger on public.progress from authenticated;
