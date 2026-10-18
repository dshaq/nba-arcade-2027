// NBA Arcade 2026-27 — Player Database
// Scraped from ESPN Fantasy Basketball 2027 Projections
// Generated: 2026-10-07
// FP/g formula: pts + reb + ast + stl + blk - to

const PLAYERS_DB = [
{n:"Nikola Jokic",t:"DEN",r:1,fpPG:50.1,gp:72,projFP:3607.2},
{n:"Luka Doncic",t:"LAL",r:2,fpPG:48.5,gp:68,projFP:3298},
{n:"Giannis Antetokounmpo",t:"MIA",r:3,fpPG:48,gp:67,projFP:3216},
{n:"Victor Wembanyama",t:"SAS",r:4,fpPG:43.7,gp:67,projFP:2927.9},
{n:"Jalen Johnson",t:"ATL",r:5,fpPG:39.9,gp:72,projFP:2872.8},
{n:"Jayson Tatum",t:"BOS",r:6,fpPG:39.9,gp:70,projFP:2793},
{n:"Anthony Edwards",t:"MIN",r:7,fpPG:38.6,gp:72,projFP:2779.2},
{n:"Cade Cunningham",t:"DET",r:8,fpPG:38.4,gp:69,projFP:2649.6},
{n:"Donovan Mitchell",t:"CLE",r:9,fpPG:36.6,gp:71,projFP:2598.6},
{n:"Domantas Sabonis",t:"SAC",r:10,fpPG:37.5,gp:69,projFP:2587.5},
{n:"Jalen Brunson",t:"NYK",r:11,fpPG:35.7,gp:72,projFP:2570.4},
{n:"Devin Booker",t:"PHX",r:12,fpPG:35.7,gp:72,projFP:2570.4},
{n:"Pascal Siakam",t:"IND",r:13,fpPG:33.8,gp:74,projFP:2501.2},
{n:"Alperen Sengun",t:"HOU",r:14,fpPG:34.4,gp:72,projFP:2476.8},
{n:"Deni Avdija",t:"POR",r:15,fpPG:34.3,gp:72,projFP:2469.6},
{n:"Jalen Duren",t:"DET",r:16,fpPG:34.2,gp:72,projFP:2462.4},
{n:"Bam Adebayo",t:"MIA",r:17,fpPG:33.7,gp:73,projFP:2460.1},
{n:"Trae Young",t:"WAS",r:18,fpPG:34.5,gp:71,projFP:2449.5},
{n:"Cooper Flagg",t:"DAL",r:19,fpPG:34,gp:72,projFP:2448},
{n:"Kevin Durant",t:"HOU",r:20,fpPG:33.8,gp:72,projFP:2433.6},
{n:"Tyrese Maxey",t:"PHI",r:21,fpPG:34.2,gp:71,projFP:2428.2},
{n:"Josh Giddey",t:"OKC",r:22,fpPG:35.3,gp:68,projFP:2400.4},
{n:"Amen Thompson",t:"HOU",r:23,fpPG:30.4,gp:78,projFP:2371.2},
{n:"Anthony Davis",t:"LAL",r:24,fpPG:38.4,gp:61,projFP:2342.4},
{n:"James Harden",t:"LAC",r:25,fpPG:32.1,gp:73,projFP:2343.3},
{n:"Scottie Barnes",t:"TOR",r:26,fpPG:32.5,gp:72,projFP:2340},
{n:"Jamal Murray",t:"DEN",r:27,fpPG:33.2,gp:69,projFP:2290.8},
{n:"Lauri Markkanen",t:"UTA",r:28,fpPG:32.8,gp:69,projFP:2263.2},
{n:"Michael Porter Jr.",t:"DEN",r:29,fpPG:32.7,gp:69,projFP:2256.3},
{n:"Stephen Curry",t:"GSW",r:30,fpPG:33.9,gp:66,projFP:2237.4},
{n:"Kawhi Leonard",t:"LAC",r:31,fpPG:35.2,gp:63,projFP:2217.6},
{n:"Kon Knueppel",t:"BKN",r:32,fpPG:28.4,gp:78,projFP:2215.2},
{n:"Austin Reaves",t:"LAL",r:33,fpPG:32.7,gp:67,projFP:2190.9},
{n:"Evan Mobley",t:"CLE",r:34,fpPG:32.9,gp:66,projFP:2171.4},
{n:"Jalen Williams",t:"OKC",r:35,fpPG:30.8,gp:70,projFP:2156},
{n:"Desmond Bane",t:"MEM",r:36,fpPG:29.6,gp:72,projFP:2131.2},
{n:"Tyrese Haliburton",t:"IND",r:37,fpPG:32.9,gp:64,projFP:2105.6},
{n:"Derrick White",t:"BOS",r:38,fpPG:26.9,gp:77,projFP:2071.3},
{n:"Jarrett Allen",t:"CLE",r:39,fpPG:28.5,gp:71,projFP:2023.5},
{n:"Kyrie Irving",t:"DAL",r:40,fpPG:34,gp:59,projFP:2006},
{n:"Naz Reid",t:"MIN",r:41,fpPG:25.9,gp:76,projFP:1968.4},
{n:"Mikal Bridges",t:"NYK",r:42,fpPG:23.3,gp:82,projFP:1910.6},
{n:"Onyeka Okongwu",t:"ATL",r:43,fpPG:26.3,gp:72,projFP:1893.6},
{n:"Donovan Clingan",t:"POR",r:44,fpPG:25.6,gp:73,projFP:1868.8},
{n:"Dyson Daniels",t:"ATL",r:45,fpPG:24.5,gp:75,projFP:1837.5},
{n:"Matas Buzelis",t:"CHI",r:46,fpPG:25,gp:74,projFP:1850},
{n:"Darryn Peterson",t:"UTA",r:47,fpPG:25.3,gp:73,projFP:1846.9},
{n:"Alex Sarr",t:"WAS",r:48,fpPG:27.9,gp:66,projFP:1841.4},
{n:"Chet Holmgren",t:"OKC",r:49,fpPG:28,gp:65,projFP:1820},
{n:"Jalen Green",t:"PHX",r:50,fpPG:28.3,gp:64,projFP:1811.2},
{n:"Ty Jerome",t:"MEM",r:51,fpPG:28.2,gp:64,projFP:1804.8},
{n:"Darius Acuff Jr.",t:"SAC",r:52,fpPG:24.6,gp:73,projFP:1795.8},
{n:"Derik Queen",t:"NOP",r:53,fpPG:23.2,gp:76,projFP:1763.2},
{n:"Walker Kessler",t:"LAL",r:54,fpPG:27.3,gp:64,projFP:1747.2},
{n:"Nikola Vucevic",t:"ORL",r:55,fpPG:24.2,gp:72,projFP:1742.4},
{n:"Dylan Harper",t:"SAS",r:56,fpPG:24.1,gp:72,projFP:1735.2},
{n:"LeBron James",t:"LAL",r:57,fpPG:30.7,gp:56,projFP:1719.2},
{n:"Shai Gilgeous-Alexander",t:"OKC",r:58,fpPG:38.2,gp:44,projFP:1680.8},
{n:"Jimmy Butler",t:"GSW",r:59,fpPG:29.6,gp:57,projFP:1687.2},
{n:"Zach LaVine",t:"CHI",r:60,fpPG:24.8,gp:68,projFP:1686.4},
{n:"Jaren Jackson Jr.",t:"MEM",r:61,fpPG:28.4,gp:59,projFP:1675.6},
{n:"Karl-Anthony Towns",t:"NYK",r:62,fpPG:27.9,gp:60,projFP:1674},
{n:"OG Anunoby",t:"NYK",r:63,fpPG:22.4,gp:74,projFP:1657.6},
{n:"Jaylen Brown",t:"PHI",r:64,fpPG:23.6,gp:70,projFP:1652},
{n:"Zion Williamson",t:"NOP",r:65,fpPG:32.6,gp:50,projFP:1630},
{n:"Khris Middleton",t:"MIL",r:66,fpPG:24.7,gp:66,projFP:1630.2},
{n:"Andrew Wiggins",t:"GSW",r:67,fpPG:22.4,gp:72,projFP:1612.8},
{n:"Keyonte George",t:"UTA",r:68,fpPG:30.2,gp:62,projFP:1872.4},
{n:"Naz Reid",t:"MIN",r:69,fpPG:25.9,gp:76,projFP:1968.4},
{n:"Ivica Zubac",t:"LAC",r:70,fpPG:25.6,gp:63,projFP:1612.8},
{n:"Tobias Harris",t:"BKN",r:71,fpPG:20.5,gp:78,projFP:1599},
{n:"Miles Bridges",t:"CHA",r:72,fpPG:22.9,gp:69,projFP:1580.1},
{n:"Franz Wagner",t:"ORL",r:73,fpPG:22.4,gp:70,projFP:1568},
{n:"Royce O'Neale",t:"PHX",r:74,fpPG:18,gp:87,projFP:1566},
{n:"Paolo Banchero",t:"ORL",r:75,fpPG:27.4,gp:57,projFP:1561.8},
{n:"Anfernee Simons",t:"POR",r:76,fpPG:23.3,gp:67,projFP:1561.1},
{n:"CJ McCollum",t:"NOP",r:77,fpPG:21.8,gp:71,projFP:1547.8},
{n:"Precious Achiuwa",t:"SAC",r:78,fpPG:18.8,gp:71,projFP:1334.8},
{n:"Joel Embiid",t:"PHI",r:79,fpPG:37.4,gp:41,projFP:1533.4},
{n:"Damian Lillard",t:"POR",r:80,fpPG:25.4,gp:60,projFP:1524},
{n:"Rudy Gobert",t:"MIN",r:81,fpPG:25.1,gp:60,projFP:1506},
{n:"De'Aaron Fox",t:"SAS",r:82,fpPG:26.7,gp:56,projFP:1495.2},
{n:"Chris Paul",t:"BKN",r:83,fpPG:21.7,gp:68,projFP:1475.6},
{n:"Norman Powell",t:"LAC",r:84,fpPG:21.9,gp:67,projFP:1467.3},
{n:"Josh Hart",t:"NYK",r:85,fpPG:22.3,gp:65,projFP:1449.5},
{n:"Jonathan Isaac",t:"ORL",r:86,fpPG:22.8,gp:63,projFP:1436.4},
{n:"RJ Barrett",t:"TOR",r:87,fpPG:22.4,gp:64,projFP:1433.6},
{n:"Tre Jones",t:"SAS",r:88,fpPG:19.4,gp:73,projFP:1416.2},
{n:"Goga Bitadze",t:"ORL",r:89,fpPG:22.1,gp:64,projFP:1414.4},
{n:"Klay Thompson",t:"DAL",r:90,fpPG:18.7,gp:75,projFP:1402.5},
{n:"Draymond Green",t:"GSW",r:91,fpPG:22.1,gp:63,projFP:1392.3},
{n:"Markelle Fultz",t:"ORL",r:92,fpPG:21.5,gp:64,projFP:1376},
{n:"Isaiah Hartenstein",t:"OKC",r:93,fpPG:23.3,gp:59,projFP:1374.7},
{n:"Cameron Johnson",t:"DEN",r:94,fpPG:19.8,gp:68,projFP:1346.4},
{n:"Scoot Henderson",t:"POR",r:95,fpPG:20.4,gp:66,projFP:1346.4},
{n:"Toumani Camara",t:"POR",r:96,fpPG:17.9,gp:75,projFP:1342.5},
{n:"Wendell Carter Jr.",t:"ORL",r:97,fpPG:18.6,gp:72,projFP:1339.2},
{n:"Kyle Kuzma",t:"MIL",r:98,fpPG:19.4,gp:68,projFP:1319.2},
{n:"Morez Johnson Jr.",t:"DAL",r:99,fpPG:18.4,gp:71,projFP:1306.4},
{n:"Danny Wolf",t:"BKN",r:100,fpPG:18.3,gp:71,projFP:1299.3},
{n:"Mitchell Robinson",t:"BOS",r:101,fpPG:21.3,gp:61,projFP:1299.3},
{n:"Deandre Ayton",t:"WAS",r:102,fpPG:20.2,gp:64,projFP:1292.8},
{n:"Yaxel Lendeborg",t:"GSW",r:103,fpPG:18.2,gp:71,projFP:1292.2},
{n:"Dennis Schroder",t:"CHA",r:104,fpPG:17.8,gp:72,projFP:1281.6},
{n:"Brook Lopez",t:"LAC",r:105,fpPG:19.1,gp:67,projFP:1279.7},
{n:"Donte DiVincenzo",t:"MIN",r:106,fpPG:16.2,gp:78,projFP:1263.6},
{n:"Malik Beasley",t:"MEM",r:107,fpPG:18.1,gp:69,projFP:1248.9},
{n:"Nicolas Claxton",t:"BKN",r:108,fpPG:22.1,gp:56,projFP:1237.6},
{n:"Herb Jones",t:"NOP",r:109,fpPG:19.2,gp:64,projFP:1228.8},
{n:"Ochai Agbaji",t:"TOR",r:110,fpPG:16.8,gp:73,projFP:1226.4},
{n:"Tari Eason",t:"HOU",r:111,fpPG:18.7,gp:65,projFP:1215.5},
{n:"Nickeil Alexander-Walker",t:"PHI",r:112,fpPG:18.2,gp:66,projFP:1201.2},
{n:"Jalen Suggs",t:"ORL",r:113,fpPG:19.7,gp:61,projFP:1201.7},
{n:"Bogdan Bogdanovic",t:"ATL",r:114,fpPG:16.9,gp:71,projFP:1199.9},
{n:"Marcus Smart",t:"MEM",r:115,fpPG:18.3,gp:65,projFP:1189.5},
{n:"Aaron Gordon",t:"DEN",r:116,fpPG:17.4,gp:68,projFP:1183.2},
{n:"Kristaps Porzingis",t:"BOS",r:117,fpPG:23.1,gp:51,projFP:1178.1},
{n:"Julius Randle",t:"MIN",r:118,fpPG:19.5,gp:60,projFP:1170},
{n:"Luguentz Dort",t:"OKC",r:119,fpPG:15.9,gp:73,projFP:1160.7},
{n:"Victor Oladipo",t:"MIA",r:120,fpPG:18.8,gp:61,projFP:1146.8},
{n:"Caris LeVert",t:"CLE",r:121,fpPG:17.8,gp:64,projFP:1139.2},
{n:"P.J. Washington",t:"DAL",r:122,fpPG:16.8,gp:67,projFP:1125.6},
{n:"Quentin Grimes",t:"PHI",r:123,fpPG:16.5,gp:68,projFP:1122},
{n:"Max Strus",t:"CLE",r:124,fpPG:14.8,gp:75,projFP:1110},
{n:"Malaki Branham",t:"SAS",r:125,fpPG:17.2,gp:64,projFP:1100.8},
{n:"Bilal Coulibaly",t:"WAS",r:126,fpPG:16,gp:68,projFP:1088},
{n:"Jaime Jaquez Jr.",t:"MIA",r:127,fpPG:16.3,gp:66,projFP:1075.8},
{n:"Shaedon Sharpe",t:"POR",r:128,fpPG:17.4,gp:61,projFP:1061.4},
{n:"Jeremy Sochan",t:"SAS",r:129,fpPG:15.5,gp:68,projFP:1054},
{n:"Reggie Jackson",t:"BKN",r:130,fpPG:14.8,gp:71,projFP:1050.8},
{n:"Jabari Smith Jr.",t:"HOU",r:131,fpPG:15.5,gp:67,projFP:1038.5},
{n:"Sam Hauser",t:"BOS",r:132,fpPG:14,gp:74,projFP:1036},
{n:"Jalen Smith",t:"IND",r:133,fpPG:16.2,gp:64,projFP:1036.8},
{n:"Richaun Holmes",t:"SAC",r:134,fpPG:14.6,gp:70,projFP:1022},
{n:"Isaiah Jackson",t:"LAC",r:135,fpPG:15.1,gp:67,projFP:1011.7},
{n:"Andre Drummond",t:"NYK",r:136,fpPG:16.7,gp:60,projFP:1002},
{n:"Vit Krejci",t:"POR",r:137,fpPG:15.3,gp:65,projFP:994.5},
{n:"Ryan Dunn",t:"PHX",r:138,fpPG:14,gp:71,projFP:994},
{n:"Harrison Barnes",t:"SAS",r:139,fpPG:12.4,gp:80,projFP:992},
{n:"Jaylin Williams",t:"OKC",r:140,fpPG:14.8,gp:67,projFP:991.6},
{n:"Al Horford",t:"GSW",r:141,fpPG:17.7,gp:56,projFP:991.2},
{n:"Gui Santos",t:"GSW",r:142,fpPG:15,gp:66,projFP:990},
{n:"Luke Kennard",t:"PHX",r:143,fpPG:13.3,gp:74,projFP:984.2},
{n:"Kasparas Jakucionis",t:"MIL",r:144,fpPG:14.3,gp:68,projFP:972.4},
{n:"Herbert Jones",t:"NOP",r:145,fpPG:15.2,gp:63,projFP:957.6},
{n:"Ziaire Williams",t:"LAL",r:146,fpPG:14.6,gp:65,projFP:949},
{n:"Kris Dunn",t:"LAC",r:147,fpPG:12.6,gp:75,projFP:945},
{n:"Jordan Walsh",t:"BOS",r:148,fpPG:14.7,gp:64,projFP:940.8},
{n:"Keldon Johnson",t:"SAS",r:149,fpPG:13.4,gp:70,projFP:938},
{n:"Kyle Lowry",t:"PHI",r:150,fpPG:13.1,gp:71,projFP:930.1},
// ── 2025 DRAFT CLASS ROOKIES (projected; no BDL history yet) ──────────────────
{n:"Ace Bailey",t:"UTA",r:151,fpPG:28.5,gp:72,projFP:2052},
{n:"Tre Johnson",t:"WAS",r:152,fpPG:21.8,gp:72,projFP:1569.6},
{n:"V.J. Edgecombe",t:"PHI",r:153,fpPG:18.2,gp:72,projFP:1310.4},
{n:"Khaman Maluach",t:"PHX",r:154,fpPG:18.8,gp:72,projFP:1353.6},
{n:"Jeremiah Fears",t:"NOP",r:155,fpPG:15.5,gp:72,projFP:1116},
{n:"Noa Essengue",t:"CHI",r:156,fpPG:15.8,gp:72,projFP:1137.6},
{n:"Egor Demin",t:"BKN",r:157,fpPG:15.9,gp:72,projFP:1144.8},
{n:"Zaccharie Risacher",t:"DAL",r:158,fpPG:14.2,gp:72,projFP:1022.4},
{n:"Liam McNeeley",t:"CHA",r:159,fpPG:10.8,gp:72,projFP:777.6},
// ── 2026 DRAFT CLASS ROOKIES ─────────────────────────────────────────────────
// Projections sourced from Fadeaway World / Yahoo Sports pre-season consensus.
// FP/G = pts+reb+ast+stl+blk - missedFG(38%) - missedFT(18%) - TO(10% of pts)
// Note: players already listed above (Darryn Peterson, Darius Acuff Jr., Yaxel Lendeborg,
// Morez Johnson Jr.) have live ESPN projections earlier in the list; omitted here.
// R1 picks 1-30 (excluding duplicates)
{n:"AJ Dybantsa",t:"WAS",r:160,fpPG:24.7,gp:72,projFP:1778.4},
{n:"Cameron Boozer",t:"MEM",r:162,fpPG:26.4,gp:72,projFP:1900.8},
{n:"Caleb Wilson",t:"CHI",r:163,fpPG:22.7,gp:72,projFP:1634.4},
{n:"Keaton Wagner",t:"LAC",r:164,fpPG:17.1,gp:72,projFP:1231.2},
{n:"Mikel Brown Jr.",t:"BKN",r:165,fpPG:18.7,gp:72,projFP:1346.4},
{n:"Kingston Flemmings",t:"ATL",r:167,fpPG:12.9,gp:72,projFP:928.8},
{n:"Brayden Burries",t:"MIL",r:169,fpPG:16.9,gp:72,projFP:1216.8},
{n:"Aday Mara",t:"OKC",r:171,fpPG:11.9,gp:72,projFP:856.8},
{n:"Nate Ament",t:"MIL",r:172,fpPG:14.7,gp:72,projFP:1058.4},
{n:"Hannes Steinbach",t:"CHA",r:173,fpPG:12.7,gp:72,projFP:914.4},
{n:"Dailyn Swain",t:"CHI",r:174,fpPG:12.7,gp:72,projFP:914.4},
{n:"Bennett Stirtz",t:"OKC",r:175,fpPG:12.2,gp:72,projFP:878.4},
{n:"Ebuka Okorie",t:"DET",r:176,fpPG:11.1,gp:72,projFP:799.2},
{n:"Christian Anderson Jr.",t:"CHA",r:177,fpPG:11.0,gp:72,projFP:792.0},
{n:"Allen Graves",t:"TOR",r:178,fpPG:12.8,gp:72,projFP:921.6},
{n:"Jayden Quaintance",t:"SAS",r:179,fpPG:17.4,gp:72,projFP:1252.8},
{n:"Karim Lopez",t:"MEM",r:180,fpPG:11.6,gp:72,projFP:835.2},
{n:"Labaron Philon Jr.",t:"PHI",r:181,fpPG:12.4,gp:72,projFP:892.8},
{n:"Zuby Ejiofor",t:"ATL",r:182,fpPG:12.5,gp:72,projFP:900.0},
{n:"Cameron Carr",t:"NYK",r:183,fpPG:10.5,gp:72,projFP:756.0},
{n:"Sergio De Larrea",t:"LAL",r:184,fpPG:9.5,gp:72,projFP:684.0},
{n:"Tarris Reed Jr.",t:"SAS",r:185,fpPG:15.4,gp:72,projFP:1108.8},
{n:"Chris Cenac Jr.",t:"BOS",r:186,fpPG:11.1,gp:72,projFP:799.2},
{n:"Joshua Jefferson",t:"BKN",r:187,fpPG:12.4,gp:72,projFP:892.8},
{n:"Alex Karaban",t:"SAC",r:188,fpPG:11.1,gp:72,projFP:799.2},
{n:"Koa Peat",t:"DAL",r:189,fpPG:11.6,gp:72,projFP:835.2},
// R2 notable rookies
{n:"Braden Smith",t:"CHI",r:190,fpPG:16.1,gp:72,projFP:1159.2},
{n:"Ja'Kobi Gillespie",t:"SAS",r:191,fpPG:12.9,gp:72,projFP:928.8},
{n:"Felix Okpara",t:"WAS",r:192,fpPG:14.6,gp:72,projFP:1051.2},
{n:"Jaden Bradley",t:"TOR",r:193,fpPG:12.4,gp:72,projFP:892.8},
{n:"Otega Oweh",t:"MIA",r:194,fpPG:12.5,gp:72,projFP:900.0},
];

