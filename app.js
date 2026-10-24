// NBA ARCADE 2026-27 — v1.0
// Fresh build for new season

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ipsngddnavymcmfbbcxu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc25nZGRuYXZ5bWNtZmJiY3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDk3NDMsImV4cCI6MjA5MTc4NTc0M30.0MmQn49Y0FCn3r8GFI5XspZR12YwGWTcTbv765VoJEQ';
const LEAGUE_KEY    = 'nba-arcade-2027';
const PORTRAITS_KEY = 'nba-portraits-2027';
const PORTRAITS_BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/player-portraits`;
// Storage can't hold accented file names, so portrait files are saved without accents
// ("Kasparas Jakucionis.jpeg"). Strip accents from the name before building the URL.
function plainName(n){ return String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ł/g,'l').replace(/Ł/g,'L').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/ø/g,'o'); }
function portraitUrl(team, name){ return `${PORTRAITS_BUCKET_URL}/${team}/${encodeURIComponent(plainName(name))}.jpeg`; }
const INVITE_CODE   = 'HOOPTIME27';  // commissioner sets this
const COMMISSIONER_EMAIL = 'daveschachter@gmail.com';

// Roster rules
const ROSTER_SIZE   = 10;
const ACTIVE_SIZE   = 8;
const INACTIVE_SIZE = 2;
const WAIVER_WEEKLY = 3;

// Runs / mini-seasons
const RUNS = [
  { id:1, name:'Fall',   start:'2026-10-20', end:'2026-12-27', color:'#ff6600' },
  { id:2, name:'Winter', start:'2026-12-28', end:'2027-02-18', color:'#4a9eff' },
  { id:3, name:'Spring', start:'2027-02-25', end:'2027-04-11', color:'#00d4aa' },
  { id:4, name:'Summer', start:'2027-04-13', end:'2027-06-30', color:'#fec419' },
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
let draftPickInFlight = false; // prevents double-submit while async save is in progress
let scheduleWeekOffset = 0; // 0 = current week, -1 = prev week, +1 = next, etc.
let bdlKey         = null;   // BallDontLie API key (fetched from Supabase config)
let todayGamesCache = {}; // {teamAbbr: {opponent, time, isHome}} — populated by ticker fetch

// Runtime map of BDL season averages: playerName → {fpPG, gp, pts, reb, ast, stl, blk}
// Populated by applyBdlSeasonAverages(). Single source of truth for live stat-based projections.
const BDL_STATS = {};

// Runtime injury map: playerName → {status, description}
// Populated by applyBdlInjuries(). Stored here (not leagueState) so it's available
// before leagueState loads from Supabase.
const BDL_INJURIES = {};

// ── PLAYER DATABASE ─────────────────────────────────────────────────────────
// Seed roster — used as fallback only if BDL hasn't loaded yet.
// applyBdlPlayers() replaces/extends this array with live BDL active-player data.
// Format: {id, name, pos, team, ppg, rpg, apg, spg, bpg}
const PLAYERS = [
  // Atlanta Hawks
  {id:101,name:"Jalen Johnson",pos:"PF",team:"ATL",ppg:22.5,rpg:9.2,apg:4.8,spg:1.5,bpg:0.9},
  {id:102,name:"Dyson Daniels",pos:"SG",team:"ATL",ppg:17.8,rpg:5.1,apg:3.6,spg:2.8,bpg:0.4},
  {id:103,name:"Onyeka Okongwu",pos:"PF",team:"ATL",ppg:15.2,rpg:9.8,apg:1.9,spg:1.1,bpg:1.5},
  {id:104,name:"C.J. McCollum",pos:"G",team:"ATL",ppg:17.5,rpg:3.5,apg:5.0,spg:0.8,bpg:0.3},
  {id:105,name:"Luguentz Dort",pos:"SG",team:"ATL",ppg:13.5,rpg:4.0,apg:1.8,spg:1.3,bpg:0.4},
  {id:106,name:"Nickeil Alexander-Walker",pos:"SG",team:"ATL",ppg:12.0,rpg:3.2,apg:2.5,spg:0.9,bpg:0.3},
  {id:107,name:"Dorian Finney-Smith",pos:"SF",team:"ATL",ppg:9.5,rpg:4.2,apg:1.5,spg:0.8,bpg:0.3},
  {id:108,name:"Corey Kispert",pos:"SF",team:"ATL",ppg:11.0,rpg:3.0,apg:1.8,spg:0.5,bpg:0.2},
  {id:109,name:"Jalen Wilson",pos:"F",team:"ATL",ppg:8.5,rpg:4.5,apg:1.2,spg:0.6,bpg:0.3},
  {id:110,name:"Asa Newell",pos:"PF",team:"ATL",ppg:7.0,rpg:4.8,apg:0.8,spg:0.5,bpg:0.6},
  {id:111,name:"Zuby Ejifor",pos:"F",team:"ATL",ppg:5.5,rpg:3.8,apg:0.6,spg:0.4,bpg:0.7},
  {id:112,name:"Jock Landale",pos:"C",team:"ATL",ppg:6.0,rpg:3.5,apg:0.8,spg:0.2,bpg:0.4},
  {id:113,name:"Mouhamad Gueye",pos:"F",team:"ATL",ppg:4.5,rpg:3.0,apg:0.5,spg:0.4,bpg:0.5},
  {id:114,name:"Henri Veesaar",pos:"C",team:"ATL",ppg:4.0,rpg:3.2,apg:0.4,spg:0.2,bpg:0.8},
  {id:115,name:"Aaron Wiggins",pos:"F",team:"ATL",ppg:6.5,rpg:2.8,apg:1.0,spg:0.5,bpg:0.2},
  {id:116,name:"Keshon Gilbert",pos:"G",team:"ATL",ppg:5.0,rpg:1.8,apg:2.0,spg:0.6,bpg:0.1},
  {id:117,name:"Cam Corhen",pos:"PF",team:"ATL",ppg:4.0,rpg:3.0,apg:0.5,spg:0.3,bpg:0.4},
  {id:118,name:"Kingston Flemings",pos:"G",team:"ATL",ppg:3.5,rpg:1.5,apg:1.5,spg:0.4,bpg:0.1},
  {id:119,name:"RayJ Dennis",pos:"PG",team:"ATL",ppg:3.0,rpg:1.2,apg:2.0,spg:0.3,bpg:0.1},
  {id:120,name:"Kobe Johnson",pos:"G",team:"ATL",ppg:3.0,rpg:1.0,apg:1.2,spg:0.3,bpg:0.1},
  // Boston Celtics
  {id:201,name:"Jayson Tatum",pos:"SF",team:"BOS",ppg:28.5,rpg:9.0,apg:5.2,spg:1.1,bpg:0.7},
  {id:202,name:"Paul George",pos:"GF",team:"BOS",ppg:20.5,rpg:5.8,apg:4.2,spg:1.5,bpg:0.5},
  {id:203,name:"Derrick White",pos:"G",team:"BOS",ppg:15.2,rpg:4.5,apg:5.0,spg:1.4,bpg:1.2},
  {id:204,name:"Sam Hauser",pos:"SF",team:"BOS",ppg:14.5,rpg:4.2,apg:2.0,spg:0.5,bpg:0.3},
  {id:205,name:"Payton Pritchard",pos:"PG",team:"BOS",ppg:14.0,rpg:3.2,apg:4.5,spg:0.7,bpg:0.2},
  {id:206,name:"Mitchell Robinson",pos:"C",team:"BOS",ppg:8.5,rpg:9.5,apg:0.8,spg:0.5,bpg:1.8},
  {id:207,name:"Neemias Queta",pos:"C",team:"BOS",ppg:7.5,rpg:6.5,apg:0.8,spg:0.4,bpg:1.2},
  {id:208,name:"Mike Conley",pos:"PG",team:"BOS",ppg:9.0,rpg:2.5,apg:5.0,spg:0.8,bpg:0.2},
  {id:209,name:"Baylor Scheierman",pos:"PG",team:"BOS",ppg:8.5,rpg:3.5,apg:2.5,spg:0.5,bpg:0.2},
  {id:210,name:"Ron Harper Jr.",pos:"F",team:"BOS",ppg:7.0,rpg:3.2,apg:1.2,spg:0.5,bpg:0.2},
  {id:211,name:"Jordan Walsh",pos:"F",team:"BOS",ppg:5.5,rpg:3.0,apg:0.8,spg:0.6,bpg:0.5},
  {id:212,name:"Dillon Mitchell",pos:"F",team:"BOS",ppg:5.0,rpg:3.5,apg:0.5,spg:0.5,bpg:0.4},
  {id:213,name:"Devin Carter",pos:"G",team:"BOS",ppg:6.0,rpg:2.0,apg:2.0,spg:0.8,bpg:0.2},
  {id:214,name:"Tucker DeVries",pos:"F",team:"BOS",ppg:4.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.2},
  {id:215,name:"Hugo Gonzalez",pos:"F",team:"BOS",ppg:3.5,rpg:2.0,apg:0.5,spg:0.3,bpg:0.3},
  {id:216,name:"Chris Cenac Jr.",pos:"C",team:"BOS",ppg:3.0,rpg:2.5,apg:0.3,spg:0.2,bpg:0.5},
  {id:217,name:"Luka Garza",pos:"C",team:"BOS",ppg:4.5,rpg:3.0,apg:0.5,spg:0.2,bpg:0.3},
  {id:218,name:"Amari Williams",pos:"PF",team:"BOS",ppg:3.5,rpg:3.2,apg:0.4,spg:0.3,bpg:0.6},
  {id:219,name:"Gabe McGlothan",pos:"PF",team:"BOS",ppg:3.0,rpg:2.8,apg:0.3,spg:0.2,bpg:0.4},
  {id:220,name:"Milos Uzan",pos:"G",team:"BOS",ppg:3.0,rpg:1.0,apg:1.5,spg:0.3,bpg:0.1},
  {id:221,name:"Hayden Gray",pos:"G",team:"BOS",ppg:2.5,rpg:0.8,apg:1.0,spg:0.2,bpg:0.1},
  // Brooklyn Nets
  {id:301,name:"Julius Randle",pos:"PF",team:"BKN",ppg:22.5,rpg:9.5,apg:4.8,spg:0.8,bpg:0.5},
  {id:302,name:"Michael Porter Jr.",pos:"PF",team:"BKN",ppg:19.5,rpg:8.0,apg:2.5,spg:0.8,bpg:0.8},
  {id:303,name:"Terance Mann",pos:"SG",team:"BKN",ppg:14.5,rpg:4.8,apg:3.0,spg:0.9,bpg:0.3},
  {id:304,name:"Grant Nelson",pos:"F",team:"BKN",ppg:13.0,rpg:5.5,apg:2.5,spg:0.8,bpg:1.0},
  {id:305,name:"Egor Demin",pos:"PG",team:"BKN",ppg:11.5,rpg:4.0,apg:5.0,spg:0.8,bpg:0.3},
  {id:306,name:"Nolan Traore",pos:"F",team:"BKN",ppg:9.0,rpg:3.5,apg:2.5,spg:0.7,bpg:0.4},
  {id:307,name:"Day'Ron Sharpe",pos:"PF",team:"BKN",ppg:10.5,rpg:8.5,apg:1.5,spg:0.5,bpg:1.0},
  {id:308,name:"Noah Clowney",pos:"F",team:"BKN",ppg:8.5,rpg:5.0,apg:1.0,spg:0.6,bpg:0.8},
  {id:309,name:"Moe Wagner",pos:"PF",team:"BKN",ppg:11.0,rpg:5.5,apg:1.8,spg:0.4,bpg:0.5},
  {id:310,name:"Keon Ellis",pos:"F",team:"BKN",ppg:8.0,rpg:3.5,apg:1.5,spg:1.0,bpg:0.4},
  {id:311,name:"Ben Saraf",pos:"G",team:"BKN",ppg:7.5,rpg:2.5,apg:3.5,spg:0.6,bpg:0.2},
  {id:312,name:"Chaney Johnson",pos:"F",team:"BKN",ppg:5.0,rpg:3.8,apg:0.6,spg:0.4,bpg:0.6},
  {id:313,name:"Danny Wolf",pos:"C",team:"BKN",ppg:6.0,rpg:5.0,apg:1.5,spg:0.3,bpg:0.8},
  {id:314,name:"Joshua Jefferson",pos:"C",team:"BKN",ppg:5.5,rpg:4.5,apg:0.5,spg:0.3,bpg:1.0},
  {id:315,name:"Josh Minott",pos:"F",team:"BKN",ppg:4.5,rpg:2.8,apg:0.8,spg:0.5,bpg:0.4},
  {id:316,name:"Tyler Bilodeau",pos:"F",team:"BKN",ppg:4.0,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:317,name:"Mikel Brown Jr.",pos:"G",team:"BKN",ppg:3.5,rpg:1.5,apg:1.8,spg:0.4,bpg:0.1},
  {id:318,name:"Ben Humrichaus",pos:"GF",team:"BKN",ppg:3.0,rpg:1.5,apg:1.0,spg:0.3,bpg:0.2},
  // Charlotte Hornets
  {id:401,name:"Coby White",pos:"PG",team:"CHA",ppg:22.0,rpg:4.2,apg:5.8,spg:1.0,bpg:0.3},
  {id:402,name:"Brandon Miller",pos:"F",team:"CHA",ppg:20.5,rpg:5.5,apg:3.2,spg:1.1,bpg:0.5},
  {id:403,name:"Naz Reid",pos:"C",team:"CHA",ppg:16.5,rpg:7.5,apg:2.5,spg:0.7,bpg:1.2},
  {id:404,name:"Dennis Schroder",pos:"PG",team:"CHA",ppg:15.5,rpg:3.5,apg:6.5,spg:1.0,bpg:0.2},
  {id:405,name:"Tidjane Salaun",pos:"F",team:"CHA",ppg:12.0,rpg:5.5,apg:1.8,spg:0.8,bpg:0.7},
  {id:406,name:"Kon Knueppel",pos:"F",team:"CHA",ppg:11.0,rpg:4.0,apg:2.0,spg:0.6,bpg:0.4},
  {id:407,name:"Grayson Allen",pos:"SG",team:"CHA",ppg:12.0,rpg:3.2,apg:2.0,spg:0.8,bpg:0.3},
  {id:408,name:"Royce O'Neale",pos:"SF",team:"CHA",ppg:9.5,rpg:4.8,apg:2.5,spg:1.0,bpg:0.4},
  {id:409,name:"Pat Connaughton",pos:"SF",team:"CHA",ppg:8.5,rpg:3.5,apg:1.5,spg:0.5,bpg:0.3},
  {id:410,name:"Grant Williams",pos:"SF",team:"CHA",ppg:9.0,rpg:4.5,apg:2.0,spg:0.6,bpg:0.5},
  {id:411,name:"Ryan Kalkbrenner",pos:"C",team:"CHA",ppg:8.0,rpg:5.5,apg:0.8,spg:0.4,bpg:1.5},
  {id:412,name:"Moussa Diabate",pos:"PF",team:"CHA",ppg:7.5,rpg:5.0,apg:0.8,spg:0.5,bpg:0.8},
  {id:413,name:"P.J. Hall",pos:"PF",team:"CHA",ppg:7.0,rpg:4.0,apg:0.8,spg:0.4,bpg:0.5},
  {id:414,name:"Liam McNeeley",pos:"F",team:"CHA",ppg:6.5,rpg:3.5,apg:1.0,spg:0.5,bpg:0.3},
  {id:415,name:"Sion James",pos:"PG",team:"CHA",ppg:5.5,rpg:2.5,apg:2.5,spg:0.7,bpg:0.2},
  {id:416,name:"Kylan Boswell",pos:"G",team:"CHA",ppg:5.0,rpg:1.8,apg:2.5,spg:0.5,bpg:0.1},
  {id:417,name:"Michael Ajayi",pos:"F",team:"CHA",ppg:4.5,rpg:2.8,apg:0.8,spg:0.4,bpg:0.3},
  {id:418,name:"Wyatt Fricks",pos:"F",team:"CHA",ppg:3.5,rpg:2.0,apg:0.5,spg:0.3,bpg:0.3},
  {id:419,name:"Jarkel Joiner",pos:"G",team:"CHA",ppg:4.0,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:420,name:"Christian Anderson Jr.",pos:"G",team:"CHA",ppg:3.0,rpg:1.2,apg:1.5,spg:0.3,bpg:0.1},
  {id:421,name:"Hannes Steinbach",pos:"F",team:"CHA",ppg:2.5,rpg:1.8,apg:0.4,spg:0.2,bpg:0.2},
  // Chicago Bulls
  {id:501,name:"Josh Giddey",pos:"G",team:"CHI",ppg:18.5,rpg:7.8,apg:7.5,spg:1.2,bpg:0.4},
  {id:502,name:"Matas Buzelis",pos:"F",team:"CHI",ppg:17.5,rpg:6.0,apg:2.5,spg:1.0,bpg:0.8},
  {id:503,name:"Nicolas Claxton",pos:"C",team:"CHI",ppg:14.5,rpg:9.5,apg:2.0,spg:0.8,bpg:2.2},
  {id:504,name:"Norman Powell",pos:"SG",team:"CHI",ppg:17.0,rpg:3.5,apg:2.5,spg:0.9,bpg:0.3},
  {id:505,name:"Buddy Hield",pos:"G",team:"CHI",ppg:14.5,rpg:3.5,apg:2.8,spg:0.7,bpg:0.2},
  {id:506,name:"Patrick Williams",pos:"G",team:"CHI",ppg:13.0,rpg:5.0,apg:2.5,spg:1.0,bpg:0.6},
  {id:507,name:"Noa Essengue",pos:"F",team:"CHI",ppg:10.5,rpg:4.5,apg:1.8,spg:0.8,bpg:0.6},
  {id:508,name:"Zach Collins",pos:"C",team:"CHI",ppg:12.0,rpg:6.5,apg:2.0,spg:0.5,bpg:0.8},
  {id:509,name:"Tre Jones",pos:"PG",team:"CHI",ppg:11.5,rpg:3.0,apg:6.0,spg:1.0,bpg:0.2},
  {id:510,name:"Isaac Okoro",pos:"SG",team:"CHI",ppg:10.0,rpg:3.8,apg:1.8,spg:1.2,bpg:0.4},
  {id:511,name:"Jordan Hawkins",pos:"G",team:"CHI",ppg:9.5,rpg:2.5,apg:1.5,spg:0.6,bpg:0.2},
  {id:512,name:"B.J. Boston Jr.",pos:"SG",team:"CHI",ppg:9.0,rpg:3.0,apg:1.8,spg:0.7,bpg:0.3},
  {id:513,name:"Jalen Smith",pos:"C",team:"CHI",ppg:10.0,rpg:6.5,apg:1.0,spg:0.5,bpg:1.0},
  {id:514,name:"Jalen Bridges",pos:"F",team:"CHI",ppg:7.0,rpg:3.5,apg:1.0,spg:0.5,bpg:0.4},
  {id:515,name:"Leonard Miller",pos:"F",team:"CHI",ppg:6.5,rpg:4.0,apg:1.2,spg:0.5,bpg:0.5},
  {id:516,name:"Orlando Robinson",pos:"PF",team:"CHI",ppg:7.5,rpg:5.5,apg:1.0,spg:0.3,bpg:0.7},
  {id:517,name:"Drew Peterson",pos:"F",team:"CHI",ppg:5.5,rpg:3.0,apg:1.0,spg:0.5,bpg:0.3},
  {id:518,name:"Tobe Awaka",pos:"C",team:"CHI",ppg:5.0,rpg:4.0,apg:0.5,spg:0.3,bpg:0.8},
  {id:519,name:"Dailyn Swain",pos:"SF",team:"CHI",ppg:4.0,rpg:2.0,apg:0.8,spg:0.4,bpg:0.2},
  {id:520,name:"Jaylin Sellers",pos:"G",team:"CHI",ppg:3.5,rpg:1.5,apg:1.5,spg:0.3,bpg:0.1},
  {id:521,name:"Caleb Wilson",pos:"F",team:"CHI",ppg:3.0,rpg:1.8,apg:0.5,spg:0.2,bpg:0.2},
  // Cleveland Cavaliers
  {id:601,name:"Donovan Mitchell",pos:"SG",team:"CLE",ppg:27.5,rpg:4.5,apg:6.2,spg:1.5,bpg:0.4},
  {id:602,name:"Darius Garland",pos:"G",team:"CLE",ppg:22.0,rpg:3.5,apg:7.5,spg:1.2,bpg:0.3},
  {id:603,name:"Evan Mobley",pos:"PF",team:"CLE",ppg:20.5,rpg:10.5,apg:3.5,spg:1.0,bpg:2.5},
  {id:604,name:"Jarrett Allen",pos:"C",team:"CLE",ppg:14.5,rpg:11.0,apg:2.0,spg:0.7,bpg:1.2},
  {id:605,name:"James Harden",pos:"SG",team:"CLE",ppg:19.5,rpg:5.5,apg:8.5,spg:1.2,bpg:0.5},
  {id:606,name:"Craig Porter Jr.",pos:"PG",team:"CLE",ppg:11.5,rpg:3.5,apg:5.5,spg:1.0,bpg:0.2},
  {id:607,name:"Peyton Watson",pos:"GF",team:"CLE",ppg:10.0,rpg:4.5,apg:1.8,spg:1.2,bpg:0.8},
  {id:608,name:"Sam Merrill",pos:"G",team:"CLE",ppg:9.5,rpg:2.5,apg:2.0,spg:0.5,bpg:0.2},
  {id:609,name:"Khalifa Diop",pos:"C",team:"CLE",ppg:7.5,rpg:5.5,apg:0.8,spg:0.5,bpg:1.5},
  {id:610,name:"Thomas Bryant",pos:"C",team:"CLE",ppg:8.5,rpg:5.8,apg:0.8,spg:0.3,bpg:0.8},
  {id:611,name:"Mario Hezonja",pos:"SG",team:"CLE",ppg:8.0,rpg:3.5,apg:1.5,spg:0.6,bpg:0.3},
  {id:612,name:"Tyrese Proctor",pos:"PG",team:"CLE",ppg:7.0,rpg:2.5,apg:3.5,spg:0.7,bpg:0.2},
  {id:613,name:"Jaylon Tyson",pos:"F",team:"CLE",ppg:6.5,rpg:3.0,apg:1.2,spg:0.5,bpg:0.3},
  {id:614,name:"Nae'qwan Tomlin",pos:"F",team:"CLE",ppg:5.5,rpg:3.0,apg:0.8,spg:0.5,bpg:0.4},
  {id:615,name:"Meleek Thomas",pos:"G",team:"CLE",ppg:5.0,rpg:2.0,apg:1.5,spg:0.5,bpg:0.2},
  {id:616,name:"Ernest Udeh Jr.",pos:"C",team:"CLE",ppg:4.5,rpg:3.5,apg:0.5,spg:0.3,bpg:0.8},
  {id:617,name:"Riley Minix",pos:"SF",team:"CLE",ppg:4.0,rpg:2.0,apg:0.8,spg:0.4,bpg:0.2},
  {id:618,name:"Tristan Enaruna",pos:"PF",team:"CLE",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:619,name:"Jax Robinson",pos:"F",team:"CLE",ppg:3.0,rpg:2.0,apg:0.5,spg:0.2,bpg:0.2},
  {id:620,name:"Zack Austin",pos:"F",team:"CLE",ppg:2.5,rpg:1.8,apg:0.4,spg:0.2,bpg:0.2},
  {id:621,name:"Noam Yaacov",pos:"G",team:"CLE",ppg:2.5,rpg:1.0,apg:1.2,spg:0.2,bpg:0.1},
  // Dallas Mavericks
  {id:701,name:"Kyrie Irving",pos:"G",team:"DAL",ppg:25.5,rpg:5.0,apg:6.5,spg:1.3,bpg:0.5},
  {id:702,name:"Cooper Flagg",pos:"F",team:"DAL",ppg:22.0,rpg:8.5,apg:4.5,spg:1.5,bpg:1.2},
  {id:703,name:"Daniel Gafford",pos:"C",team:"DAL",ppg:13.5,rpg:9.0,apg:1.5,spg:0.8,bpg:2.5},
  {id:704,name:"Dereck Lively II",pos:"C",team:"DAL",ppg:12.5,rpg:9.5,apg:2.0,spg:0.5,bpg:1.8},
  {id:705,name:"P.J. Washington",pos:"PF",team:"DAL",ppg:14.0,rpg:6.5,apg:2.5,spg:1.0,bpg:0.8},
  {id:706,name:"Max Christie",pos:"F",team:"DAL",ppg:12.5,rpg:4.0,apg:2.0,spg:0.9,bpg:0.4},
  {id:707,name:"Naji Marshall",pos:"SF",team:"DAL",ppg:10.5,rpg:4.5,apg:2.5,spg:1.0,bpg:0.4},
  {id:708,name:"Caleb Martin",pos:"G",team:"DAL",ppg:9.5,rpg:4.5,apg:2.2,spg:1.0,bpg:0.4},
  {id:709,name:"Jett Howard",pos:"GF",team:"DAL",ppg:10.0,rpg:3.0,apg:1.8,spg:0.6,bpg:0.3},
  {id:710,name:"Santi Aldama",pos:"C",team:"DAL",ppg:11.0,rpg:6.0,apg:2.0,spg:0.5,bpg:0.8},
  {id:711,name:"Zaccharie Risacher",pos:"F",team:"DAL",ppg:9.0,rpg:4.5,apg:1.5,spg:0.7,bpg:0.5},
  {id:712,name:"Dwight Powell",pos:"PF",team:"DAL",ppg:7.0,rpg:4.5,apg:1.0,spg:0.3,bpg:0.5},
  {id:713,name:"Marcus Sasser",pos:"G",team:"DAL",ppg:7.5,rpg:2.0,apg:2.5,spg:0.8,bpg:0.2},
  {id:714,name:"Tobi Lawal",pos:"F",team:"DAL",ppg:5.5,rpg:3.5,apg:0.8,spg:0.5,bpg:0.6},
  {id:715,name:"Moussa Cisse",pos:"F",team:"DAL",ppg:5.0,rpg:4.0,apg:0.5,spg:0.5,bpg:1.0},
  {id:716,name:"Seth Lundy",pos:"GF",team:"DAL",ppg:5.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.2},
  {id:717,name:"Tarik Biberovic",pos:"G",team:"DAL",ppg:4.5,rpg:2.0,apg:1.5,spg:0.4,bpg:0.2},
  {id:718,name:"John Poulakidas",pos:"GF",team:"DAL",ppg:3.5,rpg:1.5,apg:0.8,spg:0.3,bpg:0.2},
  {id:719,name:"Sergio De Larrea",pos:"F",team:"DAL",ppg:3.0,rpg:2.0,apg:0.5,spg:0.2,bpg:0.3},
  {id:720,name:"Jorge Diaz-Graham",pos:"C",team:"DAL",ppg:2.5,rpg:2.5,apg:0.3,spg:0.2,bpg:0.5},
  // Denver Nuggets
  {id:801,name:"Nikola Jokic",pos:"C",team:"DEN",ppg:27.0,rpg:13.0,apg:10.5,spg:1.4,bpg:0.9},
  {id:802,name:"Jamal Murray",pos:"SG",team:"DEN",ppg:22.5,rpg:5.0,apg:7.0,spg:1.1,bpg:0.3},
  {id:803,name:"Aaron Gordon",pos:"F",team:"DEN",ppg:15.5,rpg:7.5,apg:3.5,spg:1.0,bpg:0.8},
  {id:804,name:"DeMar DeRozan",pos:"GF",team:"DEN",ppg:22.0,rpg:4.5,apg:4.5,spg:0.8,bpg:0.4},
  {id:805,name:"Christian Braun",pos:"SF",team:"DEN",ppg:14.5,rpg:5.0,apg:2.5,spg:0.9,bpg:0.5},
  {id:806,name:"Cameron Johnson",pos:"G",team:"DEN",ppg:16.0,rpg:4.5,apg:2.5,spg:0.7,bpg:0.4},
  {id:807,name:"Cam Whitmore",pos:"F",team:"DEN",ppg:14.0,rpg:5.0,apg:1.8,spg:1.0,bpg:0.5},
  {id:808,name:"Ryan Nembhard",pos:"PG",team:"DEN",ppg:12.5,rpg:3.0,apg:5.5,spg:1.0,bpg:0.2},
  {id:809,name:"DaRon Holmes II",pos:"PF",team:"DEN",ppg:12.0,rpg:5.5,apg:1.5,spg:0.8,bpg:1.2},
  {id:810,name:"Tyus Jones",pos:"PG",team:"DEN",ppg:9.5,rpg:2.5,apg:5.5,spg:0.7,bpg:0.2},
  {id:811,name:"Marvin Bagley III",pos:"PF",team:"DEN",ppg:10.5,rpg:7.0,apg:1.0,spg:0.5,bpg:0.7},
  {id:812,name:"Alpha Diallo",pos:"SF",team:"DEN",ppg:8.5,rpg:4.5,apg:1.5,spg:0.8,bpg:0.4},
  {id:813,name:"Julian Strawther",pos:"GF",team:"DEN",ppg:9.0,rpg:3.5,apg:1.5,spg:0.6,bpg:0.3},
  {id:814,name:"Coleman Hawkins",pos:"SF",team:"DEN",ppg:7.0,rpg:4.0,apg:1.2,spg:0.5,bpg:0.5},
  {id:815,name:"Trevon Brazile",pos:"F",team:"DEN",ppg:6.5,rpg:4.5,apg:0.8,spg:0.5,bpg:0.8},
  {id:816,name:"Emanuel Miller",pos:"SF",team:"DEN",ppg:5.5,rpg:3.0,apg:0.8,spg:0.5,bpg:0.3},
  {id:817,name:"Spencer Jones",pos:"SF",team:"DEN",ppg:5.0,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:818,name:"Zeke Nnaji",pos:"PF",team:"DEN",ppg:6.0,rpg:4.0,apg:0.5,spg:0.3,bpg:0.4},
  {id:819,name:"Dane Goodwin",pos:"SG",team:"DEN",ppg:4.5,rpg:2.0,apg:0.8,spg:0.3,bpg:0.2},
  {id:820,name:"Bryce Hopkins",pos:"F",team:"DEN",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  // Detroit Pistons
  {id:901,name:"Cade Cunningham",pos:"SF",team:"DET",ppg:26.0,rpg:5.5,apg:7.5,spg:1.3,bpg:0.5},
  {id:902,name:"Ausar Thompson",pos:"G",team:"DET",ppg:18.5,rpg:6.0,apg:3.5,spg:2.0,bpg:0.8},
  {id:903,name:"Jalen Duren",pos:"PF",team:"DET",ppg:16.5,rpg:12.5,apg:2.0,spg:0.8,bpg:1.5},
  {id:904,name:"Ron Holland",pos:"F",team:"DET",ppg:14.5,rpg:6.0,apg:2.5,spg:1.5,bpg:0.8},
  {id:905,name:"John Collins",pos:"PF",team:"DET",ppg:16.5,rpg:8.0,apg:2.0,spg:0.8,bpg:0.7},
  {id:906,name:"Duncan Robinson",pos:"F",team:"DET",ppg:13.5,rpg:3.5,apg:2.5,spg:0.5,bpg:0.3},
  {id:907,name:"Taurean Prince",pos:"F",team:"DET",ppg:11.5,rpg:4.5,apg:1.8,spg:0.7,bpg:0.4},
  {id:908,name:"Kevin Huerter",pos:"SF",team:"DET",ppg:13.0,rpg:4.0,apg:3.0,spg:0.7,bpg:0.3},
  {id:909,name:"Isaiah Joe",pos:"SG",team:"DET",ppg:10.5,rpg:2.5,apg:1.8,spg:0.6,bpg:0.2},
  {id:910,name:"Paul Reed Jr.",pos:"F",team:"DET",ppg:9.5,rpg:7.0,apg:1.2,spg:0.7,bpg:1.0},
  {id:911,name:"Chaz Lanier",pos:"G",team:"DET",ppg:8.5,rpg:2.5,apg:2.0,spg:0.5,bpg:0.2},
  {id:912,name:"Daniss Jenkins",pos:"G",team:"DET",ppg:7.0,rpg:2.5,apg:3.5,spg:0.7,bpg:0.2},
  {id:913,name:"Isaac Jones",pos:"C",team:"DET",ppg:6.5,rpg:4.5,apg:0.5,spg:0.3,bpg:1.0},
  {id:914,name:"Ugonna Onyenso",pos:"C",team:"DET",ppg:5.5,rpg:4.0,apg:0.5,spg:0.3,bpg:1.2},
  {id:915,name:"Brice Williams",pos:"F",team:"DET",ppg:5.0,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:916,name:"Tolu Smith",pos:"F",team:"DET",ppg:4.5,rpg:3.0,apg:0.5,spg:0.3,bpg:0.4},
  {id:917,name:"E.J. Harkless",pos:"PG",team:"DET",ppg:4.0,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:918,name:"Javonte Green",pos:"G",team:"DET",ppg:5.5,rpg:2.8,apg:1.2,spg:0.8,bpg:0.3},
  {id:919,name:"Ebuka Okorie",pos:"PG",team:"DET",ppg:3.5,rpg:1.5,apg:1.8,spg:0.4,bpg:0.1},
  {id:920,name:"John Ukomadu",pos:"F",team:"DET",ppg:3.0,rpg:2.0,apg:0.5,spg:0.2,bpg:0.3},
  {id:921,name:"Okorie Onyenso",pos:"C",team:"DET",ppg:2.5,rpg:2.0,apg:0.3,spg:0.2,bpg:0.5},
  // Golden State Warriors
  {id:1001,name:"Stephen Curry",pos:"G",team:"GSW",ppg:28.5,rpg:5.5,apg:7.0,spg:1.5,bpg:0.3},
  {id:1002,name:"Jimmy Butler III",pos:"GF",team:"GSW",ppg:22.5,rpg:6.5,apg:5.5,spg:1.8,bpg:0.5},
  {id:1003,name:"Draymond Green",pos:"F",team:"GSW",ppg:10.5,rpg:8.5,apg:7.5,spg:1.2,bpg:1.0},
  {id:1004,name:"Kristaps Porzingis",pos:"FC",team:"GSW",ppg:20.5,rpg:8.0,apg:2.5,spg:0.7,bpg:2.0},
  {id:1005,name:"Brandin Podziemski",pos:"SG",team:"GSW",ppg:16.5,rpg:5.5,apg:4.0,spg:1.0,bpg:0.4},
  {id:1006,name:"Moses Moody",pos:"SG",team:"GSW",ppg:14.5,rpg:3.5,apg:2.0,spg:0.8,bpg:0.4},
  {id:1007,name:"Al Horford",pos:"FC",team:"GSW",ppg:9.5,rpg:6.5,apg:3.0,spg:0.7,bpg:1.2},
  {id:1008,name:"Gary Payton II",pos:"G",team:"GSW",ppg:9.5,rpg:3.5,apg:2.5,spg:1.5,bpg:0.5},
  {id:1009,name:"De'Anthony Melton",pos:"SG",team:"GSW",ppg:11.0,rpg:3.5,apg:3.0,spg:1.2,bpg:0.4},
  {id:1010,name:"Dalen Terry",pos:"PG",team:"GSW",ppg:9.0,rpg:3.5,apg:4.0,spg:1.0,bpg:0.3},
  {id:1011,name:"Charles Bassey",pos:"PF",team:"GSW",ppg:8.5,rpg:6.0,apg:0.8,spg:0.5,bpg:1.2},
  {id:1012,name:"Georges Niang",pos:"F",team:"GSW",ppg:10.0,rpg:3.5,apg:2.0,spg:0.5,bpg:0.2},
  {id:1013,name:"Gui Santos",pos:"GF",team:"GSW",ppg:7.5,rpg:3.5,apg:1.5,spg:0.7,bpg:0.4},
  {id:1014,name:"Will Richard",pos:"F",team:"GSW",ppg:6.5,rpg:3.0,apg:1.0,spg:0.6,bpg:0.4},
  {id:1015,name:"Graham Ike",pos:"F",team:"GSW",ppg:6.0,rpg:4.0,apg:0.5,spg:0.3,bpg:0.6},
  {id:1016,name:"Steven Adams",pos:"C",team:"GSW",ppg:7.5,rpg:8.5,apg:1.5,spg:0.5,bpg:0.8},
  {id:1017,name:"L.J. Cryer",pos:"PG",team:"GSW",ppg:7.0,rpg:1.5,apg:2.5,spg:0.5,bpg:0.1},
  {id:1018,name:"Tyler Burton",pos:"SF",team:"GSW",ppg:5.0,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1019,name:"Yaxel Lendeborg",pos:"F",team:"GSW",ppg:4.5,rpg:3.5,apg:0.5,spg:0.4,bpg:0.5},
  {id:1020,name:"Malevy Leons",pos:"PF",team:"GSW",ppg:3.5,rpg:2.8,apg:0.4,spg:0.3,bpg:0.4},
  {id:1021,name:"Brandon Williams",pos:"PG",team:"GSW",ppg:4.0,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:1022,name:"Alex Toohey",pos:"F",team:"GSW",ppg:3.0,rpg:1.8,apg:0.5,spg:0.2,bpg:0.2},
  // Houston Rockets
  {id:1101,name:"Kevin Durant",pos:"SF",team:"HOU",ppg:27.5,rpg:7.5,apg:5.0,spg:0.9,bpg:1.5},
  {id:1102,name:"Alperen Sengun",pos:"C",team:"HOU",ppg:22.0,rpg:11.0,apg:5.5,spg:0.8,bpg:1.2},
  {id:1103,name:"Amen Thompson",pos:"G",team:"HOU",ppg:19.5,rpg:7.5,apg:5.5,spg:1.5,bpg:0.8},
  {id:1104,name:"Fred VanVleet",pos:"G",team:"HOU",ppg:16.5,rpg:3.5,apg:7.0,spg:1.3,bpg:0.3},
  {id:1105,name:"Jabari Smith Jr.",pos:"F",team:"HOU",ppg:16.0,rpg:7.5,apg:2.0,spg:1.0,bpg:1.2},
  {id:1106,name:"Marcus Smart",pos:"PG",team:"HOU",ppg:12.5,rpg:3.5,apg:5.5,spg:1.8,bpg:0.5},
  {id:1107,name:"Tari Eason",pos:"F",team:"HOU",ppg:13.0,rpg:6.0,apg:1.5,spg:1.5,bpg:0.7},
  {id:1108,name:"Reed Sheppard",pos:"G",team:"HOU",ppg:12.0,rpg:3.0,apg:4.5,spg:1.2,bpg:0.3},
  {id:1109,name:"Bogdan Bogdanovic",pos:"SG",team:"HOU",ppg:14.0,rpg:3.5,apg:3.5,spg:0.7,bpg:0.3},
  {id:1110,name:"Clint Capela",pos:"PF",team:"HOU",ppg:11.0,rpg:10.5,apg:1.5,spg:0.6,bpg:1.5},
  {id:1111,name:"Kobe Brown",pos:"GF",team:"HOU",ppg:10.5,rpg:4.5,apg:2.5,spg:0.8,bpg:0.4},
  {id:1112,name:"Julian Phillips",pos:"F",team:"HOU",ppg:8.5,rpg:4.0,apg:1.5,spg:0.8,bpg:0.5},
  {id:1113,name:"Jae'sean Tate",pos:"F",team:"HOU",ppg:9.0,rpg:4.5,apg:2.0,spg:0.9,bpg:0.4},
  {id:1114,name:"Bruce Thornton",pos:"G",team:"HOU",ppg:8.0,rpg:2.5,apg:3.5,spg:0.7,bpg:0.2},
  {id:1115,name:"Johnny Furphy",pos:"F",team:"HOU",ppg:6.5,rpg:3.5,apg:1.0,spg:0.5,bpg:0.3},
  {id:1116,name:"Sean Pedulla",pos:"G",team:"HOU",ppg:6.0,rpg:2.0,apg:3.0,spg:0.6,bpg:0.1},
  {id:1117,name:"Quadir Copeland",pos:"F",team:"HOU",ppg:5.5,rpg:2.5,apg:1.0,spg:0.5,bpg:0.3},
  {id:1118,name:"Isaiah Crawford",pos:"GF",team:"HOU",ppg:5.0,rpg:2.5,apg:0.8,spg:0.5,bpg:0.3},
  {id:1119,name:"Oscar Tshiebwe",pos:"F",team:"HOU",ppg:6.0,rpg:5.5,apg:0.5,spg:0.4,bpg:0.5},
  // Indiana Pacers
  {id:1201,name:"Tyrese Haliburton",pos:"PG",team:"IND",ppg:23.5,rpg:4.5,apg:11.5,spg:1.5,bpg:0.4},
  {id:1202,name:"Pascal Siakam",pos:"F",team:"IND",ppg:22.5,rpg:8.0,apg:4.5,spg:1.2,bpg:0.8},
  {id:1203,name:"Myles Turner",pos:"FC",team:"IND",ppg:15.5,rpg:7.5,apg:2.0,spg:0.8,bpg:2.5},
  {id:1204,name:"Obi Toppin",pos:"F",team:"IND",ppg:14.0,rpg:5.5,apg:1.8,spg:0.8,bpg:0.5},
  {id:1205,name:"Andrew Nembhard",pos:"PG",team:"IND",ppg:13.5,rpg:3.5,apg:5.5,spg:1.0,bpg:0.3},
  {id:1206,name:"Kelly Oubre Jr.",pos:"SF",team:"IND",ppg:15.5,rpg:5.0,apg:2.0,spg:1.2,bpg:0.5},
  {id:1207,name:"Braden Smith",pos:"PG",team:"IND",ppg:12.5,rpg:4.5,apg:6.0,spg:1.5,bpg:0.3},
  {id:1208,name:"Ben Sheppard",pos:"G",team:"IND",ppg:11.5,rpg:3.5,apg:2.5,spg:0.7,bpg:0.3},
  {id:1209,name:"Aaron Nesmith",pos:"F",team:"IND",ppg:11.0,rpg:4.5,apg:1.5,spg:1.0,bpg:0.5},
  {id:1210,name:"T.J. McConnell",pos:"G",team:"IND",ppg:9.5,rpg:2.5,apg:5.5,spg:1.2,bpg:0.2},
  {id:1211,name:"Larry Nance Jr.",pos:"SF",team:"IND",ppg:9.5,rpg:6.0,apg:2.5,spg:0.8,bpg:0.6},
  {id:1212,name:"Ivica Zubac",pos:"C",team:"IND",ppg:11.5,rpg:9.5,apg:1.5,spg:0.5,bpg:1.2},
  {id:1213,name:"Jarace Walker",pos:"G",team:"IND",ppg:8.5,rpg:4.5,apg:2.0,spg:0.9,bpg:0.5},
  {id:1214,name:"Keba Keita",pos:"C",team:"IND",ppg:6.5,rpg:5.0,apg:0.8,spg:0.4,bpg:1.0},
  {id:1215,name:"Quenton Jackson",pos:"GF",team:"IND",ppg:6.0,rpg:2.5,apg:1.5,spg:0.7,bpg:0.3},
  {id:1216,name:"James Huff",pos:"C",team:"IND",ppg:5.5,rpg:4.0,apg:0.5,spg:0.3,bpg:1.0},
  {id:1217,name:"James Johnson",pos:"F",team:"IND",ppg:5.0,rpg:3.0,apg:1.2,spg:0.5,bpg:0.4},
  {id:1218,name:"Jalen Slawson",pos:"F",team:"IND",ppg:4.5,rpg:2.8,apg:0.8,spg:0.4,bpg:0.4},
  {id:1219,name:"Rienk Mast",pos:"C",team:"IND",ppg:4.0,rpg:3.5,apg:0.5,spg:0.2,bpg:0.6},
  // LA Clippers
  {id:1301,name:"Bradley Beal",pos:"SG",team:"LAC",ppg:23.5,rpg:4.5,apg:5.5,spg:1.1,bpg:0.3},
  {id:1302,name:"Brandon Ingram",pos:"SF",team:"LAC",ppg:24.0,rpg:6.5,apg:5.5,spg:1.0,bpg:0.6},
  {id:1304,name:"Brook Lopez",pos:"C",team:"LAC",ppg:14.5,rpg:6.0,apg:2.5,spg:0.5,bpg:2.2},
  {id:1305,name:"Rui Hachimura",pos:"F",team:"LAC",ppg:15.5,rpg:6.0,apg:2.0,spg:0.7,bpg:0.6},
  {id:1306,name:"Gradey Dick",pos:"GF",team:"LAC",ppg:14.5,rpg:4.5,apg:2.5,spg:0.7,bpg:0.3},
  {id:1307,name:"Kris Dunn",pos:"SG",team:"LAC",ppg:12.5,rpg:4.5,apg:4.5,spg:2.0,bpg:0.5},
  {id:1308,name:"Isaiah Jackson",pos:"PF",team:"LAC",ppg:10.5,rpg:7.5,apg:1.0,spg:0.6,bpg:1.8},
  {id:1309,name:"Derrick Jones",pos:"SF",team:"LAC",ppg:9.5,rpg:4.5,apg:1.5,spg:1.0,bpg:0.8},
  {id:1310,name:"Max Strus",pos:"G",team:"LAC",ppg:11.0,rpg:3.5,apg:3.0,spg:0.7,bpg:0.2},
  {id:1311,name:"Cameron Christie",pos:"SG",team:"LAC",ppg:9.0,rpg:2.5,apg:2.0,spg:0.6,bpg:0.2},
  {id:1312,name:"Baba Miller",pos:"C",team:"LAC",ppg:7.0,rpg:5.0,apg:0.8,spg:0.4,bpg:1.2},
  {id:1313,name:"Jahmyl Telfort",pos:"SF",team:"LAC",ppg:7.0,rpg:3.0,apg:1.2,spg:0.6,bpg:0.4},
  {id:1314,name:"Yanic Konan Niederhauser",pos:"F",team:"LAC",ppg:5.5,rpg:3.5,apg:0.8,spg:0.4,bpg:0.6},
  {id:1315,name:"Fletcher Loyer",pos:"GF",team:"LAC",ppg:6.5,rpg:2.0,apg:2.0,spg:0.5,bpg:0.2},
  {id:1316,name:"Jordan Miller",pos:"G",team:"LAC",ppg:5.5,rpg:2.5,apg:1.5,spg:0.5,bpg:0.2},
  {id:1317,name:"Nick Martinelli",pos:"F",team:"LAC",ppg:4.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1318,name:"Blake Wesley",pos:"SG",team:"LAC",ppg:5.0,rpg:2.0,apg:1.5,spg:0.5,bpg:0.2},
  {id:1319,name:"Kobe Sanders",pos:"G",team:"LAC",ppg:4.0,rpg:1.5,apg:1.8,spg:0.4,bpg:0.1},
  {id:1320,name:"Jalen Pickett",pos:"F",team:"LAC",ppg:3.5,rpg:1.8,apg:1.2,spg:0.3,bpg:0.1},
  {id:1321,name:"Keaton Wagler",pos:"SG",team:"LAC",ppg:3.0,rpg:1.2,apg:0.8,spg:0.3,bpg:0.1},
  // Los Angeles Lakers
  {id:1401,name:"Luka Doncic",pos:"SF",team:"LAL",ppg:29.5,rpg:9.5,apg:8.5,spg:1.4,bpg:0.5},
  {id:1402,name:"Austin Reaves",pos:"PG",team:"LAL",ppg:20.5,rpg:5.5,apg:6.5,spg:1.0,bpg:0.4},
  {id:1403,name:"Dalton Knecht",pos:"F",team:"LAL",ppg:17.5,rpg:5.0,apg:2.5,spg:0.8,bpg:0.5},
  {id:1404,name:"Walker Kessler",pos:"C",team:"LAL",ppg:13.5,rpg:11.0,apg:1.5,spg:0.8,bpg:3.0},
  {id:1405,name:"Collin Sexton",pos:"PG",team:"LAL",ppg:17.0,rpg:3.0,apg:5.0,spg:0.9,bpg:0.2},
  {id:1406,name:"Matisse Thybulle",pos:"SF",team:"LAL",ppg:10.0,rpg:4.0,apg:1.8,spg:2.0,bpg:0.8},
  {id:1407,name:"Jarred Vanderbilt",pos:"PF",team:"LAL",ppg:8.5,rpg:6.5,apg:2.0,spg:1.0,bpg:0.5},
  {id:1408,name:"Quentin Grimes",pos:"SG",team:"LAL",ppg:12.5,rpg:3.5,apg:2.5,spg:0.9,bpg:0.3},
  {id:1409,name:"Jake LaRavia",pos:"F",team:"LAL",ppg:10.5,rpg:4.5,apg:2.0,spg:0.8,bpg:0.5},
  {id:1410,name:"Jaden Hardy",pos:"SG",team:"LAL",ppg:11.0,rpg:2.5,apg:2.5,spg:0.6,bpg:0.2},
  {id:1411,name:"Kevon Looney",pos:"PF",team:"LAL",ppg:7.5,rpg:7.5,apg:1.5,spg:0.5,bpg:0.5},
  {id:1412,name:"Arthur Kaluma",pos:"F",team:"LAL",ppg:7.0,rpg:3.5,apg:1.2,spg:0.6,bpg:0.4},
  {id:1413,name:"Ziaire Williams",pos:"F",team:"LAL",ppg:9.0,rpg:3.5,apg:1.8,spg:0.7,bpg:0.5},
  {id:1414,name:"Bronny James",pos:"G",team:"LAL",ppg:6.5,rpg:2.5,apg:2.5,spg:0.6,bpg:0.3},
  {id:1415,name:"Sandro Mamukelashvili",pos:"F",team:"LAL",ppg:5.5,rpg:3.0,apg:1.0,spg:0.3,bpg:0.3},
  {id:1416,name:"AK Okereke",pos:"F",team:"LAL",ppg:5.0,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1417,name:"Cole Swider",pos:"F",team:"LAL",ppg:4.5,rpg:2.0,apg:0.8,spg:0.3,bpg:0.2},
  {id:1418,name:"Adou Thiero",pos:"G",team:"LAL",ppg:4.0,rpg:2.0,apg:1.2,spg:0.4,bpg:0.2},
  {id:1419,name:"Rafael Castro",pos:"C",team:"LAL",ppg:3.5,rpg:3.0,apg:0.4,spg:0.2,bpg:0.5},
  {id:1420,name:"Chris Manon",pos:"G",team:"LAL",ppg:3.0,rpg:1.2,apg:1.5,spg:0.3,bpg:0.1},
  {id:1421,name:"Cameron Carr",pos:"G",team:"LAL",ppg:2.5,rpg:1.0,apg:1.2,spg:0.2,bpg:0.1},
  // Memphis Grizzlies
  {id:1501,name:"Ja Morant",pos:"F",team:"MEM",ppg:25.5,rpg:6.0,apg:8.0,spg:1.5,bpg:0.5},
  {id:1502,name:"Jerami Grant",pos:"SF",team:"MEM",ppg:19.5,rpg:5.5,apg:2.5,spg:1.0,bpg:1.0},
  {id:1503,name:"Zach Edey",pos:"C",team:"MEM",ppg:16.5,rpg:12.5,apg:2.0,spg:0.6,bpg:2.0},
  {id:1504,name:"Desmond Bane",pos:"SG",team:"MEM",ppg:20.5,rpg:5.0,apg:4.5,spg:1.0,bpg:0.4},
  {id:1505,name:"Taylor Hendricks",pos:"F",team:"MEM",ppg:14.5,rpg:7.5,apg:2.0,spg:1.0,bpg:1.2},
  {id:1506,name:"G.G. Jackson",pos:"PF",team:"MEM",ppg:16.5,rpg:6.5,apg:2.0,spg:0.8,bpg:0.5},
  {id:1507,name:"Ty Jerome",pos:"PG",team:"MEM",ppg:13.0,rpg:3.0,apg:5.5,spg:0.8,bpg:0.2},
  {id:1508,name:"Jaylen Wells",pos:"F",team:"MEM",ppg:12.0,rpg:4.5,apg:1.8,spg:1.0,bpg:0.4},
  {id:1509,name:"Scotty Pippen Jr.",pos:"G",team:"MEM",ppg:11.5,rpg:3.0,apg:5.5,spg:0.8,bpg:0.2},
  {id:1510,name:"Cam Spencer",pos:"SG",team:"MEM",ppg:10.5,rpg:3.0,apg:2.5,spg:0.7,bpg:0.2},
  {id:1511,name:"Kris Murray",pos:"F",team:"MEM",ppg:9.5,rpg:4.5,apg:1.5,spg:0.7,bpg:0.5},
  {id:1512,name:"Olivier-Maxence Prosper",pos:"F",team:"MEM",ppg:9.0,rpg:4.0,apg:1.2,spg:0.8,bpg:0.5},
  {id:1513,name:"Micah Peavy",pos:"SF",team:"MEM",ppg:7.5,rpg:3.5,apg:1.5,spg:0.7,bpg:0.4},
  {id:1514,name:"Isaiah Stewart II",pos:"C",team:"MEM",ppg:8.5,rpg:6.5,apg:1.0,spg:0.5,bpg:0.8},
  {id:1515,name:"Cameron Boozer",pos:"F",team:"MEM",ppg:7.0,rpg:5.0,apg:1.0,spg:0.5,bpg:0.5},
  {id:1516,name:"Javon Small",pos:"G",team:"MEM",ppg:6.5,rpg:2.0,apg:2.5,spg:0.6,bpg:0.2},
  {id:1517,name:"Quinten Post",pos:"C",team:"MEM",ppg:7.0,rpg:5.5,apg:1.0,spg:0.3,bpg:0.7},
  {id:1518,name:"Walter Clayton Jr.",pos:"G",team:"MEM",ppg:7.5,rpg:2.0,apg:3.5,spg:0.7,bpg:0.2},
  {id:1519,name:"Jahmai Mashack",pos:"F",team:"MEM",ppg:5.0,rpg:2.5,apg:1.0,spg:0.5,bpg:0.3},
  {id:1520,name:"Cedric Coward",pos:"F",team:"MEM",ppg:4.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1521,name:"Zach Cleveland",pos:"F",team:"MEM",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:1522,name:"Carson Cooper",pos:"C",team:"MEM",ppg:3.0,rpg:2.8,apg:0.3,spg:0.2,bpg:0.5},
  // Miami Heat
  {id:1601,name:"Bam Adebayo",pos:"C",team:"MIA",ppg:22.5,rpg:11.0,apg:4.5,spg:1.2,bpg:1.0},
  {id:1602,name:"Giannis Antetokounmpo",pos:"F",team:"MIA",ppg:30.5,rpg:12.5,apg:6.5,spg:1.2,bpg:1.3},
  {id:1603,name:"Klay Thompson",pos:"G",team:"MIA",ppg:18.5,rpg:4.0,apg:2.5,spg:0.8,bpg:0.5},
  {id:1604,name:"Andrew Wiggins",pos:"F",team:"MIA",ppg:17.5,rpg:5.5,apg:2.5,spg:1.0,bpg:0.7},
  {id:1605,name:"Nikola Jovic",pos:"F",team:"MIA",ppg:14.5,rpg:6.5,apg:4.0,spg:0.7,bpg:0.5},
  {id:1606,name:"Tim Hardaway Jr.",pos:"SG",team:"MIA",ppg:14.0,rpg:3.5,apg:2.0,spg:0.7,bpg:0.2},
  {id:1607,name:"Davion Mitchell",pos:"PG",team:"MIA",ppg:12.5,rpg:3.5,apg:6.0,spg:1.5,bpg:0.3},
  {id:1608,name:"Bobby Portis",pos:"PF",team:"MIA",ppg:14.0,rpg:8.5,apg:1.5,spg:0.6,bpg:0.5},
  {id:1609,name:"Simone Fontecchio",pos:"SF",team:"MIA",ppg:12.0,rpg:4.5,apg:2.0,spg:0.7,bpg:0.5},
  {id:1610,name:"Pelle Larsson",pos:"SG",team:"MIA",ppg:9.5,rpg:3.0,apg:2.0,spg:0.6,bpg:0.2},
  {id:1611,name:"Keshad Johnson",pos:"SF",team:"MIA",ppg:8.5,rpg:4.0,apg:1.2,spg:0.7,bpg:0.4},
  {id:1612,name:"Nick Richards",pos:"C",team:"MIA",ppg:8.0,rpg:6.5,apg:0.8,spg:0.4,bpg:1.0},
  {id:1613,name:"Vladislav Goldin",pos:"C",team:"MIA",ppg:7.0,rpg:5.0,apg:0.8,spg:0.3,bpg:0.8},
  {id:1614,name:"Dru Smith",pos:"SG",team:"MIA",ppg:7.5,rpg:2.5,apg:2.5,spg:0.8,bpg:0.2},
  {id:1615,name:"Gabe Madsen",pos:"F",team:"MIA",ppg:5.5,rpg:2.5,apg:1.0,spg:0.4,bpg:0.3},
  {id:1616,name:"Kylor Kelley",pos:"C",team:"MIA",ppg:4.5,rpg:3.5,apg:0.5,spg:0.3,bpg:1.0},
  {id:1617,name:"Bez Mbeng",pos:"G",team:"MIA",ppg:4.0,rpg:1.5,apg:2.0,spg:0.5,bpg:0.1},
  {id:1618,name:"Ian Scheffelin",pos:"F",team:"MIA",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:1619,name:"Myron Gardner",pos:"G",team:"MIA",ppg:3.0,rpg:1.2,apg:1.5,spg:0.3,bpg:0.1},
  {id:1620,name:"Ryan Conwell",pos:"G",team:"MIA",ppg:3.0,rpg:1.0,apg:1.5,spg:0.3,bpg:0.1},
  {id:1621,name:"Tre Donaldson",pos:"G",team:"MIA",ppg:2.5,rpg:0.8,apg:1.2,spg:0.2,bpg:0.1},
  // Milwaukee Bucks
  {id:1702,name:"Tyler Herro",pos:"SG",team:"MIL",ppg:24.5,rpg:5.5,apg:5.5,spg:1.0,bpg:0.4},
  {id:1704,name:"Gary Trent Jr.",pos:"SG",team:"MIL",ppg:17.5,rpg:3.5,apg:2.5,spg:0.8,bpg:0.2},
  {id:1705,name:"Kyle Kuzma",pos:"F",team:"MIL",ppg:17.0,rpg:7.0,apg:3.0,spg:0.7,bpg:0.5},
  {id:1706,name:"Khris Middleton",pos:"SF",team:"MIL",ppg:14.0,rpg:5.0,apg:4.0,spg:1.0,bpg:0.4},
  {id:1707,name:"Jaime Jaquez Jr.",pos:"GF",team:"MIL",ppg:13.5,rpg:5.0,apg:3.0,spg:0.8,bpg:0.4},
  {id:1708,name:"Kel'el Ware",pos:"PF",team:"MIL",ppg:12.5,rpg:7.5,apg:1.8,spg:0.5,bpg:1.2},
  {id:1709,name:"Johni Broome",pos:"C",team:"MIL",ppg:11.5,rpg:8.0,apg:2.0,spg:0.7,bpg:1.0},
  {id:1710,name:"Kevin Porter Jr.",pos:"SF",team:"MIL",ppg:12.0,rpg:4.0,apg:4.0,spg:1.0,bpg:0.4},
  {id:1711,name:"Caris LeVert",pos:"G",team:"MIL",ppg:11.0,rpg:3.5,apg:3.5,spg:0.8,bpg:0.3},
  {id:1712,name:"Ousmane Dieng",pos:"SG",team:"MIL",ppg:9.5,rpg:3.5,apg:2.0,spg:0.6,bpg:0.4},
  {id:1713,name:"Kasparas Jakucionis",pos:"G",team:"MIL",ppg:9.0,rpg:3.0,apg:4.0,spg:0.7,bpg:0.2},
  {id:1714,name:"Jericho Sims",pos:"C",team:"MIL",ppg:7.0,rpg:6.5,apg:0.8,spg:0.4,bpg:1.0},
  {id:1715,name:"A.J. Green",pos:"PG",team:"MIL",ppg:8.5,rpg:2.5,apg:2.5,spg:0.5,bpg:0.2},
  {id:1716,name:"Brayden Burries",pos:"GF",team:"MIL",ppg:6.5,rpg:2.5,apg:1.5,spg:0.5,bpg:0.3},
  {id:1717,name:"Kam Jones",pos:"F",team:"MIL",ppg:5.5,rpg:2.5,apg:1.0,spg:0.4,bpg:0.3},
  {id:1718,name:"Cormac Ryan",pos:"SG",team:"MIL",ppg:6.0,rpg:2.0,apg:1.5,spg:0.4,bpg:0.2},
  {id:1719,name:"Bogoljub Markovic",pos:"PF",team:"MIL",ppg:4.5,rpg:3.0,apg:0.8,spg:0.3,bpg:0.4},
  {id:1720,name:"Ryan Rollins",pos:"G",team:"MIL",ppg:5.0,rpg:1.8,apg:2.0,spg:0.5,bpg:0.1},
  {id:1721,name:"Pete Nance",pos:"PF",team:"MIL",ppg:4.0,rpg:3.0,apg:0.8,spg:0.3,bpg:0.4},
  {id:1722,name:"Jake Stephens",pos:"C",team:"MIL",ppg:3.0,rpg:2.5,apg:0.3,spg:0.2,bpg:0.4},
  // Minnesota Timberwolves
  {id:1801,name:"Anthony Edwards",pos:"SF",team:"MIN",ppg:28.5,rpg:6.5,apg:5.5,spg:1.5,bpg:0.7},
  {id:1802,name:"LaMelo Ball",pos:"G",team:"MIN",ppg:24.5,rpg:5.5,apg:9.5,spg:1.5,bpg:0.4},
  {id:1803,name:"Rudy Gobert",pos:"C",team:"MIN",ppg:13.5,rpg:13.5,apg:2.0,spg:0.8,bpg:2.5},
  {id:1804,name:"Jaden McDaniels",pos:"F",team:"MIN",ppg:16.5,rpg:5.5,apg:2.5,spg:1.2,bpg:0.8},
  {id:1805,name:"Jonathan Kuminga",pos:"F",team:"MIN",ppg:18.5,rpg:5.5,apg:3.0,spg:0.9,bpg:0.6},
  {id:1806,name:"Donte DiVincenzo",pos:"SG",team:"MIN",ppg:15.0,rpg:4.5,apg:4.0,spg:1.0,bpg:0.3},
  {id:1807,name:"Terrence Shannon Jr.",pos:"F",team:"MIN",ppg:14.0,rpg:5.0,apg:2.0,spg:1.0,bpg:0.4},
  {id:1808,name:"Ayo Dosunmu",pos:"PG",team:"MIN",ppg:12.5,rpg:3.5,apg:5.0,spg:1.2,bpg:0.3},
  {id:1809,name:"K.J. Martin",pos:"F",team:"MIN",ppg:11.0,rpg:5.0,apg:1.5,spg:0.9,bpg:0.7},
  {id:1810,name:"Trey Lyles",pos:"SF",team:"MIN",ppg:10.5,rpg:5.0,apg:2.0,spg:0.5,bpg:0.5},
  {id:1811,name:"Bones Hyland",pos:"G",team:"MIN",ppg:11.5,rpg:3.0,apg:4.5,spg:0.8,bpg:0.2},
  {id:1812,name:"Jaylen Clark",pos:"G",team:"MIN",ppg:9.0,rpg:3.5,apg:2.5,spg:1.5,bpg:0.4},
  {id:1813,name:"Zyon Pullin",pos:"PG",team:"MIN",ppg:8.0,rpg:2.5,apg:4.0,spg:0.8,bpg:0.2},
  {id:1814,name:"Norchad Omier",pos:"F",team:"MIN",ppg:7.5,rpg:5.5,apg:0.8,spg:0.5,bpg:0.5},
  {id:1815,name:"Antonio Reeves",pos:"GF",team:"MIN",ppg:9.0,rpg:2.5,apg:1.5,spg:0.5,bpg:0.2},
  {id:1816,name:"Saddiq Bey",pos:"F",team:"MIN",ppg:8.5,rpg:4.0,apg:1.5,spg:0.6,bpg:0.4},
  {id:1817,name:"Isaiah Evans",pos:"G",team:"MIN",ppg:6.0,rpg:2.0,apg:1.5,spg:0.5,bpg:0.2},
  {id:1818,name:"Enrique Freeman",pos:"F",team:"MIN",ppg:5.5,rpg:4.5,apg:0.8,spg:0.4,bpg:0.4},
  {id:1819,name:"Drew Timme",pos:"F",team:"MIN",ppg:6.5,rpg:4.5,apg:1.0,spg:0.3,bpg:0.4},
  {id:1820,name:"Cody Williams",pos:"F",team:"MIN",ppg:5.5,rpg:3.0,apg:1.2,spg:0.5,bpg:0.3},
  {id:1821,name:"Rocco Zikarsky",pos:"C",team:"MIN",ppg:3.5,rpg:3.0,apg:0.3,spg:0.2,bpg:0.6},
  {id:1822,name:"Joan Beringer",pos:"C",team:"MIN",ppg:3.0,rpg:2.5,apg:0.3,spg:0.2,bpg:0.5},
  // New Orleans Pelicans
  {id:1901,name:"Zion Williamson",pos:"PF",team:"NOP",ppg:26.5,rpg:9.5,apg:5.5,spg:1.0,bpg:0.8},
  {id:1902,name:"Dejounte Murray",pos:"SG",team:"NOP",ppg:22.0,rpg:6.0,apg:7.0,spg:2.0,bpg:0.5},
  {id:1903,name:"Trey Murphy III",pos:"G",team:"NOP",ppg:19.5,rpg:5.0,apg:3.5,spg:1.0,bpg:0.5},
  {id:1904,name:"Jordan Poole",pos:"SG",team:"NOP",ppg:18.5,rpg:3.5,apg:5.5,spg:1.0,bpg:0.3},
  {id:1905,name:"Herb Jones",pos:"SF",team:"NOP",ppg:13.0,rpg:5.5,apg:3.5,spg:1.8,bpg:0.8},
  {id:1906,name:"Yves Missi",pos:"C",team:"NOP",ppg:12.5,rpg:9.5,apg:1.5,spg:0.7,bpg:1.8},
  {id:1907,name:"Bennedict Mathurin",pos:"GF",team:"NOP",ppg:15.5,rpg:5.0,apg:2.5,spg:0.8,bpg:0.4},
  {id:1908,name:"Derik Queen",pos:"C",team:"NOP",ppg:10.5,rpg:7.5,apg:2.0,spg:0.5,bpg:1.2},
  {id:1909,name:"Karlo Matkovic",pos:"PF",team:"NOP",ppg:9.5,rpg:5.5,apg:1.5,spg:0.5,bpg:0.8},
  {id:1910,name:"Jeremiah Fears",pos:"G",team:"NOP",ppg:9.0,rpg:3.0,apg:4.5,spg:1.0,bpg:0.2},
  {id:1911,name:"Kobe Bufkin",pos:"G",team:"NOP",ppg:8.5,rpg:2.5,apg:3.0,spg:0.7,bpg:0.2},
  {id:1912,name:"Malik Dia",pos:"F",team:"NOP",ppg:8.0,rpg:4.0,apg:1.2,spg:0.7,bpg:0.5},
  {id:1913,name:"Bryce McGowens",pos:"GF",team:"NOP",ppg:8.5,rpg:3.0,apg:1.5,spg:0.6,bpg:0.3},
  {id:1914,name:"A.J. Johnson",pos:"G",team:"NOP",ppg:7.5,rpg:2.5,apg:3.5,spg:0.7,bpg:0.2},
  {id:1915,name:"Trendon Watford",pos:"SF",team:"NOP",ppg:8.0,rpg:4.5,apg:2.0,spg:0.7,bpg:0.4},
  {id:1916,name:"DeAndre Jordan",pos:"C",team:"NOP",ppg:5.5,rpg:6.0,apg:0.8,spg:0.3,bpg:0.8},
  {id:1917,name:"Julian Reese",pos:"F",team:"NOP",ppg:5.0,rpg:4.5,apg:0.5,spg:0.3,bpg:0.6},
  {id:1918,name:"Jaron Pierre Jr.",pos:"F",team:"NOP",ppg:4.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1919,name:"Jalon Moore",pos:"F",team:"NOP",ppg:4.0,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:1920,name:"Jalen Pierre Jr.",pos:"F",team:"NOP",ppg:3.5,rpg:2.0,apg:0.5,spg:0.3,bpg:0.2},
  // New York Knicks
  {id:2001,name:"Jalen Brunson",pos:"PG",team:"NYK",ppg:28.0,rpg:3.5,apg:7.5,spg:0.9,bpg:0.2},
  {id:2002,name:"Karl-Anthony Towns",pos:"C",team:"NYK",ppg:24.0,rpg:11.5,apg:3.5,spg:0.7,bpg:0.8},
  {id:2003,name:"OG Anunoby",pos:"SF",team:"NYK",ppg:18.5,rpg:6.0,apg:2.5,spg:1.8,bpg:0.8},
  {id:2004,name:"Mikal Bridges",pos:"SG",team:"NYK",ppg:20.0,rpg:4.5,apg:3.5,spg:1.0,bpg:0.5},
  {id:2005,name:"Josh Hart",pos:"SG",team:"NYK",ppg:13.5,rpg:8.5,apg:4.5,spg:1.2,bpg:0.5},
  {id:2006,name:"Jordan Clarkson",pos:"G",team:"NYK",ppg:16.5,rpg:3.5,apg:4.5,spg:0.7,bpg:0.3},
  {id:2007,name:"Pacome Dadiet",pos:"SF",team:"NYK",ppg:13.5,rpg:5.0,apg:2.0,spg:0.9,bpg:0.5},
  {id:2008,name:"Ochai Agbaji",pos:"SF",team:"NYK",ppg:12.5,rpg:4.0,apg:1.8,spg:0.9,bpg:0.4},
  {id:2009,name:"Jaden Akins",pos:"G",team:"NYK",ppg:10.5,rpg:3.0,apg:2.5,spg:0.7,bpg:0.3},
  {id:2010,name:"Bruce Brown Jr.",pos:"SG",team:"NYK",ppg:11.0,rpg:4.5,apg:3.0,spg:1.0,bpg:0.4},
  {id:2011,name:"Miles McBride",pos:"G",team:"NYK",ppg:12.0,rpg:3.0,apg:4.0,spg:1.0,bpg:0.3},
  {id:2012,name:"Andre Drummond",pos:"C",team:"NYK",ppg:10.5,rpg:10.5,apg:1.0,spg:0.5,bpg:1.2},
  {id:2013,name:"Tyler Kolek",pos:"G",team:"NYK",ppg:9.5,rpg:3.0,apg:5.5,spg:0.8,bpg:0.2},
  {id:2014,name:"Jose Alvarado",pos:"G",team:"NYK",ppg:9.0,rpg:2.5,apg:3.5,spg:1.5,bpg:0.2},
  {id:2015,name:"Kevin McCullar Jr.",pos:"PG",team:"NYK",ppg:8.5,rpg:3.0,apg:3.0,spg:1.0,bpg:0.3},
  {id:2016,name:"Drew Eubanks",pos:"C",team:"NYK",ppg:8.0,rpg:6.5,apg:0.8,spg:0.4,bpg:0.8},
  {id:2017,name:"Tony Bradley",pos:"C",team:"NYK",ppg:6.5,rpg:5.5,apg:0.5,spg:0.3,bpg:0.7},
  {id:2018,name:"Landry Shamet",pos:"PG",team:"NYK",ppg:8.0,rpg:2.0,apg:2.5,spg:0.4,bpg:0.1},
  {id:2019,name:"James Wiseman",pos:"C",team:"NYK",ppg:7.5,rpg:6.0,apg:0.8,spg:0.4,bpg:1.0},
  {id:2020,name:"Mohamed Diawara",pos:"PF",team:"NYK",ppg:5.5,rpg:4.0,apg:0.8,spg:0.4,bpg:0.5},
  {id:2021,name:"Tyler Nickel",pos:"F",team:"NYK",ppg:4.5,rpg:2.5,apg:0.8,spg:0.3,bpg:0.3},
  {id:2022,name:"Brooks Barnhizer",pos:"SF",team:"NYK",ppg:4.0,rpg:2.0,apg:1.0,spg:0.4,bpg:0.2},
  // Oklahoma City Thunder
  {id:2101,name:"Shai Gilgeous-Alexander",pos:"PG",team:"OKC",ppg:32.5,rpg:5.5,apg:7.0,spg:2.0,bpg:0.8},
  {id:2102,name:"Jalen Williams",pos:"G",team:"OKC",ppg:24.5,rpg:5.5,apg:5.5,spg:1.2,bpg:0.7},
  {id:2103,name:"Chet Holmgren",pos:"C",team:"OKC",ppg:18.5,rpg:8.5,apg:2.5,spg:0.8,bpg:2.8},
  {id:2104,name:"Isaiah Hartenstein",pos:"PF",team:"OKC",ppg:14.5,rpg:11.5,apg:3.5,spg:1.0,bpg:1.5},
  {id:2105,name:"Alex Caruso",pos:"G",team:"OKC",ppg:11.5,rpg:4.0,apg:4.5,spg:2.2,bpg:0.5},
  {id:2106,name:"Cason Wallace",pos:"G",team:"OKC",ppg:13.5,rpg:4.0,apg:4.0,spg:1.5,bpg:0.5},
  {id:2107,name:"Jared McCain",pos:"G",team:"OKC",ppg:15.0,rpg:4.0,apg:4.0,spg:1.0,bpg:0.3},
  {id:2108,name:"Nikola Topic",pos:"PG",team:"OKC",ppg:12.5,rpg:4.5,apg:6.0,spg:0.9,bpg:0.3},
  {id:2109,name:"Ajay Mitchell",pos:"PG",team:"OKC",ppg:11.0,rpg:3.5,apg:4.5,spg:0.8,bpg:0.2},
  {id:2110,name:"Kenrich Williams",pos:"SF",team:"OKC",ppg:9.5,rpg:4.5,apg:2.5,spg:1.0,bpg:0.4},
  {id:2111,name:"Jaylin Williams",pos:"C",team:"OKC",ppg:9.0,rpg:7.0,apg:2.5,spg:0.7,bpg:0.8},
  {id:2112,name:"Otega Oweh",pos:"SG",team:"OKC",ppg:8.5,rpg:2.5,apg:1.5,spg:0.7,bpg:0.2},
  {id:2113,name:"Josh Dix",pos:"SG",team:"OKC",ppg:8.0,rpg:2.5,apg:2.0,spg:0.6,bpg:0.2},
  {id:2114,name:"Aday Mara",pos:"F",team:"OKC",ppg:6.5,rpg:4.5,apg:0.8,spg:0.4,bpg:0.8},
  {id:2115,name:"Thomas Sorber",pos:"FC",team:"OKC",ppg:6.0,rpg:4.5,apg:0.8,spg:0.4,bpg:0.8},
  {id:2116,name:"Bennett Stirtz",pos:"G",team:"OKC",ppg:5.5,rpg:2.0,apg:2.5,spg:0.5,bpg:0.1},
  {id:2118,name:"Andrew Holifield",pos:"C",team:"OKC",ppg:4.5,rpg:3.5,apg:0.5,spg:0.3,bpg:0.7},
  {id:2119,name:"Anthony Pritchard",pos:"G",team:"OKC",ppg:3.5,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:2120,name:"Christoph Tilly",pos:"C",team:"OKC",ppg:3.0,rpg:2.5,apg:0.3,spg:0.2,bpg:0.5},
  // Orlando Magic
  {id:2201,name:"Paolo Banchero",pos:"C",team:"ORL",ppg:26.5,rpg:8.5,apg:5.5,spg:1.0,bpg:0.9},
  {id:2202,name:"Franz Wagner",pos:"SF",team:"ORL",ppg:23.5,rpg:6.0,apg:5.0,spg:1.0,bpg:0.8},
  {id:2203,name:"Jalen Suggs",pos:"SG",team:"ORL",ppg:17.5,rpg:5.0,apg:5.5,spg:1.8,bpg:0.6},
  {id:2205,name:"Wendell Carter Jr.",pos:"PF",team:"ORL",ppg:14.0,rpg:9.5,apg:2.5,spg:0.8,bpg:1.2},
  {id:2206,name:"Tristan Da Silva",pos:"F",team:"ORL",ppg:13.5,rpg:5.5,apg:2.5,spg:0.8,bpg:0.5},
  {id:2207,name:"Anthony Black",pos:"G",team:"ORL",ppg:12.5,rpg:4.5,apg:4.5,spg:1.2,bpg:0.5},
  {id:2208,name:"Jonathan Isaac",pos:"SF",team:"ORL",ppg:12.0,rpg:6.0,apg:2.0,spg:1.5,bpg:2.0},
  {id:2209,name:"Nikola Vucevic",pos:"PF",team:"ORL",ppg:15.5,rpg:10.5,apg:3.5,spg:0.7,bpg:0.8},
  {id:2210,name:"Goga Bitadze",pos:"C",team:"ORL",ppg:10.5,rpg:7.5,apg:2.0,spg:0.5,bpg:1.5},
  {id:2211,name:"Malaki Branham",pos:"GF",team:"ORL",ppg:11.0,rpg:3.5,apg:2.5,spg:0.7,bpg:0.3},
  {id:2212,name:"Jase Richardson",pos:"G",team:"ORL",ppg:9.5,rpg:2.5,apg:4.0,spg:0.8,bpg:0.2},
  {id:2213,name:"Jevon Carter",pos:"PG",team:"ORL",ppg:8.5,rpg:3.0,apg:3.5,spg:1.5,bpg:0.3},
  {id:2214,name:"Jamal Cain",pos:"F",team:"ORL",ppg:7.5,rpg:4.0,apg:1.0,spg:0.6,bpg:0.4},
  {id:2215,name:"J.D. Davison",pos:"F",team:"ORL",ppg:7.0,rpg:3.0,apg:2.0,spg:0.6,bpg:0.3},
  {id:2216,name:"Colin Castleton",pos:"PF",team:"ORL",ppg:7.5,rpg:5.5,apg:1.0,spg:0.4,bpg:0.8},
  {id:2217,name:"Kevin Knox II",pos:"SF",team:"ORL",ppg:6.5,rpg:2.5,apg:1.0,spg:0.4,bpg:0.2},
  {id:2218,name:"Noah Penda",pos:"F",team:"ORL",ppg:5.5,rpg:3.0,apg:0.8,spg:0.5,bpg:0.4},
  {id:2219,name:"Alex Morales",pos:"G",team:"ORL",ppg:5.0,rpg:2.0,apg:1.5,spg:0.4,bpg:0.2},
  {id:2220,name:"Izaiyah Nelson",pos:"C",team:"ORL",ppg:4.5,rpg:3.5,apg:0.5,spg:0.3,bpg:0.7},
  // Philadelphia 76ers
  {id:2301,name:"Joel Embiid",pos:"C",team:"PHI",ppg:29.5,rpg:12.0,apg:4.5,spg:1.0,bpg:1.8},
  {id:2302,name:"LeBron James",pos:"F",team:"PHI",ppg:24.0,rpg:8.0,apg:7.5,spg:1.2,bpg:0.6},
  {id:2303,name:"Tyrese Maxey",pos:"PG",team:"PHI",ppg:26.5,rpg:4.0,apg:7.0,spg:1.0,bpg:0.3},
  {id:2304,name:"Jaylen Brown",pos:"SF",team:"PHI",ppg:23.5,rpg:5.5,apg:3.5,spg:1.0,bpg:0.5},
  {id:2305,name:"Anfernee Simons",pos:"SG",team:"PHI",ppg:20.5,rpg:3.5,apg:5.5,spg:0.8,bpg:0.3},
  {id:2306,name:"Kentavious Caldwell-Pope",pos:"SG",team:"PHI",ppg:12.5,rpg:3.5,apg:2.0,spg:1.0,bpg:0.3},
  {id:2307,name:"V.J. Edgecombe",pos:"F",team:"PHI",ppg:12.0,rpg:4.5,apg:2.5,spg:1.2,bpg:0.5},
  {id:2308,name:"Justin Edwards",pos:"SF",team:"PHI",ppg:11.5,rpg:4.0,apg:2.0,spg:0.9,bpg:0.5},
  {id:2309,name:"Dillon Jones",pos:"PG",team:"PHI",ppg:10.0,rpg:4.5,apg:4.0,spg:1.0,bpg:0.4},
  {id:2310,name:"Adem Bona",pos:"C",team:"PHI",ppg:9.5,rpg:7.0,apg:1.0,spg:0.5,bpg:1.5},
  {id:2311,name:"Dean Wade",pos:"PF",team:"PHI",ppg:8.5,rpg:4.0,apg:1.5,spg:0.6,bpg:0.4},
  {id:2312,name:"Tacko Fall",pos:"C",team:"PHI",ppg:6.5,rpg:5.5,apg:0.8,spg:0.3,bpg:1.5},
  {id:2313,name:"Ariel Hukporti",pos:"F",team:"PHI",ppg:6.0,rpg:5.0,apg:0.5,spg:0.4,bpg:1.0},
  {id:2314,name:"Rayan Rupert",pos:"G",team:"PHI",ppg:7.5,rpg:2.5,apg:1.5,spg:0.7,bpg:0.3},
  {id:2315,name:"Caleb Love",pos:"GF",team:"PHI",ppg:8.0,rpg:2.5,apg:2.5,spg:0.6,bpg:0.2},
  {id:2316,name:"Duke Miles",pos:"G",team:"PHI",ppg:5.5,rpg:1.5,apg:2.5,spg:0.5,bpg:0.1},
  {id:2317,name:"Jameer Nelson Jr.",pos:"G",team:"PHI",ppg:5.0,rpg:1.5,apg:2.5,spg:0.4,bpg:0.1},
  {id:2318,name:"Jabari Walker",pos:"F",team:"PHI",ppg:5.5,rpg:4.0,apg:0.8,spg:0.4,bpg:0.4},
  {id:2319,name:"Labaron Philon Jr.",pos:"G",team:"PHI",ppg:4.5,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:2320,name:"Saint Thomas",pos:"F",team:"PHI",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:2321,name:"Dominick Barlow",pos:"F",team:"PHI",ppg:4.0,rpg:2.5,apg:0.5,spg:0.3,bpg:0.4},
  // Phoenix Suns
  {id:2401,name:"Devin Booker",pos:"SG",team:"PHX",ppg:27.5,rpg:5.5,apg:7.0,spg:1.0,bpg:0.4},
  {id:2402,name:"Jalen Green",pos:"SG",team:"PHX",ppg:23.0,rpg:4.5,apg:4.5,spg:0.9,bpg:0.3},
  {id:2403,name:"Miles Bridges",pos:"SF",team:"PHX",ppg:21.5,rpg:7.5,apg:3.5,spg:1.0,bpg:0.6},
  {id:2404,name:"Mark Williams",pos:"C",team:"PHX",ppg:16.5,rpg:10.5,apg:1.5,spg:0.6,bpg:2.0},
  {id:2405,name:"Kennedy Chandler",pos:"PG",team:"PHX",ppg:15.5,rpg:4.0,apg:7.5,spg:1.8,bpg:0.4},
  {id:2406,name:"Dillon Brooks",pos:"F",team:"PHX",ppg:14.5,rpg:4.5,apg:2.5,spg:1.0,bpg:0.5},
  {id:2407,name:"Luke Kennard",pos:"SG",team:"PHX",ppg:13.5,rpg:3.0,apg:3.0,spg:0.7,bpg:0.2},
  {id:2408,name:"Haywood Highsmith",pos:"F",team:"PHX",ppg:11.5,rpg:4.5,apg:2.0,spg:0.8,bpg:0.4},
  {id:2409,name:"Duop Reath",pos:"C",team:"PHX",ppg:10.5,rpg:7.0,apg:1.5,spg:0.4,bpg:0.8},
  {id:2410,name:"Khaman Maluach",pos:"C",team:"PHX",ppg:9.5,rpg:7.5,apg:0.8,spg:0.5,bpg:1.5},
  {id:2411,name:"Koa Peat",pos:"F",team:"PHX",ppg:9.0,rpg:5.0,apg:1.5,spg:0.7,bpg:0.6},
  {id:2412,name:"Ryan Dunn",pos:"G",team:"PHX",ppg:10.0,rpg:3.5,apg:2.5,spg:1.2,bpg:0.5},
  {id:2413,name:"Koby Brea",pos:"GF",team:"PHX",ppg:8.5,rpg:3.0,apg:1.5,spg:0.5,bpg:0.2},
  {id:2414,name:"Jamaree Bouyea",pos:"G",team:"PHX",ppg:7.5,rpg:2.5,apg:3.0,spg:0.8,bpg:0.2},
  {id:2415,name:"Jordan Goodwin",pos:"SG",team:"PHX",ppg:7.0,rpg:3.0,apg:2.0,spg:0.8,bpg:0.2},
  {id:2416,name:"Collin Gillespie",pos:"PG",team:"PHX",ppg:6.5,rpg:2.0,apg:3.0,spg:0.5,bpg:0.1},
  {id:2417,name:"Rasheer Fleming",pos:"F",team:"PHX",ppg:5.5,rpg:3.5,apg:0.8,spg:0.4,bpg:0.4},
  {id:2418,name:"Oso Ighodaro",pos:"F",team:"PHX",ppg:5.0,rpg:3.5,apg:0.8,spg:0.4,bpg:0.5},
  {id:2419,name:"Pat Spencer",pos:"G",team:"PHX",ppg:4.5,rpg:1.5,apg:2.0,spg:0.4,bpg:0.1},
  {id:2420,name:"C.J. Huntley",pos:"F",team:"PHX",ppg:3.5,rpg:2.5,apg:0.5,spg:0.3,bpg:0.3},
  {id:2421,name:"Phillip Wheeler",pos:"F",team:"PHX",ppg:3.0,rpg:2.0,apg:0.4,spg:0.2,bpg:0.2},
  // Portland Trail Blazers
  {id:2501,name:"Damian Lillard",pos:"PG",team:"POR",ppg:26.5,rpg:4.5,apg:8.5,spg:1.0,bpg:0.3},
  {id:2502,name:"Scoot Henderson",pos:"G",team:"POR",ppg:22.5,rpg:5.5,apg:8.5,spg:1.5,bpg:0.5},
  {id:2503,name:"Donovan Clingan",pos:"C",team:"POR",ppg:14.5,rpg:11.5,apg:2.0,spg:0.7,bpg:3.0},
  {id:2504,name:"Shaedon Sharpe",pos:"F",team:"POR",ppg:21.5,rpg:5.5,apg:3.5,spg:1.0,bpg:0.5},
  {id:2505,name:"Deni Avdija",pos:"SG",team:"POR",ppg:18.5,rpg:6.5,apg:4.0,spg:1.0,bpg:0.6},
  {id:2506,name:"Jrue Holiday",pos:"G",team:"POR",ppg:16.5,rpg:5.0,apg:6.5,spg:1.8,bpg:0.5},
  {id:2507,name:"Jeremy Sochan",pos:"SG",team:"POR",ppg:14.5,rpg:6.0,apg:4.5,spg:1.0,bpg:0.5},
  {id:2508,name:"Toumani Camara",pos:"SF",team:"POR",ppg:13.0,rpg:5.5,apg:2.5,spg:1.2,bpg:0.6},
  {id:2509,name:"Robert Williams",pos:"PF",team:"POR",ppg:10.5,rpg:9.0,apg:1.5,spg:0.7,bpg:2.0},
  {id:2510,name:"Branden Carlson",pos:"PF",team:"POR",ppg:10.5,rpg:6.5,apg:1.5,spg:0.5,bpg:1.2},
  {id:2511,name:"Vit Krejci",pos:"PG",team:"POR",ppg:9.5,rpg:3.5,apg:4.5,spg:0.8,bpg:0.3},
  {id:2512,name:"John Tonje",pos:"GF",team:"POR",ppg:9.0,rpg:3.0,apg:2.0,spg:0.7,bpg:0.3},
  {id:2513,name:"Sidy Cissoko",pos:"GF",team:"POR",ppg:8.5,rpg:3.5,apg:1.8,spg:0.8,bpg:0.3},
  {id:2514,name:"Jayson Kent",pos:"SG",team:"POR",ppg:7.5,rpg:2.5,apg:2.0,spg:0.6,bpg:0.2},
  {id:2515,name:"Micah Potter",pos:"C",team:"POR",ppg:7.0,rpg:5.0,apg:1.0,spg:0.3,bpg:0.6},
  {id:2516,name:"Chris Youngblood",pos:"SG",team:"POR",ppg:6.5,rpg:2.5,apg:1.5,spg:0.5,bpg:0.2},
  {id:2517,name:"Yang Hansen",pos:"C",team:"POR",ppg:5.0,rpg:3.5,apg:0.5,spg:0.3,bpg:0.7},
  {id:2518,name:"Karim Lopez",pos:"F",team:"POR",ppg:4.5,rpg:2.5,apg:0.8,spg:0.3,bpg:0.3},
  // Sacramento Kings
  {id:2601,name:"De'Aaron Fox",pos:"PG",team:"SAC",ppg:26.5,rpg:4.5,apg:7.5,spg:1.5,bpg:0.4},
  {id:2602,name:"Domantas Sabonis",pos:"PF",team:"SAC",ppg:22.5,rpg:13.5,apg:8.0,spg:1.0,bpg:0.5},
  {id:2603,name:"Zach LaVine",pos:"SG",team:"SAC",ppg:24.0,rpg:5.0,apg:5.5,spg:0.9,bpg:0.5},
  {id:2604,name:"De'Andre Hunter",pos:"PF",team:"SAC",ppg:17.5,rpg:5.5,apg:2.5,spg:1.0,bpg:0.6},
  {id:2605,name:"Keegan Murray",pos:"F",team:"SAC",ppg:16.5,rpg:5.5,apg:2.0,spg:0.7,bpg:0.5},
  {id:2606,name:"Malik Monk",pos:"SG",team:"SAC",ppg:15.5,rpg:3.5,apg:5.5,spg:1.0,bpg:0.2},
  {id:2607,name:"Harrison Barnes",pos:"SF",team:"SAC",ppg:14.5,rpg:5.5,apg:2.5,spg:0.7,bpg:0.5},
  {id:2608,name:"Precious Achiuwa",pos:"SF",team:"SAC",ppg:12.5,rpg:7.0,apg:2.0,spg:0.8,bpg:0.8},
  {id:2609,name:"Maxime Raynaud",pos:"C",team:"SAC",ppg:11.0,rpg:8.0,apg:1.5,spg:0.5,bpg:1.2},
  {id:2610,name:"Ben Simmons",pos:"PF",team:"SAC",ppg:11.0,rpg:7.5,apg:6.5,spg:1.5,bpg:0.8},
  {id:2611,name:"Jonathan Mogbo",pos:"F",team:"SAC",ppg:10.0,rpg:6.0,apg:1.5,spg:0.7,bpg:0.6},
  {id:2612,name:"Tristen Newton",pos:"SG",team:"SAC",ppg:9.5,rpg:3.0,apg:5.5,spg:0.9,bpg:0.2},
  {id:2613,name:"Darius Acuff Jr.",pos:"G",team:"SAC",ppg:9.0,rpg:3.0,apg:3.5,spg:0.8,bpg:0.2},
  {id:2614,name:"Dylan Cardwell",pos:"PF",team:"SAC",ppg:7.5,rpg:5.5,apg:1.0,spg:0.5,bpg:0.8},
  {id:2615,name:"Leaky Black",pos:"SF",team:"SAC",ppg:7.0,rpg:4.0,apg:2.0,spg:0.8,bpg:0.4},
  {id:2616,name:"Alex Karaban",pos:"F",team:"SAC",ppg:7.5,rpg:3.5,apg:1.5,spg:0.4,bpg:0.4},
  {id:2617,name:"Elfrid Payton",pos:"G",team:"SAC",ppg:6.5,rpg:3.0,apg:4.5,spg:0.8,bpg:0.2},
  {id:2618,name:"Viktor Lakhin",pos:"F",team:"SAC",ppg:5.5,rpg:4.0,apg:0.8,spg:0.3,bpg:0.6},
  {id:2619,name:"Nique Clifford",pos:"F",team:"SAC",ppg:6.0,rpg:3.5,apg:1.2,spg:0.5,bpg:0.3},
  {id:2620,name:"Emanuel Sharp",pos:"PG",team:"SAC",ppg:5.0,rpg:1.8,apg:2.5,spg:0.5,bpg:0.1},
  {id:2621,name:"Daeqwon Plowden",pos:"GF",team:"SAC",ppg:4.5,rpg:2.5,apg:0.8,spg:0.4,bpg:0.3},
  {id:2622,name:"Adam Flagler",pos:"G",team:"SAC",ppg:4.0,rpg:1.5,apg:2.0,spg:0.3,bpg:0.1},
  // San Antonio Spurs
  {id:2701,name:"Victor Wembanyama",pos:"F",team:"SAS",ppg:27.5,rpg:11.5,apg:4.0,spg:1.5,bpg:3.5},
  {id:2702,name:"Dylan Harper",pos:"GF",team:"SAS",ppg:21.5,rpg:6.0,apg:5.5,spg:1.2,bpg:0.6},
  {id:2703,name:"Stephon Castle",pos:"G",team:"SAS",ppg:18.5,rpg:5.0,apg:5.0,spg:1.5,bpg:0.5},
  {id:2704,name:"Devin Vassell",pos:"SG",team:"SAS",ppg:19.5,rpg:4.5,apg:3.5,spg:1.2,bpg:0.5},
  {id:2705,name:"Jayden Quaintance",pos:"FC",team:"SAS",ppg:14.5,rpg:9.5,apg:2.5,spg:1.0,bpg:1.8},
  {id:2706,name:"Keldon Johnson",pos:"SF",team:"SAS",ppg:15.5,rpg:6.0,apg:2.5,spg:1.0,bpg:0.5},
  {id:2707,name:"Tobias Harris",pos:"F",team:"SAS",ppg:14.5,rpg:6.5,apg:2.5,spg:0.7,bpg:0.5},
  {id:2708,name:"Tarris Reed Jr.",pos:"PF",team:"SAS",ppg:12.0,rpg:7.5,apg:1.0,spg:0.6,bpg:1.5},
  {id:2709,name:"De'Anthony Fox",pos:"PG",team:"SAS",ppg:11.5,rpg:3.5,apg:6.0,spg:1.2,bpg:0.3},
  {id:2710,name:"Ja'Kobi Gillespie",pos:"SG",team:"SAS",ppg:11.0,rpg:3.0,apg:4.0,spg:1.0,bpg:0.2},
  {id:2711,name:"Julian Champagnie",pos:"F",team:"SAS",ppg:10.5,rpg:4.0,apg:1.5,spg:0.7,bpg:0.4},
  {id:2712,name:"Carter Bryant",pos:"F",team:"SAS",ppg:9.5,rpg:4.5,apg:1.5,spg:0.8,bpg:0.6},
  {id:2713,name:"Malik Williams",pos:"C",team:"SAS",ppg:8.5,rpg:6.0,apg:1.5,spg:0.5,bpg:0.8},
  {id:2714,name:"Maliq Brown",pos:"PF",team:"SAS",ppg:8.0,rpg:5.0,apg:1.2,spg:0.7,bpg:0.5},
  {id:2715,name:"Luke Kornet",pos:"F",team:"SAS",ppg:7.5,rpg:5.0,apg:1.5,spg:0.4,bpg:1.0},
  {id:2716,name:"David Jones-Garcia",pos:"SF",team:"SAS",ppg:7.0,rpg:3.5,apg:1.0,spg:0.6,bpg:0.4},
  {id:2717,name:"Jordan McLaughlin",pos:"G",team:"SAS",ppg:6.0,rpg:2.0,apg:4.0,spg:0.7,bpg:0.1},
  {id:2718,name:"Jon Elmore",pos:"G",team:"SAS",ppg:5.5,rpg:1.8,apg:2.5,spg:0.4,bpg:0.1},
  {id:2719,name:"Taelon Peter",pos:"G",team:"SAS",ppg:4.0,rpg:1.5,apg:1.5,spg:0.3,bpg:0.1},
  {id:2720,name:"Kyle Anderson",pos:"PF",team:"SAS",ppg:8.5,rpg:5.5,apg:3.5,spg:0.8,bpg:0.5},
  // Toronto Raptors
  {id:2801,name:"Scottie Barnes",pos:"SF",team:"TOR",ppg:24.5,rpg:9.5,apg:6.5,spg:1.5,bpg:0.8},
  {id:2802,name:"Kawhi Leonard",pos:"F",team:"TOR",ppg:22.5,rpg:7.0,apg:4.0,spg:1.8,bpg:0.8},
  {id:2803,name:"R.J. Barrett",pos:"SG",team:"TOR",ppg:22.0,rpg:6.5,apg:4.5,spg:1.0,bpg:0.5},
  {id:2804,name:"Immanuel Quickley",pos:"PG",team:"TOR",ppg:19.5,rpg:4.5,apg:7.5,spg:1.0,bpg:0.3},
  {id:2805,name:"Jakob Poeltl",pos:"C",team:"TOR",ppg:14.5,rpg:10.5,apg:3.0,spg:0.8,bpg:1.5},
  {id:2806,name:"Trayce Jackson-Davis",pos:"F",team:"TOR",ppg:13.5,rpg:8.0,apg:2.0,spg:0.8,bpg:1.5},
  {id:2807,name:"Jamison Battle",pos:"SF",team:"TOR",ppg:12.5,rpg:5.0,apg:2.0,spg:0.7,bpg:0.4},
  {id:2808,name:"Alijah Martin",pos:"PG",team:"TOR",ppg:11.5,rpg:3.5,apg:4.5,spg:0.9,bpg:0.2},
  {id:2810,name:"Jaden Bradley",pos:"SG",team:"TOR",ppg:10.0,rpg:3.5,apg:3.5,spg:0.9,bpg:0.3},
  {id:2811,name:"Ja'Kobe Walter",pos:"F",team:"TOR",ppg:9.5,rpg:3.5,apg:1.8,spg:0.7,bpg:0.4},
  {id:2812,name:"Collin Murray-Boyles",pos:"F",team:"TOR",ppg:9.0,rpg:5.0,apg:1.5,spg:0.7,bpg:0.5},
  {id:2813,name:"Nate Bittle",pos:"C",team:"TOR",ppg:8.5,rpg:6.0,apg:1.0,spg:0.4,bpg:1.2},
  {id:2814,name:"Tyreke Key",pos:"G",team:"TOR",ppg:7.5,rpg:2.5,apg:2.0,spg:0.5,bpg:0.2},
  {id:2815,name:"Tyson Degenhart",pos:"F",team:"TOR",ppg:7.0,rpg:4.0,apg:1.2,spg:0.5,bpg:0.4},
  {id:2816,name:"Malachi Smith",pos:"G",team:"TOR",ppg:6.5,rpg:2.0,apg:2.5,spg:0.5,bpg:0.2},
  {id:2817,name:"Jamal Shead",pos:"G",team:"TOR",ppg:6.0,rpg:2.5,apg:3.5,spg:0.7,bpg:0.1},
  {id:2818,name:"Nimari Burnett",pos:"G",team:"TOR",ppg:5.5,rpg:2.0,apg:1.8,spg:0.5,bpg:0.2},
  {id:2819,name:"Jamarion Sharp",pos:"C",team:"TOR",ppg:5.0,rpg:4.0,apg:0.5,spg:0.3,bpg:0.8},
  {id:2820,name:"Trey Jemison",pos:"PF",team:"TOR",ppg:4.5,rpg:4.0,apg:0.5,spg:0.2,bpg:0.6},
  {id:2821,name:"Allen Graves",pos:"G",team:"TOR",ppg:3.5,rpg:1.5,apg:1.8,spg:0.3,bpg:0.1},
  // Utah Jazz
  {id:2901,name:"Lauri Markkanen",pos:"SF",team:"UTA",ppg:24.5,rpg:9.0,apg:2.5,spg:0.8,bpg:0.8},
  {id:2902,name:"Jaren Jackson Jr.",pos:"PF",team:"UTA",ppg:22.5,rpg:9.5,apg:2.5,spg:1.0,bpg:3.5},
  {id:2903,name:"Ace Bailey",pos:"SF",team:"UTA",ppg:19.5,rpg:7.5,apg:3.5,spg:1.2,bpg:0.8},
  {id:2904,name:"Isaiah Collier",pos:"G",team:"UTA",ppg:17.5,rpg:4.5,apg:8.5,spg:1.5,bpg:0.4},
  {id:2905,name:"Keyonte George",pos:"G",team:"UTA",ppg:16.5,rpg:4.0,apg:6.5,spg:1.0,bpg:0.3},
  {id:2906,name:"Deandre Ayton",pos:"C",team:"UTA",ppg:17.5,rpg:11.0,apg:2.0,spg:0.7,bpg:1.2},
  {id:2907,name:"Jusuf Nurkic",pos:"FC",team:"UTA",ppg:13.5,rpg:10.0,apg:3.5,spg:0.7,bpg:1.0},
  {id:2908,name:"Josh Green",pos:"SG",team:"UTA",ppg:14.0,rpg:5.0,apg:3.0,spg:1.2,bpg:0.5},
  {id:2909,name:"Trey Alexander",pos:"SG",team:"UTA",ppg:12.5,rpg:4.0,apg:3.5,spg:0.9,bpg:0.3},
  {id:2910,name:"Kyle Filipowski",pos:"C",team:"UTA",ppg:12.0,rpg:7.5,apg:2.5,spg:0.6,bpg:1.0},
  {id:2911,name:"Darryn Peterson",pos:"G",team:"UTA",ppg:11.5,rpg:3.5,apg:4.0,spg:1.0,bpg:0.3},
  {id:2912,name:"Reece Beekman",pos:"PG",team:"UTA",ppg:11.0,rpg:3.5,apg:5.5,spg:1.5,bpg:0.3},
  {id:2913,name:"Harrison Ingram",pos:"F",team:"UTA",ppg:10.5,rpg:6.0,apg:2.5,spg:0.8,bpg:0.5},
  {id:2914,name:"Jaxson Hayes",pos:"PF",team:"UTA",ppg:11.5,rpg:7.5,apg:1.5,spg:0.5,bpg:1.8},
  {id:2915,name:"Bub Carrington",pos:"G",team:"UTA",ppg:10.0,rpg:3.0,apg:4.5,spg:0.9,bpg:0.2},
  {id:2916,name:"Mo Bamba",pos:"C",team:"UTA",ppg:9.5,rpg:7.5,apg:1.5,spg:0.6,bpg:1.8},
  {id:2917,name:"Brice Sensabaugh",pos:"F",team:"UTA",ppg:10.0,rpg:4.0,apg:1.5,spg:0.6,bpg:0.3},
  {id:2918,name:"Blake Hinson",pos:"SG",team:"UTA",ppg:9.0,rpg:3.5,apg:1.5,spg:0.5,bpg:0.2},
  {id:2919,name:"Josh Okogie",pos:"SG",team:"UTA",ppg:9.5,rpg:4.0,apg:2.0,spg:1.2,bpg:0.5},
  {id:2920,name:"Taylor Funk",pos:"PF",team:"UTA",ppg:7.0,rpg:4.5,apg:1.0,spg:0.4,bpg:0.4},
  {id:2921,name:"Tamar Bates",pos:"G",team:"UTA",ppg:7.5,rpg:2.5,apg:2.0,spg:0.5,bpg:0.2},
  {id:2922,name:"Svi Mykhailiuk",pos:"SF",team:"UTA",ppg:8.0,rpg:2.5,apg:1.5,spg:0.4,bpg:0.2},
  {id:2923,name:"Jonas Aldoo",pos:"C",team:"UTA",ppg:4.5,rpg:4.0,apg:0.5,spg:0.3,bpg:0.7},
  // Washington Wizards
  {id:3001,name:"Trae Young",pos:"PG",team:"WAS",ppg:27.5,rpg:3.5,apg:11.5,spg:1.0,bpg:0.2},
  {id:3002,name:"Anthony Davis",pos:"PF",team:"WAS",ppg:24.5,rpg:12.5,apg:3.5,spg:1.2,bpg:2.5},
  {id:3003,name:"Alex Sarr",pos:"FC",team:"WAS",ppg:18.5,rpg:10.5,apg:2.5,spg:1.0,bpg:2.8},
  {id:3004,name:"A.J. Dybantsa",pos:"GF",team:"WAS",ppg:17.5,rpg:6.5,apg:3.5,spg:1.2,bpg:0.7},
  {id:3005,name:"Bilal Coulibaly",pos:"GF",team:"WAS",ppg:15.5,rpg:6.0,apg:3.5,spg:1.8,bpg:0.7},
  {id:3007,name:"Tre Mann",pos:"PG",team:"WAS",ppg:15.0,rpg:3.5,apg:5.5,spg:0.9,bpg:0.2},
  {id:3008,name:"Tre Johnson",pos:"SG",team:"WAS",ppg:14.5,rpg:3.5,apg:3.0,spg:0.8,bpg:0.3},
  {id:3009,name:"Will Riley",pos:"F",team:"WAS",ppg:12.5,rpg:5.0,apg:2.5,spg:0.8,bpg:0.5},
  {id:3010,name:"Kyshawn George",pos:"F",team:"WAS",ppg:12.0,rpg:5.5,apg:3.0,spg:1.0,bpg:0.5},
  {id:3012,name:"Felix Okpara",pos:"C",team:"WAS",ppg:9.5,rpg:8.0,apg:1.0,spg:0.5,bpg:2.0},
  {id:3013,name:"Anthony Gill",pos:"PF",team:"WAS",ppg:9.0,rpg:5.0,apg:1.0,spg:0.5,bpg:0.5},
  {id:3014,name:"Trevor Keels",pos:"PG",team:"WAS",ppg:9.5,rpg:3.0,apg:4.0,spg:0.8,bpg:0.2},
  {id:3015,name:"Justin Champagnie",pos:"F",team:"WAS",ppg:9.0,rpg:4.5,apg:1.5,spg:0.7,bpg:0.4},
  {id:3016,name:"Jamir Watkins",pos:"F",team:"WAS",ppg:8.0,rpg:4.0,apg:1.5,spg:0.7,bpg:0.4},
  {id:3017,name:"Chris Livingston",pos:"F",team:"WAS",ppg:7.5,rpg:3.5,apg:1.5,spg:0.6,bpg:0.3},
  {id:3018,name:"Tristan Vukcevic",pos:"F",team:"WAS",ppg:7.0,rpg:4.5,apg:1.2,spg:0.4,bpg:0.6},
  {id:3019,name:"Alondes Williams",pos:"G",team:"WAS",ppg:5.5,rpg:2.0,apg:2.5,spg:0.4,bpg:0.1},
];


// NBA team abbreviations
const NBA_TEAMS = {
  ATL:'Hawks', BOS:'Celtics', BKN:'Nets', CHA:'Hornets', CHI:'Bulls',
  CLE:'Cavaliers', DAL:'Mavericks', DEN:'Nuggets', DET:'Pistons', GSW:'Warriors',
  HOU:'Rockets', IND:'Pacers', LAC:'Clippers', LAL:'Lakers', MEM:'Grizzlies',
  MIA:'Heat', MIL:'Bucks', MIN:'Timberwolves', NOP:'Pelicans', NYK:'Knicks',
  OKC:'Thunder', ORL:'Magic', PHI:'76ers', PHX:'Suns', POR:'Trail Blazers',
  SAC:'Kings', SAS:'Spurs', TOR:'Raptors', UTA:'Jazz', WAS:'Wizards',
};

// Team logos: pixel art uploads for NYK/PHI; ESPN CDN for all others.
// ESPN team IDs for all 30 franchises.
const ESPN_TEAM_IDS = {
  ATL:1, BOS:2, BKN:17, CHA:30, CHI:4, CLE:5, DAL:6, DEN:7, DET:8, GSW:9,
  HOU:10, IND:11, LAC:12, LAL:13, MEM:29, MIA:14, MIL:15, MIN:16, NOP:3, NYK:18,
  OKC:25, ORL:19, PHI:20, PHX:21, POR:22, SAC:23, SAS:24, TOR:28, UTA:26, WAS:27,
};
const PIXEL_LOGOS = { NYK:'/logos/NYK.jpg', PHI:'/logos/PHI.jpg' };
function getTeamLogoUrl(abbr){
  if(PIXEL_LOGOS[abbr]) return PIXEL_LOGOS[abbr];
  const id = ESPN_TEAM_IDS[abbr];
  if(id) return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr.toLowerCase()}.png`;
  return null;
}

// ── PLAYER BIO LOOKUP (from 2026-27 Rosters PDF) ─────────────────────────────
const PLAYER_INFO = {
"Nickeil Alexander-Walker":{pos:"SG",ht:"6-5",wt:205,age:28,yrs:7,college:"Virginia Tech",draft:"2019 R1 P17",nat:"Canada"},
"Jalen Johnson":{pos:"PF",ht:"6-8",wt:219,age:24,yrs:5,college:"Duke",draft:"2021 R1 P20",nat:"United States"},
"Kobe Johnson":{pos:"G",ht:"6-6",wt:200,age:23,yrs:0,college:"UCLA",draft:"2025 Undrafted",nat:"United States"},
"Corey Kispert":{pos:"SF",ht:"6-6",wt:224,age:27,yrs:5,college:"Gonzaga",draft:"2021 R1 P15",nat:"United States"},
"Trae Young":{pos:"PG",ht:"6-2",wt:164,age:28,yrs:8,college:"Oklahoma",draft:"2018 R1 P5",nat:"United States"},
"Devin Carter":{pos:"G",ht:"6-2",wt:199,age:24,yrs:2,college:"Providence",draft:"2024 R1 P13",nat:"United States"},
"Jayson Tatum":{pos:"SF",ht:"6-8",wt:229,age:28,yrs:9,college:"Duke",draft:"2017 R1 P3",nat:"United States"},
"Luka Garza":{pos:"C",ht:"6-10",wt:252,age:27,yrs:5,college:"Iowa",draft:"2021 R2 P52",nat:"United States"},
"Payton Pritchard":{pos:"PG",ht:"6-1",wt:212,age:28,yrs:6,college:"Oregon",draft:"2020 R1 P26",nat:"United States"},
"Sam Hauser":{pos:"SF",ht:"6-7",wt:217,age:28,yrs:5,college:"Virginia",draft:"2021 NBA Undrafted",nat:"United States"},
"Jaylen Brown":{pos:"SF",ht:"6-6",wt:223,age:29,yrs:9,college:"California",draft:"2016 R1 P3",nat:"United States"},
"Jayson Tatum":{pos:"SF",ht:"6-8",wt:229,age:28,yrs:9,college:"Duke",draft:"2017 R1 P3",nat:"United States"},
"Mikal Bridges":{pos:"SG",ht:"6-6",wt:209,age:28,yrs:8,college:"Villanova",draft:"2018 R1 P10",nat:"United States"},
"Jalen Brunson":{pos:"PG",ht:"6-2",wt:190,age:28,yrs:8,college:"Villanova",draft:"2018 R2 P33",nat:"United States"},
"OG Anunoby":{pos:"SF",ht:"6-7",wt:240,age:27,yrs:9,college:"Indiana",draft:"2017 R1 P23",nat:"United States"},
"Karl-Anthony Towns":{pos:"C",ht:"7-0",wt:248,age:30,yrs:11,college:"Kentucky",draft:"2015 R1 P1",nat:"Dominican Republic"},
"Josh Hart":{pos:"SG",ht:"6-5",wt:215,age:29,yrs:9,college:"Villanova",draft:"2017 R1 P30",nat:"United States"},
"Andre Drummond":{pos:"C",ht:"6-11",wt:279,age:33,yrs:14,college:"UConn",draft:"2012 R1 P9",nat:"United States"},
"Shai Gilgeous-Alexander":{pos:"PG",ht:"6-6",wt:195,age:28,yrs:8,college:"Kentucky",draft:"2018 R1 P11",nat:"Canada"},
"Chet Holmgren":{pos:"C",ht:"7-1",wt:195,age:22,yrs:4,college:"Gonzaga",draft:"2022 R1 P2",nat:"United States"},
"Josh Giddey":{pos:"G",ht:"6-8",wt:214,age:22,yrs:5,college:"Adelaide (Australia)",draft:"2021 R1 P6",nat:"Australia"},
"Luguentz Dort":{pos:"PG",ht:"6-4",wt:220,age:26,yrs:7,college:"Arizona State",draft:"2019 Undrafted",nat:"Canada"},
"Isaiah Hartenstein":{pos:"PF",ht:"7-0",wt:250,age:27,yrs:8,college:"Zalgiris (Lithuania)",draft:"2017 R2 P43",nat:"Germany"},
"Nikola Jokic":{pos:"C",ht:"6-10",wt:284,age:31,yrs:11,college:"KK Mega Bemax (Serbia)",draft:"2014 R2 P41",nat:"Serbia"},
"Aaron Gordon":{pos:"F",ht:"6-8",wt:235,age:31,yrs:12,college:"Arizona",draft:"2014 R1 P4",nat:"United States"},
"Jamal Murray":{pos:"SG",ht:"6-4",wt:215,age:29,yrs:10,college:"Kentucky",draft:"2016 R1 P7",nat:"Canada"},
"Zeke Nnaji":{pos:"PF",ht:"6-10",wt:240,age:25,yrs:6,college:"Arizona",draft:"2020 R1 P22",nat:"United States"},
"Christian Wood":{pos:"PF",ht:"6-9",wt:214,age:29,yrs:7,college:"UNLV",draft:"2015 Undrafted",nat:"United States"},
"Cade Cunningham":{pos:"PG",ht:"6-6",wt:220,age:23,yrs:5,college:"Oklahoma State",draft:"2021 R1 P1",nat:"United States"},
"Jalen Duren":{pos:"PF",ht:"6-10",wt:250,age:21,yrs:4,college:"Memphis",draft:"2022 R1 P13",nat:"United States"},
"Ausar Thompson":{pos:"G",ht:"6-7",wt:205,age:23,yrs:3,college:"Overtime Elite (Georgia)",draft:"2023 R1 P5",nat:"United States"},
"Kevin Huerter":{pos:"SF",ht:"6-6",wt:190,age:28,yrs:8,college:"Maryland",draft:"2018 R1 P19",nat:"United States"},
"Donovan Mitchell":{pos:"SG",ht:"6-2",wt:228,age:29,yrs:9,college:"Louisville",draft:"2017 R1 P13",nat:"United States"},
"Evan Mobley":{pos:"PF",ht:"6-11",wt:230,age:25,yrs:5,college:"USC",draft:"2021 R1 P3",nat:"United States"},
"Darius Garland":{pos:"G",ht:"6-1",wt:192,age:26,yrs:7,college:"Vanderbilt",draft:"2019 R1 P5",nat:"United States"},
"Jarrett Allen":{pos:"C",ht:"6-9",wt:250,age:27,yrs:9,college:"Texas",draft:"2017 R1 P22",nat:"United States"},
"James Harden":{pos:"SG",ht:"6-4",wt:220,age:37,yrs:17,college:"Arizona State",draft:"2009 R1 P3",nat:"United States"},
"Luka Doncic":{pos:"SF",ht:"6-8",wt:230,age:27,yrs:8,college:"Real Madrid (Spain)",draft:"2018 R1 P3",nat:"Slovenia"},
"Kyrie Irving":{pos:"G",ht:"6-2",wt:195,age:34,yrs:15,college:"Duke",draft:"2011 R1 P1",nat:"United States"},
"Cooper Flagg":{pos:"F",ht:"6-10",wt:205,age:19,yrs:1,college:"Duke",draft:"2025 R1 P1",nat:"United States"},
"Daniel Gafford":{pos:"C",ht:"6-10",wt:265,age:27,yrs:7,college:"Arkansas",draft:"2019 R2 P38",nat:"United States"},
"Dereck Lively II":{pos:"C",ht:"7-1",wt:230,age:21,yrs:3,college:"Duke",draft:"2023 R1 P12",nat:"United States"},
"P.J. Washington":{pos:"PF",ht:"6-6",wt:230,age:27,yrs:7,college:"Kentucky",draft:"2019 R1 P12",nat:"United States"},
"Alperen Sengun":{pos:"C",ht:"6-11",wt:271,age:22,yrs:5,college:"Besiktas Icrypex (Turkiye)",draft:"2021 R1 P16",nat:"Turkiye"},
"Kevin Durant":{pos:"SF",ht:"6-11",wt:234,age:38,yrs:19,college:"Texas",draft:"2007 R1 P2",nat:"United States"},
"Amen Thompson":{pos:"F",ht:"6-7",wt:239,age:22,yrs:3,college:"Overtime Elite (Georgia)",draft:"2023 R1 P4",nat:"United States"},
"Fred VanVleet":{pos:"G",ht:"6-0",wt:213,age:32,yrs:10,college:"Wichita State",draft:"2016 Undrafted",nat:"United States"},
"Jabari Smith Jr.":{pos:"F",ht:"6-11",wt:231,age:23,yrs:4,college:"Auburn",draft:"2022 R1 P3",nat:"United States"},
"Pascal Siakam":{pos:"PF",ht:"6-9",wt:245,age:32,yrs:10,college:"New Mexico State",draft:"2016 R1 P27",nat:"Cameroon"},
"Tyrese Haliburton":{pos:"PG",ht:"6-5",wt:185,age:27,yrs:6,college:"Iowa State",draft:"2020 R1 P12",nat:"United States"},
"Myles Turner":{pos:"FC",ht:"6-11",wt:250,age:30,yrs:11,college:"Texas",draft:"2015 R1 P11",nat:"United States"},
"Buddy Hield":{pos:"G",ht:"6-5",wt:220,age:33,yrs:10,college:"Oklahoma",draft:"2016 R1 P6",nat:"Bahamas"},
"LeBron James":{pos:"F",ht:"6-9",wt:250,age:41,yrs:23,college:"St. Vincent St. Mary HS (Ohio)",draft:"2003 R1 P1",nat:"United States"},
"Joel Embiid":{pos:"C",ht:"7-0",wt:270,age:32,yrs:12,college:"Kansas",draft:"2014 R1 P3",nat:"Cameroon"},
"Tyrese Maxey":{pos:"PG",ht:"6-2",wt:200,age:25,yrs:6,college:"Kentucky",draft:"2020 R1 P21",nat:"United States"},
"Paul George":{pos:"GF",ht:"6-8",wt:230,age:36,yrs:16,college:"Fresno State",draft:"2010 R1 P10",nat:"United States"},
"Stephen Curry":{pos:"G",ht:"6-2",wt:185,age:38,yrs:17,college:"Davidson",draft:"2009 R1 P7",nat:"United States"},
"Draymond Green":{pos:"F",ht:"6-6",wt:230,age:36,yrs:14,college:"Michigan State",draft:"2012 R2 P35",nat:"United States"},
"Klay Thompson":{pos:"SG",ht:"6-5",wt:220,age:36,yrs:15,college:"Washington State",draft:"2011 R1 P11",nat:"United States"},
"Jimmy Butler III":{pos:"GF",ht:"6-6",wt:230,age:37,yrs:15,college:"Marquette",draft:"2011 R1 P30",nat:"United States"},
"Al Horford":{pos:"FC",ht:"6-8",wt:240,age:40,yrs:19,college:"Florida",draft:"2007 R1 P3",nat:"Dominican Republic"},
"Kristaps Porzingis":{pos:"FC",ht:"7-2",wt:240,age:30,yrs:11,college:"Real Betis Baloncesto (Spain)",draft:"2015 R1 P4",nat:"Latvia"},
"Bam Adebayo":{pos:"C",ht:"6-9",wt:255,age:27,yrs:9,college:"Kentucky",draft:"2017 R1 P14",nat:"United States"},
"Giannis Antetokounmpo":{pos:"F",ht:"6-11",wt:250,age:31,yrs:13,college:"Filathlitikos Div II Greece",draft:"2013 R1 P15",nat:"Greece"},
"Nikola Jovic":{pos:"F",ht:"6-10",wt:215,age:23,yrs:4,college:"KK Mega Bemax (Serbia)",draft:"2022 R1 P27",nat:"Serbia"},
"Damion Lee":{pos:"SG",ht:"6-5",wt:210,age:32,yrs:7,college:"Louisville",draft:"2016 Undrafted",nat:"United States"},
"Dru Smith":{pos:"SG",ht:"6-2",wt:200,age:27,yrs:4,college:"Missouri",draft:"2021 R1 P1",nat:"United States"},
"Kyle Kuzma":{pos:"F",ht:"6-8",wt:221,age:31,yrs:9,college:"Utah",draft:"2017 R1 P27",nat:"United States"},
"Giannis Antetokounmpo":{pos:"F",ht:"6-11",wt:250,age:31,yrs:13,college:"Filathlitikos Div II Greece",draft:"2013 R1 P15",nat:"Greece"},
"Khris Middleton":{pos:"SF",ht:"6-7",wt:222,age:33,yrs:14,college:"Texas A&M",draft:"2012 R2 P39",nat:"United States"},
"Damian Lillard":{pos:"G",ht:"6-2",wt:195,age:36,yrs:14,college:"Weber State",draft:"2012 R1 P6",nat:"United States"},
"Brook Lopez":{pos:"C",ht:"7-1",wt:282,age:36,yrs:18,college:"Stanford",draft:"2008 R1 P10",nat:"United States"},
"Bobby Portis":{pos:"PF",ht:"6-9",wt:250,age:31,yrs:11,college:"Arkansas",draft:"2015 R1 P22",nat:"United States"},
"LaMelo Ball":{pos:"G",ht:"6-7",wt:180,age:25,yrs:6,college:"Illawarra (Australia)",draft:"2020 R1 P3",nat:"United States"},
"Anthony Edwards":{pos:"SF",ht:"6-5",wt:225,age:25,yrs:6,college:"Georgia",draft:"2020 R1 P1",nat:"United States"},
"Rudy Gobert":{pos:"C",ht:"7-1",wt:258,age:32,yrs:13,college:"Cholet Basket (France)",draft:"2013 R1 P27",nat:"France"},
"Karl-Anthony Towns":{pos:"C",ht:"7-0",wt:248,age:30,yrs:11,college:"Kentucky",draft:"2015 R1 P1",nat:"Dominican Republic"},
"Julius Randle":{pos:"PF",ht:"6-9",wt:250,age:31,yrs:12,college:"Kentucky",draft:"2014 R1 P7",nat:"United States"},
"Zion Williamson":{pos:"PF",ht:"6-6",wt:277,age:25,yrs:7,college:"Duke",draft:"2019 R1 P1",nat:"United States"},
"CJ McCollum":{pos:"G",ht:"6-2",wt:190,age:34,yrs:13,college:"Lehigh",draft:"2013 R1 P10",nat:"United States"},
"Herb Jones":{pos:"SF",ht:"6-7",wt:210,age:27,yrs:5,college:"Alabama",draft:"2021 R2 P35",nat:"United States"},
"Ja Morant":{pos:"G",ht:"6-2",wt:174,age:27,yrs:7,college:"Murray State",draft:"2019 R1 P2",nat:"United States"},
"Desmond Bane":{pos:"SG",ht:"6-6",wt:215,age:27,yrs:6,college:"TCU",draft:"2020 R1 P30",nat:"United States"},
"Jaren Jackson Jr.":{pos:"PF",ht:"6-10",wt:242,age:27,yrs:8,college:"Michigan State",draft:"2018 R1 P4",nat:"United States"},
"Victor Wembanyama":{pos:"F",ht:"7-4",wt:210,age:22,yrs:3,college:"Boulogne-Levallois (France)",draft:"2023 R1 P1",nat:"France"},
"Devin Booker":{pos:"SG",ht:"6-5",wt:206,age:28,yrs:11,college:"Kentucky",draft:"2015 R1 P13",nat:"United States"},
"Kevin Durant":{pos:"SF",ht:"6-11",wt:234,age:38,yrs:19,college:"Texas",draft:"2007 R1 P2",nat:"United States"},
"Bradley Beal":{pos:"SG",ht:"6-4",wt:207,age:32,yrs:14,college:"Florida",draft:"2012 R1 P3",nat:"United States"},
"Deni Avdija":{pos:"SG",ht:"6-8",wt:228,age:25,yrs:6,college:"Maccabi Tel Aviv U18 (Israel)",draft:"2020 R1 P9",nat:"Israel"},
"Jrue Holiday":{pos:"G",ht:"6-4",wt:220,age:36,yrs:17,college:"UCLA",draft:"2009 R1 P17",nat:"United States"},
"Anfernee Simons":{pos:"SG",ht:"6-3",wt:181,age:25,yrs:8,college:"IMG Academy (Florida)",draft:"2018 R1 P24",nat:"United States"},
"Domantas Sabonis":{pos:"PF",ht:"6-10",wt:240,age:30,yrs:10,college:"Gonzaga",draft:"2016 R1 P11",nat:"Lithuania"},
"De'Aaron Fox":{pos:"PG",ht:"6-3",wt:185,age:27,yrs:9,college:"Kentucky",draft:"2017 R1 P5",nat:"United States"},
"Zach LaVine":{pos:"SG",ht:"6-5",wt:200,age:31,yrs:12,college:"UCLA",draft:"2014 R1 P13",nat:"United States"},
"Harrison Barnes":{pos:"SF",ht:"6-7",wt:225,age:34,yrs:14,college:"North Carolina",draft:"2012 R1 P7",nat:"United States"},
"Ben Simmons":{pos:"PF",ht:"6-10",wt:245,age:30,yrs:9,college:"LSU",draft:"2016 R1 P1",nat:"Australia"},
"Kawhi Leonard":{pos:"F",ht:"6-6",wt:225,age:35,yrs:15,college:"San Diego State",draft:"2011 R1 P15",nat:"United States"},
"James Harden":{pos:"SG",ht:"6-4",wt:220,age:37,yrs:17,college:"Arizona State",draft:"2009 R1 P3",nat:"United States"},
"Tobias Harris":{pos:"F",ht:"6-8",wt:226,age:34,yrs:15,college:"Tennessee",draft:"2011 R1 P19",nat:"United States"},
"Keldon Johnson":{pos:"SF",ht:"6-6",wt:220,age:26,yrs:7,college:"Kentucky",draft:"2019 R1 P29",nat:"United States"},
"Demar DeRozan":{pos:"GF",ht:"6-6",wt:220,age:37,yrs:17,college:"USC",draft:"2009 R1 P9",nat:"United States"},
"Nikola Vucevic":{pos:"PF",ht:"6-9",wt:265,age:35,yrs:15,college:"USC",draft:"2011 R1 P16",nat:"Montenegro"},
"Anthony Davis":{pos:"F",ht:"6-10",wt:253,age:32,yrs:14,college:"Kentucky",draft:"2012 R1 P1",nat:"United States"},
"Brandon Ingram":{pos:"SF",ht:"6-8",wt:190,age:27,yrs:10,college:"Duke",draft:"2016 R1 P2",nat:"United States"},
"Trae Young":{pos:"PG",ht:"6-2",wt:164,age:28,yrs:8,college:"Oklahoma",draft:"2018 R1 P5",nat:"United States"},
"Jonathan Kuminga":{pos:"F",ht:"6-7",wt:225,age:22,yrs:5,college:"NBA G League Ignite",draft:"2021 R1 P7",nat:"Democratic Republic of Congo"},
"Scottie Barnes":{pos:"SF",ht:"6-8",wt:230,age:25,yrs:5,college:"Florida State",draft:"2021 R1 P4",nat:"United States"},
"RJ Barrett":{pos:"SG",ht:"6-6",wt:214,age:24,yrs:7,college:"Duke",draft:"2019 R1 P3",nat:"Canada"},
"Scottie Barnes":{pos:"SF",ht:"6-8",wt:230,age:25,yrs:5,college:"Florida State",draft:"2021 R1 P4",nat:"United States"},
"Immanuel Quickley":{pos:"PG",ht:"6-2",wt:190,age:27,yrs:6,college:"Kentucky",draft:"2020 R1 P25",nat:"United States"},
"Kawhi Leonard":{pos:"F",ht:"6-6",wt:225,age:35,yrs:15,college:"San Diego State",draft:"2011 R1 P15",nat:"United States"},
"Trey Lyles":{pos:"SF",ht:"6-9",wt:234,age:30,yrs:10,college:"Kentucky",draft:"2015 R1 P12",nat:"Canada"},
"Jonas Aldoo":{pos:"C",ht:"6-11",wt:240,age:23,yrs:0,college:"Arkansas",draft:"2025 R1 P22",nat:"United States"},
};

// ── PLAYER CARD MODAL ─────────────────────────────────────────────────────────
let openPlayerCardName = null; // track for BDL refresh

// ── USER PROFILE ─────────────────────────────────────────────────────────────
function teamLabel(m){ return m ? (m.team_name || m.display_name || '') : ''; }

// Wrap a name so tapping it opens that manager's User Profile.
// stopPropagation: many rows (e.g. matchup cards) have their own click handlers.
function userLink(mid, text){
  if(mid===undefined || mid===null) return text;
  return `<span class="user-link" onclick="event.stopPropagation();showUserProfile('${mid}')" style="cursor:pointer">${text}</span>`;
}

function fantasyStandings(runId){
  fillMatchupResults();
  const schedule = (leagueState.schedule||{})[runId] || [];
  return (leagueState.managers||[]).map(m=>{
    let wins=0, losses=0, ties=0;
    schedule.forEach(week=>week.forEach(mu=>{
      if(!mu.winner || (mu.home!==m.id && mu.away!==m.id)) return;
      if(mu.winner===m.id) wins++; else if(mu.winner==='tie') ties++; else losses++;
    }));
    return {id:m.id, wins, losses, ties, fp:managerFP(m.id)};
  }).sort((a,b)=> b.wins!==a.wins ? b.wins-a.wins : b.fp-a.fp);
}

// Every player relevant to a team this week, with the FP he's contributed to it.
// Same rules as managerFP: saved games count only if he was Active that day;
// live points count only while he's Active now. Sum of fp === managerFP(mid).
// Every player relevant to a team for a date range [from,to] (YYYYMMDD), with the
// FP he contributed: saved games count only if he was Active that day; live points
// count only for the current week while he's Active now. Sum of fp === team total.
function teamRowsForRange(mid, from, to, includeLive){
  const roster = ((leagueState.rosters||{})[mid]||[]).map(String);
  const active = ((leagueState.active||{})[mid] || autoActiveFor(mid)).map(String);
  const ir = String(getIrSlot(mid) ?? '');
  const fpBy = new Map(), seen = new Set();
  for(const e of Object.values(leagueState.playerStats||{})){
    const d = e.date ? String(e.date) : '';
    if(d.length!==8 || d<from || d>to) continue;
    const k=`${e.pid}_${d}`; if(seen.has(k)) continue; seen.add(k);
    if(!activeLineupOnDate(mid, d).map(String).includes(String(e.pid))) continue;
    fpBy.set(String(e.pid), (fpBy.get(String(e.pid))||0) + (e.fp||0));
  }
  const pids = new Set([...roster, ...fpBy.keys()]);
  const rows = [...pids].map(pid=>{
    const p = getPlayer(Number(pid)) || getPlayer(pid);
    if(!p) return null;
    let fp = fpBy.get(pid)||0, isLive = false;
    const live = livePlayerStats[p.id];
    if(includeLive && live && active.includes(pid) && !liveAlreadySaved(p.id, live)){ fp += live.fp||0; isLive = !!live.live; }
    const status = !roster.includes(pid) ? 'dropped' : pid===ir ? 'ir' : active.includes(pid) ? 'active' : 'bench';
    return {p, fp:+fp.toFixed(1), status, isLive};
  }).filter(Boolean);
  const order = {active:0, bench:1, ir:2, dropped:3};
  return rows.sort((a,b)=> order[a.status]-order[b.status] || b.fp-a.fp);
}
function teamWeekRows(mid){
  const ws = currentWeekStart(), we = new Date(ws); we.setDate(ws.getDate()+6);
  return teamRowsForRange(mid, ymd(ws), ymd(we), true);
}

function ordinal(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }

// ── WEEKLY RESULTS POP-UP ────────────────────────────────────────────────────
// The most recent finished matchup week across runs: {runId, idx, range} or null
function latestFinishedWeek(today){
  today = today || ymd(new Date());
  let best = null;
  for(const run of RUNS){
    const sched = (leagueState?.schedule||{})[run.id]||[];
    sched.forEach((week, idx)=>{
      const r = runWeekRange(run.id, idx);
      if(r.to < today && week.length) best = {runId:run.id, idx, range:r};
    });
  }
  return best;
}
function weekResultsData(runId, idx){
  fillMatchupResults();
  const week = ((leagueState.schedule||{})[runId]||[])[idx] || [];
  const r = runWeekRange(runId, idx);
  const mgr = id => (leagueState.managers||[]).find(m=>String(m.id)===String(id)) || {id, display_name:'?'};
  let team = null, player = null;
  for(const mu of week){
    for(const [id, fp] of [[mu.home, mu.homeFP||0],[mu.away, mu.awayFP||0]]){
      if(!team || fp > team.fp) team = {m:mgr(id), fp};
      const rows = teamRowsForRange(id, r.from, r.to, false);
      for(const row of rows) if(row.fp>0 && (!player || row.fp > player.fp)) player = {p:row.p, fp:row.fp, m:mgr(id)};
    }
  }
  return {week, r, team, player, mgr};
}
function showWeekResults(runId, idx, onClose){
  const run = RUNS.find(x=>x.id===runId);
  const {week, r, team, player, mgr} = weekResultsData(runId, idx);
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
  document.getElementById('week-results-modal')?.remove();
  const m = document.createElement('div');
  m.id = 'week-results-modal'; m.className = 'top-sheet-overlay';
  const port = pl => portraitUrl(pl.team, pl.name);
  const award = (title, color, art, name, sub, fp) => `<div class="wr-award" style="--ac:${color}">
      <div class="wr-award-title">${title}</div>
      <div class="wr-award-art">${art}</div>
      <div class="wr-award-name">${name}</div>
      <div class="wr-award-sub">${sub}</div>
      <div class="wr-award-fp">${fp.toFixed(1)}<span> FP</span></div>
    </div>`;
  m.innerHTML = `<div class="top-sheet">
    <div class="top-sheet-body" style="padding-top:16px">
      <div class="wr-head">
        <div class="wr-trophy">🏆</div>
        <div class="wr-title">WEEK ${idx+1} RESULTS</div>
        <div class="wr-sub">${(run?.name||'').toUpperCase()} RUN · ${fmt(r.mon)} – ${fmt(r.sun)}</div>
      </div>
      <div class="wr-awards">
        ${team ? award('TEAM OF THE WEEK', '#ffd93d', avatarEl(team.m.display_name, team.m.color||'#4a9eff', 72, 20, team.m.icon||null, team.m.photo||null), teamLabel(team.m), team.m.display_name, team.fp) : ''}
        ${player ? award('PLAYER OF THE WEEK', '#39ff6a', `<img src="${port(player.p)}" onerror="this.style.visibility='hidden'">`, player.p.name, teamLabel(player.m), player.fp) : ''}
      </div>
      <div class="section-label" style="padding:16px 0 6px">FINAL SCORES</div>
      <div class="card" style="padding:0;overflow:hidden;margin:0">
        ${week.map(mu=>{ const h=mgr(mu.home), a=mgr(mu.away); const hw=mu.winner===mu.home, aw=mu.winner===mu.away;
          return `<div class="wr-row" onclick="showMatchupDetail('${mu.home}','${mu.away}',${runId},${idx})">
            <span class="wr-team${hw?' w':''}">${teamLabel(h)}</span>
            <span class="wr-score${hw?' w':''}">${(mu.homeFP||0).toFixed(1)}</span>
            <span class="wr-dash">–</span>
            <span class="wr-score${aw?' w':''}">${(mu.awayFP||0).toFixed(1)}</span>
            <span class="wr-team r${aw?' w':''}">${teamLabel(a)}</span>
          </div>`; }).join('')}
      </div>
      <div style="font-family:var(--pixel);font-size:4.5px;color:var(--text3);margin-top:8px;text-align:center">TAP A MATCH-UP FOR ITS BOX SCORE</div>
    </div>
    <div class="top-sheet-actions"><button class="btn btn-primary btn-full" id="wr-continue">CONTINUE ▶</button></div>
  </div>`;
  document.body.appendChild(m);
  document.getElementById('wr-continue').onclick = () => { m.remove(); onClose && onClose(); };
}
// Show the newest finished week's results once per manager
let _weekResultsShowing = false;
async function maybeShowWeekResults(){
  const mid = getMyId(); if(!mid || _weekResultsShowing || !leagueState) return;
  const w = latestFinishedWeek(); if(!w) return;
  const key = `${w.runId}-${w.idx}`;
  if(((leagueState.resultsSeen||{})[mid]) === key) return;
  _weekResultsShowing = true;
  showWeekResults(w.runId, w.idx, async ()=>{
    _weekResultsShowing = false;
    if(!leagueState.resultsSeen) leagueState.resultsSeen = {};
    leagueState.resultsSeen[mid] = key;
    await saveLeagueState();
  });
}

// Season FP for a run: finished weeks' recorded totals + this week so far
function seasonFP(mid, runId){
  fillMatchupResults();
  let t=0;
  for(const week of ((leagueState.schedule||{})[runId]||[])) for(const mu of week){
    if(mu.winner===undefined) continue;
    if(String(mu.home)===String(mid)) t+=mu.homeFP||0; else if(String(mu.away)===String(mid)) t+=mu.awayFP||0;
  }
  const cur=getCurrentWeekIndex(runId), wkCount=((leagueState.schedule||{})[runId]||[]).length;
  if(cur>=0 && cur<wkCount) t+=managerFP(mid);
  return +t.toFixed(1);
}

function showUserProfile(mid, tab='profile'){
  const m = (leagueState.managers||[]).find(x=>String(x.id)===String(mid));
  if(!m) return;
  document.getElementById('user-profile-modal')?.remove();

  const st = fantasyStandings(currentRun);
  const idx = st.findIndex(x=>String(x.id)===String(m.id));
  const me = st[idx] || {wins:0, losses:0, ties:0, fp:managerFP(m.id)};
  const record = `${me.wins}-${me.losses}${me.ties?'-'+me.ties:''}`;
  const run = RUNS.find(r=>r.id===currentRun);
  const wlc = (leagueState.wlc?.standings||{})[m.id] || {wins:0,totalFP:0};
  const ds = (leagueState.duelStreaks||{})[m.id] || (leagueState.duelStreaks||{})[String(m.id)] || {};
  const longest = ds.longest || ds.streak || 0;
  const curStreak = liveDuelStreak(ds);
  // Current Weekly Challenge FP: only visible once picks are locked (or for yourself)
  const wk = wlcWeekKey(), wweek = wlcVisibleWeek(wk);
  const isMe = String(m.id)===String(getMyId());
  const wl = ((leagueState.wlc?.lineups||{})[wk]||{})[m.id];
  const wlcCur = !wweek ? 'No active week' : !wl ? 'No lineup' : (!isMe && !isWlcLocked(wk)) ? 'Hidden until lock' : computeWlcFP(wl.picks, wl.swaps, wk).toFixed(1)+' FP';
  const days = n => `${n} day${n===1?'':'s'}`;

  const tabBtn = (id, label) => `<button onclick="showUserProfile('${m.id}','${id}')" style="flex:1;padding:8px 0;font-family:var(--pixel);font-size:5.5px;border:none;cursor:pointer;border-bottom:2px solid ${tab===id?'var(--accent1)':'transparent'};background:transparent;color:${tab===id?'var(--accent1)':'var(--text3)'}">${label}</button>`;
  const statusTag = {
    active:'<span style="color:var(--accent2)">ACTIVE</span>',
    bench:'<span style="color:var(--accent4)">BENCH</span>',
    ir:'<span style="color:#805ad5">IR</span>',
    dropped:'<span style="color:var(--text3)">DROPPED</span>',
  };
  const section = (title, rows) => `
    <div class="section-label" style="padding:14px 0 6px">${title}</div>
    <div class="card" style="padding:0;overflow:hidden;margin:0">
      ${rows.map(([l,v],i)=>`<div class="settings-row" style="padding:10px 14px;${i===rows.length-1?'border-bottom:none':''}"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}
    </div>`;

  const profileTabHtml = () => `
    ${section('FANTASY STANDINGS', [
      ['Record', record],
      ['Standing', idx>=0 ? `${ordinal(idx+1)} of ${st.length}${run?' · '+run.name+' Run':''}` : '—'],
      ['This Week FP', me.fp.toFixed(1)+' FP'],
      ['Season FP', seasonFP(m.id, currentRun).toFixed(1)+' FP'],
    ])}
    ${section('WEEKLY CHALLENGE STATS', [
      ['Current Challenge FP', wlcCur],
      ['Total Wins', `${wlc.wins||0} win${wlc.wins===1?'':'s'}`],
      ['Total FP', (wlc.totalFP||0).toFixed(1)+' FP'],
    ])}
    ${section('DAILY DUEL STATS', [
      ['Current Streak', days(curStreak)],
      ['Longest Streak', days(longest)],
    ])}`;

  const rosterTabHtml = () => {
    const rows = teamWeekRows(m.id);
    return `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 10px;border-bottom:2px solid var(--border);margin-bottom:2px">
      <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">WEEK OF ${getWeekLabel().toUpperCase()}</span>
      <span style="font-family:var(--pixel);font-size:10px;color:var(--accent2)">${managerFP(m.id).toFixed(1)}<span style="font-size:5px;color:var(--text3)"> FP TOTAL</span></span>
    </div>
    ${rows.length ? rows.map(r=>`
    <div onclick="showPlayerCard(${JSON.stringify(r.p.name).replace(/"/g,'&quot;')})" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
      <div style="min-width:0">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--text1)">${r.p.name}${injuryBadgeHtml(r.p.name)}</div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">${r.p.pos} · ${r.p.team} · ${statusTag[r.status]}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
        ${r.isLive?'<span class="live-badge" style="font-size:4px;padding:1px 4px">LIVE</span>':''}
        <span style="font-family:var(--pixel);font-size:8px;color:${r.fp>0?'var(--accent3)':'var(--text3)'};min-width:44px;text-align:right">${r.fp.toFixed(1)}<span style="font-size:5px;color:var(--text3)"> FP</span></span>
      </div>
    </div>`).join('') : '<div style="text-align:center;padding:24px 0;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO ROSTER YET</div>'}
    <div style="font-family:var(--pixel);font-size:4.5px;color:var(--text3);line-height:1.8;margin-top:10px">FP shown is what each player has earned for this team this week while Active.</div>`;
  };

  const modal = document.createElement('div');
  modal.id = 'user-profile-modal';
  modal.className = 'top-sheet-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `
  <div class="top-sheet">
    <div style="position:relative;background:var(--bg3);margin:12px 16px 0;border-radius:12px;padding:20px 0 14px;display:flex;flex-direction:column;align-items:center;gap:10px;flex-shrink:0">
      ${avatarEl(m.display_name, m.color||'#4a9eff', 120, 32, m.icon||null, m.photo||null)}
      <div style="text-align:center">
        <div style="font-family:var(--pixel);font-size:9px;color:var(--text1)">${m.team_name||m.display_name}</div>
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-top:5px">${m.display_name}</div>
      </div>
      <button onclick="document.getElementById('user-profile-modal').remove()" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);border-radius:50%;width:28px;height:28px;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;border-bottom:1px solid var(--border);margin:8px 16px 0;flex-shrink:0">
      ${tabBtn('profile','USER PROFILE')}
      ${tabBtn('roster','FANTASY ROSTER')}
    </div>
    <div class="top-sheet-body">
      ${tab==='roster' ? rosterTabHtml() : profileTabHtml()}
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// ── THIS WEEK'S NBA SCHEDULE (BDL /games, Mon–Sun) ──────────────────────────
// WEEK_GAMES: {YYYYMMDD: [{home, away, time}]} — used for upcoming-game rows.
let WEEK_GAMES = {};
let _weekGamesFor = null;
async function loadWeekGames(){
  const ws = currentWeekStart(), key = ymd(ws);
  if(_weekGamesFor === key && Object.keys(WEEK_GAMES).length) return;
  const dates = [...Array(7)].map((_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  try{
    const rows = await bdlFetchAll('/games', {'dates[]': dates});
    const map = {};
    for(const g of rows||[]){
      const dk = String(g.date||'').slice(0,10).replace(/-/g,'');
      const iso = g.datetime || (/^\d{4}-\d{2}-\d{2}T/.test(g.status||'') ? g.status : null);
      const time = iso ? new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) : '';
      (map[dk] ||= []).push({home:g.home_team?.abbreviation, away:g.visitor_team?.abbreviation, time});
    }
    WEEK_GAMES = map; _weekGamesFor = key;
  }catch(e){ console.warn('[loadWeekGames]', e); }
}
// This week's games for an NBA team: [{date, opp, isHome, time}]
function teamWeekGames(team){
  const out=[];
  for(const [d,games] of Object.entries(WEEK_GAMES)){
    for(const g of games){
      if(g.home===team) out.push({date:d, opp:g.away, isHome:true, time:g.time});
      else if(g.away===team) out.push({date:d, opp:g.home, isHome:false, time:g.time});
    }
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}

// Which fantasy team rosters a player (incl. IR), or null
function rosterOwnerOf(pid){
  if(pid==null) return null;
  return (leagueState.managers||[]).find(m=>
    ((leagueState.rosters||{})[m.id]||[]).map(String).includes(String(pid)) ||
    String((leagueState.ir||{})[m.id]??'')===String(pid)) || null;
}

// opts.actions: [{label, js, kind:'primary'|'danger'|'secondary'}] → button bar
// at the bottom (used by the Weekly Challenge Add/Drop prompt). Kept across tab switches.
let playerCardOpts = {};
function showPlayerCard(playerName, initialTab, opts) {
  if(opts !== undefined) playerCardOpts = {name:playerName, ...opts};
  else if(playerCardOpts.name !== playerName) playerCardOpts = {};
  const actions = playerCardOpts.actions || [];
  openPlayerCardName = playerName;
  document.getElementById('player-card-modal')?.remove();

  // PLAYERS is BDL-driven (current-season teams/positions). Use it as primary source.
  const pArr  = PLAYERS.find(pl=>pl.name===playerName) || PLAYERS.find(pl=>normName(pl.name)===normName(playerName));
  const pDb   = PLAYERS_DB.find(pl=>pl.n===playerName) || PLAYERS_DB.find(pl=>normName(pl.n)===normName(playerName));
  const pLeague = (leagueState.players||[]).find(pl=>pl.name===playerName);
  const p = pArr || pDb || pLeague;
  const info = PLAYER_INFO[playerName] || PLAYER_INFO[pArr?.name] || {};
  const fpVal = BDL_STATS[playerName]?.fpPG ?? pDb?.fpPG ?? (p ? estimateFpPG(p) : null);
  const teamAbbr = pArr?.team || pDb?.t || pLeague?.team || '';
  const teamFull = NBA_TEAMS[teamAbbr] || teamAbbr;
  const portraitName = pArr?.name || playerName;
  const portrait = teamAbbr
    ? portraitUrl(teamAbbr, portraitName)
    : (playerPortraits[portraitName] || '');
  const pid = p?.id ?? p?.pid;
  const owner = rosterOwnerOf(pid);
  const ownerLine = owner ? `${owner.team_name||owner.display_name} (${owner.display_name})` : 'Unrostered';

  // Saved games, one per date; today's live line if not saved yet
  const byDate = {};
  if(pid!=null) for(const st of Object.values(leagueState.playerStats||{})){
    if(String(st.pid)===String(pid) && !byDate[String(st.date)]) byDate[String(st.date)] = st;
  }
  const todayKey2 = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,'');
  const liveStat = pid!=null ? livePlayerStats[pid] : null;
  if(liveStat && (liveStat.live || String(liveStat.dateStr)===todayKey2) && !byDate[todayKey2] && !liveAlreadySaved(pid, liveStat)){
    byDate[todayKey2] = {...liveStat, date:todayKey2, _live:!!liveStat.live};
  }
  // This matchup week (Mon–Sun): played games + placeholders for the rest
  const wsKey = ymd(currentWeekStart());
  const sched = teamWeekGames(teamAbbr);
  const weekRows = sched.map(g=>({...(byDate[g.date]||{}), date:g.date, _sched:g, _pending:!byDate[g.date]}));
  for(const d of Object.keys(byDate)) if(d>=wsKey && !sched.some(g=>g.date===d)) weekRows.push({...byDate[d]});
  weekRows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const earlier = Object.values(byDate).filter(g=>String(g.date)<wsKey).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const hasGames = weekRows.length + earlier.length > 0;
  const activeTab = initialTab || (hasGames ? 'stats' : 'profile');

  const profileRow = (label, val) => val ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
    <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">${label}</span>
    <span style="font-family:var(--pixel);font-size:7px;color:var(--text1)">${val}</span>
  </div>` : '';

  const fmtD = d => statDateObj(d).toLocaleDateString('en-US',{month:'short',day:'2-digit'}).toUpperCase();
  const td = (v, color) => `<td style="padding:6px 1px;text-align:center;color:${color||'var(--text1)'}">${v}</td>`;
  const gameRow = (g, i) => {
    const pending = g._pending && !g._live;
    const past = String(g.date) < todayKey2;
    const sub = g._sched ? `<div style="font-size:4.5px;color:var(--text3);margin-top:2px">${g._sched.isHome?'vs':'@'} ${g._sched.opp}${pending&&!past&&g._sched.time?' · '+g._sched.time:''}</div>` : '';
    const dateCell = `<td style="padding:6px 2px;color:${g._live?'#f6ad55':'var(--text2)'};white-space:nowrap">${fmtD(g.date)}${g._live?' (LIVE)':''}${sub}</td>`;
    if(pending){
      const label = past ? 'DNP' : '—';
      return `<tr style="background:${i%2===0?'transparent':'rgba(255,255,255,0.02)'};opacity:.6">${dateCell}${[...Array(10)].map(()=>td(label,'var(--text3)')).join('')}<td style="padding:6px 4px;text-align:right;color:var(--text3)">${label}</td></tr>`;
    }
    const neg = 'var(--accent4)';
    return `<tr style="background:${g._live?'rgba(246,173,85,0.08)':i%2===0?'transparent':'rgba(255,255,255,0.02)'}">${dateCell}
      ${td(g.pts??'—')}${td(g.reb??'—')}${td(g.ast??'—')}${td(g.stl??'—')}${td(g.blk??'—')}
      ${td((g.fga!=null&&g.fgm!=null)?g.fga-g.fgm:'—',neg)}${td((g.fta!=null&&g.ftm!=null)?g.fta-g.ftm:'—',neg)}${td(g.to??'—',neg)}${td(g.flagrant??0,neg)}${td(g.technical??0,neg)}
      <td style="padding:6px 4px;text-align:right;color:var(--accent3);font-size:7px">${typeof g.fp==='number'?g.fp.toFixed(1):'—'}</td></tr>`;
  };
  const th = (t, title) => `<th style="padding:6px 1px;color:var(--text3);font-weight:normal"${title?` title="${title}"`:''}>${t}</th>`;
  const sectionRow = t => `<tr><td colspan="12" style="padding:8px 4px 4px;color:var(--accent1);font-size:5px;letter-spacing:.08em">${t}</td></tr>`;
  const statsTabHtml = hasGames ? `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <table style="width:100%;border-collapse:collapse;font-family:var(--pixel);font-size:5px">
        <thead><tr style="background:var(--bg3)">
          <th style="text-align:left;padding:6px 2px;color:var(--text3);font-weight:normal;white-space:nowrap">DATE</th>
          ${th('PTS')}${th('REB')}${th('AST')}${th('STL')}${th('BLK')}${th('MFG','Missed field goals')}${th('MFT','Missed free throws')}${th('TO')}${th('FLG','Flagrant fouls')}${th('TECH','Technical fouls')}
          <th style="padding:6px 4px;color:var(--accent3);font-weight:normal">FP</th>
        </tr></thead>
        <tbody>
          ${weekRows.length ? sectionRow(`<span style="color:#ffd93d">CURRENT MATCH-UP</span> <span style="color:#fff">WEEK · ${getWeekLabel().toUpperCase()}</span>`) + weekRows.map(gameRow).join('') : ''}
          ${earlier.length ? sectionRow('EARLIER') + earlier.map(gameRow).join('') : ''}
        </tbody>
      </table>
    </div>` : `<div style="text-align:center;padding:24px 0 8px;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO GAMES PLAYED YET</div>`;

  const profileTabHtml = `
    ${fpVal ? `<div style="text-align:center;padding:12px 0 8px">
      <div style="font-family:var(--pixel);font-size:22px;color:var(--accent3)">${typeof fpVal==='number'?fpVal.toFixed(1):fpVal}</div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">ACTUAL FP/GAME</div>
    </div>` : ''}
    ${profileRow('Fantasy Team', ownerLine)}
    ${profileRow('Height', info.ht)}
    ${profileRow('Weight', info.wt ? info.wt + ' lbs' : null)}
    ${profileRow('Age', info.age)}
    ${profileRow('NBA Experience', info.yrs !== undefined && info.yrs !== null ? info.yrs + (info.yrs===1?' year':' years') : null)}
    ${profileRow('College / Pre-Draft', info.college)}
    ${profileRow('Draft', info.draft)}
    ${profileRow('Nationality', info.nat)}`;

  const modal = document.createElement('div');
  modal.id = 'player-card-modal';
  modal.className = 'top-sheet-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };

  const jsName = playerName.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const tabBtn = (id, label) => `<button id="pcard-tab-${id}" onclick="showPlayerCard('${jsName}','${id}')" style="flex:1;padding:8px 0;font-family:var(--pixel);font-size:5.5px;border:none;cursor:pointer;border-bottom:2px solid ${activeTab===id?'var(--accent1)':'transparent'};background:transparent;color:${activeTab===id?'var(--accent1)':'var(--text3)'}">${label}</button>`;
  const initials2 = (playerName||'?').split(' ').map(w=>w[0]).join('').slice(0,2);
  const btnStyle = k => k==='primary' ? 'background:var(--accent2);color:#000;border:1px solid var(--accent2)'
    : k==='danger' ? 'background:rgba(255,217,61,0.15);color:#ffd93d;border:1px solid #ffd93d'
    : 'background:var(--bg3);color:var(--text2);border:1px solid var(--border)';

  modal.innerHTML = `
  <div class="top-sheet">
    <div class="player-card-portrait">
      <div style="position:absolute;inset:0;pointer-events:none;z-index:2;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.18) 2px,rgba(0,0,0,.18) 4px);mix-blend-mode:multiply"></div>
      ${portrait
        ? `<img src="${portrait}" onerror="this.nextElementSibling.style.display='flex';this.remove()"><div class="card-initials" style="display:none">${initials2}</div>`
        : `<div class="card-initials" style="display:flex">${initials2}</div>`}
      <div style="position:absolute;bottom:0;left:0;right:0;z-index:3;padding:10px 14px;background:linear-gradient(transparent,rgba(0,0,0,.88))">
        <div style="font-family:var(--pixel);font-size:9px;color:#fff">${playerName}${injuryBadgeHtml(pArr?.name||playerName)}</div>
        <div style="font-family:var(--pixel);font-size:6px;color:rgba(255,255,255,.75);margin-top:4px">${info.pos||pArr?.pos||''} · ${teamFull}${teamAbbr?' ('+teamAbbr+')':''}</div>
        <div style="font-family:var(--pixel);font-size:6px;color:${owner?'#ffd93d':'rgba(255,255,255,.55)'};margin-top:4px">${ownerLine}</div>
      </div>
      <button onclick="document.getElementById('player-card-modal').remove()" style="position:absolute;top:10px;right:10px;z-index:4;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);border-radius:50%;width:28px;height:28px;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;border-bottom:1px solid var(--border);margin:8px 16px 0;flex-shrink:0">
      ${tabBtn('stats','PLAYER STATISTICS')}
      ${tabBtn('profile','PLAYER PROFILE')}
    </div>
    <div class="top-sheet-body">
      ${activeTab==='stats' ? statsTabHtml : profileTabHtml}
    </div>
    ${actions.length ? `<div class="top-sheet-actions">
      ${actions.map(a=>`<button class="btn" style="flex:1;font-size:7px;${btnStyle(a.kind)}" onclick="${a.js}">${a.label}</button>`).join('')}
    </div>` : ''}
  </div>`;

  const origRemove = modal.remove.bind(modal);
  modal.remove = ()=>{ if(openPlayerCardName===playerName) openPlayerCardName=null; origRemove(); };
  document.body.appendChild(modal);
}

// ── ESPN TEAM ID MAP ─────────────────────────────────────────────────────────
const ESPN_TO_ABBR = {
  ATL:'ATL',BOS:'BOS',BKN:'BKN',BRK:'BKN',CHA:'CHA',CHI:'CHI',CLE:'CLE',
  DAL:'DAL',DEN:'DEN',DET:'DET',GS:'GSW',GSW:'GSW',HOU:'HOU',IND:'IND',
  LAC:'LAC',LAL:'LAL',MEM:'MEM',MIA:'MIA',MIL:'MIL',MIN:'MIN',NO:'NOP',
  NOP:'NOP',NY:'NYK',NYK:'NYK',OKC:'OKC',ORL:'ORL',PHI:'PHI',PHX:'PHX',
  PHX:'PHX',POR:'POR',SAC:'SAC',SA:'SAS',SAS:'SAS',TOR:'TOR',UTA:'UTA',
  UTAH:'UTA',WAS:'WAS',WSH:'WAS',
};
function espnToAbbr(s){ return ESPN_TO_ABBR[s] || s; }

// ── FP SCORING ───────────────────────────────────────────────────────────────
// ESPN standard: pts + reb + ast + stl + blk - missed FG - missed FT - TO - flagrant - technical
function calcFP(stats){
  const {pts=0,reb=0,ast=0,stl=0,blk=0,fgm=0,fga=0,ftm=0,fta=0,to=0,flagrant=0,technical=0} = stats;
  return pts + reb + ast + stl + blk - (fga-fgm) - (fta-ftm) - to - flagrant - technical;
}

// Estimate projected FP/G from a PLAYERS entry using league-average efficiency assumptions.
// Used for players not in PLAYERS_DB (no BDL history — e.g. rookies, low-usage vets).
// Assumes: ~38% FG miss rate on attempts (~pts/2.5 * 0.38), ~18% FT miss rate, ~1.5 TO/15pts
function estimateFpPG(p){
  const pts=p.ppg||0, reb=p.rpg||0, ast=p.apg||0, stl=p.spg||0, blk=p.bpg||0;
  const estFGA = pts / 2.5;           // ~2.5 pts per FGA at league avg efficiency
  const missedFG = estFGA * 0.38;     // ~38% of attempts missed
  const estFTA = pts * 0.25;          // FTAs roughly 25% of points
  const missedFT = estFTA * 0.18;     // ~82% FT% league average
  const estTO = pts * 0.10;           // roughly 1 TO per 10 pts
  const fp = pts + reb + ast + stl + blk - missedFG - missedFT - estTO;
  return Math.round(fp * 10) / 10;
}

// Get the best available projected FP/G for a player (PLAYERS entry).
// Priority: BDL live season averages (BDL_STATS) → PLAYERS_DB curated fpPG → estimated from stats
function getPlayerProjFP(player){
  if(BDL_STATS[player.name]?.fpPG) return BDL_STATS[player.name].fpPG;
  const db = PLAYERS_DB.find(x => x.n === player.name);
  if(db?.fpPG) return db.fpPG;
  return estimateFpPG(player);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function getPlayer(id){ return PLAYERS.find(p=>p.id===id); }
function getPlayerByName(name){ return PLAYERS.find(p=>p.name.toLowerCase()===name.toLowerCase()); }
function initials(n){ return n.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fmtFP(v){ return v===0 ? '0' : (v>0?'+':'')+v.toFixed(1).replace('.0',''); }
// Parse a YYYY-MM-DD date string as local (not UTC) to avoid off-by-one in US timezones
function parseLocalDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function fmtRunDate(s){ return parseLocalDate(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function todayStr(){ return new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,''); } // ET date, YYYYMMDD
// ── MATCHUP WEEKS: Monday–Sunday ─────────────────────────────────────────────
// One definition used everywhere: FP totals, the schedule, records, profiles.
function mondayOf(d){
  const x=new Date(d); x.setHours(0,0,0,0);
  const dow=x.getDay(); x.setDate(x.getDate()-(dow===0?6:dow-1));
  return x;
}
function ymd(d){ return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }
function runStartDate(run){ const [y,m,d]=run.start.split('-').map(Number); return new Date(y,m-1,d,12); }
function runEndDate(run){ const [y,m,d]=run.end.split('-').map(Number); return new Date(y,m-1,d,23,59,59); }
// Week idx of a run (0 = the week containing the run's first day)
function runWeekRange(runId, idx){
  const run=RUNS.find(r=>r.id===runId);
  const mon=mondayOf(runStartDate(run)); mon.setDate(mon.getDate()+idx*7);
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return {mon, sun, from:ymd(mon), to:ymd(sun)};
}
function runWeekCount(runId){
  const run=RUNS.find(r=>r.id===runId);
  return Math.round((mondayOf(runEndDate(run))-mondayOf(runStartDate(run)))/(7*864e5))+1;
}
function currentWeekStart(){ return mondayOf(new Date()); }

// A team's FP over a date range from saved stats (only games he was Active for)
function teamFPForDates(mid, from, to, byDate){
  let total=0;
  for(const [d, entries] of Object.entries(byDate)){
    if(d<from || d>to) continue;
    const act=activeLineupOnDate(mid, d).map(String);
    for(const e of entries) if(act.includes(String(e.pid))) total+=e.fp||0;
  }
  return +total.toFixed(1);
}
// Fill homeFP/awayFP/winner on every finished matchup week. Recomputed from saved
// stats each time, so late stat corrections and lineup fixes flow into records.
function fillMatchupResults(){
  const byDate={}, seen=new Set();
  for(const e of Object.values(leagueState?.playerStats||{})){
    const k=`${e.pid}_${e.date}`; if(seen.has(k)) continue; seen.add(k);
    (byDate[String(e.date)] ||= []).push(e);
  }
  const today=ymd(new Date());
  for(const run of RUNS){
    const sched=(leagueState?.schedule||{})[run.id]||[];
    sched.forEach((week,idx)=>{
      const r=runWeekRange(run.id, idx);
      if(r.to >= today) return; // week not over yet
      for(const mu of week){
        mu.homeFP=teamFPForDates(mu.home, r.from, r.to, byDate);
        mu.awayFP=teamFPForDates(mu.away, r.from, r.to, byDate);
        mu.winner = mu.homeFP>mu.awayFP ? mu.home : mu.awayFP>mu.homeFP ? mu.away : 'tie';
      }
    });
  }
}
function avatarColor(idx){ return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }
// onclick attribute value that opens a player's card (safe for names with ' or ")
function pcardOnclick(name){ return 'showPlayerCard('+JSON.stringify(String(name)).replace(/"/g,'&quot;')+')'; }

// Avatar that opens that manager's User Profile when tapped
function userAvatar(m, size=22, fontSize=7){
  return userLink(m.id, avatarEl(m.display_name, m.color||'#4a9eff', size, fontSize, m.icon||null, m.photo||null));
}
function avatarEl(name,color,size=22,fontSize=7,icon=null,photo=null){
  if(photo){
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color} url(${photo}) center/cover;flex-shrink:0"></div>`;
  }
  const inner=icon
    ? `<span style="font-size:${Math.round(size*0.54)}px;line-height:1">${icon}</span>`
    : `<span style="font-family:var(--pixel);font-size:${fontSize}px;color:#000">${initials(name)}</span>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${inner}</div>`;
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
// Enforce one saved stat line per player per date. Extra lines for the same
// game (e.g. saved under two different game IDs) would double his FP.
// Keeps the line with the most detail (foul counts merged in), else the first.
function dedupePlayerStats(){
  const ps = leagueState?.playerStats; if(!ps) return;
  const keep = {};
  const removed = [];
  for(const k of Object.keys(ps).sort()){
    const v = ps[k]; const id = `${v.pid}_${v.date}`;
    const cur = keep[id];
    if(!cur){ keep[id] = k; continue; }
    const score = x => (x.flagrant!=null?1:0) + (x.technical!=null?1:0) + (x.fga!=null?1:0);
    if(score(v) > score(ps[cur])){ removed.push(cur); keep[id] = k; } else removed.push(k);
  }
  for(const k of removed){ console.warn('[dedupePlayerStats] removing duplicate', k, ps[k]?.name, ps[k]?.fp); delete ps[k]; }
}

// ── SAFE SAVING ──────────────────────────────────────────────────────────────
// The whole league lives in one JSON blob. Every open copy of the app holds its
// own copy, so a plain "write my copy" save would overwrite everything other
// people changed since this copy loaded (e.g. undo a lineup swap made hours ago).
// Instead, every save is a 3-way merge:
//   base   = the blob as this copy last loaded/saved it
//   local  = this copy now (base + my changes)
//   remote = the blob in the database right now (base + everyone else's changes)
// Keys only I changed take my value; keys only others changed take theirs; if both
// changed the same key, mine wins. Arrays (e.g. an active lineup) are one value.
let _leagueBaseJson = null;
let _leagueStateQueue = Promise.resolve(); // serializes saves and pulls

function _isPlainObj(x){ return x!==null && typeof x==='object' && !Array.isArray(x); }
function _jsonEq(a,b){ return a===b || JSON.stringify(a)===JSON.stringify(b); }
function merge3(base, local, remote){
  if(_jsonEq(local, base)) return remote;   // I didn't touch it
  if(_jsonEq(remote, base)) return local;   // nobody else touched it
  if(_isPlainObj(local) && _isPlainObj(remote)){
    const b = _isPlainObj(base) ? base : {};
    const out = {};
    for(const k of new Set([...Object.keys(b), ...Object.keys(local), ...Object.keys(remote)])){
      const v = merge3(b[k], local[k], remote[k]);
      if(v !== undefined) out[k] = v;       // undefined = deleted
    }
    return out;
  }
  return local;                             // both changed the same value: mine wins
}
function _replaceLeagueState(next){
  if(!leagueState){ leagueState = next; return; }
  for(const k of Object.keys(leagueState)) if(!(k in next)) delete leagueState[k];
  Object.assign(leagueState, next);
}
async function fetchRemoteLeagueState(){
  const {data, error} = await db.from('leagues').select('state').eq('id',LEAGUE_KEY).maybeSingle();
  if(error || !data?.state) return null;
  try{ return typeof data.state==='string' ? JSON.parse(data.state) : data.state; }catch(e){ return null; }
}

// Bring in everyone else's saved changes without losing my unsaved ones.
function pullLeagueState(){
  _leagueStateQueue = _leagueStateQueue.then(async ()=>{
    if(!leagueState || !_leagueBaseJson) return;
    const startJson = JSON.stringify(leagueState);
    const remote = await fetchRemoteLeagueState();
    if(!remote) return;
    const merged = merge3(JSON.parse(_leagueBaseJson), JSON.parse(startJson), remote);
    // Keep anything changed locally while the fetch was in flight
    _replaceLeagueState(merge3(JSON.parse(startJson), leagueState, merged));
    _leagueBaseJson = JSON.stringify(remote);
  }).catch(e=>console.warn('[pullLeagueState]', e));
  return _leagueStateQueue;
}

async function loadLeagueState(){
  await _leagueStateQueue; // let any in-flight save finish first
  const remote = await fetchRemoteLeagueState();
  if(remote) leagueState = remote;
  if(!leagueState){ leagueState = defaultLeagueState(); }
  _leagueBaseJson = JSON.stringify(leagueState);
  dedupePlayerStats();
  // Always sync live manager profiles so names/colors are never stale
  await syncManagersToState();
}

async function syncManagersToState(){
  // Preserve photos from leagueState (they're stored in the leagues JSON blob, not in the managers table)
  const prevPhotoMap={};
  (leagueState.managers||[]).forEach(m=>{ if(m.photo) prevPhotoMap[m.id]=m.photo; });
  const {data, error} = await db.from('managers').select('id,user_id,display_name,color,icon,team_name,is_commissioner').order('created_at');
  if(error) console.error('[syncManagers] error:', error.message, error.code);
  if(data){
    console.log('[syncManagers] got', data.length, 'managers');
    // Merge photos back in from the JSON blob
    leagueState.managers = data.map(m=>prevPhotoMap[m.id]?{...m,photo:prevPhotoMap[m.id]}:m);
  } else console.warn('[syncManagers] data is null/undefined');
}

// Append to activeLog whenever a manager's active list differs from their last
// logged entry. Runs on every save, so no lineup-changing path can skip history.
function logActiveChanges(){
  if(!leagueState) return;
  if(!leagueState.activeLog) leagueState.activeLog = {};
  const now = new Date().toISOString();
  for(const [mid, act] of Object.entries(leagueState.active||{})){
    if(!Array.isArray(act)) continue;
    const log = leagueState.activeLog[mid] || (leagueState.activeLog[mid] = []);
    const last = log[log.length-1]?.active || null;
    const same = last && last.length===act.length && [...last].map(String).sort().join()===[...act].map(String).sort().join();
    if(!same) log.push({ts: now, active: [...act]});
  }
}

function saveLeagueState(){
  _leagueStateQueue = _leagueStateQueue.then(async ()=>{
    logActiveChanges();
    const startJson = JSON.stringify(leagueState);
    const remote = await fetchRemoteLeagueState();
    const toWrite = (remote && _leagueBaseJson)
      ? merge3(JSON.parse(_leagueBaseJson), JSON.parse(startJson), remote)
      : JSON.parse(startJson);
    const json = JSON.stringify(toWrite);
    const {error} = await db.from('leagues').upsert({id:LEAGUE_KEY, state:json});
    if(error){ console.warn('[saveLeagueState] failed', error); return; }
    // Adopt the merged result, keeping anything changed locally during the save
    _replaceLeagueState(merge3(JSON.parse(startJson), leagueState, toWrite));
    _leagueBaseJson = json;
  }).catch(e=>console.warn('[saveLeagueState]', e));
  return _leagueStateQueue;
}

// ── BALLDONTLIE INTEGRATION ──────────────────────────────────────────────────
const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_CACHE_KEY = 'bdl_players_cache_v4'; // bumped: added draftYear to PLAYERS runtime object
const BDL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function loadBdlKey(){
  try{
    const {data} = await db.from('config').select('value').eq('key','bdl_api_key').maybeSingle();
    if(data?.value) bdlKey = data.value;
  }catch(e){ console.warn('BDL key fetch failed',e); }
}

// Endpoints our BDL plan isn't authorized for (401/403). Once refused, we stop
// calling them for the rest of the session — callers fall back to ESPN.
const bdlDeniedPaths = new Set();

async function bdlFetch(path, params={}){
  if(!bdlKey) return null;
  if(bdlDeniedPaths.has(path)) return null;
  const url = new URL(`${BDL_BASE}${path}`);
  Object.entries(params).forEach(([k,v])=>{
    if(Array.isArray(v)) v.forEach(i=>url.searchParams.append(k,i));
    else url.searchParams.set(k,v);
  });
  const res = await fetch(url, { headers:{ Authorization: bdlKey } });
  if(res.status === 401 || res.status === 403){
    bdlDeniedPaths.add(path);
    console.info(`[BDL] ${path} not included in current plan — using ESPN instead`);
    return null;
  }
  if(!res.ok){ console.warn('BDL error', res.status, path); return null; }
  return res.json();
}

async function bdlFetchAll(path, params={}){
  // Paginate through all results using cursor
  let cursor = 0;
  const all = [];
  while(true){
    const data = await bdlFetch(path, {...params, per_page:100, cursor});
    if(!data?.data?.length) break;
    all.push(...data.data);
    cursor = data.meta?.next_cursor;
    if(!cursor) break;
  }
  return all;
}

// Convert BDL position string to short abbr
function bdlPos(p){ return (p||'').split('-')[0].toUpperCase()||'F'; }

// Convert BDL team abbreviation to our app abbr (they mostly match)
function bdlTeam(t){ return t?.abbreviation || ''; }

// Build a full name from BDL player object
function bdlName(p){ return `${p.first_name} ${p.last_name}`; }

// Load active players from BDL; cache in localStorage for 24h
async function loadBdlPlayers(){
  if(!bdlKey) return;

  // Check cache
  try{
    const cached = JSON.parse(localStorage.getItem(BDL_CACHE_KEY)||'null');
    if(cached && (Date.now()-cached.ts) < BDL_CACHE_TTL){
      applyBdlPlayers(cached.players);
      loadBdlSeasonAverages(); // chain season stats load
      return;
    }
  }catch(e){}

  // Fetch fresh
  const raw = await bdlFetchAll('/players/active');
  if(!raw?.length) return;

  const players = raw.map(p=>({
    bdlId: p.id,
    name: bdlName(p),
    pos: bdlPos(p.position),
    team: bdlTeam(p.team),
    ht: p.height||'',
    wt: p.weight ? parseInt(p.weight) : null,
    college: p.college||'',
    country: p.country||'United States',
    draftYear: p.draft_year||null,
    draftRound: p.draft_round||null,
    draftNumber: p.draft_number||null,
    yearsExp: p.years_experience ?? null, // 0 = true rookie this season
  }));

  try{
    localStorage.setItem(BDL_CACHE_KEY, JSON.stringify({ts:Date.now(), players}));
  }catch(e){}

  applyBdlPlayers(players);
  // Season averages need the player ID map — safe to kick off now that cache is written
  loadBdlSeasonAverages();
}

// Normalize a name for fuzzy matching: lowercase, remove punctuation, collapse spaces
function normName(n){ return String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.\-']/g,'').replace(/\s+/g,' ').trim(); }

// Returns a short display name for a player — last name, stripping name suffixes (Jr., Sr., II, III, IV)
// e.g. "Michael Porter Jr." → "PORTER", "Jaren Jackson Jr." → "JACKSON"
const NAME_SUFFIXES = new Set(['jr','sr','ii','iii','iv','v']);
function playerShortName(fullName){
  const parts = (fullName||'').trim().split(/\s+/);
  // Strip trailing suffixes
  while(parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length-1].replace(/\./g,'').toLowerCase())){
    parts.pop();
  }
  return (parts[parts.length-1]||fullName).toUpperCase();
}

function applyBdlPlayers(bdlPlayers){
  // BDL is the single source of truth for the active player pool.
  // We rebuild PLAYERS from bdlPlayers, preserving existing numeric IDs where possible
  // so that leagueState.rosters (which store IDs) keep working.

  // Build lookup of current PLAYERS by name → id (to preserve roster-safe IDs)
  const existingIdByName = {};
  const existingIdByNorm = {};
  PLAYERS.forEach(p=>{
    existingIdByName[p.name] = p.id;
    existingIdByNorm[normName(p.name)] = p.id;
  });

  // Assign an ID: preserve old static ID if name matches, otherwise generate from bdlId
  let maxId = PLAYERS.reduce((m,p)=>Math.max(m,p.id||0),0);
  const bdlIdOffset = 900000; // keep BDL-sourced IDs out of static range

  const newPlayers = bdlPlayers.map(bdl=>{
    const existId = existingIdByName[bdl.name] ?? existingIdByNorm[normName(bdl.name)];
    const id = existId ?? (bdl.bdlId ? bdl.bdlId + bdlIdOffset : ++maxId);

    // Preserve existing ppg/rpg/apg/spg/bpg — these get updated by applyBdlSeasonAverages
    const existing = PLAYERS.find(p=>p.id===existId);

    // Update PLAYER_INFO while we're here
    const draft = bdl.draftYear
      ? `${bdl.draftYear} R${bdl.draftRound||'?'} P${bdl.draftNumber||'?'}`
      : 'Undrafted';
    PLAYER_INFO[bdl.name] = {
      pos: bdl.pos || existing?.pos || 'F',
      ht: bdl.ht || PLAYER_INFO[bdl.name]?.ht || '',
      wt: bdl.wt || PLAYER_INFO[bdl.name]?.wt || null,
      age: PLAYER_INFO[bdl.name]?.age || null,
      yrs: bdl.yearsExp ?? PLAYER_INFO[bdl.name]?.yrs ?? null, // BDL years_experience wins
      college: bdl.college || PLAYER_INFO[bdl.name]?.college || '',
      draft,
      nat: bdl.country || PLAYER_INFO[bdl.name]?.nat || 'United States',
    };

    return {
      id,
      bdlId: bdl.bdlId ?? existing?.bdlId ?? null,
      name: bdl.name,
      pos:  bdl.pos  || existing?.pos  || 'F',
      team: bdl.team || existing?.team || '',
      yearsExp: bdl.yearsExp ?? existing?.yearsExp ?? null,
      draftYear: bdl.draftYear ?? existing?.draftYear ?? null,
      // stats preserved from existing PLAYERS entry; will be updated by season averages
      ppg: existing?.ppg ?? 0,
      rpg: existing?.rpg ?? 0,
      apg: existing?.apg ?? 0,
      spg: existing?.spg ?? 0,
      bpg: existing?.bpg ?? 0,
    };
  });

  // Replace the PLAYERS array in-place (splice preserves references held by other code)
  PLAYERS.splice(0, PLAYERS.length, ...newPlayers);

  console.log(`BDL: rebuilt PLAYERS pool with ${PLAYERS.length} active players`);
  // Re-render draft/waiver lists now that yearsExp (rookie flag) is populated
  if(document.getElementById('draft-player-list')) renderDraftPlayerList();
  if(document.getElementById('waiver-player-list')) renderWaiverPlayerList();

  // If a player card is open, refresh it with updated data
  if(openPlayerCardName){
    const bdlEntry = bdlPlayers.find(p=>p.name===openPlayerCardName||normName(p.name)===normName(openPlayerCardName));
    if(bdlEntry) showPlayerCard(openPlayerCardName);
  }

  // Refresh portraits map with the updated team data
  loadPortraits();
}

// ── BDL SEASON AVERAGES → projected FP ───────────────────────────────────────
const BDL_AVG_CACHE_KEY = 'bdl_avgs_cache_v2'; // v2 adds 3PM/FTM for themed duels
const BDL_AVG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function loadBdlSeasonAverages(){
  if(!bdlKey) return;

  // Check cache first
  try{
    const cached = JSON.parse(localStorage.getItem(BDL_AVG_CACHE_KEY)||'null');
    if(cached && (Date.now()-cached.ts) < BDL_AVG_CACHE_TTL){
      applyBdlSeasonAverages(cached.averages);
      return;
    }
  }catch(e){}

  // Collect BDL player IDs for all players we have in PLAYERS
  // We need the BDL id — get it from PLAYER_INFO if applyBdlPlayers already ran,
  // or match by name against the cached players list.
  let bdlIdMap = {}; // bdlId → PLAYERS name
  try{
    const pc = JSON.parse(localStorage.getItem(BDL_CACHE_KEY)||'null');
    if(pc && pc.players){
      const byName = {}, byNorm = {};
      pc.players.forEach(p=>{ byName[p.name]=p; byNorm[normName(p.name)]=p; });
      PLAYERS.forEach(p=>{
        const bdl = byName[p.name] || byNorm[normName(p.name)];
        if(bdl) bdlIdMap[bdl.bdlId ?? bdl.id] = p.name;  // cache uses bdlId field
      });
    }
  }catch(e){}

  if(Object.keys(bdlIdMap).length === 0){
    console.warn('BDL season avgs: no player IDs available yet, skipping');
    return;
  }

  // Fetch season averages — BDL supports up to 100 player_ids[] per request
  const ids = Object.keys(bdlIdMap);
  const CHUNK = 100;
  const averages = {};
  try{
    for(let i=0; i<ids.length; i+=CHUNK){
      const chunk = ids.slice(i, i+CHUNK);
      const params = { season: 2025, per_page: 100 };
      chunk.forEach(id => { params['player_ids[]'] = params['player_ids[]'] ? [...params['player_ids[]'], id] : [id]; });
      const res = await bdlFetch('/season_averages', params);
      if(!res?.data) continue;
      for(const avg of res.data){
        const playerName = bdlIdMap[String(avg.player_id)];
        if(!playerName) continue;
        // Run through league calcFP formula
        const fp = calcFP({
          pts: avg.pts||0,
          reb: avg.reb||0,
          ast: avg.ast||0,
          stl: avg.stl||0,
          blk: avg.blk||0,
          fgm: avg.fgm||0,
          fga: avg.fga||0,
          ftm: avg.ftm||0,
          fta: avg.fta||0,
          to:  avg.turnover||0,
          flagrant: 0,
          technical: 0
        });
        averages[playerName] = {
          fpPG: Math.round(fp * 10) / 10,   // 1 decimal place
          gp:   avg.games_played||0,
          // raw per-game stats so PLAYERS entries stay current
          pts:  avg.pts||0,
          reb:  avg.reb||0,
          ast:  avg.ast||0,
          stl:  avg.stl||0,
          blk:  avg.blk||0,
          fg3m: avg.fg3m||0,
          ftm:  avg.ftm||0,
        };
      }
    }
  }catch(e){
    console.warn('BDL season averages fetch failed:', e);
    return;
  }

  // Cache result
  try{
    localStorage.setItem(BDL_AVG_CACHE_KEY, JSON.stringify({ts: Date.now(), averages}));
  }catch(e){}

  applyBdlSeasonAverages(averages);
}

let _bdlAvgsResolve; const bdlAvgsReady = new Promise(r=>_bdlAvgsResolve=r); // themed duels (3PM/FTM) wait on this
function applyBdlSeasonAverages(averages){
  // Populate BDL_STATS — the single source of truth for live FP projections.
  // Also update ppg/rpg/apg/spg/bpg on PLAYERS entries so duel subtitles and
  // estimateFpPG() work off real numbers.
  let updated = 0;
  for(const [name, avg] of Object.entries(averages)){
    if(avg.gp < 3) continue;  // only trust averages with meaningful sample size
    BDL_STATS[name] = avg;

    // Update the PLAYERS entry's raw stats so all per-game displays are current
    const p = PLAYERS.find(x=>x.name===name);
    if(p){
      p.ppg = avg.pts  ?? p.ppg;
      p.rpg = avg.reb  ?? p.rpg;
      p.apg = avg.ast  ?? p.apg;
      p.spg = avg.stl  ?? p.spg;
      p.bpg = avg.blk  ?? p.bpg;
      if(avg.fg3m!=null) p.tpg = avg.fg3m;
      if(avg.ftm!=null)  p.ftpg = avg.ftm;
    }
    updated++;
  }
  _bdlAvgsResolve?.();
  console.log(`BDL season avgs: loaded FP projections for ${updated} players (total pool: ${PLAYERS.length})`);
  // Re-render Draft page if it's open so sorting reflects new data
  if(document.getElementById('draft-screen')?.classList.contains('active')){
    renderFantasyDraftPane();
  }
}

// ── BDL INJURY STATUS ────────────────────────────────────────────────────────
// Fetches current injury report from BDL /player_injuries endpoint.
// Populates module-level BDL_INJURIES: { playerName → {status, description} }
// Status values from BDL: "Out", "Day-To-Day", "Questionable", etc.
// Cached in localStorage for 1 hour (injury status changes throughout the day).
const BDL_INJURY_CACHE_KEY = 'bdl-injuries-2027-v2'; // bumped to force fresh fetch
let bdlInjuriesReady = null; // promise for the first injury load (Duel generation waits on it)
const BDL_INJURY_CACHE_TTL = 15 * 60 * 1000; // 15 min — game-day OUT calls come late

async function loadBdlInjuries(){
  if(!bdlKey) return;
  // Check cache
  try{
    const cached = JSON.parse(localStorage.getItem(BDL_INJURY_CACHE_KEY)||'null');
    if(cached && (Date.now()-cached.ts) < BDL_INJURY_CACHE_TTL){
      applyBdlInjuries(cached.injuries);
      return;
    }
  }catch(e){}
  try{
    const raw = await bdlFetchAll('/player_injuries');
    if(!raw?.length) return;
    const injuries = {};
    for(const item of raw){
      const name = item.player ? bdlName(item.player) : null;
      if(!name) continue;
      injuries[name] = {
        status: item.status || 'Out',
        description: item.return_date ? `Est. return ${item.return_date}` : (item.description||''),
      };
    }
    try{ localStorage.setItem(BDL_INJURY_CACHE_KEY, JSON.stringify({ts:Date.now(), injuries})); }catch(e){}
    applyBdlInjuries(injuries);
  }catch(e){ console.warn('[loadBdlInjuries] failed:', e); }
}

function applyBdlInjuries(injuries){
  // Write into module-level BDL_INJURIES (no leagueState dependency — fires before auth)
  Object.keys(BDL_INJURIES).forEach(k => delete BDL_INJURIES[k]);
  Object.assign(BDL_INJURIES, injuries);
  // Re-render any open screens that show injury badges
  if(document.getElementById('draft-player-list')) renderDraftPlayerList();
  if(document.getElementById('waiver-player-list')) renderWaiverPlayerList();
  if(document.getElementById('rosters-content')) renderRostersScreen();
  renderLineupPreview();
  renderMyRosterList();
  renderNewsBanner();
  maybeSwapInjuredDuel();
}

// Returns injury info for a player name, or null
function getInjuryStatus(playerName){
  return BDL_INJURIES[playerName] || null;
}

// Single source of truth for interpreting a BDL injury status.
// BDL statuses seen: "Out", "Doubtful", "Questionable", "Probable", "Day-To-Day".
function injuryInfo(playerName){
  const inj = getInjuryStatus(playerName);
  if(!inj) return null;
  const s = (inj.status||'').toLowerCase();
  if(/^available/.test(s)) return null; // "Available" = cleared to play, not an injury
  let label, color;
  if(s.includes('out'))            { label='OUT';  color='#e53e3e'; }
  else if(s.includes('doubt'))     { label='DOUBT';color='#dd6b20'; }
  else if(s.includes('question'))  { label='Q';    color='#d69e2e'; }
  else if(s.includes('probable'))  { label='PROB'; color='#38a169'; }
  else if(s.includes('day'))       { label='DTD';  color='#d69e2e'; }
  else                             { label=(inj.status||'INJ').toUpperCase().slice(0,5); color='#d69e2e'; }
  return { label, color, isOut: label==='OUT', title: (inj.description||inj.status||'').replace(/"/g,"'") };
}

// Daily Duel eligibility: anyone on the injury report is excluded unless Probable
// (OUT, Doubtful, Questionable and Day-To-Day players might not play).
function isDuelInjuryRisk(playerName){
  const i = injuryInfo(playerName);
  return !!i && i.label !== 'PROB';
}

// Small colored badge for player rows. Empty string if healthy.
function injuryBadgeHtml(playerName){
  const i = injuryInfo(playerName);
  if(!i) return '';
  return `<span title="${i.title}" style="background:${i.color};color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px;cursor:help">${i.label}</span>`;
}

async function loadPortraits(){
  // Build portrait URLs from Supabase Storage.
  // URL pattern: /player-portraits/{TEAM}/{Player Name}.jpeg
  // PLAYERS is now BDL-driven so team abbreviations are current-season accurate.
  // Images that don't exist in Storage 404 silently (img onerror falls back to initials).
  playerPortraits = {};
  for(const p of PLAYERS){
    if(!p.team) continue;
    playerPortraits[p.name] = portraitUrl(p.team, p.name);
  }
}

// savePortraits() removed — portraits now served directly from Supabase Storage URLs

async function loadManagerProfile(){
  if(!currentUser) return;
  const {data}=await db.from('managers').select('*').eq('user_id',currentUser.id).maybeSingle();
  myProfile=data||null;
  // Restore avatar from localStorage cache in case Supabase photo is missing
  if(myProfile){
    try{
      const cached=JSON.parse(localStorage.getItem(`avatar-${myProfile.id}`)||'null');
      if(cached){
        if(cached.photo && !myProfile.photo) myProfile.photo=cached.photo;
        if(cached.icon && !myProfile.icon) myProfile.icon=cached.icon;
        if(cached.color) myProfile.color=cached.color;
      }
    }catch(e){}
  }
  // If no profile row yet and auto-seeded from invite signup, create one
  if(!myProfile){
    const name=currentUser.user_metadata?.display_name||currentUser.email.split('@')[0];
    const color=avatarColor(Math.floor(Math.random()*10));
    const {data:newRow}=await db.from('managers').insert({
      user_id:currentUser.id, email:currentUser.email,
      display_name:name, color, team_name:randomTeamName(),
      is_commissioner:currentUser.email===COMMISSIONER_EMAIL
    }).select().single();
    myProfile=newRow||null;
  }
}

const DEFAULT_TEAM_NAMES=[
  'Ankle Breakers','Rim Runners','Bucket Getters','Court Jesters',
  'Alley-Oop Squad','Fast Break FC','Triple Threat','Buzzer Beaters',
  'Paint Dominators','Dunk Dynasty','Full Court Press','Steal & Deal',
  'The Bricklayers','Pick & Roll Posse','Swish Factory'
];
function randomTeamName(){
  return DEFAULT_TEAM_NAMES[Math.floor(Math.random()*DEFAULT_TEAM_NAMES.length)];
}

function defaultLeagueState(){
  return {
    season:'2026-27',
    currentRun:1,
    rosters:{},         // {managerId: [pid,...]}
    active:{},          // {managerId: [pid,...]}  — 8 active players
    inactive:{},        // {managerId: [pid,...]}  — 2 inactive
    playerStats:{},     // {key: {pid,date,gameId,fp,...}}
    activeSnapshots:{}, // {dateStr: {managerId: [pids]}} — daily snapshot of active lineups when stats saved
    activeLog:{},       // {managerId: [{ts:ISO, active:[pids]}]} — append-only log of every lineup change
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
function getIrSlot(mid){ return (leagueState.ir||{})[mid] || null; } // single player id or null
function effectiveRosterSize(mid){ return ROSTER_SIZE + (getIrSlot(mid) ? 1 : 0); } // 11 if IR occupied
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

// Rule: at most ONE saved stat line per player per date, whichever source
// (BDL or ESPN) saved it first. Game IDs differ between sources, so we key on pid+date.
function savedPidDateSet(){
  const set = new Set();
  for(const v of Object.values(leagueState.playerStats||{})) set.add(`${v.pid}_${v.date}`);
  return set;
}

// Is this live/finished game line already counted in saved stats?
function liveAlreadySaved(pid, live){
  return Object.values(leagueState.playerStats||{}).some(s =>
    String(s.pid)===String(pid) &&
    ((s.gameId && String(s.gameId)===String(live.gameId)) || (live.dateStr && String(s.date)===String(live.dateStr))));
}

function playerTotalFP(pid){
  const saved = playerSavedFP(pid);
  const live  = livePlayerStats[pid];
  if(live && !liveAlreadySaved(pid, live)) return +(saved + (live.fp||0)).toFixed(1);
  return +saved.toFixed(1);
}

function rosterFP(pids){
  return pids.reduce((s,pid)=>s+playerTotalFP(pid),0);
}

// Snapshot the active lineup for every manager on a given dateStr (YYYYMMDD).
// Called once per date the first time stats for that date are saved.
function snapshotActiveLineups(dateStr){
  if(!leagueState.activeSnapshots) leagueState.activeSnapshots = {};
  if(leagueState.activeSnapshots[dateStr]) return; // already snapshotted
  const snap = {};
  for(const m of (leagueState.managers||[])){
    const mid = m.id;
    snap[mid] = [...((leagueState.active||{})[mid] || autoActiveFor(mid))];
  }
  leagueState.activeSnapshots[dateStr] = snap;
}

// Return the active lineup for a manager at a given game date (YYYYMMDD).
// Uses activeLog (most accurate), falls back to activeSnapshots, then
// falls back to current active/inactive (for pre-log data).
function activeLineupOnDate(mid, dateStr){
  // Commissioner-confirmed lineup for this date always wins (used to repair history)
  const ov = (leagueState.lineupOverrides||{})[dateStr]?.[mid];
  if(ov) return ov;
  // Try the append-only log first — find last entry on or before game date
  const log = (leagueState.activeLog||{})[mid];
  if(log && log.length > 0){
    // Game is considered to count at start of that calendar day (midnight ET)
    // Log entries have ISO timestamps; compare to end of the game date
    const gameDateEnd = new Date(
      parseInt(dateStr.slice(0,4)),
      parseInt(dateStr.slice(4,6))-1,
      parseInt(dateStr.slice(6,8)),
      23, 59, 59
    );
    // Walk backwards to find latest log entry before or on game date
    for(let i = log.length-1; i >= 0; i--){
      if(new Date(log[i].ts) <= gameDateEnd) return log[i].active;
    }
    // All log entries are after game date — lineup hadn't been touched yet,
    // so use the very first log entry as the "original" lineup
    return log[0].active;
  }
  // Fall back to snapshot if available
  const snap = (leagueState.activeSnapshots||{})[dateStr]?.[mid];
  if(snap) return snap;
  // Last resort: use current active/inactive. This is only accurate if the
  // manager never changed their lineup — acceptable for the first week only.
  return (leagueState.active||{})[mid] || autoActiveFor(mid);
}

// Total FP a manager has earned this week, correctly accounting for lineup changes.
// A player earns FP only if they were ACTIVE on the day their game was played.
function managerFP(mid){
  const weekStart = currentWeekStart();
  const today = todayKey().replace(/-/g,''); // YYYYMMDD
  const stats = leagueState.playerStats || {};
  const currentActive = (leagueState.active||{})[mid] || autoActiveFor(mid);

  let total = 0;
  // Sum saved stats from this week
  for(const entry of Object.values(stats)){
    const entryDate = entry.date ? String(entry.date) : null;
    if(!entryDate || entryDate.length !== 8) continue;
    const y = parseInt(entryDate.slice(0,4)), mo = parseInt(entryDate.slice(4,6))-1, dy = parseInt(entryDate.slice(6,8));
    const entryDateObj = new Date(y, mo, dy);
    if(entryDateObj < weekStart) continue; // before this week
    // Get the lineup that was active on the day this player's game was played
    const activeThatDay = activeLineupOnDate(mid, entryDate);
    const pid = entry.pid;
    if(!activeThatDay.includes(pid) && !activeThatDay.map(Number).includes(pid)) continue;
    total += entry.fp || 0;
  }

  // Add live stats for players active right now (today, game in progress, not yet saved)
  for(const pid of currentActive){
    const live = livePlayerStats[pid];
    if(!live) continue;
    if(!liveAlreadySaved(pid, live)) total += live.fp || 0;
  }

  return +total.toFixed(1);
}

// Auto-select top 8 by season FP if user hasn't set lineup (excludes IR player)
function autoActiveFor(mid){
  const roster=(leagueState.rosters||{})[mid]||[];
  const irPid=getIrSlot(mid);
  return [...roster].filter(p=>p!==irPid).sort((a,b)=>playerTotalFP(b)-playerTotalFP(a)).slice(0,ACTIVE_SIZE);
}

// ── LIVE STATS (BallDontLie primary, ESPN fallback) ──────────────────────────
const NBA_SEASON_START = new Date('2026-10-20');
const NBA_SEASON_END   = new Date('2027-07-01');

// Match a BDL player name + team to our PLAYERS array
function matchBdlPlayer(firstName, lastName, teamAbbr){
  const full = `${firstName} ${lastName}`.toLowerCase();
  const last = lastName.toLowerCase();
  return PLAYERS.find(p=>p.name.toLowerCase()===full) ||
    PLAYERS.find(p=>p.team===teamAbbr && p.name.toLowerCase()===full) ||
    PLAYERS.find(p=>p.team===teamAbbr && p.name.split(' ').pop().toLowerCase()===last &&
      PLAYERS.filter(x=>x.team===teamAbbr&&x.name.split(' ').pop().toLowerCase()===last).length===1);
}

// Parse BDL /stats rows (one row per player per game) for FINAL games only.
// Returns { [pid]: {fp, pts, reb, ..., gameId, dateStr} }. Matches by BDL player ID.
function parseBdlStatRows(rows){
  const byBdlId = {};
  for(const p of PLAYERS) if(p.bdlId) byBdlId[p.bdlId] = p;
  const stats = {};
  for(const r of rows){
    if(r.game?.status !== 'Final') continue;
    const min = String(r.min ?? '');
    if(!min || /^0+(:0+)?$/.test(min)) continue; // DNP
    const bp = r.player || {};
    const matched = byBdlId[bp.id] || matchBdlPlayer(bp.first_name||'', bp.last_name||'', r.team?.abbreviation||'');
    if(!matched) continue;
    const pts=r.pts||0, reb=r.reb||0, ast=r.ast||0, stl=r.stl||0, blk=r.blk||0;
    const to=r.turnover||0, fgm=r.fgm||0, fga=r.fga||0, ftm=r.ftm||0, fta=r.fta||0;
    const tpm=r.fg3m||0, tpa=r.fg3a||0, flagrant=0, technical=0;
    const fp = calcFP({pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,flagrant,technical});
    stats[matched.id] = {fp,pts,reb,ast,stl,blk,to,tpm,tpa,fgm,fga,ftm,fta,flagrant,technical,
      name: matched.name, gameId: String(r.game.id), dateStr: String(r.game.date||'').split('T')[0].replace(/-/g,''), source:'bdl'};
  }
  return stats;
}

// ESPN fallback box score fetch (unchanged logic)
async function fetchBoxScoreESPN(eventId){
  const res=await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`);
  const data=await res.json();
  const box=data?.boxscore;
  if(!box) return {};
  const stats={};
  const espnIdToPid={}; // ESPN athlete id → our pid, for play-by-play foul attribution
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
        const flagrant=0, technical=0;
        const fp=calcFP({pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,flagrant,technical});
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
        if(matched){
          stats[matched.id]={fp,pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,flagrant,technical,tpm,tpa,name:matched.name};
          if(a?.athlete?.id) espnIdToPid[String(a.athlete.id)]=matched.id;
        }
      }
    }
  }
  // Box scores don't include flagrant/technical fouls — count them from play-by-play
  const fouls = countFoulsFromPlays(data?.plays||[], espnIdToPid);
  for(const [pid,f] of Object.entries(fouls)){
    if(!stats[pid]) continue;
    stats[pid].flagrant = f.flagrant;
    stats[pid].technical = f.technical;
    stats[pid].fp = calcFP(stats[pid]);
  }
  return stats;
}

// Count player flagrant and technical fouls from ESPN play-by-play.
// Excludes free-throw plays ("Free Throw - Flagrant 1 of 2") and team/admin
// technicals (defensive 3 seconds, delay of game, excess timeout, too many players).
// The player committing the foul is the first participant; a double technical
// charges every participant.
function countFoulsFromPlays(plays, espnIdToPid){
  const out={};
  for(const play of plays){
    const t=((play?.type?.text||'')+' | '+(play?.text||'')).toLowerCase();
    if(t.includes('free throw')) continue;
    const isFlagrant = t.includes('flagrant');
    const isTech = !isFlagrant && t.includes('technical') &&
      !/defensive 3|3[- ]?sec|delay|excess timeout|too many players|team technical/.test(t);
    if(!isFlagrant && !isTech) continue;
    const parts = (play.participants||[]).map(x=>String(x?.athlete?.id||'')).filter(Boolean);
    const charged = (isTech && t.includes('double')) ? parts : parts.slice(0,1);
    for(const id of charged){
      const pid = espnIdToPid[id];
      if(!pid) continue;
      if(!out[pid]) out[pid]={flagrant:0, technical:0};
      if(isFlagrant) out[pid].flagrant++; else out[pid].technical++;
    }
  }
  return out;
}

let _lastBdlStatsFetch = 0;
async function refreshLiveStats(){
  await pullLeagueState(); // see other managers' changes; keeps mine
  maybeShowWeekResults();
  const now=new Date();
  if(now<NBA_SEASON_START || now>NBA_SEASON_END) return;

  // ── BDL /stats: authoritative FINAL stats, matched by player ID (All-Star plan) ──
  // Throttled to every 3 min; ESPN below handles live in-game scoring every poll.
  if(bdlKey && Date.now() - _lastBdlStatsFetch > 3*60*1000){
    _lastBdlStatsFetch = Date.now();
    try{
      const todayET = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
      const yesterdayET = new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'America/New_York'});
      const rows = await bdlFetchAll('/stats', {'dates[]':[yesterdayET, todayET]});
      const finals = parseBdlStatRows(rows||[]);
      if(Object.keys(finals).length){
        if(!leagueState.playerStats) leagueState.playerStats={};
        const have = savedPidDateSet();
        let changed=false;
        for(const [pid,stat] of Object.entries(finals)){
          if(have.has(`${pid}_${stat.dateStr}`)) continue; // already saved (by ESPN or earlier)
          snapshotActiveLineups(stat.dateStr); // lock in who was active this date
          leagueState.playerStats[`${pid}_${stat.dateStr}_${stat.gameId}`]={...stat,pid:parseInt(pid),date:stat.dateStr};
          have.add(`${pid}_${stat.dateStr}`);
          changed=true;
        }
        if(changed) await saveLeagueState();
      }
    }catch(e){ console.warn('BDL stats error:', e); }
  }
  const bdlHandledLive = false; // live scoring always comes from ESPN

  // ── ESPN: always fetch for live box scores if BDL didn't cover them ──
  // Also used as the sole source when bdlKey is absent.
  if(!bdlHandledLive){
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
        // ESPN pre-game false-live: period=0 or displayClock is ISO string → skip
        const period = event.competitions?.[0]?.status?.period || 0;
        const clock  = event.competitions?.[0]?.status?.displayClock || '';
        const clockIsIso = /^\d{4}-\d{2}-\d{2}T/.test(clock);
        const isLive=!st?.completed && st?.state==='in' && period > 0 && !clockIsIso;
        const isDone=st?.completed;
        if(!isLive && !isDone) continue;
        try{
          const gs=await fetchBoxScoreESPN(event.id);
          for(const [pid,stat] of Object.entries(gs)){
            if(!newLive[pid]) newLive[pid]={fp:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0,fgm:0,fga:0,ftm:0,fta:0,flagrant:0,technical:0,live:isLive,gameId:event.id,dateStr:event._dateStr};
            newLive[pid].fp  +=stat.fp;  newLive[pid].pts +=stat.pts; newLive[pid].reb +=stat.reb;
            newLive[pid].ast +=stat.ast; newLive[pid].stl +=stat.stl; newLive[pid].blk +=stat.blk;
            newLive[pid].to  +=stat.to;
            newLive[pid].fgm +=stat.fgm||0; newLive[pid].fga +=stat.fga||0;
            newLive[pid].ftm +=stat.ftm||0; newLive[pid].fta +=stat.fta||0;
            newLive[pid].flagrant +=stat.flagrant||0; newLive[pid].technical +=stat.technical||0;
            if(isLive) newLive[pid].live=true;
          }
          if(isLive) hasLive=true;
          // Finished games always go through the save step: new lines get saved, and lines
          // saved earlier (by BDL or ESPN) get ESPN's flagrant/technical counts merged in
          if(isDone) toSave.push({event,stats:gs,dateStr:event._dateStr});
        }catch(e){}
      }
      livePlayerStats=newLive;
      liveGamesActive=hasLive;

      if(toSave.length>0){
        if(!leagueState.playerStats) leagueState.playerStats={};
        let changed=false;
        const have = savedPidDateSet();
        const byPidDate = {};
        for(const v of Object.values(leagueState.playerStats)) byPidDate[`${v.pid}_${v.date}`] = v;
        for(const {event,stats,dateStr} of toSave){
          snapshotActiveLineups(dateStr); // lock in who was active this date
          for(const [pid,stat] of Object.entries(stats)){
            const key=pid+'_'+dateStr+'_'+event.id;
            if(have.has(`${pid}_${dateStr}`)){
              // Already saved (usually by BDL, which has no foul data): merge ESPN's fouls in
              const ex = byPidDate[`${pid}_${dateStr}`];
              if(ex && ((ex.flagrant||0)!==(stat.flagrant||0) || (ex.technical||0)!==(stat.technical||0))){
                ex.flagrant = stat.flagrant||0; ex.technical = stat.technical||0;
                ex.fp = calcFP(ex);
                changed = true;
              }
              continue;
            }
            if(!leagueState.playerStats[key]){
              have.add(`${pid}_${dateStr}`);
              leagueState.playerStats[key]={...stat,pid:parseInt(pid),date:dateStr,gameId:event.id};
              changed=true;
            }
          }
        }
        if(changed) await saveLeagueState();
      }
    }catch(e){ console.warn('refreshLiveStats ESPN error:',e); }
  }

  // ── Auto-settle any unsettled duels once final stats are in ──
  try {
    const todayK = todayKey();
    const yesterdayK = getPrevDateKey(todayK);
    for(const dk of [todayK, yesterdayK]){
      const d = (leagueState.duels||{})[dk];
      if(d && (d.result===null || d.result===undefined)){
        const settled = await autoSettleDuelFromStats(dk, false);
        if(settled) renderAdminContent(); // refresh admin panel if open
      }
    }
  } catch(e){ console.warn('Auto-settle duel error:', e); }

  // Adjust polling speed based on live game activity
  const targetInterval = liveGamesActive ? 30000 : 60000;
  if(livePolling && ((liveGamesActive && livePolling._interval!==30000) || (!liveGamesActive && livePolling._interval!==60000))){
    clearInterval(livePolling);
    livePolling = setInterval(refreshLiveStats, targetInterval);
    livePolling._interval = targetInterval;
  }
  render();
}

function startPolling(){
  refreshLiveStats();
  if(livePolling) clearInterval(livePolling);
  livePolling=setInterval(refreshLiveStats,60000);
  livePolling._interval=60000;
}

// ── ROSTER HELPERS ───────────────────────────────────────────────────────────
// Add/drops used in the current Mon–Sun match-up week, counted from the
// transaction log. Only ADDS count toward the weekly limit; drops are free.
function waiverUsedThisWeek(mid){
  const ws=currentWeekStart(), we=new Date(ws); we.setDate(ws.getDate()+6);
  const from=ymd(ws), to=ymd(we);
  return ((leagueState.waiverLog||{})[mid]||[]).filter(e=>e.type==='add' && String(e.date)>=from && String(e.date)<=to).length;
}

function canWaiver(mid){
  return waiverUsedThisWeek(mid) < WAIVER_WEEKLY;
}

// Full-screen list of every add and drop in the league, newest first
function showTransactionLog(){
  const rows=[];
  for(const [mid,log] of Object.entries(leagueState.waiverLog||{})){
    const m=(leagueState.managers||[]).find(x=>String(x.id)===String(mid));
    for(const e of log||[]) rows.push({...e, team: m?teamLabel(m):'?'});
  }
  rows.sort((a,b)=> String(b.ts||b.date).localeCompare(String(a.ts||a.date)) || String(b.date).localeCompare(String(a.date)));
  const fmt = e => e.ts ? new Date(e.ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})
                        : statDateObj(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  document.getElementById('txlog-modal')?.remove();
  const m=document.createElement('div');
  m.id='txlog-modal'; m.className='top-sheet-overlay';
  m.onclick=e=>{ if(e.target===m) m.remove(); };
  m.innerHTML=`<div class="top-sheet" style="max-height:none">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="font-family:var(--pixel);font-size:8px;color:var(--accent1)">TRANSACTION LOG</div>
      <button onclick="document.getElementById('txlog-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
    </div>
    <div class="top-sheet-body" style="padding-top:0">
      ${rows.length ? `<table style="width:100%;border-collapse:collapse;font-family:var(--pixel);font-size:5.5px">
        <thead><tr style="position:sticky;top:0;background:var(--bg2)">
          <th style="text-align:left;padding:8px 4px;color:var(--text3);font-weight:normal">DATE</th>
          <th style="text-align:left;padding:8px 4px;color:var(--text3);font-weight:normal">TEAM</th>
          <th style="text-align:left;padding:8px 4px;color:var(--text3);font-weight:normal">MOVE</th>
          <th style="text-align:left;padding:8px 4px;color:var(--text3);font-weight:normal">PLAYER</th>
        </tr></thead>
        <tbody>${rows.map((e,i)=>{ const p=getPlayer(e.pid); return `<tr style="background:${i%2?'rgba(255,255,255,0.02)':'transparent'}">
          <td style="padding:8px 4px;color:var(--text3);white-space:nowrap">${fmt(e)}</td>
          <td style="padding:8px 4px;color:var(--text1)">${e.team}</td>
          <td style="padding:8px 4px;color:${e.type==='add'?'var(--accent2)':'#ffd93d'}">${e.type==='add'?'ADDED':'DROPPED'}</td>
          <td style="padding:8px 4px;color:var(--text1);cursor:pointer" onclick="${p?pcardOnclick(p.name):''}">${p?p.name:'Player #'+e.pid}</td>
        </tr>`; }).join('')}</tbody></table>`
      : '<div style="padding:32px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO TRANSACTIONS YET</div>'}
    </div></div>`;
  document.body.appendChild(m);
}

async function addPlayer(mid, pid){
  if(!canWaiver(mid)){ toast('No add/drops remaining this week!'); return false; }
  const roster=(leagueState.rosters||{})[mid]||[];
  if(roster.includes(pid)){ toast('Already on roster'); return false; }
  if(roster.length>=effectiveRosterSize(mid)){ toast('Drop a player first (roster full)'); return false; }
  // Add
  if(!leagueState.rosters[mid]) leagueState.rosters[mid]=[];
  leagueState.rosters[mid].push(pid);
  // Log waiver
  const ws=currentWeekStart().getTime().toString();
  const key=mid+'_'+ws;
  leagueState.waiverWeekCount[key]=(leagueState.waiverWeekCount[key]||0)+1;
  if(!leagueState.waiverLog[mid]) leagueState.waiverLog[mid]=[];
  leagueState.waiverLog[mid].push({pid,date:todayStr(),type:'add',ts:new Date().toISOString()});
  await saveLeagueState();
  return true;
}

async function dropPlayer(mid, pid){
  // Drops don't use an add/drop, so they're allowed even with none left
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
  leagueState.waiverLog[mid].push({pid,date:todayStr(),type:'drop',ts:new Date().toISOString()});
  await saveLeagueState();
  return true;
}

// Toggle active/inactive
// A player is locked (can't be benched/activated) once his game has tipped off today.
function isPlayerLocked(p){
  const g = p && todayGamesCache[(p.team||'').toUpperCase()];
  return !!(g && (g.isLive || g.isFinal));
}

async function toggleActiveStatus(mid, pid){
  // Lock: prevents both losing earned FP and activating a player after a big night.
  const lp = getPlayer(pid);
  if(isPlayerLocked(lp)){
    toast(`🔒 ${lp.name}'s game has started — locked until tomorrow`);
    return;
  }
  const active=(leagueState.active||{})[mid]||autoActiveFor(mid);
  const inactive=(leagueState.inactive||{})[mid]||[];
  const isActive=active.includes(pid);
  const isInactive=inactive.includes(pid);

  if(isActive){
    // Move to bench — only restriction is keeping at least 1 active player
    if(active.length<=1){ toast('Need at least 1 active player'); return; }
    leagueState.active[mid]=active.filter(id=>id!==pid);
    leagueState.inactive[mid]=[...(leagueState.inactive[mid]||[]),pid];
  } else {
    // Move to active — can't exceed ACTIVE_SIZE
    if(active.length>=ACTIVE_SIZE){
      toast(`Active roster full (${ACTIVE_SIZE} max). Bench someone first.`);
      return;
    }
    leagueState.active[mid]=[...active,pid];
    leagueState.inactive[mid]=(leagueState.inactive[mid]||[]).filter(id=>id!==pid);
  }
  // Append to activeLog so we can reconstruct who was active at any point in time
  if(!leagueState.activeLog) leagueState.activeLog = {};
  if(!leagueState.activeLog[mid]) leagueState.activeLog[mid] = [];
  leagueState.activeLog[mid].push({ts: new Date().toISOString(), active: [...leagueState.active[mid]]});
  await saveLeagueState();
  renderRostersScreen();
  renderLineupPreview();
  renderHomeScreen();
  toast(isActive ? 'Moved to Bench' : 'Moved to Active');
}

// ── CURRENT RUN LOGIC ────────────────────────────────────────────────────────
function getCurrentRun(){
  const today=new Date();
  for(const run of RUNS){
    if(today>=runStartDate(run) && today<=runEndDate(run)) return run;
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
  else if(screen==='duel') renderDuelScreen();
  else if(screen==='profile') renderProfileScreen();
}

// ── HOME SCREEN ──────────────────────────────────────────────────────────────
// ── HOMEPAGE SCOREBOARD: 16-bit gym-style LED board, one game, dropdown ──────
let SB_EVENTS = [], sbEventId = null;
function setScoreboardEvents(evs){
  const seen=new Set(); evs=evs.filter(e=>!seen.has(e.id)&&seen.add(e.id));
  const order = ev => { const st=ev.competitions?.[0]?.status?.type?.state; return st==='in'?0:st==='pre'?1:2; };
  SB_EVENTS = [...evs].sort((a,b)=> order(a)-order(b) || String(a.date).localeCompare(String(b.date)));
  if(!SB_EVENTS.some(e=>e.id===sbEventId)) sbEventId = SB_EVENTS[0]?.id || null;
  renderScoreboard();
}
function selectScoreboardGame(id){ sbEventId = id; renderScoreboard(); }

// Seven-segment LED digit as inline SVG. Unlit segments stay faintly visible,
// like a real gym scoreboard. Supports 0-9, '-', ' ' (blank) and ':'.
const SEG_MAP = {'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','-':'g',' ':''};
const SEG_PTS = {
  a:'12,4 48,4 54,10 48,16 12,16 6,10',   b:'44,16 50,10 56,16 56,42 50,48 44,42',
  c:'44,58 50,52 56,58 56,84 50,90 44,84', d:'12,84 48,84 54,90 48,96 12,96 6,90',
  e:'4,58 10,52 16,58 16,84 10,90 4,84',   f:'4,16 10,10 16,16 16,42 10,48 4,42',
  g:'12,44 48,44 54,50 48,56 12,56 6,50' };
function ledText(str, color, h){
  return `<span class="led" style="--led:${color};height:${h}px">${[...String(str)].map(ch=>{
    if(ch===':') return `<svg viewBox="0 0 20 100" style="height:${h}px;width:${h*.2}px"><rect x="6" y="28" width="9" height="9" class="on"/><rect x="6" y="64" width="9" height="9" class="on"/></svg>`;
    const lit = SEG_MAP[ch] ?? '';
    return `<svg viewBox="0 0 60 100" style="height:${h}px;width:${h*.6}px">${Object.entries(SEG_PTS).map(([k,pts])=>`<polygon points="${pts}" class="${lit.includes(k)?'on':'off'}"/>`).join('')}</svg>`;
  }).join('')}</span>`;
}

// Score digits: a "1"-only hundreds digit (faint unless the score is 100+), like
// real gym boards, then two always-lit digits ("00" before tip-off).
function scoreLed(n, color, h){
  const v = Math.max(0, Math.floor(+n||0));
  const hund = `<svg viewBox="40 0 20 100" style="height:${h}px;width:${h*.2}px">${['b','c'].map(k=>`<polygon points="${SEG_PTS[k]}" class="${v>=100?'on':'off'}"/>`).join('')}</svg>`;
  const two = ledText(String(v%100).padStart(2,'0'), color, h);
  const cut = two.indexOf('>')+1;          // insert the hundreds digit inside the same LED span
  return two.slice(0,cut) + hund + two.slice(cut);
}

// Clock text for the LED: "12:00" before tip, "00:24" under a minute, " 3:12" otherwise
function boardClock(g){
  if(g.final) return '00:00';
  if(!g.live) return '12:00';
  if(g.half) return '00:00';
  const c = String(g.st.displayClock||'').trim();
  if(/^\d+(\.\d+)?$/.test(c)) return '00:' + String(Math.floor(+c)).padStart(2,'0'); // sub-minute: whole seconds
  const m = c.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}`.padStart(5,' ') : '00:00';
}

function scoreboardInfo(ev){
  const comp = ev.competitions?.[0]||{}, st = comp.status||ev.status||{};
  const cs = comp.competitors||[];
  const home = cs.find(c=>c.homeAway==='home')||cs[0]||{}, away = cs.find(c=>c.homeAway==='away')||cs[1]||{};
  const state = st.type?.state;
  const live = state==='in' && (st.period||0)>0 && !/^\d{4}-\d{2}-\d{2}T/.test(st.displayClock||'');
  const final = state==='post';
  const tip = new Date(comp.date||ev.date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});
  const per = st.period>4 ? 'OT' : String(st.period||'');
  const half = live && /half/i.test(st.type?.shortDetail||st.type?.detail||'');
  const ab = c => espnToAbbr((c?.team?.abbreviation||'').toUpperCase());
  return {comp, st, home, away, live, final, tip, per, half, homeAb:ab(home), awayAb:ab(away)};
}

// Highest-FP player tonight for an NBA team in this game (from live stats)
function topFantasyPlayer(eventId, team){
  let best=null;
  for(const [pid,st] of Object.entries(livePlayerStats||{})){
    if(String(st.gameId)!==String(eventId)) continue;
    const p = getPlayer(Number(pid)) || getPlayer(pid);
    if(!p || p.team!==team) continue;
    if(!best || (st.fp||0) > best.fp) best = {name:p.name, fp:st.fp||0};
  }
  return best;
}

function renderScoreboard(){
  const el = document.getElementById('scoreboard-container'); if(!el) return;
  const sel = document.getElementById('sb-select-wrap');
  if(!SB_EVENTS.length){
    if(sel) sel.innerHTML = `<span style="font-family:var(--pixel);font-size:6px;color:var(--text3)">🏀 NO NBA GAMES TODAY</span>`;
    el.innerHTML = '';
    return;
  }
  // Game picker: label always reads "Select NBA Scoreboard"
  if(sel) sel.innerHTML = `<select class="sb-select" aria-label="Select NBA Scoreboard" onchange="if(this.value){selectScoreboardGame(this.value);}this.value='';">
    <option value="" selected>VIEW TODAY'S NBA SCORES/SCHEDULE</option>
    ${SB_EVENTS.map(ev=>{ const g=scoreboardInfo(ev);
      const status = g.live ? (g.half?'HALFTIME':`${g.per==='OT'?'OT':'Q'+g.per} ${boardClock(g).trim()}`) : g.final ? 'FINAL' : g.tip;
      return `<option value="${ev.id}">${ev.id===sbEventId?'▶ ':''}${g.live?'🔴 ':''}${g.awayAb} @ ${g.homeAb} · ${status}</option>`; }).join('')}
  </select>`;

  const ev = SB_EVENTS.find(e=>e.id===sbEventId) || SB_EVENTS[0];
  const g = scoreboardInfo(ev);
  const RED = '#ff3b30', AMBER = '#ffb000';
  const statusTag = g.live ? (g.half ? '<span class="gym-tag">HALFTIME</span>' : '<span class="gym-tag live"><span class="live-dot"></span>LIVE</span>')
    : g.final ? '<span class="gym-tag final">FINAL</span>' : `<span class="gym-tag">TIP ${g.tip} ET</span>`;
  const marquee = team => {
    let txt;
    if(!g.live && !g.final) txt = '';  // pregame: blank (tip time is under the period)
    else { const t = topFantasyPlayer(ev.id, team);
      txt = t ? `${playerShortName(t.name)} ${(+t.fp).toFixed(0)} FP` : 'NO FP YET'; }
    const scroll = txt.length > 16;
    return `<div class="gym-marquee"><div class="gym-marquee-text${scroll?' scroll':''}">${txt}</div></div>`;
  };
  const homeWin = g.final && +g.home.score > +g.away.score, awayWin = g.final && +g.away.score > +g.home.score;
  const score = c => (g.live||g.final) ? +c.score||0 : 0;

  el.innerHTML = `
  <div class="gym" onclick="showNbaBoxScore('${ev.id}')" role="button" aria-label="Open box score">
    <div class="gym-row">
      <div class="gym-team">
        <div class="gym-label${awayWin?' win':''}">${g.awayAb}</div>
        <div class="gym-win">${scoreLed(score(g.away), RED, 46)}</div>
        ${marquee(g.awayAb)}
      </div>
      <div class="gym-center">
        <div class="gym-win clock${g.live&&!g.half?' ticking':''}">${ledText(boardClock(g), AMBER, 34)}</div>
        <div class="gym-label sm">PERIOD</div>
        <div class="gym-win small">${g.per==='OT' ? '<span class="gym-ot">OT</span>' : ledText((g.live||g.final)?g.per:' ', AMBER, 30)}</div>
        ${statusTag}
      </div>
      <div class="gym-team">
        <div class="gym-label${homeWin?' win':''}">${g.homeAb}</div>
        <div class="gym-win">${scoreLed(score(g.home), RED, 46)}</div>
        ${marquee(g.homeAb)}
      </div>
    </div>
    <div class="gym-hint">TAP FOR BOX SCORE</div>
  </div>`;
}

// Full ESPN box score for one NBA game, both teams, with FP per player
async function showNbaBoxScore(eventId){
  const ev = SB_EVENTS.find(e=>e.id===eventId); if(!ev) return;
  const g = scoreboardInfo(ev);
  document.getElementById('nba-box-modal')?.remove();
  const m = document.createElement('div');
  m.id='nba-box-modal'; m.className='top-sheet-overlay';
  m.onclick=e=>{ if(e.target===m) m.remove(); };
  const head = `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="font-family:var(--pixel);font-size:8px;color:var(--text1)">${g.awayAb} ${(g.live||g.final)?(+g.away.score||0):''} <span style="color:var(--text3)">@</span> ${g.homeAb} ${(g.live||g.final)?(+g.home.score||0):''}
        <div style="font-family:var(--pixel);font-size:5.5px;color:${g.live?'var(--accent4)':'var(--text3)'};margin-top:5px">${g.live?(g.half?'HALFTIME':`${g.per==='OT'?'OT':'Q'+g.per} · ${boardClock(g).trim()}`):g.final?'FINAL':'TIP-OFF '+g.tip+' ET'}</div></div>
      <button onclick="document.getElementById('nba-box-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
    </div>`;
  m.innerHTML = `<div class="top-sheet">${head}<div class="top-sheet-body" id="nba-box-body"><div style="padding:32px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">LOADING BOX SCORE…</div></div></div>`;
  document.body.appendChild(m);
  const body = document.getElementById('nba-box-body');
  if(!g.live && !g.final){ body.innerHTML = '<div style="padding:32px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">BOX SCORE AVAILABLE AT TIP-OFF</div>'; return; }
  try{
    const res = await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`);
    const data = await res.json();
    const teams = data?.boxscore?.players || [];
    if(!teams.length) throw new Error('no box');
    const num = v => parseInt(v)||0;
    const split = v => String(v||'0-0').split('-').map(num);
    body.innerHTML = teams.map(t=>{
      const abbr = espnToAbbr((t.team?.abbreviation||'').toUpperCase());
      const grp = (t.statistics||[])[0] || {};
      const L = (grp.labels||[]).map(x=>String(x).toUpperCase());
      const at = (row, lbl) => row[L.indexOf(lbl)];
      const rows = (grp.athletes||[]).map(a=>{
        const r = a.stats||[]; const name = a.athlete?.displayName||'';
        if(!r.length || /^DN[PD]/i.test(r[0]||'')) return {name, dnp:true, starter:a.starter};
        const [fgm,fga] = split(at(r,'FG')), [ftm,fta] = split(at(r,'FT'));
        const st = {pts:num(at(r,'PTS')), reb:num(at(r,'REB')), ast:num(at(r,'AST')), stl:num(at(r,'STL')), blk:num(at(r,'BLK')), to:num(at(r,'TO')), fgm,fga,ftm,fta};
        return {name, starter:a.starter, min:at(r,'MIN')||'', ...st, fp:calcFP(st)};
      });
      const tr = x => { const pl = PLAYERS.find(p=>normName(p.name)===normName(x.name));
        const nm = pl ? `<span onclick="${pcardOnclick(pl.name)}" style="cursor:pointer;color:${rosterOwnerOf(pl.id)?'#ffd93d':'var(--text1)'}">${x.name}</span>` : x.name;
        return x.dnp ? `<tr style="opacity:.5"><td style="padding:6px 2px">${nm}</td><td colspan="8" style="padding:6px 2px;color:var(--text3)">DNP</td></tr>`
          : `<tr><td style="padding:6px 2px;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis">${nm}</td><td>${x.min}</td><td>${x.pts}</td><td>${x.reb}</td><td>${x.ast}</td><td>${x.stl}</td><td>${x.blk}</td><td style="color:var(--accent4)">${x.to}</td><td style="color:var(--accent3)">${x.fp}</td></tr>`; };
      return `<div style="font-family:var(--pixel);font-size:7px;color:var(--accent1);margin:14px 0 6px">${abbr}</div>
        <table style="width:100%;border-collapse:collapse;font-family:var(--pixel);font-size:5px;text-align:center">
          <thead><tr style="background:var(--bg3);color:var(--text3)"><th style="text-align:left;padding:6px 2px;font-weight:normal">PLAYER</th><th style="font-weight:normal">MIN</th><th style="font-weight:normal">PTS</th><th style="font-weight:normal">REB</th><th style="font-weight:normal">AST</th><th style="font-weight:normal">STL</th><th style="font-weight:normal">BLK</th><th style="font-weight:normal">TO</th><th style="font-weight:normal;color:var(--accent3)">FP</th></tr></thead>
          <tbody>${rows.sort((a,b)=>(b.starter?1:0)-(a.starter?1:0)||(b.fp||-99)-(a.fp||-99)).map(tr).join('')}</tbody>
        </table>`;
    }).join('') + `<div style="font-family:var(--pixel);font-size:4.5px;color:var(--text3);margin-top:10px;line-height:1.8"><span style="color:#ffd93d">YELLOW</span> = ON A FANTASY ROSTER · TAP A NAME FOR HIS PLAYER CARD</div>`;
  }catch(e){
    body.innerHTML = '<div style="padding:32px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">BOX SCORE UNAVAILABLE RIGHT NOW</div>';
  }
}

// Faster refresh for the scoreboard while a game is live and Home is open
setInterval(async ()=>{
  if(currentScreen!=='home' || !SB_EVENTS.some(e=>e.competitions?.[0]?.status?.type?.state==='in')) return;
  try{
    const d = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d.replace(/-/g,'')}`);
    if(res.ok){ const data = await res.json(); if(data.events?.length) setScoreboardEvents(data.events); }
  }catch(e){}
}, 20000);

function renderHomeScreen(){
  renderScoreboard();
  renderNewsBanner();
  renderDuelCard();
  renderMatchupCard();
  renderLineupPreview();
  renderQuickStats();
}

// ── DUEL SCREEN ──────────────────────────────────────────────────────────────
function renderDuelScreen(){
  const el = document.getElementById('duel-screen-content');
  if(!el) return;

  const duel = getTodaysDuel();
  const managers = leagueState.managers || [];
  const streaks = leagueState.duelStreaks || {};
  const today = todayKey();
  const yesterday = getPrevDateKey(today);

  // Build leaderboard table
  const rows = managers.map(m=>{
    const s = streaks[m.id] || {streak:0, totalCorrect:0, lastDate:null};
    const live = liveDuelStreak(s);
    return {...m, streak:live, totalCorrect:s.totalCorrect||0};
  }).sort((a,b)=>b.streak!==a.streak?b.streak-a.streak:b.totalCorrect-a.totalCorrect);
  const myId = getMyId();

  const seasonLive = new Date() >= NBA_SEASON_START;
  const seasonNote = !seasonLive
    ? `<div style="background:rgba(74,158,255,.1);border:1px solid rgba(74,158,255,.3);border-radius:var(--radius);padding:8px 12px;margin:0 14px 12px;font-family:var(--pixel);font-size:5.5px;color:var(--accent1)">⚡ STREAKS & LEADERBOARD COUNT STARTING OCT 20 WHEN THE SEASON TIPS OFF</div>`
    : '';

  // Leaderboard
  const lbRows = rows.map((m,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);${m.id===myId?'background:rgba(0,212,170,.05);':''}">
      <span style="font-family:var(--pixel);font-size:8px;color:var(--text3);width:20px">${i+1}</span>
      ${userAvatar(m,28,8)}
      <div style="flex:1">
        <div style="font-family:var(--pixel);font-size:6.5px;color:${m.id===myId?'var(--accent2)':'var(--text2)'}">${userLink(m.id,teamLabel(m))}${m.id===myId?' ★':''}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;line-height:1.8;color:var(--text3)">${m.totalCorrect} correct all-time</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--pixel);font-size:10px;color:${m.streak>0?'var(--accent3)':'var(--text3)'}">${m.streak>0?`🔥 ${m.streak}`:'—'}</div>
        <div style="font-size:9px;color:var(--text3)">streak</div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div style="padding:12px 0 80px">
      <div id="duel-card-container-screen" style="padding:0 14px 4px"></div>
      ${seasonNote}
      <div class="section-label" style="margin-top:16px">LEADERBOARD</div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);padding:8px 14px;border-bottom:1px solid var(--border)">RANKED BY STREAK · TIEBREAK: ALL-TIME CORRECT · STARTS OCT 20</div>
        ${lbRows || '<div style="padding:20px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO PICKS YET</div>'}
      </div>
    </div>`;

  // Render duel card into screen container using shared renderDuelCard logic
  const screenCardEl = document.getElementById('duel-card-container-screen');
  if(screenCardEl){
    // Temporarily point renderDuelCard at the screen container
    const orig = document.getElementById('duel-card-container');
    if(orig) orig.id = '_duel-card-container-tmp';
    screenCardEl.id = 'duel-card-container';
    renderDuelCard();
    screenCardEl.id = 'duel-card-container-screen';
    if(orig) orig.id = 'duel-card-container';
  }
}

// ── NEWS BANNER ───────────────────────────────────────────────────────────────
// Shows contextual info above the Daily Duel card:
//   • During draft window → draft schedule + who's on the clock
//   • During season → top fantasy scorer headlines
//   • Off-season / nothing → hidden

// Draft windows per run (inclusive start/end, ET)
const DRAFT_WINDOWS = [
  { run:1, label:'FALL DRAFT',   start:'2026-10-18T20:30:00-04:00', end:'2026-10-19T23:59:00-04:00' },
  { run:2, label:'WINTER DRAFT', start:'2027-01-05T20:30:00-05:00', end:'2027-01-07T12:00:00-05:00' },
  { run:3, label:'SPRING DRAFT', start:'2027-03-29T20:30:00-04:00', end:'2027-03-31T12:00:00-04:00' },
  { run:4, label:'SUMMER DRAFT', start:'2027-06-21T20:30:00-04:00', end:'2027-06-23T12:00:00-04:00' },
];

function renderNewsBanner(){
  const el = document.getElementById('news-banner');
  if(!el) return;

  const now = new Date();
  const rows = [];

  // ── Check draft windows ──────────────────────────────────────────────────
  DRAFT_WINDOWS.forEach(dw => {
    const s = new Date(dw.start), e = new Date(dw.end);
    const isLive = now >= s && now <= e;
    const isSoon = !isLive && now < s && (s - now) < 7 * 24 * 60 * 60 * 1000; // within 7 days

    if(isLive || isSoon){
      const fmtDT = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'}) + ' · ' +
        d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).replace('EDT','EST');

      const draft = (leagueState?.drafts||{})[dw.run];
      const isDraftComplete = draft?.status === 'complete';
      if(isDraftComplete){
        rows.push({
          label:'live', labelText:'✓ DONE',
          text: `${dw.label} is complete — all rosters set!`
        });
      } else if(isLive){
        // Who's on the clock?
        const onClock = getDraftOnClock(dw.run);
        rows.push({
          label:'live', labelText:'LIVE',
          text: onClock
            ? `${dw.label} is live · On the clock: <strong>${onClock}</strong>`
            : `${dw.label} is underway · Ends ${fmtDT(e)}`
        });
      } else {
        rows.push({
          label:'draft', labelText:'DRAFT',
          text:`${dw.label} · ${fmtDT(s)} – ${fmtDT(e)}`
        });
      }
    }
  });

  // ── Top scorers from this week (during season) ───────────────────────────
  if(!rows.length){
    const top = getTopScorerHeadlines();
    top.forEach(h => rows.push({ label:'top', labelText:'TOP', text: h }));
  }

  // ── Voided Daily Duel notice (always first) ─────────────────────────────
  const voidNotice = getDuelVoidNotice();
  if(voidNotice) rows.unshift({ label:'duel', labelText:'DUEL', text: voidNotice });

  if(!rows.length){ el.style.display='none'; return; }

  const fmtDateEST = d => d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/New_York'});
  const fmtTimeEST = d => d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).replace('EDT','EST');

  // Find next upcoming draft for sub-header
  const nextDraft = DRAFT_WINDOWS.find(dw=>{
    const s=new Date(dw.start); return now<s;
  });

  let html = '';
  // header with EST date + draft time on second row
  html += `<div class="news-banner-header"><span>📋 LEAGUE NEWS</span><span style="color:var(--text3)">${fmtDateEST(now)}</span></div>`;
  rows.forEach(r=>{
    html += `<div class="news-banner-row">
      <span class="news-banner-label ${r.label}">${r.labelText}</span>
      <span>${r.text}</span>
    </div>`;
  });

  el.innerHTML = html;
  el.style.display = 'block';
}

// Returns the randomized manager order for a draft run, generating+storing it if needed.
// order is an array of manager IDs shuffled once when the draft starts, then frozen.
function ensureDraftRecord(runId){
  // Creates and saves a draft record the first time a live draft needs one.
  // Also generates the shuffled order if not yet set.
  if(!leagueState.drafts) leagueState.drafts={};
  if(!leagueState.drafts[runId]) leagueState.drafts[runId]={status:'active',currentPick:0};
  const draft = leagueState.drafts[runId];
  if(!draft.status) draft.status='active';
  if(!draft.order?.length){
    const managers = [...(leagueState.managers||[])];
    for(let i=managers.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [managers[i],managers[j]]=[managers[j],managers[i]];
    }
    draft.order = managers.map(m=>m.id);
    // Order will be persisted by the caller's saveLeagueState
  }
  return draft;
}

function getDraftOrder(runId){
  const dw = DRAFT_WINDOWS.find(d=>d.run===runId);
  const now = new Date();
  const isLive = dw && now >= new Date(dw.start) && now <= new Date(dw.end);
  if(!leagueState?.managers?.length) return [];
  const existing = (leagueState.drafts||{})[runId];
  // If order already stored, return it
  if(existing?.order?.length) return existing.order.map(id=>(leagueState.managers||[]).find(m=>m.id===id)).filter(Boolean);
  // If draft is live and no order yet, create it now
  if(isLive){
    const draft = ensureDraftRecord(runId);
    return draft.order.map(id=>(leagueState.managers||[]).find(m=>m.id===id)).filter(Boolean);
  }
  // Pre-draft: just show signup order as preview
  return leagueState.managers||[];
}

function getDraftOnClock(runId){
  const dw = DRAFT_WINDOWS.find(d=>d.run===runId);
  const now = new Date();
  if(!dw || now < new Date(dw.start) || now > new Date(dw.end)) return null;
  const draft = (leagueState.drafts||{})[runId];
  if(draft?.status === 'complete') return null; // draft is done
  const pick = draft?.currentPick || 0;
  const managers = getDraftOrder(runId);
  if(!managers.length) return null;
  const round = Math.floor(pick / managers.length);
  const posInRound = pick % managers.length;
  const idx = round % 2 === 0 ? posInRound : (managers.length - 1 - posInRound);
  return teamLabel(managers[idx]) || null;
}

function getTopScorerHeadlines(){
  // Pull top 3 FP scorers from current week's rosters
  const managers = leagueState.managers || [];
  if(!managers.length) return [];

  const lines = [];
  const allRosters = managers.flatMap(m => {
    const roster = (m.rosters || {})[currentRun] || [];
    return roster.map(pid => ({ mid: m.id, mname: teamLabel(m), pid }));
  });

  // Score each by projected PPG as proxy (no live stats yet)
  const scored = allRosters.map(r => {
    const p = getPlayer(r.pid);
    return p ? { ...r, fp: p.ppg + p.rpg*1.2 + p.apg*1.5 + p.spg*3 + p.bpg*3, player: p } : null;
  }).filter(Boolean).sort((a,b)=>b.fp-a.fp);

  scored.slice(0,3).forEach((s,i) => {
    const medal = ['🥇','🥈','🥉'][i];
    lines.push(`${medal} <strong>${s.player.name}</strong> · ${s.fp.toFixed(1)} proj FP (${s.mname})`);
  });
  return lines;
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
// STREAK RULE: you must vote in every Daily Duel. Skipping one breaks the streak.
// Days with no Duel (no NBA games) don't count either way, so "previous day"
// always means the previous day that HAD a Duel.
function prevDuelDateKey(dk){
  const keys = Object.keys(leagueState.duels||{}).filter(k=>k<dk).sort();
  return keys.length ? keys[keys.length-1] : getPrevDateKey(dk);
}

// Streak as it stands right now, for display.
function liveDuelStreak(s){
  if(!s) return 0;
  const today = todayKey();
  if(s.lastDate === today) return s.streak || 0;
  // Today's Duel already settled and this person wasn't in it -> they skipped
  const td = (leagueState.duels||{})[today];
  if(td && td.result !== null && td.result !== undefined) return 0;
  return s.lastDate === prevDuelDateKey(today) ? (s.streak || 0) : 0;
}

const DUEL_STAT_TEMPLATES = [
  // maxDiff = max allowed difference in the featured stat
  // maxPpgDiff = max PPG gap between the two players (usage/role proxy — keeps matchups competitive)
  { stat:'pts',     label:'PTS',     statKey:'ppg',     maxDiff:4,  maxPpgDiff:5 },
  { stat:'reb',     label:'REB',     statKey:'rpg',     maxDiff:2,  maxPpgDiff:6 },
  { stat:'ast',     label:'AST',     statKey:'apg',     maxDiff:2,  maxPpgDiff:6 },
  { stat:'fp',      label:'FP',      statKey:'fp',      maxDiff:5,  maxPpgDiff:5 },
  { stat:'reb+ast', label:'REB+AST', statKey:'reb+ast', maxDiff:3,  maxPpgDiff:6 },
  { stat:'stl+blk', label:'STL+BLK', statKey:'stl+blk', maxDiff:1, maxPpgDiff:7 },
  { stat:'pts',     label:'PTS',     statKey:'ppg',     maxDiff:4,  maxPpgDiff:5 },
  { stat:'fp',      label:'FP',      statKey:'fp',      maxDiff:5,  maxPpgDiff:5 },
];

// ── DAILY THEMES ── starting Mon Oct 26 every weekday has its own duel type.
// Before that date: player duels only (no team duels until the custom logos are ready).
const DUEL_THEMES_START = '2026-10-26';
const TEAM_DUELS_START = '2026-10-27';
const DUEL_THEMES = {
  1:{ name:'MONSTER MONDAY',        stat:'pra',     prompt:'Who has more points + rebounds + assists tonight?' },
  2:{ name:'TEAMS TUESDAY',         stat:'team',    prompt:'Who wins tonight?' },
  3:{ name:'WET WEDNESDAY 💦',      stat:'tpm',     prompt:'Who makes more 3-pointers tonight?' },
  4:{ name:'STONKS THURSDAY 📈',    stat:'stl+blk', prompt:'Who has more steals + blocks tonight?' },
  5:{ name:'FREE THROW FRIDAY',     stat:'ftm',     prompt:'Who makes more free throws tonight?' },
  6:{ name:'PARLAY SATURDAY 🎰',    stat:'parlay',  prompt:'Which parlay hits tonight?' },
  0:{ name:'DOUBLE-DOUBLE SUNDAY',  stat:'dd',      prompt:'Who posts the bigger double-double tonight?' },
};
function duelThemeFor(dateKey){
  if(dateKey < DUEL_THEMES_START) return null;
  return DUEL_THEMES[new Date(dateKey+'T12:00:00Z').getUTCDay()];
}
// This season's (2026-27) 3PM / FTM per game for the duel pool. Players with 3+ games
// use this season's rate; everyone else keeps last season's average.
async function loadCurrentSeasonShooting(players){
  if(!bdlKey || !players.length) return;
  const byNorm = {};
  try{ const pc = JSON.parse(localStorage.getItem(BDL_CACHE_KEY)||'null'); (pc?.players||[]).forEach(p=>{ byNorm[normName(p.name)] = p; }); }catch(e){}
  const idMap = {};
  players.forEach(p=>{ const b = byNorm[normName(p.name)]; const id = b && (b.bdlId ?? b.id); if(id!=null) idMap[id] = p; });
  const ids = Object.keys(idMap);
  for(let i=0;i<ids.length;i+=100){
    try{
      const res = await bdlFetch('/season_averages', {season:2026, per_page:100, 'player_ids[]':ids.slice(i,i+100)});
      for(const a of (res?.data||[])){
        const p = idMap[String(a.player_id)]; if(!p) continue;
        p.gpNow = a.games_played||0; p.tpgNow = a.fg3m||0; p.ftpgNow = a.ftm||0;
      }
    }catch(e){ console.warn('[duel] current-season shooting fetch failed', e); }
  }
}
const duelTpg  = p => (p.gpNow>=3 ? p.tpgNow  : p.tpg)  || 0;
const duelFtpg = p => (p.gpNow>=3 ? p.ftpgNow : p.ftpg) || 0;

// Parlay line: his scoring average rounded down to a multiple of 5 (27.3 → 25+)
function parlayLine(p){ return Math.max(10, Math.floor((p.ppg||0)/5)*5); }
// Double-double check on a stat line
function isDoubleDouble(st){ return ['pts','reb','ast','stl','blk'].filter(k=>(st?.[k]||0)>=10).length >= 2; }

// Two players from different teams, close on 'val' and on scoring average
function pickDuelPair(seed, pool, val, maxDiff, maxPpgDiff){
  const shuffled = [...pool].sort((a,b)=>((seed*a.id)%997)-((seed*b.id)%997));
  for(let i=0;i<shuffled.length;i++){
    const a = shuffled[i], va = val(a);
    for(let j=i+1;j<shuffled.length;j++){
      const b = shuffled[j];
      if(a.team===b.team) continue;
      if(Math.abs(a.ppg-b.ppg) > maxPpgDiff) continue;
      if(Math.abs(va-val(b)) <= maxDiff) return [a,b];
    }
  }
  return null;
}

// Themed duel for a date (Monday–Sunday), or null to fall back to a classic points duel
function themedDuel(dateKey, theme, seed, eligible, matchups){
  const base = { theme: theme.name, stat: theme.stat, prompt: theme.prompt,
                 result:null, score1:null, score2:null, picks:{}, generatedAt:new Date().toISOString() };
  if(theme.stat==='team'){
    if(!matchups.length) return null;
    const [away, home] = matchups[seed % matchups.length];
    return {...base, type:'team', team1:away, team2:home, pid1:null, pid2:null};
  }
  if(theme.stat==='parlay'){
    // Same-game parlay: each side is "<star> scores his line AND his team wins".
    // Both can't hit (only one team wins); if neither hits it's a push.
    const order = matchups.map((m,i)=>({m, k:(seed*(i+7))%101})).sort((a,b)=>a.k-b.k).map(x=>x.m);
    for(const [away, home] of order){
      const star = t => eligible.filter(p=>(p.team||'').toUpperCase()===t && p.ppg>=18).sort((a,b)=>b.ppg-a.ppg)[0];
      const a = star(away), h = star(home);
      if(a && h) return {...base, type:'player', pid1:a.id, pid2:h.id, team1:away, team2:home, line1:parlayLine(a), line2:parlayLine(h)};
    }
    return null;
  }
  const cfg = {
    pra:      { pool:p=>p.ppg>=18,                         val:p=>p.ppg+p.rpg+p.apg, maxDiff:4,   maxPpg:6 },
    tpm:      { pool:p=>duelTpg(p)>=1.8 && p.ppg>=14,     val:duelTpg,          maxDiff:0.4, maxPpg:8 },
    'stl+blk':{ pool:p=>(p.spg+p.bpg)>=1.5 && p.ppg>=14,  val:p=>p.spg+p.bpg,       maxDiff:0.4, maxPpg:10 },
    ftm:      { pool:p=>duelFtpg(p)>=3 && p.ppg>=18,      val:duelFtpg,         maxDiff:0.7, maxPpg:6 },
    dd:       { pool:p=>p.rpg>=7.5 && p.ppg>=14,          val:p=>p.ppg+p.rpg,       maxDiff:4,   maxPpg:8 },
  }[theme.stat];
  if(!cfg) return null;
  const pair = pickDuelPair(seed, eligible.filter(cfg.pool), cfg.val, cfg.maxDiff, cfg.maxPpg)
            || pickDuelPair(seed, eligible.filter(cfg.pool), cfg.val, cfg.maxDiff*2.5, cfg.maxPpg*2);
  if(!pair) return null;
  const avgs = (theme.stat==='tpm'||theme.stat==='ftm') ? {avg1:+cfg.val(pair[0]).toFixed(1), avg2:+cfg.val(pair[1]).toFixed(1)} : {};
  return {...base, type:'player', pid1:pair[0].id, pid2:pair[1].id, ...avgs};
}
// Team Pick'em duel type — just needs two NBA teams
const DUEL_TEAM_TEMPLATES = [
  { stat:'team', prompt:'Who wins tonight?' },
];

function todayKey(){
  // Use ET (UTC-4 in EDT, UTC-5 in EST) and shift back 2 hours so the duel
  // rolls over at 2:00 AM ET instead of midnight — accommodates West Coast users.
  // e.g. 1:30 AM ET on Oct 19 → treated as Oct 18 (previous day's duel still active).
  const now = new Date();
  const shifted = new Date(now.getTime() - 2 * 60 * 60 * 1000); // subtract 2 hrs
  const et = new Date(shifted.toLocaleString('en-US', {timeZone:'America/New_York'}));
  const y = et.getFullYear();
  const m = String(et.getMonth()+1).padStart(2,'0');
  const d = String(et.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function getTodaysDuel(){
  const today = todayKey();
  return (leagueState.duels||{})[today] || null;
}

// Fetch NBA schedule for a given date (YYYY-MM-DD).
// Returns { teams: Set<string>, matchups: Array<[awayAbbr, homeAbbr]> }, or null on failure.
async function fetchTeamsPlayingOn(dateKey){
  try {
    const fmt = dateKey.replace(/-/g,'');
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${fmt}`);
    if(!res.ok) return null;
    const data = await res.json();
    const teams = new Set();
    const matchups = [];
    for(const ev of (data.events||[])){
      for(const comp of (ev.competitions||[])){
        const competitors = comp.competitors||[];
        // ESPN: homeAway field distinguishes home vs away
        let home = null, away = null;
        for(const c of competitors){
          const raw = c.team?.abbreviation?.toUpperCase();
          if(!raw) continue;
          const abbr = espnToAbbr(raw); // normalize ESPN abbrs (e.g. NY → NYK)
          teams.add(abbr);
          if(c.homeAway === 'home') home = abbr;
          else away = abbr;
        }
        if(home && away) matchups.push([away, home]);
      }
    }
    return teams.size > 0 ? { teams, matchups } : null;
  } catch(e){
    console.warn('[autoGenerateDuel] schedule fetch failed:', e);
    return null;
  }
}

// Auto-generate today's duel (called by boot or commissioner)
// Every 4th day (by seed) generates a Team Pick'em; otherwise a player stat duel
// with players matched within the stat's maxDiff threshold.
// Players are filtered to only those whose team plays on dateKey.
async function autoGenerateDuel(forDate){
  const dateKey = forDate || todayKey();
  const seed = dateKey.split('-').reduce((a,b)=>a*100+parseInt(b),0);
  const injured = new Set(leagueState?.injuredPlayers || []);
  // Wait for the BDL injury report so we never pick an OUT/DTD player
  if(bdlInjuriesReady){ try{ await bdlInjuriesReady; }catch(e){} }
  const unavailable = p => injured.has(p.id) || injured.has(p.name) || isDuelInjuryRisk(p.name);

  // Fetch which teams are playing today — filter players to active game participants
  const scheduleData = await fetchTeamsPlayingOn(dateKey);
  const teamsPlaying = scheduleData?.teams || null;  // Set<string> for player filter
  const matchups = scheduleData?.matchups || [];     // Array<[away, home]> for Pick'em

  // ── Daily theme (from Oct 26) ─────────────────────────────────────────────
  const theme = duelThemeFor(dateKey);
  if(theme && (theme.stat==='tpm' || theme.stat==='ftm')){
    // 3PM / FTM averages come from BDL season averages: give them a moment to load
    await Promise.race([bdlAvgsReady, new Promise(r=>setTimeout(r,10000))]);
    await loadCurrentSeasonShooting(PLAYERS.filter(p=>p.ppg>=14 && !unavailable(p)));
  }
  if(theme){
    const eligible = PLAYERS.filter(p=>!unavailable(p) && (!teamsPlaying || teamsPlaying.has((p.team||'').toUpperCase())));
    const d = themedDuel(dateKey, theme, seed, eligible, matchups);
    if(d) return d;
    console.warn(`[autoGenerateDuel] ${theme.name}: no fit today — classic points duel instead`);
  }

  // (Old every-4th-day team rotation retired: team duels are Tuesdays only.)
  if(false){
    // Pick a real matchup (two teams playing EACH OTHER) using today's schedule
    if(matchups.length > 0){
      const matchup = matchups[seed % matchups.length];
      const [away, home] = matchup;
      console.log(`[autoGenerateDuel] Team Pick'em: ${away} @ ${home} (matchup ${seed % matchups.length} of ${matchups.length})`);
      return {
        type: 'team',
        team1: away, team2: home,
        pid1: null, pid2: null,
        stat: 'team',
        prompt: `Who wins tonight?`,
        result: null, score1: null, score2: null,
        picks: {},
        generatedAt: new Date().toISOString(),
      };
    }
    // Fallback: no schedule available, pick from known teams list
    console.warn('[autoGenerateDuel] No matchups from schedule — using fallback team list');
    const allTeams = NBA_TEAMS_LIST || Object.keys(NBA_TEAMS||{});
    const teams = teamsPlaying ? allTeams.filter(t=>teamsPlaying.has(t.toUpperCase())) : allTeams;
    if(teams.length >= 2){
      let t1i = seed % teams.length;
      let t2i = (seed * 17 + 3) % teams.length;
      let att = 0;
      while(t1i===t2i && att<20){ t2i=(t2i+1)%teams.length; att++; }
      if(t1i !== t2i){
        return {
          type: 'team',
          team1: teams[t1i], team2: teams[t2i],
          pid1: null, pid2: null,
          stat: 'team',
          prompt: `Who wins tonight?`,
          result: null, score1: null, score2: null,
          picks: {},
          generatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // ── Player stat duel ──────────────────────────────────────────────────────
  const tmpl = theme ? DUEL_STAT_TEMPLATES[0] : DUEL_STAT_TEMPLATES[seed % DUEL_STAT_TEMPLATES.length];
  const maxDiff    = tmpl.maxDiff    ?? 5;
  const maxPpgDiff = tmpl.maxPpgDiff ?? 6;

  // Helper: get the relevant average for a player given a stat template
  const statVal = (p) => {
    switch(tmpl.statKey){
      case 'ppg':      return p.ppg;
      case 'rpg':      return p.rpg;
      case 'apg':      return p.apg;
      case 'reb+ast':  return p.rpg + p.apg;
      case 'stl+blk':  return p.spg + p.bpg;
      case 'fp': {
        const d = PLAYERS_DB?.find(x=>x.n===p.name);
        return d?.fpPG || (p.ppg + p.rpg + p.apg + p.spg + p.bpg);
      }
      default: return p.ppg;
    }
  };

  // Filter to stars: min 15 PPG, not injured, and (if schedule available) team playing today
  let stars = PLAYERS.filter(p=>{
    if(p.ppg < 15) return false;
    if(unavailable(p)) return false;
    if(teamsPlaying && !teamsPlaying.has((p.team||'').toUpperCase())) return false;
    return true;
  });
  // Fallback: if schedule filtered too aggressively (rest day / schedule fetch failed), drop schedule filter
  if(stars.length < 2){
    console.warn('[autoGenerateDuel] <2 eligible stars with schedule filter — falling back to all stars');
    stars = PLAYERS.filter(p=>p.ppg>=15 && !unavailable(p));
    if(stars.length < 2) return null;
  }

  // Shuffle deterministically with the seed
  const shuffled = [...stars].sort((a,b)=>{
    const ha = (seed * a.id) % 997, hb = (seed * b.id) % 997;
    return ha - hb;
  });

  // Find a pair whose stat values are within maxDiff and on different teams
  let p1 = null, p2 = null;
  outer: for(let i=0; i<shuffled.length; i++){
    const a = shuffled[i];
    const va = statVal(a);
    for(let j=i+1; j<shuffled.length; j++){
      const b = shuffled[j];
      if(a.team === b.team) continue;
      if(Math.abs(a.ppg - b.ppg) > maxPpgDiff) continue; // similar usage/role
      if(Math.abs(va - statVal(b)) <= maxDiff){
        p1 = a; p2 = b;
        break outer;
      }
    }
  }
  // Fallback: two stars on different teams within PPG window
  if(!p1){
    const i1 = seed % stars.length;
    let i2 = (seed * 13 + 7) % stars.length;
    let attempts = 0;
    while(attempts < 30){
      if(i1 !== i2 && stars[i1].team !== stars[i2].team &&
         Math.abs(stars[i1].ppg - stars[i2].ppg) <= maxPpgDiff) break;
      i2 = (i2 + 1) % stars.length; attempts++;
    }
    // Last resort: drop PPG proximity if no match found
    if(attempts >= 30){
      i2 = (seed * 13 + 7) % stars.length; attempts = 0;
      while((i1===i2 || stars[i1].team===stars[i2].team) && attempts < 30){
        i2 = (i2 + 1) % stars.length; attempts++;
      }
    }
    if(i1===i2) return null;
    p1 = stars[i1]; p2 = stars[i2];
  }

  // Build context-aware prompt with the players' stats
  const buildPrompt = () => {
    switch(tmpl.stat){
      case 'pts':     return `Who has more points tonight?`;
      case 'reb':     return `Who has more rebounds tonight?`;
      case 'ast':     return `Who has more assists tonight?`;
      case 'fp':      return `Who has more fantasy points tonight?`;
      case 'reb+ast': return `Who has more rebounds and assists tonight?`;
      case 'stl+blk': return `Who has more steals and blocks tonight?`;
      default:        return `Who performs better tonight?`;
    }
  };

  return {
    type: 'player',
    pid1: p1.id, pid2: p2.id,
    stat: tmpl.stat, prompt: buildPrompt(),
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
  // Before team duels launch, replace a team duel nobody has voted on yet with a player duel
  const ex = (leagueState.duels||{})[today];
  if(ex && ex.type==='team' && today < TEAM_DUELS_START && !Object.keys(ex.picks||{}).length && !_duelEnsureInProgress){
    _duelEnsureInProgress = true;
    try{
      const duel = await autoGenerateDuel(today);
      const cur = leagueState.duels[today];
      if(duel && duel.type!=='team' && cur && cur.type==='team' && !Object.keys(cur.picks||{}).length){
        leagueState.duels[today] = duel;
        await saveLeagueState();
        if(typeof renderHomeScreen==='function' && currentScreen==='home') renderHomeScreen();
      }
    } finally { _duelEnsureInProgress = false; }
    return;
  }
  // Already exists — nothing to do
  if(ex) return;
  // Lock: another call is in flight — bail out
  if(_duelEnsureInProgress) return;
  _duelEnsureInProgress = true;
  try {
    const duel = await autoGenerateDuel(today);
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

// Auto-swap today's player duel if one of its players lands on the injury report.
// Only when: nobody has picked yet, and neither player's game has tipped off.
// Runs after every injury refresh and after today's duel is ensured.
// Safe if several clients run it at once: generation is deterministic per date,
// so they all produce the same replacement.
let _duelSwapInProgress = false;
async function maybeSwapInjuredDuel(){
  if(_duelSwapInProgress || !currentUser || !leagueState?.duels) return;
  const today = todayKey();
  const needsSwap = d => {
    if(!d || d.type === 'team' || d.stat === 'team') return null;
    if(d.result !== null && d.result !== undefined) return null;
    if(Object.keys(d.picks||{}).length > 0) return null;
    const p1 = getPlayer(d.pid1), p2 = getPlayer(d.pid2);
    if(!p1 || !p2) return null;
    // Need today's schedule to confirm games haven't started; retry next refresh if not loaded
    if(!Object.keys(todayGamesCache).length) return null;
    const started = p => { const g = todayGamesCache[(p.team||'').toUpperCase()]; return !!(g && (g.isLive || g.isFinal)); };
    if(started(p1) || started(p2)) return null;
    const hurt = [p1, p2].filter(p => isDuelInjuryRisk(p.name));
    return hurt.length ? hurt : null;
  };
  if(!needsSwap(leagueState.duels[today])) return;
  _duelSwapInProgress = true;
  try {
    // Re-check against fresh saved state so we never wipe a pick made on another device
    await loadLeagueState();
    const hurt = needsSwap((leagueState.duels||{})[today]);
    if(!hurt) return;
    const fresh = await autoGenerateDuel(today);
    if(!fresh) return;
    leagueState.duels[today] = fresh;
    await saveLeagueState();
    const names = hurt.map(p => `${p.name} (${injuryInfo(p.name)?.label})`).join(' & ');
    console.log(`[maybeSwapInjuredDuel] swapped out ${names}`);
    toast(`Daily Duel updated: ${names} on injury report`);
    renderDuelCard();
    if(currentScreen === 'duel') renderDuelScreen();
  } catch(e){
    console.warn('[maybeSwapInjuredDuel] failed:', e);
  } finally {
    _duelSwapInProgress = false;
  }
}

// Submit a pick (1 or 2)
async function makeDuelPick(side){
  const mid = String(getMyId());
  if(!mid || mid==='undefined'){ toast('Sign in to play!'); return; }
  const today = todayKey();
  const duel = (leagueState.duels||{})[today];
  if(!duel){ toast('No duel today'); return; }
  if(duel.picks[mid] !== undefined || duel.picks[Number(mid)] !== undefined){ toast('Already picked today!'); return; }
  if(duel.result !== null){ toast('Duel already settled'); return; }
  duel.picks[mid] = side;
  await saveLeagueState();
  toast(`LOCKED IN! Check back after games for the result. 🔥`);
  renderDuelCard();
  if(currentScreen==='duel') renderDuelScreen();
}

// Recalculate all duel streaks from scratch by replaying every settled duel in order.
// Fixes any double-counted streaks from duplicate settlements.
async function recalcDuelStreaks(){
  // Always reload fresh from Supabase first so we work on the real saved state
  await loadLeagueState();
  const duels = leagueState.duels || {};
  const settledDates = Object.keys(duels).filter(dk => {
    const d = duels[dk];
    return d.result !== null && d.result !== undefined;
  }).sort();
  console.log('[recalcDuelStreaks] settled duels:', settledDates);
  console.log('[recalcDuelStreaks] raw duels object:', JSON.stringify(duels));
  // Reset all streaks
  leagueState.duelStreaks = {};
  for(const dateKey of settledDates){
    const duel = duels[dateKey];
    const countsForStreak = new Date(dateKey) >= NBA_SEASON_START;
    console.log(`[recalcDuelStreaks] ${dateKey}: result=${duel.result}, picks=`, duel.picks, 'counts=', countsForStreak);
    if(!countsForStreak) continue;
    const prevDate = prevDuelDateKey(dateKey);
    if(duel.result === 'void' || duel.result === 'push'){
      for(const mid of Object.keys(duel.picks||{})){
        const s = leagueState.duelStreaks[mid] || (leagueState.duelStreaks[mid] = {streak:0, lastDate:null, totalCorrect:0});
        if(s.lastDate !== prevDate) s.streak = 0;
        s.lastDate = dateKey;
      }
      continue;
    }
    for(const [mid, pick] of Object.entries(duel.picks||{})){
      // pick and result may be stored as number or string; coerce for comparison
      const correct = duel.result === 'tie' ? true : (String(pick) === String(duel.result));
      if(!leagueState.duelStreaks[mid]) leagueState.duelStreaks[mid] = {streak:0, lastDate:null, totalCorrect:0};
      const s = leagueState.duelStreaks[mid];
      if(correct){
        s.streak = (s.lastDate === prevDate ? s.streak : 0) + 1;
        s.totalCorrect = (s.totalCorrect||0) + 1;
        if(s.streak > (s.longest||0)) s.longest = s.streak;
      } else {
        s.streak = 0;
      }
      s.lastDate = dateKey;
    }
  }
  console.log('[recalcDuelStreaks] computed duelStreaks:', JSON.stringify(leagueState.duelStreaks));
  await saveLeagueState();
  console.log('[recalcDuelStreaks] saved successfully');
  toast(`Streaks recalculated — ${settledDates.length} duel(s) replayed ✓`);
  renderDuelCard();
  if(currentScreen==='duel') renderDuelScreen();
  renderAdminContent();
}

// Commissioner: set the result and update streaks
async function settleDuel(dateKey, result, score1, score2){
  const duel = (leagueState.duels||{})[dateKey];
  if(!duel){ toast('No duel for that date'); return; }
  // Guard: never settle twice — streaks would be double-counted
  if(duel.result !== null && duel.result !== undefined){ return; }
  if(result === 'tie') result = 'push'; // ties are a push: nobody wins or loses
  duel.result = result; // 1, 2, 'push', or 'void'
  duel.score1 = score1;
  duel.score2 = score2;
  if(result === 'void' || result === 'push'){
    // Voided / pushed duel doesn't count: no wins, no losses, and it doesn't break anyone's streak
    if(!leagueState.duelStreaks) leagueState.duelStreaks = {};
    // Only people who voted keep their streak; skipping still breaks it
    const prev = prevDuelDateKey(dateKey);
    for(const mid of Object.keys(duel.picks||{})){
      const s = leagueState.duelStreaks[mid] || (leagueState.duelStreaks[mid] = {streak:0, lastDate:null, totalCorrect:0});
      if(s.lastDate !== prev) s.streak = 0;
      s.lastDate = dateKey;
    }
    await saveLeagueState();
    renderDuelCard();
    if(currentScreen==='duel') renderDuelScreen();
    renderNewsBanner();
    return;
  }
  // Streaks and leaderboard only count once the regular season begins (Oct 20)
  const countsForStreak = new Date(dateKey) >= NBA_SEASON_START;
  // Update streaks for all managers who picked
  if(!leagueState.duelStreaks) leagueState.duelStreaks = {};
  const prevDate = prevDuelDateKey(dateKey);
  for(const [mid, pick] of Object.entries(duel.picks)){
    const correct = result === 'tie' ? true : (pick === result);
    if(!leagueState.duelStreaks[mid]) leagueState.duelStreaks[mid] = {streak:0, lastDate:null, totalCorrect:0};
    const s = leagueState.duelStreaks[mid];
    // Streaks and totalCorrect only count once the regular season begins (Oct 20)
    if(countsForStreak){
      if(correct){
        s.streak = (s.lastDate === prevDate ? s.streak : 0) + 1;
        s.totalCorrect = (s.totalCorrect||0) + 1;
        if(s.streak > (s.longest||0)) s.longest = s.streak;
      } else {
        s.streak = 0;
      }
      s.lastDate = dateKey;
    }
  }
  // Anyone who had a streak going but didn't pick today — their streak is already "dead"
  // (the getDuelStreak function handles the miss-a-day case live)
  await saveLeagueState();
  toast(countsForStreak ? 'Duel settled! Streaks updated.' : 'Duel settled! (Pre-season — streaks count from Oct 20)');
  renderDuelCard();
  if(currentScreen==='duel') renderDuelScreen();
}

function getPrevDateKey(dateKey){
  const d = new Date(dateKey);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Get my current streak (handles miss-a-day reset)
function getMyDuelStreak(){
  const mid = String(getMyId());
  if(!mid || mid==='undefined') return 0;
  const s = (leagueState.duelStreaks||{})[mid] || (leagueState.duelStreaks||{})[Number(mid)];
  if(!s) return 0;
  return liveDuelStreak(s);
}

function getMyDuelPick(){
  const mid = String(getMyId());
  if(!mid || mid==='undefined') return null;
  const duel = getTodaysDuel();
  if(!duel) return null;
  // Support both string and number keys (JSON round-trip always produces string keys)
  return duel.picks[mid] ?? duel.picks[Number(mid)] ?? null;
}

// Get the relevant stat display string for a player based on the duel stat type
function getDuelStatDisplay(p, statType, duel, side){
  if(!p) return '—';
  const f1 = v => (+(v||0)).toFixed(1);
  switch(statType){
    case 'pra':     return `${f1((p.ppg||0)+(p.rpg||0)+(p.apg||0))} PTS+REB+AST · ${p.team}`;
    case 'tpm':     return `${f1(duel?.[side===1?'avg1':'avg2'] ?? duelTpg(p))} 3PM · ${p.team}`;
    case 'ftm':     return `${f1(duel?.[side===1?'avg1':'avg2'] ?? duelFtpg(p))} FTM · ${p.team}`;
    case 'dd':      return `${f1(p.ppg)} PTS ${f1(p.rpg)} REB · ${p.team}`;
    case 'parlay':  return `${side===1?duel.line1:duel.line2}+ PTS & ${side===1?duel.team1:duel.team2} WIN`;
    // Uppercase, with a space between every number and its label: "1 STL 0.2 BLK · SAC"
    case 'pts':     return `${p.ppg} PPG · ${p.team}`;
    case 'reb':     return `${p.rpg} RPG · ${p.team}`;
    case 'ast':     return `${p.apg} APG · ${p.team}`;
    case 'reb+ast': return `${p.rpg} REB ${p.apg} AST · ${p.team}`;
    case 'stl+blk': return `${p.spg} STL ${p.bpg} BLK · ${p.team}`;
    case 'fp':      return `${(+getPlayerProjFP(p)).toFixed(1)} FP/G · ${p.team}`;
    default:        return `${p.ppg} PPG · ${p.team}`;
  }
}

// ── Duel card pieces ──
// CSS state for a duel side: your pick (gold frame + ribbon) vs the other side (faded);
// after settling the ribbon shows the outcome.
function duelSideState(side, myPick, duel){
  if(myPick===null || myPick===undefined) return {cls:'', ribbon:''};
  if(String(myPick)!==String(side)) return {cls:'not-pick', ribbon:''};
  const settled = duel.result!==null && duel.result!==undefined;
  if(!settled) return {cls:'is-pick', ribbon:'<div class="pick-ribbon">YOUR PICK</div>'};
  if(duel.result==='void') return {cls:'is-pick', ribbon:'<div class="pick-ribbon">NO CONTEST</div>'};
  if(duel.result==='push') return {cls:'is-pick', ribbon:'<div class="pick-ribbon">= PUSH</div>'};
  const won = duel.result==='tie' || String(duel.result)===String(side);
  return {cls:'is-pick '+(won?'won':'lost'), ribbon:`<div class="pick-ribbon">${duel.result==='tie'?'= TIE':won?'✓ WIN':'✗ MISS'}</div>`};
}
// Tonight's value of the duel stat for a player (live or final), or null before tip
function duelTonightValue(p, stat){
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,'');
  let st = findSavedStat(p.id, today);
  const live = livePlayerStats[p.id];
  if(!st && live && (live.live || String(live.dateStr)===today)) st = live;
  const v = getDuelStatValue(st, stat==='fp'?'fp':stat);
  return v===null || v===undefined ? null : +(+v).toFixed(1);
}
const DUEL_STAT_LABEL = {pts:'PTS', reb:'REB', ast:'AST', fp:'FP', 'reb+ast':'REB+AST', 'stl+blk':'STL+BLK', pra:'PRA', tpm:'3PM', ftm:'FTM', dd:'PRA', parlay:'PTS'};
// Tonight's full stat line for a player (saved final, else live), or null
function duelTonightEntry(p){
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,'');
  const st = findSavedStat(p.id, today); if(st) return st;
  const live = livePlayerStats[p.id];
  return live && (live.live || String(live.dateStr)===today) ? live : null;
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

  const isTeamDuel = duel.type === 'team';

  // ── Team Pick'em rendering ──────────────────────────────────────────────
  if(isTeamDuel){
    const myPick = getMyDuelPick();
    const streak = getMyDuelStreak();
    const settled = duel.result !== null;
    const winColor = 'var(--accent2)', loseColor = 'var(--accent4)', tieColor = 'var(--accent3)';

    let pct1='', pct2='';
    if(myPick !== null || settled){
      const allPicks = Object.values(duel.picks||{}).filter(v=>v!==null);
      const n1=allPicks.filter(v=>v===1).length, n2=allPicks.filter(v=>v===2).length, tot=n1+n2;
      if(tot>0){ pct1=`<div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:4px">${Math.round(n1/tot*100)}%</div>`; pct2=`<div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:4px">${Math.round(n2/tot*100)}%</div>`; }
    }

    let resultBanner='';
    if(settled){
      const stat1txt = duel.score1 !== null ? duel.score1 : '—';
      const stat2txt = duel.score2 !== null ? duel.score2 : '—';
      if(duel.result==='tie' || duel.result==='push') resultBanner=`<div class="duel-result-banner" style="color:${tieColor}">PUSH — STREAKS HOLD</div>`;
      else{
        const myCorrect = myPick!==null && myPick===duel.result;
        const winnerAbbr = duel.result===1 ? duel.team1 : duel.team2;
        resultBanner = myPick===null
          ? `<div class="duel-result-banner" style="color:var(--text3)">${winnerAbbr} WINS — YOU DIDN'T PICK</div>`
          : myCorrect ? `<div class="duel-result-banner" style="color:${winColor}">✓ CORRECT! STREAK: ${streak} 🔥</div>`
          : `<div class="duel-result-banner" style="color:${loseColor}">✗ WRONG — STREAK RESET</div>`;
      }
    }

    const pickedStyle=(s)=>{
      if(!settled && myPick===s) return `box-shadow:0 0 0 2px var(--accent2);`;
      if(settled){ const won=duel.result===s||duel.result==='tie'; return myPick===s?`box-shadow:0 0 0 2px ${won?winColor:loseColor};`:''; }
      return '';
    };
    const teamBox=(abbr,side)=>{
      const full = NBA_TEAMS?.[abbr] || abbr;
      const logoUrl = getTeamLogoUrl(abbr);
      const logoEl = logoUrl
        ? `<img src="${logoUrl}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;display:block;margin:0 auto 6px" onerror="this.style.display='none';document.getElementById('logo-fb-${abbr}-${side}').style.display='flex'">`
          + `<div id="logo-fb-${abbr}-${side}" style="display:none;width:64px;height:64px;border-radius:8px;background:var(--bg3);align-items:center;justify-content:center;font-family:var(--pixel);font-size:14px;color:var(--text1);margin:0 auto 6px">${abbr}</div>`
        : `<div style="width:64px;height:64px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:14px;color:var(--text1);margin:0 auto 6px">${abbr}</div>`;
      const ps = duelSideState(side, myPick, duel);
      return `<div class="duel-player ${ps.cls}"><div style="position:relative;display:inline-block">
        ${logoEl}${ps.ribbon}</div>
        <div class="dname">${abbr}</div>
        <div class="dstat" style="font-size:9px">${full}</div>
        ${side===1?pct1:pct2}
      </div>`;
    };

    el.innerHTML=`
    <div class="duel-card">
      <div class="duel-header">
        <span>⚡ DAILY DUEL</span>
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="event.stopPropagation();showDuelRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;padding:0">RULES ›</button>
          <span class="duel-streak-chip">${streak > 0 ? `🔥 ${streak}` : '—'}</span>
        </div>
      </div>
      ${duel.theme?`<div class="duel-theme">${duel.theme}</div>`:''}
      <div class="duel-prompt">${duel.prompt}</div>
      <div class="duel-body">
        ${teamBox(duel.team1, 1)}
        <div class="duel-vs">VS</div>
        ${teamBox(duel.team2, 2)}
      </div>
      ${!myPick && !settled ? `
      <div class="duel-btns">
        <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(1)">${duel.team1}</button>
        <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(2)">${duel.team2}</button>
      </div>` : ''}
      ${resultBanner}
    </div>`;
    return;
  }

  // ── Player stat duel rendering ──────────────────────────────────────────
  const p1=getPlayer(duel.pid1), p2=getPlayer(duel.pid2);
  if(!p1||!p2){ el.innerHTML=''; return; }

  const myPick = getMyDuelPick();
  const streak = getMyDuelStreak();
  const settled = duel.result !== null;
  const statType = duel.stat || 'pts';

  const portHtml=(p)=>{
    // PLAYERS is BDL-driven so team abbreviations are current-season accurate
    const pArr = PLAYERS.find(pl=>pl.name===p.name);
    const teamAbbr = pArr?.team || p.team || '';
    const port = teamAbbr
      ? portraitUrl(teamAbbr, p.name)
      : (playerPortraits[p.name] || '');
    const fallback=`this.style.display='none';this.nextSibling.style.display='flex'`;
    return `<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="${fallback}"/><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-family:var(--pixel);font-size:9px;color:var(--text3)">${initials(p.name)}</div>`;
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
    if(duel.result === 'void'){
      statLine = '';
      resultBanner = `<div class="duel-result-banner" style="color:var(--text3)">NO CONTEST — ${(duel.voidReason||'PLAYER DID NOT PLAY').toUpperCase()} · STREAKS HOLD</div>`;
    } else if(duel.result === 'push'){
      resultBanner = `<div class="duel-result-banner" style="color:${tieColor}">PUSH — ${statType==='parlay'?'NEITHER PARLAY HIT':statType==='dd'?'NO WINNING DOUBLE-DOUBLE':'DEAD EVEN'} · STREAKS HOLD</div>`;
    } else if(duel.result === 'tie'){
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

  // Tonight's duel stat, shown once a player's game has started (leader in green)
  // Settled duels show the official result values; otherwise tonight's live/final stat
  const official = settled && duel.result!=='void' && duel.score1!=null && duel.score2!=null;
  const tv1 = official ? +duel.score1 : duelTonightValue(p1, statType), tv2 = official ? +duel.score2 : duelTonightValue(p2, statType);
  if(official) statLine = ''; // values now shown under each player
  const duelLiveHtml = side => {
    const v = side===1 ? tv1 : tv2, o = side===1 ? tv2 : tv1;
    if(v===null) return '';
    if(statType==='parlay'){
      const line = side===1 ? duel.line1 : duel.line2;
      return `<div class="dlive${v>=line?' lead':''}">${v}<span>/${line}+ PTS</span></div>`;
    }
    if(statType==='dd'){
      const st = official ? null : duelTonightEntry(side===1?p1:p2);
      const dd = official ? (side===1?duel.dd1:duel.dd2) : isDoubleDouble(st);
      const txt = st ? `${st.pts||0}/${st.reb||0}/${st.ast||0}` : v;
      return `<div class="dlive${dd?' lead':''}">${txt}<span>${st?'P/R/A':'PRA'}${dd?' ✓DD':''}</span></div>`;
    }
    const lead = o===null || v>o, tie = o!==null && v===o;
    return `<div class="dlive${lead&&!tie?' lead':''}">${v}<span>${DUEL_STAT_LABEL[statType]||statType.toUpperCase()}</span></div>`;
  };
  const pickedStyle = (side) => {
    if(!settled && myPick===side) return `box-shadow:0 0 0 2px var(--accent2);`;
    if(settled && duel.result==='void') return myPick===side ? `box-shadow:0 0 0 2px var(--text3);` : '';
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
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="event.stopPropagation();showDuelRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;padding:0">RULES ›</button>
        <span class="duel-streak-chip">${streak > 0 ? `🔥 ${streak}` : '—'}</span>
      </div>
    </div>
    ${duel.theme?`<div class="duel-theme">${duel.theme}</div>`:''}
    <div class="duel-prompt">${duel.prompt}</div>
    ${statLine}
    <div class="duel-body">
      <div class="duel-player ${duelSideState(1,myPick,duel).cls}">
        <div class="portrait-wrap" onclick="event.stopPropagation();${pcardOnclick(p1.name)}" style="cursor:pointer"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p1)}</div>${duelSideState(1,myPick,duel).ribbon}</div>
        <div class="dname">${playerShortName(p1.name)}</div>
        <div class="dstat">${getDuelStatDisplay(p1, statType, duel, 1)}</div>
        <div class="dgame">${getTodayGameInfo(p1.team) || '<span style="color:var(--text3)">No game today</span>'}</div>
        ${duelLiveHtml(1)}
        ${pct1}
      </div>
      <div class="duel-vs">VS</div>
      <div class="duel-player ${duelSideState(2,myPick,duel).cls}">
        <div class="portrait-wrap" onclick="event.stopPropagation();${pcardOnclick(p2.name)}" style="cursor:pointer"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p2)}</div>${duelSideState(2,myPick,duel).ribbon}</div>
        <div class="dname">${playerShortName(p2.name)}</div>
        <div class="dstat">${getDuelStatDisplay(p2, statType, duel, 2)}</div>
        <div class="dgame">${getTodayGameInfo(p2.team) || '<span style="color:var(--text3)">No game today</span>'}</div>
        ${duelLiveHtml(2)}
        ${pct2}
      </div>
    </div>
    ${!myPick && !settled ? `
    <div class="duel-btns">
      <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(1)">${playerShortName(p1.name)}</button>
      <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(2)">${playerShortName(p2.name)}</button>
    </div>` : ''}
    ${resultBanner}
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
    const live = liveDuelStreak(s);
    return {...m, streak:live, totalCorrect:s.totalCorrect||0};
  }).sort((a,b)=>b.streak!==a.streak?b.streak-a.streak:b.totalCorrect-a.totalCorrect);

  const myId = getMyId();
  let rowsHtml = rows.map((m,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${m.id===myId?'background:rgba(0,212,170,.05);margin:0 -16px;padding-left:16px;padding-right:16px;':''}">
      <span style="font-family:var(--pixel);font-size:8px;color:var(--text3);width:20px">${i+1}</span>
      ${userAvatar(m,28,8)}
      <div style="flex:1">
        <div style="font-family:var(--pixel);font-size:6.5px;color:${m.id===myId?'var(--accent2)':'var(--text2)'}">${userLink(m.id,teamLabel(m))}${m.id===myId?' ★':''}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;line-height:1.8;color:var(--text3)">${m.totalCorrect} correct all-time</div>
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
      ${duel ? (()=>{
        const isTeam = duel.stat === 'team';
        const label1 = isTeam ? (duel.team1||'?') : (p1?.name||'?');
        const label2 = isTeam ? (duel.team2||'?') : (p2?.name||'?');
        const short1 = isTeam ? label1 : playerShortName(label1);
        const short2 = isTeam ? label2 : playerShortName(label2);
        return `
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text2);margin-bottom:6px">${label1} vs ${label2}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">"${duel.prompt||''}"</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:10px">PICKS: ${Object.keys(duel.picks||{}).length} · STATUS: ${settled?'SETTLED ✓':'OPEN'}</div>
        ${!settled ? `
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <input id="duel-score1" placeholder="${short1} score" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
            <input id="duel-score2" placeholder="${short2} score" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
          </div>
          <button class="btn btn-full btn-primary" onclick="adminSettleDuel('${today}')">🏁 SETTLE TODAY'S DUEL</button>
        ` : `<div style="font-family:var(--pixel);font-size:6px;color:var(--accent2)">${duel.result==='void' ? `VOID · ${duel.voidReason||'player did not play'}` : `WINNER: ${duel.result==='tie'||duel.result==='push'?'PUSH':duel.result===2?label2:label1} · ${duel.score1} vs ${duel.score2}`}</div>`}
        <button class="btn btn-full btn-secondary" style="margin-top:6px" onclick="adminRegenerateDuel()">↺ REGENERATE TODAY'S DUEL</button>
        <button class="btn btn-full btn-secondary" style="margin-top:6px" onclick="recalcDuelStreaks()">🔁 RECALC ALL STREAKS</button>`;
      })()
      : `
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:8px">NO DUEL YET TODAY</div>
        <button class="btn btn-full btn-primary" onclick="adminRegenerateDuel()">⚡ GENERATE TODAY'S DUEL</button>
      `}
      ${(()=>{
        // Show yesterday's duel section always (settled or not)
        const yesterday = getPrevDateKey(today);
        const yDuel = (leagueState.duels||{})[yesterday];
        if(!yDuel) return '';
        const ySettled = yDuel.result !== null && yDuel.result !== undefined;
        const isTeamDuel = yDuel.stat === 'team';
        const yLabel1 = isTeamDuel ? (yDuel.team1||'?') : (getPlayer(yDuel.pid1)?.name||'?');
        const yLabel2 = isTeamDuel ? (yDuel.team2||'?') : (getPlayer(yDuel.pid2)?.name||'?');
        const yShort1 = isTeamDuel ? yLabel1 : playerShortName(yLabel1);
        const yShort2 = isTeamDuel ? yLabel2 : playerShortName(yLabel2);
        const yPickCount = Object.keys(yDuel.picks||{}).length;
        return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
          <div style="font-family:var(--pixel);font-size:7px;color:${ySettled?'var(--accent2)':'var(--accent4)'};margin-bottom:6px">${ySettled?'✓ YESTERDAY SETTLED':'⚠ YESTERDAY UNSETTLED'}</div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text2);margin-bottom:4px">${yLabel1} vs ${yLabel2} · ${(yDuel.stat||'').toUpperCase()}</div>
          <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-bottom:4px">"${yDuel.prompt||''}"</div>
          <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-bottom:8px">PICKS: ${yPickCount} · RESULT: ${ySettled?`${yDuel.result} (${yDuel.score1} vs ${yDuel.score2})`:'NONE'}</div>
          ${!ySettled ? `<button class="btn btn-full btn-primary" style="margin-bottom:6px" onclick="adminAutoSettleDuel('${yesterday}')">⚡ AUTO-SETTLE FROM SAVED STATS</button>` : ''}
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input id="duel-yscore1" placeholder="${yShort1} score" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
            <input id="duel-yscore2" placeholder="${yShort2} score" type="number" step="0.1" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
          </div>
          <button class="btn btn-full btn-secondary" onclick="adminForceSettleYesterdayDuel('${yesterday}')">${ySettled?'🔄 RE-SETTLE (OVERRIDE)':'🏁 SETTLE MANUALLY'}</button>
        </div>`;
      })()}
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:6px">🚑 INJURED / INACTIVE (excluded from Duel pool)</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text2);margin-bottom:8px;line-height:1.8">
          ${(leagueState.injuredPlayers||[]).length
            ? (leagueState.injuredPlayers||[]).map(n=>`<span style="display:inline-block;background:var(--accent4);color:#fff;border-radius:3px;padding:2px 6px;margin:2px;font-size:5px">${n} <span onclick="adminRemoveInjured('${n.replace(/'/g,"\\'")}');event.stopPropagation()" style="cursor:pointer;opacity:0.8">✕</span></span>`).join('')
            : '<span style="color:var(--text3)">NONE</span>'}
        </div>
        <div style="display:flex;gap:6px">
          <input id="injured-name-input" placeholder="Player name or ID" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:var(--pixel);font-size:6px;padding:6px"/>
          <button class="btn btn-secondary" style="font-size:6px;padding:6px 10px" onclick="adminAddInjured()">+ ADD</button>
        </div>
      </div>
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

async function adminSettleYesterdayDuel(dateKey){
  const s1 = parseFloat(document.getElementById('duel-yscore1')?.value);
  const s2 = parseFloat(document.getElementById('duel-yscore2')?.value);
  if(isNaN(s1)||isNaN(s2)){ toast('Enter both scores'); return; }
  const result = s1>s2 ? 1 : s2>s1 ? 2 : 'tie';
  await settleDuel(dateKey, result, s1, s2);
  renderAdminContent();
}

// Force re-settle a duel even if already settled — clears old result first,
// rebuilds duelStreaks from scratch, then settles with the given scores.
async function adminForceSettleYesterdayDuel(dateKey){
  const s1 = parseFloat(document.getElementById('duel-yscore1')?.value);
  const s2 = parseFloat(document.getElementById('duel-yscore2')?.value);
  if(isNaN(s1)||isNaN(s2)){ toast('Enter both scores for ' + dateKey); return; }
  // Reload fresh from Supabase
  await loadLeagueState();
  const duel = (leagueState.duels||{})[dateKey];
  if(!duel){ toast('No duel found for ' + dateKey); return; }
  // Clear the old result so the guard in settleDuel allows re-settlement
  duel.result = null;
  duel.score1 = null;
  duel.score2 = null;
  // Also wipe duelStreaks so we start fresh — recalcDuelStreaks will rebuild after
  leagueState.duelStreaks = {};
  // Now settle normally (guard will pass since result is null)
  const result = s1>s2 ? 1 : s2>s1 ? 2 : 'tie';
  await settleDuel(dateKey, result, s1, s2);
  renderAdminContent();
}

// Find the best saved stat entry for a player on a given date (dateStr = YYYYMMDD)
function findSavedStat(pid, dateStr){
  const saved = leagueState.playerStats || {};
  // Keys are pid_dateStr_gameId — find any entry matching this pid + date
  const prefix = `${pid}_${dateStr}_`;
  for(const [k,v] of Object.entries(saved)){
    if(k.startsWith(prefix) || (v.pid===parseInt(pid) && v.date===dateStr)) return v;
  }
  return null;
}

// Extract the relevant stat value from a saved stat entry
function getDuelStatValue(statEntry, statType){
  if(!statEntry) return null;
  if(statType==='stl+blk') return (statEntry.stl||0)+(statEntry.blk||0);
  if(statType==='reb+ast') return (statEntry.reb||0)+(statEntry.ast||0);
  if(statType==='pra' || statType==='dd') return (statEntry.pts||0)+(statEntry.reb||0)+(statEntry.ast||0);
  if(statType==='parlay') return statEntry.pts ?? null;
  const val = statEntry[statType];
  return val !== undefined && val !== null ? val : null;
}

// Auto-settle a duel. Handles both team-win duels and player-stat duels.
// Returns true if settled, false if data not yet available.
// A player "sat out" a date if his team's completed game has persisted stats
// (teammates saved) but he has none. Stats are only saved for final games.
function playerSatOut(pid, dateStr){
  const p = getPlayer(pid); if(!p) return false;
  if(findSavedStat(pid, dateStr)) return false;
  const team = (p.team||'').toUpperCase();
  for(const v of Object.values(leagueState.playerStats||{})){
    if(String(v.date) !== dateStr || String(v.pid) === String(p.id)) continue;
    if((getPlayer(v.pid)?.team||'').toUpperCase() === team) return true;
  }
  return false;
}

// Banner text when today's duel is (or is about to be) voided, else null.
function getDuelVoidNotice(){
  const duel = getTodaysDuel();
  if(!duel || duel.type === 'team' || duel.stat === 'team') return null;
  if(duel.result === 'void') return `Due to ${duel.voidReason || 'a player not playing'}, today's Daily Duel will not count.`;
  if(duel.result !== null && duel.result !== undefined) return null;
  const out = [duel.pid1, duel.pid2].map(getPlayer).filter(p => p && injuryInfo(p.name)?.isOut);
  if(!out.length) return null;
  return `Due to ${out.map(p=>`${p.name}'s status (OUT)`).join(' and ')}, today's Daily Duel will not count.`;
}

// Final scores for a date from ESPN: {TEAM: {score, opp, oppScore, final}} (cached once all final)
const _finalsCache = {};
async function fetchGameFinals(dateKey){
  if(_finalsCache[dateKey]) return _finalsCache[dateKey];
  try{
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateKey.replace(/-/g,'')}`);
    if(!res.ok) return null;
    const data = await res.json(); const out = {}; let allFinal = true;
    for(const ev of (data.events||[])) for(const comp of (ev.competitions||[])){
      const final = !!comp.status?.type?.completed || !!ev.status?.type?.completed;
      if(!final) allFinal = false;
      const cs = (comp.competitors||[]).map(c=>({t:espnToAbbr((c.team?.abbreviation||'').toUpperCase()), s:+c.score||0}));
      if(cs.length===2){ out[cs[0].t]={score:cs[0].s, opp:cs[1].t, oppScore:cs[1].s, final}; out[cs[1].t]={score:cs[1].s, opp:cs[0].t, oppScore:cs[0].s, final}; }
    }
    if(allFinal && Object.keys(out).length) _finalsCache[dateKey] = out;
    return out;
  }catch(e){ return null; }
}

async function autoSettleDuelFromStats(dateKey, silent=false){
  const duel = (leagueState.duels||{})[dateKey];
  if(!duel) return false;
  if(duel.result !== null && duel.result !== undefined) return true; // already done
  const stat = duel.stat || 'pts';

  // ── Team win duel ──
  if(stat === 'team'){
    const t1 = duel.team1; // e.g. 'PHI'
    const t2 = duel.team2; // e.g. 'NYK'
    let g1 = dateKey===todayKey() ? todayGamesCache[t1] : null;
    if(!g1 || !g1.isFinal){
      const f = (await fetchGameFinals(dateKey))?.[t1];
      g1 = f && f.final ? {isFinal:true, myScore:f.score, oppScore:f.oppScore} : null;
    }
    // Need a final game between these two teams
    if(!g1 || !g1.isFinal) return false;
    const score1 = parseFloat(g1.myScore);
    const score2 = parseFloat(g1.oppScore);
    if(isNaN(score1) || isNaN(score2)) return false;
    const result = score1 > score2 ? 1 : score2 > score1 ? 2 : 'tie';
    await settleDuel(dateKey, result, score1, score2);
    if(!silent){
      const winName = result==='tie' ? 'TIE' : (result===1 ? t1 : t2);
      toast(`🏁 Duel auto-settled: ${winName} wins (${score1}–${score2})`);
    }
    return true;
  }

  // ── Player stat duel ──
  const dateStr = dateKey.replace(/-/g,'');
  // Void if either player's game finished without him (DNP) — doesn't count for streaks
  const satOut = [duel.pid1, duel.pid2].filter(pid => playerSatOut(pid, dateStr)).map(getPlayer).filter(Boolean);
  if(satOut.length){
    duel.voidReason = satOut.map(p => `${p.name} not playing`).join(' and ');
    await settleDuel(dateKey, 'void', null, null);
    if(!silent) toast(`Daily Duel voided: ${duel.voidReason}`);
    return true;
  }
  const st1 = findSavedStat(duel.pid1, dateStr);
  const st2 = findSavedStat(duel.pid2, dateStr);
  if(!st1 || !st2) return false; // not enough data yet
  const v1 = getDuelStatValue(st1, stat);
  const v2 = getDuelStatValue(st2, stat);
  if(v1===null || v2===null) return false;
  let result = v1>v2 ? 1 : v2>v1 ? 2 : 'push';
  if(stat==='dd'){
    // Must post a double-double to win; both → bigger PTS+REB+AST; neither → push
    const d1 = isDoubleDouble(st1), d2 = isDoubleDouble(st2);
    duel.dd1 = d1; duel.dd2 = d2;
    result = (d1 && d2) ? result : d1 ? 1 : d2 ? 2 : 'push';
  } else if(stat==='parlay'){
    // Each leg: scores his line AND his team wins. Neither hits → push.
    const f = await fetchGameFinals(dateKey);
    const g = f?.[duel.team1];
    if(!g || !g.final) return false;
    const won1 = g.score > g.oppScore, won2 = g.oppScore > g.score;
    const hit1 = v1 >= duel.line1 && won1, hit2 = v2 >= duel.line2 && won2;
    duel.hit1 = hit1; duel.hit2 = hit2; duel.teamScore1 = g.score; duel.teamScore2 = g.oppScore;
    result = hit1 ? 1 : hit2 ? 2 : 'push';
  }
  await settleDuel(dateKey, result, v1, v2);
  if(!silent){
    const p1 = getPlayer(duel.pid1);
    const p2 = getPlayer(duel.pid2);
    const winName = result==='push' ? 'PUSH' : (result===1 ? p1?.name : p2?.name);
    toast(`🏁 Duel auto-settled: ${winName} wins (${v1} vs ${v2} ${stat.toUpperCase()})`);
  }
  return true;
}

// Admin manual auto-settle button handler
async function adminAutoSettleDuel(dateKey){
  const settled = await autoSettleDuelFromStats(dateKey, false);
  if(!settled) toast('No saved stats yet — enter scores manually');
  renderAdminContent();
}

async function adminRegenerateDuel(){
  const today = todayKey();
  const duel = await autoGenerateDuel(today);
  if(!duel){ toast('Could not generate duel'); return; }
  if(!leagueState.duels) leagueState.duels = {};
  leagueState.duels[today] = duel;
  await saveLeagueState();
  toast('New duel generated!');
  renderHomeScreen();
  renderAdminContent();
}

async function adminAddInjured(){
  const input = document.getElementById('injured-name-input');
  const val = (input?.value||'').trim();
  if(!val){ toast('Enter a player name'); return; }
  if(!leagueState.injuredPlayers) leagueState.injuredPlayers = [];
  if(leagueState.injuredPlayers.includes(val)){ toast('Already on injured list'); return; }
  leagueState.injuredPlayers.push(val);
  await saveLeagueState();
  if(input) input.value = '';
  toast(`${val} added to injured list`);
  renderAdminContent();
}

async function adminRemoveInjured(nameOrId){
  if(!leagueState.injuredPlayers) return;
  leagueState.injuredPlayers = leagueState.injuredPlayers.filter(n=>n!==nameOrId);
  await saveLeagueState();
  toast(`Removed from injured list`);
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
    el.innerHTML=`<div class="matchup-card"><div style="padding:16px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">SEASON STARTS ${fmtRunDate(run.start)}</div></div>`;
    return;
  }
  const isHome=weekMatchup.home===mid;
  const oppId=isHome?weekMatchup.away:weekMatchup.home;
  const opp=leagueState.managers?.find(m=>m.id===oppId);
  const myFP=managerFP(mid);
  const oppFP=managerFP(oppId);
  const myLeading=myFP>oppFP;
  const myName=teamLabel(myProfile)||'Me';
  const oppName=teamLabel(opp)||'Opponent';
  const oppColor=opp?.color||'#4a9eff';
  el.innerHTML=`
  <div class="matchup-card" onclick="showMatchupDetail()" style="cursor:pointer">
    <div class="matchup-header">
      <span>${run.name.toUpperCase()} RUN · ${getWeekLabel()}</span>
      <span style="display:flex;align-items:center;gap:6px">${liveGamesActive?'<span class="live-badge">LIVE</span>':''}<span style="color:var(--accent1)">DETAILS ›</span></span>
    </div>
    <div class="matchup-body">
      <div class="matchup-team">
        <span class="fp${myLeading?' leading':''}">${myFP.toFixed(1)}</span>
        <div class="name">${userLink(mid,myName)}</div>
      </div>
      <div class="matchup-vs">VS</div>
      <div class="matchup-team">
        <span class="fp${!myLeading?' leading':''}">${oppFP.toFixed(1)}</span>
        <div class="name" style="color:${oppColor}">${userLink(oppId,oppName)}</div>
      </div>
    </div>
  </div>`;
}

// Box score for any matchup. No args = my current matchup.
function showMatchupDetail(homeId, awayId, runId, weekIdx){
  const run = runId ? RUNS.find(r=>r.id===runId) : getCurrentRun();
  if(!run || !leagueState) return;
  const curIdx = getCurrentWeekIndex(run.id);
  if(homeId===undefined){
    const mid=getMyId(); const mu=findMyMatchup(mid, run.id); if(!mu) return;
    homeId = mid; awayId = mu.home===mid ? mu.away : mu.home; weekIdx = curIdx;
  }
  if(weekIdx===undefined) weekIdx = curIdx;
  const r = runWeekRange(run.id, weekIdx);
  const isCurrent = weekIdx===curIdx, isFuture = weekIdx>curIdx;
  const mgr = id => (leagueState.managers||[]).find(m=>String(m.id)===String(id)) || {id, display_name:'?', color:'#4a9eff'};
  const A = mgr(homeId), B = mgr(awayId);
  const rowsA = teamRowsForRange(A.id, r.from, r.to, isCurrent), rowsB = teamRowsForRange(B.id, r.from, r.to, isCurrent);
  const sum = rows => +rows.reduce((a,x)=>a+x.fp,0).toFixed(1);
  const fpA = isCurrent ? managerFP(A.id) : sum(rowsA), fpB = isCurrent ? managerFP(B.id) : sum(rowsB);
  const aLead = fpA>=fpB;
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const status = isFuture ? 'UPCOMING' : isCurrent ? 'THIS WEEK' : 'FINAL';
  const tag = {active:'', bench:' <span style="color:var(--text3);font-size:4.5px">BENCH</span>', ir:' <span style="color:#805ad5;font-size:4.5px">IR</span>', dropped:' <span style="color:var(--text3);font-size:4.5px">DROPPED</span>'};
  const col = (m, rows) => {
    const shown = rows.filter(x=>x.fp!==0 || x.status==='active' || isFuture);
    return `<div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:${m.color||'var(--accent1)'};margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${m.color||'var(--accent1)'}">${teamLabel(m).toUpperCase()}</div>
      ${shown.map(x=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:4px;padding:5px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0"><div onclick="${pcardOnclick(x.p.name)}" style="cursor:pointer;font-family:var(--pixel);font-size:6px;color:var(--text1)">${playerShortName(x.p.name)}${tag[x.status]}</div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3)">${x.p.pos} · ${x.p.team}</div></div>
        <div style="font-family:var(--pixel);font-size:7px;color:${x.fp>0?'var(--accent3)':'var(--text3)'};white-space:nowrap">${x.isLive?'<span style="color:var(--accent4);font-size:4.5px">LIVE </span>':''}${x.fp.toFixed(1)}</div>
      </div>`).join('') || '<div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO PLAYERS</div>'}
    </div>`;
  };
  document.getElementById('matchup-detail-modal')?.remove();
  const modal=document.createElement('div');
  modal.id='matchup-detail-modal'; modal.className='top-sheet-overlay';
  modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
  modal.innerHTML=`<div class="top-sheet">
    <div style="padding:14px 16px 0;flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent3)">${run.name.toUpperCase()} · WEEK ${weekIdx+1} · ${fmt(r.mon)} – ${fmt(r.sun)} · ${status}</div>
        <button onclick="document.getElementById('matchup-detail-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-around;padding:12px;background:var(--bg3);border-radius:var(--radius);margin-bottom:12px">
        <div style="text-align:center">
          <div style="font-family:var(--pixel);font-size:16px;color:${!isFuture&&aLead?'var(--accent2)':'var(--text2)'}">${isFuture?'—':fpA.toFixed(1)}</div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:${A.color||'var(--text3)'};margin-top:4px">${userLink(A.id,teamLabel(A))}</div>
        </div>
        <div style="font-family:var(--pixel);font-size:8px;color:var(--text3)">VS</div>
        <div style="text-align:center">
          <div style="font-family:var(--pixel);font-size:16px;color:${!isFuture&&!aLead?'var(--accent2)':'var(--text2)'}">${isFuture?'—':fpB.toFixed(1)}</div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:${B.color||'var(--text3)'};margin-top:4px">${userLink(B.id,teamLabel(B))}</div>
        </div>
      </div>
    </div>
    <div class="top-sheet-body">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px">${col(A,rowsA)}${col(B,rowsB)}</div>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function showFantasyRulesModal(){
  let modal=document.getElementById('fantasy-rules-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='fantasy-rules-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';

  const section=(title,color,body)=>`
    <div style="margin-bottom:18px">
      <div style="font-family:var(--pixel);font-size:6.5px;color:${color};margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">${title}</div>
      ${body}
    </div>`;

  const row=(label,value)=>`
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">${label}</span>
      <span style="font-family:var(--pixel);font-size:6px;color:var(--text1);text-align:right;max-width:55%">${value}</span>
    </div>`;

  const runsHtml=RUNS.map(r=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div style="width:8px;height:8px;border-radius:50%;background:${r.color};flex-shrink:0"></div>
      <div>
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text1)">${r.name.toUpperCase()}</div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:2px">${r.start} → ${r.end}</div>
      </div>
    </div>`).join('');

  const scoringRows=[
    ['Points','+ 1.0 FP each'],
    ['Rebounds','+ 1.0 FP each'],
    ['Assists','+ 1.0 FP each'],
    ['Steals','+ 1.0 FP each'],
    ['Blocks','+ 1.0 FP each'],
    ['Missed FG','− 1.0 FP each'],
    ['Missed FT','− 1.0 FP each'],
    ['Turnovers','− 1.0 FP each'],
    ['Flagrant Fouls','− 1.0 FP each'],
    ['Technical Fouls','− 1.0 FP each'],
  ].map(([l,v])=>row(l,v)).join('');

  modal.innerHTML=`
    <div class="modal-box" style="max-width:440px;width:calc(100% - 32px);max-height:88vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:var(--pixel);font-size:8px;color:var(--accent1)">📖 FANTASY RULES</div>
        <button onclick="document.getElementById('fantasy-rules-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>

      ${section('ROSTER','var(--accent2)',`
        ${row('Total Roster Size','10 players')}
        ${row('Active (scoring)','8 players')}
        ${row('Inactive (bench)','2 players')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Set players active/inactive each day from the Roster tab. Your top-FP player cannot be dropped.
        </div>
      `)}

      ${section('SCORING','var(--accent3)',`
        ${scoringRows}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Only your 8 active players score each week. Stats are updated from live NBA box scores.
        </div>
      `)}

      ${section('MATCHUPS','var(--accent1)',`
        ${row('Schedule','Weekly · Mon – Sun')}
        ${row('Scoring period','Each run has its own standings')}
        ${row('Tiebreaker','Total FP for the run')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Head-to-head matchups reset every Monday. Win your matchup by scoring more FP than your opponent across all active players that week.
        </div>
      `)}

      ${section('WAIVERS','var(--accent4)',`
        ${row('Waiver claims per week','3 max')}
        ${row('Claim window','Mon – Sun · resets Monday')}
        ${row('Free agents','Claim anytime if roster < 10')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Drop a player to make room before claiming off waivers if your roster is full. Claims are first-come, first-served.
        </div>
      `)}

      ${section('LINEUP CHANGES','var(--accent1)',`
        ${row('Setting','Daily')}
        ${row('Locks','Each player locks at his own tip-off')}
        ${row('Unlocks','Next day')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Each player locks when his game tips off. Once locked, he can't be moved between Active and Bench until the next day. Players whose games haven't started stay movable, so you can still adjust for late games.
        </div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Only Active players earn FP. FP a player earns while Active stays with your team for the matchup, even if you bench or drop him later. A player who plays while on your Bench earns nothing.
        </div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          This takes daily attention to the schedule: swap in hot players, bench injured ones, and pick up free agents throughout the week. The more involved, the better your team.
        </div>
      `)}

      ${section('INJURY RESERVE (IR)','var(--accent4)',`
        ${row('IR slots','1 per team')}
        ${row('Eligible','Players listed OUT only')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Each team may place one injured player on the IR. While a player is on IR, you may carry an extra player on your roster beyond the 10-player limit. To remove a player from IR, you must first have no more than 9 other players on your roster.
        </div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text2);margin:12px 0 6px">PLAYER STATUS BADGES</div>
        ${[
          ['OUT','#e53e3e','Out','Will not play.','YES'],
          ['DOUBT','#dd6b20','Doubtful','Unlikely to play.','NO'],
          ['Q','#d69e2e','Questionable','Uncertain; decided close to tip-off.','NO'],
          ['DTD','#d69e2e','Day-To-Day','Minor injury; may play any given day.','NO'],
          ['PROB','#38a169','Probable','Expected to play.','NO'],
        ].map(([lbl,c,name,desc,ok])=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="background:${c};color:#fff;font-family:var(--pixel);font-size:4.5px;padding:2px 5px;border-radius:3px;min-width:34px;text-align:center">${lbl}</span>
          <span style="flex:1;font-family:var(--pixel);font-size:5px;color:var(--text2);line-height:1.6">${name.toUpperCase()} — ${desc}</span>
          <span style="font-family:var(--pixel);font-size:4.5px;color:${ok==='YES'?'var(--accent2)':'var(--text3)'};white-space:nowrap">IR: ${ok}</span>
        </div>`).join('')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Statuses come from the official injury report and refresh every 15 minutes. Players without a badge are healthy. The same OUT rule applies to the Weekly Challenge's one injury swap.
        </div>
      `)}

      ${section('RUNS (SEASONS)','var(--text2)',runsHtml+`
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Each run has its own snake draft and standings. Your roster carries over but is re-drafted at the start of each run.
        </div>
      `)}

      ${section('DRAFT','var(--accent2)',`
        ${row('Format','Snake draft')}
        ${row('Rounds','10 rounds = 10 players')}
        ${row('Order','Randomized each run')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          The snake draft alternates direction each round. Round 1 goes 1→N, Round 2 goes N→1, and so on. Draft order is re-randomized at the start of every run.
        </div>
      `)}
    </div>`;
  document.body.appendChild(modal);
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
  const now=new Date();
  if(now<mondayOf(runStartDate(run))) return -1;
  return Math.round((mondayOf(now)-mondayOf(runStartDate(run)))/(7*864e5));
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
  const irPid=getIrSlot(mid);
  const active=(getMyActive().length ? getMyActive() : autoActiveFor(mid)).filter(p=>p!==irPid);
  // Always derive bench from roster minus active minus IR — never rely solely on
  // leagueState.inactive, which only stores explicitly-benched players and misses
  // anyone who was never explicitly set (e.g. default bench players).
  const inactive=roster.filter(p=>!active.includes(p) && p!==irPid);

  const rowHtml=(pid,slotType)=>{
    // slotType: 'active' | 'inactive' | 'ir'
    const p=getPlayer(pid); if(!p) return '';
    const fp=playerTotalFP(pid);
    const isLive=livePlayerStats[pid]?.live;
    const isActive=slotType==='active';
    const isOnIR=slotType==='ir';
    const port=playerPortraits[p.name];
    const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:${myProfile?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    // Game info for today
    const gameInfo = getTodayGameInfo(p.team, p.id);
    const gameLabel = gameInfo
      ? `<span style="font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    // Toggle button
    const toggleBtn = isOnIR ? '' : isPlayerLocked(p) ? `<span style="font-family:var(--pixel);font-size:5px;color:var(--text3)">🔒 LOCKED</span>` : isActive
      ? `<button class="btn btn-sm" style="font-size:5px;padding:3px 7px;min-height:22px;background:transparent;border:1px solid var(--accent4);color:var(--accent4)" onclick="toggleActiveStatus('${mid}',${pid})">Bench</button>`
      : `<button class="btn btn-sm" style="font-size:5px;padding:3px 7px;min-height:22px;background:transparent;border:1px solid var(--accent2);color:var(--accent2)" onclick="toggleActiveStatus('${mid}',${pid})">Activate</button>`;
    return `
    <div class="player-row"${isOnIR?` style="background:rgba(128,90,213,0.06)"`:''}>
      <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name}${injuryBadgeHtml(p.name)}${isLive?' <span class="live-badge" style="font-size:4px;padding:1px 4px">LIVE</span>':''}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="player-fp">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        ${toggleBtn}
      </div>
    </div>`;
  };

  // IR section always shows, with a placeholder when empty
  const irRow = `
    <div class="lineup-section">
      <div class="lineup-section-label" style="color:#805ad5">🏥 INJURY RESERVE (${irPid?1:0}/1)</div>
      ${irPid ? rowHtml(irPid,'ir') : `<div style="padding:8px 14px 12px;font-family:var(--pixel);font-size:5px;color:var(--text3);line-height:1.8">NO PLAYER ON IR · ONLY PLAYERS LISTED <span style="color:#e53e3e">OUT</span> CAN BE PLACED HERE</div>`}
    </div>`;

  el.innerHTML=`
  <div class="lineup-card">
    <div class="lineup-section">
      <div class="lineup-section-label active-label">
        ✅ ACTIVE <span class="count">(${active.length}/${ACTIVE_SIZE})</span>
      </div>
      ${active.map(pid=>rowHtml(pid,'active')).join('')}
    </div>
    ${inactive.length ? `
    <div class="lineup-section">
      <div class="lineup-section-label inactive-label">
        ❌ BENCH <span class="count">(${inactive.length})</span>
      </div>
      ${inactive.map(pid=>rowHtml(pid,'inactive')).join('')}
    </div>` : ''}
    ${irRow}
  </div>`;
}

function renderQuickStats(){
  fillMatchupResults();
  const el=document.getElementById('quick-stats-container');
  if(!el) return;
  const mid=getMyId();
  if(!mid){ el.innerHTML=''; return; }
  const run=getCurrentRun();
  const myFP=seasonFP(mid, run.id); // whole run so far (finished weeks + this week)
  // Week MVP: most FP earned FOR THIS TEAM this week (Active games only; counts
  // players since dropped, ignores points scored elsewhere or on the bench)
  const weekRows=teamWeekRows(mid).filter(r=>r.fp>0);
  const mvp=weekRows.length ? weekRows.reduce((a,b)=>b.fp>a.fp?b:a) : null;
  const topP=mvp ? mvp.p : null;

  // Compute standings rank
  const allMgrs=leagueState.managers||[];
  const runSchedule=(leagueState.schedule||{})[currentRun]||[];
  const mgrStats=allMgrs.map(m=>{
    let w=0,l=0;
    runSchedule.forEach(week=>week.forEach(mu=>{
      if(mu.home===m.id||mu.away===m.id){
        if(!mu.winner) return;
        if(mu.winner===m.id) w++; else if(mu.winner!=='tie') l++;
      }
    }));
    return {id:m.id, wins:w, losses:l, fp:managerFP(m.id)};
  });
  mgrStats.sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:b.fp-a.fp);
  const rank=mgrStats.findIndex(m=>m.id===mid)+1;
  const total=allMgrs.length;
  const rankStr=rank>0?`${rank}/${total}`:'—';
  const myRecord=mgrStats.find(m=>m.id===mid);
  const record=myRecord?`${myRecord.wins}-${myRecord.losses}`:'0-0';

  el.innerHTML=`
  <div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
    <div style="text-align:center;border-right:1px solid var(--border);padding-right:6px">
      <div style="font-family:var(--pixel);font-size:16px;color:var(--accent3)">${myFP.toFixed(1)}</div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">${run.name.toUpperCase()} FP</div>
    </div>
    <div style="text-align:center;border-right:1px solid var(--border);padding:0 4px">
      <div style="font-family:var(--pixel);font-size:11px;color:var(--accent1)">${rankStr}</div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">STANDINGS</div>
    </div>
    <div style="text-align:center;padding-left:4px">
      <div onclick="${topP?pcardOnclick(topP.name):''}" style="cursor:pointer;font-family:var(--pixel);font-size:10px;color:var(--accent2)">${topP ? playerShortName(topP.name) : '—'}</div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">WEEK MVP · ${mvp?mvp.fp.toFixed(1)+' FP':'—'}</div>
    </div>
  </div>`;
}

// ── FANTASY SCREEN ───────────────────────────────────────────────────────────
let currentFantasyTab = 'standings';

function switchFantasyTab(tab){
  currentFantasyTab = tab;
  document.querySelectorAll('.fantasy-sub-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.fantasy-sub-pane').forEach(p=>{
    p.classList.toggle('active', p.id === 'fantasy-pane-'+tab);
  });
  if(tab==='standings'){
    renderFantasyRunContent(); // render immediately with cached data
    syncManagersToState().then(()=>renderFantasyRunContent()); // re-render with fresh data
  }
  else if(tab==='schedule'){ scheduleWeekOffset=0; renderFantasySchedule(); }
  else if(tab==='roster') renderRostersScreen();
  else if(tab==='waivers'){ resetWaiverFilters(); renderWaiversPane(); }
  else if(tab==='draft') renderFantasyDraftPane();
}

function scheduleNavWeek(delta){
  const schedule=(leagueState.schedule||{})[currentRun]||[];
  const curIdx=getCurrentWeekIndex(currentRun);
  // If pre-season (curIdx < 0), treat display base as week 0 for nav purposes
  const baseIdx=curIdx<0?0:curIdx;
  const newOffset=scheduleWeekOffset+delta;
  const newIdx=baseIdx+newOffset;
  if(newIdx<0 || newIdx>=schedule.length) return;
  scheduleWeekOffset=newOffset;
  renderFantasySchedule();
}

// Runs open for selection. Add a run id here when its content is ready (Winter = 2).
const ENABLED_RUNS = [1];
// Run dropdown + "Week X of Y · ends …" progress bar
function renderRunBar(){
  const el=document.getElementById('run-bar'); if(!el) return;
  const run=RUNS.find(r=>r.id===currentRun); if(!run) return;
  const total=runWeekCount(run.id), cur=getCurrentWeekIndex(run.id);
  const now=new Date(), ended=now>runEndDate(run);
  const end=runEndDate(run).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const startTxt=runStartDate(run).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const left = cur<0 ? `STARTS ${startTxt.toUpperCase()}` : ended ? 'RUN COMPLETE' : `WEEK ${cur+1} OF ${total}`;
  const right = cur<0 ? `${total} WEEKS` : ended ? `ENDED ${end.toUpperCase()}` : `ENDS ${end.toUpperCase()}`;
  const pct = cur<0 ? 0 : ended ? 100 : Math.min(100, Math.round((now-mondayOf(runStartDate(run)))/(runEndDate(run)-mondayOf(runStartDate(run)))*100));
  el.style.setProperty('--run-color', run.color);
  el.innerHTML=`
    <select aria-label="Select run" onchange="switchRun(+this.value)">
      ${RUNS.map(r=>`<option value="${r.id}" ${r.id===currentRun?'selected':''} ${ENABLED_RUNS.includes(r.id)?'':'disabled'}>${r.name.toUpperCase()} RUN${ENABLED_RUNS.includes(r.id)?'':' · SOON'}</option>`).join('')}
    </select>
    <div class="run-progress">
      <div class="run-progress-text"><span style="color:var(--text1)">${left}</span><span>${right}</span></div>
      <div class="run-progress-track"><div class="run-progress-fill" style="width:${pct}%"></div></div>
    </div>`;
}

function switchRun(runId){
  if(!ENABLED_RUNS.includes(runId)) return;
  currentRun=runId;
  renderRunBar();
  if(currentFantasyTab==='standings'){
    renderFantasyRunContent();
    syncManagersToState().then(()=>renderFantasyRunContent());
  }
  else if(currentFantasyTab==='schedule') renderFantasySchedule();
}

function renderFantasyScreen(){
  renderRunBar();
  switchFantasyTab(currentFantasyTab);
}

let draftFilter = { availability:'available', team:'all', sort:'fp', rookie:false };
let draftSearchQuery = '';

// SHOW / SORT filter row for Draft and Waivers. Lives in its own container and is
// repainted by the list renderers, so the selected button is always highlighted.
// "Out" or an unrecognized injury status (shown as e.g. "INJUR"). Questionable,
// Doubtful, Day-To-Day and Probable players may still play, so they stay visible.
function isOutOrInjured(name){
  const i = injuryInfo(name);
  return !!i && (i.label==='OUT' || !['DOUBT','Q','DTD','PROB'].includes(i.label));
}

function filterRowHtml(kind){
  const f = kind==='draft' ? draftFilter : waiverFilter;
  const fv = kind==='draft' ? 'draftFilter' : 'waiverFilter';
  const list = kind==='draft' ? 'renderDraftPlayerList()' : 'renderWaiverPlayerList()';
  const btn=(label,active,set)=>`<button onclick="${fv}.${set};${list}" style="background:${active?'var(--accent1)':'var(--bg3)'};color:${active?'#000':'var(--text2)'};border:1px solid ${active?'var(--accent1)':'var(--border)'};border-radius:20px;padding:5px 10px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;white-space:nowrap">${label}</button>`;
  const avail = f.availability==='all' ? 'all' : 'available';
  const sort = f.sort==='alpha' ? 'alpha' : 'fp';
  return `
    <div class="frow-group">
    <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">SHOW</span>
    ${btn('Available', avail==='available', "availability='available'")}
    ${btn('All Players', avail==='all', "availability='all'")}
    ${kind==='draft' ? btn('🌟 Rookies', !!f.rookie, 'rookie=!draftFilter.rookie') : ''}
    ${kind==='waiver' ? btn('🚫 Hide Out/Inj', !!f.hideOut, 'hideOut=!waiverFilter.hideOut') : ''}
    </div>
    <div class="frow-group sort">
    <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">SORT</span>
    ${btn('⬆ FP', sort==='fp', "sort='fp'")}
    ${btn('A–Z', sort==='alpha', "sort='alpha'")}
    </div>`;
}
function refreshFilterRow(kind){
  const el = document.getElementById(kind+'-filter-row');
  if(el) el.innerHTML = filterRowHtml(kind);
}

function renderDraftPlayerList(){
  refreshFilterRow('draft');
  const el=document.getElementById('draft-player-list');
  if(!el) return;
  const now=new Date();
  const dw=DRAFT_WINDOWS.find(d=>d.run===currentRun);
  const draftStart=dw?new Date(dw.start):null;
  const draftEnd=dw?new Date(dw.end):null;
  const isDraftLive=dw && now>=draftStart && now<=draftEnd;
  const mid=getMyId();
  const allRostered=new Set(Object.values(leagueState.rosters||{}).flat());
  const query=draftSearchQuery.toLowerCase();

  let players=PLAYERS.filter(p=>{
    if(draftFilter.availability==='available' && allRostered.has(p.id)) return false;
    if(draftFilter.team!=='all' && p.team!==draftFilter.team) return false;
    if(draftFilter.rookie){
      // Rookies = BDL years_experience === 0, OR draft_year === 2026 if yearsExp unavailable
      const isRookiePlayer = p.yearsExp === 0 || (p.yearsExp === null && p.draftYear === 2026);
      if(!isRookiePlayer) return false;
    }
    if(query && !p.name.toLowerCase().includes(query) && !p.team.toLowerCase().includes(query) && !p.pos.toLowerCase().includes(query)) return false;
    return true;
  });

  if(draftFilter.sort==='fp'){
    players=[...players].sort((a,b)=>{
      const liveFP = id => playerTotalFP(id) || 0;
      const bScore = liveFP(b.id) || getPlayerProjFP(b);
      const aScore = liveFP(a.id) || getPlayerProjFP(a);
      return bScore - aScore;
    });
  } else {
    players=[...players].sort((a,b)=>a.name.localeCompare(b.name));
  }

  const canDraft=mid && getMyRoster().length<effectiveRosterSize(mid);

  el.innerHTML = !players.length
    ? `<div class="empty-state"><div class="icon">🔍</div><div class="label">NO PLAYERS FOUND</div></div>`
    : `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
      ${players.map(p=>{
        const fp=playerTotalFP(p.id);
        const rostered=allRostered.has(p.id);
        const draftedBy = rostered ? (leagueState.managers||[]).find(m=>(leagueState.rosters?.[m.id]||[]).includes(p.id)) : null;
        const port=playerPortraits[p.name];
        const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:var(--text3);font-size:7px">${initials(p.name)}</div>`;
        const dbP=PLAYERS_DB.find(d=>d.n===p.name);
        const projFPVal = getPlayerProjFP(p);
        const projLabel = (dbP?.fpPG || BDL_STATS[p.name]?.fpPG) ? 'proj FP/G' : '~proj FP/G';
        // Rookie = BDL years_experience === 0, OR draft_year === 2026 if yearsExp unavailable
        const isRookie = p.yearsExp === 0 || (p.yearsExp === null && p.draftYear === 2026);
        const rookieBadge = isRookie ? `<span style="background:var(--accent3);color:#000;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px">ROOKIE</span>` : '';
        const inj = getInjuryStatus(p.name);
        const injBadge = injuryBadgeHtml(p.name);
        const projLine=`<div class="player-meta" style="color:var(--accent3)">${projFPVal} ${projLabel}</div>`;
        return `
        <div class="player-row" style="padding:8px 14px">
          <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
          <div class="player-info">
            <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name}${rookieBadge}${injBadge}</div>
            <div class="player-meta">${p.pos} · ${p.team}</div>
            <div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>
            ${projLine}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="player-fp" style="font-size:10px">${fp>0?fp.toFixed(1)+'<span class="fp-label">FP</span>':''}</div>
            ${rostered
              ? `<span style="font-family:var(--pixel);font-size:5px;color:var(--text3);text-align:right">DRAFTED${draftedBy?`<br/><span style="color:var(--accent2)">${teamLabel(draftedBy)}</span>`:''}</span>`
              : isDraftLive&&canDraft
                ? `<button class="btn btn-sm btn-primary" style="font-size:5px;padding:4px 8px;min-height:24px" onclick="confirmDraftPick(${JSON.stringify(mid)},${p.id})">DRAFT</button>`
                : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderFantasyDraftPane(){
  const el=document.getElementById('fantasy-draft-content');
  if(!el) return;
  const run=RUNS.find(r=>r.id===currentRun);
  const now=new Date();
  const dw=DRAFT_WINDOWS.find(d=>d.run===currentRun);
  const draftStart=dw?new Date(dw.start):new Date(run.start);
  const draftEnd=dw?new Date(dw.end):null;
  const isDraftLive=dw && now>=draftStart && now<=draftEnd;
  const isDraftPast=draftEnd && now>draftEnd;

  const teamDropdown=`<select onchange="draftFilter.team=this.value;renderDraftPlayerList()" style="background:var(--bg3);color:var(--text1);border:1px solid var(--border);border-radius:var(--radius);padding:5px 8px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;flex:1;min-width:0">
    <option value="all" ${draftFilter.team==='all'?'selected':''}>All Teams</option>
    ${NBA_TEAMS_LIST.map(t=>`<option value="${t}" ${draftFilter.team===t?'selected':''}>${t} — ${NBA_TEAMS[t]||t}</option>`).join('')}
  </select>`;

  // Build draft order panel
  let draftOrderPanel = '';
  const draftRecord = dw ? (leagueState.drafts||{})[dw.run] : null;
  const isDraftComplete = draftRecord?.status === 'complete';
  if(isDraftComplete){
    draftOrderPanel = `<div style="background:rgba(0,255,136,.10);border:1px solid var(--accent1);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px;text-align:center">
      <div style="font-family:var(--pixel);font-size:8px;color:var(--accent1);margin-bottom:4px">✓ DRAFT COMPLETE</div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text2)">All 10 rosters are set — good luck this season!</div>
    </div>`;
  } else if(isDraftLive || !isDraftPast){
    const runId = dw?.run;
    const managers = leagueState.managers||[];
    if(managers.length && runId){
      const orderedMgrs = getDraftOrder(runId); // uses shuffled order if live, signup order otherwise
      const draft = (leagueState.drafts||{})[runId];
      const currentPick = draft?.currentPick || 0;
      const n = orderedMgrs.length;
      // Show current round + a couple picks ahead
      const totalRounds = 15; // or use effectiveRosterSize
      const rows = [];
      for(let i=0;i<Math.min(totalRounds*n, currentPick+n+2);i++){
        const round=Math.floor(i/n);
        const posInRound=i%n;
        const idx=round%2===0?posInRound:(n-1-posInRound);
        const mgr=orderedMgrs[idx];
        const isPast=i<currentPick;
        const isCurrent=i===currentPick;
        const isNext=i===currentPick+1;
        if(isPast) continue; // skip already-made picks
        const bg=isCurrent?'var(--accent2)':isNext?'rgba(255,255,255,.07)':'transparent';
        const color=isCurrent?'#000':'var(--text1)';
        const label=isCurrent?'🎯 ON CLOCK':'';
        rows.push(`<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;background:${bg}">
          <span style="font-family:var(--pixel);font-size:5px;color:${isCurrent?'#000':'var(--text3)'};min-width:28px">R${round+1}P${posInRound+1}</span>
          <span style="font-family:var(--pixel);font-size:6px;color:${color};flex:1">${mgr?teamLabel(mgr):'?'}</span>
          ${label?`<span style="font-family:var(--pixel);font-size:5px;color:#000">${label}</span>`:''}
        </div>`);
        if(rows.length>=n+2) break; // show full current round + 2 picks into next
      }
      if(rows.length){
        draftOrderPanel=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:8px;margin-bottom:10px">
          <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:6px;letter-spacing:.05em">${isDraftLive?'🔴 DRAFT LIVE — ':'📋 '}PICK ORDER</div>
          ${rows.join('')}
        </div>`;
      }
    }
  }

  const draftBanner = !isDraftComplete && !isDraftLive && !isDraftPast
    ? `<div style="background:rgba(245,166,35,.12);border:1px solid var(--accent3);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px;font-family:var(--pixel);font-size:6px;color:var(--accent3)">📋 DRAFT STARTS OCT 18 AT 8:30PM ET — Browse the player pool below</div>`
    : '';

  el.innerHTML=`
    <div style="padding:10px 14px 0">
      ${draftBanner}
      ${draftOrderPanel}
      <div id="draft-filter-row" style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">${filterRowHtml('draft')}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">NBA TEAM</span>
        ${teamDropdown}
      </div>
      <input type="text" id="draft-search" placeholder="Search players..."
        style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;font-family:var(--pixel);font-size:7px;color:var(--text1);outline:none;margin-bottom:8px;-webkit-appearance:none;appearance:none"
        oninput="draftSearchQuery=this.value;renderDraftPlayerList()"/>
    </div>
    <div id="draft-player-list"></div>`;

  renderDraftPlayerList();
}

async function confirmDraftPick(mid, pid){
  // Client-side lock: prevent double-submit if button is clicked multiple times
  // while the async save is in flight
  if(draftPickInFlight){ toast('Pick in progress...'); return; }
  draftPickInFlight = true;

  try {
    const p=getPlayer(pid); if(!p){ draftPickInFlight=false; return; }
    const dw=DRAFT_WINDOWS.find(d=>d.run===currentRun);
    if(!dw){ draftPickInFlight=false; return; }
    const runId=dw.run;

    // Re-fetch fresh state from Supabase to avoid race conditions
    // (multiple users clicking DRAFT simultaneously would otherwise all read
    //  the same stale currentPick and each save currentPick+1, causing picks to overlap)
    await loadLeagueState();

    // Ensure draft record + shuffled order exist (uses freshly loaded state)
    const draft = ensureDraftRecord(runId);

    // Turn enforcement: verify it's actually this manager's turn
    const managers = getDraftOrder(runId);
    const pick = draft.currentPick || 0;
    const round = Math.floor(pick / managers.length);
    const posInRound = pick % managers.length;
    const idx = round % 2 === 0 ? posInRound : (managers.length - 1 - posInRound);
    const onClockId = managers[idx]?.id;
    if(onClockId != mid){  // loose equality: handles string/number mismatch
      const onClockName = teamLabel(managers[idx]) || 'someone else';
      toast(`Not your turn! ${onClockName} is on the clock.`);
      return;
    }

    const roster=(leagueState.rosters||{})[mid]||[];
    if(roster.length>=effectiveRosterSize(mid)){ toast('Roster full!'); return; }
    const allRostered=new Set(Object.values(leagueState.rosters||{}).flat());
    if(allRostered.has(pid)){ toast('Player already drafted'); return; }

    if(!leagueState.rosters) leagueState.rosters={};
    if(!leagueState.rosters[mid]) leagueState.rosters[mid]=[];
    leagueState.rosters[mid].push(pid);
    draft.currentPick=(draft.currentPick||0)+1;

    await saveLeagueState();
    toast(`${p.name} DRAFTED! ✓`);
    renderFantasyDraftPane();
  } finally {
    draftPickInFlight = false;
  }
}

function renderFantasySchedule(){
  const el=document.getElementById('fantasy-schedule-content');
  if(!el) return;
  const labelEl=document.getElementById('schedule-week-label');
  const prevBtn=document.getElementById('schedule-prev-btn');
  const nextBtn=document.getElementById('schedule-next-btn');
  const managers=leagueState.managers||[];
  if(!managers.length){
    el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">📅</div><div class="label">SCHEDULE GENERATES<br/>AFTER DRAFT</div></div>`;
    if(labelEl) labelEl.textContent='';
    return;
  }
  let schedule=(leagueState.schedule||{})[currentRun]||[];
  // Auto-generate schedule if draft is complete and schedule is missing
  if(!schedule.length && managers.length>=2){
    const dw = DRAFT_WINDOWS.find(d=>d.run===currentRun);
    const draftDone = dw && (leagueState.drafts||{})[dw.run]?.status==='complete';
    if(draftDone){
      // Generate and persist (async, but render immediately after)
      (async()=>{
        const sched={};
        for(const run of RUNS){ sched[run.id]=buildRoundRobinSchedule(managers.map(m=>m.id),run.id); }
        leagueState.schedule=sched;
        await saveLeagueState();
        renderFantasySchedule();
      })();
      el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">⏳</div><div class="label">GENERATING SCHEDULE…</div></div>`;
      if(labelEl) labelEl.textContent='';
      return;
    }
    el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">📅</div><div class="label">NO SCHEDULE YET</div></div>`;
    if(labelEl) labelEl.textContent='';
    return;
  }
  if(!schedule.length){
    el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">📅</div><div class="label">NO SCHEDULE YET</div></div>`;
    if(labelEl) labelEl.textContent='';
    return;
  }
  const run=RUNS.find(r=>r.id===currentRun);
  const myId=getMyId();
  const getM=id=>managers.find(m=>m.id===id)||{id,display_name:'???',color:'#4a9eff'};
  const curWeekIdx=getCurrentWeekIndex(currentRun);
  const displayIdx=(curWeekIdx<0?0:curWeekIdx)+scheduleWeekOffset;
  const clampedIdx=Math.max(0,Math.min(displayIdx,schedule.length-1));
  if(clampedIdx!==displayIdx) scheduleWeekOffset=clampedIdx-(curWeekIdx<0?0:curWeekIdx);

  fillMatchupResults();

  const fmtDate=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});

  const wi=clampedIdx;
  const {mon:monDate, sun:sunDate}=runWeekRange(currentRun, wi);
  const isCurrent=wi===curWeekIdx;
  const isPast=wi<curWeekIdx;
  const week=schedule[wi]||[];

  // Update nav label
  if(labelEl){
    const weekLabel=isCurrent?'▶ THIS WEEK':isPast?'WEEK '+(wi+1)+' · FINAL':'WEEK '+(wi+1)+' · UPCOMING';
    labelEl.innerHTML=`<div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">${weekLabel}</div><div style="font-family:var(--pixel);font-size:6.5px;color:var(--text1);margin-top:2px">${fmtDate(monDate)} – ${fmtDate(sunDate)}</div>`;
  }
  if(prevBtn) prevBtn.style.opacity=wi>0?'1':'0.3';
  if(nextBtn) nextBtn.style.opacity=wi<schedule.length-1?'1':'0.3';

  let html='<div style="height:8px"></div><div class="schedule-week">';
  week.forEach(matchup=>{
    const h=getM(matchup.home), a=getM(matchup.away);
    const isMine=matchup.home===myId||matchup.away===myId;
    let hFPStr='—', aFPStr='—', hWin=false, aWin=false;
    if(isPast||isCurrent){
      const hFP=isPast?(matchup.homeFP||0):managerFP(matchup.home), aFP=isPast?(matchup.awayFP||0):managerFP(matchup.away);
      hFPStr=hFP.toFixed(1); aFPStr=aFP.toFixed(1);
      if(isPast&&matchup.winner){ hWin=matchup.winner===matchup.home; aWin=matchup.winner===matchup.away; }
      else if(isCurrent){ hWin=hFP>aFP; aWin=aFP>hFP; }
    }
    html+=`<div class="schedule-matchup-row${isMine?' is-mine':''}" onclick="showMatchupDetail('${matchup.home}','${matchup.away}',${currentRun},${wi})" style="cursor:pointer">
      <div class="schedule-team-cell">
        ${userAvatar(h,22,7)}
        <span class="schedule-name" style="color:${h.color||'var(--text1)'}">${userLink(h.id,teamLabel(h))}</span>
      </div>
      <div class="schedule-score">
        <span class="schedule-fp" style="${hWin?'color:var(--accent2)':isPast?'color:var(--text3)':''}">${hFPStr}</span>
        <span class="schedule-vs">VS</span>
        <span class="schedule-fp" style="${aWin?'color:var(--accent2)':isPast?'color:var(--text3)':''}">${aFPStr}</span>
      </div>
      <div class="schedule-team-cell right">
        <span class="schedule-name" style="color:${a.color||'var(--text1)'}">${userLink(a.id,teamLabel(a))}</span>
        ${userAvatar(a,22,7)}
      </div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

function renderFantasyRunContent(){
  const el=document.getElementById('fantasy-run-content');
  if(!el) return;
  const run=RUNS.find(r=>r.id===currentRun);
  const managers=leagueState.managers||[];
  if(!managers.length){
    // Show loading spinner — syncManagersToState() will re-render once data arrives
    el.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon" style="animation:spin 1s linear infinite;display:inline-block">⏳</div><div class="label" style="margin-top:8px">LOADING...</div></div>`;
    return;
  }

  // Pre-draft: no schedule yet — show enrolled teams waiting for the draft
  const hasDraftHappened = Object.keys(leagueState.rosters||{}).some(id=>(leagueState.rosters[id]||[]).length>0);
  const draftWindow = DRAFT_WINDOWS.find(d=>d.run===currentRun);
  const now = new Date();
  const draftStart = draftWindow ? new Date(draftWindow.start) : null;
  const draftEnd = draftWindow ? new Date(draftWindow.end) : null;
  const draftIsToday = draftStart && draftStart.toDateString() === now.toDateString();
  const draftIsComing = draftStart && now < draftStart;
  const draftIsLive = draftStart && draftEnd && now >= draftStart && now <= draftEnd;
  if(!hasDraftHappened){
    const myId=getMyId();
    el.innerHTML=`
    <div style="padding:0 14px">
      <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);padding:12px 0 6px">
        ${run.name.toUpperCase()} RUN · ${fmtRunDate(run.start)} – ${fmtRunDate(run.end)}
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="standings-table" style="width:100%">
        <thead><tr>
          <th style="width:24px">#</th>
          <th>TEAM</th>
          <th style="text-align:right;color:var(--text3)">DRAFT PENDING</th>
        </tr></thead>
        <tbody>
          ${managers.map((m,i)=>`
          <tr class="${m.id===myId?'me':''}">
            <td class="rank">${i+1}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                ${userAvatar(m,24,8)}
                <div>
                  <div class="team-name">${userLink(m.id,teamLabel(m))}</div>
                  ${m.id===myId?'<div style="font-family:var(--pixel);font-size:5px;color:var(--text3)">YOU</div>':''}
                </div>
              </div>
            </td>
            <td style="text-align:right;font-family:var(--pixel);font-size:5px;color:var(--text3)">—</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:16px 14px;text-align:center;font-family:var(--pixel);font-size:5.5px;color:var(--accent3)">
      ${draftIsLive ? `🔴 DRAFT IS LIVE — GO TO THE DRAFT TAB` : draftIsToday ? `🏀 DRAFT TONIGHT AT 8:30 PM ET` : draftIsComing ? `DRAFT STARTS ${fmtRunDate(draftStart.toISOString().slice(0,10))} AT 8:30 PM ET` : `SEASON STARTS ${fmtRunDate(run.start)}`}
    </div>`;
    return;
  }

  // Build standings for this run
  fillMatchupResults();
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
      ${run.name.toUpperCase()} RUN · ${fmtRunDate(run.start)} – ${fmtRunDate(run.end)}
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
              ${userAvatar(s.m,24,8)}
              <span class="team-name">${userLink(s.m.id,teamLabel(s.m))}</span>
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
    <div class="matchup-card" onclick="showMatchupDetail('${matchup.home}','${matchup.away}',${runId},${weekIdx})" style="cursor:pointer;${isMine?'border-color:var(--accent1)':''}">
      <div class="matchup-body" style="padding:10px">
        <div class="matchup-team">
          <span class="fp" style="font-size:14px;${hFP>aFP?'color:var(--accent2)':''}">${hFP.toFixed(1)}</span>
          <div class="name" style="color:${h.color}">${userLink(h.id,teamLabel(h))}</div>
        </div>
        <div class="matchup-vs" style="font-size:7px">VS</div>
        <div class="matchup-team">
          <span class="fp" style="font-size:14px;${aFP>hFP?'color:var(--accent2)':''}">${aFP.toFixed(1)}</span>
          <div class="name" style="color:${a.color}">${userLink(a.id,teamLabel(a))}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── ROSTER SCREEN ────────────────────────────────────────────────────────────
let rostersViewId = null; // which manager's roster to show
let rostersDropMode = false; // true = drop mode active (per-row Drop buttons visible)

function renderRostersScreen(){
  const managers=leagueState.managers||[];
  const myId=getMyId();
  // Default to my own roster
  if(!rostersViewId || !managers.find(m=>m.id===rostersViewId)){
    rostersViewId=myId||managers[0]?.id||null;
  }
  const tabsEl=document.getElementById('rosters-manager-tabs');
  const contentEl=document.getElementById('rosters-content');
  if(!tabsEl||!contentEl) return;

  // Manager tab pills
  if(!managers.length){
    tabsEl.innerHTML='';
    contentEl.innerHTML=`<div class="empty-state" style="padding:48px 24px"><div class="icon">📋</div><div class="label">DRAFT HASN'T HAPPENED YET</div></div>`;
    return;
  }
  // Show team names — own team pinned first, then others; with left/right scroll arrows
  const tabsContainerId='rosters-tabs-scroll-'+Math.random().toString(36).slice(2,7);
  const myMgr=managers.find(m=>m.id===myId);
  const otherMgrs=managers.filter(m=>m.id!==myId);
  const orderedMgrs=myMgr?[myMgr,...otherMgrs]:managers;
  const tabsHtml=orderedMgrs.map(m=>{
    const isActive=m.id===rostersViewId;
    const isMe=m.id===myId;
    const label=(m.team_name||m.display_name)+(isMe?' ★':'');
    return `<button onclick="rostersViewId=${JSON.stringify(m.id)};rostersDropMode=false;renderRostersScreen()" style="flex-shrink:0;background:${isActive?'var(--accent1)':'var(--bg3)'};color:${isActive?'#000':'var(--text2)'};border:1px solid ${isActive?'var(--accent1)':'var(--border)'};border-radius:20px;padding:5px 12px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;white-space:nowrap">${label}</button>`;
  }).join('');
  tabsEl.innerHTML=`
    <button onclick="(function(){var s=document.getElementById('${tabsContainerId}');s.scrollBy({left:-120,behavior:'smooth'})})()" style="flex-shrink:0;background:var(--bg3);border:1px solid var(--border);border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--text2)">‹</button>
    <div id="${tabsContainerId}" style="display:flex;gap:6px;overflow-x:auto;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex:1">${tabsHtml}</div>
    <button onclick="(function(){var s=document.getElementById('${tabsContainerId}');s.scrollBy({left:120,behavior:'smooth'})})()" style="flex-shrink:0;background:var(--bg3);border:1px solid var(--border);border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--text2)">›</button>
  `;

  const viewManager=managers.find(m=>m.id===rostersViewId);
  if(!viewManager){ contentEl.innerHTML=''; return; }
  const isMyRoster=rostersViewId===myId;
  const roster=(leagueState.rosters||{})[rostersViewId]||[];
  const active=isMyRoster?(getMyActive().length?getMyActive():autoActiveFor(rostersViewId))
    :((leagueState.active||{})[rostersViewId]||autoActiveFor(rostersViewId));
  const topFP=roster.length?Math.max(...roster.map(id=>playerTotalFP(id))):0;

  if(!roster.length){
    contentEl.innerHTML=`<div class="empty-state" style="padding:32px 24px"><div class="icon">📋</div><div class="label">NO PLAYERS YET</div></div>`;
    return;
  }

  const irPid = getIrSlot(rostersViewId);
  const rowHtml=(pid)=>{
    const p=getPlayer(pid); if(!p) return '';
    const fp=playerTotalFP(pid);
    const isOnIR = pid === irPid;
    const isActive=!isOnIR && active.includes(pid);
    // Only lock the top scorer if they actually have FP > 0 (prevent everyone being locked at 0)
    const isLocked=topFP>0 && fp>=topFP && roster.length>1 && !isOnIR;
    const inj = getInjuryStatus(p.name);
    const port=playerPortraits[p.name];
    const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:${viewManager?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    const injBadge = injuryBadgeHtml(p.name);
    const irBadge = isOnIR ? `<span style="background:#805ad5;color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px">IR</span>` : '';
    const statusLabel = isOnIR
      ? '<span style="color:#805ad5">■ INJURY RESERVE</span>'
      : isActive ? '<span style="color:var(--accent2)">● ACTIVE</span>' : '<span style="color:var(--accent4)">● BENCH</span>';
    const gameInfo = getTodayGameInfo(p.team, p.id);
    const gameLabel = gameInfo
      ? `<span style="font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    // Determine which action buttons to show
    let actionBtns = '';
    if(isMyRoster){
      if(rostersDropMode){
        // Drop mode: show Drop button only on eligible (non-IR, non-locked) players
        if(isOnIR){
          actionBtns = ''; // can't drop IR player directly
        } else if(isLocked){
          actionBtns = '<span style="font-family:var(--pixel);font-size:4.5px;color:var(--text3)">🔒 TOP</span>';
        } else {
          actionBtns = `<button class="btn btn-sm" style="font-size:5px;padding:4px 8px;min-height:24px;background:rgba(255,217,61,0.15);border:1px solid #ffd93d;color:#ffd93d;border-radius:8px" onclick="confirmDrop('${rostersViewId}',${pid})">Drop</button>`;
        }
      } else {
        // Normal mode: Bench/Activate + IR buttons
        // Only show → IR button for OUT status (not DTD)
        const isOut = !!injuryInfo(p.name)?.isOut;
        actionBtns = isOnIR
          ? `<button class="btn btn-sm btn-secondary" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="removeFromIR('${rostersViewId}',${pid})">REMOVE IR</button>`
          : `${isPlayerLocked(p) ? `<span style="font-family:var(--pixel);font-size:5px;color:var(--text3)">🔒 LOCKED</span>` : `<button class="btn btn-sm" style="font-size:5px;padding:4px 6px;min-height:24px;background:transparent;border:1px solid ${isActive?'var(--accent4)':'var(--accent2)'};color:${isActive?'var(--accent4)':'var(--accent2)'}" onclick="toggleActiveStatus('${rostersViewId}',${pid})">${isActive?'Bench':'Activate'}</button>`}
             ${isOut&&!irPid?`<button class="btn btn-sm btn-secondary" style="font-size:5px;padding:4px 6px;min-height:24px;background:rgba(128,90,213,0.15);border-color:#805ad5;color:#805ad5" onclick="putOnIR('${rostersViewId}',${pid})">→ IR</button>`:''}`;
      }
    }
    return `
    <div class="player-row" style="padding:8px 14px${isOnIR?';background:rgba(128,90,213,0.06)':''}${rostersDropMode&&isMyRoster&&!isLocked&&!isOnIR?';background:rgba(233,69,96,0.04)':''}">
      <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name} ${isLocked&&isMyRoster?'🔒':''}${injBadge}${irBadge}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${statusLabel}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="player-fp" style="font-size:11px">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        ${actionBtns ? `<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${actionBtns}</div>` : ''}
      </div>
    </div>`;
  };

  const nonIrCount = roster.filter(id=>id!==irPid).length;
  // Header Drop button: only show on own roster
  const dropBtn = isMyRoster
    ? rostersDropMode
      ? `<button onclick="rostersDropMode=false;renderRostersScreen()" style="margin-left:auto;background:#ffd93d;color:#000;border:1px solid #ffd93d;border-radius:12px;padding:4px 10px;font-family:var(--pixel);font-size:5px;cursor:pointer">✕ CANCEL</button>`
      : `<button onclick="rostersDropMode=true;renderRostersScreen()" style="margin-left:auto;background:rgba(255,217,61,0.12);border:1px solid #ffd93d;color:#ffd93d;border-radius:12px;padding:4px 10px;font-family:var(--pixel);font-size:5px;cursor:pointer">DROP</button>`
    : '';
  contentEl.innerHTML=`
    <div style="padding:8px 29px 4px 14px;font-family:var(--pixel);font-size:6px;color:var(--text3);display:flex;align-items:center;gap:8px">
      <span>${teamLabel(viewManager).toUpperCase()} · ${nonIrCount}/${ROSTER_SIZE} PLAYERS${irPid?` · <span style="color:#805ad5">1 ON IR</span>`:''}  · ${active.length} ACTIVE</span>
      ${dropBtn}
    </div>
    ${rostersDropMode&&isMyRoster ? `<div style="padding:4px 14px 6px;font-family:var(--pixel);font-size:5.5px;color:#ffd93d">⚠ SELECT A PLAYER TO DROP FROM YOUR ROSTER</div>` : ''}
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
      ${(()=>{
        // Order: Active → Bench → IR
        const activePids = roster.filter(id => id !== irPid && active.includes(id));
        const benchPids  = roster.filter(id => id !== irPid && !active.includes(id));
        const irPids     = irPid && roster.includes(irPid) ? [irPid] : [];
        const sections = [];
        if(activePids.length){
          sections.push(`<div style="padding:4px 14px 2px;font-family:var(--pixel);font-size:5px;color:var(--accent2);letter-spacing:.08em">ACTIVE</div>`);
          sections.push(...activePids.map(rowHtml));
        }
        if(benchPids.length){
          sections.push(`<div style="padding:6px 14px 2px;font-family:var(--pixel);font-size:5px;color:var(--accent4);letter-spacing:.08em;border-top:1px solid var(--border)">BENCH</div>`);
          sections.push(...benchPids.map(rowHtml));
        }
        // IR section always shows, with a placeholder when empty
        sections.push(`<div style="padding:6px 14px 2px;font-family:var(--pixel);font-size:5px;color:#805ad5;letter-spacing:.08em;border-top:1px solid var(--border)">INJURY RESERVE (${irPids.length}/1)</div>`);
        if(irPids.length) sections.push(...irPids.map(rowHtml));
        else sections.push(`<div style="padding:8px 14px 12px;font-family:var(--pixel);font-size:5px;color:var(--text3);line-height:1.8">NO PLAYER ON IR · ONLY PLAYERS LISTED <span style="color:#e53e3e">OUT</span> CAN BE PLACED HERE</div>`);
        return sections.join('');
      })()}
    </div>`;
}

function renderRosterScreen(){
  renderRostersScreen();
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
    const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:${myProfile?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    const gameInfo = getTodayGameInfo(p.team, p.id);
    const gameLabel = gameInfo
      ? `<span style="font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    return `
    <div class="player-row" style="padding:8px 14px">
      <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name}${injuryBadgeHtml(p.name)} ${isLocked?'🔒':''}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${isActive?'<span style="color:var(--accent2)">● ACTIVE</span>':'<span style="color:var(--accent4)">● BENCH</span>'}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="player-fp" style="font-size:11px">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        <div style="display:flex;gap:4px">
          ${isPlayerLocked(p) ? `<span style="font-family:var(--pixel);font-size:5px;color:var(--text3)">🔒 LOCKED</span>` : `<button class="btn btn-sm" style="font-size:5px;padding:4px 6px;min-height:24px;background:transparent;border:1px solid ${isActive?'var(--accent4)':'var(--accent2)'};color:${isActive?'var(--accent4)':'var(--accent2)'}" onclick="toggleActiveStatus('${mid}',${pid})">
            ${isActive?'Bench':'Activate'}
          </button>`}
          ${!isLocked?`<button class="btn btn-sm" style="font-size:5px;padding:4px 6px;min-height:24px;background:rgba(255,217,61,0.15);border:1px solid #ffd93d;color:#ffd93d" onclick="confirmDrop('${mid}',${pid})">Drop</button>`:''}
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
  const canAdd=mid && canWaiver(mid) && getMyRoster().length<effectiveRosterSize(mid);

  if(!sorted.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><div class="label">NO PLAYERS FOUND</div></div>`;
    return;
  }

  el.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
    ${sorted.slice(0,50).map(p=>{
      const fp=playerTotalFP(p.id);
      const port=playerPortraits[p.name];
      const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:var(--text3);font-size:7px">${initials(p.name)}</div>`;
      const dbP=PLAYERS_DB.find(d=>d.n===p.name);
      const seasonLive=new Date()>=NBA_SEASON_START;
      const avgFPLine=seasonLive&&dbP?`<div class="player-meta" style="color:var(--accent3)">${dbP.fpPG} avg FP/G</div>`:'';
      const statsLine=seasonLive&&dbP
        ?`<div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>`
        :`<div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>`;
      return `
      <div class="player-row" style="padding:8px 14px">
        <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
        <div class="player-info">
          <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name}</div>
          <div class="player-meta">${p.pos} · ${p.team}</div>
          ${statsLine}
          ${avgFPLine}
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

// ── WAIVERS PANE ─────────────────────────────────────────────────────────────
// NBA_TEAMS_LIST: sorted array of abbreviations derived from NBA_TEAMS object above
const NBA_TEAMS_LIST = Object.keys(NBA_TEAMS).sort();
let waiverFilter = { availability:'available', team:'all', sort:'fp', hideOut:false };
let waiverSearchQuery = '';

function resetWaiverFilters(){
  waiverFilter = { availability:'available', team:'all', sort:'fp' };
  waiverSearchQuery = '';
}

function renderWaiverPlayerList(){
  refreshFilterRow('waiver');
  const el=document.getElementById('waiver-player-list');
  if(!el) return;
  const mid=getMyId();
  const allRostered=new Set(Object.values(leagueState.rosters||{}).flat());
  const query=waiverSearchQuery.toLowerCase();
  const canAdd=mid && canWaiver(mid) && getMyRoster().length<effectiveRosterSize(mid);

  let players=PLAYERS.filter(p=>{
    if(waiverFilter.availability==='available' && allRostered.has(p.id)) return false;
    if(waiverFilter.team!=='all' && p.team!==waiverFilter.team) return false;
    if(waiverFilter.hideOut && isOutOrInjured(p.name)) return false;
    if(query && !p.name.toLowerCase().includes(query) && !p.team.toLowerCase().includes(query) && !p.pos.toLowerCase().includes(query)) return false;
    return true;
  });

  if(waiverFilter.sort==='fp'){
    players=[...players].sort((a,b)=>{
      const aT=playerTotalFP(a.id)||0, bT=playerTotalFP(b.id)||0;
      // Players with no earned FP this season always sink to the bottom
      if((aT>0)!==(bT>0)) return bT>0?1:-1;
      if(aT>0) return bT-aT;
      const proj=x=>(x.ppg+x.rpg+x.apg+x.spg+x.bpg);
      return proj(b)-proj(a);
    });
  } else {
    players=[...players].sort((a,b)=>a.name.localeCompare(b.name));
  }

  el.innerHTML = !players.length
    ? `<div class="empty-state"><div class="icon">🔍</div><div class="label">NO PLAYERS FOUND</div></div>`
    : `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
      ${players.slice(0,60).map(p=>{
        const fp=playerTotalFP(p.id);
        const rostered=allRostered.has(p.id);
        const port=playerPortraits[p.name];
        const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:var(--text3);font-size:7px">${initials(p.name)}</div>`;
        return `
        <div class="player-row" style="padding:8px 14px">
          <div class="player-portrait" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${portEl}</div>
          <div class="player-info">
            <div class="player-name" onclick="${pcardOnclick(p.name)}" style="cursor:pointer">${p.name}${injuryBadgeHtml(p.name)}</div>
            <div class="player-meta">${p.pos} · ${p.team}</div>
            <div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>
            <div class="player-meta" style="margin-top:2px">${(()=>{ const gi=getTodayGameInfo(p.team,p.id); return gi?`<span style="font-size:5px">${gi}</span>`:'<span style="color:var(--text3);font-size:5px">No Game Today</span>'; })()}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="player-fp" style="font-size:10px">${fp>0?fp.toFixed(1)+'<span class="fp-label">FP</span>':''}</div>
            ${rostered?`<span style="font-family:var(--pixel);font-size:5px;color:var(--text3)">ROSTERED</span>`:canAdd?`<button class="btn btn-sm btn-primary" style="font-size:5px;padding:4px 8px;min-height:24px" onclick="confirmAdd('${mid}',${p.id})">ADD</button>`:''}
          </div>
        </div>`;
      }).join('')}
      ${players.length>60?`<div style="padding:10px;text-align:center;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">+ ${players.length-60} MORE — SEARCH TO NARROW</div>`:''}
    </div>`;
}

function renderWaiversPane(){
  const el=document.getElementById('waivers-content');
  if(!el) return;
  const mid=getMyId();
  const used=mid?waiverUsedThisWeek(mid):0;

  const teamDropdown=`<select onchange="waiverFilter.team=this.value;renderWaiverPlayerList()" style="background:var(--bg3);color:var(--text1);border:1px solid var(--border);border-radius:var(--radius);padding:5px 8px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;flex:1;min-width:0">
    <option value="all" ${waiverFilter.team==='all'?'selected':''}>All Teams</option>
    ${NBA_TEAMS_LIST.map(t=>`<option value="${t}" ${waiverFilter.team===t?'selected':''}>${t} — ${NBA_TEAMS[t]||t}</option>`).join('')}
  </select>`;

  el.innerHTML=`
    <div style="padding:10px 14px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);line-height:1.6">ADD/DROPS LEFT FOR CURRENT MATCH-UP: <span style="color:var(--accent1)">${WAIVER_WEEKLY-used}/${WAIVER_WEEKLY}</span></div>
        <button onclick="showTransactionLog()" style="flex-shrink:0;margin-left:8px;background:var(--bg3);border:1px solid var(--border);color:var(--accent1);border-radius:12px;padding:5px 10px;font-family:var(--pixel);font-size:5px;cursor:pointer">TRANSACTION LOG</button>
      </div>
      <div id="waiver-filter-row" style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">${filterRowHtml('waiver')}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">NBA TEAM</span>
        ${teamDropdown}
      </div>
      <input type="text" id="waiver-search" placeholder="Search players..."
        style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;font-family:var(--pixel);font-size:7px;color:var(--text1);outline:none;margin-bottom:8px;-webkit-appearance:none;appearance:none"
        oninput="waiverSearchQuery=this.value;renderWaiverPlayerList()"/>
    </div>
    <div id="waiver-player-list"></div>`;

  renderWaiverPlayerList();
}

async function confirmAdd(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  // Block if IR player's injury has cleared
  if(checkIrClearedBlock(mid)) return;
  const roster=getMyRoster();
  if(roster.length>=effectiveRosterSize(mid)){
    toast('Roster full! Drop a player first');
    return;
  }
  const ok=await addPlayer(mid,pid);
  if(ok){
    toast(`${p.name} added!`);
    renderWaiversPane();
  }
}

async function putOnIR(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  const inj = getInjuryStatus(p.name);
  // Only OUT status qualifies — DTD does not
  const isOut = !!injuryInfo(p.name)?.isOut;
  if(!isOut){ toast('Only players with OUT status can be placed on IR'); return; }
  if(getIrSlot(mid) && getIrSlot(mid)!==pid){ toast('IR slot already used. Remove current IR player first'); return; }
  if(!leagueState.ir) leagueState.ir={};
  leagueState.ir[mid]=pid;
  // Remove from active/inactive lists (IR players don't count in lineup)
  if(leagueState.active?.[mid]) leagueState.active[mid]=(leagueState.active[mid]||[]).filter(id=>id!==pid);
  if(leagueState.inactive?.[mid]) leagueState.inactive[mid]=(leagueState.inactive[mid]||[]).filter(id=>id!==pid);
  await saveLeagueState();
  renderRostersScreen();
  toast(`${p.name} placed on IR`);
}

async function removeFromIR(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  const roster=(leagueState.rosters||{})[mid]||[];
  // Must have room: IR player stays on roster, so max non-IR = ROSTER_SIZE
  if(roster.filter(id=>id!==pid).length>=ROSTER_SIZE){ toast('Drop a player first before removing from IR'); return; }
  if(!leagueState.ir) leagueState.ir={};
  leagueState.ir[mid]=null;
  await saveLeagueState();
  renderRostersScreen();
  toast(`${p.name} removed from IR`);
}

// Check if an IR player's injury has cleared — blocks add/drop until manually moved off IR
function checkIrClearedBlock(mid){
  const irPid = getIrSlot(mid);
  if(!irPid) return false;
  const p = getPlayer(irPid);
  if(!p) return false;
  const inj = getInjuryStatus(p.name);
  // Injury has cleared when there's no injury status at all, or status is not OUT
  const stillOut = !!injuryInfo(p.name)?.isOut;
  if(!stillOut){
    // Show prompt modal
    const existing=document.getElementById('ir-cleared-modal');
    if(existing) existing.remove();
    const modal=document.createElement('div');
    modal.id='ir-cleared-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`
      <div style="background:var(--bg2);border:1px solid #805ad5;border-radius:12px;padding:20px 24px;max-width:320px;width:100%;font-family:var(--pixel)">
        <div style="font-size:6px;color:#805ad5;margin-bottom:10px;letter-spacing:.06em">⚠ IR PLAYER HEALTHY</div>
        <div style="font-size:7px;color:var(--text1);margin-bottom:12px;line-height:1.6"><span style="color:#805ad5">${p.name}</span>'s injury has cleared.</div>
        <div style="font-size:5.5px;color:var(--text3);margin-bottom:16px;line-height:1.7">You must manually move ${p.name} off the Injury Reserve before you can add or drop any players.</div>
        <div style="display:flex;justify-content:flex-end">
          <button class="btn btn-secondary" style="font-size:5.5px;padding:6px 12px;min-height:28px" onclick="document.getElementById('ir-cleared-modal').remove()">OK</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return true; // blocked
  }
  return false;
}

function confirmDrop(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  // Block if IR player's injury has cleared
  if(checkIrClearedBlock(mid)) return;
  // Show inline confirmation modal
  const existing=document.getElementById('drop-confirm-modal');
  if(existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='drop-confirm-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px 24px;max-width:320px;width:100%;font-family:var(--pixel)">
      <div style="font-size:7px;color:var(--text1);margin-bottom:12px;line-height:1.6">Are you sure you want to drop <span style="color:var(--accent4)">${p.name}</span>?</div>
      <div style="font-size:5.5px;color:var(--text3);margin-bottom:16px;line-height:1.8">They will be returned to the waiver pool. Any FP earned thus far will still count towards your total FP.</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" style="font-size:5.5px;padding:6px 12px;min-height:28px" onclick="document.getElementById('drop-confirm-modal').remove()">No, Cancel</button>
        <button class="btn btn-danger" style="font-size:5.5px;padding:6px 12px;min-height:28px" onclick="executeDrop('${mid}',${pid})">Yes, Drop</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function executeDrop(mid, pid){
  const modal=document.getElementById('drop-confirm-modal');
  if(modal) modal.remove();
  const p=getPlayer(pid);
  const ok=await dropPlayer(mid,pid);
  if(ok){
    rostersDropMode=false;
    toast(`${p?.name||'Player'} dropped`);
    renderRostersScreen();
    renderLineupPreview();
  }
}

// ── PROFILE SCREEN ───────────────────────────────────────────────────────────
function renderProfileScreen(){
  fillMatchupResults();
  if(!myProfile) return;
  const color=myProfile.color||'#4a9eff';
  const name=myProfile.display_name||'Player';
  const avatarEl=document.getElementById('profile-avatar');
  avatarEl.style.background=color;
  if(myProfile.photo){
    avatarEl.style.backgroundImage=`url(${myProfile.photo})`;
    avatarEl.style.backgroundSize='cover';
    avatarEl.style.backgroundPosition='center';
    avatarEl.textContent='';
    avatarEl.style.fontSize='';
  } else if(myProfile.icon){
    avatarEl.style.backgroundImage='';
    avatarEl.style.fontSize='28px';
    avatarEl.style.color='inherit';
    avatarEl.textContent=myProfile.icon;
  } else {
    avatarEl.style.backgroundImage='';
    avatarEl.style.fontSize='';
    avatarEl.style.color='#000';
    avatarEl.textContent=initials(name);
  }
  document.getElementById('profile-name-display').textContent=name;
  document.getElementById('profile-email-display').textContent=myProfile.email||'';
  const dnVal=document.getElementById('display-name-value');
  if(dnVal) dnVal.textContent=name;
  // Commissioner row
  const adminRow=document.getElementById('admin-row');
  if(adminRow) adminRow.style.display=(myProfile.is_commissioner||myProfile.email===COMMISSIONER_EMAIL)?'flex':'none';
  // Run info (current-run-value removed; skip gracefully)
  const runVal=document.getElementById('current-run-value');
  if(runVal) runVal.textContent='';
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
    const standEl=document.getElementById('profile-standing');
    if(recEl) recEl.textContent=record||'0-0';
    if(fpEl) fpEl.textContent=fp.toFixed(1)+' FP';
    // Compute standings rank for current run
    if(standEl){
      const allMgrs=leagueState.managers||[];
      const runSchedule=(leagueState.schedule||{})[currentRun]||[];
      const mgrStats=allMgrs.map(m=>{
        let w=0,l=0,t=0;
        runSchedule.forEach(week=>week.forEach(mu=>{
          if(mu.home===m.id||mu.away===m.id){
            if(!mu.winner) return;
            if(mu.winner===m.id) w++;
            else if(mu.winner==='tie') t++;
            else l++;
          }
        }));
        return {id:m.id, wins:w, losses:l, ties:t, fp:managerFP(m.id)};
      });
      // Sort: wins desc, then FP desc
      mgrStats.sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:b.fp-a.fp);
      const rank=mgrStats.findIndex(m=>m.id===myId)+1;
      const total=allMgrs.length;
      standEl.textContent=rank>0?`${rank}/${total}`:'—';
    }
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
    const week=wlcVisibleWeek(wk);
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

const AVATAR_ICONS=[
  '🏀','⭐','🔥','💎','👑','⚡','🎯','🦁',
  '🐺','🦅','🐉','🦊','🏆','💪','🎮','🌟',
  '🦈','🐯','🦍','🚀','❄️','🌊','☄️','🎪',
];
const PICKER_COLORS=['#4a9eff','#00d4aa','#f5a623','#e94560','#7b2fff','#00c49a','#ff6b6b','#ffd93d','#06b6d4','#84cc16'];

function openAvatarEditor(){
  const myId=getMyId();
  const curIcon=myProfile?.icon||null;
  const curColor=myProfile?.color||'#4a9eff';
  let modal=document.getElementById('avatar-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='avatar-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';
  modal.innerHTML=`
    <div class="modal-box" style="max-width:340px;width:calc(100% - 32px);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3)">CUSTOMIZE AVATAR</div>
        <button onclick="document.getElementById('avatar-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <!-- Live preview -->
      <div style="display:flex;justify-content:center;margin-bottom:16px">
        <div id="avatar-preview" style="width:56px;height:56px;border-radius:50%;background:${curColor};display:flex;align-items:center;justify-content:center;font-size:26px;border:3px solid var(--border);transition:all .2s">
          ${curIcon||`<span style="font-family:var(--pixel);font-size:12px;color:#000">${initials(myProfile?.display_name||'?')}</span>`}
        </div>
      </div>
      <!-- Photo upload -->
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">UPLOAD PHOTO</div>
      <label style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px dashed var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;margin-bottom:16px">
        <span style="font-size:18px">📸</span>
        <div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:var(--accent1)">CHOOSE IMAGE</div>
          <div style="font-family:var(--pixel);font-size:5.5px;line-height:1.8;color:var(--text3);margin-top:2px">JPG or PNG · max 2MB</div>
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="avatarPickPhoto(this)"/>
      </label>
      <!-- Icon grid -->
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">— OR PICK AN ICON —</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:16px" id="icon-grid">
        ${AVATAR_ICONS.map(ic=>`<div onclick="avatarPickIcon('${ic}')" data-icon="${ic}" style="aspect-ratio:1;border-radius:6px;background:var(--bg3);border:2px solid ${ic===curIcon?'var(--accent1)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:border-color .1s">${ic}</div>`).join('')}
      </div>
      <!-- Color row -->
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">PICK A COLOR</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px" id="color-row">
        ${PICKER_COLORS.map(c=>`<div onclick="avatarPickColor('${c}')" data-color="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c===curColor?'#fff':'transparent'};transition:transform .1s,border-color .1s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-full" onclick="saveAvatarChoice()">SAVE AVATAR</button>
    </div>`;
  document.body.appendChild(modal);
}

function avatarPickIcon(icon){
  // Update selection highlight
  document.querySelectorAll('#icon-grid [data-icon]').forEach(el=>{
    el.style.borderColor=el.dataset.icon===icon?'var(--accent1)':'transparent';
  });
  // Update preview
  const preview=document.getElementById('avatar-preview');
  if(preview) preview.innerHTML=icon;
  modal_pendingIcon=icon;
}
function avatarPickColor(color){
  document.querySelectorAll('#color-row [data-color]').forEach(el=>{
    el.style.borderColor=el.dataset.color===color?'#fff':'transparent';
  });
  const preview=document.getElementById('avatar-preview');
  if(preview) preview.style.background=color;
  modal_pendingColor=color;
}
let modal_pendingIcon=null;
let modal_pendingColor=null;

async function saveAvatarChoice(){
  const myId=getMyId();
  if(!myId) return;
  const photo=modal_pendingPhoto??null;
  const icon=photo?null:(modal_pendingIcon??myProfile?.icon??null);
  const color=modal_pendingColor??myProfile?.color??'#4a9eff';
  const updates={color};
  if(icon !== undefined) updates.icon=icon||null;
  if(photo) updates.photo=photo;
  const managers=leagueState.managers||[];
  const m=managers.find(m=>m.id===myId);
  if(m){ m.color=color; if(icon!==undefined) m.icon=icon; if(photo) m.photo=photo; }
  if(myProfile){ myProfile.color=color; if(icon!==undefined) myProfile.icon=icon; if(photo) myProfile.photo=photo; }
  // Persist avatar locally so it survives reload even if Supabase write is slow
  try{
    const localKey=`avatar-${myId}`;
    localStorage.setItem(localKey, JSON.stringify({photo:photo||myProfile?.photo||null, icon:icon||null, color}));
  }catch(e){}
  await saveLeagueState();
  await db.from('managers').update(updates).eq('id',myId).then(({error})=>{ if(error) console.warn('Avatar save error',error); });
  modal_pendingIcon=null; modal_pendingColor=null; modal_pendingPhoto=null;
  document.getElementById('avatar-modal')?.remove();
  renderProfileScreen();
  updateUserChip();
  toast('Avatar saved!');
}


function avatarPickPhoto(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){ toast('Image too large (max 2MB)'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    // Update preview with photo
    const preview = document.getElementById('avatar-preview');
    if(preview){
      preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    }
    modal_pendingPhoto = dataUrl;
    modal_pendingIcon = null; // clear icon selection if photo chosen
  };
  reader.readAsDataURL(file);
}
let modal_pendingPhoto = null;

// Override saveAvatarChoice to handle photo
const _origSaveAvatar = saveAvatarChoice;
// (We modify saveAvatarChoice directly instead)

// ── DISPLAY NAME EDITING ─────────────────────────────────────────────────────
function startEditDisplayName(){
  const row = document.getElementById('display-name-row');
  const editRow = document.getElementById('display-name-edit-row');
  const input = document.getElementById('display-name-input');
  if(!row || !editRow || !input) return;
  input.value = myProfile?.display_name || '';
  row.style.display = 'none';
  editRow.style.display = 'flex';
  input.focus();
}
function cancelEditDisplayName(){
  document.getElementById('display-name-row').style.display = '';
  document.getElementById('display-name-edit-row').style.display = 'none';
}
async function saveDisplayName(){
  const input = document.getElementById('display-name-input');
  const name = input?.value?.trim();
  if(!name || name.length < 2){ toast('Name too short'); return; }
  const myId = getMyId();
  if(!myId) return;
  // Update local state
  if(myProfile) myProfile.display_name = name;
  const m = (leagueState.managers||[]).find(m=>m.id===myId);
  if(m) m.display_name = name;
  await saveLeagueState();
  await db.from('managers').update({display_name:name}).eq('id',myId);
  cancelEditDisplayName();
  renderProfileScreen();
  updateUserChip();
  toast('Name updated!');
}

// ── TEAM NAME EDITING ────────────────────────────────────────────────────────
function startEditTeamName(){
  const row=document.getElementById('team-name-row');
  const editRow=document.getElementById('team-name-edit-row');
  const input=document.getElementById('team-name-input');
  if(!editRow||!input) return;
  input.value=myProfile?.team_name||'';
  row.style.display='none';
  editRow.style.display='flex';
  input.focus();
  input.select();
}
function cancelEditTeamName(){
  document.getElementById('team-name-row').style.display='flex';
  document.getElementById('team-name-edit-row').style.display='none';
}
async function saveTeamName(){
  const input=document.getElementById('team-name-input');
  const name=(input?.value||'').trim();
  if(!name){ toast('Enter a team name'); return; }
  const myId=getMyId();
  if(!myId) return;
  const {error}=await db.from('managers').update({team_name:name}).eq('id',myId);
  if(error){ toast('Could not save'); return; }
  if(myProfile) myProfile.team_name=name;
  const m=(leagueState.managers||[]).find(m=>m.id===myId);
  if(m) m.team_name=name;
  cancelEditTeamName();
  document.getElementById('team-name-value').textContent=name;
  toast('Team name updated!');
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
      ${avatarEl(m.display_name,m.color||'#4a9eff',28,9,m.icon||null,m.photo||null)}
      <div style="flex:1">
        <div style="font-family:var(--pixel);font-size:7px;line-height:1.8;font-weight:600">${m.display_name}</div>
        <div style="font-family:var(--pixel);font-size:5.5px;line-height:1.8;color:var(--text3)">${m.email}</div>
      </div>
      ${m.is_commissioner?'<span style="font-family:var(--pixel);font-size:5px;color:var(--accent3)">⭐ COMM</span>':''}
    </div>`).join('')}
  </div>

  <div class="section-label" style="padding:12px 0 8px">INVITE CODE</div>
  <div class="card" style="margin:0">
    <div style="font-family:var(--pixel);font-size:10px;color:var(--accent3);letter-spacing:2px">${INVITE_CODE}</div>
    <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin-top:6px">Share this code with new users</div>
  </div>

  <div class="section-label" style="padding:12px 0 8px">LEAGUE ACTIONS</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn btn-secondary btn-full" onclick="generateSchedule()">🗓 Generate Schedule</button>
    <button class="btn btn-secondary btn-full" onclick="forceRefreshStats()">🔄 Force Refresh Stats</button>
    <button class="btn btn-secondary btn-full" onclick="runDraftSetup()">🎯 Start Draft</button>
  </div>

  ${renderAdminLineupOverrideSection()}
  ${renderAdminLineupFixSection()}
  ${renderAdminDuelSection()}
  ${renderAdminWlcSection()}
  `;
}

// ── COMMISSIONER: LINEUP OVERRIDE ───────────────────────────────────────────
// Swap a bench player into a team's active lineup right now, ignoring the
// tip-off lock (for disputes like a swap that didn't save). Counts for all of
// today: the activated player's whole game today counts (live now, and via the
// lineup history once his final stats save); the benched player earns nothing today.
let adminOvTeam = null;
function renderAdminLineupOverrideSection(){
  const mgrs = allManagers();
  if(!mgrs.length) return '';
  if(!adminOvTeam || !mgrs.some(m=>String(m.id)===String(adminOvTeam))) adminOvTeam = mgrs[0].id;
  const mid = adminOvTeam;
  const roster = (leagueState.rosters||{})[mid]||[];
  const ir = getIrSlot(mid);
  const active = (leagueState.active||{})[mid] || autoActiveFor(mid);
  const bench = roster.filter(pid=>!active.map(String).includes(String(pid)) && String(pid)!==String(ir));
  const opt = pid => { const p=getPlayer(pid); return p?`<option value="${pid}">${p.name} (${p.team})</option>`:''; };
  const sel = 'background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:6px;width:100%;margin-bottom:6px';
  return `
  <div class="section-label" style="padding:12px 0 8px">🔧 LINEUP OVERRIDE</div>
  <div class="card" style="margin:0">
    <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin-bottom:8px;line-height:1.5">Move a player into a team's active lineup now, even if his game has already tipped off. His full game today counts for the team. The player moved to the bench earns nothing today.</div>
    <select style="${sel}" onchange="adminOvTeam=this.value;renderAdminContent()">
      ${mgrs.map(m=>`<option value="${m.id}" ${String(m.id)===String(mid)?'selected':''}>${teamLabel(m)}</option>`).join('')}
    </select>
    <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin:4px 0">Move to BENCH ${active.length<ACTIVE_SIZE?'(optional — lineup has an open spot)':''}</div>
    <select id="ov-out" style="${sel}">${active.length<ACTIVE_SIZE?'<option value="">— nobody —</option>':''}${active.map(opt).join('')}</select>
    <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin:4px 0">Move to ACTIVE</div>
    <select id="ov-in" style="${sel}">${bench.length?bench.map(opt).join(''):'<option value="">No bench players</option>'}</select>
    <button class="btn btn-primary btn-full" style="margin-top:6px" onclick="adminLineupOverride()">✅ APPLY SWAP</button>
  </div>`;
}

async function adminLineupOverride(){
  const mid = adminOvTeam;
  const outPid = document.getElementById('ov-out')?.value || '';
  const inPid = document.getElementById('ov-in')?.value || '';
  if(!inPid){ toast('Pick a player to activate'); return; }
  await loadLeagueState(); // apply to the freshest saved lineup
  const num = x => isNaN(x) ? x : Number(x);
  let active = [...((leagueState.active||{})[mid] || autoActiveFor(mid))];
  if(outPid) active = active.filter(id=>String(id)!==String(outPid));
  if(active.length >= ACTIVE_SIZE){ toast(`Lineup full — choose someone to bench`); return; }
  if(!active.map(String).includes(String(inPid))) active.push(num(inPid));
  if(!leagueState.active) leagueState.active = {};
  if(!leagueState.inactive) leagueState.inactive = {};
  leagueState.active[mid] = active;
  const inactive = ((leagueState.inactive||{})[mid]||[]).filter(id=>String(id)!==String(inPid));
  if(outPid && !inactive.map(String).includes(String(outPid))) inactive.push(num(outPid));
  leagueState.inactive[mid] = inactive;
  await saveLeagueState(); // also records the change in the lineup history
  const pin = getPlayer(num(inPid)), pout = outPid ? getPlayer(num(outPid)) : null;
  toast(`${pin?.name||'Player'} activated${pout?`, ${pout.name} benched`:''} ✓`);
  renderAdminContent(); renderLineupPreview(); renderMyRosterList();
  if(document.getElementById('rosters-content')) renderRostersScreen();
}

// ── COMMISSIONER: FIX PAST LINEUPS ──────────────────────────────────────────
// Lists every player with saved stats on a date, per team, with a checkbox for
// "was active that day". Saving writes leagueState.lineupOverrides[date][mid].
let adminLineupFixDate = '2026-10-20';
function renderAdminLineupFixSection(){
  const dateStr = adminLineupFixDate.replace(/-/g,'');
  const stats = Object.values(leagueState.playerStats||{}).filter(v=>String(v.date)===dateStr);
  const fpByPid = {};
  for(const v of stats) fpByPid[v.pid] = (fpByPid[v.pid]||0) + (v.fp||0);
  const teams = allManagers().map(m=>{
    const mid = m.id;
    const counted = new Set(activeLineupOnDate(mid, dateStr).map(String));
    const pool = new Set([...((leagueState.rosters||{})[mid]||[]), ...activeLineupOnDate(mid, dateStr)].map(String));
    const rows = [...pool].filter(pid=>fpByPid[pid]!==undefined).map(pid=>{
      const p = getPlayer(Number(pid)) || getPlayer(pid);
      return {pid, name:p?.name||pid, fp:fpByPid[pid], on:counted.has(pid)};
    }).sort((a,b)=>b.fp-a.fp);
    return {m, rows};
  });
  const fixed = !!(leagueState.lineupOverrides||{})[dateStr];
  return `
  <div class="section-label" style="padding:12px 0 8px">📋 FIX PAST LINEUPS</div>
  <div class="card" style="margin:0">
    <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin-bottom:8px;line-height:1.5">
      Check every player who was <b>ACTIVE</b> on this date. Checked players' FP count toward their team; unchecked don't.
      ${fixed?'<br><span style="color:var(--accent2)">✓ This date has been reviewed before.</span>':''}
    </div>
    <input type="date" value="${adminLineupFixDate}" onchange="adminLineupFixDate=this.value;renderAdminContent()"
      style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:6px;margin-bottom:8px"/>
    ${stats.length ? teams.map(({m,rows})=>`
      <div style="margin-top:10px">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--accent3);margin-bottom:4px">${m.team_name||m.display_name}</div>
        ${rows.length ? rows.map(r=>`
          <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-family:var(--pixel);font-size:6.5px;line-height:1.8;cursor:pointer">
            <input type="checkbox" class="lineup-fix-cb" data-mid="${m.id}" data-pid="${r.pid}" ${r.on?'checked':''}/>
            <span style="flex:1">${r.name}</span>
            <span style="font-family:var(--pixel);font-size:6px;color:var(--accent3)">${r.fp.toFixed(1)} FP</span>
            ${r.on?'':'<span style="font-family:var(--pixel);font-size:5px;color:#e53e3e">NOT COUNTED</span>'}
          </label>`).join('') : '<div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3)">No rostered players with stats</div>'}
      </div>`).join('')
    : '<div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3)">No saved stats for this date.</div>'}
    ${stats.length?`<button class="btn btn-primary btn-full" style="margin-top:12px" onclick="adminSaveLineupFix()">💾 SAVE LINEUPS FOR ${adminLineupFixDate}</button>`:''}
  </div>`;
}

async function adminSaveLineupFix(){
  const dateStr = adminLineupFixDate.replace(/-/g,'');
  // Read checkbox state before reloading (reload re-renders nothing, but be safe)
  const boxes = [...document.querySelectorAll('.lineup-fix-cb')].map(cb=>({mid:cb.dataset.mid, pid:cb.dataset.pid, on:cb.checked}));
  await loadLeagueState(); // work on fresh saved state
  const ov = {};
  for(const m of allManagers()){
    // Start from current best guess, then apply the commissioner's checkboxes
    const set = new Set(activeLineupOnDate(m.id, dateStr).map(String));
    for(const b of boxes.filter(b=>String(b.mid)===String(m.id))){
      if(b.on) set.add(b.pid); else set.delete(b.pid);
    }
    ov[m.id] = [...set].map(x=>isNaN(x)?x:Number(x));
  }
  if(!leagueState.lineupOverrides) leagueState.lineupOverrides = {};
  leagueState.lineupOverrides[dateStr] = ov;
  await saveLeagueState();
  toast(`Lineups for ${adminLineupFixDate} saved — team totals updated ✓`);
  renderAdminContent();
  renderHomeScreen();
}


// ── SCHEDULE GENERATION ──────────────────────────────────────────────────────
function generateSchedule(){
  const managers=leagueState.managers||[];
  if(managers.length<2){ toast('Need at least 2 managers'); return; }
  const schedule={};
  for(const run of RUNS){
    schedule[run.id]=buildRoundRobinSchedule(managers.map(m=>m.id), run.id);
  }
  leagueState.schedule=schedule;
  saveLeagueState();
  toast('Schedule generated!');
  renderAdminContent();
}

function buildRoundRobinSchedule(teams, runId){
  // Build one full round-robin (9 weeks for 10 teams), then repeat until run ends
  const run = RUNS.find(r=>r.id===runId);
  const n=teams.length;
  const list=[...teams];
  const hasBye=n%2!==0;
  if(hasBye) list.push(null);
  const numRounds=list.length-1;
  const baseRounds=[];
  for(let r=0;r<numRounds;r++){
    const week=[];
    for(let i=0;i<list.length/2;i++){
      const h=list[i], a=list[list.length-1-i];
      if(h!==null && a!==null) week.push({home:h,away:a});
    }
    baseRounds.push(week);
    list.splice(1,0,list.pop());
  }
  if(!run) return baseRounds;
  // Compute how many weeks fit in this run
  const totalWeeks=runWeekCount(runId); // Mon–Sun weeks touching the run
  // Tile the base rounds to fill all weeks
  const rounds=[];
  for(let w=0;w<totalWeeks;w++){
    rounds.push(baseRounds[w % baseRounds.length]);
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
  if(el){
    el.style.background=myProfile.color||'#4a9eff';
    if(myProfile.photo){
      el.style.backgroundImage=`url(${myProfile.photo})`;
      el.style.backgroundSize='cover';
      el.style.backgroundPosition='center';
      el.textContent='';
      el.style.fontSize='';
    } else if(myProfile.icon){
      el.style.backgroundImage='';
      el.style.fontSize='18px';
      el.style.color='inherit';
      el.textContent=myProfile.icon;
    } else {
      el.style.backgroundImage='';
      el.style.fontSize='';
      el.style.color='#000';
      el.textContent=initials(myProfile.display_name||'?');
    }
  }
}

// ── CHAT ─────────────────────────────────────────────────────────────────────
let chatPollTimer = null;
const CHAT_POLL_MS = 30_000;
const CHAT_LAST_SEEN_KEY = 'chat-last-seen-2027';

function getChatLastSeen(){
  try{ return localStorage.getItem(CHAT_LAST_SEEN_KEY) || ''; }
  catch(e){ return ''; }
}
function setChatLastSeen(ts){
  try{ localStorage.setItem(CHAT_LAST_SEEN_KEY, ts); }catch(e){}
}

function updateChatBadge(){
  const badge = document.getElementById('chat-badge');
  if(!badge) return;
  const msgs = leagueState?.chat || [];
  const lastSeen = getChatLastSeen();
  const myId = getMyId();
  const hasNew = msgs.some(m => m.ts > lastSeen && m.managerId !== myId);
  badge.style.display = hasNew ? 'block' : 'none';
}

function openChat(){
  const panel = document.getElementById('chat-panel');
  if(!panel) return;
  panel.classList.add('open');
  renderChatMessages();
  // Mark all as seen
  const msgs = leagueState?.chat || [];
  if(msgs.length){
    setChatLastSeen(msgs[msgs.length-1].ts);
  }
  updateChatBadge();
  // Scroll to bottom
  setTimeout(()=>{
    const el = document.getElementById('chat-messages');
    if(el) el.scrollTop = el.scrollHeight;
  }, 50);
  // Focus input
  setTimeout(()=>{ document.getElementById('chat-input')?.focus(); }, 300);
}

function closeChat(){
  document.getElementById('chat-panel')?.classList.remove('open');
}

function renderChatMessages(){
  const el = document.getElementById('chat-messages');
  if(!el) return;
  const msgs = leagueState?.chat || [];
  const myId = getMyId();
  const managers = leagueState?.managers || [];

  if(!msgs.length){
    el.innerHTML = `<div style="text-align:center;padding:40px 16px;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO MESSAGES YET<br/><br/>BE THE FIRST TO TALK TRASH 🗑️</div>`;
    return;
  }

  el.innerHTML = msgs.map(m=>{
    const mine = m.managerId === myId;
    const mgr = managers.find(x=>x.id===m.managerId);
    const name = mgr?.display_name || 'Unknown';
    const color = mgr?.color || '#4a9eff';
    const time = new Date(m.ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
    const dateStr = new Date(m.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const avatar = avatarEl(name, color, 26, 6, mgr?.icon||null, mgr?.photo||null);
    return `
      <div class="chat-msg${mine?' mine':''}">
        ${!mine ? avatar : ''}
        <div>
          ${!mine ? `<div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-bottom:3px">${name}</div>` : ''}
          <div class="chat-msg-bubble">${escapeHtml(m.text)}</div>
          <div class="chat-msg-meta">${dateStr} · ${time}</div>
        </div>
        ${mine ? avatar : ''}
      </div>`;
  }).join('');
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function sendChatMessage(){
  const input = document.getElementById('chat-input');
  const text = (input?.value||'').trim();
  if(!text) return;
  const mid = getMyId();
  if(!mid){ toast('Sign in to chat!'); return; }
  const msg = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), managerId:mid, text, ts: new Date().toISOString() };
  if(!leagueState.chat) leagueState.chat = [];
  leagueState.chat.push(msg);
  // Trim to last 200 messages
  if(leagueState.chat.length > 200) leagueState.chat = leagueState.chat.slice(-200);
  if(input) input.value = '';
  await saveLeagueState();
  setChatLastSeen(msg.ts);
  renderChatMessages();
  updateChatBadge();
  setTimeout(()=>{
    const el = document.getElementById('chat-messages');
    if(el) el.scrollTop = el.scrollHeight;
  }, 30);
}

async function pollChat(){
  try{
    await loadLeagueState();
    const panel = document.getElementById('chat-panel');
    const isOpen = panel?.classList.contains('open');
    if(isOpen){
      renderChatMessages();
      const msgs = leagueState?.chat || [];
      if(msgs.length) setChatLastSeen(msgs[msgs.length-1].ts);
    }
    updateChatBadge();
  }catch(e){}
}

function startChatPoll(){
  if(chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(pollChat, CHAT_POLL_MS);
}

// ── GAME TICKER ──────────────────────────────────────────────────────────────
const TICKER_REFRESH_MS = 60_000; // refresh every minute
let tickerTimer = null;

async function startTicker(){
  await fetchAndRenderTicker();
  tickerTimer = setInterval(fetchAndRenderTicker, TICKER_REFRESH_MS);
}

async function fetchAndRenderTicker(){
  const nowET       = new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  const etHour      = nowET.getHours();
  const todayET     = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
  const yesterdayET = new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'America/New_York'});

  const showYesterday = etHour < 9;
  const datesToFetch  = showYesterday ? [yesterdayET] : [todayET, yesterdayET];
  const fmt = d => d.slice(0,10).replace(/-/g,'');

  // Always fetch ESPN for accurate ISO game times (BDL /games has no time field)
  let espnEvents = [];
  try{
    for(const d of datesToFetch){
      try{
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${fmt(d)}`);
        if(res.ok){ const data=await res.json(); espnEvents=espnEvents.concat(data.events||[]); }
      }catch(e){}
    }
  }catch(e){}

  // Build teamTimeMap: abbr → "7:30 PM ET" from ESPN ISO datetimes
  const teamTimeMap = {};
  for(const ev of espnEvents){
    const comp = ev.competitions?.[0];
    if(!comp) continue;
    const isoDate = ev.date || comp.date;
    if(!isoDate) continue;
    // Convert UTC ISO to ET time string
    const timeStr = new Date(isoDate).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET';
    for(const t of (comp.competitors||[])){
      const abbr = espnToAbbr(t.team?.abbreviation?.toUpperCase());
      if(abbr) teamTimeMap[abbr] = timeStr;
    }
  }

  // Use ESPN for rendering — it has live scores, final scores, and accurate game times.
  // BDL /games doesn't update live scores fast enough for the ticker.
  renderTicker(espnEvents, todayET, showYesterday);
  // todayGamesCache is now populated — redraw lineup views so game info/scores are current
  renderLineupPreview();
  renderMyRosterList();

  // Auto-settle team-win duels now that todayGamesCache is populated with final scores
  try {
    const todayK = todayKey();
    const yesterdayK = getPrevDateKey(todayK);
    for(const dk of [todayK, yesterdayK]){
      const d = (leagueState.duels||{})[dk];
      if(d && d.stat === 'team' && (d.result===null || d.result===undefined)){
        autoSettleDuelFromStats(dk, false).then(settled => {
          if(settled) { renderDuelCard(); if(currentScreen==='duel') renderDuelScreen(); }
        });
      }
    }
  } catch(e){ console.warn('Auto-settle team duel error:', e); }
}

// Render ticker from BDL /games response
// showYesterday: when true (before 9 AM ET) only show yesterday's finals, no upcoming times
function renderTickerBdl(games, todayDate, showYesterday, teamTimeMap={}){
  const el    = document.getElementById('game-ticker');
  const track = document.getElementById('ticker-track');
  if(!el || !track) return;

  // Sort: live first, then today upcoming, then finals
  const order = g => g.status==='In Progress' ? 0 : (g.status==='Final'||g.status?.startsWith('Final')) ? 2 : 1;
  games.sort((a,b)=>order(a)-order(b));

  let html = buildTickerDraftHtml(); // draft window items

  // Get game time: prefer ESPN teamTimeMap (has full ISO datetime), BDL g.date is date-only
  const getTime = g => {
    const away = g.visitor_team?.abbreviation?.toUpperCase();
    const home = g.home_team?.abbreviation?.toUpperCase();
    return teamTimeMap[away] || teamTimeMap[home] || '';
  };

  for(const g of games){
    const away = g.visitor_team?.abbreviation || '???';
    const home = g.home_team?.abbreviation    || '???';
    const st = g.status || '';
    const isFinal    = st === 'Final' || st.startsWith('Final');
    const isLiveBdl  = st === 'In Progress';
    // BDL upcoming status is a time string like "7:00 pm" or "" — anything that isn't Final/In Progress
    const isUpcoming = !isFinal && !isLiveBdl;
    const awayScore = isLiveBdl || isFinal ? (g.visitor_team_score ?? '') : '';
    const homeScore = isLiveBdl || isFinal ? (g.home_team_score    ?? '') : '';
    const isYesterday = g.date && !g.date.startsWith(todayDate);

    if(isFinal){
      if(isYesterday && !showYesterday) continue;
      const awayWin = parseFloat(awayScore) > parseFloat(homeScore);
      const homeWin = parseFloat(homeScore) > parseFloat(awayScore);
      html += `<div class="ticker-game">
        <span class="final">${isYesterday ? 'FINAL ✓' : 'FINAL'}</span>
        <span>${away} <span class="score" ${awayWin?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span style="color:var(--border)">·</span>
        <span>${home} <span class="score" ${homeWin?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
    } else if(isLiveBdl){
      if(isYesterday) continue;
      const awayLead = parseFloat(awayScore) > parseFloat(homeScore);
      const homeLead = parseFloat(homeScore) > parseFloat(awayScore);
      const period = g.period ? `Q${g.period}` : 'LIVE';
      html += `<div class="ticker-game">
        <span class="live-dot"></span>
        <span>${away} <span class="score" ${awayLead?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span class="period">${period}</span>
        <span>${home} <span class="score" ${homeLead?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
    } else {
      // Upcoming — only show from 9 AM ET, today's games only
      if(showYesterday || isYesterday) continue;
      html += `<div class="ticker-game">
        <span class="upcoming">${getTime(g)}</span>
        <span>${away} vs ${home}</span>
      </div>`;
    }
  }

  // Populate todayGamesCache for lineup schedule display
  todayGamesCache = {};
  for(const g of games){
    const isYesterday = g.date && !g.date.startsWith(todayDate);
    if(isYesterday || g.status==='Final' || g.status?.startsWith('Final')) continue;
    const away = g.visitor_team?.abbreviation || '';
    const home = g.home_team?.abbreviation    || '';
    const timeStr = getTime(g);
    const isLive = g.status === 'In Progress';
    const period = g.period || '';
    // Only use scores when live — upcoming games have score=0 which is misleading
    const awayScore = isLive ? (g.visitor_team_score ?? null) : null;
    const homeScore = isLive ? (g.home_team_score    ?? null) : null;
    if(away) todayGamesCache[away] = { opponent: home, time: timeStr, isHome: false, isLive, period, myScore: awayScore, oppScore: homeScore };
    if(home) todayGamesCache[home] = { opponent: away, time: timeStr, isHome: true,  isLive, period, myScore: homeScore, oppScore: awayScore };
  }

  if(!html){ el.style.display='none'; return; }
  track.innerHTML = html + html;
  el.style.display = 'flex';
  const totalW = track.scrollWidth / 2;
  const speed = Math.max(20, totalW / 80);
  track.style.animationDuration = `${speed}s`;
}

// Helper: get today's game info for an NBA team abbreviation
// Returns an HTML string for display, or null if no game today.
// e.g. "@ DET, 3 PM ET"  or  "vs GSW · Q3 · 88-91" (live)
// " · 18.5 FP" in green: the FP a player has earned in today's game (live or final)
function gameFpTag(pid){
  if(pid==null) return '';
  const st = livePlayerStats[pid];
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,'');
  if(!st || (st.dateStr && String(st.dateStr)!==today)) return '';
  return ` <span style="color:#39ff6a">· ${(+st.fp||0).toFixed(1)} FP</span>`;
}

function getTodayGameInfo(teamAbbr, pid){
  if(!teamAbbr) return null;
  const abbr = teamAbbr.toUpperCase();
  const g = todayGamesCache[abbr];
  if(!g) return null;
  const matchup = `${g.isHome ? 'vs' : '@'} ${g.opponent}`;
  if(g.isLive && g.myScore !== null && g.oppScore !== null){
    const pLabel = g.period ? `Q${g.period}` : 'LIVE';
    const leading = parseFloat(g.myScore) > parseFloat(g.oppScore);
    const trailing = parseFloat(g.myScore) < parseFloat(g.oppScore);
    const scoreColor = leading ? '#4ade80' : trailing ? 'var(--accent4)' : 'var(--text1)';
    return `<span style="color:#f6ad55">${matchup} · ${pLabel}</span> <span style="color:${scoreColor};font-weight:700">${g.myScore}–${g.oppScore}</span>${gameFpTag(pid)}`;
  }
  // Finished: keep opponent + final score, "F" where the quarter goes
  if(g.isFinal && g.myScore !== null && g.myScore !== undefined){
    const won = parseFloat(g.myScore) > parseFloat(g.oppScore);
    return `<span style="color:var(--text2)">${matchup} · F</span> <span style="color:${won?'#4ade80':'var(--accent4)'};font-weight:700">${g.myScore}–${g.oppScore}</span>${gameFpTag(pid)}`;
  }
  // Upcoming: show in teal
  return `<span style="color:var(--accent2)">${matchup}${g.time ? ', '+g.time : ''}</span>`;
}

// Extract draft-window ticker items (shared between BDL and ESPN renderers)
function buildTickerDraftHtml(){
  let html = '';
  const now = new Date();
  DRAFT_WINDOWS.forEach(dw => {
    const s = new Date(dw.start), e = new Date(dw.end);
    const oneDayBefore = new Date(s); oneDayBefore.setDate(s.getDate()-1);
    const isActive  = now >= s && now <= e;
    const isPreview = !isActive && now >= oneDayBefore && now < s;
    if(isPreview){
      const fmtT = d => d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET';
      html += `<div class="ticker-game">
        <span class="upcoming" style="background:var(--accent2)">DRAFT</span>
        <span>${dw.label} starts ${fmtT(s)}</span>
      </div>`;
    }
    if(isActive){
      const onClock = getDraftOnClock(dw.run);
      let nextUp = null;
      if(leagueState?.drafts){
        const draft = leagueState.drafts[dw.run];
        if(draft?.status==='active'){
          const managers = getDraftOrder(dw.run);
          if(managers.length){
            const pick = (draft.currentPick||0)+1;
            const round = Math.floor(pick/managers.length);
            const posInRound = pick%managers.length;
            const idx = round%2===0 ? posInRound : (managers.length-1-posInRound);
            nextUp = teamLabel(managers[idx])||null;
          }
        }
      }
      html += `<div class="ticker-game">
        <span class="live-dot"></span>
        <span style="font-weight:700">${dw.label}</span>
        ${onClock ? `<span>🎯 ON CLOCK: <strong>${onClock}</strong></span>` : ''}
        ${nextUp ? `<span style="color:var(--text3)">↳ NEXT: ${nextUp}</span>` : ''}
      </div>`;
    }
  });
  return html;
}

// ESPN fallback ticker renderer
// showYesterday: when true (before 9 AM ET) only show yesterday finals, no upcoming
function renderTicker(events, todayDate, showYesterday){
  // Homepage scoreboard: today's games (or yesterday's finals before any today)
  const etDay = ev => ev.date ? new Date(ev.date).toLocaleDateString('en-CA',{timeZone:'America/New_York'}) : '';
  const todays = events.filter(ev=>etDay(ev)===todayDate);
  setScoreboardEvents(todays.length && !showYesterday ? todays : events.filter(ev=>etDay(ev)!==todayDate));

  const el = document.getElementById('game-ticker');
  const track = document.getElementById('ticker-track');
  if(!el || !track) return;

  const fmtTime = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET';
  };

  let html = buildTickerDraftHtml();

  // Live/upcoming first, then finals
  const sorted = [...events].sort((a,b)=>{
    const stA = a.competitions?.[0]?.status?.type?.state;
    const stB = b.competitions?.[0]?.status?.type?.state;
    return (stA==='in'?0:stA==='pre'?1:2) - (stB==='in'?0:stB==='pre'?1:2);
  });

  // Populate todayGamesCache for player schedule display (pre/live games today only)
  todayGamesCache = {};
  sorted.forEach(ev => {
    const comp2 = ev.competitions?.[0];
    if(!comp2) return;
    const ts = comp2.competitors || [];
    const h2 = ts.find(t=>t.homeAway==='home') || ts[0];
    const a2 = ts.find(t=>t.homeAway==='away') || ts[1];
    const hAbbr2 = h2?.team?.abbreviation?.toUpperCase();
    const aAbbr2 = a2?.team?.abbreviation?.toUpperCase();
    const evDateStr2 = ev.date ? new Date(ev.date).toLocaleDateString('en-CA',{timeZone:'America/New_York'}) : '';
    const isYday2 = todayDate && evDateStr2 !== todayDate;
    const state2 = comp2.status?.type?.state;
    if(!isYday2 && hAbbr2 && aAbbr2){
      const timeStr = fmtTime(comp2.date || ev.date || '');
      const clock2     = comp2.status?.displayClock || '';
      const clockIsIso2 = /^\d{4}-\d{2}-\d{2}T/.test(clock2);
      const periodNum2  = comp2.status?.period || 0;
      // Only truly live if period > 0 and clock isn't an ISO timestamp
      const isLive2 = state2 === 'in' && periodNum2 > 0 && !clockIsIso2;
      const isFinal2 = state2 === 'post';
      const hScore2 = (isLive2 || isFinal2) ? (h2?.score ?? null) : null;
      const aScore2 = (isLive2 || isFinal2) ? (a2?.score ?? null) : null;
      const period2 = isLive2 ? periodNum2 : '';
      // Normalize ESPN abbreviations (e.g. GS→GSW, NY→NYK, SA→SAS, NO→NOP) before caching
      const normH2 = espnToAbbr(hAbbr2);
      const normA2 = espnToAbbr(aAbbr2);
      todayGamesCache[normA2] = { opponent: normH2, time: timeStr, isHome: false, isLive: isLive2, isFinal: isFinal2, period: period2, myScore: aScore2, oppScore: hScore2 };
      todayGamesCache[normH2] = { opponent: normA2, time: timeStr, isHome: true,  isLive: isLive2, isFinal: isFinal2, period: period2, myScore: hScore2, oppScore: aScore2 };
    }
  });

  sorted.forEach(ev => {
    const comp = ev.competitions?.[0];
    if(!comp) return;
    const teams = comp.competitors || [];
    const home = teams.find(t=>t.homeAway==='home') || teams[0];
    const away = teams.find(t=>t.homeAway==='away') || teams[1];
    const stateVal = comp.status?.type?.state;
    const homeAbbr = espnToAbbr(home?.team?.abbreviation?.toUpperCase() || '???');
    const awayAbbr = espnToAbbr(away?.team?.abbreviation?.toUpperCase() || '???');
    const homeScore = home?.score || '';
    const awayScore = away?.score || '';
    // ESPN stores game dates in UTC — convert to ET date for day comparison
    // e.g. OKC vs SAS at 9:30 PM ET = 01:30 UTC next day, so UTC slice would be wrong
    const evDateET = ev.date ? new Date(ev.date).toLocaleDateString('en-CA',{timeZone:'America/New_York'}) : '';
    const isYesterday = todayDate && evDateET !== todayDate;

    if(stateVal==='in'){
      if(isYesterday) return; // stale live score — skip
      const period = comp.status?.period || 0;
      const clock  = comp.status?.displayClock || '';
      // ESPN sometimes marks pre-game events as 'in' with period=0 and clock=ISO timestamp
      // Treat period=0 (or clock looks like ISO date) as upcoming, not live
      const clockIsIso = /^\d{4}-\d{2}-\d{2}T/.test(clock);
      if(period === 0 || clockIsIso){
        // Treat as upcoming
        if(showYesterday || isYesterday) return;
        html += `<div class="ticker-game">
          <span class="upcoming">${fmtTime(comp.date || ev.date)}</span>
          <span>${awayAbbr} vs ${homeAbbr}</span>
        </div>`;
      } else {
        const pLabel = period===5 ? 'OT' : `Q${period}`;
        const awayLead = parseFloat(awayScore) > parseFloat(homeScore);
        const homeLead = parseFloat(homeScore) > parseFloat(awayScore);
        html += `<div class="ticker-game">
          <span class="live-dot"></span>
          <span>${awayAbbr} <span class="score" ${awayLead?'style="color:#4ade80"':''}>${awayScore}</span></span>
          <span class="period">${pLabel} ${clock}</span>
          <span>${homeAbbr} <span class="score" ${homeLead?'style="color:#4ade80"':''}>${homeScore}</span></span>
        </div>`;
      }
    } else if(stateVal==='post'){
      if(isYesterday && !showYesterday) return; // past yesterday window
      const awayWin = parseFloat(awayScore) > parseFloat(homeScore);
      const homeWin = parseFloat(homeScore) > parseFloat(awayScore);
      html += `<div class="ticker-game">
        <span class="final">${isYesterday ? 'FINAL ✓' : 'FINAL'}</span>
        <span>${awayAbbr} <span class="score" ${awayWin?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span style="color:var(--border)">·</span>
        <span>${homeAbbr} <span class="score" ${homeWin?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
    } else {
      if(showYesterday || isYesterday) return; // no upcoming before 9 AM
      html += `<div class="ticker-game">
        <span class="upcoming">${fmtTime(comp.date || ev.date)}</span>
        <span>${awayAbbr} vs ${homeAbbr}</span>
      </div>`;
    }
  });

  if(!html){ el.style.display='none'; return; }
  track.innerHTML = html + html;
  el.style.display = 'flex';
  const totalW = track.scrollWidth / 2;
  const speed = Math.max(20, totalW / 80);
  track.style.animationDuration = `${speed}s`;
}

// ── TAP FEEDBACK ─────────────────────────────────────────────────────────────
// iOS Safari only applies :active styles when the page has a touch listener.
document.addEventListener('touchstart', ()=>{}, {passive:true});
// Roster action buttons: show a pending state from tap until the save completes
// (the list redraws, replacing the button). If nothing redraws, e.g. the player
// is locked, restore the button after a moment.
const PENDING_ACTIONS = /toggleActiveStatus|confirmDrop|putOnIR|removeFromIR|rostersDropMode/;
document.addEventListener('click', e=>{
  const btn = e.target.closest && e.target.closest('button');
  if(!btn || !PENDING_ACTIONS.test(btn.getAttribute('onclick')||'')) return;
  const label = btn.innerHTML;
  btn.classList.add('btn-pending');
  btn.innerHTML = '…';
  setTimeout(()=>{ if(btn.isConnected){ btn.classList.remove('btn-pending'); btn.innerHTML = label; } }, 1500);
}, true);

// ── BOOT ────────────────────────────────────────────────────────────────────
async function boot(){
  // Load BDL key and player data early (no auth needed for config read)
  await loadBdlKey();
  // BDL is the single source of truth for player data.
  // loadBdlPlayers() rebuilds PLAYERS from /players/active, then chains loadBdlSeasonAverages()
  // to populate BDL_STATS with live FP projections. Both run fire-and-forget.
  loadBdlPlayers();
  bdlInjuriesReady = loadBdlInjuries();
  loadWeekGames();
  setInterval(loadWeekGames, 60*60*1000);
  setInterval(loadBdlInjuries, BDL_INJURY_CACHE_TTL); // keep injury report fresh while app is open

  // Auth state listener
  db.auth.onAuthStateChange(async (event,session)=>{
    currentUser=session?.user||null;
    if(currentUser){
      const isFirstLogin = event==='SIGNED_IN' || event==='INITIAL_SESSION';
      await loadManagerProfile();
      await loadLeagueState();
      await loadPortraits();
      await ensureTodaysDuel();
      maybeSwapInjuredDuel();
      updateUserChip();
      if(isFirstLogin){
        // Only navigate to home on actual login — not on silent token refreshes
        showApp();
        renderHomeScreen();
        startPolling();
        maybeShowWeekResults();
      }
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
  startTicker();
  startChatPoll();
  updateChatBadge();
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

// Assign tiers $1-$5 to a sorted pool of 25 players (top 5 = $5, next 5 = $4, etc.)
function assignTiers(pool){
  // pool already sorted best→worst by fpPG; split into 5 buckets of 5
  return pool.map((p, i) => ({
    ...p,
    tier: 5 - Math.floor(i / WLC_TIER_SIZE),   // 0-4 → tier5,4,3,2,1
    salary: 5 - Math.floor(i / WLC_TIER_SIZE),  // salary == tier value ($1–$5)
  }));
}

// Get or create current week key (Mon–Sun, starts Monday)
function wlcWeekKey(date){
  // Use local date to avoid UTC midnight boundary issues
  let d;
  if(!date){
    d = new Date();
  } else if(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)){
    // Parse YYYY-MM-DD as local noon to avoid UTC/local day boundary bugs
    const [y,m,day] = date.split('-').map(Number);
    d = new Date(y, m-1, day, 12, 0, 0);
  } else {
    d = new Date(date);
  }
  const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  // Days since Monday: Sun=6, Mon=0, Tue=1...Sat=5
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMonday);
  // Return YYYY-MM-DD in local time
  const yr = monday.getFullYear();
  const mo = String(monday.getMonth()+1).padStart(2,'0');
  const dy = String(monday.getDate()).padStart(2,'0');
  return `${yr}-${mo}-${dy}`;
}

function wlcWeekLabel(weekKey){
  const [y,m,d] = weekKey.split('-').map(Number);
  const mon = new Date(y, m-1, d, 12); // local noon to avoid UTC boundary
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `${fmt(mon)} – ${fmt(sun)}`;
}

// TEST MODE: a week with a `testers` list is visible only to those managers and
// never touches the real standings. Weeks without `testers` are live for everyone.
function wlcVisibleWeek(wk){
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week) return null;
  if(Array.isArray(week.testers) && !week.testers.map(String).includes(String(getMyId()))) return null;
  return week;
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
// Saved stat dates are 'YYYYMMDD' strings, which new Date() can't parse.
// Returns that day at noon local time (noon avoids timezone edge flips).
function statDateObj(d){
  const x = String(d||'');
  if(/^\d{8}$/.test(x)) return new Date(+x.slice(0,4), +x.slice(4,6)-1, +x.slice(6,8), 12);
  return new Date(x);
}

// Pool names come from the projections file and may differ from BDL names
// (accents, punctuation), so match exactly first, then by normalized name.
function wlcFindPlayer(name){
  return PLAYERS.find(p=>p.name===name) || PLAYERS.find(p=>normName(p.name)===normName(name)) || null;
}
function etDateStr(d){ return (d||new Date()).toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replace(/-/g,''); }
// [first, last] game dates of a WLC week as YYYYMMDD (Mon..Sun)
function wlcWeekRange(wk){
  const [y,m,d]=wk.split('-').map(Number);
  const a=new Date(y,m-1,d,12), b=new Date(a); b.setDate(a.getDate()+6);
  const f=x=>`${x.getFullYear()}${String(x.getMonth()+1).padStart(2,'0')}${String(x.getDate()).padStart(2,'0')}`;
  return [f(a), f(b)];
}
// {YYYYMMDD: statLine} for a player's games in [from,to]: saved lines plus
// today's live game if not saved yet (one line per date)
function wlcStatLines(p, from, to){
  const lines={};
  for(const st of Object.values(leagueState.playerStats||{})){
    if(String(st.pid)!==String(p.id)) continue;
    const d=String(st.date);
    if(d>=from && d<=to && !(d in lines)) lines[d]=st;
  }
  const live=livePlayerStats[p.id];
  if(live && live.dateStr && !(live.dateStr in lines) && live.dateStr>=from && live.dateStr<=to) lines[live.dateStr]={...live, _live:!!live.live};
  return lines;
}
function wlcGameLines(p, from, to){
  const out={}; for(const [d,st] of Object.entries(wlcStatLines(p,from,to))) out[d]=st.fp||0; return out;
}

// One entry per lineup slot. A slot's games are its player's games, split at a
// swap by game date:
//  • swapped-out player keeps games before the swap date, plus the swap date
//    only if his game had already started when the swap was made
//  • swapped-in player gets games from the swap date on (swaps are blocked
//    once his game has started that day)
// SCORING: a slot scores its AVERAGE FP per game played (0 if no games), so
// picking players with more games that week is no advantage.
function wlcSlots(picks, swaps, weekKey){
  const [ws, we] = wlcWeekRange(weekKey);
  const swapDate = sw => sw.date || etDateStr(new Date(sw.time));
  return (picks||[]).map(name=>{
    const sw = (swaps||[]).find(x=>x.from===name) || null;
    const games = [];
    const add = (pname, keep) => {
      const p = wlcFindPlayer(pname); if(!p) return;
      for(const [d,st] of Object.entries(wlcStatLines(p, ws, we))) if(keep(d)) games.push({date:d, player:p.name, st});
    };
    if(sw){ const sd=swapDate(sw); add(name, d=>d<sd || (d===sd && sw.fromStarted)); add(sw.to, d=>d>=sd); }
    else add(name, ()=>true);
    games.sort((a,b)=>a.date.localeCompare(b.date));
    const total = games.reduce((a,g)=>a+(g.st.fp||0), 0);
    return {name, swap:sw, games, gp:games.length, avg: games.length ? total/games.length : 0};
  });
}

function computeWlcFP(picks, swaps, weekKey){
  const wk = weekKey || wlcWeekKey();
  if(!(leagueState.wlc?.weeks||{})[wk]) return 0;
  return +wlcSlots(picks, swaps, wk).reduce((a,sl)=>a+sl.avg, 0).toFixed(1);
}

// Save my WLC lineup
async function saveWlcLineup(picks){
  const wk = wlcWeekKey();
  const mid = getMyId();
  if(!mid) return;
  if(isWlcLocked(wk)){ toast('LOCKED — picks closed for this week'); return; }
  if(getMyWlcLineup(wk).saved){ toast('Your lineup is already final'); return; }
  const pool = (leagueState.wlc?.weeks?.[wk]?.pool)||[];
  const cost = picks.reduce((a,n)=>a+(pool.find(p=>p.n===n)?.salary||0),0);
  if(!picks.length || picks.length>WLC_TEAM_SIZE || cost>WLC_SALARY_CAP){ toast('Lineup must be 1–5 players, $15 or less'); return; }
  if(!leagueState.wlc) leagueState.wlc = {weeks:{},lineups:{},results:{},standings:{}};
  if(!leagueState.wlc.lineups[wk]) leagueState.wlc.lineups[wk] = {};
  leagueState.wlc.lineups[wk][mid] = {picks:[...picks], swaps:[], saved:true, savedAt:new Date().toISOString()};
  await saveLeagueState();
  window._wlcPicksWeekKey = null;
  window._wlcTab = 'pick'; // saved lineups are final: land on Current Week's Lineups
  toast('LINEUP SAVED — GOOD LUCK! ✓');
  renderWlcScreen();
  window.scrollTo({top:0, behavior:'smooth'});
}

// "Are you sure?" before a lineup becomes final
function confirmWlcSave(){
  const picks = window._wlcCurrentPicks||[];
  document.getElementById('wlc-confirm-modal')?.remove();
  const m = document.createElement('div');
  m.id = 'wlc-confirm-modal'; m.className = 'modal-overlay'; m.style.display = 'flex';
  m.innerHTML = `<div class="modal-box" style="max-width:340px;width:calc(100% - 32px);text-align:center">
    <div style="font-family:var(--pixel);font-size:9px;color:var(--accent3);margin-bottom:12px">ARE YOU SURE?</div>
    <div style="font-family:var(--pixel);font-size:7px;line-height:1.8;color:var(--text2);margin-bottom:16px">${wlcPickCost(picks) < WLC_SALARY_CAP ? `You have not used all $${WLC_SALARY_CAP}. ` : ''}Roster will be final and cannot be changed once saved.</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary btn-full" onclick="document.getElementById('wlc-confirm-modal').remove();saveWlcLineup(window._wlcCurrentPicks||[])">YES, SAVE</button>
      <button class="btn btn-secondary btn-full" onclick="document.getElementById('wlc-confirm-modal').remove()">NO, CANCEL</button>
    </div></div>`;
  m.onclick = e=>{ if(e.target===m) m.remove(); };
  document.body.appendChild(m);
}

// SWAP RULE: the Weekly Challenge is a commit-for-the-week game. After lock, the
// only allowed change is ONE swap per week, of a player listed OUT on the injury
// report, for a same-tier player from the pool.
function wlcSwapBlockReason(lineup, fromName){
  if((lineup.swaps||[]).length >= 1) return 'You already used your swap this week';
  const p = wlcFindPlayer(fromName);
  if(!injuryInfo(p?.name || fromName)?.isOut) return 'Only players listed OUT can be swapped';
  return null;
}

// Mid-week swap: replace 'fromName' with 'toName' (same tier, from original pool)
async function doWlcSwap(fromName, toName){
  const wk = wlcWeekKey();
  const mid = getMyId();
  if(!mid) return;
  if(!isWlcLocked(wk) && !getMyWlcLineup(wk).saved){ toast('Save your lineup first'); return; }
  const week = (leagueState.wlc?.weeks||{})[wk];
  if(!week){ toast('No active week'); return; }
  const lineup = getMyWlcLineup(wk);
  if(!lineup.picks.includes(fromName)){ toast('Player not in your lineup'); return; }
  const blocked = wlcSwapBlockReason(lineup, fromName);
  if(blocked){ toast(blocked); return; }
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
  // Can't swap in a player whose game today has already tipped off
  if(isPlayerLocked(wlcFindPlayer(toName))){ toast(`${toName}'s game has started — pick someone else`); return; }
  const swap = {from:fromName, to:toName, time:new Date().toISOString(), date:etDateStr(),
                fromStarted: isPlayerLocked(wlcFindPlayer(fromName))};
  lineup.swaps = [...(lineup.swaps||[]), swap];
  leagueState.wlc.lineups[wk][mid] = lineup;
  await saveLeagueState();
  document.getElementById('wlc-swap-modal')?.remove();
  toast(`SWAP COMPLETE ✓ ${fromName.split(' ').pop()} ➜ ${toName.split(' ').pop()}`);
  renderWlcScreen();
}

// Commissioner adjustments to a week's generated pool: [slot currently holding A, B goes there].
// Applied all at once against the generated pool; B takes A's tier and price.
const WLC_POOL_TWEAKS = {
  '2026-10-19': [ // test week, set Oct 23
    ['Cooper Flagg','Deni Avdija'],          // $1
    ['Stephen Curry','Kon Knueppel'],        // $1 (OUT, for testing the injury swap)
    ['Deni Avdija','LeBron James'],          // $2
    ['Josh Giddey','Anthony Davis'],         // $3
    ['Anthony Davis','Jalen Johnson'],       // $4
    ['Jalen Johnson','Shai Gilgeous-Alexander'], // $5
  ],
};
function applyWlcPoolTweaks(weekKey, pool){
  const tweaks = WLC_POOL_TWEAKS[weekKey]; if(!tweaks) return pool;
  const out = pool.map(p=>({...p}));
  for(const [from, to] of tweaks){
    const i = pool.findIndex(p=>normName(p.n)===normName(from)); // positions from the original pool
    if(i<0) continue;
    const db = PLAYERS_DB.find(p=>normName(p.n)===normName(to)) || {n:to};
    const cur = wlcFindPlayer(db.n);
    out[i] = {...db, t:cur?.team||db.t, tier:pool[i].tier, salary:pool[i].salary};
  }
  return out;
}

// Generate a WLC week proposal (commissioner-facing)
// Called by commissioner to create next week's pool; auto-picks theme
function generateWlcProposal(forDate){
  const wk = wlcWeekKey(forDate);
  // Suggest a theme based on week number (cycle through themes)
  // Parse week keys as local noon to avoid UTC boundary issues
  const parseWkDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d,12); };
  const weekNum = Math.max(0, Math.floor((parseWkDate(wk) - parseWkDate('2026-10-19')) / (7*24*3600*1000)));
  const themes = [
    {name:'Former All-Stars', filter: p => p.r <= 50},
    {name:'Atlantic Division', filter: p => ['BOS','BKN','NYK','PHI','TOR'].includes(p.t)},
    {name:'Central Division',  filter: p => ['CHI','CLE','DET','IND','MIL'].includes(p.t)},
    {name:'Southeast Division',filter: p => ['ATL','CHA','MIA','ORL','WAS'].includes(p.t)},
    {name:'Northwest Division',filter: p => ['DEN','MIN','OKC','POR','UTA'].includes(p.t)},
    {name:'Pacific Division',  filter: p => ['GSW','LAC','LAL','PHX','SAC'].includes(p.t)},
    {name:'Southwest Division',filter: p => ['DAL','HOU','MEM','NOP','SAS'].includes(p.t)},
    {name:'Rising Stars',      filter: p => p.r >= 30 && p.r <= 100},
    {name:'Top 25',            filter: p => p.r <= 25},
    {name:'East Conference',   filter: p => ['BOS','BKN','NYK','PHI','TOR','CHI','CLE','DET','IND','MIL','ATL','CHA','MIA','ORL','WAS'].includes(p.t)},
    {name:'West Conference',   filter: p => ['DEN','MIN','OKC','POR','UTA','GSW','LAC','LAL','PHX','SAC','DAL','HOU','MEM','NOP','SAS'].includes(p.t)},
    {name:'Class of 2025',     filter: p => ['Cooper Flagg','Dylan Harper','Kon Knueppel','Matas Buzelis','Darryn Peterson','Darius Acuff Jr.','Derik Queen'].includes(p.n)},
    {name:'Veterans Club',     filter: p => VETERANS.includes(p.n)},
    {name:'Centers & Bigs',    filter: p => ['C','PF'].some(pos=>{ const dbP = PLAYERS.find(pl=>pl.name===p.n); return dbP && dbP.pos && dbP.pos.includes(pos); })},
    {name:'Point Guards',      filter: p => { const dbP = PLAYERS.find(pl=>pl.name===p.n); return dbP && dbP.pos && dbP.pos.includes('PG'); }},
  ];
  const theme = themes[weekNum % themes.length];
  // Projections file teams can be stale; use each player's current team, and
  // skip anyone not on an active roster
  const db = PLAYERS_DB.map(p=>{ const cur=wlcFindPlayer(p.n); return cur ? {...p, t:cur.team||p.t} : null; }).filter(Boolean);
  let eligible = db.filter(theme.filter);
  // Need at least 25; if not enough, broaden to top ranked
  if(eligible.length < WLC_POOL_SIZE){
    // Supplement with overall top players not already included
    const names = new Set(eligible.map(p=>p.n));
    const extra = db.filter(p=>!names.has(p.n)).sort((a,b)=>b.fpPG-a.fpPG).slice(0, WLC_POOL_SIZE - eligible.length);
    eligible = [...eligible, ...extra];
  }
  // Sort by fpPG, take top 25
  const pool = eligible.sort((a,b)=>b.fpPG-a.fpPG).slice(0, WLC_POOL_SIZE);
  return { weekKey: wk, theme: theme.name, pool: applyWlcPoolTweaks(wk, assignTiers(pool)) };
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
  const maxFP = Math.max(0, ...Object.values(scores));
  // Nobody wins a week where no one scored (e.g. finalized before any games)
  const winners = maxFP > 0 ? Object.keys(scores).filter(id=>scores[id]===maxFP) : [];

  // Best possible 5 from pool (by actual week FP)
  const [ws, we] = wlcWeekRange(wk);
  const poolFPs = pool.map(p=>{
    const pl = wlcFindPlayer(p.n);
    const g = pl ? Object.values(wlcGameLines(pl, ws, we)) : [];
    const fp = g.length ? g.reduce((a,b)=>a+b,0)/g.length : 0; // weekly average
    return {name:p.n, fp:+fp.toFixed(1)};
  });
  const best5 = poolFPs.sort((a,b)=>b.fp-a.fp).slice(0,5);

  // Best user lineup
  let bestUserFP = -1, bestUserId = null;
  for(const [mid,fp] of Object.entries(scores)){
    if(fp>bestUserFP){ bestUserFP=fp; bestUserId=mid; }
  }
  const bestUserMgr = managers.find(m=>String(m.id)===String(bestUserId));

  return { scores, winners, best5, bestUser:{ id:bestUserId, name:bestUserMgr?.display_name||'—', fp:bestUserFP } };
}

// Update WLC standings after a week is finalized
async function finalizeWlcWeek(weekKey){
  const results = computeWlcResults(weekKey);
  if(!results) return;
  if(!leagueState.wlc.results) leagueState.wlc.results = {};
  if(!leagueState.wlc.standings) leagueState.wlc.standings = {};
  if(leagueState.wlc.weeks[weekKey]?.status === 'final') return; // never count a week twice
  leagueState.wlc.results[weekKey] = results;
  leagueState.wlc.weeks[weekKey].status = 'final';
  if(leagueState.wlc.weeks[weekKey].testers){ await saveLeagueState(); return; } // test week: real standings untouched
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

// Display name for a week's theme (the Oct 19 test week was generated as 'All-Stars')
function wlcThemeName(week, wk){
  const t = week?.theme || 'Week';
  return (t==='All-Stars') ? 'Former All-Stars' : t;
}

// Desktop: size the portrait grid so all five tier rows fit on screen at once,
// between the sticky preview panel and the sticky SAVE bar.
function wlcFitGrid(){
  const grid = document.querySelector('#wlc-content .wlc-grid');
  if(!grid) return;
  grid.style.removeProperty('--wlc-pimg-h'); grid.classList.remove('fit');
  if(window.innerWidth < 700) return;
  const h = id => document.getElementById(id)?.offsetHeight || 0;
  const pv = document.querySelector('#wlc-content .wlc-preview');
  const bar = document.querySelector('#wlc-content .wlc-bottom-bar');
  const avail = window.innerHeight - h('top-bar') - (pv?pv.offsetHeight+8:0) - (bar?bar.offsetHeight+12:0) - h('bottom-nav') - 16;
  const rows = [...grid.querySelectorAll('.wlc-tier-row')];
  if(!rows.length) return;
  const gap = 6;
  const card = rows[0].querySelector('.wlc-pcard'), img = card?.querySelector('.wlc-pimg');
  if(!card || !img) return;
  // tallest name block across all cards (names wrap to 2-3 lines)
  const nameH = Math.max(...[...grid.querySelectorAll('.wlc-pcard')].map(c=>c.offsetHeight - (c.querySelector('.wlc-pimg')?.offsetHeight||0)));
  const rowH = (avail - gap*(rows.length-1)) / rows.length;
  const imgH = Math.floor(rowH - nameH);
  if(imgH >= img.offsetWidth) return; // already fits
  grid.style.setProperty('--wlc-pimg-h', Math.max(34, imgH)+'px');
  grid.classList.add('fit');
}
window.addEventListener('resize', ()=>{ if(document.getElementById('wlc-content')?.offsetParent) wlcFitGrid(); });

function renderWlcScreen(){
  const el = document.getElementById('wlc-content');
  if(!el) return;
  if(!leagueState || !myProfile){ el.innerHTML='<div style="padding:20px;text-align:center;font-family:var(--pixel);font-size:7px;color:var(--text3)">LOADING...</div>'; return; }
  const wk = wlcWeekKey();
  const week = wlcVisibleWeek(wk);
  if(!week){ renderWlcNoWeek(el, wk); return; }
  if(week.status === 'pending'){ renderWlcPendingApproval(el, week, wk); return; }

  const locked = isWlcLocked(wk);
  const lineup = getMyWlcLineup(wk);
  const pool = week.pool || [];
  const final = !!lineup.saved || locked;
  if(window._wlcPicksWeekKey !== wk){ window._wlcCurrentPicks = [...lineup.picks]; window._wlcPicksWeekKey = wk; }
  if(!window._wlcTab) window._wlcTab = 'pick';
  const tab = window._wlcTab;
  const nav = document.getElementById('bottom-nav');
  if(nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight+'px');

  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const [ws, we] = wlcWeekRange(wk);
  const lockAt = (!locked && week.tipoffTime) ? ' · LOCKS ' + new Date(week.tipoffTime).toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit'}).toUpperCase() : '';
  const lockTxt = locked ? '🔒 PICKS LOCKED' : '<span class="nw">MAKE PICKS BEFORE</span> <span class="nw">MONDAY\'S FIRST TIP-OFF</span>';
  const tabBtn = (id,label) => `<button onclick="window._wlcTab='${id}';renderWlcScreen()" style="flex:1;padding:9px;background:none;border:none;font-family:var(--pixel);font-size:6px;cursor:pointer;color:${tab===id?'var(--accent2)':'var(--text3)'};border-bottom:${tab===id?'2px solid var(--accent2)':'none'}">${label}</button>`;

  let html = `
    <div class="wlc-banner">
      <div class="wlc-banner-theme"><span class="nw" style="color:#ffd93d">THIS WEEK'S THEME:</span> <span class="nw">${wlcThemeName(week, wk).toUpperCase()}</span></div>
      <div class="wlc-banner-dates">${fmt(statDateObj(ws))} – ${fmt(statDateObj(we))}${lockAt}</div>
      <div class="wlc-banner-lock${locked?' locked':''}">${lockTxt}</div>
      <div class="wlc-banner-sub">Choose the players you think will average the most Fantasy Points (FP) per game this week!</div>
      ${week.testers?'<div class="wlc-banner-test">🧪 TEST — ONLY TESTERS SEE THIS</div>':''}
    </div>
    <div style="display:flex;border-bottom:1px solid var(--border);margin:0 14px 12px">${tabBtn('pick', final?'CURRENT WEEK\'S LINEUPS':'PICK PLAYERS')}${tabBtn('standings','STANDINGS')}</div>`;

  if(tab==='standings'){
    el.innerHTML = html + '<div id="wlc-pane-standings" style="padding:0 14px 20px"></div>';
    renderWlcStandings(el.querySelector('#wlc-pane-standings'));
    return;
  }

  if(final){
    if(locked){
      // After lock everyone's lineup (including yours) is listed under All Entries
      html += wlcOtherLineupsHtml(wk, week, locked);
      el.innerHTML = html;
      return;
    }
    if(!lineup.picks.length){
      html += `<div class="card" style="margin:0 14px"><div class="empty-state"><div class="icon">🔒</div><div class="label">PICKS ARE LOCKED<br/><span style="color:var(--text3);font-size:5px">YOU DIDN'T SAVE A LINEUP THIS WEEK</span></div></div></div>`;
    } else {
      html += `<div class="section-label" style="padding:0 14px 6px">YOUR LINEUP</div>`;
      html += wlcLineupCardHtml(getMyId(), wk, true);
      html += `<div style="padding:8px 14px 4px;font-family:var(--pixel);font-size:5px;color:var(--text3);line-height:1.8">${(lineup.swaps||[]).length
        ? 'Your one swap for this week has been used.'
        : 'Your lineup is final. The only change allowed: one swap of a player listed OUT for a same-tier player whose game hasn\'t started.'}</div>`;
    }
    html += wlcOtherLineupsHtml(wk, week, locked);
    el.innerHTML = html;
    return;
  }

  // ── Picking grid (like the design mock): tier tag + 5 portraits per row ──
  const picks = window._wlcCurrentPicks||[];
  const cost = wlcPickCost(picks);
  const tb = document.getElementById('top-bar');
  if(tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight+'px');
  html += `<div class="wlc-proj-note">The listed "FP/G" is based on projections. Will soon be updated to reflect current stats.</div>`;
  html += wlcPreviewHtml(pool, picks);
  html += wlcGridHtml(pool, n=>`wlcOpenPlayer(${JSON.stringify(n).replace(/"/g,'&quot;')})`, picks, window._wlcPreview);
  const canSave = picks.length>=1 && picks.length<=WLC_TEAM_SIZE && cost<=WLC_SALARY_CAP;
  html += `
    <div class="wlc-bottom-bar">
      <div class="wlc-bb-stat"><div class="wlc-bb-label">SALARY REMAINING</div><div class="wlc-bb-val" style="color:var(--accent2)">$${WLC_SALARY_CAP-cost}</div></div>
      <div class="wlc-bb-stat"><div class="wlc-bb-label">PLAYERS SELECTED</div><div class="wlc-bb-val">${picks.length} / ${WLC_TEAM_SIZE}</div></div>
      <button class="wlc-bb-btn reset" ${picks.length?'':'disabled'} onclick="wlcStartOver()">START<br>OVER</button>
      <button class="wlc-bb-btn save${canSave?' ready':''}" ${canSave?'':'disabled'} onclick="confirmWlcSave()">SAVE<br>LINEUP</button>
    </div>`;
  el.innerHTML = html;
  requestAnimationFrame(wlcFitGrid);
}
function wlcStartOver(){
  window._wlcCurrentPicks = [];
  window._wlcPreview = null;
  renderWlcScreen();
}

// A manager's lineup for a week: each slot's player, price, games, average FP.
// showSwap: render the injury SWAP button on eligible slots (own lineup only).
function wlcLineupCardHtml(mid, wk, showSwap){
  const week = (leagueState.wlc?.weeks||{})[wk]; const pool = week?.pool||[];
  const lineup = ((leagueState.wlc?.lineups||{})[wk]||{})[mid] || {picks:[],swaps:[]};
  const slots = wlcSlots(lineup.picks, lineup.swaps, wk);
  const total = slots.reduce((a,sl)=>a+sl.avg,0);
  const locked = isWlcLocked(wk);
  const rows = slots.map(sl=>{
    const pp = pool.find(x=>x.n===sl.name);
    const cur = wlcFindPlayer(sl.swap ? sl.swap.to : sl.name);
    const nm = sl.swap ? `${(wlcFindPlayer(sl.name)?.name||sl.name)} <span style="color:var(--text3)">➜</span> ${cur?.name||sl.swap.to}` : (cur?.name||sl.name);
    const avg = k => sl.gp ? (sl.games.reduce((a,g)=>a+(g.st[k]||0),0)/sl.gp).toFixed(1) : '—';
    // The OUT swap is available once the lineup is final: saved, or picks locked
    const canSwap = showSwap && (locked || lineup.saved) && !sl.swap && !wlcSwapBlockReason(lineup, sl.name);
    return `<div style="padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="wlc-tier-chip t${pp?.tier||1}">$${pp?.salary||'?'}</span>
        <span onclick="${pcardOnclick(cur?.name||sl.name)}" style="flex:1;min-width:0;font-family:var(--pixel);font-size:6.5px;color:var(--text1);cursor:pointer">${nm}${injuryBadgeHtml(cur?.name||sl.name)}</span>
        ${canSwap?`<button onclick="openWlcSwapModal(${JSON.stringify(sl.name).replace(/"/g,'&quot;')})" style="background:var(--bg3);border:1px solid #ffd93d;border-radius:4px;color:#ffd93d;font-family:var(--pixel);font-size:5px;padding:3px 6px;cursor:pointer">SWAP</button>`:''}
        <span style="font-family:var(--pixel);font-size:8px;color:var(--accent3);white-space:nowrap">${sl.avg.toFixed(1)}<span style="font-size:4.5px;color:var(--text3)"> AVG FP</span></span>
      </div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:5px">${sl.gp} GP · ${avg('pts')} PTS · ${avg('reb')} REB · ${avg('ast')} AST · ${avg('stl')} STL · ${avg('blk')} BLK${sl.games.some(g=>g.st._live)?' · <span style="color:var(--accent4)">LIVE</span>':''}</div>
    </div>`;
  }).join('');
  return `<div class="card" style="margin:0 14px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:8px;border-bottom:2px solid var(--border)">
      <span style="font-family:var(--pixel);font-size:6px;color:var(--text3)">${lineup.picks.length} PLAYERS · $${wlcPickCostFor(lineup.picks,pool)} SPENT</span>
      <span style="font-family:var(--pixel);font-size:10px;color:var(--accent2)">${total.toFixed(1)}<span style="font-size:5px;color:var(--text3)"> FP</span></span>
    </div>
    ${rows || '<div style="padding:16px 0;text-align:center;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO PLAYERS</div>'}
  </div>`;
}
function wlcPickCostFor(picks, pool){ return picks.reduce((a,n)=>a+(pool.find(p=>p.n===n)?.salary||0),0); }

// Everyone else's entries for the week. Picks stay hidden until lineups lock.
function wlcOtherLineupsHtml(wk, week, locked){
  const me = String(getMyId());
  const lineups = (leagueState.wlc?.lineups||{})[wk] || {};
  let mgrs = (leagueState.managers||[]).filter(m=>locked || String(m.id)!==me);
  if(week.testers) mgrs = mgrs.filter(m=>week.testers.map(String).includes(String(m.id)));
  if(!mgrs.length) return '';
  const fp = m => { const l=lineups[m.id]; return l?.picks?.length ? computeWlcFP(l.picks, l.swaps, wk) : -1; };
  if(locked) mgrs.sort((a,b)=>fp(b)-fp(a));
  return `<div class="section-label" style="padding:14px 14px 6px">ALL ENTRIES${locked?'':' · PICKS REVEALED AT LOCK'}</div>` + mgrs.map(m=>{
    const l = lineups[m.id];
    const head = `<div style="display:flex;align-items:center;gap:8px;margin:0 14px 6px">${avatarEl(m.display_name,m.color||'#4a9eff',22,6,m.icon||null,m.photo||null)}<span style="font-family:var(--pixel);font-size:6.5px;color:${String(m.id)===me?'var(--accent2)':'var(--text1)'};flex:1">${m.display_name}${String(m.id)===me?' ★':''}</span>${locked&&l?.picks?.length?`<span style="font-family:var(--pixel);font-size:8px;color:var(--accent2)">${fp(m).toFixed(1)}</span>`:''}</div>`;
    if(!l?.picks?.length) return head + `<div class="card" style="margin:0 14px 12px;font-family:var(--pixel);font-size:5.5px;color:var(--accent4)">NO LINEUP YET</div>`;
    if(!locked) return head + `<div class="card" style="margin:0 14px 12px;font-family:var(--pixel);font-size:5.5px;color:var(--accent2)">LINEUP SAVED ✓ · ${l.picks.length} PLAYER${l.picks.length===1?'':'S'} · HIDDEN UNTIL LOCK</div>`;
    const mine = String(m.id)===me;
    return head + `<div style="margin-bottom:12px">${wlcLineupCardHtml(m.id, wk, mine)}</div>`;
  }).join('');
}

// Standings row tap: "Weekly Line-up Roster" for that manager
function showWlcLineupPopup(mid){
  const wk = wlcWeekKey();
  const m = (leagueState.managers||[]).find(x=>String(x.id)===String(mid)); if(!m) return;
  const isMe = String(mid)===String(getMyId());
  const lineup = ((leagueState.wlc?.lineups||{})[wk]||{})[mid];
  document.getElementById('wlc-lineup-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'wlc-lineup-modal'; modal.className = 'top-sheet-overlay';
  modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
  const body = !lineup?.picks?.length ? '<div style="padding:24px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO LINEUP THIS WEEK</div>'
    : (!isMe && !isWlcLocked(wk)) ? '<div style="padding:24px 0;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3);line-height:2">PICKS ARE HIDDEN<br>UNTIL LINEUPS LOCK</div>'
    : wlcLineupCardHtml(mid, wk, false).replace('class="card" style="margin:0 14px"','class="card" style="margin:0"');
  modal.innerHTML = `<div class="top-sheet">
    <div style="display:flex;align-items:center;gap:10px;padding:16px;border-bottom:1px solid var(--border);flex-shrink:0">
      ${userAvatar(m,36,10)}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">CURRENT WEEKLY LINE-UP</div>
        <div style="font-family:var(--pixel);font-size:8px;color:var(--text1);margin-top:4px">${m.display_name}</div>
      </div>
      <button onclick="document.getElementById('wlc-lineup-modal').remove()" style="background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);border-radius:50%;width:28px;height:28px;color:#fff;font-size:14px;cursor:pointer">✕</button>
    </div>
    <div class="top-sheet-body" style="padding-top:12px">${body}</div>
  </div>`;
  document.body.appendChild(modal);
}

// Toggle a player in/out of the pending WLC picks
function wlcCurrentPool(){ return (leagueState.wlc?.weeks?.[wlcWeekKey()]?.pool)||[]; }
function wlcPickCost(picks){ const pool=wlcCurrentPool(); return picks.reduce((a,n)=>a+(pool.find(p=>p.n===n)?.salary||0),0); }

// Tap a portrait: show him in the preview panel pinned at the top of the grid
// (fighting-game select screen). The panel offers SELECT/CANCEL or DROP/CANCEL.
function wlcOpenPlayer(poolName){
  window._wlcPreview = poolName;
  renderWlcScreen();
}
function wlcClearPreview(){ window._wlcPreview = null; renderWlcScreen(); }

// Season averages for the preview: BDL 2025-26 averages when loaded, else the
// player's stored averages / projection
function wlcPreviewStats(name){
  const cur = wlcFindPlayer(name);
  const b = BDL_STATS[cur?.name||name];
  const db = PLAYERS_DB.find(x=>x.n===name);
  const f = v => (v==null||isNaN(v)) ? '—' : (+v).toFixed(1);
  return {
    pts: f(b?.pts ?? cur?.ppg), reb: f(b?.reb ?? cur?.rpg), ast: f(b?.ast ?? cur?.apg),
    fp: f(b?.fpPG ?? db?.fpPG ?? (cur ? estimateFpPG(cur) : null)),
  };
}

function wlcPreviewHtml(pool, picks){
  const name = window._wlcPreview;
  const p = name && pool.find(x=>x.n===name);
  if(!p){
    return `<div class="wlc-preview empty"><div class="wlc-pv-port"><span>?</span></div>
      <div class="wlc-pv-info"><div class="wlc-pv-name blink">SELECT YOUR PLAYER</div>
      <div class="wlc-pv-sub">TAP ANY PORTRAIT BELOW</div></div></div>`;
  }
  const cur = wlcFindPlayer(p.n), nm = cur?.name || p.n, team = cur?.team || p.t;
  const pos = PLAYER_INFO[nm]?.pos || cur?.pos || '';
  const st = wlcPreviewStats(p.n);
  const sel = picks.includes(p.n);
  const q = JSON.stringify(p.n).replace(/"/g,'&quot;');
  const port = portraitUrl(team, nm);
  const box = (l,v) => `<div class="wlc-pv-stat"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  return `<div class="wlc-preview t${p.tier}">
    <div class="wlc-pv-port" onclick="${pcardOnclick(nm)}" title="Full player profile"><img src="${port}" onerror="this.style.visibility='hidden'"><span class="wlc-pv-price">$${p.salary}</span></div>
    <div class="wlc-pv-info">
      <div class="wlc-pv-name">${nm}${injuryBadgeHtml(nm)}</div>
      <div class="wlc-pv-sub">${pos?pos+' · ':''}${team} · 2025-26 SEASON</div>
      <div class="wlc-pv-stats">${box('PTS',st.pts)}${box('REB',st.reb)}${box('AST',st.ast)}${box('FP/G',st.fp)}</div>
      <div class="wlc-pv-btns">
        ${sel ? `<button class="wlc-pv-btn drop" onclick="wlcDropPick(${q})">DROP</button>`
              : `<button class="wlc-pv-btn select" onclick="wlcAddPick(${q})">SELECT</button>`}
        <button class="wlc-pv-btn cancel" onclick="wlcClearPreview()">CANCEL</button>
      </div>
    </div>
  </div>`;
}
function wlcAddPick(poolName){
  const picks = window._wlcCurrentPicks||[];
  const p = wlcCurrentPool().find(x=>x.n===poolName);
  if(!p || picks.includes(poolName)) return;
  if(picks.length >= WLC_TEAM_SIZE){ toast(`Max ${WLC_TEAM_SIZE} players`); return; }
  if(wlcPickCost(picks)+p.salary > WLC_SALARY_CAP){ toast(`Only $${WLC_SALARY_CAP-wlcPickCost(picks)} left — he costs $${p.salary}`); return; }
  window._wlcCurrentPicks = [...picks, poolName];
  window._wlcPreview = null;
  document.getElementById('player-card-modal')?.remove();
  renderWlcScreen();
}
function wlcDropPick(poolName){
  window._wlcCurrentPicks = (window._wlcCurrentPicks||[]).filter(n=>n!==poolName);
  window._wlcPreview = null;
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
  const blocked = wlcSwapBlockReason(lineup, fromName);
  if(blocked){ toast(blocked); return; }

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
        <div style="font-family:var(--pixel);font-size:5.5px;line-height:1.8;color:var(--text3)">${p.t} · ${p.fpPG} FP/G</div>
      </div>
      <button onclick="doWlcSwap(${JSON.stringify(fromName).replace(/"/g,'&quot;')},${JSON.stringify(p.n).replace(/"/g,'&quot;')})" style="background:var(--accent2);border:none;border-radius:4px;color:var(--bg);font-family:var(--pixel);font-size:5.5px;padding:6px 10px;cursor:pointer">SELECT</button>
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
    <div style="padding:20px 14px;">
      <div class="card">
        <div class="empty-state">
          <div class="icon" style="font-size:28px">🎯</div>
          <div class="label">NO ACTIVE WEEK<br/><span style="color:var(--text3);font-size:5px">CHECK BACK MONDAY</span></div>
        </div>
      </div>
      ${isComm ? `
      <div style="margin-top:16px">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3);margin-bottom:8px;">COMMISSIONER: GENERATE THIS WEEK'S POOL</div>
        <button class="btn btn-full btn-primary" onclick="commGenerateWlcWeek()">⚡ GENERATE WEEK</button>
      </div>` : ''}
    </div>
    <div style="margin-top:8px">
      <div class="section-label">STANDINGS</div>
      <div class="wlc-standings-table" id="wlc-standings-body"></div>
    </div>`;
  const standDiv = el.querySelector('#wlc-standings-body');
  if(standDiv) renderWlcStandings(standDiv);
}

// Shared portrait grid. onTap(poolName) → onclick JS string.
function wlcGridHtml(pool, onTap, selected, previewing){
  let html = '<div class="wlc-grid">';
  for(let tier=5; tier>=1; tier--){
    html += `<div class="wlc-tier-row t${tier}"><div class="wlc-tier-tag">$${tier}</div>`;
    for(const p of pool.filter(x=>x.tier===tier)){
      const cur = wlcFindPlayer(p.n);
      const team = cur?.team || p.t;
      const nm = cur?.name || p.n;
      const port = portraitUrl(team, nm);
      const parts = nm.split(' ');
      const sel = (selected||[]).includes(p.n);
      const inj = injuryInfo(nm);
      const pos = PLAYER_INFO[nm]?.pos || cur?.pos || '';
      const pv = previewing===p.n;
      html += `<div class="wlc-pcard${sel?' selected':''}${pv?' previewing':''}" onclick="${onTap(p.n)}">${pv?'<span class="wlc-p1">P1</span>':''}
        <div class="wlc-pimg"><img src="${port}" loading="lazy" onerror="this.style.visibility='hidden'">${inj?`<span class="wlc-pinj" style="background:${inj.color}">${inj.label}</span>`:''}${sel?'<span class="wlc-pcheck">✓</span>':''}</div>
        <div class="wlc-pname">${parts[0]}<br>${parts.slice(1).join(' ')}${pos?`<div class="wlc-ppos">${pos}</div>`:''}</div>
      </div>`;
    }
    html += '</div>';
  }
  return html + '</div>';
}

function renderWlcPendingApproval(el, week, wk){
  const isComm = myProfile?.is_commissioner;
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const [ws, we] = wlcWeekRange(wk);
  if(!isComm){
    el.innerHTML = `<div style="padding:12px 14px"><div class="card"><div class="empty-state"><div class="icon">⏳</div><div class="label">THIS WEEK'S CHALLENGE<br/><span style="color:var(--text3);font-size:5px">WAITING FOR COMMISSIONER APPROVAL</span></div></div></div></div>`;
    return;
  }
  const q = n => JSON.stringify(n).replace(/"/g,'&quot;');
  el.innerHTML = `
    <div class="wlc-banner">
      <div class="wlc-banner-title">REVIEW BEFORE RELEASE</div>
      <div class="wlc-banner-theme">${wlcThemeName(week, wk).toUpperCase()}</div>
      <div class="wlc-banner-dates">${fmt(statDateObj(ws))} – ${fmt(statDateObj(we))}${week.testers?' · 🧪 TEST WEEK':''}</div>
    </div>
    <div style="padding:0 14px 10px">
      <div style="font-family:var(--pixel);font-size:6.5px;line-height:1.8;color:var(--text2);line-height:1.5;margin-bottom:8px">Check the ${(week.pool||[]).length} players below. <b>Tap any player to replace him</b> — the replacement keeps the same price tier.</div>
      <div style="display:flex;gap:6px">
        <input id="wlc-theme-input" value="${(week.theme||'').replace(/"/g,'&quot;')}" style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text1);padding:8px"/>
        <button class="btn btn-sm btn-secondary" onclick="commRenameWlcTheme('${wk}')">RENAME</button>
      </div>
    </div>
    ${wlcGridHtml(week.pool||[], n=>`openWlcReplaceModal('${wk}',${q(n)})`)}
    <div style="padding:12px 14px 24px;display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-full btn-primary" onclick="commApproveWlcWeek('${wk}')">✓ APPROVE & GO LIVE</button>
      <button class="btn btn-full btn-secondary" onclick="commRejectWlcWeek('${wk}')">✕ DISCARD — GENERATE A NEW POOL</button>
    </div>`;
}

async function commRenameWlcTheme(wk){
  const v = document.getElementById('wlc-theme-input')?.value.trim();
  const w = leagueState.wlc?.weeks?.[wk]; if(!w || !v) return;
  w.theme = v; await saveLeagueState(); toast('Theme renamed'); renderWlcScreen(); renderAdminContent();
}

// Pick a replacement for one pool player (same tier)
function openWlcReplaceModal(wk, poolName, query){
  const w = leagueState.wlc?.weeks?.[wk]; if(!w) return;
  const slot = (w.pool||[]).find(p=>p.n===poolName); if(!slot) return;
  const inPool = new Set((w.pool||[]).map(p=>normName(p.n)));
  const ql = normName(query||'');
  const poolTier = n => (w.pool||[]).find(p=>normName(p.n)===normName(n))?.tier;
  const cands = PLAYERS_DB
    .map(p=>{ const cur=wlcFindPlayer(p.n); return cur ? {n:p.n, name:cur.name, t:cur.team||p.t, fpPG:BDL_STATS[cur.name]?.fpPG ?? p.fpPG, inPool:inPool.has(normName(p.n))} : null; })
    .filter(c=>c && normName(c.n)!==normName(poolName) && (!ql || normName(c.name).includes(ql)))
    .sort((a,b)=>(b.fpPG||0)-(a.fpPG||0)).slice(0,80);
  document.getElementById('wlc-replace-modal')?.remove();
  const m = document.createElement('div');
  m.id='wlc-replace-modal'; m.className='top-sheet-overlay';
  m.onclick = e=>{ if(e.target===m) m.remove(); };
  const q = n => JSON.stringify(n).replace(/"/g,'&quot;');
  m.innerHTML = `<div class="top-sheet">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3)">REPLACE ${poolName.toUpperCase()} · $${slot.tier} TIER</div>
        <button onclick="document.getElementById('wlc-replace-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer">✕</button>
      </div>
      <input id="wlc-replace-search" placeholder="Search players…" value="${(query||'').replace(/"/g,'&quot;')}" oninput="openWlcReplaceModal('${wk}',${q(poolName)},this.value)" style="width:100%;box-sizing:border-box;margin-top:10px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text1);padding:8px"/>
    </div>
    <div class="top-sheet-body">
      ${cands.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div onclick="${pcardOnclick(c.name)}" style="cursor:pointer;min-width:0"><div style="font-family:var(--pixel);font-size:6.5px;color:var(--text1)">${c.name}${injuryBadgeHtml(c.name)}${c.inPool?` <span style="font-size:4.5px;color:#ffd93d">IN POOL · $${poolTier(c.n)}</span>`:''}</div><div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3)">${c.t} · ${(c.fpPG||0).toFixed?c.fpPG.toFixed(1):c.fpPG} FP/G</div></div>
        <button class="btn btn-sm btn-primary" onclick="commReplaceWlcPlayer('${wk}',${q(poolName)},${q(c.n)})">${c.inPool?'SWAP':'USE'}</button>
      </div>`).join('') || '<div style="padding:20px 0;text-align:center;color:var(--text3)">No players found</div>'}
    </div></div>`;
  document.body.appendChild(m);
  if(query!==undefined){ const inp=document.getElementById('wlc-replace-search'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

async function commReplaceWlcPlayer(wk, oldName, newName){
  const w = leagueState.wlc?.weeks?.[wk]; if(!w) return;
  const i = (w.pool||[]).findIndex(p=>p.n===oldName); if(i<0) return;
  const j = (w.pool||[]).findIndex(p=>normName(p.n)===normName(newName));
  if(j>=0){
    // Already in the pool: swap the two players' spots (each takes the other's price)
    const a = w.pool[i], b = w.pool[j];
    w.pool[i] = {...b, tier:a.tier, salary:a.salary};
    w.pool[j] = {...a, tier:b.tier, salary:b.salary};
  } else {
    const db = PLAYERS_DB.find(p=>p.n===newName) || {n:newName};
    const cur = wlcFindPlayer(newName);
    w.pool[i] = {...db, t:cur?.team||db.t, tier:w.pool[i].tier, salary:w.pool[i].salary};
  }
  await saveLeagueState();
  document.getElementById('wlc-replace-modal')?.remove();
  toast(j>=0 ? `Swapped ${oldName} ⇄ ${newName}` : `${oldName} ➜ ${wlcFindPlayer(newName)?.name||newName}`);
  renderWlcScreen();
}

function renderWlcStandings(container){
  const standings = leagueState.wlc?.standings || {};
  const managers = leagueState.managers || [];
  if(!managers.length){
    container.innerHTML = '<div style="padding:16px;text-align:center;font-family:var(--pixel);font-size:6px;color:var(--text3)">NO STANDINGS YET</div>';
    return;
  }

  // Season standings only (this week's entries live on the Current Week's Lineups tab)
  const currentHtml = '';
  const myId = getMyId();

  // Tries = official (non-test) weeks this manager saved a lineup for
  const weeks = leagueState.wlc?.weeks || {}, allLineups = leagueState.wlc?.lineups || {};
  const tries = mid => Object.keys(allLineups).filter(wk=>weeks[wk] && !weeks[wk].testers && allLineups[wk]?.[mid]?.picks?.length).length;
  const rows = managers.map(m=>{
    const s = standings[m.id] || {wins:0, totalFP:0};
    return {...m, wins:s.wins||0, totalFP:s.totalFP||0, tries:tries(m.id)};
  }).sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:b.totalFP-a.totalFP);

  let seasonHtml = '';
  rows.forEach((m,i)=>{
    const isMe = m.id===myId;
    seasonHtml += `
    <div class="wlc-standings-row" onclick="showWlcLineupPopup('${m.id}')" style="cursor:pointer;${isMe?'border-color:var(--accent2);':''}">
      <span class="wlc-standings-rank">${i+1}</span>
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        ${avatarEl(m.display_name,m.color||'#4a9eff',24,6,m.icon||null,m.photo||null)}
        <span class="wlc-standings-name" style="${isMe?'color:var(--accent2)':''}">
          ${m.display_name}${isMe?' ★':''}
        </span>
      </div>
      <span class="wlc-standings-wins">${m.wins} ${m.wins===1?'Win':'Wins'}</span>
      <span class="wlc-standings-tries">${m.tries} ${m.tries===1?'Try':'Tries'}</span>
      <span class="wlc-standings-fp">${m.totalFP.toFixed(1)} FP</span>
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

async function commGenerateWlcWeek(testMode){
  const proposal = generateWlcProposal();
  if(!leagueState.wlc) leagueState.wlc = {weeks:{},lineups:{},results:{},standings:{}};
  let testers = null;
  if(testMode){
    testers = [...document.querySelectorAll('.wlc-tester-cb:checked')].map(cb=>cb.value);
    if(!testers.map(String).includes(String(getMyId()))) testers.push(String(getMyId()));
  }
  leagueState.wlc.weeks[proposal.weekKey] = {
    theme: proposal.theme,
    pool: proposal.pool,
    status: 'pending',
    tipoffTime: null,
    createdAt: new Date().toISOString(),
    ...(testers ? {testers} : {}),
  };
  await saveLeagueState();
  toast(testers ? `Test week generated: ${proposal.theme}` : `Generated: ${proposal.theme}`);
  renderAdminContent();
  renderWlcScreen();
}

async function commApproveWlcWeek(weekKey){
  if(!leagueState.wlc?.weeks?.[weekKey]) return;
  leagueState.wlc.weeks[weekKey].status = 'active';
  // Default tip-off to Monday of that week at 7am ET (11:00 UTC in EST / 12:00 UTC in EDT)
  // weekKey is a Monday ISO date string
  const mon = new Date(weekKey + 'T00:00:00Z'); // parse as UTC midnight
  mon.setUTCHours(11, 0, 0, 0); // 7am ET = 11:00 UTC (EST) — close enough for EDT off-season
  // Approved midweek (e.g. for testing)? Monday 7am already passed, so leave picks
  // open until the commissioner sets a lock time instead of locking instantly.
  const late = mon <= new Date();
  leagueState.wlc.weeks[weekKey].tipoffTime = late ? null : mon.toISOString();
  await saveLeagueState();
  toast(late ? 'Week is LIVE — picks open until you set a lock time.' : 'Week is LIVE! Users can now submit lineups.');
  renderAdminContent();
  renderWlcScreen();
}

// Turn a test week into a normal week everyone can see
async function commMakeWlcPublic(weekKey){
  const w = leagueState.wlc?.weeks?.[weekKey]; if(!w) return;
  if(!confirm('Make this week visible to the whole league?')) return;
  delete w.testers;
  await saveLeagueState();
  toast('Week is now visible to everyone.');
  renderAdminContent(); renderWlcScreen();
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
  toast(isoDateTime ? 'Lock time set.' : 'Picks reopened.');
  renderAdminContent();
  renderWlcScreen();
}
// From the admin datetime input (viewer's local time) → ISO
function commSetTipoffFromInput(weekKey){
  const v = document.getElementById('wlc-lock-input')?.value;
  if(!v){ toast('Pick a date and time'); return; }
  commSetTipoff(weekKey, new Date(v).toISOString());
}

// Wipe a week completely (for test weeks): pool, lineups, results, and any
// standings it added when finalized.
async function commResetWlcWeek(weekKey){
  if(!confirm(`Delete the ${wlcWeekLabel(weekKey)} Weekly Challenge and everyone's lineups for it? This can't be undone.`)) return;
  await loadLeagueState();
  const w = leagueState.wlc || {};
  const res = (w.results||{})[weekKey];
  const wasTest = !!(w.weeks||{})[weekKey]?.testers; // test weeks never touched standings
  if(res && w.standings && !wasTest){
    for(const [mid,fp] of Object.entries(res.scores||{})){
      const st = w.standings[mid]; if(!st) continue;
      st.totalFP = +((st.totalFP||0) - fp).toFixed(1);
      if((res.winners||[]).map(String).includes(String(mid))) st.wins = Math.max(0,(st.wins||0)-1);
      if(!st.wins && !st.totalFP) delete w.standings[mid];
    }
  }
  for(const k of ['weeks','lineups','results']) if(w[k]) delete w[k][weekKey];
  await saveLeagueState();
  toast('Week reset.');
  renderAdminContent();
  renderWlcScreen();
}

async function commFinalizeWeek(weekKey){
  const test = !!leagueState.wlc?.weeks?.[weekKey]?.testers;
  await finalizeWlcWeek(weekKey);
  const r = leagueState.wlc?.results?.[weekKey];
  const names = (r?.winners||[]).map(id=>(leagueState.managers||[]).find(m=>String(m.id)===String(id))?.display_name||id).join(' & ');
  toast(test ? `Test week finalized — winner: ${names||'none'} (real standings unchanged)` : 'Week finalized! Standings updated.');
  renderAdminContent();
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
    const myId = String(getMyId());
    html += `
      <button class="btn btn-full btn-primary" onclick="commGenerateWlcWeek(false)">⚡ GENERATE THIS WEEK (WHOLE LEAGUE)</button>
      <div style="margin-top:12px;padding:10px;border:1px dashed #ffd93d;border-radius:var(--radius)">
        <div style="font-family:var(--pixel);font-size:6px;color:#ffd93d;margin-bottom:6px">🧪 TEST WEEK — ONLY THESE PEOPLE SEE IT</div>
        ${(leagueState.managers||[]).map(m=>`
          <label style="display:flex;align-items:center;gap:8px;padding:3px 0;font-family:var(--pixel);font-size:6.5px;line-height:1.8">
            <input type="checkbox" class="wlc-tester-cb" value="${m.id}" ${String(m.id)===myId?'checked disabled':''}/> ${m.display_name}
          </label>`).join('')}
        <div style="font-family:var(--pixel);font-size:6px;line-height:1.8;color:var(--text3);margin:6px 0;line-height:1.5">Everyone else keeps seeing "No active week." Finalizing a test week shows the winner but never changes the real standings.</div>
        <button class="btn btn-full btn-secondary" style="border-color:#ffd93d;color:#ffd93d" onclick="commGenerateWlcWeek(true)">🧪 GENERATE TEST WEEK</button>
      </div>`;
  } else if(week.status==='pending'){
    html += `
      <div style="font-family:var(--pixel);font-size:6px;color:var(--accent3);margin-bottom:8px">STATUS: PENDING — Theme: ${week.theme}</div>
      <button class="btn btn-full btn-secondary" style="margin-bottom:8px" onclick="closeAdminPanel&&closeAdminPanel();showScreen('wlc')">👀 REVIEW PLAYERS ON THE WEEKLY CHALLENGE TAB</button>
      <button class="btn btn-full btn-primary" onclick="commApproveWlcWeek('${wk}')" style="margin-bottom:8px">✓ APPROVE</button>
      <button class="btn btn-full btn-secondary" onclick="commRejectWlcWeek('${wk}')">✕ REJECT</button>`;
  } else if(week.status==='active'){
    const locked = isWlcLocked(wk);
    html += `
      <div style="font-family:var(--pixel);font-size:6px;color:var(--accent2);margin-bottom:8px">STATUS: LIVE — ${week.theme}</div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:8px">PICKS: ${locked?'🔒 LOCKED':'OPEN'}${week.tipoffTime?` · LOCK ${locked?'WAS':'AT'} ${new Date(week.tipoffTime).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:' · NO LOCK TIME SET'}</div>
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input id="wlc-lock-input" type="datetime-local" style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:6px"/>
        <button class="btn btn-sm btn-secondary" onclick="commSetTipoffFromInput('${wk}')">SET LOCK</button>
      </div>
      ${locked?`<button class="btn btn-full btn-secondary" style="margin-bottom:8px" onclick="commSetTipoff('${wk}',null)">🔓 REOPEN PICKS</button>`:''}
      <button class="btn btn-full btn-danger" onclick="commFinalizeWeek('${wk}')">🏁 FINALIZE WEEK</button>`;
  } else if(week.status==='final'){
    html += `<div style="font-family:var(--pixel);font-size:6px;color:var(--text3)">WEEK FINALIZED ✓</div>`;
  }
  if(week?.testers){
    const names = week.testers.map(id=>(leagueState.managers||[]).find(m=>String(m.id)===String(id))?.display_name||'?').join(', ');
    html = html.replace('🎯 LINE-UP CHALLENGE</div>', `🎯 LINE-UP CHALLENGE</div><div style="font-family:var(--pixel);font-size:5.5px;color:#ffd93d;margin-bottom:8px">🧪 TEST MODE — VISIBLE ONLY TO: ${names.toUpperCase()}</div>`);
    if(week.status!=='final') html += `<button class="btn btn-full btn-secondary" style="margin-top:8px" onclick="commMakeWlcPublic('${wk}')">📣 MAKE VISIBLE TO EVERYONE</button>`;
  }
  if(week?.status==='final' && leagueState.wlc?.results?.[wk]){
    const r = leagueState.wlc.results[wk];
    const nm = id => (leagueState.managers||[]).find(m=>String(m.id)===String(id))?.display_name || id;
    html += `<div style="margin-top:8px;font-family:var(--pixel);font-size:6.5px;line-height:1.8;color:var(--text2);line-height:1.7">
      ${Object.entries(r.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,fp])=>`${(r.winners||[]).map(String).includes(String(id))?'🏆 ':''}${nm(id)}: ${fp.toFixed(1)} FP`).join('<br>')||'No lineups'}
    </div>`;
  }
  if(week){
    html += `<button class="btn btn-full btn-secondary" style="margin-top:8px;border-color:#ffd93d;color:#ffd93d" onclick="commResetWlcWeek('${wk}')">🗑 RESET THIS WEEK (TEST)</button>`;
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
      <div style="font-family:var(--pixel);font-size:7px;line-height:1.8;color:var(--text2);line-height:1.8;margin-bottom:16px">
        <p style="margin-bottom:10px">Goal: build the best lineup of <strong>1 to 5 players</strong> from the week's pool while spending <strong>$15 or less</strong>.</p>
        <p style="margin-bottom:10px">Each week, the Commissioner releases a themed pool of 25 NBA players split into 5 salary tiers, $1 through $5. Tap a player to see him at the top of the screen, then tap Select. Mix tiers however you like: three $5 stars, five $1 sleepers, anything up to $15.</p>
        <p style="margin-bottom:10px">Once you tap <strong>Save Lineup</strong> and confirm, your lineup is <strong>final</strong>. Lineups lock Monday at 7 AM ET, and nobody can see anyone else's picks until then.</p>
        <p style="margin-bottom:10px"><strong>Scoring:</strong> each player scores his <strong>average FP per game</strong> that week (Mon–Sun), and your total is the sum of those averages. Players with more games get no advantage. A player who doesn't play scores 0. FP per game: <strong>+1 per point, rebound, assist, steal and block; −1 per missed FG, missed FT, turnover, flagrant foul and technical foul.</strong></p>
        <p style="margin-bottom:10px"><strong>Injury swap:</strong> once per week, you can swap a player listed <strong>OUT</strong> for a same-tier player from the pool whose game hasn't started. That slot then averages both players' games: the original player's before the swap, the replacement's after.</p>
        <p>Highest total wins the week. Wins and total FP are tracked all season.</p>
      </div>
    </div>`;
  modal.onclick=(e)=>{ if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
}

function showDuelRules(){
  let modal=document.getElementById('duel-rules-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='duel-rules-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';

  const row=(label,value)=>`
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">${label}</span>
      <span style="font-family:var(--pixel);font-size:6px;color:var(--text1);text-align:right;max-width:60%">${value}</span>
    </div>`;

  const statTypes=[
    ['MONSTER MONDAY','Points + Rebounds + Assists'],
    ['TEAMS TUESDAY','Pick the team that wins'],
    ['WET WEDNESDAY 💦','Most 3-pointers made'],
    ['STONKS THURSDAY 📈','Steals + Blocks'],
    ['FREE THROW FRIDAY','Most free throws made'],
    ['PARLAY SATURDAY 🎰','Star hits his points line AND his team wins'],
    ['DOUBLE-DOUBLE SUNDAY','Bigger double-double (must post one to win)'],
  ].map(([l,v])=>row(l,v)).join('');

  modal.innerHTML=`
    <div class="modal-box" style="max-width:420px;width:calc(100% - 32px);max-height:88vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:var(--pixel);font-size:8px;color:var(--accent5)">⚡ DAILY DUEL</div>
        <button onclick="document.getElementById('duel-rules-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>

      <div style="margin-bottom:18px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent5);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">HOW IT WORKS</div>
        <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text2);line-height:2.2">
          Every day has its own theme. Pick the side you think wins. Get it right and extend your streak — get it wrong and it resets to zero. Ties and parlays where neither side hits are a PUSH: nobody wins or loses and streaks hold, as long as you voted.
        </div>
      </div>

      <div style="margin-bottom:18px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent5);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">DAILY THEMES</div>
        ${statTypes}
      </div>

      <div style="margin-bottom:18px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent5);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">STREAK & SCORING</div>
        ${row('Correct pick','Streak +1 🔥')}
        ${row('Wrong pick','Streak resets to 0')}
        ${row('Push (tie / no hit)','Streak holds')}
        ${row('Player sits out','No contest · streak holds')}
        ${row('No pick','Streak resets')}
        ${row('Picks lock','Once the game tips off')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Streaks and total correct picks are tracked all season. Check the Leaderboard inside the Duel card to see how you stack up.
        </div>
      </div>
    </div>`;
  modal.onclick=(e)=>{ if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
}

function showSiteOverview(){
  let modal=document.getElementById('site-overview-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='site-overview-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';

  const game=(icon,title,color,tagline,bullets,action,actionLabel)=>`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:20px">${icon}</span>
        <div>
          <div style="font-family:var(--pixel);font-size:7px;color:${color}">${title}</div>
          <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">${tagline}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
        ${bullets.map(b=>`<div style="display:flex;gap:6px;align-items:baseline"><span style="color:${color};font-size:10px">·</span><span style="font-family:var(--pixel);font-size:5.5px;color:var(--text2);line-height:1.8">${b}</span></div>`).join('')}
      </div>
      <button onclick="document.getElementById('site-overview-modal').remove();${action}" style="font-family:var(--pixel);font-size:5.5px;background:${color};color:#000;border:none;border-radius:4px;padding:7px 12px;cursor:pointer;width:100%">${actionLabel}</button>
    </div>`;

  modal.innerHTML=`
    <div class="modal-box" style="max-width:440px;width:calc(100% - 32px);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--pixel);font-size:8px;color:var(--accent1)">🕹️ HOW TO PLAY</div>
        <button onclick="document.getElementById('site-overview-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-bottom:16px;line-height:1.8">Three games. One league. All season long.</div>

      ${game('🏀','NBA FANTASY','var(--accent2)','Season-long head-to-head fantasy',[
        'Draft 10 players each seasonal run (Fall, Winter, Spring, Summer)',
        'Set 8 active and 2 inactive each week',
        'Score FP from real NBA box scores — points, rebounds, assists and more',
        'Win your weekly matchup to climb the standings',
        'Up to 3 waiver claims per week to improve your roster',
      ],'showScreen(\'fantasy\')','GO TO FANTASY →')}

      ${game('🎯','WEEKLY LINE-UP CHALLENGE','var(--accent3)','Pick up to 5 players for $15 or less',[
        'Every week: a themed pool of 25 players split into 5 salary tiers ($1–$5)',
        'Pick 1–5 players for $15 or less; saving makes your lineup final',
        'Each player scores his average FP per game that week',
        'One injury swap per week: a player listed OUT, same tier',
        'Highest total wins the week. Wins and total FP tracked all season',
      ],'showScreen(\'wlc\')','GO TO WEEKLY CHALLENGE →')}

      ${game('⚡','DAILY DUEL','var(--accent5)','One pick, every day',[
        'Two NBA players face off in a single stat category each day',
        'Pick who you think wins — points, rebounds, assists, FP and more',
        'Get it right: streak grows 🔥. Get it wrong: streak resets',
        'Ties count as a win for everyone',
        'Streaks and correct picks tracked on the leaderboard',
      ],'','GO TO TODAY\'S DUEL →')}
    </div>`;
  modal.onclick=(e)=>{ if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
}

// ── START ────────────────────────────────────────────────────────────────────
boot();

// ── ACCENTED NAMES ────────────────────────────────────────────────────────────
// Player data (BDL, ESPN matching, storage file names) uses plain ASCII names, so all
// lookups keep working. Only the text people see is rewritten to the proper spelling.
// Add a player here as "Plain Name": "Accented Name".
const ACCENTED_NAMES = {
  'Nikola Jokic':'Nikola Jokić', 'Luka Doncic':'Luka Dončić', 'Bogdan Bogdanovic':'Bogdan Bogdanović',
  'Nikola Vucevic':'Nikola Vučević', 'Jusuf Nurkic':'Jusuf Nurkić', 'Kristaps Porzingis':'Kristaps Porziņģis',
  'Nikola Jovic':'Nikola Jović', 'Kasparas Jakucionis':'Kasparas Jakučionis', 'Alperen Sengun':'Alperen Şengün',
  'Tidjane Salaun':'Tidjane Salaün', 'Moussa Diabate':'Moussa Diabaté', 'Nolan Traore':'Nolan Traoré',
  'Egor Demin':'Egor Dëmin', 'Karlo Matkovic':'Karlo Matković', 'Dennis Schroder':'Dennis Schröder',
  'Nikola Topic':'Nikola Topić', 'Hugo Gonzalez':'Hugo González', 'Yanic Konan Niederhauser':'Yanic Konan Niederhäuser',
  'Tristan Vukcevic':'Tristan Vukčević', 'Pacome Dadiet':'Pacôme Dadiet', 'Jose Alvarado':'José Alvarado',
};
// Last names that are common words get no last-name-only rewrite
const ACCENT_LASTNAME_SKIP = new Set(['Topic']);
const _accentPairs = (()=>{
  const pairs = [];
  for(const [plain, acc] of Object.entries(ACCENTED_NAMES)){
    pairs.push([plain, acc], [plain.toUpperCase(), acc.toUpperCase()]);
    const pl = plain.split(' ').pop(), al = acc.split(' ').pop();
    if(pl!==al && !ACCENT_LASTNAME_SKIP.has(pl)) pairs.push([pl, al], [pl.toUpperCase(), al.toUpperCase()]);
  }
  const map = new Map(); pairs.sort((a,b)=>b[0].length-a[0].length).forEach(([a,b])=>{ if(!map.has(a)) map.set(a,b); });
  const re = new RegExp('(?<![A-Za-z\\u00C0-\\u024F])(' + [...map.keys()].map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')(?![A-Za-z\\u00C0-\\u024F])', 'g');
  return {map, re};
})();
function accentText(str){ return String(str).replace(_accentPairs.re, m=>_accentPairs.map.get(m)||m); }
function _accentNode(root){
  const fix = t => { const v = t.nodeValue; if(!v || v.length<3) return; const nv = accentText(v); if(nv!==v) t.nodeValue = nv; };
  if(root.nodeType===3){ const par = root.parentNode; if(par && !/^(SCRIPT|STYLE|TEXTAREA)$/.test(par.nodeName)) fix(root); return; }
  if(root.nodeType!==1 || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(root.nodeName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n=>/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode?.nodeName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n; while((n = w.nextNode())) fix(n);
}
(function startAccentNames(){
  const go = () => {
    _accentNode(document.body);
    new MutationObserver(muts=>{
      for(const m of muts){
        if(m.type==='characterData') _accentNode(m.target);
        else m.addedNodes.forEach(_accentNode);
      }
    }).observe(document.body, {childList:true, subtree:true, characterData:true});
  };
  if(document.body) go(); else document.addEventListener('DOMContentLoaded', go);
})();
