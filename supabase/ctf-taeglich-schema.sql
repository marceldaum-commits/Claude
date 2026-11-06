-- Nachtfalter – „CTF des Tages“ (Edge Function „taeglich“). Hält fest, wer welche Tagesaufgabe gelöst hat.
-- Daraus werden Punkte (gelöste Aufgaben × 10), Streak (Tage in Folge) und Bestenliste berechnet.
-- Nur der Dienst (service_role) greift zu – keine Policies, anon/authenticated haben KEINEN Zugriff.

create table if not exists public.ctf_taeglich (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag date not null,
  nr smallint not null check (nr in (0, 1)),
  geloest_am timestamptz not null default now(),
  primary key (user_id, tag, nr)
);
alter table public.ctf_taeglich enable row level security;
revoke all on public.ctf_taeglich from anon, authenticated;
create index if not exists ctf_taeglich_user_idx on public.ctf_taeglich (user_id);
