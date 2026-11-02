// b1 „Die Nacht im Kollektiv“: Logs bleiben original; in verlauf.txt nur die Base64-Nachricht (echo "…" > /tmp/.gruss) übersetzen.
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s, 'base64').toString('utf8');
export default {
  base: '/home/seppi/spuren',
  decode(name, data) {
    if (name !== 'verlauf.txt') return null;
    return data.split('\n').map(l => { const m = l.match(/^echo "([^"]+)" > \/tmp\/\.gruss$/); return m ? unb64(m[1]) : l; }).join('\n');
  },
  special(name, data, T) {
    if (name === 'verlauf.txt') return data.split('\n').map(l => { const m = l.match(/^echo "([^"]+)" > \/tmp\/\.gruss$/); return m ? `echo "${b64(T.t(unb64(m[1])))}" > /tmp/.gruss` : l; }).join('\n');
    if (name.endsWith('.log')) return data;
    return null;
  },
  solve(run, step, { err }) {
    step('spur', `grep gruss logs/verlauf.txt | cut -d'"' -f2 | base64 -d`);
    if (!run("grep Failed logs/auth.log | sed 's/.* from //' | cut -d' ' -f1 | sort | uniq -c | sort -nr | head -1").includes('203.0.113.77')) err('Top-IP stimmt nicht');
    if (run('grep Failed logs/auth.log | grep -c 203.0.113.77').trim() !== '143') err('Fehlversuche ≠ 143');
    if (!run('grep 203.0.113.77 logs/access.log | grep " 200 "').includes('/backup/kollektiv-server.tar.gz')) err('Download nicht gefunden');
  },
};
