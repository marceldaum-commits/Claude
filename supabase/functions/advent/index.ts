// Nachtfalter – „Advent of Hacking" (Supabase Edge Function „advent").
// 24 Türchen ab 1. Dezember, jedes mit eigenem Thema (Titel + lehrreiche Einleitung).
// STRENG/anti-cheat: JEDES Türchen ist ein Knack-Rätsel mit einer Flag, die PRO KONTO per HMAC erzeugt wird –
// ein geteilter Code nützt niemand anderem. Prüfung serverseitig. Schwierigkeit steigt über den Monat.
// Ein Türchen öffnet frühestens an seinem Tag; verpasste bleiben offen (Nachholen). Punkte, Serie, Bestenliste,
// Advent-Zertifikat bei allen 24. Titel/Themen stammen aus Marcels Entwurf.
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
const xorStr = (s: string, k: number) => [...s].map(c => String.fromCharCode(c.charCodeAt(0) ^ k)).join('');
function base32(s: string): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = '';
  for (let i = 0; i < s.length; i++) bits += s.charCodeAt(i).toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) { let ch = bits.slice(i, i + 5); if (ch.length < 5) ch = ch.padEnd(5, '0'); out += A[parseInt(ch, 2)]; }
  while (out.length % 8) out += '=';
  return out;
}
function caesar(s: string, k: number): string {
  return [...s].map(c => { const u = c.charCodeAt(0);
    if (u >= 65 && u <= 90) return String.fromCharCode((u - 65 + k + 26 * 4) % 26 + 65);
    if (u >= 97 && u <= 122) return String.fromCharCode((u - 97 + k + 26 * 4) % 26 + 97);
    return c; }).join('');
}
const atbash = (s: string) => [...s].map(c => { const u = c.charCodeAt(0);
  if (u >= 65 && u <= 90) return String.fromCharCode(90 - (u - 65));
  if (u >= 97 && u <= 122) return String.fromCharCode(122 - (u - 97));
  return c; }).join('');
function vigenere(s: string, key: string): string {
  let ki = 0;
  return [...s].map(c => { const u = c.charCodeAt(0); const sh = (key.charCodeAt(ki % key.length) | 32) - 97;
    if (u >= 65 && u <= 90) { ki++; return String.fromCharCode((u - 65 + sh) % 26 + 65); }
    if (u >= 97 && u <= 122) { ki++; return String.fromCharCode((u - 97 + sh) % 26 + 97); }
    return c; }).join('');
}

