// Teams, clubs, halls, hall times and contacts as listed on
// https://www.volleyball-freizeit.de/adressen (Saison 2026/27, checked 16.10.2026).
// Contacts are shortened to first name + initial for the public demo.
// Obvious typos in street names are corrected; see VALIDATION_NOTES.md.

export interface Slot {
  day: number // 0 = Mo … 6 = So
  from: string
  to?: string
}

export interface TeamSource {
  name: string
  league: string
  club?: string
  venues: string[]
  slots: Slot[]
  contacts: string[]
}

export const STAFFELLEITUNG: Record<string, string> = {
  '1': 'Sascha R.',
  '2A': 'Andreas S.',
  '2B': 'Michael B.',
  '3A': 'Jurij M.',
  '3B': 'Helga G.',
  '3C': 'Robert S.',
  '4A': 'Maximilian D.',
  '4B': 'Michel M.',
  '4C': 'Johanna S.',
  '4D': 'Martin V.',
  '5A': 'Michael U.',
  '5B': 'Christian R.',
  '5C': 'Sophie G.',
  '5D': 'Gerhard R.',
  '5E': 'Ingrid H.',
}

const s = (day: number, from: string, to?: string): Slot => ({ day, from, to })
const MO = 0, DI = 1, MI = 2, DO = 3, FR = 4, SA = 5, SO = 6

const ESV = 'Sportpark Nymphenburg (ESV), Margarethe-Danzi-Str. 21'
const LFG = 'Lion-Feuchtwanger-Gymnasium, Freiligrathstr. 71'
const HELMHOLTZ = 'Grundschule Helmholtzstr. 6'
const SAEBENER = 'Sporthalle Säbener Str. 49'
const SIEMENS = 'SG Siemens München Ost, St.-Cajetan-Str. 33'
const LATINO = 'Berufsschule am Königsplatz (Halle 2), Luisenstr. 29'
const STGEORGE = "St. George's School, Lilienthalallee 47"
const GROSSHADERN = 'Grundschule Großhaderner Str. 50'
const SOLLN = 'Sporthalle TSV Solln, Herterichstr. 151'
const NEURIED = 'Sportpark Neuried, Am Sportpark 8'
const RIEGERHOF = 'Lukasschule / SV Laim, Riegerhofstr. 20'
const NADI = 'Turnhalle Nadischule, Nadistr. 3'
const AIDENBACH = 'Grundschule Aidenbachstr. 23 (Halle 1)'
const WEISSBLAU = 'SV Weißblau-Allianz, Osterwaldstr. 144'
const PESTALOZZI = 'Pestalozzi-Gymnasium, Eduard-Schmid-Str. 1'
const HAGN = 'Sportstätte Josef-Hagn, Josef-Hagn-Str. 2'
const FERNPASS = 'Grund- und Mittelschule, Fernpassstr. 41'
const HELIOS = 'Wilhelm-Hausenstein-Gymnasium, Fideliostr. 145'
const ECHARDINGER = 'Mittelschule Echardinger Grünstreifen, Innsbrucker Ring 75'
const TRUDERING = 'Gymnasium Trudering, Markgrafenstr. 19'
const PSV = 'PSV München-Moosach (Neue Halle), Franz-Mader-Str. 11'
const HAAGER = 'Grundschule Haager Str. 16'
const GISELA = 'Gisela-Gymnasium, Arcisstr. 65'
const HARTECK = 'Gymnasium München-Nord, Knorrstr. 171'