// Helper: get player by name
function getPlayerByName(name) {
  return PLAYERS_DB.find(p => p.n === name) || null;
}

// Helper: get players by team
function getPlayersByTeam(teamCode) {
  return PLAYERS_DB.filter(p => p.t === teamCode);
}

// Helper: get top N players from a list by projected FP/g
function getTopPlayers(playerList, n) {
  return [...playerList].sort((a, b) => b.fpPG - a.fpPG).slice(0, n);
}

// Assign tiers to a 25-player pool based on fpPG rank within the pool
// Top 5 = $5, next 5 = $4, ..., bottom 5 = $1
function assignTiers(pool25) {
  const sorted = [...pool25].sort((a, b) => b.fpPG - a.fpPG);
  return sorted.map((p, i) => ({
    ...p,
    tier: 5 - Math.floor(i / 5),
    salary: 5 - Math.floor(i / 5)
  }));
}

// Team divisions / conferences for theme generation
const NBA_DIVISIONS = {
  'Atlantic':   ['BOS','BKN','NY','PHI','TOR'],
  'Central':    ['CHI','CLE','DET','IND','MIL'],
  'Southeast':  ['ATL','CHA','MIA','ORL','WSH'],
  'Northwest':  ['DEN','MIN','OKC','POR','UTAH'],
  'Pacific':    ['GS','LAC','LAL','PHX','SAC'],
  'Southwest':  ['DAL','HOU','MEM','NO','SA'],
};
const NBA_CONFERENCES = {
  'East': ['BOS','BKN','NY','PHI','TOR','CHI','CLE','DET','IND','MIL','ATL','CHA','MIA','ORL','WSH'],
  'West': ['DEN','MIN','OKC','POR','UTAH','GS','LAC','LAL','PHX','SAC','DAL','HOU','MEM','NO','SA'],
};

