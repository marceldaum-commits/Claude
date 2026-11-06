-- Nachtfalter – „Advent of Hacking" (Edge Function „advent"). Hält fest, wer welches Türchen gelöst hat.
-- Daraus werden Punkte (gelöste Türchen × 20, + 120 Bonus bei allen 24), Streak und Bestenliste berechnet.
-- Nur der Dienst (service_role) greift zu – keine Policies, anon/authenticated haben KEINEN Zugriff.

create table if not exists public.advent_fortschritt (
  user_id uuid not null references auth.users(id) on delete cascade,
  tuer smallint not null check (tuer between 1 and 24),
  geloest_am timestamptz not null default now(),
  primary key (user_id, tuer)
);
alter table public.advent_fortschritt enable row level security;
revoke all on public.advent_fortschritt from anon, authenticated;
create index if not exists advent_fortschritt_user_idx on public.advent_fortschritt (user_id);
