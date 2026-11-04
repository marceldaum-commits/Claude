-- Nachtfalter-Konto (Supabase-Projekt „nachtfalter-konto“, Ref sxapebxzxmathkvtuuvn, Region eu-central-1/Frankfurt)
-- Angewendet als Migration „konto_grundschema“ am 03.11.2026. Getrennt vom Lernstand-Sync (supabase/schema.sql).
--
-- profiles      : ein Profil pro Konto, wird bei Registrierung automatisch angelegt.
--                 Nutzer dürfen nur display_name und lang ändern; Alter/Eltern-Einwilligung setzt der Dienst.
-- entitlements  : Zugänge (arena | ki | alles) mit Ablaufdatum. Schreiben nur Dienste mit service_role
--                 (Zahlungs-Webhook, Admin). Nutzer sehen nur ihre eigenen Zeilen.
--                 ki_budget_usd = optionales Monatsbudget für die KI-Werkstatt (null = Standard des Dienstes).
-- Aktiver Zugang prüfen (Dienst):  produkt in ('ki','alles') and gueltig_bis > now()

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 30),
  lang text not null default 'de' check (lang in ('de','en','uk')),
  birth_year int check (birth_year between 1900 and 2100),
  parent_consent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "eigenes Profil lesen" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "eigenes Profil ändern" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  produkt text not null check (produkt in ('arena','ki','alles')),
  gueltig_bis timestamptz not null,
  quelle text not null check (quelle in ('beta','kauf','geschenk')),
  ki_budget_usd numeric(8,2) check (ki_budget_usd is null or ki_budget_usd >= 0),
  notiz text,
  created_at timestamptz not null default now()
);
create index entitlements_user_idx on public.entitlements (user_id, produkt, gueltig_bis);
alter table public.entitlements enable row level security;
create policy "eigene Zugänge lesen" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke all on public.profiles from anon;
revoke all on public.entitlements from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, lang) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, lang)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'display_name', ''), 30),
          case when new.raw_user_meta_data->>'lang' in ('de','en','uk') then new.raw_user_meta_data->>'lang' else 'de' end);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Migration „konto_registrierung_alter“ (03.11.2026): Geburtsjahr und Eltern-Erklärung aus der Registrierung
-- (raw_user_meta_data) übernehmen. Danach nicht mehr durch den Nutzer änderbar (nur display_name/lang).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  jahr int := case when (new.raw_user_meta_data->>'birth_year') ~ '^\d{4}$' then (new.raw_user_meta_data->>'birth_year')::int end;
begin
  if jahr is not null and (jahr < 1900 or jahr > extract(year from now())::int) then jahr := null; end if;
  insert into public.profiles (id, display_name, lang, birth_year, parent_consent)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'display_name', ''), 30),
          case when new.raw_user_meta_data->>'lang' in ('de','en','uk') then new.raw_user_meta_data->>'lang' else 'de' end,
          jahr,
          coalesce(new.raw_user_meta_data->>'parent_consent', '') = 'true');
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Migrationen „konto_fortschritt_einladungen_admin“ und „konto_einloesen_bremse“ (04.11.2026):
-- progress (Fortschritt am Konto, RLS nur eigene Zeile), profiles.freigeschaltet/gesperrt/last_seen,
-- admins (ohne Policies, nur Dienst), invites + invite_redemptions + invite_fails (ohne Policies, nur Dienst),
-- RPC einloesen(p_code) (security definer: max. 10 Fehlversuche/Stunde, schaltet frei, vergibt ggf. Zugang),
-- RPC mein_status() (freigeschaltet/gesperrt/admin des aufrufenden Kontos).
-- Verwaltung: Edge Function supabase/functions/admin (prüft Token beim Auth-Server + Admin-Rolle).
-- Volltext der Migrationen: Supabase → Database → Migrations.
