// NBA ARCADE 2026-27 — v1.0
// Fresh build for new season

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ipsngddnavymcmfbbcxu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc25nZGRuYXZ5bWNtZmJiY3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDk3NDMsImV4cCI6MjA5MTc4NTc0M30.0MmQn49Y0FCn3r8GFI5XspZR12YwGWTcTbv765VoJEQ';
const LEAGUE_KEY    = 'nba-arcade-2027';
const PORTRAITS_KEY = 'nba-portraits-2027';
const INVITE_CODE   = 'HOOPTIME27';  // commissioner sets this
const COMMISSIONER_EMAIL = 'daveschachter@gmail.com';

// Roster rules
const ROSTER_SIZE   = 10;
const ACTIVE_SIZE   = 8;
const INACTIVE_SIZE = 2;
const WAIVER_WEEKLY = 3;

// Runs / mini-seasons
const RUNS = [
  { id:1, name:'Fall',   start:'2026-10-20', end:'2026-12-25', color:'#f5a623' },
  { id:2, name:'Winter', start:'2026-12-26', end:'2027-02-18', color:'#4a9eff' },
  { id:3, name:'Spring', start:'2027-02-25', end:'2027-04-11', color:'#00d4aa' },
  { id:4, name:'Summer', start:'2027-04-13', end:'2027-06-30', color:'#e94560' },
];

// Avatar colors per manager
const AVATAR_COLORS = ['#00ff88','#fec419','#ff6600','#ff3366','#2cb50d','#cc44ff',
                       '#4a9eff','#e94560','#f5a623','#7b2fff'];

// ── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── APP STATE ───────────────────────────────────────────────────────────────
let currentUser    = null;   // Supabase user object
let myProfile      = null;   // row from managers table
let leagueState    = null;   // main league data
let playerPortraits= {};     // {playerName: dataURL}
let liveStats      = {};     // {pid: {fp, pts, reb, ast, stl, blk, to, live}}
let livePolling    = null;
let liveActive     = false;
let currentScreen  = 'home';
let currentRun     = 1;

// ── PLAYER DATABASE ─────────────────────────────────────────────────────────
// 2026-27 NBA rosters — top ~300 fantasy-relevant players
// Format: {id, name, pos, team, ppg, rpg, apg, spg, bpg}
const PLAYERS = [
  // Atlanta Hawks
  {id:101,name:"Trae Young",pos:"PG",team:"ATL",ppg:26.3,rpg:3.3,apg:10.8,spg:1.1,bpg:0.2},
  {id:102,name:"Jalen Johnson",pos:"SF/PF",team:"ATL",ppg:19.8,rpg:8.2,apg:4.1,spg:1.3,bpg:0.7},
  {id:103,name:"Dyson Daniels",pos:"SG/SF",team:"ATL",ppg:16.2,rpg:5.4,apg:3.2,spg:2.7,bpg:0.4},
  {id:104,name:"Clint Capela",pos:"C",team:"ATL",ppg:12.1,rpg:12.3,apg:1.1,spg:0.7,bpg:1.3},
  {id:105,name:"Bogdan Bogdanovic",pos:"SG",team:"ATL",ppg:13.4,rpg:3.1,apg:2.8,spg:0.8,bpg:0.2},
  // Boston Celtics
  {id:201,name:"Jayson Tatum",pos:"SF/PF",team:"BOS",ppg:26.9,rpg:8.1,apg:4.9,spg:1.1,bpg:0.6},
  {id:202,name:"Jaylen Brown",pos:"SG/SF",team:"BOS",ppg:23.0,rpg:5.5,apg:3.6,spg:1.1,bpg:0.5},
  {id:203,name:"Derrick White",pos:"PG/SG",team:"BOS",ppg:15.3,rpg:4.2,apg:4.4,spg:1.0,bpg:1.0},
  {id:204,name:"Payton Pritchard",pos:"PG",team:"BOS",ppg:15.4,rpg:3.2,apg:4.6,spg:0.8,bpg:0.2},
  {id:205,name:"Kristaps Porzingis",pos:"C/PF",team:"BOS",ppg:19.7,rpg:7.2,apg:2.0,spg:0.8,bpg:1.9},
  {id:206,name:"Al Horford",pos:"PF/C",team:"BOS",ppg:9.2,rpg:6.4,apg:2.8,spg:0.6,bpg:1.1},
  {id:207,name:"Sam Hauser",pos:"SF/SG",team:"BOS",ppg:11.8,rpg:3.8,apg:1.8,spg:0.5,bpg:0.3},
  // Brooklyn Nets
  {id:301,name:"Cam Thomas",pos:"SG",team:"BKN",ppg:22.8,rpg:3.4,apg:4.0,spg:0.9,bpg:0.3},
  {id:302,name:"Ziaire Williams",pos:"SF",team:"BKN",ppg:14.2,rpg:4.1,apg:2.5,spg:0.9,bpg:0.5},
  {id:303,name:"Ben Simmons",pos:"PG/SF",team:"BKN",ppg:7.8,rpg:6.1,apg:6.0,spg:1.3,bpg:0.4},
  // Charlotte Hornets
  {id:401,name:"LaMelo Ball",pos:"PG",team:"CHA",ppg:23.4,rpg:5.7,apg:8.0,spg:1.5,bpg:0.4},
  {id:402,name:"Brandon Miller",pos:"SF/SG",team:"CHA",ppg:18.1,rpg:4.3,apg:2.6,spg:1.1,bpg:0.4},
  {id:403,name:"Miles Bridges",pos:"SF/PF",team:"CHA",ppg:20.2,rpg:7.0,apg:3.5,spg:1.0,bpg:0.5},
  // Chicago Bulls
  {id:501,name:"Zach LaVine",pos:"SG/SF",team:"CHI",ppg:22.6,rpg:4.6,apg:4.4,spg:0.9,bpg:0.4},
  {id:502,name:"Coby White",pos:"PG/SG",team:"CHI",ppg:19.2,rpg:3.8,apg:4.3,spg:1.0,bpg:0.2},
  {id:503,name:"Nikola Vucevic",pos:"C",team:"CHI",ppg:17.8,rpg:11.9,apg:3.7,spg:0.7,bpg:0.8},
  // Cleveland Cavaliers
  {id:601,name:"Donovan Mitchell",pos:"SG/PG",team:"CLE",ppg:26.1,rpg:4.4,apg:5.3,spg:1.6,bpg:0.4},
  {id:602,name:"Darius Garland",pos:"PG",team:"CLE",ppg:21.4,rpg:2.8,apg:7.8,spg:1.1,bpg:0.2},
  {id:603,name:"Evan Mobley",pos:"PF/C",team:"CLE",ppg:18.0,rpg:9.4,apg:3.2,spg:1.3,bpg:2.0},
  {id:604,name:"Jarrett Allen",pos:"C",team:"CLE",ppg:14.2,rpg:11.5,apg:1.7,spg:0.7,bpg:1.3},
  {id:605,name:"Max Strus",pos:"SG/SF",team:"CLE",ppg:13.4,rpg:4.2,apg:2.6,spg:0.9,bpg:0.3},
  // Dallas Mavericks
  {id:701,name:"Luka Doncic",pos:"PG/SF",team:"DAL",ppg:28.7,rpg:8.6,apg:8.7,spg:1.4,bpg:0.5},
  {id:702,name:"Kyrie Irving",pos:"PG",team:"DAL",ppg:24.1,rpg:5.0,apg:5.2,spg:1.3,bpg:0.5},
  {id:703,name:"P.J. Washington",pos:"PF",team:"DAL",ppg:14.2,rpg:6.8,apg:1.8,spg:0.8,bpg:0.8},
  {id:704,name:"Dereck Lively II",pos:"C",team:"DAL",ppg:10.2,rpg:8.2,apg:1.8,spg:0.5,bpg:1.4},
  // Denver Nuggets
  {id:801,name:"Nikola Jokic",pos:"C",team:"DEN",ppg:26.4,rpg:12.4,apg:9.0,spg:1.4,bpg:0.9},
  {id:802,name:"Jamal Murray",pos:"PG",team:"DEN",ppg:21.2,rpg:4.2,apg:6.5,spg:1.2,bpg:0.3},
  {id:803,name:"Michael Porter Jr.",pos:"SF/PF",team:"DEN",ppg:17.0,rpg:7.0,apg:1.4,spg:0.6,bpg:0.4},
  {id:804,name:"Aaron Gordon",pos:"PF/SF",team:"DEN",ppg:13.9,rpg:6.5,apg:3.4,spg:0.9,bpg:0.6},
  // Detroit Pistons
  {id:901,name:"Cade Cunningham",pos:"PG",team:"DET",ppg:25.7,rpg:5.5,apg:9.2,spg:1.5,bpg:0.5},
  {id:902,name:"Jalen Duren",pos:"C",team:"DET",ppg:14.5,rpg:13.1,apg:2.0,spg:0.6,bpg:1.4},
  {id:903,name:"Ausar Thompson",pos:"SF",team:"DET",ppg:16.4,rpg:6.7,apg:3.3,spg:2.2,bpg:0.8},
  {id:904,name:"Tim Hardaway Jr.",pos:"SG",team:"DET",ppg:12.3,rpg:2.4,apg:1.9,spg:0.7,bpg:0.2},
  // Golden State Warriors
  {id:1001,name:"Stephen Curry",pos:"PG",team:"GSW",ppg:26.4,rpg:4.5,apg:5.1,spg:1.4,bpg:0.4},
  {id:1002,name:"Draymond Green",pos:"PF",team:"GSW",ppg:9.0,rpg:7.2,apg:6.9,spg:1.0,bpg:0.8},
  {id:1003,name:"Andrew Wiggins",pos:"SF/SG",team:"GSW",ppg:17.2,rpg:4.8,apg:2.1,spg:0.9,bpg:0.8},
  {id:1004,name:"Jonathan Kuminga",pos:"SF/PF",team:"GSW",ppg:16.1,rpg:4.5,apg:2.5,spg:0.8,bpg:0.5},
  {id:1005,name:"Brandin Podziemski",pos:"SG/PG",team:"GSW",ppg:12.9,rpg:5.4,apg:3.8,spg:1.2,bpg:0.2},
  // Houston Rockets
  {id:1101,name:"Alperen Sengun",pos:"C",team:"HOU",ppg:21.1,rpg:9.3,apg:5.0,spg:0.9,bpg:1.5},
  {id:1102,name:"Jalen Green",pos:"SG",team:"HOU",ppg:22.5,rpg:4.2,apg:3.6,spg:1.0,bpg:0.4},
  {id:1103,name:"Amen Thompson",pos:"SF/PF",team:"HOU",ppg:16.2,rpg:8.3,apg:4.0,spg:1.8,bpg:0.7},
  {id:1104,name:"Fred VanVleet",pos:"PG",team:"HOU",ppg:14.1,rpg:3.7,apg:7.8,spg:1.3,bpg:0.3},
  {id:1105,name:"Dillon Brooks",pos:"SF/SG",team:"HOU",ppg:14.7,rpg:3.4,apg:2.0,spg:1.3,bpg:0.4},
  // Indiana Pacers
  {id:1201,name:"Tyrese Haliburton",pos:"PG",team:"IND",ppg:20.1,rpg:4.0,apg:10.9,spg:1.3,bpg:0.4},
  {id:1202,name:"Pascal Siakam",pos:"PF/SF",team:"IND",ppg:21.3,rpg:6.9,apg:3.9,spg:1.1,bpg:0.7},
  {id:1203,name:"Myles Turner",pos:"C",team:"IND",ppg:15.4,rpg:7.0,apg:1.5,spg:0.7,bpg:2.6},
  {id:1204,name:"Andrew Nembhard",pos:"PG/SG",team:"IND",ppg:12.9,rpg:3.7,apg:5.1,spg:1.1,bpg:0.3},
  {id:1205,name:"Bennedict Mathurin",pos:"SG/SF",team:"IND",ppg:16.8,rpg:4.6,apg:1.8,spg:0.7,bpg:0.3},
  // LA Clippers
  {id:1301,name:"Kawhi Leonard",pos:"SF",team:"LAC",ppg:20.1,rpg:6.2,apg:3.5,spg:1.7,bpg:0.8},
  {id:1302,name:"James Harden",pos:"PG/SG",team:"LAC",ppg:20.4,rpg:5.7,apg:8.5,spg:1.2,bpg:0.5},
  {id:1303,name:"Norman Powell",pos:"SG/SF",team:"LAC",ppg:18.6,rpg:3.5,apg:2.2,spg:1.1,bpg:0.3},
  {id:1304,name:"Ivica Zubac",pos:"C",team:"LAC",ppg:11.8,rpg:11.3,apg:2.2,spg:0.5,bpg:1.2},
  // LA Lakers
  {id:1401,name:"LeBron James",pos:"SF/PF",team:"LAL",ppg:25.7,rpg:7.3,apg:8.3,spg:1.3,bpg:0.5},
  {id:1402,name:"Anthony Davis",pos:"PF/C",team:"LAL",ppg:24.7,rpg:12.6,apg:3.5,spg:1.2,bpg:2.3},
  {id:1403,name:"Austin Reaves",pos:"SG/PG",team:"LAL",ppg:18.5,rpg:4.0,apg:5.5,spg:1.0,bpg:0.3},
  {id:1404,name:"D'Angelo Russell",pos:"PG",team:"LAL",ppg:15.1,rpg:2.8,apg:6.2,spg:0.8,bpg:0.2},
  {id:1405,name:"Rui Hachimura",pos:"PF/SF",team:"LAL",ppg:13.5,rpg:4.3,apg:1.5,spg:0.6,bpg:0.5},
  {id:1406,name:"Bronny James",pos:"SG/PG",team:"LAL",ppg:8.2,rpg:2.4,apg:2.6,spg:0.8,bpg:0.3},
  // Memphis Grizzlies
  {id:1501,name:"Ja Morant",pos:"PG",team:"MEM",ppg:25.1,rpg:5.6,apg:8.1,spg:1.0,bpg:0.5},
  {id:1502,name:"Desmond Bane",pos:"SG/SF",team:"MEM",ppg:21.5,rpg:4.1,apg:4.1,spg:1.1,bpg:0.2},
  {id:1503,name:"Jaren Jackson Jr.",pos:"PF/C",team:"MEM",ppg:22.0,rpg:5.8,apg:2.3,spg:0.9,bpg:3.0},
  {id:1504,name:"Marcus Smart",pos:"PG/SG",team:"MEM",ppg:12.1,rpg:3.4,apg:5.4,spg:1.8,bpg:0.3},
  // Miami Heat
  {id:1601,name:"Jimmy Butler",pos:"SF/PF",team:"MIA",ppg:20.8,rpg:5.3,apg:5.0,spg:1.8,bpg:0.4},
  {id:1602,name:"Bam Adebayo",pos:"C/PF",team:"MIA",ppg:19.3,rpg:10.4,apg:3.9,spg:1.2,bpg:0.9},
  {id:1603,name:"Tyler Herro",pos:"SG/PG",team:"MIA",ppg:20.8,rpg:5.1,apg:4.5,spg:1.0,bpg:0.3},
  {id:1604,name:"Jaime Jaquez Jr.",pos:"SF/SG",team:"MIA",ppg:13.4,rpg:4.8,apg:2.9,spg:0.9,bpg:0.3},
  // Milwaukee Bucks
  {id:1701,name:"Giannis Antetokounmpo",pos:"PF/C",team:"MIL",ppg:30.4,rpg:11.5,apg:6.5,spg:1.2,bpg:1.1},
  {id:1702,name:"Damian Lillard",pos:"PG",team:"MIL",ppg:24.3,rpg:4.4,apg:7.0,spg:0.9,bpg:0.3},
  {id:1703,name:"Khris Middleton",pos:"SF/PF",team:"MIL",ppg:14.8,rpg:5.0,apg:4.2,spg:0.9,bpg:0.4},
  {id:1704,name:"Brook Lopez",pos:"C",team:"MIL",ppg:14.3,rpg:5.4,apg:2.4,spg:0.6,bpg:2.5},
  // Minnesota Timberwolves
  {id:1801,name:"Julius Randle",pos:"PF",team:"MIN",ppg:22.0,rpg:8.8,apg:4.2,spg:0.8,bpg:0.4},
  {id:1802,name:"Anthony Edwards",pos:"SG/SF",team:"MIN",ppg:25.9,rpg:5.4,apg:5.1,spg:1.3,bpg:0.5},
  {id:1803,name:"Rudy Gobert",pos:"C",team:"MIN",ppg:13.1,rpg:11.4,apg:1.7,spg:0.8,bpg:2.1},
  {id:1804,name:"Mike Conley",pos:"PG",team:"MIN",ppg:10.5,rpg:2.8,apg:5.2,spg:1.1,bpg:0.2},
  {id:1805,name:"Jaden McDaniels",pos:"SF/PF",team:"MIN",ppg:14.0,rpg:4.1,apg:1.7,spg:1.3,bpg:0.9},
  // New Orleans Pelicans
  {id:1901,name:"Zion Williamson",pos:"PF/C",team:"NOP",ppg:22.9,rpg:5.8,apg:4.7,spg:1.1,bpg:0.6},
  {id:1902,name:"CJ McCollum",pos:"SG/PG",team:"NOP",ppg:19.4,rpg:4.3,apg:5.7,spg:0.9,bpg:0.3},
  {id:1903,name:"Brandon Ingram",pos:"SF/PF",team:"NOP",ppg:20.8,rpg:5.7,apg:5.2,spg:0.9,bpg:0.5},
  {id:1904,name:"Herb Jones",pos:"SF/SG",team:"NOP",ppg:10.8,rpg:4.5,apg:2.0,spg:1.9,bpg:0.7},
  // New York Knicks
  {id:2001,name:"Jalen Brunson",pos:"PG",team:"NYK",ppg:28.7,rpg:3.6,apg:6.7,spg:0.9,bpg:0.2},
  {id:2002,name:"OG Anunoby",pos:"SF",team:"NYK",ppg:15.3,rpg:5.1,apg:1.9,spg:1.8,bpg:0.8},
  {id:2003,name:"Mikal Bridges",pos:"SF/SG",team:"NYK",ppg:19.6,rpg:4.5,apg:3.1,spg:1.1,bpg:0.5},
  {id:2004,name:"Karl-Anthony Towns",pos:"C/PF",team:"NYK",ppg:22.1,rpg:9.1,apg:3.3,spg:0.8,bpg:0.7},
  {id:2006,name:"Josh Hart",pos:"SF/SG",team:"NYK",ppg:12.1,rpg:8.9,apg:4.2,spg:1.1,bpg:0.3},
  {id:2007,name:"Donte DiVincenzo",pos:"SG",team:"NYK",ppg:14.3,rpg:4.3,apg:2.7,spg:1.1,bpg:0.2},
  // Oklahoma City Thunder
  {id:2101,name:"Shai Gilgeous-Alexander",pos:"PG/SG",team:"OKC",ppg:30.1,rpg:5.5,apg:6.2,spg:2.0,bpg:0.9},
  {id:2102,name:"Jalen Williams",pos:"SG/SF",team:"OKC",ppg:22.9,rpg:4.7,apg:6.0,spg:1.3,bpg:0.6},
  {id:2103,name:"Chet Holmgren",pos:"PF/C",team:"OKC",ppg:18.2,rpg:7.9,apg:2.2,spg:0.9,bpg:2.3},
  {id:2104,name:"Luguentz Dort",pos:"SG/SF",team:"OKC",ppg:12.5,rpg:3.8,apg:1.6,spg:1.2,bpg:0.3},
  {id:2105,name:"Isaiah Hartenstein",pos:"C",team:"OKC",ppg:8.7,rpg:9.5,apg:3.5,spg:0.8,bpg:1.1},
  // Orlando Magic
  {id:2201,name:"Paolo Banchero",pos:"PF/SF",team:"ORL",ppg:22.6,rpg:6.9,apg:5.4,spg:1.0,bpg:0.7},
  {id:2202,name:"Franz Wagner",pos:"SF/PF",team:"ORL",ppg:19.7,rpg:5.2,apg:3.6,spg:0.9,bpg:0.5},
  {id:2203,name:"Jalen Suggs",pos:"PG/SG",team:"ORL",ppg:13.1,rpg:3.8,apg:5.7,spg:1.5,bpg:0.4},
  {id:2204,name:"Wendell Carter Jr.",pos:"C",team:"ORL",ppg:11.2,rpg:8.3,apg:2.6,spg:0.6,bpg:0.9},
  {id:2205,name:"Cole Anthony",pos:"PG",team:"ORL",ppg:13.6,rpg:3.8,apg:5.0,spg:0.9,bpg:0.2},
  // Philadelphia 76ers
  {id:2301,name:"Joel Embiid",pos:"C",team:"PHI",ppg:34.7,rpg:11.0,apg:5.6,spg:1.2,bpg:1.7},
  {id:2302,name:"Paul George",pos:"SF/SG",team:"PHI",ppg:21.2,rpg:5.5,apg:3.7,spg:1.7,bpg:0.7},
  {id:2303,name:"Tyrese Maxey",pos:"PG",team:"PHI",ppg:25.9,rpg:3.7,apg:6.2,spg:1.0,bpg:0.5},
  {id:2304,name:"Andre Drummond",pos:"C",team:"PHI",ppg:9.8,rpg:11.2,apg:1.2,spg:0.8,bpg:1.1},
  {id:2305,name:"Kyle Lowry",pos:"PG",team:"PHI",ppg:8.2,rpg:3.8,apg:5.6,spg:1.0,bpg:0.2},
  // Phoenix Suns
  {id:2401,name:"Kevin Durant",pos:"SF/PF",team:"PHX",ppg:27.1,rpg:6.6,apg:5.0,spg:0.9,bpg:1.2},
  {id:2402,name:"Bradley Beal",pos:"SG",team:"PHX",ppg:18.2,rpg:4.0,apg:5.0,spg:0.9,bpg:0.3},
  {id:2403,name:"Devin Booker",pos:"SG/PG",team:"PHX",ppg:27.1,rpg:4.5,apg:6.9,spg:1.2,bpg:0.4},
  {id:2404,name:"Jusuf Nurkic",pos:"C",team:"PHX",ppg:11.6,rpg:10.5,apg:3.3,spg:0.8,bpg:0.7},
  {id:2405,name:"Grayson Allen",pos:"SG",team:"PHX",ppg:10.4,rpg:2.8,apg:1.7,spg:0.8,bpg:0.2},
  // Portland Trail Blazers
  {id:2501,name:"Scoot Henderson",pos:"PG",team:"POR",ppg:16.9,rpg:4.3,apg:6.1,spg:1.1,bpg:0.3},
  {id:2502,name:"Jerami Grant",pos:"SF/PF",team:"POR",ppg:16.5,rpg:4.3,apg:1.9,spg:1.2,bpg:0.8},
  {id:2503,name:"Deandre Ayton",pos:"C",team:"POR",ppg:16.0,rpg:10.0,apg:1.8,spg:0.7,bpg:0.9},
  {id:2504,name:"Malcolm Brogdon",pos:"PG/SG",team:"POR",ppg:14.4,rpg:4.2,apg:5.2,spg:0.9,bpg:0.3},
  // Sacramento Kings
  {id:2601,name:"De'Aaron Fox",pos:"PG",team:"SAC",ppg:25.2,rpg:4.1,apg:6.1,spg:1.5,bpg:0.4},
  {id:2602,name:"Domantas Sabonis",pos:"C/PF",team:"SAC",ppg:19.9,rpg:13.8,apg:8.0,spg:0.9,bpg:0.4},
  {id:2603,name:"Keegan Murray",pos:"SF/PF",team:"SAC",ppg:15.5,rpg:4.5,apg:1.9,spg:0.7,bpg:0.5},
  {id:2604,name:"Harrison Barnes",pos:"SF/PF",team:"SAC",ppg:12.9,rpg:4.8,apg:2.3,spg:0.7,bpg:0.3},
  // San Antonio Spurs
  {id:2701,name:"Victor Wembanyama",pos:"C/PF",team:"SAS",ppg:21.4,rpg:10.6,apg:3.9,spg:1.2,bpg:3.6},
  {id:2702,name:"Devin Vassell",pos:"SG/SF",team:"SAS",ppg:19.5,rpg:4.1,apg:4.5,spg:1.2,bpg:0.3},
  {id:2703,name:"Chris Paul",pos:"PG",team:"SAS",ppg:9.2,rpg:3.8,apg:7.8,spg:1.2,bpg:0.2},
  {id:2704,name:"Keldon Johnson",pos:"SF/SG",team:"SAS",ppg:15.4,rpg:5.1,apg:2.5,spg:0.9,bpg:0.3},
  {id:2705,name:"Jeremy Sochan",pos:"PF/SF",team:"SAS",ppg:12.3,rpg:5.6,apg:3.4,spg:0.8,bpg:0.5},
  // Toronto Raptors
  {id:2801,name:"RJ Barrett",pos:"SF/SG",team:"TOR",ppg:21.8,rpg:6.4,apg:3.8,spg:1.1,bpg:0.4},
  {id:2802,name:"Scottie Barnes",pos:"PF/SF",team:"TOR",ppg:19.9,rpg:8.2,apg:6.1,spg:1.3,bpg:0.8},
  {id:2803,name:"Immanuel Quickley",pos:"PG",team:"TOR",ppg:18.6,rpg:4.2,apg:6.0,spg:1.1,bpg:0.3},
  {id:2804,name:"Jakob Poeltl",pos:"C",team:"TOR",ppg:12.2,rpg:10.2,apg:3.5,spg:0.6,bpg:1.3},
  // Utah Jazz
  {id:2901,name:"Lauri Markkanen",pos:"PF/C",team:"UTA",ppg:23.2,rpg:8.2,apg:1.9,spg:0.5,bpg:0.6},
  {id:2902,name:"Jordan Clarkson",pos:"PG/SG",team:"UTA",ppg:16.2,rpg:3.5,apg:3.5,spg:0.7,bpg:0.3},
  {id:2903,name:"John Collins",pos:"PF",team:"UTA",ppg:13.5,rpg:7.1,apg:1.5,spg:0.6,bpg:0.7},
  {id:2904,name:"Keyonte George",pos:"PG",team:"UTA",ppg:13.8,rpg:3.2,apg:4.8,spg:0.9,bpg:0.2},
  {id:2905,name:"Walker Kessler",pos:"C",team:"UTA",ppg:9.2,rpg:10.2,apg:1.4,spg:0.5,bpg:2.8},
  // Washington Wizards
  {id:3001,name:"Kyle Kuzma",pos:"SF/PF",team:"WAS",ppg:22.2,rpg:7.5,apg:3.7,spg:0.9,bpg:0.5},
  {id:3002,name:"Jordan Poole",pos:"SG/PG",team:"WAS",ppg:18.6,rpg:2.8,apg:4.6,spg:0.8,bpg:0.3},
  {id:3003,name:"Bilal Coulibaly",pos:"SF/SG",team:"WAS",ppg:11.8,rpg:5.2,apg:2.7,spg:1.5,bpg:0.7},
  {id:3004,name:"Alexandre Sarr",pos:"C/PF",team:"WAS",ppg:14.2,rpg:8.6,apg:2.1,spg:0.7,bpg:2.0},
];

