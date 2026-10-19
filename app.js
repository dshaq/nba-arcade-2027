// NBA ARCADE 2026-27 — v1.0
// Fresh build for new season

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ipsngddnavymcmfbbcxu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc25nZGRuYXZ5bWNtZmJiY3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDk3NDMsImV4cCI6MjA5MTc4NTc0M30.0MmQn49Y0FCn3r8GFI5XspZR12YwGWTcTbv765VoJEQ';
const LEAGUE_KEY    = 'nba-arcade-2027';
const PORTRAITS_KEY = 'nba-portraits-2027';
const PORTRAITS_BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/player-portraits`;
const INVITE_CODE   = 'HOOPTIME27';  // commissioner sets this
const COMMISSIONER_EMAIL = 'daveschachter@gmail.com';

// Roster rules
const ROSTER_SIZE   = 10;
const ACTIVE_SIZE   = 8;
const INACTIVE_SIZE = 2;
const WAIVER_WEEKLY = 3;

// Runs / mini-seasons
const RUNS = [
  { id:1, name:'Fall',   start:'2026-10-20', end:'2026-12-26', color:'#ff6600' },
  { id:2, name:'Winter', start:'2026-12-27', end:'2027-02-18', color:'#4a9eff' },
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

function showPlayerCard(playerName) {
  openPlayerCardName = playerName;
  document.getElementById('player-card-modal')?.remove();

  // PLAYERS is BDL-driven (current-season teams/positions). Use it as primary source.
  const pArr  = PLAYERS.find(pl=>pl.name===playerName);
  const pDb   = PLAYERS_DB.find(pl=>pl.n===playerName);
  const pLeague = (leagueState.players||[]).find(pl=>pl.name===playerName);
  const p = pArr || pDb || pLeague;
  const info = PLAYER_INFO[playerName] || {};
  // FP projection: BDL live stats → PLAYERS_DB curated → fallback
  const fpVal = BDL_STATS[playerName]?.fpPG ?? pDb?.fpPG
    ?? (p ? estimateFpPG(p) : null);

  // Team: PLAYERS (BDL-sourced, always current) → PLAYERS_DB → leagueState
  const teamAbbr = pArr?.team || pDb?.t || pLeague?.team || '';
  const teamFull = NBA_TEAMS[teamAbbr] || teamAbbr;
  const portrait = teamAbbr
    ? `${PORTRAITS_BUCKET_URL}/${teamAbbr}/${encodeURIComponent(playerName)}.jpeg`
    : (playerPortraits[playerName] || '');

  const row = (label, val) => val ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
    <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">${label}</span>
    <span style="font-family:var(--pixel);font-size:7px;color:var(--text1)">${val}</span>
  </div>` : '';

  const modal = document.createElement('div');
  modal.id = 'player-card-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };

  modal.innerHTML = `
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px 16px 0 0;width:100%;max-width:var(--max-w);max-height:85vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,0px)">
    <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:10px auto 0"></div>
    <!-- Portrait header -->
    <div style="position:relative;background:var(--bg3);overflow:hidden;margin:12px 16px 0;border-radius:12px">
      <!-- CRT scanline overlay -->
      <div style="position:absolute;inset:0;pointer-events:none;z-index:2;border-radius:12px;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.18) 2px,rgba(0,0,0,.18) 4px);mix-blend-mode:multiply"></div>
      <div style="position:absolute;inset:0;pointer-events:none;z-index:3;border-radius:12px;background:radial-gradient(ellipse at 50% 50%,transparent 60%,rgba(0,0,0,.45) 100%)"></div>
      ${portrait
        ? `<img src="${portrait}" style="width:100%;display:block;object-fit:contain" onerror="this.parentNode.querySelector('.card-initials').style.display='flex';this.style.display='none'"><div class="card-initials" style="display:none;width:100%;height:220px;align-items:center;justify-content:center;font-family:var(--pixel);font-size:32px;color:var(--text3)">${(playerName||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>`
        : `<div style="width:100%;height:220px;display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:32px;color:var(--text3)">${(playerName||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>`
      }
      <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 14px;background:linear-gradient(transparent,rgba(0,0,0,.85))">
        <div style="font-family:var(--pixel);font-size:9px;color:#fff">${playerName}</div>
        <div style="font-family:var(--pixel);font-size:6px;color:rgba(255,255,255,.7);margin-top:4px">${info.pos||''} · ${teamFull}${teamAbbr?' ('+teamAbbr+')':''}</div>
      </div>
      <button onclick="document.getElementById('player-card-modal').remove()" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);border-radius:50%;width:28px;height:28px;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
    </div>
    <!-- Stats -->
    <div style="padding:4px 16px 16px">
      ${fpVal ? `<div style="text-align:center;padding:12px 0 8px">
        <div style="font-family:var(--pixel);font-size:22px;color:var(--accent3)">${typeof fpVal==='number'?fpVal.toFixed(1):fpVal}</div>
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">PROJ FP/GAME</div>
      </div>` : ''}
      ${row('Height', info.ht)}
      ${row('Weight', info.wt ? info.wt + ' lbs' : null)}
      ${row('Age', info.age)}
      ${row('NBA Experience', info.yrs !== undefined ? info.yrs + (info.yrs===1?' year':' years') : null)}
      ${row('College / Pre-Draft', info.college)}
      ${row('Draft', info.draft)}
      ${row('Nationality', info.nat)}
      ${!info.ht && !info.college && !info.draft && !info.nat ? `<div style="text-align:center;padding:16px 0 4px;font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO BIO ON FILE</div>` : ''}
    </div>
  </div>`;

  // Clear tracker when modal is dismissed
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
function todayStr(){ return new Date().toISOString().split('T')[0].replace(/-/g,''); }
function currentWeekStart(){
  const d=new Date(); const day=d.getDay(); // 0=Sun
  d.setDate(d.getDate()-day);
  d.setHours(0,0,0,0);
  return d;
}
function avatarColor(idx){ return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }
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
async function loadLeagueState(){
  const {data} = await db.from('leagues').select('state').eq('id',LEAGUE_KEY).maybeSingle();
  if(data?.state){
    try{ leagueState = JSON.parse(data.state); }
    catch(e){ leagueState = data.state; }
  }
  if(!leagueState){ leagueState = defaultLeagueState(); }
  // Always sync live manager profiles so names/colors are never stale
  await syncManagersToState();
}

async function syncManagersToState(){
  const {data, error} = await db.from('managers').select('id,user_id,display_name,color,icon,team_name,is_commissioner').order('created_at');
  if(error) console.error('[syncManagers] error:', error.message, error.code);
  if(data) { console.log('[syncManagers] got', data.length, 'managers'); leagueState.managers = data; }
  else console.warn('[syncManagers] data is null/undefined');
}

async function saveLeagueState(){
  await db.from('leagues').upsert({id:LEAGUE_KEY, state:JSON.stringify(leagueState)});
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

async function bdlFetch(path, params={}){
  if(!bdlKey) return null;
  const url = new URL(`${BDL_BASE}${path}`);
  Object.entries(params).forEach(([k,v])=>{
    if(Array.isArray(v)) v.forEach(i=>url.searchParams.append(k,i));
    else url.searchParams.set(k,v);
  });
  const res = await fetch(url, { headers:{ Authorization: bdlKey } });
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
function normName(n){ return n.toLowerCase().replace(/[.\-']/g,'').replace(/\s+/g,' ').trim(); }

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
const BDL_AVG_CACHE_KEY = 'bdl_avgs_cache_v1';
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
    }
    updated++;
  }
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
const BDL_INJURY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
}

// Returns injury info for a player name, or null
function getInjuryStatus(playerName){
  return BDL_INJURIES[playerName] || null;
}

async function loadPortraits(){
  // Build portrait URLs from Supabase Storage.
  // URL pattern: /player-portraits/{TEAM}/{Player Name}.jpeg
  // PLAYERS is now BDL-driven so team abbreviations are current-season accurate.
  // Images that don't exist in Storage 404 silently (img onerror falls back to initials).
  playerPortraits = {};
  for(const p of PLAYERS){
    if(!p.team) continue;
    playerPortraits[p.name] = `${PORTRAITS_BUCKET_URL}/${p.team}/${encodeURIComponent(p.name)}.jpeg`;
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

// Parse BDL live box score into our stats format.
// Returns { [pid]: { fp, pts, reb, ast, stl, blk, to, tpm, fgm, fga, ftm, fta,
//                    live, gameId, dateStr } }
function parseBdlBoxScore(bdlGames, isLive){
  const stats = {};
  for(const game of bdlGames){
    const gameId  = String(game.id);
    const dateStr = (game.date||'').split('T')[0].replace(/-/g,'');
    // BDL box scores: players nested under home_team_box_score / visitor_team_box_score
    const sides = [game.home_team_box_score, game.visitor_team_box_score].filter(Boolean);
    for(const side of sides){
      const teamAbbr = side.team?.abbreviation || '';
      for(const p of (side.players||[])){
        if(!p.min || p.min==='00:00') continue;
        const pts=p.pts||0, reb=p.reb||0, ast=p.ast||0, stl=p.stl||0, blk=p.blk||0;
        const to=p.turnover||0, fgm=p.fgm||0, fga=p.fga||0;
        const ftm=p.ftm||0, fta=p.fta||0, tpm=p.fg3m||0, tpa=p.fg3a||0;
        const flagrant=0, technical=0;
        const fp = calcFP({pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,flagrant,technical});
        const matched = matchBdlPlayer(p.player?.first_name||'', p.player?.last_name||'', teamAbbr);
        if(matched){
          const pid = String(matched.id);
          if(!stats[pid]) stats[pid]={fp:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0,tpm:0,fgm:0,fga:0,ftm:0,fta:0,live:isLive,gameId,dateStr};
          stats[pid].fp  +=fp;  stats[pid].pts +=pts; stats[pid].reb +=reb;
          stats[pid].ast +=ast; stats[pid].stl +=stl; stats[pid].blk +=blk;
          stats[pid].to  +=to;  stats[pid].tpm +=tpm; stats[pid].fgm +=fgm;
          stats[pid].fga +=fga; stats[pid].ftm +=ftm; stats[pid].fta +=fta;
          if(isLive) stats[pid].live = true;
        }
      }
    }
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
        if(matched) stats[matched.id]={fp,pts,reb,ast,stl,blk,fgm,fga,ftm,fta,to,flagrant,technical,tpm,tpa,name:matched.name};
      }
    }
  }
  return stats;
}

async function refreshLiveStats(){
  const now=new Date();
  if(now<NBA_SEASON_START || now>NBA_SEASON_END) return;

  // ── Try BallDontLie first ──
  if(bdlKey){
    try{
      const todayET = new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}); // YYYY-MM-DD
      const yesterdayET = new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'America/New_York'});

      // Fetch live games
      const liveData = await bdlFetch('/box_scores/live');
      const liveGames = liveData?.data || [];

      // Fetch yesterday's final games (to save completed stats)
      const finalData = await bdlFetch('/box_scores', {date: yesterdayET});
      const finalGames = finalData?.data || [];
      // Also today's completed games
      const todayFinalData = await bdlFetch('/box_scores', {date: todayET});
      const todayFinalGames = (todayFinalData?.data||[]).filter(g=>g.status==='Final');

      const newLive = parseBdlBoxScore(liveGames, true);
      const hasLive = liveGames.length > 0;

      // Merge today completed into live view
      const completedStats = parseBdlBoxScore([...finalGames, ...todayFinalGames], false);
      for(const [pid, stat] of Object.entries(completedStats)){
        if(!newLive[pid]) newLive[pid] = stat;
      }

      livePlayerStats = newLive;
      liveGamesActive = hasLive;

      // Persist completed game stats
      const toSave = [...finalGames, ...todayFinalGames];
      if(toSave.length){
        if(!leagueState.playerStats) leagueState.playerStats={};
        let changed=false;
        const allDoneStats = parseBdlBoxScore(toSave, false);
        for(const [pid,stat] of Object.entries(allDoneStats)){
          // Each stat now carries its own dateStr and gameId from parseBdlBoxScore
          const key=`${pid}_${stat.dateStr}_${stat.gameId}`;
          if(!leagueState.playerStats[key]){
            leagueState.playerStats[key]={...stat,pid:parseInt(pid),date:stat.dateStr};
            changed=true;
          }
        }
        if(changed) await saveLeagueState();
      }

      // Speed up polling when games are live (30s), slow down otherwise (60s)
      const targetInterval = hasLive ? 30000 : 60000;
      if(livePolling && ((hasLive && livePolling._interval!==30000) || (!hasLive && livePolling._interval!==60000))){
        clearInterval(livePolling);
        livePolling = setInterval(refreshLiveStats, targetInterval);
        livePolling._interval = targetInterval;
      }

      render();
      return; // BDL succeeded — skip ESPN
    }catch(e){ console.warn('BDL live stats error, falling back to ESPN:', e); }
  }

  // ── ESPN fallback ──
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
      const isLive=!st?.completed && st?.state==='in';
      const isDone=st?.completed;
      if(!isLive && !isDone) continue;
      const alreadySaved=isDone && leagueState.playerStats &&
        Object.keys(leagueState.playerStats).some(k=>k.endsWith('_'+event._dateStr) && leagueState.playerStats[k].gameId===event.id);
      try{
        const gs=await fetchBoxScoreESPN(event.id);
        for(const [pid,stat] of Object.entries(gs)){
          if(!newLive[pid]) newLive[pid]={fp:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0,live:isLive,gameId:event.id};
          newLive[pid].fp  +=stat.fp;  newLive[pid].pts +=stat.pts; newLive[pid].reb +=stat.reb;
          newLive[pid].ast +=stat.ast; newLive[pid].stl +=stat.stl; newLive[pid].blk +=stat.blk;
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
  livePolling._interval=60000;
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
  if(roster.length>=effectiveRosterSize(mid)){ toast('Drop a player first (roster full)'); return false; }
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
  renderRostersScreen();
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
  else if(screen==='duel') renderDuelScreen();
  else if(screen==='profile') renderProfileScreen();
}

// ── HOME SCREEN ──────────────────────────────────────────────────────────────
function renderHomeScreen(){
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
    const live = (s.lastDate===today||s.lastDate===yesterday) ? s.streak : 0;
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
      ${avatarEl(m.display_name, m.color||'#4a9eff', 28, 8, m.icon||null, m.photo||null)}
      <div style="flex:1">
        <div style="font-family:var(--pixel);font-size:6.5px;color:${m.id===myId?'var(--accent2)':'var(--text2)'}">${m.display_name}${m.id===myId?' ★':''}</div>
        <div style="font-size:10px;color:var(--text3)">${m.totalCorrect} correct all-time</div>
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
  return managers[idx]?.display_name || null;
}

function getTopScorerHeadlines(){
  // Pull top 3 FP scorers from current week's rosters
  const managers = leagueState.managers || [];
  if(!managers.length) return [];

  const lines = [];
  const allRosters = managers.flatMap(m => {
    const roster = (m.rosters || {})[currentRun] || [];
    return roster.map(pid => ({ mid: m.id, mname: m.display_name, pid }));
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

// Fetch the set of NBA team abbreviations playing on a given date (YYYY-MM-DD).
// Uses ESPN scoreboard API (no key needed, client-side). Returns a Set, or null on failure.
async function fetchTeamsPlayingOn(dateKey){
  try {
    const fmt = dateKey.replace(/-/g,'');
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${fmt}`);
    if(!res.ok) return null;
    const data = await res.json();
    const playing = new Set();
    for(const ev of (data.events||[])){
      for(const comp of (ev.competitions||[])){
        for(const team of (comp.competitors||[])){
          const abbr = team.team?.abbreviation;
          if(abbr) playing.add(abbr.toUpperCase());
        }
      }
    }
    return playing.size > 0 ? playing : null;
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

  // Fetch which teams are playing today — filter players to active game participants
  const teamsPlaying = await fetchTeamsPlayingOn(dateKey);

  // ── Team Pick'em (every 4th day) ──────────────────────────────────────────
  if(seed % 4 === 0){
    // Only pick from teams actually playing today
    const allTeams = NBA_TEAMS_LIST || Object.keys(NBA_TEAMS||{});
    const teams = teamsPlaying ? allTeams.filter(t=>teamsPlaying.has(t.toUpperCase())) : allTeams;
    if(teams.length >= 2){
      let t1i = seed % teams.length;
      let t2i = (seed * 17 + 3) % teams.length;
      let att = 0;
      while(t1i===t2i && att<20){ t2i=(t2i+1)%teams.length; att++; }
      if(t1i !== t2i){
        const t1 = teams[t1i], t2 = teams[t2i];
        const fullName = abbr => NBA_TEAMS?.[abbr] || abbr;
        return {
          type: 'team',
          team1: t1, team2: t2,
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
  const tmpl = DUEL_STAT_TEMPLATES[seed % DUEL_STAT_TEMPLATES.length];
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
    if(injured.has(p.id) || injured.has(p.name)) return false;
    if(teamsPlaying && !teamsPlaying.has((p.team||'').toUpperCase())) return false;
    return true;
  });
  // Fallback: if schedule filtered too aggressively (rest day / schedule fetch failed), drop schedule filter
  if(stars.length < 2){
    console.warn('[autoGenerateDuel] <2 eligible stars with schedule filter — falling back to all stars');
    stars = PLAYERS.filter(p=>p.ppg>=15 && !injured.has(p.id) && !injured.has(p.name));
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
  // Already exists — nothing to do
  if((leagueState.duels||{})[today]) return;
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
  if(currentScreen==='duel') renderDuelScreen();
}

// Commissioner: set the result and update streaks
async function settleDuel(dateKey, result, score1, score2){
  const duel = (leagueState.duels||{})[dateKey];
  if(!duel){ toast('No duel for that date'); return; }
  duel.result = result; // 1, 2, or 'tie'
  duel.score1 = score1;
  duel.score2 = score2;
  // Streaks and leaderboard only count once the regular season begins (Oct 20)
  const countsForStreak = new Date(dateKey) >= NBA_SEASON_START;
  // Update streaks for all managers who picked
  if(!leagueState.duelStreaks) leagueState.duelStreaks = {};
  const prevDate = getPrevDateKey(dateKey);
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
      if(duel.result==='tie') resultBanner=`<div class="duel-result-banner" style="color:${tieColor}">TIE GAME — BOTH STREAKS HOLD ✓</div>`;
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
      return `<div class="duel-player ${myPick===side&&!settled?'duel-picked':''}" style="${pickedStyle(side)}">
        <div style="width:64px;height:64px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:14px;color:var(--text1)">${abbr}</div>
        <div class="dname">${abbr}</div>
        <div class="dstat" style="font-size:9px">${full}</div>
        ${myPick===side?'<div class="duel-my-pick">YOUR PICK ✓</div>':''}
        ${side===1?pct1:pct2}
      </div>`;
    };

    el.innerHTML=`
    <div class="duel-card">
      <div class="duel-header">
        <span>⚡ TEAM PICK'EM</span>
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="event.stopPropagation();showDuelRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;padding:0">RULES ›</button>
          <span class="duel-streak-chip">${streak > 0 ? `🔥 ${streak}` : '—'}</span>
        </div>
      </div>
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
      ? `${PORTRAITS_BUCKET_URL}/${teamAbbr}/${encodeURIComponent(p.name)}.jpeg`
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
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="event.stopPropagation();showDuelRules()" style="background:none;border:none;font-family:var(--pixel);font-size:5.5px;color:var(--accent1);cursor:pointer;padding:0">RULES ›</button>
        <span class="duel-streak-chip">${streak > 0 ? `🔥 ${streak}` : '—'}</span>
      </div>
    </div>
    <div class="duel-prompt">${duel.prompt}</div>
    ${statLine}
    <div class="duel-body">
      <div class="duel-player ${myPick===1&&!settled?'duel-picked':''}" style="${pickedStyle(1)}">
        <div class="portrait-wrap" onclick="event.stopPropagation();showPlayerCard('${p1.name}')" style="cursor:pointer"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p1)}</div></div>
        <div class="dname">${p1.name.split(' ').pop()}</div>
        <div class="dstat">${getDuelStatDisplay(p1, statType)}</div>
        ${myPick===1?'<div class="duel-my-pick">YOUR PICK ✓</div>':''}
        ${pct1}
      </div>
      <div class="duel-vs">VS</div>
      <div class="duel-player ${myPick===2&&!settled?'duel-picked':''}" style="${pickedStyle(2)}">
        <div class="portrait-wrap" onclick="event.stopPropagation();showPlayerCard('${p2.name}')" style="cursor:pointer"><div style="width:100%;height:100%;background:var(--bg3)">${portHtml(p2)}</div></div>
        <div class="dname">${p2.name.split(' ').pop()}</div>
        <div class="dstat">${getDuelStatDisplay(p2, statType)}</div>
        ${myPick===2?'<div class="duel-my-pick">YOUR PICK ✓</div>':''}
        ${pct2}
      </div>
    </div>
    ${!myPick && !settled ? `
    <div class="duel-btns">
      <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(1)">${p1.name.split(' ').pop().toUpperCase()}</button>
      <button class="duel-pick-btn" onclick="event.stopPropagation();makeDuelPick(2)">${p2.name.split(' ').pop().toUpperCase()}</button>
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
    const live = (s.lastDate===today||s.lastDate===yesterday) ? s.streak : 0;
    return {...m, streak:live, totalCorrect:s.totalCorrect||0};
  }).sort((a,b)=>b.streak!==a.streak?b.streak-a.streak:b.totalCorrect-a.totalCorrect);

  const myId = getMyId();
  let rowsHtml = rows.map((m,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${m.id===myId?'background:rgba(0,212,170,.05);margin:0 -16px;padding-left:16px;padding-right:16px;':''}">
      <span style="font-family:var(--pixel);font-size:8px;color:var(--text3);width:20px">${i+1}</span>
      ${avatarEl(m.display_name, m.color||'#4a9eff', 28, 8, m.icon||null, m.photo||null)}
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
  const myName=myProfile?.display_name||'Me';
  const oppName=opp?.display_name||'Opponent';
  const oppColor=opp?.color||'#4a9eff';
  el.innerHTML=`
  <div class="matchup-card" onclick="showMatchupDetail()" style="cursor:pointer">
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
      <span style="color:var(--accent1)">TAP FOR DETAILS ›</span>
    </div>
  </div>`;
}

function showMatchupDetail(){
  const mid=getMyId();
  if(!mid||!leagueState) return;
  const run=getCurrentRun();
  const weekMatchup=findMyMatchup(mid,run.id);
  if(!weekMatchup) return;
  const isHome=weekMatchup.home===mid;
  const oppId=isHome?weekMatchup.away:weekMatchup.home;
  const opp=leagueState.managers?.find(m=>m.id===oppId);
  const myName=myProfile?.display_name||'Me';
  const myColor=myProfile?.color||'#4a9eff';
  const oppName=opp?.display_name||'Opponent';
  const oppColor=opp?.color||'#4a9eff';

  const buildRosterRows=(managerId)=>{
    const active=(leagueState.active||{})[managerId]||autoActiveFor(managerId);
    return active.map(pid=>{
      const p=getPlayer(pid); if(!p) return '';
      const fp=playerTotalFP(pid);
      const live=(leagueState.playerStats||{})[`${pid}_${todayKey()}`];
      const liveFP=live?`<span style="color:var(--accent2);font-size:5px"> LIVE</span>`:'';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-family:var(--pixel);font-size:6px;color:var(--text1)">${p.name.split(' ').pop()}</div>
          <div style="font-family:var(--pixel);font-size:5px;color:var(--text3)">${p.pos} · ${p.team}</div>
        </div>
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3);text-align:right">${fp.toFixed(1)}<span style="font-size:5px;color:var(--text3)"> FP</span>${liveFP}</div>
      </div>`;
    }).join('');
  };

  const myFP=managerFP(mid);
  const oppFP=managerFP(oppId);
  const myLeading=myFP>=oppFP;
  const diff=Math.abs(myFP-oppFP).toFixed(1);

  let modal=document.getElementById('matchup-detail-modal');
  if(modal) modal.remove();
  modal=document.createElement('div');
  modal.id='matchup-detail-modal';
  modal.className='modal-overlay';
  modal.style.display='flex';
  modal.innerHTML=`
    <div class="modal-box" style="max-width:420px;width:calc(100% - 32px);max-height:85vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-family:var(--pixel);font-size:7px;color:var(--accent3)">${run.name.toUpperCase()} · ${getWeekLabel()}</div>
        <button onclick="document.getElementById('matchup-detail-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 8px;cursor:pointer;font-family:var(--pixel);font-size:6px">✕</button>
      </div>
      <!-- Score summary -->
      <div style="display:flex;align-items:center;justify-content:space-around;padding:12px;background:var(--bg2);border-radius:var(--radius);margin-bottom:14px">
        <div style="text-align:center">
          <div style="font-family:var(--pixel);font-size:16px;color:${myLeading?'var(--accent2)':'var(--text2)'}">${myFP.toFixed(1)}</div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);margin-top:4px">${myName}</div>
        </div>
        <div style="font-family:var(--pixel);font-size:8px;color:var(--text3)">VS</div>
        <div style="text-align:center">
          <div style="font-family:var(--pixel);font-size:16px;color:${!myLeading?'var(--accent2)':'var(--text2)'}">${oppFP.toFixed(1)}</div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:${oppColor};margin-top:4px">${oppName}</div>
        </div>
      </div>
      <div style="font-family:var(--pixel);font-size:5.5px;color:${myLeading?'var(--accent2)':'var(--accent4)'};text-align:center;margin-bottom:14px">
        ${myLeading?'▲':'▼'} ${myLeading?myName:oppName} LEADS BY ${diff} FP
      </div>
      <!-- Two roster columns -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:var(--accent1);margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid var(--accent1)">${myName.toUpperCase()}</div>
          ${buildRosterRows(mid)||'<div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO ACTIVE PLAYERS</div>'}
        </div>
        <div>
          <div style="font-family:var(--pixel);font-size:5.5px;color:${oppColor};margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${oppColor}">${oppName.toUpperCase()}</div>
          ${buildRosterRows(oppId)||'<div style="font-family:var(--pixel);font-size:5.5px;color:var(--text3)">NO ACTIVE PLAYERS</div>'}
        </div>
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
        ${row('Locks','Before the first game of each day')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Lineups must be set before the first tip-off each day. This means daily attention to the schedule — swap in hot players, bench injured ones, and pick up free agents throughout the week. The more involved, the better your team.
        </div>
      `)}

      ${section('INJURY RESERVE (IR)','var(--accent4)',`
        ${row('IR slots','1 per team')}
        ${row('Eligible','Players labeled as injured')}
        <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:8px;line-height:1.8">
          Each team may place one injured player on the IR. While a player is on IR, you may carry an extra player on your roster beyond the 10-player limit. To remove a player from IR, you must first have no more than 9 other players on your roster.
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
  const irPid=getIrSlot(mid);

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
    const gameInfo = getTodayGameInfo(p.team);
    const gameLabel = gameInfo
      ? `<span style="color:var(--accent2);font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    // Toggle button
    const toggleBtn = isOnIR ? '' : isActive
      ? `<button class="btn btn-sm" style="font-size:5px;padding:3px 7px;min-height:22px;background:transparent;border:1px solid var(--accent4);color:var(--accent4)" onclick="toggleActiveStatus('${mid}',${pid})">Bench</button>`
      : `<button class="btn btn-sm" style="font-size:5px;padding:3px 7px;min-height:22px;background:transparent;border:1px solid var(--accent2);color:var(--accent2)" onclick="toggleActiveStatus('${mid}',${pid})">Activate</button>`;
    return `
    <div class="player-row"${isOnIR?` style="background:rgba(128,90,213,0.06)"`:''}>
      <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name">${p.name}${isLive?' <span class="live-badge" style="font-size:4px;padding:1px 4px">LIVE</span>':''}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="player-fp">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        ${toggleBtn}
      </div>
    </div>`;
  };

  const irRow = irPid ? `
    <div class="lineup-section">
      <div class="lineup-section-label" style="color:#805ad5">🏥 INJURY RESERVE</div>
      ${rowHtml(irPid,'ir')}
    </div>` : '';

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
        ❌ BENCH <span class="count">(${inactive.length}/${INACTIVE_SIZE})</span>
      </div>
      ${inactive.map(pid=>rowHtml(pid,'inactive')).join('')}
    </div>` : ''}
    ${irRow}
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
  const ordinal=n=>n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
  const rankStr=rank>0?`${ordinal(rank)} / ${total}`:'—';
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
      <div style="font-family:var(--pixel);font-size:10px;color:var(--accent2)">${topP ? topP.name.split(' ').pop() : '—'}</div>
      <div style="font-family:var(--pixel);font-size:5px;color:var(--text3);margin-top:3px">TEAM MVP · ${topP?playerTotalFP(topPlayer).toFixed(1)+' FP':'—'}</div>
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
  const newOffset=scheduleWeekOffset+delta;
  const newIdx=curIdx+newOffset;
  if(newIdx<0 || newIdx>=schedule.length) return;
  scheduleWeekOffset=newOffset;
  renderFantasySchedule();
}

function switchRun(runId){
  currentRun=runId;
  document.querySelectorAll('.run-tab').forEach(t=>{
    t.classList.toggle('active',parseInt(t.dataset.run)===runId);
  });
  if(currentFantasyTab==='standings'){
    renderFantasyRunContent();
    syncManagersToState().then(()=>renderFantasyRunContent());
  }
  else if(currentFantasyTab==='schedule') renderFantasySchedule();
}

function renderFantasyScreen(){
  switchFantasyTab(currentFantasyTab);
}

let draftFilter = { availability:'available', team:'all', sort:'fp', rookie:false };
let draftSearchQuery = '';

function renderDraftPlayerList(){
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
        const injColor = inj?.status?.toLowerCase().includes('day') ? '#d69e2e' : '#e53e3e';
        const injLabel = inj?.status?.toLowerCase().includes('day') ? 'DTD' : inj ? 'OUT' : '';
        const injBadge = inj ? `<span title="${(inj.description||inj.status).replace(/"/g,"'")}" style="background:${injColor};color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px;cursor:help">${injLabel}</span>` : '';
        const projLine=`<div class="player-meta" style="color:var(--accent3)">${projFPVal} ${projLabel}</div>`;
        return `
        <div class="player-row" style="padding:8px 14px">
          <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
          <div class="player-info">
            <div class="player-name">${p.name}${rookieBadge}${injBadge}</div>
            <div class="player-meta">${p.pos} · ${p.team}</div>
            <div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>
            ${projLine}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="player-fp" style="font-size:10px">${fp>0?fp.toFixed(1)+'<span class="fp-label">FP</span>':''}</div>
            ${rostered
              ? `<span style="font-family:var(--pixel);font-size:5px;color:var(--text3);text-align:right">DRAFTED${draftedBy?`<br/><span style="color:var(--accent2)">${draftedBy.display_name}</span>`:''}</span>`
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

  const filterBtn=(label,active,onclick)=>`<button onclick="${onclick}" style="background:${active?'var(--accent1)':'var(--bg3)'};color:${active?'#000':'var(--text2)'};border:1px solid ${active?'var(--accent1)':'var(--border)'};border-radius:20px;padding:5px 10px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;white-space:nowrap">${label}</button>`;
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
          <span style="font-family:var(--pixel);font-size:6px;color:${color};flex:1">${mgr?.display_name||'?'}</span>
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
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">SHOW</span>
        ${filterBtn('Available',draftFilter.availability!=='all',"draftFilter.availability='available';renderDraftPlayerList()")}
        ${filterBtn('All Players',draftFilter.availability==='all',"draftFilter.availability='all';renderDraftPlayerList()")}
        ${filterBtn('🌟 Rookies',draftFilter.rookie,"draftFilter.rookie=!draftFilter.rookie;renderDraftPlayerList()")}
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0;margin-left:4px">SORT</span>
        ${filterBtn('⬆ FP',draftFilter.sort==='fp',"draftFilter.sort='fp';renderDraftPlayerList()")}
        ${filterBtn('A–Z',draftFilter.sort==='alpha',"draftFilter.sort='alpha';renderDraftPlayerList()")}
      </div>
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
      const onClockName = managers[idx]?.display_name || 'someone else';
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
  const schedule=(leagueState.schedule||{})[currentRun]||[];
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

  // Build week date ranges from run start (Mon–Sun)
  const runStart=new Date(run.start);
  const firstMon=new Date(runStart);
  const dow=runStart.getDay();
  if(dow!==1) firstMon.setDate(runStart.getDate()+((1-dow+7)%7));

  const fmtDate=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});

  const wi=clampedIdx;
  const monDate=new Date(firstMon); monDate.setDate(firstMon.getDate()+wi*7);
  const sunDate=new Date(monDate); sunDate.setDate(monDate.getDate()+6);
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
      const hFP=managerFP(matchup.home), aFP=managerFP(matchup.away);
      hFPStr=hFP.toFixed(1); aFPStr=aFP.toFixed(1);
      if(isPast&&matchup.winner){ hWin=matchup.winner===matchup.home; aWin=matchup.winner===matchup.away; }
      else if(isCurrent){ hWin=hFP>aFP; aWin=aFP>hFP; }
    }
    html+=`<div class="schedule-matchup-row${isMine?' is-mine':''}">
      <div class="schedule-team-cell">
        ${avatarEl(h.display_name,h.color||'#4a9eff',22,7,h.icon||null,h.photo||null)}
        <span style="font-size:11px;color:${h.color||'var(--text1)'}${isMine&&matchup.home===myId?';font-weight:600':''}">${h.display_name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <span class="schedule-fp" style="${hWin?'color:var(--accent2)':isPast?'color:var(--text3)':''}">${hFPStr}</span>
        <span class="schedule-vs">VS</span>
        <span class="schedule-fp" style="${aWin?'color:var(--accent2)':isPast?'color:var(--text3)':''}">${aFPStr}</span>
      </div>
      <div class="schedule-team-cell right">
        <span style="font-size:11px;color:${a.color||'var(--text1)'}${isMine&&matchup.away===myId?';font-weight:600':''}">${a.display_name}</span>
        ${avatarEl(a.display_name,a.color||'#4a9eff',22,7,a.icon||null,a.photo||null)}
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
                ${avatarEl(m.display_name,m.color||'#4a9eff',24,8,m.icon||null,m.photo||null)}
                <div>
                  <div class="team-name">${m.team_name||m.display_name}</div>
                  <div style="font-family:var(--pixel);font-size:5px;color:var(--text3)">${m.display_name}${m.id===myId?' · YOU':''}</div>
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
              ${avatarEl(s.m.display_name,s.m.color||'#4a9eff',24,8,s.m.icon||null,s.m.photo||null)}
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
let rostersViewId = null; // which manager's roster to show

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
  // Show team names once managers exist, even if draft hasn't happened
  tabsEl.innerHTML=managers.map(m=>{
    const isActive=m.id===rostersViewId;
    const isMe=m.id===myId;
    return `<button onclick="rostersViewId=${JSON.stringify(m.id)};renderRostersScreen()" style="flex-shrink:0;background:${isActive?'var(--accent1)':'var(--bg3)'};color:${isActive?'#000':'var(--text2)'};border:1px solid ${isActive?'var(--accent1)':'var(--border)'};border-radius:20px;padding:5px 12px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;white-space:nowrap">${m.display_name}${isMe?' (YOU)':''}</button>`;
  }).join('');

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
    const isLocked=fp>=topFP && roster.length>1 && !isOnIR;
    const inj = getInjuryStatus(p.name);
    const port=playerPortraits[p.name];
    const portEl=`<img src="${port}" style="width:100%;height:100%;object-fit:cover;object-position:center top" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="initials" style="display:none;color:${viewManager?.color||'#4a9eff'};font-size:7px">${initials(p.name)}</div>`;
    const injColor = inj?.status?.toLowerCase().includes('day') ? '#d69e2e' : '#e53e3e';
    const injLabel = inj?.status?.toLowerCase().includes('day') ? 'DTD' : inj ? 'OUT' : '';
    const injBadge = inj ? `<span title="${(inj.description||inj.status).replace(/"/g,"'")}" style="background:${injColor};color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px;cursor:help">${injLabel}</span>` : '';
    const irBadge = isOnIR ? `<span style="background:#805ad5;color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px">IR</span>` : '';
    const statusLabel = isOnIR
      ? '<span style="color:#805ad5">■ INJURY RESERVE</span>'
      : isActive ? '<span style="color:var(--accent2)">● ACTIVE</span>' : '<span style="color:var(--accent4)">● BENCH</span>';
    const gameInfo = getTodayGameInfo(p.team);
    const gameLabel = gameInfo
      ? `<span style="color:var(--accent2);font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    return `
    <div class="player-row" style="padding:8px 14px${isOnIR?';background:rgba(128,90,213,0.06)':''}">
      <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name">${p.name} ${isLocked&&isMyRoster?'🔒':''}${injBadge}${irBadge}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${statusLabel}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="player-fp" style="font-size:11px">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        ${isMyRoster?`<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
          ${isOnIR
            ? `<button class="btn btn-sm btn-secondary" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="removeFromIR('${rostersViewId}',${pid})">REMOVE IR</button>`
            : `<button class="btn btn-sm" style="font-size:5px;padding:4px 6px;min-height:24px;background:transparent;border:1px solid ${isActive?'var(--accent4)':'var(--accent2)'};color:${isActive?'var(--accent4)':'var(--accent2)'}" onclick="toggleActiveStatus('${rostersViewId}',${pid})">${isActive?'Bench':'Activate'}</button>
               ${inj&&!irPid?`<button class="btn btn-sm btn-secondary" style="font-size:5px;padding:4px 6px;min-height:24px;background:rgba(128,90,213,0.15);border-color:#805ad5;color:#805ad5" onclick="putOnIR('${rostersViewId}',${pid})">→ IR</button>`:''}
               ${!isLocked?`<button class="btn btn-sm btn-danger" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="confirmDrop('${rostersViewId}',${pid})">Drop</button>`:''}`
          }
        </div>`:''}
      </div>
    </div>`;
  };

  const nonIrCount = roster.filter(id=>id!==irPid).length;
  contentEl.innerHTML=`
    <div style="padding:8px 14px 4px;font-family:var(--pixel);font-size:6px;color:var(--text3)">
      ${viewManager.display_name.toUpperCase()} · ${nonIrCount}/${ROSTER_SIZE} PLAYERS${irPid?` · <span style="color:#805ad5">1 ON IR</span>`:''}  · ${active.length} ACTIVE
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin:0 14px">
      ${roster.map(rowHtml).join('')}
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
    const gameInfo = getTodayGameInfo(p.team);
    const gameLabel = gameInfo
      ? `<span style="color:var(--accent2);font-size:5px">${gameInfo}</span>`
      : `<span style="color:var(--text3);font-size:5px">No Game Today</span>`;
    return `
    <div class="player-row" style="padding:8px 14px">
      <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
      <div class="player-info">
        <div class="player-name">${p.name} ${isLocked?'🔒':''}</div>
        <div class="player-meta">${p.pos} · ${p.team}</div>
        <div class="player-meta" style="margin-top:2px">${isActive?'<span style="color:var(--accent2)">● ACTIVE</span>':'<span style="color:var(--accent4)">● BENCH</span>'}</div>
        <div class="player-meta" style="margin-top:2px">${gameLabel}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="player-fp" style="font-size:11px">${fp.toFixed(1)}<span class="fp-label">FP</span></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" style="font-size:5px;padding:4px 6px;min-height:24px;background:transparent;border:1px solid ${isActive?'var(--accent4)':'var(--accent2)'};color:${isActive?'var(--accent4)':'var(--accent2)'}" onclick="toggleActiveStatus('${mid}',${pid})">
            ${isActive?'Bench':'Activate'}
          </button>
          ${!isLocked?`<button class="btn btn-sm btn-danger" style="font-size:5px;padding:4px 6px;min-height:24px" onclick="confirmDrop('${mid}',${pid})">Drop</button>`:''}
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
        <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
        <div class="player-info">
          <div class="player-name">${p.name}</div>
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
let waiverFilter = { availability:'available', team:'all', sort:'fp' };
let waiverSearchQuery = '';

function resetWaiverFilters(){
  waiverFilter = { availability:'available', team:'all', sort:'fp' };
  waiverSearchQuery = '';
}

function renderWaiverPlayerList(){
  const el=document.getElementById('waiver-player-list');
  if(!el) return;
  const mid=getMyId();
  const allRostered=new Set(Object.values(leagueState.rosters||{}).flat());
  const query=waiverSearchQuery.toLowerCase();
  const canAdd=mid && canWaiver(mid) && getMyRoster().length<effectiveRosterSize(mid);

  let players=PLAYERS.filter(p=>{
    if(waiverFilter.availability==='available' && allRostered.has(p.id)) return false;
    if(waiverFilter.team!=='all' && p.team!==waiverFilter.team) return false;
    if(query && !p.name.toLowerCase().includes(query) && !p.team.toLowerCase().includes(query) && !p.pos.toLowerCase().includes(query)) return false;
    return true;
  });

  if(waiverFilter.sort==='fp'){
    players=[...players].sort((a,b)=>{
      const bFP=playerTotalFP(b.id)||((b.ppg+b.rpg+b.apg+b.spg+b.bpg));
      const aFP=playerTotalFP(a.id)||((a.ppg+a.rpg+a.apg+a.spg+a.bpg));
      return bFP-aFP;
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
          <div class="player-portrait" onclick="showPlayerCard('${p.name}')" style="cursor:pointer">${portEl}</div>
          <div class="player-info">
            <div class="player-name">${p.name}${(()=>{const inj=getInjuryStatus(p.name);if(!inj)return '';const c=inj.status?.toLowerCase().includes('day')?'#d69e2e':'#e53e3e';const l=inj.status?.toLowerCase().includes('day')?'DTD':'OUT';return `<span title="${(inj.description||inj.status).replace(/"/g,"'")}" style="background:${c};color:#fff;font-family:var(--pixel);font-size:4.5px;padding:1px 4px;border-radius:3px;margin-left:4px;cursor:help">${l}</span>`;})()}</div>
            <div class="player-meta">${p.pos} · ${p.team}</div>
            <div class="player-meta">${p.ppg.toFixed(1)} pts · ${p.rpg.toFixed(1)} reb · ${p.apg.toFixed(1)} ast</div>
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

  const filterBtn=(label,active,onclick)=>`<button onclick="${onclick}" style="background:${active?'var(--accent1)':'var(--bg3)'};color:${active?'#000':'var(--text2)'};border:1px solid ${active?'var(--accent1)':'var(--border)'};border-radius:20px;padding:5px 10px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;white-space:nowrap">${label}</button>`;
  const teamDropdown=`<select onchange="waiverFilter.team=this.value;renderWaiverPlayerList()" style="background:var(--bg3);color:var(--text1);border:1px solid var(--border);border-radius:var(--radius);padding:5px 8px;font-family:var(--pixel);font-size:5.5px;cursor:pointer;flex:1;min-width:0">
    <option value="all" ${waiverFilter.team==='all'?'selected':''}>All Teams</option>
    ${NBA_TEAMS_LIST.map(t=>`<option value="${t}" ${waiverFilter.team===t?'selected':''}>${t} — ${NBA_TEAMS[t]||t}</option>`).join('')}
  </select>`;

  el.innerHTML=`
    <div style="padding:10px 14px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:var(--pixel);font-size:6px;color:var(--text3)">WAIVER WIRE · ADD/DROPS LEFT: <span style="color:var(--accent1)">${WAIVER_WEEKLY-used}/${WAIVER_WEEKLY}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0">SHOW</span>
        ${filterBtn('Available',waiverFilter.availability==='available',"waiverFilter.availability='available';renderWaiverPlayerList()")}
        ${filterBtn('All Players',waiverFilter.availability==='all',"waiverFilter.availability='all';renderWaiverPlayerList()")}
        <span style="font-family:var(--pixel);font-size:5.5px;color:var(--text3);flex-shrink:0;margin-left:4px">SORT</span>
        ${filterBtn('⬆ FP',waiverFilter.sort==='fp',"waiverFilter.sort='fp';renderWaiverPlayerList()")}
        ${filterBtn('A–Z',waiverFilter.sort==='alpha',"waiverFilter.sort='alpha';renderWaiverPlayerList()")}
      </div>
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
  if(!inj){ toast('Player must be OUT or DTD to go on IR'); return; }
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

function confirmDrop(mid, pid){
  const p=getPlayer(pid); if(!p) return;
  // Show inline confirmation modal
  const existing=document.getElementById('drop-confirm-modal');
  if(existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='drop-confirm-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px 24px;max-width:320px;width:100%;font-family:var(--pixel)">
      <div style="font-size:7px;color:var(--text1);margin-bottom:12px;line-height:1.6">Are you sure you want to drop <span style="color:var(--accent4)">${p.name}</span>?</div>
      <div style="font-size:5.5px;color:var(--text3);margin-bottom:16px">They will be returned to the waiver pool.</div>
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
    toast(`${p?.name||'Player'} dropped`);
    renderRostersScreen();
    renderLineupPreview();
  }
}

// ── PROFILE SCREEN ───────────────────────────────────────────────────────────
function renderProfileScreen(){
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
      const ordinal=n=>n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
      standEl.textContent=rank>0?`${ordinal(rank)} of ${total}`:'—';
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
          <div style="font-size:10px;color:var(--text3);margin-top:2px">JPG or PNG · max 2MB</div>
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
  const runStart=new Date(run.start);
  const runEnd=new Date(run.end);
  const totalWeeks=Math.ceil((runEnd-runStart)/(7*24*3600*1000));
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

  // Ticker logic:
  //   Before 9:00 AM ET  → show yesterday's final scores only (until window closes at 8:59)
  //   9:00 AM ET onward  → show today's upcoming games with start times, then live games,
  //                         then any finals once complete; yesterday's finals no longer shown
  const showYesterday = etHour < 9;   // true = before 9 AM ET
  const datesToFetch  = showYesterday ? [yesterdayET] : [todayET, yesterdayET];

  // ── Try BallDontLie first ──
  if(bdlKey){
    try{
      const gamesRes = await bdlFetch('/games', {'dates[]': datesToFetch, per_page: 30});
      const combined = gamesRes?.data || [];
      if(combined.length){ renderTickerBdl(combined, todayET, showYesterday); return; }
    }catch(e){ console.warn('BDL ticker fetch failed, trying ESPN:', e); }
  }

  // ── ESPN fallback ──
  try{
    const fmt = d => d.slice(0,10).replace(/-/g,'');
    let allEvents = [];
    for(const d of datesToFetch){
      try{
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${fmt(d)}`);
        if(res.ok){ const data=await res.json(); allEvents=allEvents.concat(data.events||[]); }
      }catch(e){}
    }
    renderTicker(allEvents, todayET, showYesterday);
  }catch(e){ console.warn('Ticker fetch failed:', e); }
}

// Render ticker from BDL /games response
// showYesterday: when true (before 9 AM ET) only show yesterday's finals, no upcoming times
function renderTickerBdl(games, todayDate, showYesterday){
  const el    = document.getElementById('game-ticker');
  const track = document.getElementById('ticker-track');
  if(!el || !track) return;

  // Sort: live first, then today upcoming, then finals
  const order = g => g.status==='In Progress' ? 0 : (g.status==='Final'||g.status?.startsWith('Final')) ? 2 : 1;
  games.sort((a,b)=>order(a)-order(b));

  let html = buildTickerDraftHtml(); // draft window items

  const fmtTime = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) + ' ET';
  };

  for(const g of games){
    const away = g.visitor_team?.abbreviation || '???';
    const home = g.home_team?.abbreviation    || '???';
    const awayScore = g.visitor_team_score ?? '';
    const homeScore = g.home_team_score    ?? '';
    const st = g.status; // 'Final', 'In Progress', '1st Qtr', etc.
    const isYesterday = g.date && !g.date.startsWith(todayDate);

    if(st==='Final' || st?.startsWith('Final')){
      // Before 9 AM: show yesterday's finals. After 9 AM: show today's finals too.
      if(isYesterday && !showYesterday) continue; // past yesterday window
      const awayWin = parseFloat(awayScore) > parseFloat(homeScore);
      const homeWin = parseFloat(homeScore) > parseFloat(awayScore);
      html += `<div class="ticker-game">
        <span class="final">${isYesterday ? 'FINAL ✓' : 'FINAL'}</span>
        <span>${away} <span class="score" ${awayWin?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span style="color:var(--border)">·</span>
        <span>${home} <span class="score" ${homeWin?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
    } else if(st==='In Progress' || /^\d/.test(st||'')){
      if(isYesterday) continue; // stale live score from yesterday — skip
      const awayLead = parseFloat(awayScore) > parseFloat(homeScore);
      const homeLead = parseFloat(homeScore) > parseFloat(awayScore);
      html += `<div class="ticker-game">
        <span class="live-dot"></span>
        <span>${away} <span class="score" ${awayLead?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span class="period">${st||'LIVE'}</span>
        <span>${home} <span class="score" ${homeLead?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
    } else {
      // Upcoming game — only show from 9 AM ET, and only for today
      if(showYesterday || isYesterday) continue;
      html += `<div class="ticker-game">
        <span class="upcoming">${fmtTime(g.date)}</span>
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
    const timeStr = g.date ? fmtTime(g.date) : '';
    if(away) todayGamesCache[away] = { opponent: home, time: timeStr, isHome: false };
    if(home) todayGamesCache[home] = { opponent: away, time: timeStr, isHome: true  };
  }

  if(!html){ el.style.display='none'; return; }
  track.innerHTML = html + html;
  el.style.display = 'flex';
  const totalW = track.scrollWidth / 2;
  const speed = Math.max(20, totalW / 80);
  track.style.animationDuration = `${speed}s`;
}

// Helper: get today's game info for an NBA team abbreviation
// Returns {label} e.g. "@ LAL 7:30 PM ET" or "vs GSW 9:00 PM ET", or null
function getTodayGameInfo(teamAbbr){
  if(!teamAbbr) return null;
  const abbr = teamAbbr.toUpperCase();
  const g = todayGamesCache[abbr];
  if(!g) return null;
  return `${g.isHome ? 'vs' : '@'} ${g.opponent}${g.time ? ', '+g.time : ''}`;
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
      const fmtDT = d => d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+
        d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'});
      html += `<div class="ticker-game">
        <span class="upcoming" style="background:var(--accent2)">DRAFT</span>
        <span>${dw.label} starts ${fmtDT(s)}</span>
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
            nextUp = managers[idx]?.display_name||null;
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

  sorted.forEach(ev => {
    const comp = ev.competitions?.[0];
    if(!comp) return;
    const teams = comp.competitors || [];
    const home = teams.find(t=>t.homeAway==='home') || teams[0];
    const away = teams.find(t=>t.homeAway==='away') || teams[1];
    const stateVal = comp.status?.type?.state;
    const homeAbbr = home?.team?.abbreviation || '???';
    const awayAbbr = away?.team?.abbreviation || '???';
    const homeScore = home?.score || '';
    const awayScore = away?.score || '';
    // ESPN date comes as YYYYMMDD format in URL but ISO in the event
    const evDateStr = ev.date ? ev.date.slice(0,10) : '';
    const isYesterday = todayDate && evDateStr !== todayDate;

    if(stateVal==='in'){
      if(isYesterday) return; // stale live score — skip
      const period = comp.status?.period || '';
      const clock  = comp.status?.displayClock || '';
      const pLabel = period===5 ? 'OT' : `Q${period}`;
      const awayLead = parseFloat(awayScore) > parseFloat(homeScore);
      const homeLead = parseFloat(homeScore) > parseFloat(awayScore);
      html += `<div class="ticker-game">
        <span class="live-dot"></span>
        <span>${awayAbbr} <span class="score" ${awayLead?'style="color:#4ade80"':''}>${awayScore}</span></span>
        <span class="period">${pLabel} ${clock}</span>
        <span>${homeAbbr} <span class="score" ${homeLead?'style="color:#4ade80"':''}>${homeScore}</span></span>
      </div>`;
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
        <span class="upcoming">${fmtTime(comp.date)}</span>
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

// ── BOOT ────────────────────────────────────────────────────────────────────
async function boot(){
  // Load BDL key and player data early (no auth needed for config read)
  await loadBdlKey();
  // BDL is the single source of truth for player data.
  // loadBdlPlayers() rebuilds PLAYERS from /players/active, then chains loadBdlSeasonAverages()
  // to populate BDL_STATS with live FP projections. Both run fire-and-forget.
  loadBdlPlayers();
  loadBdlInjuries();

  // Auth state listener
  db.auth.onAuthStateChange(async (event,session)=>{
    currentUser=session?.user||null;
    if(currentUser){
      const isFirstLogin = event==='SIGNED_IN' || event==='INITIAL_SESSION';
      await loadManagerProfile();
      await loadLeagueState();
      await loadPortraits();
      await ensureTodaysDuel();
      updateUserChip();
      if(isFirstLogin){
        // Only navigate to home on actual login — not on silent token refreshes
        showApp();
        renderHomeScreen();
        startPolling();
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

// Get or create current week key (Mon–Sun, starts Monday)
function wlcWeekKey(date){
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  // Days since Monday: Sun=6, Mon=0, Tue=1...Sat=5
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMonday);
  return monday.toISOString().split('T')[0];
}

function wlcWeekLabel(weekKey){
  const mon = new Date(weekKey);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `${fmt(mon)} – ${fmt(sun)}`;
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
    <span class="wlc-theme-badge">${week.theme||'Week'}</span>`;
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

function renderWlcPendingApproval(el, week, wk){
  const isComm = myProfile?.is_commissioner;
  el.innerHTML = `
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
                  ${avatarEl(m.display_name,m.color||'#4a9eff',22,5.5,m.icon||null,m.photo||null)}
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
        ${avatarEl(m.display_name,m.color||'#4a9eff',24,6,m.icon||null,m.photo||null)}
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
  // Default tip-off to Monday of the week at 1pm ET (week starts Monday)
  const mon = new Date(weekKey);
  mon.setHours(18, 0, 0, 0); // 1pm ET = 18:00 UTC
  leagueState.wlc.weeks[weekKey].tipoffTime = mon.toISOString();
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
        <p style="margin-bottom:10px">Your team earns Fantasy Points (FP) based on how your players actually perform during the week. FP scoring: <strong>+1 per point, +1.2 per rebound, +1.5 per assist, +3 per steal, +3 per block, −1 per missed FG, −1 per missed FT, −1 per turnover, −1 per flagrant foul, −1 per technical foul.</strong></p>
        <p style="margin-bottom:10px">Lineups lock when the first game tips off. After that, you can swap an injured player once per week — same tier only.</p>
        <p>The manager with the most FP at the end of the week wins. Wins and total FP are tracked all season.</p>
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
    ['Points (PTS)','Who scores more?'],
    ['Rebounds (REB)','Who grabs more boards?'],
    ['Assists (AST)','Who dishes more dimes?'],
    ['Fantasy Points (FP)','Who earns more total FP?'],
    ['REB + AST','Who racks up more combined?'],
    ['STL + BLK','Who locks down more?'],
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
          Each day, two NBA players go head-to-head in a single stat category. Pick the one you think will win. Get it right and extend your streak — get it wrong and it resets to zero. A tie counts as a win for everyone.
        </div>
      </div>

      <div style="margin-bottom:18px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent5);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">STAT CATEGORIES</div>
        ${statTypes}
      </div>

      <div style="margin-bottom:18px">
        <div style="font-family:var(--pixel);font-size:6.5px;color:var(--accent5);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">STREAK & SCORING</div>
        ${row('Correct pick','Streak +1 🔥')}
        ${row('Wrong pick','Streak resets to 0')}
        ${row('Tie','Both streaks hold')}
        ${row('No pick','Streak unchanged')}
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

      ${game('🎯','WEEKLY LINE-UP CHALLENGE','var(--accent3)','Pick 5 players under the $15 salary cap',[
        'Every week: a themed pool of 25 players split into 5 salary tiers ($1–$5)',
        'Build a 5-man team that fits under the $15 cap',
        'Your squad earns FP all week from real game stats',
        'One mid-week swap allowed — same tier, injury only',
        'Most FP wins the week. Wins and total FP tracked all season',
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
