// Tests ohne Abhängigkeiten: node tests/run.mjs
// Prüft: Shell-Engine, Belegprüfung, Merge-Logik, Vollständigkeit der Inhalte und LÖSBARKEIT jeder Sandbox-Aufgabe.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { Shell, baseFS, HOME } from '../js/shell.js';
import { verifyEvidence, scopeCheck, extractTargets } from '../js/verify.js';
import { defaultState, mergeStates, scoreAttempt, examPassed, attemptValid } from '../js/state.js';
import { LEVEL1 } from '../js/content/level1.js';
import { STORY1 } from '../js/content/story1.js';
import { LEVELS } from '../js/content/curriculum.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; console.error('✗', name, '\n  ', e.message); } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} erwartet ${JSON.stringify(b)}, bekam ${JSON.stringify(a)}`); };
const ok = (v, m = 'erwartet true') => { if (!v) throw new Error(m); };
const sh = () => new Shell({ fs: baseFS() });

// ------------------------------------------------ Shell
t('pwd/whoami/cd', () => {
  const s = sh();
  eq(s.exec('pwd').out, HOME + '\n');
  eq(s.exec('whoami').out, 'seppi\n');
  s.exec('mkdir -p a/b/c'); s.exec('cd a/b/c'); eq(s.cwd, HOME + '/a/b/c');
  s.exec('cd ../..'); eq(s.cwd, HOME + '/a');
  s.exec('cd -'); eq(s.cwd, HOME + '/a/b/c');
  s.exec('cd'); eq(s.cwd, HOME);
  ok(s.exec('cd /root').err.includes('Keine Berechtigung'));
});
t('Umleitung > >> und stderr', () => {
  const s = sh();
  s.exec('echo eins > f.txt'); s.exec('echo zwei >> f.txt');
  eq(s.read('f.txt'), 'eins\nzwei\n');
  s.exec('echo neu > f.txt'); eq(s.read('f.txt'), 'neu\n');
  const r = s.exec('ls /root > liste.txt');
  eq(s.read('liste.txt'), ''); ok(r.err.includes('Keine Berechtigung'));
  s.exec('ls /root 2> err.txt'); ok(s.read('err.txt').includes('Keine Berechtigung'));
  eq(s.exec('echo "a $HOME b"').out, `a ${HOME} b\n`);
  eq(s.exec("echo '$HOME'").out, '$HOME\n');
});
t('Pipes, grep, wc, sort, uniq, cut', () => {
  const s = sh();
  s.fs.put(HOME + '/l.txt', 'a x\nb y\na z\nA q\n');
  eq(s.exec('grep a l.txt | wc -l').out, '2\n');
  eq(s.exec('grep -c a l.txt').out, '2\n');
  eq(s.exec('grep -ic a l.txt').out, '3\n');
  eq(s.exec('cut -d" " -f1 l.txt | sort | uniq -c | sort -nr | head -1').out, '      2 a\n');
  eq(s.exec('grep -n z l.txt').out, '3:a z\n');
  eq(s.exec('grep nix l.txt').code, 1);
  eq(s.exec('true && echo ja || echo nein').out, 'ja\n');
  eq(s.exec('false && echo ja || echo nein').out, 'nein\n');
});
t('chmod / ls -l / stat', () => {
  const s = sh();
  s.exec('touch d.txt'); s.exec('chmod 640 d.txt');
  ok(s.exec('ls -l d.txt').out.startsWith('-rw-r----- '));
  s.exec('chmod u+x,o+r d.txt'); eq(s.exec("stat -c '%a %A' d.txt").out, '744 -rwxr--r--\n');
  s.exec('chmod o= d.txt'); eq(s.exec('stat -c %a d.txt').out, '740\n');
  s.exec('chmod 000 d.txt'); ok(s.exec('cat d.txt').err.includes('Keine Berechtigung'));
  ok(s.exec('chmod 600 /etc/hosts').err.includes('nicht erlaubt'));
  ok(s.exec('chmod 9z d.txt').err.includes('ungültiger Modus'));
});
t('find', () => {
  const s = sh();
  s.fs.put(HOME + '/x/a.conf', 'debug=true\n'); s.fs.put(HOME + '/x/b/c.conf', 'q\n'); s.fs.put(HOME + '/x/b/d.txt', 'q\n', 0o666);
  eq(s.exec('find x -type f -name "*.conf"').out, 'x/a.conf\nx/b/c.conf\n');
  eq(s.exec('find x -perm -o=w').out, 'x/b/d.txt\n');
  eq(s.exec('find ~/x -maxdepth 1 -type d').out, HOME + '/x\n' + HOME + '/x/b\n');
  ok(s.exec('grep -rn debug x').out.includes('x/a.conf:1:debug=true'));
});
t('Prozesse, jobs, kill', () => {
  let now = 1000;
  const s = new Shell({ fs: baseFS(), now: () => now });
  ok(/\[1\] \d+/.test(s.exec('sleep 300 &').out));
  ok(s.exec('jobs').out.includes('sleep 300'));
  const ps = s.exec('ps -o pid,ppid,args').out;
  const m = ps.match(/^\s*(\d+)\s+(\d+)\s+sleep 300$/m); ok(m, 'sleep-Zeile');
  eq(+m[2], s.bashPid);
  s.exec('kill %1'); ok(!s.exec('ps').out.includes('sleep'));
  s.exec('sleep 5 &'); now += 6000; ok(!s.exec('ps -ef').out.includes('sleep 5'), 'abgelaufen');
  ok(s.exec('kill 1').err.includes('nicht erlaubt'));
  ok(s.exec(`kill ${s.bashPid}`).err.includes('SANDBOX'));
});
t('curl Sandbox + Scope', () => {
  const s = sh();
  s.web['127.0.0.1:8080'] = { server: 'X', routes: { '/': { status: 200, headers: {}, body: 'hi\n' } } };
  ok(s.exec('curl -I http://127.0.0.1:8080/').out.startsWith('HTTP/1.0 200 OK'));
  eq(s.exec('curl -s http://localhost:8080/').out, 'hi\n');
  ok(s.exec('curl http://127.0.0.1:9999/').err.includes('(7)'));
  ok(s.exec('curl http://example.com/').err.includes('(6)'));
  ok(s.exec('curl http://8.8.8.8/').err.includes('SANDBOX-SCOPE'));
  ok(s.exec('curl -I http://127.0.0.1:8080/nix').out.includes('404'));
});
t('rm Schutz und cp -p', () => {
  const s = sh();
  ok(s.exec('rm -rf ~').err.includes('SANDBOX-SCHUTZ'));
  s.fs.put(HOME + '/k.conf', 'x\n', 0o640);
  s.exec('cp k.conf k1'); s.exec('cp -p k.conf k2');
  eq(s.node('k2').mode & 0o777, 0o640);
  s.exec('mkdir d'); ok(s.exec('cp d e').err.includes('-r nicht angegeben'));
  s.exec('cp *.conf d'); ok(s.node('d/k.conf'));
});

