// n1 „Inventur bei den Stadtwerken“: AUFTRAG.txt und .uebergabe übersetzt, inventar.csv bleibt (grep 10.10.20.42).
export default {
  base: '/home/seppi/auftrag',
  special(name, data) { return name.endsWith('.csv') ? data : null; },
  solve(run, step, { err }) {
    step('devport', 'curl http://10.10.20.10:8081/');
    step('kamera', 'nc 10.10.20.42 23 | grep Notiz | cut -d" " -f5 | base64 -d');
    if (!/\(6 hosts up\)/.test(run('nmap -sn 10.10.20.0/24'))) err('nmap -sn: nicht 6 Hosts');
    run('nmap -sV 10.10.20.1-50 -oN notizen/tcp.txt');
    if (run('grep -c "/tcp *open" notizen/tcp.txt').trim() !== '11') err('gespeicherter Scan: nicht 11 offene Ports');
    if (!/1 hosts? up|^$/.test('') && run('grep 10.10.20.42 inventar.csv').trim()) err('.42 steht in inventar.csv');
  },
};
