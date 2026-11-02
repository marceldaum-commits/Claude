// Inhalte der Missionen. Alles hier funktioniert auch ohne KI-Anfrage.

export const MISSIONS = [
  { id: 'mythos', icon: '🧠', title: 'Wahr oder Mythos?', text: 'Was KI kann – und was nicht. 12 Behauptungen, du entscheidest.', xp: 60, ki: false },
  { id: 'tokens', icon: '✂️', title: 'Der Token-Schnipsler', text: 'So „liest“ eine KI: in Schnipseln statt Buchstaben.', xp: 40, ki: true },
  { id: 'prompt', icon: '✍️', title: 'Prompt-Werkstatt', text: 'Schreib Aufträge, die die KI wirklich versteht. Ein KI-Trainer gibt Punkte.', xp: 100, ki: true },
  { id: 'wuerfel', icon: '🎲', title: 'Das Würfel-Labor', text: 'Gleiche Frage, dreimal gestellt – gleiche Antwort?', xp: 40, ki: true },
  { id: 'detektiv', icon: '🕵️', title: 'Halluzinations-Detektiv', text: 'KI-Texte klingen sicher – und sind manchmal falsch. Finde die Fehler!', xp: 80, ki: false },
  { id: 'persona', icon: '🎭', title: 'Persönlichkeits-Baukasten', text: 'Bau dir mit einem System-Prompt deinen eigenen Assistenten.', xp: 60, ki: true },
];

export const LEVELS = [
  [0, 'KI-Neuling'],
  [80, 'Neugierige*r'],
  [180, 'Prompt-Lehrling'],
  [300, 'KI-Entdecker*in'],
  [420, 'Prompt-Profi'],
  [520, 'KI-Meister*in'],
];

// ---------- Mission: Wahr oder Mythos? ----------
export const MYTHOS = [
  { s: 'Eine KI wie Claude „versteht“ Texte, indem sie Wort für Wort im Internet nachschlägt.', wahr: false,
    e: 'Ein Sprachmodell hat beim Training Muster aus riesigen Textmengen gelernt. Beim Antworten sucht es normalerweise nichts nach – es sei denn, es hat ausdrücklich ein Such-Werkzeug.' },
  { s: 'Sprachmodelle erzeugen ihre Antwort Stück für Stück: Sie sagen immer das nächste Textstück voraus.', wahr: true,
    e: 'Genau. Diese Textstücke heißen Tokens. Darum kannst du beim Chatten zusehen, wie die Antwort „getippt“ wird.' },
  { s: 'Wenn eine KI etwas sehr selbstsicher formuliert, stimmt es auch.', wahr: false,
    e: 'KI kann falsche Dinge genauso überzeugend schreiben wie richtige. Das nennt man „Halluzination“. Wichtige Fakten immer prüfen!' },
  { s: 'Je genauer ich beschreibe, was ich will, desto besser wird die Antwort meistens.', wahr: true,
    e: 'Ziel, Zielgruppe, Länge und Form angeben – das ist das Herz guter Prompts.' },
  { s: 'Eine KI merkt sich automatisch alles, was ich ihr je erzählt habe – für immer.', wahr: false,
    e: 'Ein Sprachmodell lernt nicht aus deinem Chat. Es sieht nur den aktuellen Gesprächsverlauf (und gespeicherte Erinnerungen, falls ein Dienst so etwas anbietet).' },
  { s: 'Persönliche Daten wie Passwörter oder Gesundheitsdaten gehören nicht unüberlegt in einen KI-Chat.', wahr: true,
    e: 'Was du eingibst, wird an einen Server geschickt. Überlege immer, ob du das auch einem fremden Dienst geben würdest.' },
  { s: 'Stellt man einer KI zweimal dieselbe Frage, kommt immer exakt derselbe Text heraus.', wahr: false,
    e: 'Beim Auswählen der nächsten Tokens ist Zufall im Spiel. Probier es im Würfel-Labor aus!' },
  { s: 'Eine KI kann mir helfen, einen Text zu verbessern, ohne dass ich das Denken abgebe.', wahr: true,
    e: 'Gute Nutzung: Feedback holen, Ideen sammeln, erklären lassen – und dann selbst entscheiden.' },
  { s: 'KI-Modelle sind neutral, weil sie ja nur Mathematik sind.', wahr: false,
    e: 'Sie lernen aus menschlichen Texten – samt Vorurteilen. Entwickler versuchen das zu verringern, aber kritisch bleiben lohnt sich.' },
  { s: 'Mit einem „System-Prompt“ kann man einer KI eine Rolle oder Regeln mitgeben.', wahr: true,
    e: 'Das probierst du im Persönlichkeits-Baukasten aus.' },
  { s: 'Eine KI rechnet immer fehlerfrei, weil Computer rechnen können.', wahr: false,
    e: 'Ein Sprachmodell rechnet nicht wie ein Taschenrechner, sondern „schreibt“ das Ergebnis. Bei langen Rechnungen lieber nachprüfen oder einen Rechner nutzen.' },
  { s: 'KI kann Texte, Bilder und Stimmen erzeugen, die echt wirken – auch Fälschungen.', wahr: true,
    e: 'Deshalb: Quelle prüfen, bevor du etwas glaubst oder weiterleitest.' },
];

