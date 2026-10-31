# Synchronisierung einrichten (Supabase)

Damit dein Lernstand automatisch zwischen PC und Handy synchronisiert, braucht die App einen kleinen
Datenbank-Dienst. Wir nutzen **Supabase** (kostenloser Plan reicht). Dauer: ca. 10 Minuten.

Bis das eingerichtet ist, läuft die App **rein lokal**. Du verlierst nichts – Lernstand per
*Mehr → Daten → Lernstand sichern/importieren* zwischen Geräten übertragen.

## 1. Projekt anlegen

1. Auf <https://supabase.com> ein Konto anlegen und anmelden.
2. **New project** → Name z. B. `kali-level-up`, ein starkes Datenbank-Passwort vergeben
   (im Passwortmanager speichern – die App braucht es nicht), Region **Frankfurt (eu-central-1)**.
3. Warten, bis das Projekt bereit ist.

## 2. Tabelle und Zugriffsregeln anlegen

1. Links **SQL Editor** → **New query**.
2. Den kompletten Inhalt von [`supabase/schema.sql`](../supabase/schema.sql) einfügen → **Run**.
3. Ergebnis: Tabelle `progress` mit *Row Level Security* – jedes Konto sieht nur seine eigene Zeile.

## 3. Anmeldung konfigurieren

1. **Authentication → Sign In / Providers → Email**: aktiviert lassen.
2. Für den Anfang **„Confirm email“ aktiviert lassen** – du bekommst nach der Registrierung eine
   Bestätigungsmail.
3. **Authentication → URL Configuration → Site URL**: die Adresse, unter der die App läuft
   (z. B. `https://deine-app.example`).

## 4. Zugangsdaten in die App eintragen

1. **Project Settings → API** (bzw. *Data API*): kopiere
   - **Project URL** (z. B. `https://abcd1234.supabase.co`)
   - **anon / public key** (bzw. *publishable key*)
2. In `config.js` eintragen:

   ```js
   window.KLY_CONFIG = {
     supabaseUrl: 'https://abcd1234.supabase.co',
     supabaseAnonKey: 'eyJ...'
   };
   ```

> ⚠️ **Nur den anon/public-Key** eintragen. Der ist für das Frontend gedacht und durch die
> Row-Level-Security-Regeln geschützt. Den **service_role**-Key **niemals** in die App, in Git
> oder in Exporte schreiben.

## 5. Konto anlegen und absichern

1. App öffnen → **Mehr → Synchronisierung** → E-Mail + Passwort → **Konto anlegen**.
2. Bestätigungsmail öffnen, dann in der App **Anmelden**.
3. Auf dem zweiten Gerät mit denselben Daten anmelden.
4. **Danach Registrierungen sperren** (es soll nur dein Konto geben):
   *Authentication → Sign In / Providers → „Allow new users to sign up“* **ausschalten**.

## Wie wird synchronisiert?

- Beim Start, nach jeder Änderung (kurz verzögert) und wenn das Gerät wieder online ist.
- **Konservatives Zusammenführen:** Erledigtes bleibt erledigt, Archiv und Belege werden vereinigt,
  Story-Fortschritt nimmt den weitesten Stand.
- **Prüfungen** gelten nur als bestanden, wenn ein vollständiger, nachrechenbarer Prüfungsversuch
  vorliegt (≥ 85 % und alle Pflichtaufgaben). Ein älterer oder unvollständiger Stand kann eine
  Prüfung nicht „bestanden“ setzen.
- Vor jedem Zusammenführen legt die App lokal eine Sicherung an (*Mehr → Daten → Lokale Sicherungen*).

## Fehlersuche

| Meldung | Ursache / Lösung |
|---|---|
| „Sync nicht eingerichtet“ | `config.js` ist leer. Schritt 4. |
| „Invalid login credentials“ | Falsches Passwort oder E-Mail noch nicht bestätigt. |
| „relation "progress" does not exist“ | Schritt 2 (SQL) fehlt. |
| „new row violates row-level security policy“ | Policies aus `schema.sql` fehlen oder sind verändert. |
| „Sync nicht erreichbar (offline?)“ | Keine Verbindung – lokal weiterarbeiten, wird nachgeholt. |