// Remove duplicate KAT (id:2005 is already defined for NYK, id:1801 for MIN — use unique IDs)
// NBA team abbreviations
const NBA_TEAMS = {
  ATL:'Hawks', BOS:'Celtics', BKN:'Nets', CHA:'Hornets', CHI:'Bulls',
  CLE:'Cavaliers', DAL:'Mavericks', DEN:'Nuggets', DET:'Pistons', GSW:'Warriors',
  HOU:'Rockets', IND:'Pacers', LAC:'Clippers', LAL:'Lakers', MEM:'Grizzlies',
  MIA:'Heat', MIL:'Bucks', MIN:'Timberwolves', NOP:'Pelicans', NYK:'Knicks',
  OKC:'Thunder', ORL:'Magic', PHI:'76ers', PHX:'Suns', POR:'Trail Blazers',
  SAC:'Kings', SAS:'Spurs', TOR:'Raptors', UTA:'Jazz', WAS:'Wizards',
};

// ── ESPN TEAM ID MAP ─────────────────────────────────────────────────────────
const ESPN_TO_ABBR = {
  ATL:'ATL',BOS:'BOS',BKN:'BKN',BRK:'BKN',CHA:'CHA',CHI:'CHI',CLE:'CLE',
  DAL:'DAL',DEN:'DEN',DET:'DET',GS:'GSW',GSW:'GSW',HOU:'HOU',IND:'IND',
  LAC:'LAC',LAL:'LAL',MEM:'MEM',MIA:'MIA',MIL:'MIL',MIN:'MIN',NO:'NOP',
  NOP:'NOP',NY:'NYK',NYK:'NYK',OKC:'OKC',ORL:'ORL',PHI:'PHI',PHX:'PHX',
  PHO:'PHX',POR:'POR',SAC:'SAC',SA:'SAS',SAS:'SAS',TOR:'TOR',UTA:'UTA',
  UTAH:'UTA',WAS:'WAS',WSH:'WAS',
};
function espnToAbbr(s){ return ESPN_TO_ABBR[s] || s; }

// ── FP SCORING ───────────────────────────────────────────────────────────────
// ESPN standard: pts + reb + ast + stl + blk - missed FG - missed FT - TO
function calcFP(stats){
  const {pts=0,reb=0,ast=0,stl=0,blk=0,fgm=0,fga=0,ftm=0,fta=0,to=0} = stats;
  return pts + reb + ast + stl + blk - (fga-fgm) - (fta-ftm) - to;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function getPlayer(id){ return PLAYERS.find(p=>p.id===id); }
function getPlayerByName(name){ return PLAYERS.find(p=>p.name.toLowerCase()===name.toLowerCase()); }
function initials(n){ return n.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fmtFP(v){ return v===0 ? '0' : (v>0?'+':'')+v.toFixed(1).replace('.0',''); }
function todayStr(){ return new Date().toISOString().split('T')[0].replace(/-/g,''); }
function currentWeekStart(){
  const d=new Date(); const day=d.getDay(); // 0=Sun
  d.setDate(d.getDate()-day);
  d.setHours(0,0,0,0);
  return d;
}
function avatarColor(idx){ return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }
function avatarEl(name,color,size=22,fontSize=7){
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:${fontSize}px;color:#000;flex-shrink:0">${initials(name)}</div>`;
}
function toast(msg, duration=2200){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),duration);
}
function parseSplit(s){ const p=(s||'0-0').split('-'); return [parseInt(p[0])||0,parseInt(p[1])||0]; }

// ── SUPABASE AUTH ────────────────────────────────────────────────────────────
async function doSignIn(){
  const email=document.getElementById('signin-email').value.trim();
  const pass =document.getElementById('signin-password').value;
  setLoginMsg('Signing in…','');
  const {data,error}=await db.auth.signInWithPassword({email,password:pass});
  if(error){ setLoginMsg(error.message,'error'); return; }
  // onAuthStateChange handles the rest
}

async function doSignUp(){
  const name  =document.getElementById('signup-name').value.trim();
  const email =document.getElementById('signup-email').value.trim();
  const pass  =document.getElementById('signup-password').value;
  const invite=document.getElementById('signup-invite').value.trim().toUpperCase();

  if(!name){ setLoginMsg('Enter your display name','error'); return; }
  if(invite !== INVITE_CODE){ setLoginMsg('Invalid invite code','error'); return; }
  setLoginMsg('Creating account…','');

  const {data,error}=await db.auth.signUp({
    email, password:pass,
    options:{ data:{ display_name:name } }
  });
  if(error){ setLoginMsg(error.message,'error'); return; }
  setLoginMsg('Account created! Check your email to confirm.','success');
}