// ------------------------------------------------ Verify
t('Scope-Prüfung', () => {
  ok(scopeCheck('curl -I http://127.0.0.1:8080/').ok);
  ok(scopeCheck('curl http://localhost:8080').ok);
  ok(!scopeCheck('curl http://192.168.1.1').ok);
  ok(!scopeCheck('nmap 10.0.0.0/24').ok);
  ok(!scopeCheck('curl https://example.com').ok);
  eq(extractTargets('ps -o pid,ppid,args'), []);
});
t('Beleg: curl-Header (echt)', () => {
  const e = LEVEL1.exercises.find(x => x.id === 'e1-10r');
  const out = 'HTTP/1.0 200 OK\r\nServer: SimpleHTTP/0.6 Python/3.13.1\r\nDate: x\r\nContent-type: text/html\r\nContent-Length: 30\r\n';
  ok(verifyEvidence(e.real.spec, { command: 'kali@kali:~$ curl -I http://127.0.0.1:8080/', output: out }).ok);
  ok(!verifyEvidence(e.real.spec, { command: 'curl -I http://10.0.0.5:8080/', output: out }).ok);
  ok(!verifyEvidence(e.real.spec, { command: 'curl http://127.0.0.1:8080/', output: out }).ok);
  ok(!verifyEvidence(e.real.spec, { command: 'curl -I http://127.0.0.1:8080/', output: 'curl: (7) Failed' }).ok);
});
t('Beleg: ps PPID-Kette (zsh, Termux)', () => {
  const e = LEVEL1.exercises.find(x => x.id === 'e1-07r');
  const kali = '    PID    PPID COMMAND\n   2210    2201 zsh\n   2290    2210 sleep 300\n   2291    2210 ps -o pid,ppid,args';
  ok(verifyEvidence(e.real.spec, { command: 'sleep 300 & ps -o pid,ppid,args', output: kali }).ok);
  const wrong = '    PID    PPID COMMAND\n   2210    2201 zsh\n   2290    9999 sleep 300';
  ok(!verifyEvidence(e.real.spec, { command: 'sleep 300 &; ps -o pid,ppid,args', output: wrong }).ok);
});
t('Beleg: Token-Suche + Geheimnisfilter', () => {
  const e = LEVEL1.exercises.find(x => x.id === 'e1-08r');
  const out = '/home/kali/kly-lab/suche/neu/conf/dienst.conf:2:lab_token=KLY-ABC123\n/home/kali/kly-lab/suche/tmp/notiz.txt:1:lab_token=NICHT-HIER';
  ok(verifyEvidence(e.real.spec, { command: 'grep -rn lab_token ~/kly-lab/suche', output: out, token: 'KLY-ABC123' }).ok);
  ok(!verifyEvidence(e.real.spec, { command: 'grep -rn lab_token ~/kly-lab/suche', output: out, token: 'KLY-OTHER1' }).ok);
  ok(verifyEvidence(e.real.spec, { command: 'grep -rn x .', output: '-----BEGIN RSA PRIVATE KEY-----' }).secret);
});
t('Beleg: ls -l Rechte, getent, pwd/whoami', () => {
  const r6 = LEVEL1.exercises.find(x => x.id === 'e1-06r');
  ok(verifyEvidence(r6.real.spec, { command: 'chmod 640 notiz.txt; ls -l notiz.txt', output: '-rw-r----- 1 kali kali 22 Oct 31 17:08 notiz.txt' }).ok);
  ok(!verifyEvidence(r6.real.spec, { command: 'ls -l notiz.txt', output: '-rw-rw-rw- 1 kali kali 22 Oct 31 17:08 notiz.txt' }).ok);
  const r11 = LEVEL1.exercises.find(x => x.id === 'e1-11r');
  ok(verifyEvidence(r11.real.spec, { command: 'getent hosts localhost', output: '::1             localhost ip6-localhost ip6-loopback' }).ok);
  ok(verifyEvidence(r11.real.spec, { command: 'cat $PREFIX/etc/hosts', output: '127.0.0.1 localhost\n::1 ip6-localhost' }).ok);
  const r1 = LEVEL1.exercises.find(x => x.id === 'e1-01r');
  ok(verifyEvidence(r1.real.spec, { command: 'pwd; whoami', output: '/home/kali\nkali' }).ok);
  ok(verifyEvidence(r1.real.spec, { command: 'pwd && whoami', output: '/data/data/com.termux/files/home\nu0_a321' }).ok);
});

