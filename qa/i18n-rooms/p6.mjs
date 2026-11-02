// Steckbrief p6 – Der Passwort-Tresor (makeLadder, gelöst über floors[].solve)
// Keine verpackten Dateien. Hash-Listen, Wortliste (sha256 über Salt+Wort), Passwortlisten (awk length),
// E-Mail-Listen und der Quellcode unter projekt/ sind Daten → nie anfassen.
const DATA = ['hashes.txt', 'ohne-kennung.txt', 'alte-db.txt', 'test-passwoerter.txt', 'woerter.txt', 'neue-db.txt', 'mitarbeiter.txt', 'leak.txt', 'bcrypt.txt'];
export default {
  decode() { return null; },
  special(name, data, T, path = '') {
    if (DATA.includes(name) || path.includes('/projekt/')) return data;
    return null; // befunde/*.txt, hinweis.txt, LIESMICH, ZIEL: zeilenweise
  },
};