async function doSignOut(){
  await db.auth.signOut();
}

function setLoginMsg(msg,type=''){
  const el=document.getElementById('login-msg');
  el.textContent=msg;
  el.className=type;
}

function switchLoginTab(tab){
  document.getElementById('signin-form').style.display = tab==='signin' ? '' : 'none';
  document.getElementById('signup-form').style.display = tab==='signup' ? '' : 'none';
  document.getElementById('tab-signin').classList.toggle('active',tab==='signin');
  document.getElementById('tab-signup').classList.toggle('active',tab==='signup');
  setLoginMsg('');
}

// ── DATA LAYER ───────────────────────────────────────────────────────────────
async function loadLeagueState(){
  const {data} = await db.from('leagues').select('state').eq('id',LEAGUE_KEY).maybeSingle();
  if(data?.state){
    try{ leagueState = JSON.parse(data.state); }
    catch(e){ leagueState = data.state; }
  }
  if(!leagueState){ leagueState = defaultLeagueState(); }
}

async function saveLeagueState(){
  await db.from('leagues').upsert({id:LEAGUE_KEY, state:JSON.stringify(leagueState)});
}

async function loadPortraits(){
  // Try localStorage first
  try{
    const cached=localStorage.getItem('portraits-2027');
    if(cached) playerPortraits=JSON.parse(cached);
  }catch(e){}
  // Background refresh from Supabase
  const {data}=await db.from('leagues').select('state').eq('id',PORTRAITS_KEY).maybeSingle();
  if(data?.state){
    try{
      const p=JSON.parse(data.state);
      if(p && typeof p==='object' && Object.keys(p).length>0){
        playerPortraits=p;
        localStorage.setItem('portraits-2027',JSON.stringify(p));
      }
    }catch(e){}
  }
}

async function savePortraits(){
  await db.from('leagues').upsert({id:PORTRAITS_KEY, state:JSON.stringify(playerPortraits)});
  localStorage.setItem('portraits-2027',JSON.stringify(playerPortraits));
  toast('Portraits saved');
}

async function loadManagerProfile(){
  if(!currentUser) return;
  const {data}=await db.from('managers').select('*').eq('user_id',currentUser.id).maybeSingle();
  myProfile=data||null;
  // If no profile row yet and auto-seeded from invite signup, create one
  if(!myProfile){
    const name=currentUser.user_metadata?.display_name||currentUser.email.split('@')[0];
    const color=avatarColor(Math.floor(Math.random()*10));
    const {data:newRow}=await db.from('managers').insert({
      user_id:currentUser.id, email:currentUser.email,
      display_name:name, color, is_commissioner:currentUser.email===COMMISSIONER_EMAIL
    }).select().single();
    myProfile=newRow||null;
  }
}

function defaultLeagueState(){
  return {
    season:'2026-27',
    currentRun:1,
    rosters:{},         // {managerId: [pid,...]}
    active:{},          // {managerId: [pid,...]}  — 8 active players
    inactive:{},        // {managerId: [pid,...]}  — 2 inactive
    playerStats:{},     // {key: {pid,date,gameId,fp,...}}
    waiverLog:{},       // {managerId: [{pid,date,type:'add'|'drop'},...]}
    waiverWeekCount:{}, // {managerId_weekStart: count}
    matchups:{},        // {runId: [{week,home,away,homeFP,awayFP,winner},...]}
    schedule:{},        // {runId: [[{home,away},...],...]}
    duelHistory:{},     // legacy — kept for migration
    duels:{},           // {dateKey: {pid1,pid2,stat,prompt,result,score1,score2,picks}}
    duelStreaks:{},     // {managerId: {streak,lastDate,totalCorrect}}
    superlatives:{},    // weekly/run winners
    // Weekly Line-Up Challenge
    wlc:{
      weeks:{},         // {weekKey: {theme,pool,tipoffTime,status:'pending'|'active'|'locked'|'final'}}
      lineups:{},       // {weekKey: {managerId: {picks:[name,...], swaps:[{from,to,time},...]}}}
      results:{},       // {weekKey: {scores:{managerId:fp}, winner:[id,...], best5:[name,...], bestUser:{name,fp}}}
      standings:{},     // {managerId: {wins:0, totalFP:0}}
    },
  };
}

function getMyId(){ return myProfile?.id; }
function getMyRoster(){ return (leagueState.rosters||{})[getMyId()] || []; }
function getMyActive(){ return (leagueState.active||{})[getMyId()] || []; }
function getMyInactive(){ return (leagueState.inactive||{})[getMyId()] || []; }
function allManagers(){
  // Returns list of manager rows from leagueState (populated by admin)
  return leagueState.managers || [];
}

// ── FP SCORING HELPERS ───────────────────────────────────────────────────────
let livePlayerStats = {};  // {pid: {fp, pts, reb, ast, stl, blk, to, live, gameId}}
let liveGamesActive = false;

function playerSavedFP(pid){
  return Object.values(leagueState.playerStats||{})
    .filter(s=>s.pid===pid)
    .reduce((sum,s)=>sum+(s.fp||0),0);
}

function playerTotalFP(pid){
  const saved = playerSavedFP(pid);
  const live  = livePlayerStats[pid];
  if(live){
    const alreadySaved = Object.values(leagueState.playerStats||{})
      .some(s=>s.pid===pid && s.gameId && s.gameId===live.gameId);
    if(!alreadySaved) return +(saved + (live.fp||0)).toFixed(1);
  }
  return +saved.toFixed(1);
}

function rosterFP(pids){
  return pids.reduce((s,pid)=>s+playerTotalFP(pid),0);
}

// Active 8 FP total for a manager
function managerFP(mid){
  const active = (leagueState.active||{})[mid] || autoActiveFor(mid);
  return +rosterFP(active).toFixed(1);
}

// Auto-select top 8 by season FP if user hasn't set lineup
function autoActiveFor(mid){
  const roster=(leagueState.rosters||{})[mid]||[];
  return [...roster].sort((a,b)=>playerTotalFP(b)-playerTotalFP(a)).slice(0,ACTIVE_SIZE);
}

// ── ESPN LIVE STATS ──────────────────────────────────────────────────────────
const NBA_SEASON_START = new Date('2026-10-20');
const NBA_SEASON_END   = new Date('2027-07-01'); // approximate

async function fetchBoxScore(eventId){
  const res=await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`);
  const data=await res.json();
  const box=data?.boxscore;
  if(!box) return {};
  const stats={};
  for(const teamData of (box.players||[])){
    const teamAbbr=espnToAbbr(teamData?.team?.abbreviation||'');
    for(const grp of (teamData.statistics||[])){
      for(const a of (grp.athletes||[])){
        const name=a?.athlete?.displayName||'';
        const s=a?.stats||[];
        if(!s.length||s[0]==='DNP'||s[0]==='DND') continue;
        const pts=parseInt(s[1])||0;
        const [fgm,fga]=parseSplit(s[2]);
        const [ftm,fta]=parseSplit(s[4]);
        const reb=parseInt(s[5])||0;
        const ast=parseInt(s[6])||0;
        const to =parseInt(s[7])||0;
        const stl=parseInt(s[8])||0;
        const blk=parseInt(s[9])||0;
        const [tpm,tpa]=parseSplit(s[3]);
        const fp=calcFP({pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to});
        const nameLow=name.toLowerCase();
        const matched=
          PLAYERS.find(p=>p.team===teamAbbr && p.name.toLowerCase()===nameLow) ||
          PLAYERS.find(p=>{
            if(p.team!==teamAbbr) return false;
            const [pF,pL]=[p.name.split(' ')[0].toLowerCase(),p.name.split(' ').pop().toLowerCase()];
            const [eF,eL]=[nameLow.split(' ')[0],nameLow.split(' ').pop()];
            return pF===eF && pL===eL;
          }) ||
          PLAYERS.find(p=>{
            if(p.team!==teamAbbr) return false;
            const pL=p.name.split(' ').pop().toLowerCase();
            const eL=nameLow.split(' ').pop();
            const sameTeamLast=PLAYERS.filter(x=>x.team===teamAbbr&&x.name.split(' ').pop().toLowerCase()===pL);
            return pL===eL && sameTeamLast.length===1;
          });
        if(matched) stats[matched.id]={fp,pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,tpm,tpa,name:matched.name};
      }
    }
  }
  return stats;
}

async function refreshLiveStats(){
  const now=new Date();
  if(now<NBA_SEASON_START || now>NBA_SEASON_END) return;
  try{
    const fmt=d=>d.toISOString().split('T')[0].replace(/-/g,'');
    const today=new Date(), yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
    let allEvents=[];
    for(const dateStr of [fmt(today),fmt(yesterday)]){
      try{
        const res=await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?seasontype=2&dates=${dateStr}`);
        const data=await res.json();
        allEvents=allEvents.concat((data?.events||[]).map(e=>({...e,_dateStr:dateStr})));
      }catch(e){}
    }
    // Also try undated for live
    try{
      const res=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
      const data=await res.json();
      const todayStr2=fmt(today);
      const live=(data?.events||[]).map(e=>({...e,_dateStr:todayStr2}));
      const existIds=new Set(allEvents.map(e=>e.id));
      live.forEach(e=>{ if(!existIds.has(e.id)) allEvents.push(e); });
    }catch(e){}

    const newLive={};
    let hasLive=false;
    const toSave=[];
    for(const event of allEvents){
      const st=event.status?.type;
      const isLive=!st?.completed && st?.state==='in';
      const isDone=st?.completed;
      if(!isLive && !isDone) continue;
      const alreadySaved=isDone && leagueState.playerStats &&
        Object.keys(leagueState.playerStats).some(k=>k.endsWith('_'+event._dateStr) && leagueState.playerStats[k].gameId===event.id);
      try{
        const gs=await fetchBoxScore(event.id);
        for(const [pid,stat] of Object.entries(gs)){
          if(!newLive[pid]) newLive[pid]={fp:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0,live:isLive,gameId:event.id};
          newLive[pid].fp  +=stat.fp;
          newLive[pid].pts +=stat.pts;
          newLive[pid].reb +=stat.reb;
          newLive[pid].ast +=stat.ast;
          newLive[pid].stl +=stat.stl;
          newLive[pid].blk +=stat.blk;
          newLive[pid].to  +=stat.to;
          if(isLive) newLive[pid].live=true;
        }
        if(isLive) hasLive=true;
        if(isDone && !alreadySaved) toSave.push({event,stats:gs,dateStr:event._dateStr});
      }catch(e){}
    }
    livePlayerStats=newLive;
    liveGamesActive=hasLive;

    if(toSave.length>0){
      if(!leagueState.playerStats) leagueState.playerStats={};
      let changed=false;
      for(const {event,stats,dateStr} of toSave){
        for(const [pid,stat] of Object.entries(stats)){
          const key=pid+'_'+dateStr+'_'+event.id;
          if(!leagueState.playerStats[key]){
            leagueState.playerStats[key]={...stat,pid:parseInt(pid),date:dateStr,gameId:event.id};
            changed=true;
          }
        }
      }
      if(changed) await saveLeagueState();
    }
    render();
  }catch(e){ console.warn('refreshLiveStats error:',e); }
}

function startPolling(){
  refreshLiveStats();
  if(livePolling) clearInterval(livePolling);
  livePolling=setInterval(refreshLiveStats,60000);
}

// ── ROSTER HELPERS ───────────────────────────────────────────────────────────
function waiverUsedThisWeek(mid){
  const ws=currentWeekStart().getTime().toString();
  return (leagueState.waiverWeekCount||{})[mid+'_'+ws] || 0;
}

function canWaiver(mid){
  return waiverUsedThisWeek(mid) < WAIVER_WEEKLY;
}

async function addPlayer(mid, pid){
  if(!canWaiver(mid)){ toast('No add/drops remaining this week!'); return false; }
  const roster=(leagueState.rosters||{})[mid]||[];
  if(roster.includes(pid)){ toast('Already on roster'); return false; }
  if(roster.length>=ROSTER_SIZE){ toast('Drop a player first (roster full)'); return false; }
  // Add
  if(!leagueState.rosters[mid]) leagueState.rosters[mid]=[];
  leagueState.rosters[mid].push(pid);
  // Log waiver
  const ws=currentWeekStart().getTime().toString();
  const key=mid+'_'+ws;
  leagueState.waiverWeekCount[key]=(leagueState.waiverWeekCount[key]||0)+1;
  if(!leagueState.waiverLog[mid]) leagueState.waiverLog[mid]=[];
  leagueState.waiverLog[mid].push({pid,date:todayStr(),type:'add'});
  await saveLeagueState();
  return true;
}

async function dropPlayer(mid, pid){
  if(!canWaiver(mid)){ toast('No add/drops remaining this week!'); return false; }
  const roster=(leagueState.rosters||{})[mid]||[];
  if(!roster.includes(pid)){ return false; }
  // Check if top FP player (locked from dropping)
  const topFP=Math.max(...roster.map(id=>playerTotalFP(id)));
  if(playerTotalFP(pid)>=topFP && roster.length>1){ toast('Top FP player is locked from dropping!'); return false; }
  leagueState.rosters[mid]=roster.filter(id=>id!==pid);
  // Remove from active/inactive
  leagueState.active[mid]=(leagueState.active[mid]||[]).filter(id=>id!==pid);
  leagueState.inactive[mid]=(leagueState.inactive[mid]||[]).filter(id=>id!==pid);
  const ws=currentWeekStart().getTime().toString();
  const key=mid+'_'+ws;
  leagueState.waiverWeekCount[key]=(leagueState.waiverWeekCount[key]||0)+1;
  if(!leagueState.waiverLog[mid]) leagueState.waiverLog[mid]=[];
  leagueState.waiverLog[mid].push({pid,date:todayStr(),type:'drop'});
  await saveLeagueState();
  return true;
}

// Toggle active/inactive
async function toggleActiveStatus(mid, pid){
  const active=(leagueState.active||{})[mid]||autoActiveFor(mid);
  const inactive=(leagueState.inactive||{})[mid]||[];
  const isActive=active.includes(pid);
  const isInactive=inactive.includes(pid);

  if(isActive){
    // Move to inactive (only if we'd still have at least 1 active, and inactive<2)
    if(active.length<=1){ toast('Need at least 1 active player'); return; }
    if(inactive.length>=INACTIVE_SIZE){ toast('Already have 2 inactive players. Activate one first.'); return; }
    leagueState.active[mid]=active.filter(id=>id!==pid);
    leagueState.inactive[mid]=[...(leagueState.inactive[mid]||[]),pid];
  } else {
    // Move to active
    if(active.length>=ACTIVE_SIZE){
      toast(`Active roster full (${ACTIVE_SIZE} max). Set someone to inactive first.`);
      return;
    }
    leagueState.active[mid]=[...active,pid];
    leagueState.inactive[mid]=(leagueState.inactive[mid]||[]).filter(id=>id!==pid);
  }
  await saveLeagueState();
  renderRosterScreen();
  renderHomeScreen();
  toast(isActive ? 'Moved to Inactive' : 'Moved to Active');
}

// ── CURRENT RUN LOGIC ────────────────────────────────────────────────────────
function getCurrentRun(){
  const today=new Date();
  for(const run of RUNS){
    if(today>=new Date(run.start) && today<=new Date(run.end)) return run;
  }
  // Return nearest upcoming run
  const upcoming=RUNS.find(r=>new Date(r.start)>today);
  return upcoming || RUNS[RUNS.length-1];
}

function getWeekLabel(){
  const ws=currentWeekStart();
  const we=new Date(ws); we.setDate(we.getDate()+6);
  const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `${fmt(ws)} – ${fmt(we)}`;
}