export const TEAM_SOURCE: TeamSource[] = [
  // Gruppe 1
  { league: '1', name: '6 für Cuba', club: 'ESV München', venues: [ESV], slots: [s(MO, '20:00', '22:00')], contacts: ['Sandra B.', 'Thomas B.'] },
  { league: '1', name: 'Amore Calzone', club: 'TSV Neuried', venues: [NEURIED], slots: [s(SO, '19:30', '22:00')], contacts: ['Nicole C.'] },
  { league: '1', name: 'Die Gallier', club: 'TSV Neuhausen-Nymphenburg', venues: [HELMHOLTZ], slots: [s(MO, '20:00', '22:00')], contacts: ['Peter K.', 'Steffi K.'] },
  { league: '1', name: 'ESV München I', club: 'ESV München', venues: [ESV], slots: [s(SO, '20:00', '22:00')], contacts: ['Enrico S.'] },
  { league: '1', name: 'Kaboom', club: 'ESV Neuaubing', venues: ['ESV Neuaubing, Turnhalle 1, Papinstr. 22'], slots: [s(DI, '20:30', '22:00')], contacts: ['Sascha R.', 'Florian L.'] },
  { league: '1', name: 'Optisch Überlegen', club: 'TSV Neuhausen-Nymphenburg', venues: ['Halle der Nymphenburger Schulen, Sadelerstr. 10'], slots: [s(DO, '20:30', '22:00')], contacts: ['Simone W.', 'Joscha O.'] },
  { league: '1', name: 'Spartak Au', club: 'Roter Stern Altstadt', venues: [PESTALOZZI], slots: [s(DO, '20:00', '22:00')], contacts: ['Nadine V.'] },
  { league: '1', name: 'SUPER SMASH', club: 'TSV München-Milbertshofen', venues: [LFG], slots: [s(MO, '20:00', '22:00'), s(MI, '20:00', '22:00')], contacts: ['Thomas S.'] },
  // Gruppe 2A
  { league: '2A', name: 'BallaBalla', club: 'TSV Trudering', venues: [HAGN], slots: [s(DI, '20:00', '22:00')], contacts: ['Jürgen K.'] },
  { league: '2A', name: 'Die Unvollendeten', club: 'DJK Sportbund München Ost', venues: ['Katholisches Bildungswerk, Preysingstr. 83'], slots: [s(DI, '19:30', '21:30')], contacts: ['Hermann M.'] },
  { league: '2A', name: 'Garam Masala', club: 'TSV Forstenried', venues: [SOLLN, 'Mittelschule Walliser Str. 5'], slots: [s(MO, '20:15', '22:15'), s(MI, '20:00', '22:00')], contacts: ['Andreas S.'] },
  { league: '2A', name: 'KAAAMEE HAAAMEE HAAAAA', club: 'TSV Neuhausen-Nymphenburg', venues: ['Maria-Ward-Turnhalle, Maria-Ward-Str. 3'], slots: [s(MO, '19:30', '22:00')], contacts: ['Laurenz B.'] },
  { league: '2A', name: 'Latino SC Munich 2', club: 'Latino Sportclub Munich', venues: [LATINO], slots: [s(MO, '19:30', '21:45'), s(DO, '19:30', '21:45')], contacts: ['Johannes F.', 'Matheus S.'] },
  { league: '2A', name: 'Los Krachos', club: 'ESV München', venues: ['ESV München Dreifachhalle, Margarethe-Danzi-Str. 21'], slots: [s(SO, '20:00', '22:00')], contacts: ['Friedolin I.', 'Marina H.'] },
  { league: '2A', name: 'Nicht Mit Uns', club: 'TSV Unterhaching', venues: ['Sportarena Unterhaching, Utzweg 1'], slots: [s(DI, '20:00', '22:00')], contacts: ['Andreas S.'] },
  { league: '2A', name: 'Roter Stern Altstadt', club: 'Roter Stern Altstadt', venues: [PESTALOZZI], slots: [s(DO, '20:00', '21:30')], contacts: ['Jörg K.', 'Stephan K.'] },
  // Gruppe 2B
  { league: '2B', name: 'Decke-Boden', club: 'TSC Maxvorstadt', venues: ['Grundschule Infanteriestr. 25'], slots: [s(DI, '20:00', '22:00')], contacts: ['Veronika P.', 'Björn B.', 'Aleksandra D.', 'Michael H.'] },
  { league: '2B', name: 'Formel 6', club: 'BMW Sportgemeinschaft', venues: ['Grundschule Rockefellerstr. 11'], slots: [s(DI, '19:00', '21:00')], contacts: ['Peter H.', 'Susanne G.', 'Michael L.'] },
  { league: '2B', name: 'Gänsejäger', club: 'VC Westpark', venues: [FERNPASS], slots: [s(DO, '20:00', '22:00')], contacts: ['Melanie W.', 'Dominik M.', 'Günter M.', 'Sandra S.'] },
  { league: '2B', name: 'Haderlumpen', club: 'TSV Großhadern 1926', venues: [GROSSHADERN], slots: [s(DI, '19:30', '21:30')], contacts: ['Michael B.'] },
  { league: '2B', name: 'Laimer Zufall', club: 'SV Laim', venues: [RIEGERHOF], slots: [s(DI, '20:00', '22:00')], contacts: ['Roland S.', 'Stefan T.'] },
  { league: '2B', name: 'Mooskitos', club: 'Freundeskreis Eichenkreuzsport', venues: ['Schulzentrum Moosach (Einfachhalle), Gerastr. 6'], slots: [s(MO, '20:00', '23:00')], contacts: ['Andrea W.', 'Stefan K.'] },
  { league: '2B', name: 'SMASH SQUAD', club: 'TSV München-Milbertshofen', venues: ['Bad-Soden-Halle, Bad-Soden-Str. 27', LFG], slots: [s(DI, '20:00', '22:00'), s(MI, '20:00', '22:00')], contacts: ['Joscha I.'] },
  { league: '2B', name: 'Trudering', club: 'TSV Trudering', venues: ['Sporthalle Josef-Hagn-Str. (neben Dehner)'], slots: [s(MO, '19:45', '21:30')], contacts: ['Agnes E.'] },
  // Gruppe 3A
  { league: '3A', name: 'Caipiranhas', club: 'SVN München', venues: ['Grundschule Karl-Marx-Ring 65', 'SVN Sportpark (Halle 3), Fritz-Erler-Str. 3'], slots: [s(MO, '20:00', '22:00'), s(MI, '20:00', '22:00')], contacts: ['Nicolas R.'] },
  { league: '3A', name: 'FTM Block Party', club: 'FTM Schwabing', venues: ['Willi-Graf-Gymnasium, Borschtallee 26'], slots: [s(DO, '20:00', '22:00')], contacts: ['Antonio Z.'] },
  { league: '3A', name: 'Laimer BÄM', club: 'SV München-Laim', venues: [RIEGERHOF], slots: [s(DI, '18:00', '20:00')], contacts: ['Johannes L.', 'Stefan T.'] },
  { league: '3A', name: 'Pflegestufe 2', club: 'TSV Turnerbund München', venues: [SAEBENER], slots: [s(MO, '21:00', '23:00'), s(MI, '20:30', '23:00')], contacts: ['Helga G.', 'Markus G.'] },
  { league: '3A', name: 'PiHoppers I', club: 'VC Oberföhring', venues: ['Rudolf-Steiner-Schule, Max-Proebstl-Str. 7'], slots: [s(DO, '20:00', '22:00')], contacts: ['Annamária B.', 'Harald S.'] },
  { league: '3A', name: 'Schmetterlinge', club: 'SG Siemens München Ost', venues: [SIEMENS], slots: [s(MI, '19:30', '21:30')], contacts: ['Ralf N.', 'Florian W.'] },
  { league: '3A', name: 'Schwabinger Gelbe Ruam', club: 'ZAB', venues: ['Grundschule Regina-Ullmann-Str. 6'], slots: [s(MO, '20:30', '22:00')], contacts: ['Sten G.'] },
  { league: '3A', name: 'To The Top!', club: 'ESV München', venues: [ESV], slots: [s(SO, '20:00', '22:00')], contacts: ['Jurij M.'] },
  // Gruppe 3B
  { league: '3B', name: '6-im-Feld', club: 'Forstenrieder SC', venues: ['Samberger Schule, Samberger Str. 14'], slots: [s(DO, '19:30', '22:00')], contacts: ['Konstantin G.'] },
  { league: '3B', name: 'Die Winselstuten', club: 'SV Helios-Daglfing', venues: [HELIOS], slots: [s(MO, '20:00', '22:00')], contacts: ['Hansjörg H.'] },
  { league: '3B', name: 'Evil Power', club: 'MTV München', venues: ['Theresien-Gymnasium, Kaiser-Ludwig-Platz 3', 'Therese-von-Bayern-Schule, Lindwurmstr. 90'], slots: [s(DI, '20:00', '22:00'), s(FR, '20:00', '22:00')], contacts: ['Alexander K.'] },
  { league: '3B', name: 'Hallenopas', club: 'TSV Turnerbund München', venues: [SAEBENER], slots: [s(MO, '21:00', '23:00'), s(MI, '20:30', '23:00')], contacts: ['Helga G.', 'Markus G.'] },
  { league: '3B', name: 'Hau-raus-wie-nix', club: 'TSV Neuried', venues: [NEURIED], slots: [s(SO, '20:00', '22:00'), s(DO, '20:30', '22:30')], contacts: ['Michael H.'] },
  { league: '3B', name: 'Mad Max', venues: ['Maximiliansgymnasium, Karl-Theodor-Str. 9'], slots: [s(MI, '20:30', '22:00')], contacts: ['Florian S.', 'Michel F.'] },
  { league: '3B', name: 'SV Olympiadorf', club: 'SV Olympiadorf München', venues: [NADI], slots: [s(MO, '19:45', '21:15')], contacts: ['Thomas B.', 'Stefan S.', 'Rico S.'] },
  { league: '3B', name: 'SVSF StuSta', club: 'SV Studentenstadt Freimann', venues: [STGEORGE], slots: [s(MI, '20:00', '22:00')], contacts: ['Pepe N.'] },
  // Gruppe 3C
  { league: '3C', name: "Block'n'Roll", club: 'SV Studentenstadt Freimann', venues: [STGEORGE], slots: [s(MO, '19:30', '22:00'), s(MI, '20:00', '22:00')], contacts: ['Andranik P.', 'Anton C.'] },
  { league: '3C', name: 'Die jungen Wilden', club: 'TSV Schleißheim', venues: ['Turnhalle am Hallenbad, Prof.-Otto-Hupp-Str. 26b'], slots: [s(DI, '20:00', '22:00')], contacts: ['Peter A.', 'Tim B.', 'Kathrin M.'] },
  { league: '3C', name: 'Hot Bananas', club: 'TSV Allach 09', venues: ['Grundschule Eversbuschstr. 182'], slots: [s(MO, '19:00', '21:00')], contacts: ['Christoph R.', 'Fabienne N.', 'Christian R.'] },
  { league: '3C', name: 'HSG München Laim', club: 'HSG München Laim', venues: ['Gilmschule, Gilmstr. 46'], slots: [s(MI, '20:00', '22:30')], contacts: ['Robert S.', 'Philipp A.', 'Bernhard Z.'] },
  { league: '3C', name: 'Nymphenburger Schmetterlinge', club: 'TSV Neuhausen-Nymphenburg', venues: ['Maria-Ward-Straße (Halle nicht angegeben)'], slots: [s(MO, '20:00', '22:00')], contacts: ['Luca W.', 'Rosa F.'] },
  { league: '3C', name: 'Picco-Rosso', club: 'SV Helios-Daglfing', venues: [HELIOS], slots: [s(MO, '20:00', '22:00')], contacts: ['Elisa M.'] },
  { league: '3C', name: 'The Suntouchables', club: 'Volleyfreuden e.V.', venues: ['Berufsschule Bau & Kunsthandwerk, Luisenstr. 9'], slots: [s(MI, '19:15', '21:45')], contacts: ['Susanne M.', 'Wolfgang L.'] },
  { league: '3C', name: 'Volleyballindianer', club: 'ESV München', venues: [ESV], slots: [s(MO, '20:00', '22:00')], contacts: ['Horst K.'] },
  // Gruppe 4A
  { league: '4A', name: '7NA', club: 'TSV München-Milbertshofen', venues: [LFG], slots: [s(DI, '20:00', '23:00'), s(DO, '20:00', '22:00')], contacts: ['Maximilian D.'] },
  { league: '4A', name: 'All Schmetterhands', club: 'FTM Blumenau', venues: [GROSSHADERN], slots: [s(DI, '19:30', '21:30')], contacts: ['Sophia B.', 'Victor B.', 'Alexander B.'] },
  { league: '4A', name: 'Blue Igel', club: 'SV Weißblau-Allianz', venues: [WEISSBLAU], slots: [s(MI, '20:00', '22:00')], contacts: ['Irina C.', 'Wolfgang U.'] },
  { league: '4A', name: 'Die lowhofer', club: 'SV Lohhof', venues: ['Carl-Orff-Gymnasium, Münchner Ring 6'], slots: [s(MO, '20:00', '22:00')], contacts: ['Volker H.', 'Andreas H.'] },
  { league: '4A', name: 'Forza Ragazzi', venues: ['Europäisches Patentamt, Bauteil 8, Grasserstr. 9'], slots: [s(DO, '18:45', '21:00')], contacts: ['Barbara C.'] },
  { league: '4A', name: 'Latino SC Munich 3', club: 'Latino Sportclub Munich', venues: [LATINO], slots: [s(MO, '19:30', '21:45'), s(DO, '19:30', '21:45')], contacts: ['Johannes F.'] },
  { league: '4A', name: 'Maximal Wild', club: 'TSC Maxvorstadt', venues: ['Turnhalle Schwindschule, Zentnerstr. 2'], slots: [s(MI, '19:30', '21:30')], contacts: ['Julian M.', 'Erich L.', 'Amelie P.', 'Beatrice V.'] },
  { league: '4A', name: 'VC AST', club: 'VC AST e.V.', venues: [GISELA], slots: [s(DI, '20:00', '22:00')], contacts: ['Richard N.', 'Egfried M.'] },
  // Gruppe 4B
  { league: '4B', name: 'BavUA', club: 'SV Weißblau-Allianz', venues: [WEISSBLAU], slots: [s(SA, '18:00', '20:00')], contacts: ['Oleh S.', 'Roman N.', 'Yehor P.', 'Mykhailo S.', 'Illia S.', 'Wolfgang U.'] },
  { league: '4B', name: 'Haudraufwienix', club: 'TSV Neuried', venues: [NEURIED], slots: [s(DI, '20:30', '22:00')], contacts: ['Carolin B.', 'Cathrin K.'] },
  { league: '4B', name: 'Jagdgänse', club: 'VC Westpark', venues: [FERNPASS], slots: [s(MO, '20:00', '22:00')], contacts: ['Anikka R.', 'Fabio G.', 'Dominik M.', 'Sandra S.'] },
  { league: '4B', name: 'Laimer Bier', club: 'SV München-Laim', venues: ['Vereinshalle SV Laim, Riegerhofstr. 20'], slots: [s(DI, '20:00', '22:00')], contacts: ['Vedad P.', 'Andreas S.'] },
  { league: '4B', name: 'MonsterLocken', club: 'Turnerschaft 1905', venues: [ECHARDINGER], slots: [s(MI, '20:00', '22:00')], contacts: ['Basti B.'] },
  { league: '4B', name: 'Schönschmetterfront', club: 'TSV Solln', venues: [SOLLN], slots: [s(SO, '20:00', '22:00')], contacts: ['Jana D.'] },
  { league: '4B', name: 'VC Dom Pedro', club: 'VC Dom Pedro e.V.', venues: [GISELA], slots: [s(MO, '20:30', '22:00')], contacts: ['Wolfgang N.'] },
  { league: '4B', name: 'Voll Treffer', club: 'TSV Trudering', venues: [TRUDERING], slots: [s(FR, '20:00', '22:00')], contacts: ['Andrey T.'] },
  // Gruppe 4C
  { league: '4C', name: 'ASCM', club: 'DJK Sportbund München', venues: ['Bertolt-Brecht-Gymnasium (untere Halle), Peslmüllerstr.'], slots: [s(DI, '20:00', '22:00')], contacts: ['Katharina K.', 'Dominique T.'] },
  { league: '4C', name: 'Blockbusters', club: 'TSV München-Milbertshofen', venues: [LFG], slots: [s(DI, '20:00', '21:30'), s(DO, '20:00', '22:00')], contacts: ['Korbinian H.', 'Markus B.', 'Johannes H.', 'Marisa V.'] },
  { league: '4C', name: 'Funtastic', club: 'TSV Großhadern 1926', venues: ['Grundschule Großhadern (Halle 1), Großhaderner Str. 50', 'Grundschule am Canisiusplatz 2'], slots: [s(DI, '19:30', '21:30'), s(DO, '20:00', '22:00')], contacts: ['Martin S.'] },
  { league: '4C', name: 'Jojo Effekt', club: 'ESV München', venues: [ESV], slots: [s(SO, '18:00')], contacts: ['Johanna S.'] },
  { league: '4C', name: "Loud'n'Proud", club: 'TSV Neuhausen-Nymphenburg', venues: [`${HELMHOLTZ} (Eingang Marlene-Dietrich-Str.)`], slots: [s(DO, '20:00', '22:00')], contacts: ['Stefan K.', 'Nico W.'] },
  { league: '4C', name: 'Maximale Lässigkeit 2', club: 'Post SV München Moosach', venues: [PSV], slots: [s(DI, '20:00', '22:00')], contacts: ['Matthias M.', 'Frank L.'] },
  { league: '4C', name: 'Menzinger', club: 'TuS Obermenzing', venues: ['Grandlschule, Grandlstr. 5'], slots: [s(MO, '20:00', '22:00')], contacts: ['Uwe W.', 'Thomas S.'] },
  { league: '4C', name: 'Mission Unblockable', club: 'TSV Solln', venues: ['Ehem. Thomas-Mann-Gymnasium (Einfachhalle 2), Drygalski-Allee 2'], slots: [s(DI, '20:00', '22:00')], contacts: ['Andreas G.'] },
  // Gruppe 4D
  { league: '4D', name: 'Die Streuner', club: 'GGC München', venues: ['Sabel Realschule, Schwanthalerstr. 51'], slots: [s(DI, '18:30', '20:45')], contacts: ['Stephanie S.', 'Flo L.'] },
  { league: '4D', name: 'Fireballa', club: 'SVN München', venues: ['Neue Grundschule Karl-Marx-Ring 65'], slots: [s(FR, '20:00', '22:00')], contacts: ['Manfred H.', 'Klaus S.'] },
  { league: '4D', name: 'Greatest Hits', club: 'Volleyball-Freunde Isarland', venues: [HAAGER], slots: [s(MO, '20:00', '21:30')], contacts: ['Karina L.', 'Elena K.', 'Jens W.'] },
  { league: '4D', name: 'Größenwahn', club: 'Turnerschaft 1905', venues: [ECHARDINGER], slots: [s(DO, '19:30', '22:00')], contacts: ['Josef P.', 'Axel R.'] },
  { league: '4D', name: 'Känguruhs', club: 'SC Känguruh e.V.', venues: ['Fritjof-Nansen-Realschule, Ernst-Reuter-Str. 4'], slots: [s(MO, '19:30', '21:30')], contacts: ['Brigitte W.', 'Immanuel S.'] },
  { league: '4D', name: 'Latino SC Munich', club: 'Latino Sportclub Munich', venues: [LATINO], slots: [s(MO, '19:30', '21:45'), s(DO, '19:30', '21:45')], contacts: ['Johannes F.', 'Matheus S.'] },
  { league: '4D', name: 'Ratz Fatz', club: 'SG Siemens München Ost', venues: [SIEMENS], slots: [s(DO, '19:30', '21:30')], contacts: ['Sonja B.', 'Martin V.'] },
  { league: '4D', name: 'Voglwuid', club: 'TSV Trudering', venues: [HAGN], slots: [s(DO, '20:00', '22:00')], contacts: ['Thomas V.'] },
  // Gruppe 5A
  { league: '5A', name: 'BavUA II', club: 'SC Freimann München', venues: ['Staatl. Realschule München VI, Paul-Hindemith-Allee 7'], slots: [s(MO, '19:30', '21:45')], contacts: ['Oleh S.', 'Yehor P.'] },
  { league: '5A', name: 'ESV Freimann', club: 'ESV München-Freimann', venues: [STGEORGE], slots: [s(MO, '20:15', '22:00')], contacts: ['Michael U.'] },
  { league: '5A', name: 'FIX WIE NIX', club: 'Sportfreunde Harteck', venues: [HARTECK], slots: [s(MO, '19:30', '21:30'), s(MI, '19:30', '21:30')], contacts: ['Kebi K.'] },
  { league: '5A', name: 'Maxvorstadt I', club: 'TSC Maxvorstadt', venues: ['Luisengymnasium (Halle 3), Luisenstr. 7'], slots: [s(FR, '19:00', '21:00')], contacts: ['Ninelia M.'] },
  { league: '5A', name: 'Mil-A kann fliegen', club: 'TSV München-Milbertshofen', venues: [LFG], slots: [s(MO, '20:00', '22:00'), s(MI, '20:00', '22:00')], contacts: ['Paul T.'] },
  { league: '5A', name: 'rUSH hour', club: 'FVC Unterschleißheim', venues: ['Grundschule an der Ganghoferstraße, Hans-Carossa-Str. 2, Unterschleißheim'], slots: [s(FR, '20:00', '22:00')], contacts: ['Florian A.'] },
  { league: '5A', name: 'Schmetterspätzle', club: 'TSV Neuhausen-Nymphenburg', venues: [HELMHOLTZ], slots: [s(DI, '19:30', '21:00')], contacts: ['Andreas B.', 'Matthias W.'] },
  { league: '5A', name: 'SV Olympiadorf II', club: 'SV Olympiadorf München', venues: [NADI], slots: [s(DO, '20:00', '21:30')], contacts: ['Thomas B.', 'Stefan S.', 'Rico S.'] },
  // Gruppe 5B
  { league: '5B', name: 'Avanti Ragazzi', club: 'Amicale Volleyball Club', venues: [], slots: [s(DI, '19:00', '21:00')], contacts: ['Domenico A.', 'Giovanni A.'] },
  { league: '5B', name: 'Chillige Chilis', club: 'Hexagonal Direct Players', venues: ['Marieluise-Fleißer-Realschule, Aschauer Str. 7'], slots: [s(DO, '20:00', '21:30')], contacts: ['Hai N.'] },
  { league: '5B', name: 'Die Münchner Elche', club: 'Die Münchner Elche e.V.', venues: ['Max-Reinhardt-Weg 27'], slots: [s(MI, '20:30', '22:00')], contacts: ['Francois B.', 'Sebastien F.'] },
  { league: '5B', name: 'Haderner Sterne', club: 'TSV Großhadern 1926', venues: [`${GROSSHADERN} (Halle rechts)`], slots: [s(MI, '20:00', '22:00')], contacts: ['Ahmed A.'] },
  { league: '5B', name: 'Interspikers', club: 'FC Hertha München', venues: [AIDENBACH], slots: [s(MI, '20:00', '22:00')], contacts: ['Sophie G.', 'Christian H.'] },
  { league: '5B', name: 'Ohjooo Lightning', club: 'SG Siemens München Ost', venues: [SIEMENS], slots: [s(MI, '19:30', '21:30')], contacts: ['Zheng L.'] },
  { league: '5B', name: 'Rainbow Six', club: 'TSV Neuhausen-Nymphenburg', venues: [`${HELMHOLTZ} (Eingang Luise-Ullrich-Str. 9)`], slots: [s(MI, '19:30', '22:00')], contacts: ['Christian R.', 'Andrea R.'] },
  // Gruppe 5C
  { league: '5C', name: 'Aubinger Chaoten', club: 'ESV Neuaubing', venues: ['ESV Neuaubing, Papinstr. 22'], slots: [s(DI, '20:00', '22:00')], contacts: ['Marina B.'] },
  { league: '5C', name: 'FF 15', club: 'Sportfreunde Harteck', venues: [`${HARTECK} (Hallenteil Mitte)`], slots: [s(MO, '19:30', '21:30')], contacts: ['Matthias J.'] },
  { league: '5C', name: 'Flying Circus', club: 'TSV Gräfelfing', venues: ['Kurt-Huber-Gymnasium, Adalbert-Stifter-Platz 2'], slots: [s(FR, '20:00', '22:00')], contacts: ['Walter S.', 'Steffen N.'] },
  { league: '5C', name: 'Interteam', club: 'FC Hertha München', venues: [AIDENBACH], slots: [s(MI, '20:00', '22:00')], contacts: ['Christian H.', 'Sophie G.'] },
  { league: '5C', name: 'Maximale Lässigkeit', club: 'Post SV München Moosach', venues: [PSV], slots: [s(DI, '20:00', '22:00')], contacts: ['Thomas B.'] },
  { league: '5C', name: 'München Adler', club: 'TSV Neuhausen-Nymphenburg', venues: [HELMHOLTZ], slots: [s(FR, '19:30', '22:00')], contacts: ['Donia M.', 'Mohamed M.'] },
  { league: '5C', name: 'Schlagsahne', club: 'TSV München-Allach 1909', venues: ['Grundschule Theodor-Fischer-Str. 71'], slots: [s(DI, '20:00', '22:00')], contacts: ['Thomas S.', 'Sebastian K.', 'Elisa L.'] },
  // Gruppe 5D
  { league: '5D', name: 'Beyond Ost', club: 'TSV München Ost', venues: ['TSV München Ost, Quiddestr. 4'], slots: [s(MO, '20:00', '23:00')], contacts: ['Sergei K.'] },
  { league: '5D', name: 'BUGAtis', club: 'TV Riem-Dornach', venues: ['Grundschule Messestadt West, Lehrer-Wirth-Str. 31'], slots: [s(DO, '20:30', '22:30')], contacts: ['Monika A.', 'Berna B.'] },
  { league: '5D', name: 'Genial daneben', club: 'SVN München', venues: ['Grundschule Karl-Marx-Ring 67'], slots: [s(DI, '20:00', '22:00')], contacts: ['Rainer S.', 'Gerlinde B.', 'Harry K.'] },
  { league: '5D', name: 'Netzrollies', club: 'TSV Turnerbund München', venues: [SAEBENER], slots: [s(MO, '19:45', '21:15'), s(MI, '20:30', '23:00')], contacts: ['Helga G.', 'Markus G.'] },
  { league: '5D', name: 'Red Sparrows', club: 'DJK München-Ost', venues: ['Heinrich-Heine-Gymnasium, Max-Reinhardt-Weg 27'], slots: [s(MO, '19:30', '21:30')], contacts: ['Alexander W.'] },
  { league: '5D', name: 'Schampanias', club: 'SG Siemens München Ost', venues: [SIEMENS], slots: [s(DO, '19:30', '21:30')], contacts: ['Winfried K.'] },
  { league: '5D', name: 'VolleyBR', club: 'SG Bayerischer Rundfunk', venues: ['Infanteriestr. 27'], slots: [s(DO, '20:00', '22:00')], contacts: ['Dominic H.'] },
  // Gruppe 5E
  { league: '5E', name: 'Der Supergau', club: 'TSV Neuhausen-Nymphenburg', venues: ['Maria-Ward-Str. 5'], slots: [s(MO, '20:00', '22:00')], contacts: ['Nico W.'] },
  { league: '5E', name: 'Eastside Eisbären', club: 'TSV Trudering', venues: [TRUDERING], slots: [s(FR, '20:00', '22:00')], contacts: ['Florian A.', 'Amelie H.'] },
  { league: '5E', name: 'InterSteller', club: 'FTM Schwabing', venues: ['Oskar-von-Miller-Gymnasium (2. UG, linke Halle), Karl-Theodor-Str. 9'], slots: [s(MI, '19:00', '21:30')], contacts: ['Philipp S.', 'Lea D.', 'Hagen S.'] },
  { league: '5E', name: 'Ohjooo Thunder', club: 'SG Siemens München Ost', venues: [SIEMENS], slots: [s(DO, '19:30', '21:30')], contacts: ['Zheng L.'] },
  { league: '5E', name: 'Schwarze Hasen', club: 'TSV Großhadern 1926', venues: ['Schulsporthalle Großhaderner Str. 50'], slots: [s(SA, '19:30', '21:00')], contacts: ['Dominik M.'] },
  { league: '5E', name: 'The Specials', club: 'Volleyball-Freunde Isarland', venues: [HAAGER], slots: [s(MO, '20:00', '21:30')], contacts: ['Ingrid H.', 'Claudia F.'] },
  { league: '5E', name: 'Vollpertinger', club: 'ESV München', venues: ['Grundschule Hermine-von-Parish-Str. 15'], slots: [s(DO, '20:45', '23:00')], contacts: ['Tilo K.', 'Marcel B.'] },
]
