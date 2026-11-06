-- Nachtfalter – Tages-Nutzungszähler für den Premium-KI-Gegner (Edge Function „ki-duell“).
-- Zweck: Kosten/Missbrauch begrenzen. Jeder Chat-Aufruf zählt einen Tagescounter pro Konto hoch;
-- über dem Limit (Standard 300/Tag, per KI_TAGESLIMIT änderbar) wird abgelehnt (429).
-- Nur der Dienst (service_role) greift zu – keine Policies, anon/authenticated haben KEINEN Zugriff.
-- Anwenden nach Marcels OK (Supabase-Migration). Bis dahin fehlt die Tabelle nur, die Edge-Funktion
-- fängt das ab und lässt durch (kein Fehler).

create table if not exists public.ki_nutzung (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag date not null default ((now() at time zone 'utc')::date),
  anzahl integer not null default 0,
  primary key (user_id, tag)
);
alter table public.ki_nutzung enable row level security;
revoke all on public.ki_nutzung from anon, authenticated;

-- Atomar hochzählen und neuen Stand zurückgeben (verhindert Race Conditions beim Limit-Vergleich).
create or replace function public.ki_nutzung_inc(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare neu integer;
begin
  insert into public.ki_nutzung (user_id, tag, anzahl)
    values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, tag) do update set anzahl = public.ki_nutzung.anzahl + 1
  returning anzahl into neu;
  return neu;
end;
$$;
revoke execute on function public.ki_nutzung_inc(uuid) from public, anon, authenticated;

-- Aufräumen alter Tage (optional, hält die Tabelle klein). Kann per Zeitplan laufen; harmlos, wenn nie aufgerufen.
create or replace function public.ki_nutzung_aufraeumen()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ki_nutzung where tag < ((now() at time zone 'utc')::date - 7);
$$;
revoke execute on function public.ki_nutzung_aufraeumen() from public, anon, authenticated;