// ── SCREEN NAVIGATION ────────────────────────────────────────────────────────
function showScreen(screen){
  currentScreen=screen;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(screen+'-screen');
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.getElementById('nav-'+screen);
  if(nb) nb.classList.add('active');
  // Re-render active screen
  if(screen==='home') renderHomeScreen();
  else if(screen==='fantasy') renderFantasyScreen();
  else if(screen==='roster') renderRosterScreen();
  else if(screen==='wlc') renderWlcScreen();
  else if(screen==='profile') renderProfileScreen();
}

// ── HOME SCREEN ──────────────────────────────────────────────────────────────
function renderHomeScreen(){
  renderDuelCard();
  renderMatchupCard();
  renderLineupPreview();
  renderQuickStats();
}

// ── DAILY DUEL ───────────────────────────────────────────────────────────────
// Duel stored in leagueState.duels:
// {
//   [dateKey]: {
//     pid1, pid2,          // player IDs
//     stat,                // 'pts'|'reb'|'ast'|'fp'|'reb+ast'|'stl+blk'
//     prompt,              // display question
//     result: null | 1 | 2 | 'tie',  // set after games finish
//     score1, score2,      // actual stat values (filled when result set)
//     picks: { [managerId]: 1|2 }
//   }
// }
// leagueState.duelStreaks: { [managerId]: { streak, lastDate, totalCorrect } }

const DUEL_STAT_TEMPLATES = [
  { stat:'pts',     prompt:'Who scores more points tonight?',                     label:'PTS',     statKey:'ppg' },
  { stat:'reb',     prompt:'Who grabs more rebounds tonight?',                    label:'REB',     statKey:'rpg' },
  { stat:'ast',     prompt:'Who dishes out more assists tonight?',                label:'AST',     statKey:'apg' },
  { stat:'fp',      prompt:'Who earns more fantasy points tonight?',              label:'FP',      statKey:'fp'  },
  { stat:'reb+ast', prompt:'Who gets more combined rebounds and assists tonight?', label:'REB+AST', statKey:'reb+ast' },
  { stat:'stl+blk', prompt:'Who has more combined steals and blocks tonight?',    label:'STL+BLK', statKey:'stl+blk' },
  { stat:'pts',     prompt:'Who scores more points tonight?',                     label:'PTS',     statKey:'ppg' },
  { stat:'fp',      prompt:'Who earns more fantasy points tonight?',              label:'FP',      statKey:'fp'  },
];

function todayKey(){
  return new Date().toISOString().split('T')[0];
}

function getTodaysDuel(){
  const today = todayKey();
  return (leagueState.duels||{})[today] || null;
}

// Auto-generate today's duel (called by boot or commissioner)
function autoGenerateDuel(forDate){
  const dateKey = forDate || todayKey();
  const seed = dateKey.split('-').reduce((a,b)=>a*100+parseInt(b),0);
  // Pick two high-profile players (ppg >= 18) who differ by team
  const stars = PLAYERS.filter(p=>p.ppg>=18);
  if(stars.length < 2) return null;
  let i1 = seed % stars.length;
  let i2 = (seed * 13 + 7) % stars.length;
  // Make sure they're different players and different teams
  let attempts = 0;
  while((i1===i2 || stars[i1].team===stars[i2].team) && attempts < 30){
    i2 = (i2 + 1) % stars.length;
    attempts++;
  }
  if(i1===i2) return null;
  const p1 = stars[i1], p2 = stars[i2];
  const tmpl = DUEL_STAT_TEMPLATES[seed % DUEL_STAT_TEMPLATES.length];
  return {
    pid1: p1.id, pid2: p2.id,
    stat: tmpl.stat, prompt: tmpl.prompt,
    result: null, score1: null, score2: null,
    picks: {},
    generatedAt: new Date().toISOString(),
  };
}

// Make sure today's duel exists; auto-create if not
// Session-level lock prevents duplicate creation on concurrent calls
let _duelEnsureInProgress = false;
async function ensureTodaysDuel(){
  const today = todayKey();
  // Already exists — nothing to do
  if((leagueState.duels||{})[today]) return;
  // Lock: another call is in flight — bail out
  if(_duelEnsureInProgress) return;
  _duelEnsureInProgress = true;
  try {
    const duel = autoGenerateDuel(today);
    if(!duel) return;
    if(!leagueState.duels) leagueState.duels = {};
    // Re-check after potential async gap
    if(!leagueState.duels[today]){
      leagueState.duels[today] = duel;
      await saveLeagueState();
    }
  } finally {
    _duelEnsureInProgress = false;
  }
}

// Submit a pick (1 or 2)
async function makeDuelPick(side){
  const mid = getMyId();
  if(!mid){ toast('Sign in to play!'); return; }
  const today = todayKey();
  const duel = (leagueState.duels||{})[today];
  if(!duel){ toast('No duel today'); return; }
  if(duel.picks[mid] !== undefined){ toast('Already picked today!'); return; }
  if(duel.result !== null){ toast('Duel already settled'); return; }
  duel.picks[mid] = side;
  await saveLeagueState();
  toast(`LOCKED IN! Check back after games for the result. 🔥`);
  renderDuelCard();
}

// Commissioner: set the result and update streaks
async function settleDuel(dateKey, result, score1, score2){
  const duel = (leagueState.duels||{})[dateKey];
  if(!duel){ toast('No duel for that date'); return; }
  duel.result = result; // 1, 2, or 'tie'
  duel.score1 = score1;
  duel.score2 = score2;
  // Update streaks for all managers who picked
  if(!leagueState.duelStreaks) leagueState.duelStreaks = {};
  const prevDate = getPrevDateKey(dateKey);
  for(const [mid, pick] of Object.entries(duel.picks)){
    const correct = result === 'tie' ? true : (pick === result);
    if(!leagueState.duelStreaks[mid]) leagueState.duelStreaks[mid] = {streak:0, lastDate:null, totalCorrect:0};
    const s = leagueState.duelStreaks[mid];
    // Check continuity — if they missed yesterday, streak should already be 0
    if(correct){
      s.streak = (s.lastDate === prevDate ? s.streak : 0) + 1;
      s.totalCorrect = (s.totalCorrect||0) + 1;
      if(s.streak > (s.longest||0)) s.longest = s.streak;
    } else {
      s.streak = 0;
    }
    s.lastDate = dateKey;
  }
  // Anyone who had a streak going but didn't pick today — their streak is already "dead"
  // (the getDuelStreak function handles the miss-a-day case live)
  await saveLeagueState();
  toast('Duel settled! Streaks updated.');
  renderDuelCard();
}

