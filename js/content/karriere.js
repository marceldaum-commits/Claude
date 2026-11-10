// Karriere-Pfade („roter Faden"): ziel-orientierte Rollen-Bündel aus bestehenden Räumen/Modulen.
// Jeder Pfad gibt ein klares WOHIN + Abschluss-Zertifikat. Fortschritt wird client-seitig berechnet
// (roomDone, KI-Zähler via kiLlm, Browser-Labs via uebung('info')) – siehe views.karriere in main.js.
// Schritt-Typen:
//   { raum:'p7' }            – ein App-Raum gelöst (roomDone)
//   { ki:'service', n:4 }    – KI-Modul: mind. n gelöst (bosse|service|labs) bzw. ki:'verteidigung' (Prüfer abgewehrt)
//   { web:'login' }          – Web-Lab-Station gelöst (login|daten|xss)
//   { forensik:true }        – Forensik-Lab komplett (alle 3 Spuren)
// `titel` (Schritt) und `ziel`/`titel` (Pfad) laufen in der UI über U()/ui.json → EN-Übersetzung.

export const KARRIERE = [
  {
    id: 'pentester', icon: '🎯', farbe: 'red',
    titel: 'Junior Penetration Tester',
    kurz: 'Der klassische Angriffs-Weg',
    ziel: 'Vom ersten Befehl bis zum kompletten Angriff: Linux-Grundlagen, Aufklärung, Web-Lücken, Passwörter, Exploitation und Active Directory – der Weg eines Pentesters.',
    zert: 'Junior Penetration Tester',
    schritte: [
      { raum: 'r0', titel: 'Linux-Grundlagen: erste Spuren' },
      { raum: 'w2', titel: 'Dateien & Rechte: der Kellerserver' },
      { raum: 'r2', titel: 'Aufklärung: Ports & Dienste' },
      { raum: 'r3', titel: 'Schwachstelle finden: Leck im Dev-Server' },
      { raum: 'h1', titel: 'Web-Aufklärung: Was die Webseite verrät' },
      { raum: 'p6', titel: 'Passwörter: Der Passwort-Tresor' },
      { raum: 'p7', titel: 'Schwachstellen bewerten: Sprechstunde' },
      { raum: 'p7b', titel: 'Exploitation: Der Exploit-Checkup' },
      { raum: 'p8', titel: 'Active Directory: Das Firmennetz' },
      { raum: 'p10', titel: 'Abschlussprüfung: alles zusammen' },
    ],
  },
  {
    id: 'soc', icon: '🛡️', farbe: 'blue',
    titel: 'SOC Analyst (Blue Team L1)',
    kurz: 'Die Verteidiger-Seite',
    ziel: 'Angriffe erkennen, analysieren und abwehren: Asset-Inventar, Sicherheits-Audit, Passwort-Angriffe verstehen, Log-Forensik, Patch-Priorisierung und Active-Directory-Erkennung.',
    zert: 'SOC Analyst – Level 1',
    schritte: [
      { raum: 'n1', titel: 'Überblick: Inventur bei den Stadtwerken' },
      { raum: 'p5', titel: 'Sicherheits-Audit im Rechenzentrum' },
      { raum: 'p6b', titel: 'Passwort-Angriffe verstehen: Das Knack-Labor' },
      { forensik: true, titel: 'Log-Forensik: den Einbruch nachweisen', href: '#/forensik' },
      { raum: 'p7b', titel: 'Richtig priorisieren: Der Exploit-Checkup' },
      { raum: 'p8b', titel: 'Erkennung im AD: Active Directory unter der Lupe' },
    ],
  },
  {
    id: 'kiredteam', icon: '🤖', farbe: 'violet',
    titel: 'KI-Red-Teamer',
    kurz: 'Euer Spezialgebiet: KI-Sicherheit',
    ziel: 'KI-Systeme angreifen und verteidigen – das Feld, das kaum jemand lehrt: Service-Bots austricksen, die Boss-Leiter bezwingen, fortgeschrittene KI-Labs und die eigene Abwehr gegen einen echten Prüfer.',
    zert: 'KI-Red-Teamer',
    schritte: [
      { ki: 'service', n: 1, titel: 'Ersten Service-Bot austricksen', href: '#/kiservice' },
      { ki: 'service', n: 4, titel: 'Alle vier Service-Bots knacken', href: '#/kiservice' },
      { ki: 'bosse', n: 3, titel: 'Boss-Leiter: drei Bots bezwingen', href: '#/kibosse' },
      { ki: 'labs', n: 2, titel: 'Beide KI-Labs lösen (Dokument & Agent)', href: '#/kilabs' },
      { ki: 'verteidigung', titel: 'Den scharfen Prüfer abwehren', href: '#/kiverteidigung' },
    ],
  },
  {
    id: 'web', icon: '🕸️', farbe: 'teal',
    titel: 'Web Application Hacker',
    kurz: 'Fokus Web-Sicherheit',
    ziel: 'Die häufigsten Lücken in Web-Apps gezielt üben: Aufklärung, Login-Bypass per SQL-Injection, Daten auslesen per UNION und Code einschleusen per XSS.',
    zert: 'Web Application Hacker',
    schritte: [
      { raum: 'h1', titel: 'Web-Aufklärung: Was die Webseite verrät' },
      { web: 'login', titel: 'Login umgehen (SQL-Injection)', href: '#/weblab' },
      { web: 'daten', titel: 'Daten auslesen (UNION-SQLi)', href: '#/weblab' },
      { web: 'xss', titel: 'Code einschleusen (XSS)', href: '#/weblab' },
      { raum: 'j1', titel: 'Juice Shop – erste Schritte' },
    ],
  },
];
