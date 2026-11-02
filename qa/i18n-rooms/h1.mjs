// h1 „Was die Webseite verrät“: Mitschnitte bleiben original (Cookie, JSON, Log), nur LIESMICH wird übersetzt.
export default {
  base: '/home/seppi/web',
  noEntsperren: true, // Walkthrough: Flags werden ins Antwortfeld eingegeben, kein entsperren
  special(name, data) { return name === 'LIESMICH.txt' ? null : data; },
  solve(run, step) {
    step('cookie', 'grep Set-Cookie 1-login.txt | cut -d= -f2 | cut -d";" -f1 | base64 -d');
    step('api', 'grep notiz 2-produkte.json');
  },
};