function getPrevDateKey(dateKey){
  const d = new Date(dateKey);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Get my current streak (handles miss-a-day reset)
function getMyDuelStreak(){
  const mid = getMyId();
  if(!mid) return 0;
  const s = (leagueState.duelStreaks||{})[mid];
  if(!s) return 0;
  const today = todayKey();
  const yesterday = getPrevDateKey(today);
  // If lastDate is neither today nor yesterday, streak is dead
  if(s.lastDate !== today && s.lastDate !== yesterday) return 0;
  return s.streak || 0;
}

function getMyDuelPick(){
  const mid = getMyId();
  if(!mid) return null;
  const duel = getTodaysDuel();
  if(!duel) return null;
  return duel.picks[mid] ?? null;
}

// Get the relevant stat display string for a player based on the duel stat type
function getDuelStatDisplay(p, statType){
  if(!p) return '—';
  switch(statType){
    case 'pts':     return `${p.ppg} PPG · ${p.team}`;
    case 'reb':     return `${p.rpg} RPG · ${p.team}`;
    case 'ast':     return `${p.apg} APG · ${p.team}`;
    case 'reb+ast': return `${p.rpg}r ${p.apg}a · ${p.team}`;
    case 'stl+blk': return `${p.spg}stl ${p.bpg}blk · ${p.team}`;
    case 'fp':      return `${(p.ppg+p.rpg*1.2+p.apg*1.5+p.spg*3+p.bpg*3).toFixed(1)} FP/G · ${p.team}`;
    default:        return `${p.ppg} PPG · ${p.team}`;
  }
}

// Render the duel card on the home screen
function renderDuelCard(){
  const el=document.getElementById('duel-card-container');
  if(!el) return;

  const duel = getTodaysDuel();
  if(!duel){
    el.innerHTML=`<div class="duel-card"><div class="duel-empty"><div class="icon">⚡</div><div>DUEL COMING SOON<br/><span style="font-size:5px;color:var(--text3)">CHECK BACK TONIGHT</span></div></div></div>`;
    return;
  }

  const p1=getPlayer(duel.pid1), p2=getPlayer(duel.pid2);
  if(!p1||!p2){ el.innerHTML=''; return; }

  const myPick = getMyDuelPick();
  const streak = getMyDuelStreak();
  const settled = duel.result !== null;
  const statType = duel.stat || 'pts';

  const portHtml=(p)=>{
    const port=playerPortraits[p.name];
    if(port) return `<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top;image-rendering:pixelated"/>`;
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:9px;color:var(--text3)">${initials(p.name)}</div>`;
  };

  // Result state colors
  const winColor  = 'var(--accent2)';
  const loseColor = 'var(--accent4)';
  const tieColor  = 'var(--accent3)';

  let resultBanner='', statLine='';

  // Compute pick percentages (shown after user has picked)
  let pct1='', pct2='';
  if(myPick !== null || settled){
    const picks = duel.picks || {};
    const allPicks = Object.values(picks).filter(v=>v!==null);
    const n1 = allPicks.filter(v=>v===1).length;
    const n2 = allPicks.filter(v=>v===2).length;
    const total = n1 + n2;
    if(total > 0){
      pct1 = `<div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:4px">${Math.round(n1/total*100)}%</div>`;
      pct2 = `<div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:4px">${Math.round(n2/total*100)}%</div>`;
    }
  }

  if(settled){
    const stat1txt = duel.score1 !== null ? duel.score1 : '—';
    const stat2txt = duel.score2 !== null ? duel.score2 : '—';
    statLine = `<div class="duel-scores"><span>${stat1txt}</span><span style="font-size:6px;color:var(--text3)">${statType.toUpperCase()}</span><span>${stat2txt}</span></div>`;
    if(duel.result === 'tie'){
      resultBanner = `<div class="duel-result-banner" style="color:${tieColor}">TIE GAME — BOTH STREAKS HOLD ✓</div>`;
    } else {
      const myCorrect = myPick !== null && myPick === duel.result;
      resultBanner = myPick === null
        ? `<div class="duel-result-banner" style="color:var(--text3)">PLAYER ${duel.result} WINS — YOU DIDN'T PICK</div>`
        : myCorrect
          ? `<div class="duel-result-banner" style="color:${winColor}">✓ CORRECT! STREAK: ${streak} 🔥</div>`
          : `<div class="duel-result-banner" style="color:${loseColor}">✗ WRONG — STREAK RESET</div>`;
    }
  }

  const pickedStyle = (side) => {
    if(!settled && myPick===side) return `box-shadow:0 0 0 2px var(--accent2);`;
    if(settled){
      const won = duel.result===side || duel.result==='tie';
      return myPick===side ? `box-shadow:0 0 0 2px ${won?winColor:loseColor};` : '';
    }
    return '';
  };

  el.innerHTML=`
  <div class="duel-card">
    <div class="duel-header">
      <span>⚡ DAILY DUEL</span>
      <span class="duel-streak-chip">${streak > 0 ? `🔥 ${streak}` : '—'}</span>
    </div>
    <div class="duel-prompt">${duel.prompt}</div>
    ${statLine}
    <div class="duel-body">
      <div class="duel-player ${myPick===1&&!settled?'duel-picked':''}" style="${pickedStyle(1)}" onclick="${!myPick&&!settled?'makeDuelPick(1)':''}">
        <div class="portrait-wrap"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p1)}</div></div>
        <div class="dname">${p1.name.split(' ').pop()}</div>
        <div class="dstat">${getDuelStatDisplay(p1, statType)}</div>
        ${myPick===1?'<div class="duel-my-pick">YOUR PICK ✓</div>':''}
        ${pct1}
      </div>
      <div class="duel-vs">VS</div>
      <div class="duel-player ${myPick===2&&!settled?'duel-picked':''}" style="${pickedStyle(2)}" onclick="${!myPick&&!settled?'makeDuelPick(2)':''}">
        <div class="portrait-wrap"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p2)}</div></div>
        <div class="dname">${p2.name.split(' ').pop()}</div>
        <div class="dstat">${getDuelStatDisplay(p2, statType)}</div>
        ${myPick===2?'<div class="duel-my-pick">YOUR PICK ✓</div>':''}
        ${pct2}
      </div>
    </div>
    ${!myPick && !settled ? `
    <div class="duel-btns">
      <button class="duel-pick-btn" onclick="makeDuelPick(1)">${p1.name.split(' ').pop().toUpperCase()}</button>
      <button class="duel-pick-btn" onclick="makeDuelPick(2)">${p2.name.split(' ').pop().toUpperCase()}</button>
    </div>` : ''}
    ${resultBanner}
    <div class="duel-footer-link" onclick="showDuelLeaderboard()">LEADERBOARD ›</div>
  </div>`;
}

// Duel leaderboard modal
function showDuelLeaderboard(){
  const managers = leagueState.managers || [];
  const streaks = leagueState.duelStreaks || {};
  const today = todayKey();
  const yesterday = getPrevDateKey(today);

  const rows = managers.map(m=>{
    const s = streaks[m.id] || {streak:0, totalCorrect:0, lastDate:null};
    const live = (s.lastDate===today||s.lastDate===yesterday) ? s.streak : 0;
    return {...m, streak:live, totalCorrect:s.totalCorrect||0};
  }).sort((a,b)=>b.streak!==a.streak?b.streak-a.streak:b.totalCorrect-a.totalCorrect);

  const myId = getMyId();
  let rowsHtml = rows.map((m,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${m.id===myId?'background:rgba(0,212,170,.05);margin:0 -16px;padding-left:16px;padding-right:16px;':''}">
      <span style="font-family:var(--pixel);font-size:8px;color:var(--text3);width:20px">${i+1}</span>
      ${avatarEl(m.display_name, m.color||'#4a9eff', 28, 8)}
      <div style="flex:1">
        <div style="font-family:var(--pixel);font-size:6.5px;color:${m.id===myId?'var(--accent2)':'var(--text2)'}">${m.display_name}${m.id===myId?' ★':''}</div>
        <div style="font-size:10px;color:var(--text3)">${m.totalCorrect} correct all-time</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--pixel);font-size:10px;color:${m.streak>0?'var(--accent3)':'var(--text3)'}">${m.streak>0?`🔥 ${m.streak}`:'—'}</div>
        <div style="font-size:9px;color:var(--text3)">streak</div>
      </div>
    </div>`).join('');

  let modal = document.getElementById('duel-lb-modal');
  if(modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'duel-lb-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px;width:calc(100% - 32px);max-height:80vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-family:var(--pixel);font-size:8px;color:var(--accent3)">⚡ DUEL LEADERBOARD</div>
        <button onclick="document.getElementById('duel-lb-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:10px;">RANKED BY STREAK · TIEBREAK: ALL-TIME CORRECT</div>
      ${rowsHtml || '<div style="padding:20px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO PICKS YET</div>'}
    </div>`;
  document.body.appendChild(modal);
}

// Admin: render duel section
function renderAdminDuelSection(){
  const today = todayKey();
  const duel = (leagueState.duels||{})[today];
  const p1 = duel ? getPlayer(duel.pid1) : null;
  const p2 = duel ? getPlayer(duel.pid2) : null;
  const settled = duel?.result !== null && duel?.result !== undefined;
  return `
    <div style="margin-top:16px">
      <div style="font-family:var(--pixel);font-size:8px;color:var(--accent3);margin-bottom:10px">⚡ DAILY DUEL</div>
      ${duel ? `
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text2);margin-bottom:6px">${p1?.name||'?'} vs ${p2?.name||'?'}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">"${duel.prompt}"</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:10px">PICKS: ${Object.keys(duel.picks||{}).length} · STATUS: ${settled?'SETTLED ✓':'OPEN'}</div>
        ${!settled ? `
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <input id="duel-score1" placeholder="${p1?.name?.split(' ').pop()} stat" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
            <input id="duel-score2" placeholder="${p2?.name?.split(' ').pop()} stat" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
          </div>
          <button class="btn btn-full btn-primary" onclick="adminSettleDuel('${today}')">🏁 SETTLE TODAY'S DUEL</button>
        ` : `<div style="font-family:var(--pixel);font-size:6px;color:var(--accent2)">WINNER: PLAYER ${duel.result} · ${duel.score1} vs ${duel.score2}</div>`}
        <button class="btn btn-full btn-secondary" style="margin-top:6px" onclick="adminRegenerateDuel()">↺ REGENERATE TODAY'S DUEL</button>
      ` : `
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:8px">NO DUEL YET TODAY</div>
        <button class="btn btn-full btn-primary" onclick="adminRegenerateDuel()">⚡ GENERATE TODAY'S DUEL</button>
      `}
    </div>`;
}

async function adminSettleDuel(dateKey){
  const s1 = parseFloat(document.getElementById('duel-score1')?.value);
  const s2 = parseFloat(document.getElementById('duel-score2')?.value);
  if(isNaN(s1)||isNaN(s2)){ toast('Enter both scores'); return; }
  const result = s1>s2 ? 1 : s2>s1 ? 2 : 'tie';
  await settleDuel(dateKey, result, s1, s2);
  renderAdminContent();
}

async function adminRegenerateDuel(){
  const today = todayKey();
  const duel = autoGenerateDuel(today);
  if(!duel){ toast('Could not generate duel'); return; }
  if(!leagueState.duels) leagueState.duels = {};
  leagueState.duels[today] = duel;
  await saveLeagueState();
  toast('New duel generated!');
  renderHomeScreen();
  renderAdminContent();
}

function renderMatchupCard(){
  const el=document.getElementById('matchup-card-container');
  if(!el) return;
  const mid=getMyId();
  if(!mid||!leagueState){ el.innerHTML=''; return; }
  const run=getCurrentRun();
  const weekMatchup=findMyMatchup(mid,run.id);
  if(!weekMatchup){
    el.innerHTML=`<div class="matchup-card"><div style="padding:16px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">SEASON STARTS ${new Date(run.start).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>`;
    return;
  }
  const isHome=weekMatchup.home===mid;
  const oppId=isHome?weekMatchup.away:weekMatchup.home;
  const opp=leagueState.managers?.find(m=>m.id===oppId);
  const myFP=managerFP(mid);
  const oppFP=managerFP(oppId);
  const myLeading=myFP>oppFP;
  const myName=myProfile?.display_name||'Me';
  const oppName=opp?.display_name||'Opponent';
  const oppColor=opp?.color||'#4a9eff';
  el.innerHTML=`
  <div class="matchup-card">
    <div class="matchup-header">
      <span>${run.name.toUpperCase()} RUN · ${getWeekLabel()}</span>
      ${liveGamesActive?'<span class="live-badge">LIVE</span>':''}
    </div>
    <div class="matchup-body">
      <div class="matchup-team">
        <span class="fp${myLeading?' leading':''}">${myFP.toFixed(1)}</span>
        <div class="name">${myName}</div>
      </div>
      <div class="matchup-vs">VS</div>
      <div class="matchup-team">
        <span class="fp${!myLeading?' leading':''}">${oppFP.toFixed(1)}</span>
        <div class="name" style="color:${oppColor}">${oppName}</div>
      </div>
    </div>
    <div class="matchup-footer">
      <span>${myLeading?'▲ LEADING':'▼ TRAILING'} BY ${Math.abs(myFP-oppFP).toFixed(1)} FP</span>
      <span>ACTIVE 8 ONLY</span>
    </div>
  </div>`;
}

function findMyMatchup(mid, runId){
  const schedule=(leagueState.schedule||{})[runId]||[];
  const weekIdx=getCurrentWeekIndex(runId);
  if(weekIdx<0 || weekIdx>=schedule.length) return null;
  const week=schedule[weekIdx]||[];
  return week.find(m=>m.home===mid||m.away===mid)||null;
}

function getCurrentWeekIndex(runId){
  const run=RUNS.find(r=>r.id===runId); if(!run) return -1;
  const start=new Date(run.start);
  const now=new Date();
  if(now<start) return -1;
  return Math.floor((now-start)/(7*24*3600*1000));
}

function renderLineupPreview(){
  const el=document.getElementById('lineup-preview-container');
  if(!el) return;
  const mid=getMyId();
  if(!mid){ el.innerHTML=''; return; }
  const roster=getMyRoster();
  if(!roster.length){
    el.innerHTML=`<div class="card"><div class="empty-state"><div class="icon">📋</div><div class="label">YOUR ROSTER IS EMPTY<br/>WAIT FOR THE DRAFT!</div></div></div>`;
    return;
  }
  const active=getMyActive().length ? getMyActive() : autoActiveFor(mid);
  const inactive=getMyInactive().length ? getMyInactive() : roster.filter(p=>!active.includes(p));

  const rowHtml=(pid,isActive)=>{
    const p=getPlayer(pid); if(!p) return '';
    const fp=playerTotalFP(pid);
    const isLive=livePlayerStats[pid]?.live;
    const port=playerPortraits[p.name];
    const portEl=port
      ? `<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top;image-rendering:pixelated"/>`
      : `<div class="initials" style="color:${myProfile?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    return `
    <div class="player-row">
      <div class="player-portrait">${portEl}</div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-meta">${p.pos} · ${p.team} ${isLive?'<span class="live-badge" style="font-size:4px;padding:1px 4px">LIVE</span>':''}</div>
      </div>
      <div class="player-fp">
        ${fp.toFixed(1)}<span class="fp-label">FP</span>
      </div>
      <button class="toggle-btn ${isActive?'to-inactive':'to-active'}" onclick="toggleActiveStatus('${mid}',${pid})" title="${isActive?'Set Inactive':'Set Active'}">
        ${isActive?'⬇':'⬆'}
      </button>
    </div>`;
  };

  el.innerHTML=`
  <div class="lineup-card">
    <div class="lineup-section">
      <div class="lineup-section-label active-label">
        ✅ ACTIVE <span class="count">(${active.length}/${ACTIVE_SIZE})</span>
      </div>
      ${active.map(pid=>rowHtml(pid,true)).join('')}
    </div>
    ${inactive.length ? `
    <div class="lineup-section">
      <div class="lineup-section-label inactive-label">
        ❌ INACTIVE <span class="count">(${inactive.length}/${INACTIVE_SIZE})</span>
      </div>
      ${inactive.map(pid=>rowHtml(pid,false)).join('')}
    </div>` : ''}
  </div>`;
}

function renderQuickStats(){
  const el=document.getElementById('quick-stats-container');
  if(!el) return;
  const mid=getMyId();
  if(!mid){ el.innerHTML=''; return; }
  const run=getCurrentRun();
  const myFP=managerFP(mid);
  const roster=getMyRoster();
  const topPlayer=roster.length ? roster.reduce((a,b)=>playerTotalFP(a)>playerTotalFP(b)?a:b,roster[0]) : null;
  const topP=topPlayer ? getPlayer(topPlayer) : null;
  el.innerHTML=`
  <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="text-align:center">
      <div style="font-family:var(--pixel);font-size:18px;color:var(--accent3)">${myFP.toFixed(1)}</div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-top:4px">${run.name.toUpperCase()} FP</div>
    </div>
    <div style="text-align:center">
      <div style="font-family:var(--pixel);font-size:11px;color:var(--accent2)">${topP ? topP.name.split(' ').pop() : '—'}</div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-top:4px">TOP PLAYER · ${topP?playerTotalFP(topPlayer).toFixed(1)+' FP':'—'}</div>
    </div>
  </div>`;
}

// ── FANTASY SCREEN ───────────────────────────────────────────────────────────
function switchRun(runId){
  currentRun=runId;
  document.querySelectorAll('.run-tab').forEach(t=>{
    t.classList.toggle('active',parseInt(t.dataset.run)===runId);
  });
  renderFantasyRunContent();
}

function renderFantasyScreen(){
  renderFantasyRunContent();
}

function renderFantasyRunContent(){
  const el=document.getElementById('fantasy-run-content');
  if(!el) return;
  const run=RUNS.find(r=>r.id===currentRun);
  const managers=leagueState.managers||[];
  if(!managers.length){
    el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">🏀</div><div class="label">DRAFT HASN'T HAPPENED YET<br/>CHECK BACK ON ${new Date(run.start).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>`;
    return;
  }

  // Build standings for this run
  const standings=managers.map(m=>{
    const schedule=(leagueState.schedule||{})[currentRun]||[];
    let wins=0,losses=0,ties=0;
    schedule.forEach(week=>week.forEach(matchup=>{
      if(!matchup.winner) return;
      if(matchup.home===m.id||matchup.away===m.id){
        if(matchup.winner===m.id) wins++;
        else if(matchup.winner==='tie') ties++;
        else losses++;
      }
    }));
    return {m, fp:managerFP(m.id), wins, losses, ties, record:`${wins}-${losses}${ties?'-'+ties:''}`};
  }).sort((a,b)=>{ if(b.wins!==a.wins) return b.wins-a.wins; return b.fp-a.fp; });

  const myId=getMyId();
  el.innerHTML=`
  <div style="padding:0 14px">
    <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);padding:12px 0 6px">
      ${run.name.toUpperCase()} RUN · ${new Date(run.start).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(run.end).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
    </div>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table class="standings-table" style="width:100%">
      <thead><tr>
        <th style="width:24px">#</th>
        <th>TEAM</th>
        <th style="text-align:center">W-L</th>
        <th style="text-align:right">FP</th>
      </tr></thead>
      <tbody>
        ${standings.map((s,i)=>`
        <tr class="${s.m.id===myId?'me':''}">
          <td class="rank">${i===0?'👑':(i+1)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              ${avatarEl(s.m.display_name,s.m.color||'#4a9eff',24,8)}
              <span class="team-name">${s.m.display_name}</span>
              ${s.m.id===myId?'<span style="font-family:var(--pixel);font-size:5px;color:var(--accent1)">YOU</span>':''}
            </div>
          </td>
          <td class="record" style="text-align:center">${s.record||'0-0'}</td>
          <td class="fp-total" style="text-align:right">${s.fp.toFixed(1)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section-label">THIS WEEK'S MATCHUPS</div>
  ${renderWeekMatchups(currentRun)}`;
}

function renderWeekMatchups(runId){
  const mid=getMyId();
  const schedule=(leagueState.schedule||{})[runId]||[];
  const weekIdx=getCurrentWeekIndex(runId);
  if(weekIdx<0 || weekIdx>=schedule.length) return '<div style="padding:0 14px;font-family:var(--pixel);font-size:6px;color:var(--text3)">SCHEDULE NOT YET GENERATED</div>';
  const week=schedule[weekIdx]||[];
  const managers=leagueState.managers||[];
  const getM=id=>managers.find(m=>m.id===id)||{id,display_name:'?',color:'#4a9eff'};
  return week.map(matchup=>{
    const h=getM(matchup.home), a=getM(matchup.away);
    const hFP=managerFP(matchup.home), aFP=managerFP(matchup.away);
    const isMine=matchup.home===mid||matchup.away===mid;
    return `
    <div class="matchup-card" style="${isMine?'border-color:var(--accent1)':''}">
      <div class="matchup-body" style="padding:10px">
        <div class="matchup-team">
          <span class="fp" style="font-size:14px;${hFP>aFP?'color:var(--accent2)':''}">${hFP.toFixed(1)}</span>
          <div class="name" style="color:${h.color}">${h.display_name}</div>
        </div>
        <div class="matchup-vs" style="font-size:7px">VS</div>
        <div class="matchup-team">
          <span class="fp" style="font-size:14px;${aFP>hFP?'color:var(--accent2)':''}">${aFP.toFixed(1)}</span>
          <div class="name" style="color:${a.color}">${a.display_name}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── ROSTER SCREEN ────────────────────────────────────────────────────────────
function renderRosterScreen(){
  renderMyRosterList();
  renderAvailablePlayers();
  const mid=getMyId();
  const used=mid?waiverUsedThisWeek(mid):0;
  const el=document.getElementById('waiver-remaining');
  if(el) el.textContent=`${WAIVER_WEEKLY-used} / ${WAIVER_WEEKLY}`;
}

function renderMyRosterList(){
  const el=document.getElementById('roster-list-container');
  if(!el) return;
  const mid=getMyId();
  if(!mid){ el.innerHTML=''; return; }
  const roster=getMyRoster();
  if(!roster.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">📋</div><div class="label">NO PLAYERS YET<br/>WAIT FOR DRAFT OR ADD BELOW</div></div>`;
    return;
  }
  const active=getMyActive().length ? getMyActive() : autoActiveFor(mid);
  const topFP=Math.max(...roster.map(id=>playerTotalFP(id)));

  const rowHtml=(pid)=>{
    const p=getPlayer(pid); if(!p) return '';
    const fp=playerTotalFP(pid);
    const isActive=active.includes(pid);
    const isLocked=fp>=topFP && roster.length>1;
    const port=playerPortraits[p.name];
    const portEl=port
      ? `<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top;image-rendering:pixelated"/>`
      : `<div class="initials" style="color:${myProfile?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    return `
    <div class="player-row" style="padding:8px 14px">
      <div class="player-portrait">${portEl}</div>
      <div class="player-info">
        <div class="player-name">${p.name} ${isLocked?'🔒':''}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${isActive?'<span style="color:var(--accent2)">● ACTIVE</span>':'<span style="color:var(--accent4)">● INACTIVE</span>'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="player-fp" style="font-size:11px">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="toggleActiveStatus('${mid}',${pid})">
            ${isActive?'BENCH':'START'}
          </button>
          ${!isLocked?`<button class="btn btn-sm btn-danger" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="confirmDrop('${mid}',${pid})">DROP</button>`:''}
        </div>
      </div>
    </div>`;
  };

  el.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
    ${roster.map(rowHtml).join('')}
  </div>`;
}

function renderAvailablePlayers(){
  const el=document.getElementById('available-players-container');
  if(!el) return;
  const mid=getMyId();
  const allRostered=new Set(Object.values(leagueState.rosters||{}).flat());
  const query=(document.getElementById('player-search')?.value||'').toLowerCase();
  const available=PLAYERS.filter(p=>!allRostered.has(p.id) && (!query || p.name.toLowerCase().includes(query) || p.team.toLowerCase().includes(query) || p.pos.toLowerCase().includes(query)));
  const sorted=[...available].sort((a,b)=>(b.ppg+b.rpg+b.apg+b.spg+b.bpg)-(a.ppg+a.rpg+a.apg+a.spg+a.bpg));
  const canAdd=mid && canWaiver(mid) && getMyRoster().length<ROSTER_SIZE;

  if(!sorted.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><div class="label">NO PLAYERS FOUND</div></div>`;
    return;
  }

  el.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
    ${sorted.slice(0,50).map(p=>{
      const fp=playerTotalFP(p.id);
      const port=playerPortraits[p.name];
      const portEl=port
        ? `<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top;image-rendering:pixelated"/>`
        : `<div class="initials" style="color:var(--text3);font-size:7px">${initials(p.name)}</div>`;
      return `
      <div class="player-row" style="padding:8px 14px">
        <div class="player-portrait">${portEl}</div>
        <div class="player-info">
          <div class="player-name">${p.name}</div>
          <div class="player-meta">${p.pos} · ${p.team}</div>
          <div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="player-fp" style="font-size:10px">${fp>0?fp.toFixed(1)+'<span class="fp-label">FP</span>':''}</div>
          ${canAdd?`<button class="btn btn-sm btn-primary" style="font-size:5px;padding:4px 8px;min-height:24px" onclick="confirmAdd('${mid}',${p.id})">ADD</button>`:''}
        </div>
      </div>`;
    }).join('')}
    ${sorted.length>50?`<div style="padding:10px;text-align:center;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">+ ${sorted.length-50} MORE — SEARCH TO NARROW</div>`:''}
  </div>`;
}

async function confirmAdd(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  const roster=getMyRoster();
  if(roster.length>=ROSTER_SIZE){
    toast('Roster full! Drop a player first');
    return;
  }
  const ok=await addPlayer(mid,pid);
  if(ok){
    toast(`${p.name} added!`);
    renderRosterScreen();
  }
}

async function confirmDrop(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  if(!confirm(`Drop ${p.name}?`)) return;
  const ok=await dropPlayer(mid,pid);
  if(ok){
    toast(`${p.name} dropped`);
    renderRosterScreen();
  }
}

// ── PROFILE SCREEN ───────────────────────────────────────────────────────────
function renderProfileScreen(){
  if(!myProfile) return;
  const color=myProfile.color||'#4a9eff';
  const name=myProfile.display_name||'Player';
  document.getElementById('profile-avatar').style.background=color;
  document.getElementById('profile-avatar').style.color='#000';
  document.getElementById('profile-avatar').textContent=initials(name);
  document.getElementById('profile-name-display').textContent=name;
  document.getElementById('profile-email-display').textContent=myProfile.email||'';
  // Commissioner row
  const adminRow=document.getElementById('admin-row');
  if(adminRow) adminRow.style.display=(myProfile.is_commissioner||myProfile.email===COMMISSIONER_EMAIL)?'flex':'none';
  // Run info
  const run=getCurrentRun();
  const runVal=document.getElementById('current-run-value');
  if(runVal) runVal.textContent=`${run.name} Run`;
  const teamVal=document.getElementById('team-name-value');
  if(teamVal) teamVal.textContent=myProfile.team_name||(name+"'s Team");

  // Fantasy standings
  const myId=getMyId();
  if(myId && leagueState.managers){
    const schedule=(leagueState.schedule||{})[currentRun]||[];
    let wins=0,losses=0,ties=0;
    schedule.forEach(week=>week.forEach(matchup=>{
      if(!matchup.winner) return;
      if(matchup.home===myId||matchup.away===myId){
        if(matchup.winner===myId) wins++;
        else if(matchup.winner==='tie') ties++;
        else losses++;
      }
    }));
    const record=`${wins}-${losses}${ties?'-'+ties:''}`;
    const fp=managerFP(myId);
    const recEl=document.getElementById('profile-record');
    const fpEl=document.getElementById('profile-total-fp');
    if(recEl) recEl.textContent=record||'0-0';
    if(fpEl) fpEl.textContent=fp.toFixed(1)+' FP';
  }

  // WLC stats
  if(myId){
    const wlcStandings=leagueState.wlc?.standings||{};
    const ws=wlcStandings[myId]||{wins:0,totalFP:0};
    const wlcWins=document.getElementById('profile-wlc-wins');
    const wlcTFP=document.getElementById('profile-wlc-total-fp');
    if(wlcWins) wlcWins.textContent=ws.wins+' wins';
    if(wlcTFP) wlcTFP.textContent=ws.totalFP.toFixed(1)+' FP';
    // Current week FP
    const wk=wlcWeekKey();
    const week=(leagueState.wlc?.weeks||{})[wk];
    const lineup=getMyWlcLineup(wk);
    const curFP=week?computeWlcFP(lineup.picks,lineup.swaps,wk):0;
    const wlcCur=document.getElementById('profile-wlc-current-fp');
    if(wlcCur) wlcCur.textContent=week?curFP.toFixed(1)+' FP':'No active week';
  }

  // Duel streaks
  if(myId){
    const duelStreaks=leagueState.duelStreaks||{};
    const ds=duelStreaks[myId]||{streak:0,longest:0};
    const duelCur=document.getElementById('profile-duel-streak');
    const duelBest=document.getElementById('profile-duel-best');
    if(duelCur) duelCur.textContent=(ds.streak||0)+' day'+(ds.streak!==1?'s':'');
    if(duelBest) duelBest.textContent=(ds.longest||ds.streak||0)+' day'+((ds.longest||ds.streak||0)!==1?'s':'');
  }
}

function openAvatarEditor(){
  // Simple color picker for now — future: photo upload
  const colors=['#4a9eff','#00d4aa','#f5a623','#e94560','#7b2fff','#00c49a','#ff6b6b','#ffd93d'];
  const myId=getMyId();
  let modal=document.getElementById('avatar-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='avatar-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';
  modal.innerHTML=`
    <div class="modal-box" style="max-width:340px;width:calc(100% - 32px);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3)">PICK YOUR COLOR</div>
        <button onclick="document.getElementById('avatar-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
        ${colors.map(c=>`<div onclick="setMyColor('${c}')" style="width:100%;aspect-ratio:1;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c===(myProfile?.color||'#4a9eff')?'#fff':'transparent'};transition:transform .1s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"></div>`).join('')}
      </div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);text-align:center">More avatar options coming soon</div>
    </div>`;
  document.body.appendChild(modal);
}

async function setMyColor(color){
  const myId=getMyId();
  if(!myId) return;
  const managers=leagueState.managers||[];
  const m=managers.find(m=>m.id===myId);
  if(m) m.color=color;
  if(myProfile) myProfile.color=color;
  await saveLeagueState();
  // Also update managers table
  await db.from('managers').update({color}).eq('id',myId);
  document.getElementById('avatar-modal')?.remove();
  renderProfileScreen();
  updateUserChip();
  toast('Color updated!');
}

// ── ADMIN PANEL ──────────────────────────────────────────────────────────────
function openAdminPanel(){
  document.getElementById('admin-panel').classList.add('open');
  renderAdminContent();
}
function closeAdminPanel(){
  document.getElementById('admin-panel').classList.remove('open');
}

async function renderAdminContent(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  // Load all managers
  const {data:managers}=await db.from('managers').select('*').order('created_at');
  el.innerHTML=`
  <div class="section-label" style="padding:0 0 8px">USERS (${managers?.length||0})</div>
  <div class="card" style="padding:0;overflow:hidden;margin:0">
    ${(managers||[]).map(m=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
      ${avatarEl(m.display_name,m.color||'#4a9eff',28,9)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${m.display_name}</div>
        <div style="font-size:10px;color:var(--text3)">${m.email}</div>
      </div>
      ${m.is_commissioner?'<span style="font-family:var(--pixel);font-size:5px;color:var(--accent3)">⭐ COMM</span>':''}
    </div>`).join('')}
  </div>

  <div class="section-label" style="padding:12px 0 8px">INVITE CODE</div>
  <div class="card" style="margin:0">
    <div style="font-family:var(--pixel);font-size:10px;color:var(--accent3);letter-spacing:2px">${INVITE_CODE}</div>
    <div style="font-size:11px;color:var(--text3);margin-top:6px">Share this code with new users</div>
  </div>

  <div class="section-label" style="padding:12px 0 8px">LEAGUE ACTIONS</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn btn-secondary btn-full" onclick="generateSchedule()">🗓 Generate Schedule</button>
    <button class="btn btn-secondary btn-full" onclick="forceRefreshStats()">🔄 Force Refresh Stats</button>
    <button class="btn btn-secondary btn-full" onclick="runDraftSetup()">🎯 Start Draft</button>
  </div>

  ${renderAdminDuelSection()}
  ${renderAdminWlcSection()}
  `;
}

// ── SCHEDULE GENERATION ──────────────────────────────────────────────────────
function generateSchedule(){
  const managers=leagueState.managers||[];
  if(managers.length<2){ toast('Need at least 2 managers'); return; }
  const schedule={};
  for(const run of RUNS){
    schedule[run.id]=buildRoundRobinSchedule(managers.map(m=>m.id));
  }
  leagueState.schedule=schedule;
  saveLeagueState();
  toast('Schedule generated!');
  renderAdminContent();
}

function buildRoundRobinSchedule(teams){
  // Round-robin: everyone plays everyone at least once
  const n=teams.length;
  const rounds=[];
  const list=[...teams];
  const hasBye=n%2!==0;
  if(hasBye) list.push(null); // null = bye
  const numRounds=list.length-1;
  for(let r=0;r<numRounds;r++){
    const week=[];
    for(let i=0;i<list.length/2;i++){
      const h=list[i], a=list[list.length-1-i];
      if(h!==null && a!==null) week.push({home:h,away:a});
    }
    rounds.push(week);
    // Rotate: keep first fixed, rotate others
    list.splice(1,0,list.pop());
  }
  return rounds;
}

async function forceRefreshStats(){
  toast('Refreshing stats…');
  await refreshLiveStats();
  toast('Stats refreshed!');
}

async function runDraftSetup(){
  toast('Draft setup coming soon!');
}

// ── RENDER ───────────────────────────────────────────────────────────────────
function render(){
  if(currentScreen==='home') renderHomeScreen();
  else if(currentScreen==='fantasy') renderFantasyScreen();
  else if(currentScreen==='roster') renderRosterScreen();
  else if(currentScreen==='profile') renderProfileScreen();
}

// ── CHIP UI ──────────────────────────────────────────────────────────────────
function updateUserChip(){
  if(!myProfile) return;
  const el=document.getElementById('chip-avatar');
  const nameEl=document.getElementById('chip-name');
  if(el){
    el.style.background=myProfile.color||'#4a9eff';
    el.style.color='#000';
    el.textContent=initials(myProfile.display_name||'?');
  }
  if(nameEl) nameEl.textContent=myProfile.display_name||'';
}

// ── BOOT ────────────────────────────────────────────────────────────────────
async function boot(){
  // Auth state listener
  db.auth.onAuthStateChange(async (event,session)=>{
    currentUser=session?.user||null;
    if(currentUser){
      await loadManagerProfile();
      await loadLeagueState();
      await loadPortraits();
      await ensureTodaysDuel();
      showApp();
      updateUserChip();
      renderHomeScreen();
      startPolling();
    } else {
      showLogin();
    }
    hideLoading();
  });

  // Check for existing session
  const {data:{session}}=await db.auth.getSession();
  if(!session){
    hideLoading();
    showLogin();
  }
}

function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('bottom-nav').style.display='flex';
  showScreen('home');
}

function showLogin(){
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('bottom-nav').style.display='none';
}

function hideLoading(){
  const el=document.getElementById('loading-screen');
  if(el){ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),400); }
}

// ── WEEKLY LINE-UP CHALLENGE ─────────────────────────────────────────────────

// WLC constants
const WLC_SALARY_CAP = 15;
const WLC_TEAM_SIZE  = 5;
const WLC_TIER_SIZE  = 5; // players per tier
const WLC_POOL_SIZE  = 25;

// Get or create current week key (Sun–Sat, starts Sunday)
function wlcWeekKey(date){
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0=Sun
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  return sunday.toISOString().split('T')[0];
}

function wlcWeekLabel(weekKey){
  const sun = new Date(weekKey);
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `${fmt(sun)} – ${fmt(sat)}`;
}

function getCurrentWlcWeek(){
  const wk = wlcWeekKey();
  return (leagueState.wlc?.weeks||{})[wk] || null;
}

// Get my WLC lineup for this week
function getMyWlcLineup(weekKey){
  const wk = weekKey || wlcWeekKey();
  const mid = getMyId();
  return ((leagueState.wlc?.lineups||{})[wk]||{})[mid] || {picks:[], swaps:[]};
}

// Is the lineup locked (past tip-off)?
function isWlcLocked(weekKey){
  const wk = weekKey || wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week) return false;
  if(week.status === 'locked' || week.status === 'final') return true;
  if(!week.tipoffTime) return false;
  return new Date() >= new Date(week.tipoffTime);
}

// Get player from pool by name
function getWlcPlayer(name, pool){
  return (pool||[]).find(p=>p.n===name)||null;
}

// Compute FP earned for a WLC lineup this week (from playerStats)
function computeWlcFP(picks, swaps, weekKey){
  const wk = weekKey || wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week) return 0;
  const weekStart = new Date(wk);
  const weekEnd = new Date(wk); weekEnd.setDate(weekEnd.getDate()+7);
  let total = 0;
  for(const name of picks){
    // Check if this pick was swapped out
    const swapOut = (swaps||[]).find(s=>s.from===name);
    const cutoff = swapOut ? new Date(swapOut.time) : weekEnd;
    // Find matching player in PLAYERS array for live stats
    const p = PLAYERS.find(pl=>pl.name===name);
    if(!p) continue;
    // Sum stats from saved playerStats in the week date range, up to cutoff
    const fp = Object.values(leagueState.playerStats||{})
      .filter(s => s.pid===p.id)
      .filter(s => {
        const d = new Date(s.date);
        return d >= weekStart && d < cutoff;
      })
      .reduce((sum,s)=>sum+(s.fp||0),0);
    total += fp;
  }
  // Add swapped-in players (only FP from swap point forward)
  for(const sw of (swaps||[])){
    const p = PLAYERS.find(pl=>pl.name===sw.to);
    if(!p) continue;
    const swapTime = new Date(sw.time);
    const fp = Object.values(leagueState.playerStats||{})
      .filter(s => s.pid===p.id)
      .filter(s => {
        const d = new Date(s.date);
        return d >= swapTime && d < weekEnd;
      })
      .reduce((sum,s)=>sum+(s.fp||0),0);
    total += fp;
  }
  return +total.toFixed(1);
}

// Save my WLC lineup
async function saveWlcLineup(picks){
  const wk = wlcWeekKey();
  const mid = getMyId();
  if(!mid) return;
  if(isWlcLocked(wk)){ toast('LOCKED — game has tipped off!'); return; }
  if(!leagueState.wlc) leagueState.wlc = {weeks:{},lineups:{},results:{},standings:{}};
  if(!leagueState.wlc.lineups[wk]) leagueState.wlc.lineups[wk] = {};
  const existing = leagueState.wlc.lineups[wk][mid] || {picks:[], swaps:[]};
  leagueState.wlc.lineups[wk][mid] = {...existing, picks};
  await saveLeagueState();
  window._wlcPicksWeekKey = null; // force sync on next render
  toast('LINEUP SAVED! ✓');
  renderWlcScreen();
}

// Mid-week swap: replace 'fromName' with 'toName' (same tier, from original pool)
async function doWlcSwap(fromName, toName){
  const wk = wlcWeekKey();
  const mid = getMyId();
  if(!mid) return;
  if(!isWlcLocked(wk)){ toast('Swaps only available after tip-off'); return; }
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week){ toast('No active week'); return; }
  const lineup = getMyWlcLineup(wk);
  if(!lineup.picks.includes(fromName)){ toast('Player not in your lineup'); return; }
  if(lineup.picks.includes(toName)){ toast('Already in your lineup'); return; }
  // Check same tier
  const pool = week.pool || [];
  const fromP = getWlcPlayer(fromName, pool);
  const toP = getWlcPlayer(toName, pool);
  if(!fromP || !toP){ toast('Invalid players'); return; }
  if(fromP.tier !== toP.tier){ toast('Must swap same tier ($'+fromP.tier+')'); return; }
  // Check toName not already swapped in
  if((lineup.swaps||[]).some(s=>s.to===toName)){ toast('Player already used as swap'); return; }
  // Check fromName not already swapped out
  if((lineup.swaps||[]).some(s=>s.from===fromName)){ toast('Player already swapped out'); return; }
  const swap = {from:fromName, to:toName, time:new Date().toISOString()};
  lineup.swaps = [...(lineup.swaps||[]), swap];
  leagueState.wlc.lineups[wk][mid] = lineup;
  await saveLeagueState();
  toast(`SWAPPED: ${fromName.split(' ').pop()} ➜ ${toName.split(' ').pop()}`);
  renderWlcScreen();
}

