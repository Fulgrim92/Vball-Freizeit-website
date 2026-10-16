export interface Tournament {
  id: string
  title: string
  place: string
  date: string
  format: string
  spots: number
  taken: number
}

// The first two are the tournaments listed on the current site; the others are examples.
export const TOURNAMENTS: Tournament[] = [
  { id: 't1', title: '6. Hallenturnier Mauern', place: 'Mauern', date: '2026-11-21', format: '6 gegen 6 Mixed', spots: 16, taken: 13 },
  { id: 't3', title: 'Nikolausturnier Freizeitliga', place: 'Sporthalle Haidhausen', date: '2026-12-05', format: '6 gegen 6 Mixed, Spaßwertung', spots: 12, taken: 7 },
  { id: 't4', title: 'Dreikönigs-Cup', place: 'Dreifachhalle Pasing', date: '2027-01-09', format: '4 gegen 4 Mixed', spots: 20, taken: 6 },
  { id: 't2', title: '4vs4 Indoor Beachvolleyball Turnier', place: 'Aschheim', date: '2027-02-27', format: 'Mixed nach vereinfachten Hallenregeln', spots: 24, taken: 11 },
]

export interface Post {
  id: string
  kind: 'forum' | 'boerse'
  title: string
  author: string
  date: string
  replies: number
  excerpt: string
  tag?: string
}

// Titles of the first post in each section are taken from the current site; the rest are examples.
export const POSTS: Post[] = [
  { id: 'f1', kind: 'forum', title: 'Ein paar Antworten zu euren Fragen zur Freizeitliga', author: 'Staffelleitung', date: '2026-10-14', replies: 12, excerpt: 'Nach dem Staffeltag kamen viele Fragen zu Aufstieg, Spielverlegungen und Schiedsgericht. Hier die wichtigsten Antworten gesammelt.', tag: 'Ankündigung' },
  { id: 'f2', kind: 'forum', title: 'Motiviertes Mixed-Team sucht Verein oder Hallenzeit in München', author: 'Netzroller', date: '2026-10-12', replies: 5, excerpt: 'Wir sind 11 Leute, spielen seit zwei Jahren zusammen und suchen eine feste Hallenzeit unter der Woche, gern im Münchner Osten.', tag: 'Hallenzeit' },
  { id: 'f3', kind: 'forum', title: 'Netzhöhe bei Mixed-Spielen in Liga 4', author: 'Baggerbande', date: '2026-10-09', replies: 8, excerpt: 'Bei uns gab es Diskussionen, ob 2,35 m oder 2,43 m gilt. Laut Spielordnung 2025 Abschnitt 4.2 …', tag: 'Regeln' },
  { id: 'f4', kind: 'forum', title: 'Schiedsrichterbogen als ausfüllbares PDF?', author: 'Isar Spikers', date: '2026-10-03', replies: 3, excerpt: 'Hat jemand den Bogen schon digital ausgefüllt? Das XLS klappt auf dem Handy leider schlecht.', tag: 'Dokumente' },
  { id: 'b1', kind: 'boerse', title: 'Mitspielerinnen und Mitspieler gesucht', author: 'Die Gallier', date: '2026-10-15', replies: 4, excerpt: 'Wir suchen zwei Frauen und einen Mann für Liga 1. Training Do 20:00 in Neuhausen. Grundtechniken solltet ihr sicher beherrschen.', tag: 'Team sucht' },
  { id: 'b2', kind: 'boerse', title: 'Suchen neue Spieler', author: 'Kaboom', date: '2026-10-13', replies: 2, excerpt: 'Wegen Umzug fehlen uns zwei Zuspieler. Wir spielen locker, aber ehrgeizig. Probetraining jederzeit möglich.', tag: 'Team sucht' },
  { id: 'b3', kind: 'boerse', title: 'Libera sucht Team in Schwabing oder Maxvorstadt', author: 'Theresa B.', date: '2026-10-10', replies: 6, excerpt: 'Habe sechs Jahre im Verein gespielt und suche nach der Babypause wieder ein entspanntes Mixed-Team.', tag: 'Spielerin sucht' },
  { id: 'b4', kind: 'boerse', title: 'Außenangreifer, 31, sucht Team', author: 'Kilian H.', date: '2026-10-06', replies: 1, excerpt: 'Neu in München, Erfahrung aus der Bezirksliga. Abends unter der Woche flexibel.', tag: 'Spieler sucht' },
]