// ------------------------------------------------ Inhalte: Vollständigkeit
t('Jede Übung hat alle 7 Pflichtelemente', () => {
  for (const e of LEVEL1.exercises) {
    for (const k of ['ziel', 'auftrag', 'scope', 'beleg', 'hinweis']) ok(e[k] && e[k].length > 5, `${e.id}: ${k} fehlt`);
    ok(e.knobel?.q && e.knobel.options.filter(o => o.ok).length === 1, `${e.id}: Knobelfrage braucht genau eine richtige Option`);
    ok(e.knobel.options.filter(o => !o.ok).every(o => o.why), `${e.id}: falsche Optionen brauchen Rückfrage`);
    for (const k of ['beobachtung', 'schluss', 'grenzen', 'naechster']) ok(e.nach?.[k], `${e.id}: Nachbesprechung ${k}`);
    ok(LEVEL1.lessons.some(l => l.id === e.lesson && l.exercises.includes(e.id)), `${e.id}: Lektion verknüpft`);
    if (e.kind === 'real') ok(e.real.spec && e.real.voraus.pc && e.real.voraus.phone && e.real.cleanup, `${e.id}: real unvollständig`);
    else ok(e.sandbox?.setup && e.sandbox?.check, `${e.id}: sandbox unvollständig`);
  }
  for (const l of LEVEL1.lessons) for (const id of l.exercises) ok(LEVEL1.exercises.find(e => e.id === id), `${l.id}: ${id} existiert nicht`);
});
t('Lektionen erklären Zweck, Syntax, Argumente, Wirkung, Fehler, Regel', () => {
  for (const l of LEVEL1.lessons) for (const c of l.concepts) for (const k of ['zweck', 'syntax', 'wirkung', 'regel']) ok(c[k], `${l.id}/${c.name}: ${k}`);
});
t('Unbestandene Sandbox-Übungen melden NICHT bestanden', () => {
  for (const e of LEVEL1.exercises.filter(x => x.sandbox)) {
    const s = sh(); e.sandbox.setup(s);
    ok(!e.sandbox.check(s).ok, `${e.id} gilt ohne Arbeit als bestanden`);
  }
});