// Generate a WLC week proposal (commissioner-facing)
// Called by commissioner to create next week's pool; auto-picks theme
function generateWlcProposal(forDate){
  const wk = wlcWeekKey(forDate);
  // Suggest a theme based on week number (cycle through themes)
  const weekNum = Math.floor((new Date(wk) - new Date('2026-10-19')) / (7*24*3600*1000));
  const themes = [
    {name:'All-Stars',    filter: p => p.r <= 50},
    {name:'Atlantic Division', filter: p => ['BOS','BKN','NY','PHI','TOR'].includes(p.t)},
    {name:'Central Division',  filter: p => ['CHI','CLE','DET','IND','MIL'].includes(p.t)},
    {name:'Southeast Division',filter: p => ['ATL','CHA','MIA','ORL','WSH'].includes(p.t)},
    {name:'Northwest Division',filter: p => ['DEN','MIN','OKC','POR','UTAH'].includes(p.t)},
    {name:'Pacific Division',  filter: p => ['GS','LAC','LAL','PHX','SAC'].includes(p.t)},
    {name:'Southwest Division',filter: p => ['DAL','HOU','MEM','NO','SA'].includes(p.t)},
    {name:'Rising Stars',      filter: p => p.r >= 30 && p.r <= 100},
    {name:'Top 25',            filter: p => p.r <= 25},
    {name:'East Conference',   filter: p => ['BOS','BKN','NY','PHI','TOR','CHI','CLE','DET','IND','MIL','ATL','CHA','MIA','ORL','WSH'].includes(p.t)},
    {name:'West Conference',   filter: p => ['DEN','MIN','OKC','POR','UTAH','GS','LAC','LAL','PHX','SAC','DAL','HOU','MEM','NO','SA'].includes(p.t)},
    {name:'Class of 2025',     filter: p => ['Cooper Flagg','Dylan Harper','Kon Knueppel','Matas Buzelis','Darryn Peterson','Darius Acuff Jr.','Derik Queen'].includes(p.n)},
    {name:'Veterans Club',     filter: p => VETERANS.includes(p.n)},
    {name:'Centers & Bigs',    filter: p => ['C','PF'].some(pos=>{ const dbP = PLAYERS.find(pl=>pl.name===p.n); return dbP && dbP.pos && dbP.pos.includes(pos); })},
    {name:'Point Guards',      filter: p => { const dbP = PLAYERS.find(pl=>pl.name===p.n); return dbP && dbP.pos && dbP.pos.includes('PG'); }},
  ];
  const theme = themes[weekNum % themes.length];
  let eligible = PLAYERS_DB.filter(theme.filter);
  // Need at least 25; if not enough, broaden to top ranked
  if(eligible.length < WLC_POOL_SIZE){
    // Supplement with overall top players not already included
    const names = new Set(eligible.map(p=>p.n));
    const extra = PLAYERS_DB.filter(p=>!names.has(p.n)).slice(0, WLC_POOL_SIZE - eligible.length);
    eligible = [...eligible, ...extra];
  }
  // Sort by fpPG, take top 25
  const pool = eligible.sort((a,b)=>b.fpPG-a.fpPG).slice(0, WLC_POOL_SIZE);
  return { weekKey: wk, theme: theme.name, pool: assignTiers(pool) };
}