// Draft class approximations (for theme pools)
const DRAFT_CLASS = {
  2022: ['Chet Holmgren','Jabari Smith Jr.','Jaden Ivey','Dyson Daniels','Jalen Duren','Shaedon Sharpe','Ochai Agbaji','Jeremy Sochan','Tari Eason','Nikola Jovic'],
  2023: ['Victor Wembanyama','Brandon Miller','Scoot Henderson','Amen Thompson','Ausar Thompson','Anthony Black','Alex Sarr','Bilal Coulibaly','Jaime Jaquez Jr.','Dereck Lively II'],
  2024: ['Zaccharie Risacher','Alex Sarr','Reed Sheppard','Stephon Castle','Ron Holland','Donovan Clingan','Tidjane Salaun','Dalton Knecht','Rob Dillingham','Zach Edey'],
  2025: ['Cooper Flagg','Ace Bailey','Dylan Harper','Kon Knueppel','Matas Buzelis','Darryn Peterson','Darius Acuff Jr.','Derik Queen','Tre Johnson','V.J. Edgecombe','Khaman Maluach','Jeremiah Fears','Noa Essengue','Egor Demin','Zaccharie Risacher','Liam McNeeley'],
  2026: ['AJ Dybantsa','Cameron Boozer','Caleb Wilson','Jayden Quaintance','Tarris Reed Jr.','Aday Mara','Yaxel Lendeborg','Brayden Burries','Alex Karaban','Joshua Jefferson','Koa Peat','Bennett Stirtz','Karim Lopez','Labaron Philon Jr.','Darryn Peterson','Darius Acuff Jr.','Mikel Brown Jr.','Kingston Flemmings','Morez Johnson Jr.','Nate Ament','Keaton Wagner','Braden Smith','Felix Okpara','Jayden Quaintance','Otega Oweh'],
};

// Veteran threshold (years in league, approximate)
const VETERANS = ['LeBron James','Stephen Curry','Kevin Durant','James Harden','Chris Paul','Kawhi Leonard','Klay Thompson','Draymond Green','Kyrie Irving','Al Horford','Brook Lopez','Nikola Vucevic','Kyle Lowry'];