export interface CalendarEvent {
  id: string
  title: string
  date: string
  kind: 'Liga' | 'Turnier' | 'Frist'
  note: string
}

export const EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Meldeschluss Rückrunde', date: '2026-11-30', kind: 'Frist', note: 'Mannschaftsdaten und Hallenzeiten bitte bis dahin aktualisieren.' },
  { id: 'e2', title: 'Winterpause', date: '2026-12-21', kind: 'Liga', note: 'Bis 06.01.2027 finden keine Ligaspiele statt.' },
  { id: 'e3', title: 'Rückrundenstart', date: '2027-01-11', kind: 'Liga', note: 'Spielpläne der Rückrunde sind bereits online.' },
  { id: 'e4', title: 'Staffeltag 2027', date: '2027-05-08', kind: 'Liga', note: 'Einladung folgt. Jede Mannschaft entsendet eine Vertretung.' },
]

export const DOCUMENTS = [
  { title: 'Spielordnung 2025', type: 'PDF', size: '412 KB' },
  { title: 'Auf- und Abstieg', type: 'PDF', size: '96 KB' },
  { title: 'Ligaeinteilung 2026/27', type: 'PDF', size: '128 KB' },
  { title: 'Protokoll Staffeltag', type: 'PDF', size: '220 KB' },
  { title: 'Einladung Staffeltag 2026', type: 'PDF', size: '88 KB' },
  { title: 'Schiedsrichterbogen', type: 'XLS', size: '54 KB' },
]

export const FAQ = [
  {
    q: 'Wie kommt meine Mannschaft in die Freizeitliga?',
    a: 'Registriere dich, lege deine Mannschaft an und melde sie bis zum Meldeschluss für die neue Saison. Die Staffelleitung teilt neue Teams in der Regel in Liga 5 ein.',
  },
  {
    q: 'Wer darf Spielergebnisse eintragen?',
    a: 'Alle, die die Daten der Heimmannschaft ändern dürfen, sowie die Staffelleitung. Nach dem Spiel einfach im Bereich „Mein Team“ unter „Ergebnis eintragen“ die Satzergebnisse erfassen.',
  },
  {
    q: 'Wie verlege ich ein Heimspiel?',
    a: 'Je nach Liga dürfen Mannschaften selbst verlegen oder nur die Staffelleitung. Die Anzahl der Verlegungen pro Mannschaft kann begrenzt sein. Stimmt den neuen Termin vorher mit dem Gegner ab.',
  },
  {
    q: 'Wie wird die Tabelle berechnet?',
    a: 'Gespielt wird auf zwei Gewinnsätze. Ein Sieg bringt 2 Punkte, wer 1:2 verliert, bekommt 1 Punkt. Bei Punktgleichheit entscheidet der Satzquotient, danach der Ballquotient.',
  },
  {
    q: 'Wie funktioniert die Trainingsplanung?',
    a: 'Für jede Trainingseinheit sagt ihr im Bereich „Mein Team“ zu oder ab. Die Trainingsbeteiligung wird automatisch mitgezählt, damit alle sehen, ob genug Leute kommen.',
  },
  {
    q: 'Wie vergebe ich Rechte an andere im Team?',
    a: 'Unter „Kader & Rechte“ kannst du Rechte, die du selbst hast, an andere registrierte Personen weitergeben oder wieder entziehen. Ämter und Rechte sind getrennt.',
  },
]