type Tuer = { nr: number; titel: string; szenario: string };
// Titel/Themen (Marcels Entwurf) + lehrreiche Einleitung. Die eigentliche Flag ist pro Konto (siehe flagAufgabe).
const TUEREN: Tuer[] = [
  { nr: 1, titel: 'Dein erster Befehl: whoami', szenario: 'Jeder Start im Terminal: `whoami` zeigt, als wer du angemeldet bist. Zum Aufwärmen – dekodiere deine persönliche Flag.' },
  { nr: 2, titel: 'Finde die versteckte Datei', szenario: 'Versteckte Dateien zeigt `ls -a`. Deine Flag ist „versteckt" – mach sie sichtbar.' },
  { nr: 3, titel: 'Knacke das Passwort-Rätsel', szenario: 'Schwache Passwörter fallen schnell. Knack diese einfache Verschiebung zu deiner Flag.' },
  { nr: 4, titel: 'Die geheime Nachricht im Bild', szenario: 'In Bildern lassen sich Daten verstecken (Steganographie). Hol deine Flag aus der Kodierung.' },
  { nr: 5, titel: 'Wie Geräte sich „pingen"', szenario: 'Mit `ping` fragst du „bist du da?". Deine Flag kommt „zurück" – lies sie richtig herum.' },
  { nr: 6, titel: 'Nikolaus: die Caesar-Geheimschrift', szenario: 'Der Nikolaus nutzt die uralte Caesar-Chiffre. Entschlüssle sie zu deiner Flag.' },
  { nr: 7, titel: 'Geheimnisse im Quelltext', szenario: 'Im Seiten-Quelltext (F12) stecken manchmal Geheimnisse. Deins ist verpackt – pack es aus.' },
  { nr: 8, titel: 'Was ein Cookie verrät', szenario: 'Ein `HttpOnly`-Cookie ist vor JavaScript geschützt. Deine Flag ist gespiegelt – spiegle sie zurück.' },
  { nr: 9, titel: 'Dreh den Hash zurück', szenario: 'Echte Hashes sind Einbahnstraßen – diese Flag ist aber nur verdreht. Dreh sie zurück.' },
  { nr: 10, titel: 'Wer darf was? Dateirechte', szenario: 'Rechte wie `700` steuern, wer was darf. Deine Flag ist doppelt verpackt.' },
  { nr: 11, titel: 'Welche Tür steht offen? Ports', szenario: 'Dienste lauschen auf Ports (HTTPS = 443). Deine Flag ist mit XOR gesichert.' },
  { nr: 12, titel: 'Spurensuche im Netz (OSINT)', szenario: 'OSINT heißt: Infos aus offenen Quellen sammeln. Sammle deine Flag aus dieser Spur.' },
  { nr: 13, titel: 'Halbzeit: die Bestenliste', szenario: 'Halbzeit – ein kleines Geschenk. Deine Flag ist schnell eingelöst.' },
  { nr: 14, titel: 'Entschlüssle den Base64-Code', szenario: 'Der Klassiker: Base64. Dekodiere deine Flag.' },
  { nr: 15, titel: 'Trick die Datenbank aus (SQL)', szenario: 'SQL-Injection bricht Abfragen mit einem `\'` auf. Deine Flag steckt in einer Kodierung.' },
  { nr: 16, titel: 'Finde die verdächtige Log-Zeile', szenario: 'Im Log verrät sich der Angreifer. Deck deine Flag auf.' },
  { nr: 17, titel: 'Erkenne die Phishing-Falle', szenario: 'Phishing tarnt sich (paypa1 statt paypal). Auch deine Flag ist getarnt – zwei Schritte.' },
  { nr: 18, titel: 'Trick die KI aus (Prompt Injection)', szenario: 'Prompt Injection schiebt der KI versteckte Befehle unter. Deine Flag ist doppelt verschleiert.' },
  { nr: 19, titel: 'Wie sicher ist dein WLAN?', szenario: 'Sicheres WLAN nutzt WPA3. Deine Flag ist doppelt gesichert.' },
  { nr: 20, titel: 'Blick unter die Haube (Reverse)', szenario: 'Reverse Engineering heißt rückwärts verstehen. Deine Flag passt dazu.' },
  { nr: 21, titel: 'Was Metadaten verraten', szenario: 'Fotos verraten per Metadaten (GPS) den Ort. Deine Flag ist mit einem Schlüsselwort verschlüsselt.' },
  { nr: 22, titel: 'Vom User zum Admin (PrivEsc)', szenario: 'Ziel jeder Rechteausweitung: `root`. Deine Flag ist zweifach gesichert.' },
  { nr: 23, titel: 'Die große Challenge', szenario: 'Die große Challenge: zwei Schichten übereinander. Schäl dich durch.' },
  { nr: 24, titel: 'Finale + dein Advent-Zertifikat', szenario: 'Großes Finale! Drei Schichten bis zum Advent-Zertifikat. 🎄' },
];
const TMAP: Record<number, Tuer> = Object.fromEntries(TUEREN.map(t => [t.nr, t]));