// Compute WLC results for a completed week
function computeWlcResults(weekKey){
  const wk = weekKey || wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week) return null;
  const lineups = (leagueState.wlc?.lineups||{})[wk] || {};
  const pool = week.pool || [];
  const managers = leagueState.managers || [];

  // Calculate each manager's FP
  const scores = {};
  for(const [mid, lineup] of Object.entries(lineups)){
    scores[mid] = computeWlcFP(lineup.picks, lineup.swaps, wk);
  }

  // Find winner(s)
  const maxFP = Math.max(...Object.values(scores));
  const winners = Object.keys(scores).filter(id=>scores[id]===maxFP);

  // Best possible 5 from pool (by actual week FP)
  const poolFPs = pool.map(p=>{
    const pl = PLAYERS.find(pl=>pl.name===p.n);
    const weekStart = new Date(wk);
    const weekEnd = new Date(wk); weekEnd.setDate(weekEnd.getDate()+7);
    const fp = pl ? Object.values(leagueState.playerStats||{})
      .filter(s=>s.pid===pl.id && new Date(s.date)>=weekStart && new Date(s.date)<weekEnd)
      .reduce((sum,s)=>sum+(s.fp||0),0) : 0;
    return {name:p.n, fp:+fp.toFixed(1)};
  });
  const best5 = poolFPs.sort((a,b)=>b.fp-a.fp).slice(0,5);

  // Best user lineup
  let bestUserFP = -1, bestUserId = null;
  for(const [mid,fp] of Object.entries(scores)){
    if(fp>bestUserFP){ bestUserFP=fp; bestUserId=mid; }
  }
  const bestUserMgr = managers.find(m=>m.id===parseInt(bestUserId));

  return { scores, winners, best5, bestUser:{ id:bestUserId, name:bestUserMgr?.display_name||'—', fp:bestUserFP } };
}

// Update WLC standings after a week is finalized
async function finalizeWlcWeek(weekKey){
  const results = computeWlcResults(weekKey);
  if(!results) return;
  if(!leagueState.wlc.results) leagueState.wlc.results = {};
  if(!leagueState.wlc.standings) leagueState.wlc.standings = {};
  leagueState.wlc.results[weekKey] = results;
  leagueState.wlc.weeks[weekKey].status = 'final';
  // Update standings
  for(const [mid,fp] of Object.entries(results.scores)){
    if(!leagueState.wlc.standings[mid]) leagueState.wlc.standings[mid] = {wins:0, totalFP:0};
    leagueState.wlc.standings[mid].totalFP = +(leagueState.wlc.standings[mid].totalFP + fp).toFixed(1);
  }
  for(const winnerId of results.winners){
    if(!leagueState.wlc.standings[winnerId]) leagueState.wlc.standings[winnerId] = {wins:0, totalFP:0};
    leagueState.wlc.standings[winnerId].wins++;
  }
  await saveLeagueState();
}

// ── WLC RENDER ────────────────────────────────────────────────────────────────

function renderWlcScreen(){
  const el = document.getElementById('wlc-content');
  if(!el) return;
  if(!leagueState || !myProfile){ el.innerHTML='<div style="padding:20px;text-align:center;font-family:var(--pixel);font-size:7px;color:var(--text3)">LOADING...</div>'; return; }

  const wk = wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];

  if(!week){
    renderWlcNoWeek(el, wk);
    return;
  }
  if(week.status === 'pending'){
    renderWlcPendingApproval(el, week, wk);
    return;
  }
  const locked = isWlcLocked(wk);
  const lineup = getMyWlcLineup(wk);
  const pool = week.pool || [];

  el.innerHTML = '';

  // Header (theme + rules link)
  const headerDiv = document.createElement('div');
  headerDiv.className = 'wlc-header';
  headerDiv.innerHTML = `
    <span class="wlc-theme-badge">${week.theme||'Week'}</span>
    <button onclick="showWlcRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;padding:4px 0">RULES ›</button>`;
  el.appendChild(headerDiv);

  // Week label
  const weekLabel = document.createElement('div');
  weekLabel.style.cssText = 'padding:4px 14px 10px;font-family:var(--pixel);font-size:5.5px;color:var(--text3);';
  weekLabel.textContent = wlcWeekLabel(wk);
  el.appendChild(weekLabel);

  // Tabs: PICK | STANDINGS
  const tabWrap = document.createElement('div');
  tabWrap.style.cssText = 'display:flex;border-bottom:1px solid var(--border);margin:0 14px 12px;';
  const tab1 = document.createElement('button');
  tab1.id = 'wlc-tab-pick';
  tab1.style.cssText = 'flex:1;padding:9px;background:none;border:none;font-family:var(--pixel);font-size:6px;cursor:pointer;color:var(--accent2);border-bottom:2px solid var(--accent2);';
  tab1.textContent = 'MY LINEUP';
  tab1.onclick = ()=>{ document.getElementById('wlc-pane-pick').style.display=''; document.getElementById('wlc-pane-standings').style.display='none'; tab1.style.color='var(--accent2)'; tab1.style.borderBottom='2px solid var(--accent2)'; tab2.style.color='var(--text3)'; tab2.style.borderBottom='none'; };
  const tab2 = document.createElement('button');
  tab2.id = 'wlc-tab-standings';
  tab2.style.cssText = 'flex:1;padding:9px;background:none;border:none;font-family:var(--pixel);font-size:6px;cursor:pointer;color:var(--text3);border-bottom:none;';
  tab2.textContent = 'STANDINGS';
  tab2.onclick = ()=>{ document.getElementById('wlc-pane-pick').style.display='none'; document.getElementById('wlc-pane-standings').style.display=''; tab2.style.color='var(--accent2)'; tab2.style.borderBottom='2px solid var(--accent2)'; tab1.style.color='var(--text3)'; tab1.style.borderBottom='none'; };
  tabWrap.appendChild(tab1); tabWrap.appendChild(tab2);
  el.appendChild(tabWrap);

  // ── PICK PANE ──
  const pickPane = document.createElement('div');
  pickPane.id = 'wlc-pane-pick';

  // Salary bar
  const activePicks = window._wlcCurrentPicks || lineup.picks;
  const salaryCost = activePicks.reduce((sum,name)=>{
    const p=pool.find(pl=>pl.n===name); return sum+(p?p.salary:0);
  },0);
  const salaryDiv = document.createElement('div');
  salaryDiv.className = 'wlc-salary-bar';
  salaryDiv.innerHTML = `
    <div class="wlc-salary-info">
      <div style="font-size:6px;color:var(--text3);margin-bottom:3px">SALARY USED</div>
      <span class="wlc-salary-used" style="font-size:14px">$${salaryCost}</span>
      <span class="wlc-salary-cap"> / $${WLC_SALARY_CAP}</span>
    </div>
    <div class="wlc-salary-info" style="text-align:right">
      <div style="font-size:6px;color:var(--text3);margin-bottom:3px">PICKS</div>
      <span style="font-size:14px;font-family:var(--pixel);color:${activePicks.length===WLC_TEAM_SIZE?'var(--accent2)':'var(--text3)'}">${activePicks.length}<span style="font-size:8px;color:var(--text3)">/${WLC_TEAM_SIZE}</span></span>
    </div>`;
  pickPane.appendChild(salaryDiv);

  // Lock banner if active
  if(locked){
    const lockDiv = document.createElement('div');
    lockDiv.className = 'wlc-locked-banner';
    lockDiv.innerHTML = `🔒 LOCKED — GAME HAS TIPPED OFF<br><span style="font-size:5px;color:var(--text3)">You can still swap injured players (same tier)</span>`;
    pickPane.appendChild(lockDiv);
  }

  // My picks summary (if any)
  if(lineup.picks.length > 0){
    const summDiv = document.createElement('div');
    summDiv.className = 'wlc-picks-summary';
    summDiv.innerHTML = `<div class="wlc-picks-title">YOUR ${locked?'LOCKED ':''}LINEUP</div>`;
    for(const name of lineup.picks){
      const p = pool.find(pl=>pl.n===name);
      const isSwappedOut = (lineup.swaps||[]).some(s=>s.from===name);
      const swapIn = (lineup.swaps||[]).find(s=>s.from===name);
      const row = document.createElement('div');
      row.className = 'wlc-pick-row';
      row.style.opacity = isSwappedOut ? '0.45' : '1';
      row.innerHTML = `
        <span class="wlc-pick-name">${name.toUpperCase()}${isSwappedOut?'<br><span style="color:var(--accent4);font-size:4px">▶ SWAPPED OUT</span>':''}</span>
        <span class="wlc-pick-tier tier-${p?p.tier:1}" style="border-radius:10px;padding:2px 5px">$${p?p.salary:'?'}</span>
        <span class="wlc-pick-fp">${p?p.fpPG+'/g':''}</span>
        ${locked && !isSwappedOut ? `<button onclick="openWlcSwapModal('${name}')" style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--accent3);font-family:var(--pixel);font-size:4.5px;padding:3px 6px;cursor:pointer;margin-left:6px">SWAP</button>` : ''}`;
      summDiv.appendChild(row);
    }
    // Show any swapped-in players
    for(const sw of (lineup.swaps||[])){
      const p = pool.find(pl=>pl.n===sw.to);
      const row = document.createElement('div');
      row.className = 'wlc-pick-row';
      row.style.background = 'rgba(0,212,170,.05)';
      row.innerHTML = `
        <span class="wlc-pick-name" style="color:var(--accent2)">${sw.to.toUpperCase()}<br><span style="font-size:4px;color:var(--text3)">▲ SWAPPED IN ${new Date(sw.time).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></span>
        <span class="wlc-pick-tier tier-${p?p.tier:1}" style="border-radius:10px;padding:2px 5px">$${p?p.salary:'?'}</span>
        <span class="wlc-pick-fp">${p?p.fpPG+'/g':''}</span>`;
      summDiv.appendChild(row);
    }
    pickPane.appendChild(summDiv);
  }

  // Pool grid (grouped by tier)
  const tierLabel = document.createElement('div');
  tierLabel.style.cssText = 'padding:0 14px 8px;font-family:var(--pixel);font-size:6px;color:var(--text3);';
  tierLabel.textContent = locked ? 'PLAYER POOL (TAP LOCKED PICKS TO SWAP)' : 'SELECT 5 PLAYERS — $15 CAP';
  pickPane.appendChild(tierLabel);

  for(let tier=5; tier>=1; tier--){
    const tierPlayers = pool.filter(p=>p.tier===tier);
    const tierHead = document.createElement('div');
    tierHead.style.cssText = 'padding:4px 14px 6px;display:flex;align-items:center;gap:8px;';
    tierHead.innerHTML = `<span class="wlc-tier-badge tier-${tier}" style="width:22px;height:22px;border-radius:4px;">$${tier}</span><span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">TIER ${tier} — ${tierPlayers.length} PLAYERS</span>`;
    pickPane.appendChild(tierHead);

    const grid = document.createElement('div');
    grid.className = 'wlc-pool-grid';
    for(const p of tierPlayers){
      const activePicks = window._wlcCurrentPicks || lineup.picks;
      const isSelected = activePicks.includes(p.n);
      const isSwappedOut = (lineup.swaps||[]).some(s=>s.from===p.n);
      const isSwappedIn = (lineup.swaps||[]).some(s=>s.to===p.n);
      const card = document.createElement('div');
      card.className = 'wlc-player-card' + (isSelected&&!isSwappedOut?' selected':'') + (locked?' locked':'');
      card.innerHTML = `
        <span class="wlc-tier-badge tier-${tier}">$${tier}</span>
        <div class="wlc-player-name">${p.n}</div>
        <div class="wlc-player-meta">${p.t}</div>
        <div class="wlc-player-fp">${p.fpPG} FP/G</div>
        ${isSwappedIn?'<div class="wlc-swap-badge">▲ IN</div>':''}
        ${isSwappedOut?'<div class="wlc-swap-badge" style="color:var(--accent4)">▼ OUT</div>':''}`;
      if(!locked){
        card.onclick = () => toggleWlcPick(p.n, pool);
      }
      grid.appendChild(card);
    }
    pickPane.appendChild(grid);
  }

  // Submit button
  if(!locked){
    const submitWrap = document.createElement('div');
    submitWrap.style.cssText = 'padding:8px 14px 20px;';
    const canSubmit = activePicks.length===WLC_TEAM_SIZE && salaryCost<=WLC_SALARY_CAP;
    submitWrap.innerHTML = `<button class="btn btn-full ${canSubmit?'btn-primary':'btn-secondary'}" onclick="saveWlcLineup(window._wlcCurrentPicks||[])" ${canSubmit?'':'disabled'} style="${!canSubmit?'opacity:.4':''}">${activePicks.length===0?'PICK 5 PLAYERS':'SAVE LINEUP'}</button>`;
    pickPane.appendChild(submitWrap);
  }

  el.appendChild(pickPane);

  // ── STANDINGS PANE ──
  const standingsPane = document.createElement('div');
  standingsPane.id = 'wlc-pane-standings';
  standingsPane.style.display = 'none';
  renderWlcStandings(standingsPane);
  el.appendChild(standingsPane);

  // Sync pending picks tracker with saved if no pending edits
  // Only reset _wlcCurrentPicks if we just loaded (no in-progress selection)
  if(!window._wlcPicksWeekKey || window._wlcPicksWeekKey !== wk){
    window._wlcCurrentPicks = [...lineup.picks];
    window._wlcPicksWeekKey = wk;
  }
}

