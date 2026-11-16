/* NBA Arcade · test site · sample data shared by every page.
   Player names, teams and FP/G come from the live league's player list (Nov 15).
   Everything else (rosters, scores, standings, today's games) is made up for the preview. */

const TC = {ATL:'#e03a3e',BOS:'#007a33',BKN:'#2a2a2a',CHA:'#1d1160',CHI:'#ce1141',CLE:'#860038',DAL:'#00538c',DEN:'#0e2240',DET:'#c8102e',GSW:'#1d428a',
  HOU:'#ce1141',IND:'#002d62',LAC:'#c8102e',LAL:'#552583',MEM:'#5d76a9',MIA:'#98002e',MIL:'#00471b',MIN:'#0c2340',NOP:'#0c2340',NYK:'#006bb6',
  OKC:'#007ac1',ORL:'#0077c0',PHI:'#006bb6',PHX:'#1d1160',POR:'#e03a3e',SAC:'#5a2d81',SAS:'#8a96a0',TOR:'#ce1141',UTA:'#002b5c',WAS:'#002b5c'};
const hsh = s => { let h=2166136261; for(const ch of String(s)) h=Math.imul(h^ch.charCodeAt(0),16777619); return (h>>>0)/4294967296; };

const RAW = [["Luka Doncic","LAL","F",37.6],["Victor Wembanyama","SAS","F",36.2],["Giannis Antetokounmpo","MIA","F",34],["Nikola Jokic","DEN","C",33.9],["Alperen Sengun","HOU","F",30.5],["Karl-Anthony Towns","NYK","C",29.3],["Anthony Davis","WAS","F",28.4],["Jamal Murray","DEN","G",27.5],["Tyrese Haliburton","IND","G",27.5],["Cade Cunningham","DET","G",27.5],["Cooper Flagg","DAL","F",27.3],["Domantas Sabonis","SAC","F",27.1],["Stephen Curry","GSW","G",26.6],["Jayson Tatum","BOS","F",26.1],["Anthony Edwards","MIN","G",26],["Franz Wagner","ORL","F",25.6],["Tyrese Maxey","PHI","G",25.5],["Shai Gilgeous-Alexander","OKC","G",25.3],["Bam Adebayo","MIA","C",25.2],["Walker Kessler","LAL","C",24.6],["Deni Avdija","POR","F",24.3],["Jalen Johnson","ATL","F",24.3],["Zion Williamson","NOP","F",23.7],["Scottie Barnes","TOR","G",22.8],["Devin Booker","PHX","G",22.7],["Ty Jerome","MEM","G",22.5],["Austin Reaves","LAL","G",22.5],["Donovan Mitchell","CLE","G",22.3],["Pascal Siakam","IND","F",22.2],["Paul George","BOS","F",21.7],["Kevin Durant","HOU","F",21.5],["Evan Mobley","CLE","F",21.5],["Jalen Brunson","NYK","G",21.2],["Kyrie Irving","DAL","G",21],["Davion Mitchell","MIA","G",20.8],["Yaxel Lendeborg","GSW","F",20.8],["Jaylen Brown","PHI","G",20.5],["Donovan Clingan","POR","C",20.3],["Michael Porter Jr.","BKN","F",20.2],["Trae Young","WAS","G",20.2],["Jaden McDaniels","MIN","F",20.1],["Dylan Harper","SAS","G",20],["Darius Acuff Jr.","SAC","G",20],["Cameron Boozer","MEM","F",20],["Cedric Coward","MEM","G",19.9],["Wendell Carter Jr.","ORL","F",19.8],["RJ Barrett","TOR","F",19.8],["Ayo Dosunmu","MIN","G",19.7],["Jarrett Allen","CLE","C",19.6],["Isaiah Hartenstein","OKC","F",19.5],["LeBron James","PHI","F",19.4],["Chet Holmgren","OKC","C",19.3],["Anthony Black","ORL","G",19.3],["Keyonte George","UTA","G",19.3],["Miles Bridges","PHX","F",19.2],["Onyeka Okongwu","ATL","F",19.2],["Dyson Daniels","ATL","G",19.2],["Joel Embiid","PHI","F",18.9],["Tyler Herro","MIL","G",18.9],["Julius Randle","BKN","F",18.8],["Amen Thompson","HOU","G",18.7],["Jabari Smith Jr.","HOU","F",18.6],["Ausar Thompson","DET","G",18.6],["KyShawn George","WAS","F",18.5],["Jalen Smith","CHI","F",18.4],["Zach LaVine","SAC","G",18.3],["Ajay Mitchell","OKC","G",18.2],["Brandin Podziemski","GSW","G",18.1],["Immanuel Quickley","TOR","G",18],["De'Aaron Fox","SAS","G",17.9],["James Harden","CLE","G",17.8],["Ja Morant","POR","G",17.8],["Damian Lillard","POR","G",17.7],["LaMelo Ball","MIN","G",17.7],["Moussa Diabate","CHA","F",17.7],["VJ Edgecombe","PHI","G",17.6],["Andrew Nembhard","IND","G",17.4],["Lauri Markkanen","UTA","F",17.3],["Trey Murphy III","NOP","F",17],["Yves Missi","NOP","C",17],["Nickeil Alexander-Walker","ATL","G",16.6],["Paul Reed","DET","F",16.6],["Jaime Jaquez Jr.","MIL","G",16.6],["Darius Garland","LAC","G",16.5],["Day'Ron Sharpe","BKN","C",16.5],["Stephon Castle","SAS","G",16.5],["Alexandre Sarr","WAS","C",16.5],["Darryn Peterson","UTA","G",16.5],["Caleb Wilson","CHI","F",16.5],["Fred VanVleet","HOU","G",16.4],["Brook Lopez","LAC","C",16.3],["Norman Powell","CHI","F",16.1],["Ivica Zubac","IND","C",16.1],["Saddiq Bey","NOP","F",15.9],["Josh Giddey","CHI","G",15.9],["Naz Reid","CHA","F",15.8],["Ace Bailey","UTA","F",15.7],["Dejounte Murray","NOP","G",15.6],["Jeremiah Fears","NOP","G",15.6],["Jaren Jackson Jr.","UTA","F",15],["Justin Champagnie","WAS","F",15],["Christian Braun","DEN","G",15],["Daniss Jenkins","DET","G",15],["Duncan Robinson","DET","F",14.9],["Desmond Bane","ORL","G",14.9],["OG Anunoby","NYK","F",14.8],["Rudy Gobert","MIN","C",14.8],["Jrue Holiday","POR","G",14.8],["Daniel Gafford","DAL","F",14.8],["Jaxson Hayes","UTA","C",14.8],["Cam Spencer","MEM","G",14.7],["Derik Queen","NOP","C",14.7],["Derrick White","BOS","G",14.6],["Grayson Allen","CHA","G",14.5],["P.J. Washington","DAL","F",14.5],["Neemias Queta","BOS","C",14.2],["Derrick Jones Jr.","LAC","F",14.1],["Jonathan Kuminga","MIN","F",14.1],["Kris Dunn","LAC","G",14],["Jakob Poeltl","TOR","C",14],["Nicolas Claxton","CHI","F",14],["Precious Achiuwa","SAC","F",14],["Mo Bamba","UTA","C",13.8],["Robert Williams III","POR","C",13.8],["Pelle Larsson","MIA","G",13.7],["Ziaire Williams","LAL","G",13.6],["Aaron Wiggins","ATL","G",13.6],["Brandon Miller","CHA","F",13.6],["Devin Vassell","SAS","G",13.4],["Toumani Camara","POR","F",13.4],["Zach Edey","MEM","C",13.4],["Obi Toppin","IND","F",13.3],["Jalen Williams","OKC","G",13.3],["AJ Dybantsa","WAS","F",13.3],["CJ McCollum","ATL","G",13.2],["Aday Mara","OKC","C",13.2],["Sandro Mamukelashvili","LAL","F",13.1],["Khaman Maluach","PHX","C",13.1],["Josh Hart","NYK","G",13],["Patrick Williams","CHI","F",13],["Payton Pritchard","BOS","G",13],["Matas Buzelis","CHI","F",13],["Danny Wolf","BKN","F",12.9],["Dillon Brooks","PHX","G",12.8],["Kyle Kuzma","MIL","F",12.5],["De'Andre Hunter","SAC","F",12.5],["Cameron Johnson","DEN","F",12.5],["Isaiah Stewart","MEM","F",12.5],["Tari Eason","HOU","F",12.5],["Tristan Da Silva","ORL","F",12.5],["Tyrese Proctor","CLE","G",12.5],["Rui Hachimura","LAC","F",12.4],["Julian Champagnie","SAS","F",12.4],["Klay Thompson","MIA","G",12.3],["Moritz Wagner","BKN","C",12.3],["Collin Murray-Boyles","TOR","F",12.3],["John Collins","DET","F",12.2]];
const ROOKIES = new Set(['Cooper Flagg','Dylan Harper','VJ Edgecombe','Ace Bailey','Cameron Boozer','AJ Dybantsa','Darryn Peterson','Caleb Wilson','Yaxel Lendeborg','Darius Acuff Jr.','Cedric Coward','Jeremiah Fears','Derik Queen','Khaman Maluach','Danny Wolf','Tyrese Proctor','Collin Murray-Boyles']);
const INJ = {'Jayson Tatum':'OUT','Tyrese Haliburton':'OUT','Joel Embiid':'OUT','Ja Morant':'OUT','Jalen Brunson':'GTD','Kyrie Irving':'GTD','Zion Williamson':'GTD','Ausar Thompson':'GTD'};