// Baut Aufgabe (kodierter String) + Hinweis für ein Türchen. Schwierigkeit steigt. Hinweis beschreibt das ENTschlüsseln.
function flagAufgabe(nr: number, flag: string, seed: string): { aufgabe: string; hinweis: string } {
  const b = (n: number) => parseInt(seed.slice(n, n + 2), 16);
  const VIGKEYS = ['NACHTFALTER', 'KELLER', 'FUNKTURM', 'SPIEGEL', 'KATZE', 'KODEWORT'];
  switch (nr) {
    case 1: return { aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren (z. B. `base64 -d`).' };
    case 2: return { aufgabe: toHex(flag), hinweis: 'Hex zurück in Text (`echo … | xxd -r -p`).' };
    case 3: return { aufgabe: caesar(flag, 13), hinweis: 'ROT13: Buchstaben um 13 Stellen zurückdrehen.' };
    case 4: return { aufgabe: base32(flag), hinweis: 'Base32 dekodieren (Alphabet A–Z und 2–7).' };
    case 5: return { aufgabe: rev(flag), hinweis: 'Die Zeichenkette ist nur umgedreht – rückwärts lesen.' };
    case 6: { const k = (b(0) % 25) + 1; return { aufgabe: caesar(flag, k), hinweis: `Caesar: Buchstaben um ${k} Stellen zurückdrehen (Zahlen bleiben).` }; }
    case 7: return { aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren.' };
    case 8: return { aufgabe: atbash(flag), hinweis: 'Atbash: A↔Z spiegeln (nochmal Atbash entschlüsselt).' };
    case 9: return { aufgabe: rev(flag), hinweis: 'Umgedreht – rückwärts lesen.' };
    case 10: return { aufgabe: btoa(btoa(flag)), hinweis: 'Zweimal hintereinander Base64 dekodieren.' };
    case 11: { const k = (b(2) % 254) + 1; return { aufgabe: toHex(xorStr(flag, k)), hinweis: `Erst Hex → Bytes, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 12: return { aufgabe: toHex(flag), hinweis: 'Hex zurück in Text.' };
    case 13: return { aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren.' };
    case 14: return { aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren.' };
    case 15: return { aufgabe: base32(flag), hinweis: 'Base32 dekodieren (A–Z, 2–7).' };
    case 16: { const k = (b(4) % 254) + 1; return { aufgabe: toHex(xorStr(flag, k)), hinweis: `Erst Hex → Bytes, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 17: return { aufgabe: btoa(caesar(flag, 13)), hinweis: 'Erst Base64 dekodieren, dann mit ROT13 zurückdrehen.' };
    case 18: return { aufgabe: btoa(atbash(flag)), hinweis: 'Erst Base64 dekodieren, dann Atbash anwenden.' };
    case 19: return { aufgabe: btoa(btoa(flag)), hinweis: 'Zweimal hintereinander Base64 dekodieren.' };
    case 20: return { aufgabe: btoa(rev(flag)), hinweis: 'Erst Base64 dekodieren, dann die Zeichen umdrehen.' };
    case 21: { const key = VIGKEYS[b(6) % VIGKEYS.length]; return { aufgabe: vigenere(flag, key), hinweis: `Vigenère mit Schlüssel „${key}" entschlüsseln (nur Buchstaben).` }; }
    case 22: { const k = (b(8) % 254) + 1; return { aufgabe: btoa(xorStr(flag, k)), hinweis: `Erst Base64 dekodieren, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 23: return { aufgabe: toHex(btoa(flag)), hinweis: 'Erst Hex → Text, dann das Ergebnis Base64 dekodieren.' };
    case 24: return { aufgabe: toHex(btoa(caesar(flag, 13))), hinweis: 'Drei Schichten: erst Hex → Text, dann Base64, dann ROT13.' };
    default: return { aufgabe: btoa(flag), hinweis: 'Base64 dekodieren.' };
  }
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '');

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
      const e: any = { nr: t, titel: def.titel, art: 'flag', offen, geloest: done };
      if (offen && !done) {
        e.szenario = def.szenario;
        const flag = await flagFor(uid, t);
        const seed = await seedFor(uid, t);
        const fa = flagAufgabe(t, flag, seed);
        e.aufgabe = fa.aufgabe; e.hinweis = fa.hinweis;
      }
      tueren.push(e);
    }
    return antwort(o, 200, { jahr: ADVENT_JAHR, heute: heuteStr(), tueren, anzahl: st.anzahl, komplett: st.komplett, punkte: st.punkte, streak: st.streak, bestenliste: await bestenliste() });
  }

  if (aktion === 'loesen') {
    const nr = parseInt(b?.nr, 10);
    if (!(nr >= 1 && nr <= 24)) return antwort(o, 400, { fehler: 'Ungültiges Türchen.' });
    if (!tuerOffen(nr)) return antwort(o, 403, { fehler: 'Dieses Türchen ist noch nicht offen.' });
    const richtig = norm(b?.versuch) === norm(await flagFor(uid, nr));
    if (!richtig) return antwort(o, 200, { ok: false });
    await db.from('advent_fortschritt').upsert({ user_id: uid, tuer: nr }, { onConflict: 'user_id,tuer', ignoreDuplicates: true });
    const st = await standFor(uid);
    return antwort(o, 200, { ok: true, nr, punkte: st.punkte, streak: st.streak, anzahl: st.anzahl, komplett: st.komplett });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