// Toggle a player in/out of the pending WLC picks
function toggleWlcPick(name, pool){
  if(!window._wlcCurrentPicks) window._wlcCurrentPicks = [...getMyWlcLineup().picks];
  const picks = window._wlcCurrentPicks;
  const idx = picks.indexOf(name);
  const p = pool.find(pl=>pl.n===name);
  if(idx >= 0){
    window._wlcCurrentPicks = picks.filter(n=>n!==name);
  } else {
    if(picks.length >= WLC_TEAM_SIZE){ toast('Already have 5 players!'); return; }
    const cost = picks.reduce((sum,n)=>{ const pp=pool.find(pl=>pl.n===n); return sum+(pp?pp.salary:0); },0) + (p?p.salary:0);
    if(cost > WLC_SALARY_CAP){ toast(`Over $${WLC_SALARY_CAP} cap! Can't add $${p.salary} player.`); return; }
    window._wlcCurrentPicks = [...picks, name];
  }
  renderWlcScreen();
}

// Open swap modal for mid-week injury swap
function openWlcSwapModal(fromName){
  const wk = wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week){ toast('No active week'); return; }
  const pool = week.pool || [];
  const fromP = pool.find(p=>p.n===fromName);
  if(!fromP){ toast('Player not found'); return; }
  const lineup = getMyWlcLineup(wk);

  // Find same-tier players not already in lineup or swapped
  const alreadyUsed = new Set([...lineup.picks, ...(lineup.swaps||[]).map(s=>s.to)]);
  const eligible = pool.filter(p=>p.tier===fromP.tier && p.n!==fromName && !alreadyUsed.has(p.n));

  if(!eligible.length){ toast('No available players in this tier'); return; }

  // Build a simple modal
  let modal = document.getElementById('wlc-swap-modal');
  if(modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'wlc-swap-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  let listHtml = eligible.map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-family:var(--pixel);font-size:6.5px">${p.n}</div>
        <div style="font-size:10px;color:var(--text3)">${p.t} · ${p.fpPG} FP/G</div>
      </div>
      <button onclick="doWlcSwap('${fromName}','${p.n}')" style="background:var(--accent2);border:none;border-radius:4px;color:var(--bg);font-family:var(--pixel);font-size:5.5px;padding:6px 10px;cursor:pointer">SELECT</button>
    </div>`).join('');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:360px;width:calc(100% - 32px);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3)">SWAP ${fromName.split(' ').pop().toUpperCase()}</div>
        <button onclick="document.getElementById('wlc-swap-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:10px">SELECT SAME TIER ($${fromP.tier}) REPLACEMENT:</div>
      ${listHtml}
    </div>`;
  document.body.appendChild(modal);
}

function renderWlcNoWeek(el, wk){
  const isComm = myProfile?.is_commissioner;
  el.innerHTML = `
    <div class="wlc-header" style="justify-content:flex-end"><button onclick="showWlcRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;">RULES ›</button></div>
    <div style="padding:20px 14px;">
      <div class="card">
        <div class="empty-state">
          <div class="icon" style="font-size:28px">🎯</div>
          <div class="label">NO ACTIVE WEEK<br/><span style="color:var(--text3);font-size:5px">CHECK BACK SUNDAY</span></div>
        </div>
      </div>
      ${isComm ? `
      <div style="margin-top:16px">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:8px;">COMMISSIONER: GENERATE THIS WEEK'S POOL</div>
        <button class="btn btn-full btn-primary" onclick="commGenerateWlcWeek()">⚡ GENERATE WEEK</button>
      </div>` : ''}
    </div>
    <div style="margin-top:8px">
      <div class="section-label">LIFETIME STANDINGS</div>
      <div class="wlc-standings-table" id="wlc-standings-body"></div>
    </div>`;
  const standDiv = el.querySelector('#wlc-standings-body');
  if(standDiv) renderWlcStandings(standDiv);
}

function renderWlcPendingApproval(el, week, wk){
  const isComm = myProfile?.is_commissioner;
  el.innerHTML = `
    <div class="wlc-header" style="justify-content:flex-end"><button onclick="showWlcRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;">RULES ›</button></div>
    <div style="padding:12px 14px">
      <div style="background:rgba(245,166,35,.1);border:1px solid var(--accent3);border-radius:var(--radius);padding:12px;margin-bottom:12px;">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3);margin-bottom:6px;">⏳ WEEK PENDING APPROVAL</div>
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text2)">THEME: ${week.theme}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-top:4px">${wlcWeekLabel(wk)}</div>
      </div>
      ${isComm ? `
      <button class="btn btn-full btn-primary" onclick="commApproveWlcWeek('${wk}')" style="margin-bottom:8px">✓ APPROVE & GO LIVE</button>
      <button class="btn btn-full btn-secondary" onclick="commRejectWlcWeek('${wk}')">✕ REJECT — REGENERATE</button>
      ` : '<div style="font-family:var(--pixel);font-size:6px;color:var(--text3);text-align:center;padding:12px">WAITING FOR COMMISSIONER APPROVAL...</div>'}
    </div>`;
}

function renderWlcStandings(container){
  const standings = leagueState.wlc?.standings || {};
  const managers = leagueState.managers || [];
  if(!managers.length){
    container.innerHTML = '<div style="padding:16px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO STANDINGS YET</div>';
    return;
  }

  // Current week scoreboard
  const wk = wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  const myId = getMyId();

  let currentHtml = '';
  if(week && (week.status==='active'||week.status==='locked'||week.status==='final')){
    const lineups = (leagueState.wlc?.lineups||{})[wk] || {};
    const curRows = managers.map(m=>{
      const lineup = lineups[m.id] || {picks:[],swaps:[]};
      const fp = computeWlcFP(lineup.picks, lineup.swaps, wk);
      return {...m, fp, picks: lineup.picks};
    }).sort((a,b)=>b.fp-a.fp);

    currentHtml = `
      <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);padding:0 0 8px">THIS WEEK — ${week.theme||'Current'}</div>
      <div class="card" style="padding:0;overflow:hidden;margin:0 0 16px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr>
            <th style="font-family:var(--pixel);font-size:5px;color:var(--text3);padding:6px 10px;text-align:left;border-bottom:1px solid var(--border)">#</th>
            <th style="font-family:var(--pixel);font-size:5px;color:var(--text3);padding:6px 10px;text-align:left;border-bottom:1px solid var(--border)">TEAM</th>
            <th style="font-family:var(--pixel);font-size:5px;color:var(--text3);padding:6px 10px;text-align:right;border-bottom:1px solid var(--border)">FP</th>
          </tr></thead>
          <tbody>
            ${curRows.map((m,i)=>`
            <tr style="${m.id===myId?'background:rgba(74,158,255,.06)':''}">
              <td style="padding:7px 10px;font-family:var(--pixel);font-size:6px;color:var(--text3)">${i+1}</td>
              <td style="padding:7px 10px">
                <div style="display:flex;align-items:center;gap:7px">
                  <div style="width:22px;height:22px;border-radius:50%;background:${m.color||'#4a9eff'};display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:5.5px;color:var(--bg);flex-shrink:0">${initials(m.display_name)}</div>
                  <span style="font-size:12px;font-weight:600">${m.display_name}${m.id===myId?' <span style="font-family:var(--pixel);font-size:4.5px;color:var(--accent1)">YOU</span>':''}</span>
                </div>
                ${m.picks.length?`<div style="font-family:var(--pixel);font-size:4.5px;color:var(--text3);margin-top:3px;padding-left:29px">${m.picks.map(n=>n.split(' ').pop()).join(' · ')}</div>`:'<div style="font-family:var(--pixel);font-size:4.5px;color:var(--accent4);margin-top:3px;padding-left:29px">NO LINEUP</div>'}
              </td>
              <td style="padding:7px 10px;font-family:var(--pixel);font-size:9px;color:var(--accent3);text-align:right">${m.fp.toFixed(1)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const rows = managers.map(m=>{
    const s = standings[m.id] || {wins:0, totalFP:0};
    return {...m, wins:s.wins, totalFP:s.totalFP};
  }).sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:b.totalFP-a.totalFP);

  let seasonHtml = '';
  rows.forEach((m,i)=>{
    const isMe = m.id===myId;
    seasonHtml += `
    <div class="wlc-standings-row" style="${isMe?'border-color:var(--accent2);':''}">
      <span class="wlc-standings-rank">${i+1}</span>
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <div style="width:24px;height:24px;border-radius:50%;background:${m.color||'#4a9eff'};display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:6px;color:var(--bg);">${initials(m.display_name)}</div>
        <span class="wlc-standings-name" style="${isMe?'color:var(--accent2)':''}">
          ${m.display_name}${isMe?' ★':''}
        </span>
      </div>
      <span class="wlc-standings-wins">${m.wins}W</span>
      <span class="wlc-standings-fp">${m.totalFP.toFixed(1)}</span>
    </div>`;
  });

  container.innerHTML = `
    ${currentHtml}
    <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);padding:0 0 8px">SEASON STANDINGS</div>
    <div class="wlc-standings-table" style="padding:0">
      ${seasonHtml || '<div style="padding:16px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO RESULTS YET</div>'}
    </div>`;
}

// ── WLC ADMIN (Commissioner) ──────────────────────────────────────────────────

async function commGenerateWlcWeek(){
  const proposal = generateWlcProposal();
  if(!leagueState.wlc) leagueState.wlc = {weeks:{},lineups:{},results:{},standings:{}};
  leagueState.wlc.weeks[proposal.weekKey] = {
    theme: proposal.theme,
    pool: proposal.pool,
    status: 'pending',
    tipoffTime: null,
    createdAt: new Date().toISOString(),
  };
  await saveLeagueState();
  toast(`Generated: ${proposal.theme}`);
  renderWlcScreen();
}

async function commApproveWlcWeek(weekKey){
  if(!leagueState.wlc?.weeks?.[weekKey]) return;
  leagueState.wlc.weeks[weekKey].status = 'active';
  // Default tip-off to next Sunday at 1pm ET
  const sun = new Date(weekKey);
  sun.setHours(18, 0, 0, 0); // 1pm ET = 18:00 UTC
  leagueState.wlc.weeks[weekKey].tipoffTime = sun.toISOString();
  await saveLeagueState();
  toast('Week is LIVE! Users can now submit lineups.');
  renderWlcScreen();
}

async function commRejectWlcWeek(weekKey){
  if(!leagueState.wlc?.weeks?.[weekKey]) return;
  delete leagueState.wlc.weeks[weekKey];
  await saveLeagueState();
  toast('Week rejected. Generate a new one.');
  renderWlcScreen();
}

async function commSetTipoff(weekKey, isoDateTime){
  if(!leagueState.wlc?.weeks?.[weekKey]) return;
  leagueState.wlc.weeks[weekKey].tipoffTime = isoDateTime;
  await saveLeagueState();
  toast('Tip-off time set.');
}

async function commFinalizeWeek(weekKey){
  await finalizeWlcWeek(weekKey);
  toast('Week finalized! Standings updated.');
  renderWlcScreen();
}

// WLC section in admin panel
function renderAdminWlcSection(){
  const wk = wlcWeekKey();
  const week = (leagueState.wlc?.weeks||{})[wk];
  const prevWks = Object.keys(leagueState.wlc?.weeks||{}).sort().reverse().filter(k=>k!==wk).slice(0,4);
  let html = `
    <div style="margin-top:16px">
      <div style="font-family:var(--pixel);font-size:8px;color:var(--accent3);margin-bottom:10px">🎯 LINE-UP CHALLENGE</div>
      <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:8px">CURRENT WEEK: ${wlcWeekLabel(wk)}</div>`;

  if(!week){
    html += `<button class="btn btn-full btn-primary" onclick="commGenerateWlcWeek()">⚡ GENERATE THIS WEEK</button>`;
  } else if(week.status==='pending'){
    html += `
      <div style="font-family:var(--pixel);font-size:6px;color:var(--accent3);margin-bottom:8px">STATUS: PENDING — Theme: ${week.theme}</div>
      <button class="btn btn-full btn-primary" onclick="commApproveWlcWeek('${wk}')" style="margin-bottom:8px">✓ APPROVE</button>
      <button class="btn btn-full btn-secondary" onclick="commRejectWlcWeek('${wk}')">✕ REJECT</button>`;
  } else if(week.status==='active'){
    html += `
      <div style="font-family:var(--pixel);font-size:6px;color:var(--accent2);margin-bottom:8px">STATUS: LIVE — ${week.theme}</div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">TIP-OFF: ${week.tipoffTime?new Date(week.tipoffTime).toLocaleString():'NOT SET'}</div>
      <button class="btn btn-full btn-danger" onclick="commFinalizeWeek('${wk}')">🏁 FINALIZE WEEK</button>`;
  } else if(week.status==='final'){
    html += `<div style="font-family:var(--pixel);font-size:6px;color:var(--text3)">WEEK FINALIZED ✓</div>`;
  }

  if(prevWks.length){
    html += `<div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-top:12px;margin-bottom:6px">PAST WEEKS</div>`;
    for(const pw of prevWks){
      const pw_week = leagueState.wlc.weeks[pw];
      html += `<div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);padding:5px 0;border-bottom:1px solid var(--border)">${wlcWeekLabel(pw)} — ${pw_week?.theme||'?'} (${pw_week?.status||'?'})</div>`;
    }
  }

  html += '</div>';
  return html;
}

// ── WLC RULES MODAL ──────────────────────────────────────────────────────────
function showWlcRules(){
  let modal=document.getElementById('wlc-rules-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='wlc-rules-modal';
  modal.className='modal-overlay';
  modal.style.cssText='display:flex;align-items:flex-end;';
  modal.innerHTML=`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px 12px 0 0;width:100%;max-width:var(--max-w);padding:20px 16px;max-height:85vh;overflow-y:auto;">
      <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:var(--pixel);font-size:8px;color:var(--accent3)">HOW IT WORKS</div>
        <button onclick="document.getElementById('wlc-rules-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:5px 10px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="font-family:var(--pixel);font-size:6px;color:var(--accent2);margin-bottom:10px;line-height:2">WEEKLY LINE-UP CHALLENGE</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:16px">
        <p style="margin-bottom:10px">Goal: Spend $15 or less and build the best 5-man team from the week's player pool.</p>
        <p style="margin-bottom:10px">Each week, the Commissioner selects a themed pool of 25 NBA players split into 5 tiers by salary — $1 through $5. Your job is to pick one player from any combination of tiers, as long as your total salary doesn't exceed $15.</p>
        <p style="margin-bottom:10px">Your team earns Fantasy Points (FP) based on how your players actually perform during the week. FP scoring: <strong>+1 per point, +1.2 per rebound, +1.5 per assist, +3 per steal, +3 per block, −1 per missed FG, −1 per missed FT, −1 per turnover.</strong></p>
        <p style="margin-bottom:10px">Lineups lock when the first game tips off. After that, you can swap an injured player once per week — same tier only.</p>
        <p>The manager with the most FP at the end of the week wins. Wins and total FP are tracked all season.</p>
      </div>
      <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);line-height:2">
        <div style="margin-bottom:6px;color:var(--accent3)">SALARY TIERS</div>
        <div>$5 TIER — Elite (top stars)</div>
        <div>$4 TIER — All-Star level</div>
        <div>$3 TIER — Solid starters</div>
        <div>$2 TIER — Role players</div>
        <div>$1 TIER — Deep cuts</div>
      </div>
    </div>`;
  modal.onclick=(e)=>{ if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
}

// ── START ────────────────────────────────────────────────────────────────────
boot();