const PL = RAW.map(([n,t,p,f])=>({n,t,p,f,c:TC[t]||'#1e3258',
  s:n.replace(/ (Jr\.|III|II)$/,'').split(' ').pop().toUpperCase(),
  l5:+(f*(0.8+hsh(n+'l5')*0.62)).toFixed(1),           // FP/G over the last 5 games
  wk:Math.round(f*(1.6+hsh(n+'wk')*1.6)),               // FP this week so far
  fall:Math.round(f*(10+hsh(n+'fa')*3)),                // FP this Fall Run
  td:Math.round(f*(0.55+hsh(n+'td')*1.0)),              // FP today (once games are on)
  yd:Math.round(f*(0.5+hsh(n+'yd')*1.1)),               // FP yesterday
  inj:INJ[n]||null}));
let P = n => PL.find(p=>p.n===n) || {n, s:String(n).split(' ').pop().toUpperCase(), t:'', p:'', f:0, c:'#1e3258', l5:0, wk:0, fall:0, td:0, yd:0};

/* Today's games (sample slate). Teams not listed are off today. */
const SLATE = [['NYK','BOS','7:30 PM'],['PHI','IND','7:00 PM'],['LAL','DEN','10:00 PM'],['DAL','OKC','8:00 PM'],['SAS','HOU','8:30 PM'],['MIA','ATL','7:30 PM'],['POR','PHX','10:00 PM'],['CHI','ORL','7:00 PM'],['NOP','UTA','9:00 PM']];
const GAMES = {}; SLATE.forEach(([a,h,t])=>{ GAMES[a]={opp:h,home:false,time:t}; GAMES[h]={opp:a,home:true,time:t}; });
const isOut = n => P(n).inj==='OUT';
const plays = n => !!n && !isOut(n) && !!GAMES[P(n).t];
const gameTxt = n => { const p=P(n); if(p.inj==='OUT') return 'OUT'; const g=GAMES[p.t]; return g ? `${g.time.replace(' PM','P')} ${g.home?'vs':'@'} ${g.opp}` : 'NO GAME'; };

