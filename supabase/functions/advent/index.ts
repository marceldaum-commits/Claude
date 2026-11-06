// Nachtfalter – „Advent of Hacking" (Supabase Edge Function „advent").
// 24 Türchen ab 1. Dezember, jedes mit eigenem Thema. Zwei Aufgaben-Arten:
//   art 'flag'    – ein Knack-Rätsel; die Flag ist PRO KONTO per HMAC erzeugt (anti-cheat), serverseitig geprüft.
//   art 'antwort' – eine Wissens-/Skill-Frage; akzeptierte Antworten liegen serverseitig (für alle gleich).
// Ein Türchen öffnet frühestens an seinem Tag; verpasste bleiben offen (Nachholen). Punkte, Serie, Bestenliste,
// und das Advent-Zertifikat bei allen 24. Titel/Themen stammen aus Marcels Entwurf.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CTF_SECRET = Deno.env.get('CTF_SECRET') || SERVICE;
const ADVENT_JAHR = parseInt(Deno.env.get('ADVENT_JAHR') || '2026', 10);
const ADVENT_TEST = (Deno.env.get('ADVENT_TEST') || '') === '1'; // nur zum Testen: alle Türchen offen
const PUNKTE_PRO = 20;
const BONUS_KOMPLETT = 120;
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// ---- Krypto
async function hmacHex(msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(CTF_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const flagFor = async (uid: string, tuer: number) => 'KLY{' + (await hmacHex(`${uid}:adventflag:${ADVENT_JAHR}:${tuer}`)).slice(0, 16) + '}';
const seedFor = (uid: string, tuer: number) => hmacHex(`${uid}:adventseed:${ADVENT_JAHR}:${tuer}`);

// ---- Kodierer (ASCII)
const toHex = (s: string) => [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const rev = (s: string) => s.split('').reverse().join('');
function caesar(s: string, k: number): string {
  return [...s].map(c => { const u = c.charCodeAt(0);
    if (u >= 65 && u <= 90) return String.fromCharCode((u - 65 + k + 26 * 4) % 26 + 65);
    if (u >= 97 && u <= 122) return String.fromCharCode((u - 97 + k + 26 * 4) % 26 + 97);
    return c; }).join('');
}

type Tuer = { nr: number; titel: string; art: 'flag' | 'antwort'; szenario?: string; hinweis?: string; loesungen?: string[] };

// Titel/Themen (Marcels Entwurf). Für 'antwort' stehen Frage (szenario), Hinweis und akzeptierte Antworten hier.
const TUEREN: Tuer[] = [
  { nr: 1, titel: 'Dein erster Befehl: whoami', art: 'antwort',
    szenario: 'In jedem Terminal fängst du so an. Du willst wissen, als welcher Benutzer du gerade angemeldet bist – welcher Linux-Befehl zeigt dir das?',
    hinweis: 'Ein einzelnes Wort, „wer bin ich" auf Englisch, zusammengeschrieben.', loesungen: ['whoami'] },
  { nr: 2, titel: 'Finde die versteckte Datei', art: 'antwort',
    szenario: 'Versteckte Dateien tauchen bei „ls" nicht auf. Mit welchem Schalter zeigt „ls" auch die versteckten Dateien an?',
    hinweis: 'Ein Buchstabe mit Bindestrich – „a" wie all.', loesungen: ['-a', 'a', 'ls -a', 'ls-a'] },
  { nr: 3, titel: 'Knacke das Passwort-Rätsel', art: 'antwort',
    szenario: 'Angreifer probieren zuerst die häufigsten Passwörter. Welches Zahlen-Passwort steht in fast jeder Leak-Liste auf Platz 1?',
    hinweis: 'Sechs Ziffern, der Reihe nach von der Tastatur.', loesungen: ['123456'] },
  { nr: 4, titel: 'Die geheime Nachricht im Bild', art: 'antwort',
    szenario: 'Man kann Daten unsichtbar in Bildern verstecken. Wie heißt diese Technik (Fachwort)?',
    hinweis: 'Beginnt mit „Stegano…".', loesungen: ['steganographie', 'steganografie', 'steganography', 'stego'] },
  { nr: 5, titel: 'Wie Geräte sich „pingen"', art: 'antwort',
    szenario: 'Du willst prüfen, ob ein anderes Gerät im Netzwerk erreichbar ist. Welcher Befehl schickt ein kleines „Bist du da?"-Paket?',
    hinweis: 'Vier Buchstaben, kommt vom Sonar.', loesungen: ['ping'] },
  { nr: 6, titel: 'Nikolaus: die Caesar-Geheimschrift', art: 'flag',
    szenario: 'Der Nikolaus nutzt eine uralte Verschiebe-Chiffre (Caesar). Entschlüssle die Nachricht zur Flag.' },
  { nr: 7, titel: 'Geheimnisse im Quelltext', art: 'antwort',
    szenario: 'Entwickler vergessen manchmal Hinweise im Seiten-Quelltext. Mit welcher Taste öffnest du die Entwickler-Werkzeuge im Browser?',
    hinweis: 'Eine F-Taste ganz oben.', loesungen: ['f12'] },
  { nr: 8, titel: 'Was ein Cookie verrät', art: 'antwort',
    szenario: 'Ein Cookie kann vor Diebstahl per JavaScript geschützt werden. Welches Attribut sorgt dafür, dass JavaScript ein Cookie NICHT lesen kann?',
    hinweis: 'Zwei Wörter zusammen: „Http…".', loesungen: ['httponly', 'http-only', 'http only'] },
  { nr: 9, titel: 'Dreh den Hash zurück', art: 'flag',
    szenario: 'Jemand hat die Flag einfach verdreht. Dreh sie zurück.' },
  { nr: 10, titel: 'Wer darf was? Dateirechte', art: 'antwort',
    szenario: 'Rechte schreibt man oft als drei Ziffern. Welche dreistellige Zahl gibt NUR dem Besitzer volle Rechte (lesen, schreiben, ausführen) und allen anderen nichts?',
    hinweis: 'rwx = 7, für „Gruppe" und „andere" jeweils 0.', loesungen: ['700'] },
  { nr: 11, titel: 'Welche Tür steht offen? Ports', art: 'antwort',
    szenario: 'Dienste lauschen auf „Ports" (Türen). Auf welchem Standard-Port läuft verschlüsseltes Web (HTTPS)?',
    hinweis: 'Drei Ziffern, direkt nach 442.', loesungen: ['443'] },
  { nr: 12, titel: 'Spurensuche im Netz (OSINT)', art: 'antwort',
    szenario: 'Das Sammeln von Infos aus frei zugänglichen Quellen hat eine bekannte Abkürzung (5 Buchstaben). Wie lautet sie?',
    hinweis: 'Open Source … Intelligence.', loesungen: ['osint'] },
  { nr: 13, titel: 'Halbzeit: die Bestenliste', art: 'flag',
    szenario: 'Halbzeit – ein kleines Geschenk. Dekodiere den Hex-Code zu deiner Flag.' },
  { nr: 14, titel: 'Entschlüssle den Base64-Code', art: 'flag',
    szenario: 'Der Klassiker: ein Base64-Code. Dekodiere ihn zur Flag.' },
  { nr: 15, titel: 'Trick die Datenbank aus (SQL)', art: 'antwort',
    szenario: 'Bei SQL-Injection bricht man eine Datenbank-Abfrage mit EINEM Zeichen auf. Welches einzelne Zeichen ist der Klassiker?',
    hinweis: 'Das Hochkomma / einfache Anführungszeichen.', loesungen: ["'", 'hochkomma', 'apostroph', 'single quote', "' or 1=1--", "' or 1=1"] },
  { nr: 16, titel: 'Finde die verdächtige Log-Zeile', art: 'antwort',
    szenario: 'Im Server-Log fallen fehlgeschlagene Logins auf, dann ein erfolgreicher. Welche IP ist der Angreifer?\n\n10.0.0.5  OK     (mara, 09:00)\n203.0.113.66  FAILED ×50 (09:12–09:18)\n203.0.113.66  OK     (backup, 09:19)',
    hinweis: 'Die IP mit 50 Fehlversuchen direkt vor dem Erfolg.', loesungen: ['203.0.113.66'] },
  { nr: 17, titel: 'Erkenne die Phishing-Falle', art: 'antwort',
    szenario: 'Eine Mail zeigt zwei Links. Welche Domain ist die FÄLSCHUNG?\n\n(a) paypal.com\n(b) paypa1.com',
    hinweis: 'Schau genau: eine „1" (Eins) statt einem „l" (kleines L).', loesungen: ['paypa1.com', 'b', 'paypa1', '(b)'] },
  { nr: 18, titel: 'Trick die KI aus (Prompt Injection)', art: 'antwort',
    szenario: 'Einer KI versteckte Anweisungen unterschieben, damit sie ihre Regeln bricht – wie heißt dieser Angriff (zwei Wörter, Fachbegriff)?',
    hinweis: 'Prompt … (Einschleusen).', loesungen: ['prompt injection', 'promptinjection'] },
  { nr: 19, titel: 'Wie sicher ist dein WLAN?', art: 'antwort',
    szenario: 'Welcher WLAN-Verschlüsselungsstandard ist aktuell der sicherste (Nachfolger von WPA2)?',
    hinweis: 'WPA… die nächste Zahl.', loesungen: ['wpa3', 'wpa 3'] },
  { nr: 20, titel: 'Blick unter die Haube (Reverse)', art: 'antwort',
    szenario: 'Ein Programm zerlegen, um zu verstehen, wie es innen arbeitet – wie heißt diese Disziplin (zwei Wörter, Englisch)?',
    hinweis: 'Reverse … (die Technik „rückwärts").', loesungen: ['reverse engineering', 'reverseengineering'] },
  { nr: 21, titel: 'Was Metadaten verraten', art: 'antwort',
    szenario: 'Fotos speichern oft versteckt den Aufnahmeort. Welche drei Buchstaben stehen für diese Ortsdaten?',
    hinweis: 'Satelliten-Navigation.', loesungen: ['gps'] },
  { nr: 22, titel: 'Vom User zum Admin (PrivEsc)', art: 'antwort',
    szenario: 'Das Ziel jeder Rechteausweitung unter Linux: wie heißt der allmächtige Administrator-Benutzer?',
    hinweis: 'Vier Buchstaben, „Wurzel" auf Englisch.', loesungen: ['root'] },
  { nr: 23, titel: 'Die große Challenge', art: 'flag',
    szenario: 'Die große Challenge: zwei Schichten übereinander. Schäl dich durch.' },
  { nr: 24, titel: 'Finale + dein Advent-Zertifikat', art: 'flag',
    szenario: 'Großes Finale! Drei Schichten trennen dich von deinem Advent-Zertifikat. 🎄' },
];
const TMAP: Record<number, Tuer> = Object.fromEntries(TUEREN.map(t => [t.nr, t]));

// Baut Aufgabe (kodierter String) + Hinweis für ein 'flag'-Türchen.
function flagAufgabe(nr: number, flag: string, seed: string): { aufgabe: string; hinweis: string } {
  const b = (n: number) => parseInt(seed.slice(n, n + 2), 16);
  switch (nr) {
    case 6: { const k = (b(0) % 25) + 1; return { aufgabe: caesar(flag, k), hinweis: `Caesar: Buchstaben um ${k} Stellen zurückdrehen (Zahlen bleiben).` }; }
    case 9: return { aufgabe: rev(flag), hinweis: 'Die Zeichenkette ist nur umgedreht – rückwärts lesen.' };
    case 13: return { aufgabe: toHex(flag), hinweis: 'Hex zurück in Text (z. B. `echo … | xxd -r -p`).' };
    case 14: return { aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren (z. B. `base64 -d`).' };
    case 23: return { aufgabe: btoa(caesar(flag, 13)), hinweis: 'Erst Base64 dekodieren, dann das Ergebnis mit ROT13 zurückdrehen.' };
    case 24: return { aufgabe: toHex(btoa(caesar(flag, 13))), hinweis: 'Drei Schichten: erst Hex → Text, dann Base64, dann ROT13.' };
    default: return { aufgabe: btoa(flag), hinweis: 'Base64 dekodieren.' };
  }
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// ---- Datum (UTC)
const heuteStr = () => new Date().toISOString().slice(0, 10);
function tuerOffen(tuer: number): boolean {
  if (ADVENT_TEST) return true;
  const start = new Date(Date.UTC(ADVENT_JAHR, 11, tuer, 0, 0, 0)); // Monat 11 = Dezember
  return Date.now() >= start.getTime();
}
function streakAus(tueren: number[]): number {
  const set = new Set(tueren); let s = 0;
  for (let d = 1; d <= 24; d++) { if (set.has(d)) s++; else break; }
  return s;
}
async function standFor(uid: string) {
  const { data } = await db.from('advent_fortschritt').select('tuer').eq('user_id', uid);
  const tueren = (data || []).map((r: any) => r.tuer);
  const anzahl = tueren.length, komplett = anzahl >= 24;
  return { geloest: tueren.sort((a: number, b: number) => a - b), anzahl, komplett, streak: streakAus(tueren), punkte: anzahl * PUNKTE_PRO + (komplett ? BONUS_KOMPLETT : 0) };
}
async function bestenliste() {
  const { data } = await db.from('advent_fortschritt').select('user_id');
  const zahl: Record<string, number> = {};
  for (const r of (data || []) as any[]) zahl[r.user_id] = (zahl[r.user_id] || 0) + 1;
  const top = Object.entries(zahl).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ids = top.map(([id]) => id);
  const namen: Record<string, string> = {};
  if (ids.length) {
    const { data: ps } = await db.from('profiles').select('id, display_name').in('id', ids);
    for (const p of (ps || []) as any[]) namen[p.id] = p.display_name || '';
  }
  return top.map(([id, n], i) => ({ platz: i + 1, name: namen[id] || 'Anonym', punkte: (n as number) * PUNKTE_PRO }));
}

Deno.serve(async (req) => {
  const o = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== 'POST') return antwort(o, 405, { fehler: 'Nur POST' });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return antwort(o, 401, { fehler: 'Bitte anmelden.' });
  const { data: u, error } = await db.auth.getUser(jwt);
  if (error || !u?.user) return antwort(o, 401, { fehler: 'Deine Anmeldung ist abgelaufen – bitte neu anmelden.' });
  const uid = u.user.id;
  let b: any; try { b = await req.json(); } catch { return antwort(o, 400, { fehler: 'Ungültige Anfrage' }); }
  const aktion = String(b?.aktion || '');

  if (aktion === 'info') {
    const st = await standFor(uid);
    const geloest = new Set(st.geloest);
    const tueren = [];
    for (let t = 1; t <= 24; t++) {
      const def = TMAP[t];
      const offen = tuerOffen(t), done = geloest.has(t);
      const e: any = { nr: t, titel: def.titel, art: def.art, offen, geloest: done };
      if (offen && !done) {
        e.szenario = def.szenario || '';
        if (def.art === 'flag') {
          const flag = await flagFor(uid, t);
          const seed = await seedFor(uid, t);
          const fa = flagAufgabe(t, flag, seed);
          e.aufgabe = fa.aufgabe; e.hinweis = fa.hinweis;
        } else {
          e.hinweis = def.hinweis || '';
        }
      }
      tueren.push(e);
    }
    return antwort(o, 200, { jahr: ADVENT_JAHR, heute: heuteStr(), tueren, anzahl: st.anzahl, komplett: st.komplett, punkte: st.punkte, streak: st.streak, bestenliste: await bestenliste() });
  }

  if (aktion === 'loesen') {
    const nr = parseInt(b?.nr, 10);
    if (!(nr >= 1 && nr <= 24)) return antwort(o, 400, { fehler: 'Ungültiges Türchen.' });
    if (!tuerOffen(nr)) return antwort(o, 403, { fehler: 'Dieses Türchen ist noch nicht offen.' });
    const def = TMAP[nr];
    let richtig = false;
    if (def.art === 'flag') {
      richtig = norm(b?.versuch) === (await flagFor(uid, nr)).toLowerCase();
    } else {
      const v = norm(b?.versuch);
      richtig = (def.loesungen || []).some(l => norm(l) === v);
    }
    if (!richtig) return antwort(o, 200, { ok: false });
    await db.from('advent_fortschritt').upsert({ user_id: uid, tuer: nr }, { onConflict: 'user_id,tuer', ignoreDuplicates: true });
    const st = await standFor(uid);
    return antwort(o, 200, { ok: true, nr, punkte: st.punkte, streak: st.streak, anzahl: st.anzahl, komplett: st.komplett });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