// ---------- Mission: Prompt-Werkstatt ----------
export const PROMPT_TASKS = [
  { id: 'p1', title: 'Die Einladung', task: 'Lass die KI eine Einladung zu einem Geburtstag schreiben.',
    schwach: 'schreib eine einladung', ziel: 60 },
  { id: 'p2', title: 'Erklär es mir', task: 'Lass dir von der KI erklären, wie Photosynthese funktioniert – passend für ein Kind in der 5. Klasse.',
    schwach: 'was ist photosynthese', ziel: 70 },
  { id: 'p3', title: 'Der Lernplan', task: 'Lass die KI einen Lernplan für eine Mathearbeit in einer Woche erstellen.',
    schwach: 'mach mir einen lernplan', ziel: 75 },
  { id: 'p4', title: 'Die Beschwerde', task: 'Lass die KI eine höfliche, aber bestimmte E-Mail an einen Online-Shop schreiben, weil ein Paket nicht ankam.',
    schwach: 'email paket fehlt', ziel: 80 },
];

// ---------- Mission: Halluzinations-Detektiv ----------
// Jeder Fall: Sätze; die mit f:true sind falsch (erfunden oder sachlich verkehrt).
export const DETEKTIV = [
  {
    title: 'Fall 1: Der Mond',
    frage: '„Erzähl mir etwas über den Mond.“',
    saetze: [
      { t: 'Der Mond umkreist die Erde ungefähr einmal im Monat.' },
      { t: 'Er ist etwa 384.000 Kilometer von der Erde entfernt.' },
      { t: 'Die erste Mondlandung fand 1972 mit Apollo 8 statt.', f: true, w: 'Die erste Landung war 1969 mit Apollo 11. Apollo 8 umrundete den Mond 1968 nur.' },
      { t: 'Auf dem Mond gibt es keine dichte Atmosphäre.' },
      { t: 'Weil der Mond aus Eis besteht, leuchtet er nachts weiß.', f: true, w: 'Der Mond besteht aus Gestein und leuchtet nicht selbst – er reflektiert das Sonnenlicht.' },
    ],
  },
  {
    title: 'Fall 2: Die Quelle',
    frage: '„Nenn mir eine Studie, die zeigt, dass Hausaufgaben helfen.“',
    saetze: [
      { t: 'Zum Nutzen von Hausaufgaben gibt es viele Untersuchungen mit gemischten Ergebnissen.' },
      { t: 'Die bekannte Müller-Schmidt-Studie der Universität Talheim von 2019 belegt eine Notenverbesserung um genau 1,7 Stufen.', f: true, w: 'Diese Studie ist erfunden. KI erfindet manchmal Quellen, Zahlen und Namen, die echt klingen. Quellen immer selbst nachprüfen!' },
      { t: 'Oft hängt der Nutzen vom Alter und von der Art der Aufgaben ab.' },
      { t: 'Am besten fragst du nach Quellen und prüfst sie selbst in einer Suchmaschine oder Bibliothek.' },
    ],
  },
  {
    title: 'Fall 3: Rechnen',
    frage: '„Was ist 17 × 24, und wie viele Stunden hat eine Woche?“',
    saetze: [
      { t: '17 × 24 ergibt 418.', f: true, w: 'Richtig ist 408. Sprachmodelle können sich verrechnen – nachrechnen lohnt sich.' },
      { t: 'Eine Woche hat 7 Tage.' },
      { t: 'Also hat eine Woche 7 × 24 = 168 Stunden.' },
    ],
  },
  {
    title: 'Fall 4: Deutschland',
    frage: '„Gib mir drei Fakten über Deutschland.“',
    saetze: [
      { t: 'Die Hauptstadt Deutschlands ist Berlin.' },
      { t: 'Der längste Fluss, der durch Deutschland fließt, ist die Elbe.', f: true, w: 'Der längste Fluss auf deutschem Gebiet ist der Rhein; insgesamt am längsten ist die Donau. Die Elbe liegt dahinter.' },
      { t: 'Deutschland hat 16 Bundesländer.' },
      { t: 'Die Zugspitze ist mit rund 2.962 Metern der höchste Berg Deutschlands.' },
    ],
  },
];

// ---------- Mission: Würfel-Labor ----------
export const WUERFEL_FRAGEN = [
  'Erfinde einen Namen für eine Katze, die Detektivin ist. Nur den Namen.',
  'Schreib einen Satz, mit dem ein Roboter Hallo sagt.',
  'Was ist die Hauptstadt von Frankreich? Antworte mit einem Wort.',
];

// ---------- Mission: Persönlichkeits-Baukasten ----------
export const PERSONA_VORLAGEN = [
  { name: 'Pirat Paul', text: 'Du bist Pirat Paul. Du sprichst wie ein freundlicher Pirat („Ahoi!“) und erklärst alles mit Vergleichen aus der Seefahrt.' },
  { name: 'Sokrates-Tutor', text: 'Du bist ein Lerncoach. Du verrätst nie direkt die Lösung, sondern stellst immer genau eine hilfreiche Gegenfrage.' },
  { name: 'Kurz & knapp', text: 'Du antwortest immer in höchstens 3 Stichpunkten, ohne Einleitung.' },
];