/* The league (6 teams in the sample) */
const TEAMS = [
  {m:'Dave',   team:'Pixel Pushers',      me:true},
  {m:'Riley',  team:'Fast Break Bandits', ch:'bee'},
  {m:'Jordan', team:'Board Men',          ch:'hoot'},
  {m:'Casey',  team:'Splash Bros Inc',    ch:'bolt'},
  {m:'Morgan', team:'Glass Cleaners',     ch:'karl'},
  {m:'Taylor', team:'Bench Mob',          ch:'jack'},
];
let chOf = t => t.me ? S.active : t.ch;
const MY_START = {act:['Shai Gilgeous-Alexander','Nikola Jokic','Cade Cunningham','Jalen Brunson','Anthony Edwards','Victor Wembanyama','Jayson Tatum','Scottie Barnes'],
                  bench:['Alperen Sengun','Dyson Daniels'], ir:[null]};
if(!S.fl || !Array.isArray(S.fl.act)) S.fl = JSON.parse(JSON.stringify(MY_START));
const myNames = () => [...S.fl.act, ...S.fl.bench, ...S.fl.ir].filter(Boolean);
/* Other teams draft by snake order from the best players left */
const OTHER = {}; (()=>{ const taken=new Set(MY_START.act.concat(MY_START.bench)), seq=[];
  for(let r=0;r<10;r++){ const o=[1,2,3,4,5]; seq.push(...(r%2?o.reverse():o)); }
  PL.filter(p=>!taken.has(p.n)).slice(0,50).forEach((p,k)=>(OTHER[seq[k]] ||= []).push(p.n)); })();