// ------------------------------------------------ Lösbarkeit (Musterlösungen)
const SOLUTIONS = {
  'e1-01s': ['pwd', 'whoami'],
  'e1-02s': ['cd ~/lab', 'ls', 'cd archiv/2026/oktober', 'ls'],
  'd1-pfade': ['cd ../../c/d'],
  'e1-03s': ['ls -la ~/lab/fall-01', 'mkdir -p ~/lab/fall-01/notizen ~/lab/fall-01/belege', 'touch ~/lab/fall-01/belege/README', 'ls ~/lab/fall-01/temp.tmp', 'rm ~/lab/fall-01/temp.tmp'],
  'e1-04s': ['cd ~/lab/fall-01/notizen', 'echo "08:00 Alarm eingegangen" > zeitlinie.txt', 'echo "08:05 Scope geklärt" >> zeitlinie.txt', 'echo "08:10 Analyse gestartet" >> zeitlinie.txt'],
  'e1-05s': ['cd ~/lab/config', 'cp -p app.conf app.conf.bak', 'echo "debug=false" >> app.conf'],
  'w1-01': ['cd ~/lab/w1', 'mkdir sicherung', 'cp -p eingang/*.txt sicherung/', 'ls sicherung | wc -l > anzahl.txt', 'mv anzahl.txt sicherung/'],
  'e1-06s': ['cd ~/lab/rechte', 'chmod 640 bericht.txt', 'chmod u+x skript.sh', 'chmod 700 privat'],
  'd1-chmod': ['chmod 400 ~/lab/drill/a.txt', 'chmod 664 ~/lab/drill/b.txt', 'chmod 750 ~/lab/drill/c.sh'],
  'e1-07s': ['ps -o pid,ppid,args', 'kill 3188', 'ps'],
  'e1-08s': ['find ~/lab/sammlung -type f -name "*.conf"', 'grep -l "debug=true" ~/lab/sammlung/web/site.conf ~/lab/sammlung/api/dienst.conf ~/lab/sammlung/db/db.conf > ~/lab/fund.txt'],
  'e1-09s': ['grep "Failed password" ~/lab/logs/auth.log | wc -l > ~/lab/antwort.txt'],
  'd1-pipes': ['grep "Failed password" ~/lab/logs/auth.log | cut -d" " -f11 | sort | uniq -c | sort -nr | head -1', 'echo 10.13.37.21 > ~/lab/top.txt'],
  'e1-10s': ['curl -I http://127.0.0.1:8080/admin', 'echo 403 > ~/lab/status.txt'],
  'e1-11s': ['curl http://intranet.lab.sim:8080/', 'curl http://127.0.0.1:8080/', 'getent hosts intranet.lab.sim', 'grep intranet /etc/hosts > ~/lab/dns-befund.txt'],
  'w1-02': ['find ~/lab/w2 -type f -perm -o=w', 'chmod 640 ~/lab/w2/a/b/token.cfg'],
};
for (const e of LEVEL1.exercises.filter(x => x.sandbox)) {
  t(`Lösbar: ${e.id}`, () => {
    const cmds = SOLUTIONS[e.id]; ok(cmds, 'keine Musterlösung hinterlegt');
    const s = sh(); e.sandbox.setup(s);
    const outs = cmds.map(c => s.exec(c));
    const r = e.sandbox.check(s);
    ok(r.ok, r.msg + ' | Ausgaben: ' + outs.map(o => (o.out + o.err).trim()).join(' / ').slice(0, 400));
  });
}
t('Drill d1-pipes: Feld 11 ist die IP', () => {
  const e = LEVEL1.exercises.find(x => x.id === 'd1-pipes'); const s = sh(); e.sandbox.setup(s);
  eq(s.exec('grep "Failed password" ~/lab/logs/auth.log | cut -d" " -f11 | sort | uniq -c | sort -nr | head -1').out.trim(), '4 10.13.37.21');
});
t('e1-09s: Falle "failed" klein wird nicht mitgezählt', () => {
  const e = LEVEL1.exercises.find(x => x.id === 'e1-09s'); const s = sh(); e.sandbox.setup(s);
  eq(s.exec('grep "Failed password" ~/lab/logs/auth.log | wc -l').out, '6\n');
  eq(s.exec('grep -i "failed password" ~/lab/logs/auth.log | wc -l').out, '7\n');
});

