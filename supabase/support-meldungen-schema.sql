-- Nachtfalter – Support/Problem-Meldungen (Supabase-Projekt „nachtfalter-konto“, Ref sxapebxzxmathkvtuuvn)
-- Quelle der „Problem melden“-Funktion. Dokumentiert den Spalten-Vertrag, auf den der Code baut.
-- Geschrieben wird ausschließlich serverseitig (service_role umgeht RLS):
--   - Edge Function „melden“ legt neue Meldungen an (auch anonym, user_id null).
--   - Edge Function „admin“ liest sie in der Zentrale und setzt erledigt.
--   - Arena-Server (meldungenMailen) mailt offene Meldungen ans Team und setzt gemeldet_am.
-- RLS ist aktiv OHNE Policies => weder anon noch authenticated kommen direkt an die Tabelle.
--
-- erledigt    : von der Verwaltung in der Zentrale abgehakt. false = steht noch offen.
-- gemeldet_am : Zeitpunkt des E-Mail-Versands durch den Arena-Server (null = noch nicht gemailt).

create table if not exists public.support_meldungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  bereich text not null default 'Sonstiges',
  text text not null,
  kontakt text,
  kontext jsonb not null default '{}'::jsonb,
  erledigt boolean not null default false,
  gemeldet_am timestamptz,
  erstellt timestamptz not null default now()
);

-- Zentrale: offene zuerst; Arena-Mailer: schnell die noch nicht gemailten finden.
create index if not exists support_meldungen_offen_idx on public.support_meldungen (erledigt, erstellt desc);
create index if not exists support_meldungen_ungemailt_idx on public.support_meldungen (gemeldet_am) where gemeldet_am is null;

alter table public.support_meldungen enable row level security;
revoke all on public.support_meldungen from anon, authenticated;