const rosterOf = i => i===0 ? myNames() : OTHER[i];
const rostered = () => new Set([...myNames(), ...Object.values(OTHER).flat()]);

/* Schedule: [week] → pairs of team indexes. Weeks 1–2 final, week 3 now. */
const PAIRS = [[[0,3],[1,4],[2,5]],[[0,4],[1,2],[3,5]],[[0,1],[2,3],[4,5]],[[0,2],[1,5],[3,4]],[[0,5],[1,3],[2,4]]];
const SCORES = {1:[[612,575],[640,533],[598,521]], 2:[[655,601],[671,630],[588,542]]};
let weekPairs = w => PAIRS[(w-1)%PAIRS.length];
let WEEK_START = w => { const d=new Date(2026,9,20+7*(w-1)); return d; };
const fmtD = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric'});

/* This week's match-up, day by day. Today is WED in the sample. */
let TODAY_I = 2;
const DAYS_BASE = [{d:'MON',me:168,op:131},{d:'TUE',me:122,op:171},{d:'WED'},{d:'THU'},{d:'FRI'},{d:'SAT'},{d:'SUN'}];
function days(){ return DAYS_BASE.map((d,i)=>{ const o={...d};
  if(i<TODAY_I){ o.r = d.me>d.op?'W':'L'; }
  if(i===TODAY_I){ o.today=true; if(gs()==='live'){ o.live=true; o.me=myTodayFp(); o.op=74; } }
  return o; }); }
function myTodayFp(){ return S.fl.act.filter(plays).reduce((a,n)=>a+P(n).td,0); }
Object.defineProperties(MU, {me:{configurable:true, get:()=>days().reduce((a,d)=>a+(d.me||0),0)}, opp:{configurable:true, get:()=>days().reduce((a,d)=>a+(d.op||0),0)}});

function record(i){ let w=0,l=0,pf=0; for(const wk of [1,2]) weekPairs(wk).forEach((pr,k)=>{ const j=pr.indexOf(i); if(j<0) return; const sc=SCORES[wk][k]; pf+=sc[j]; if(sc[j]>sc[1-j]) w++; else l++; }); return {w,l,pf}; }
function standings(){ return TEAMS.map((t,i)=>({...t, i, ...record(i)})).sort((a,b)=>b.w-a.w || b.pf-a.pf); }
const ordinal = n => n+(['TH','ST','ND','RD'][(n%100>10&&n%100<14)?0:Math.min(n%10,4)%4]||'TH');

/* Home page "Today / Yesterday" card: your best scorer */
function topScorer(){ const live = gs()==='live';
  const pool = live ? S.fl.act.filter(plays) : myNames();
  const best = pool.map(P).sort((a,b)=>(live?b.td-a.td:b.yd-a.yd))[0] || P('Shai Gilgeous-Alexander');
  return {id:best.n, name:best.n, team:best.t, tc:best.c, fp:`${live?best.td:best.yd} FP`, label: live?'TODAY':'YESTERDAY'}; }

/* Weekly Challenge pool: the Whiteout set (Nov 16), tiers as the commissioner set them */
const WLC_TIERS = [
  ['Luka Doncic','Nikola Jokic','Alperen Sengun','Domantas Sabonis','Cooper Flagg'],
  ['Franz Wagner','Walker Kessler','Austin Reaves','Deni Avdija','Donovan Clingan'],
  ['Isaiah Hartenstein','Jakob Poeltl','Brandin Podziemski','Matas Buzelis','Josh Giddey'],
  ['Christian Braun','Duncan Robinson','Cam Spencer','Grayson Allen','Pelle Larsson'],
  ['Aday Mara','Payton Pritchard','Danny Wolf','Sandro Mamukelashvili','Moritz Wagner']];
const WLC_COST = n => 5 - WLC_TIERS.findIndex(t=>t.includes(n));
const TIER_C = {5:'#ffd93d',4:'#4a9eff',3:'#39ff6a',2:'#b36bff',1:'#f5a623'};