// ------------------------------------------------ Prüfung
const EXAM_SOL = {
  x23: ['chmod 600 ~/pruefung/geheim.txt', 'chmod 700 ~/pruefung/akten'],
  x24: ['grep -c ERROR ~/pruefung/app.log > ~/pruefung/fehler.txt'],
  x25: ['ps -o pid,ppid,args', 'kill 4107'],
};
t('Prüfung: Struktur', () => {
  const ex = LEVEL1.exam;
  ok(ex.items.length >= 20);
  ok(ex.items.filter(i => i.mandatory).length >= 5);
  for (const i of ex.items) {
    if (i.type === 'mc') ok(Number.isInteger(i.answer) && i.options[i.answer], i.id);
    if (i.type === 'input') ok(i.accept.length, i.id);
    if (i.type === 'sandbox') {
      const s = sh(); i.setup(s); ok(!i.check(s), `${i.id} ohne Arbeit bestanden`);
      EXAM_SOL[i.id].forEach(c => s.exec(c)); ok(i.check(s), `${i.id} nicht lösbar`);
    }
    ok(i.topic, `${i.id}: topic`);
  }
});
t('Prüfungsschwelle 85 % + Pflicht', () => {
  const mk = (n, wrong) => Array.from({ length: n }, (_, i) => ({ id: 'q' + i, ok: i >= wrong, mandatory: i === n - 1 }));
  eq(scoreAttempt(mk(25, 3)).passed, true, '22/25=88%');
  eq(scoreAttempt(mk(25, 4)).passed, false, '21/25=84%');
  const one = Array.from({ length: 25 }, (_, i) => ({ id: 'q' + i, ok: i !== 0, mandatory: i === 0 }));
  eq(scoreAttempt(one).passed, false, 'Pflicht falsch');
});

