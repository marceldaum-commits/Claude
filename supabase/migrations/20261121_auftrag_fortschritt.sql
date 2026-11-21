-- „Der Auftrag" (Engagement-Engine): Fortschritt/Report pro Konto+Stufe.
-- Nur die Edge-Function `auftrag` (Service-Rolle) greift zu – RLS an, keine öffentlichen Policies (Anti-Cheat).
create table if not exists public.auftrag_fortschritt (
  user_id uuid not null references auth.users(id) on delete cascade,
  stufe int not null,
  versuch int not null default 1,
  geloest jsonb not null default '[]'::jsonb,
  brief text,
  report text,
  abgeschlossen boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, stufe)
);
alter table public.auftrag_fortschritt enable row level security;
