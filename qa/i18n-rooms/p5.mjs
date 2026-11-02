// Steckbrief p5 – Audit im Rechenzentrum (makeLadder, gelöst über floors[].solve)
// Keine verpackten Dateien. Systemdatei-Abzüge sind Daten, auf denen awk/grep/sort/diff arbeiten → nie anfassen.
const DATA = ['passwd.txt', 'shadow.txt', 'suid-ist.txt', 'suid-soll.txt', 'sudoers.txt', 'crontab.txt', 'ls-l.txt', 'sshd_config.txt', 'befunde.csv'];
export default {
  decode() { return null; },
  special(name, data) {
    if (DATA.includes(name)) return data;
    return null; // befunde/*.txt, berichte/*.txt, profile-root.txt (nur Kommentarzeile), LIESMICH, ZIEL: zeilenweise
  },
};