// ------------------------------------------------ Merge
t('Merge: konservativ, nichts geht verloren', () => {
  const a = defaultState(), b = defaultState();
  a.lessons.l1 = { doneAt: 5 }; b.lessons.l2 = { doneAt: 7 };
  a.exercises.e1 = { attempts: 3, passedAt: 100, lastAt: 100 }; b.exercises.e1 = { attempts: 5, lastAt: 200 };
  a.archive.e1 = 50; b.archive.e2 = 60;
  const items = Array.from({ length: 20 }, (_, i) => ({ id: 'x' + i, ok: true, mandatory: i < 3 }));
  const good = { id: 'g', at: 1, items, ...(() => { const r = scoreAttempt(items); return { score: r.score, passed: r.passed }; })() };
  const forged = { id: 'f', at: 2, items: items.map(i => ({ ...i, ok: false })), score: 1, passed: true };
  b.exams.L1 = { attempts: [forged] };
  const m1 = mergeStates(a, b);
  ok(m1.lessons.l1 && m1.lessons.l2);
  eq(m1.exercises.e1.passedAt, 100); eq(m1.exercises.e1.attempts, 5);
  ok(m1.archive.e1 && m1.archive.e2);
  ok(!examPassed(m1, 'L1'), 'gefälschter Versuch darf nicht bestehen');
  eq(m1.exams.L1.attempts.length, 0);
  a.exams.L1 = { attempts: [good] };
  const m2 = mergeStates(b, a);
  ok(examPassed(m2, 'L1')); ok(attemptValid(good));
  ok(examPassed(mergeStates(m2, defaultState()), 'L1'), 'bestanden bleibt bestanden');
  eq(m2.labToken, [a.labToken, b.labToken].sort()[0]);
});
t('Merge: Story weitester Stand', () => {
  const a = defaultState(), b = defaultState();
  a.story.s1 = { scene: 2, evidence: { sz2: { command: 'x' } }, attempts: { sz2: 1 } };
  b.story.s1 = { scene: 4, evidence: { sz3: { command: 'y' } }, attempts: { sz2: 3 } };
  const m = mergeStates(a, b);
  eq(m.story.s1.scene, 4); ok(m.story.s1.evidence.sz2 && m.story.s1.evidence.sz3); eq(m.story.s1.attempts.sz2, 3);
});

// ------------------------------------------------ Story
t('Story: Szenen vollständig und Sim-Szene lösbar', () => {
  ok(STORY1.scenes.length >= 6);
  for (const sc of STORY1.scenes) {
    ok(sc.ziel && sc.auftrag && sc.scope && sc.hinweis && sc.debrief, sc.id);
    if (sc.options) ok(sc.options.filter(o => o.ok).length === 1 && sc.options.filter(o => !o.ok).every(o => o.why), sc.id + ' Optionen');
    if (sc.kind === 'real') ok(sc.real.spec && sc.real.voraus.pc && sc.real.voraus.phone, sc.id);
  }
  ok(STORY1.scenes.some(sc => sc.kind === 'real' && /curl/.test(String(sc.real.spec.commandRe))), 'curl praktisch erforderlich');
  const s = sh(); STORY1.sandbox.setup(s);
  const sz0 = STORY1.scenes[0];
  ok(!sz0.answer.check('8080', s).ok, 'ohne Log-Beleg');
  s.exec('grep WARN monitor.log');
  ok(sz0.answer.check('8080', s).ok);
  ok(!sz0.answer.check('22', s).ok);
});
t('Story: echte Belege werden korrekt geprüft', () => {
  const T = 'KLY-AAAAAA';
  const sc = Object.fromEntries(STORY1.scenes.map(x => [x.id, x]));
  ok(verifyEvidence(sc.sz2.real.spec, { command: 'curl -I http://127.0.0.1:8080/', output: 'HTTP/1.0 200 OK\nServer: SimpleHTTP/0.6 Python/3.13.1' }).ok);
  const ps = '    PID    PPID COMMAND\n   3001    2999 zsh\n   3050    3001 python3 -m http.server 8080 --bind 127.0.0.1\n   3077    3001 ps -o pid,ppid,args';
  const ev = verifyEvidence(sc.sz3.real.spec, { command: 'ps -o pid,ppid,args', output: ps }); ok(ev.ok);
  ok(sc.sz3.answer.check('3050', null, ev).ok); ok(!sc.sz3.answer.check('3001', null, ev).ok);
  const psef = 'UID          PID    PPID  C STIME TTY          TIME CMD\nkali        3050    3001  0 17:20 pts/0    00:00:00 python3 -m http.server 8080 --bind 127.0.0.1\nkali        3090    3001  0 17:21 pts/0    00:00:00 grep http.server';
  const ev2 = verifyEvidence(sc.sz3.real.spec, { command: 'ps -ef | grep http.server', output: psef }); ok(ev2.ok);
  ok(sc.sz3.answer.check('3050', null, ev2).ok, 'ps -ef PID');
  ok(verifyEvidence(sc.sz4.real.spec, { command: 'curl -s http://127.0.0.1:8080/backup/db-backup.sql', output: `-- SYNTHETISCHER Testexport, keine echten Daten\n-- lab_token=${T}\nINSERT INTO kunden VALUES (1, demo, demo@example.invalid);`, token: T }).ok);
  ok(verifyEvidence(sc.sz5.real.spec, { command: 'python3 -m http.server 8080 --bind 127.0.0.1', output: '127.0.0.1 - - [31/Oct/2026 17:22:01] "GET /backup/db-backup.sql HTTP/1.1" 200 -' }).ok);
  ok(verifyEvidence(sc.sz6.real.spec, { command: 'kill 3050; chmod 600 backup/db-backup.sql; curl -I http://127.0.0.1:8080/; ls -l backup/db-backup.sql', output: "curl: (7) Failed to connect to 127.0.0.1 port 8080 after 0 ms: Couldn't connect to server\n-rw------- 1 kali kali 140 Oct 31 17:30 backup/db-backup.sql" }).ok);
});

// ------------------------------------------------ Dateien, PWA, Syntax
t('App-Dateiliste vollständig und vorhanden', () => {
  const ctx = { self: {} }; vm.runInNewContext(readFileSync(join(ROOT, 'app-files.js'), 'utf8'), ctx);
  const files = ctx.self.KLY_FILES;
  for (const f of [...files, ...ctx.self.KLY_EXTRA]) ok(existsSync(join(ROOT, f)), 'fehlt: ' + f);
  const walk = (d) => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p.slice(ROOT.length + 1)]; });
  for (const f of [...walk(join(ROOT, 'js')), ...walk(join(ROOT, 'css'))]) ok(files.includes(f.replace(/\\/g, '/')), 'nicht in KLY_FILES: ' + f);
});
t('Manifest gültig', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  ok(m.name && m.start_url && m.display === 'standalone');
  ok(m.icons.some(i => i.sizes === '192x192') && m.icons.some(i => i.sizes === '512x512') && m.icons.some(i => i.purpose === 'maskable'));
  for (const i of m.icons) ok(existsSync(join(ROOT, i.src)), i.src);
});
t('config.js enthält keine Geheimnisse', () => {
  const c = readFileSync(join(ROOT, 'config.js'), 'utf8');
  ok(!/service_role/i.test(c.replace(/\/\/.*$/gm, '')), 'service_role-Key im Frontend');
});
t('Curriculum: 10 Level', () => { eq(LEVELS.length, 10); eq(LEVELS.map(l => l.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); });

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
