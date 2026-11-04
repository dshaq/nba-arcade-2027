/* NBA Arcade · test site · the four mode pages.
   The frame (header, Missions bar, footer, pixel font, buttons) stays the same everywhere;
   only the content area takes on each mode's look:
     Fantasy   → top-down adventure (inventory, boss, overworld map)
     Duel      → 1-on-1 fighting game
     Challenge → turn-based RPG party + shop
     Futures   → space shooter route map
   Our own art and layouts in those styles; no characters or logos from the games themselves. */

const LOGO = k => `../logos/jam/${k}.png`;
const heart = (f=1) => `<svg class="hrt" viewBox="0 0 8 7" shape-rendering="crispEdges"><path fill="${f?'#ff3b5c':'#3a2030'}" d="M1 0h2v1h2V0h2v1h1v3H7v1H6v1H5v1H3V6H2V5H1V4H0V1h1z"/><path fill="${f?'#ffb3c0':'#4a2a3a'}" d="M1 1h1v1H1z"/></svg>`;
const gem = `<svg class="gem" viewBox="0 0 6 8" shape-rendering="crispEdges"><path fill="#39ff6a" d="M2 0h2l2 2v4L4 8H2L0 6V2z"/><path fill="#c8ffd8" d="M2 1h1v3H2z"/><path fill="#14a040" d="M4 2h1v4H4z"/></svg>`;

/* ── sample data ──────────────────────────────────────────────────────────── */
const LEAGUES = [
  {id:'arcade', name:"NBA ARCADE '27", team:ME.team, rec:'2-0', place:'3RD'},
  {id:'office', name:'OFFICE HOOPS',   team:'Spreadsheet Slammers', rec:'1-1', place:'5TH'},
];
const ROSTER = [  // 8 active + 2 bench
  {n:'Shai Gilgeous-Alexander', s:'GILGEOUS-ALEXANDER', t:'OKC', p:'G', c:'#007ac1', fpg:52.4, wk:104, next:'TONIGHT 8:00'},
  {n:'Nikola Jokic',            s:'JOKIC',     t:'DEN', p:'C',   c:'#0e2240', fpg:55.1, wk:110, next:'TONIGHT 9:00'},
  {n:'Cade Cunningham',         s:'CUNNINGHAM',t:'DET', p:'G',   c:'#c8102e', fpg:44.0, wk:88,  next:'THU 7:00'},
  {n:'Jalen Brunson',           s:'BRUNSON',   t:'NYK', p:'G',   c:'#006bb6', fpg:40.2, wk:41,  next:'TONIGHT 7:30'},
  {n:'Anthony Edwards',         s:'EDWARDS',   t:'MIN', p:'G-F', c:'#236192', fpg:42.7, wk:85,  next:'THU 8:00'},
  {n:'Victor Wembanyama',       s:'WEMBANYAMA',t:'SAS', p:'C',   c:'#c4ced4', fpg:51.3, wk:51,  next:'FRI 8:30'},
  {n:'Jayson Tatum',            s:'TATUM',     t:'BOS', p:'F',   c:'#007a33', fpg:0,    wk:0,   next:'OUT', out:true},
  {n:'Scottie Barnes',          s:'BARNES',    t:'TOR', p:'F',   c:'#ce1141', fpg:38.9, wk:78,  next:'THU 7:30'},
  {n:'Alperen Sengun',          s:'SENGUN',    t:'HOU', p:'C',   c:'#ce1141', fpg:41.5, wk:37,  next:'THU 8:00'},
  {n:'Dyson Daniels',           s:'DANIELS',   t:'ATL', p:'G',   c:'#e03a3e', fpg:30.1, wk:28,  next:'THU 7:30'},
];
const STANDINGS = [
  {t:'Fast Break Bandits', m:'Riley',  w:2,l:0,pf:612}, {t:'Board Men', m:'Jordan', w:2,l:0,pf:598},
  {t:ME.team, m:ME.name, w:2,l:0,pf:571, me:true}, {t:'Splash Bros Inc', m:'Casey', w:1,l:1,pf:540},
  {t:'Glass Cleaners', m:'Morgan', w:1,l:1,pf:533}, {t:'Bench Mob', m:'Taylor', w:0,l:2,pf:470},
];
const WEEKS = [ // Fall run
  {w:1, r:'W', s:'412–388'}, {w:2, r:'W', s:'455–401'}, {w:3, cur:true}, {w:4},{w:5},{w:6},{w:7},{w:8, boss:true}];
const DAYS = [{d:'MON',r:'W',me:41,op:30},{d:'TUE',r:'L',me:22,op:38},{d:'WED',live:true,me:31,op:18},{d:'THU'},{d:'FRI'},{d:'SAT'},{d:'SUN'}];
const POOL = [
  {n:'Nikola Jokic',t:'DEN',p:'C',c:'#0e2240',$:5,f:55.1},{n:'Shai Gilgeous-Alexander',t:'OKC',p:'G',c:'#007ac1',$:5,f:52.4},
  {n:'Giannis Antetokounmpo',t:'MIL',p:'F',c:'#00471b',$:4,f:50.2},{n:'Anthony Edwards',t:'MIN',p:'G',c:'#236192',$:3,f:42.7},
  {n:'Jalen Brunson',t:'NYK',p:'G',c:'#006bb6',$:3,f:40.2},{n:'Cade Cunningham',t:'DET',p:'G',c:'#c8102e',$:3,f:44.0},
  {n:'Alperen Sengun',t:'HOU',p:'C',c:'#ce1141',$:2,f:41.5},{n:'Stephen Curry',t:'GSW',p:'G',c:'#1d428a',$:2,f:33.3},
  {n:'Tyrese Maxey',t:'PHI',p:'G',c:'#006bb6',$:2,f:39.8},{n:'Scottie Barnes',t:'TOR',p:'F',c:'#ce1141',$:1,f:38.9},
  {n:'Dyson Daniels',t:'ATL',p:'G',c:'#e03a3e',$:1,f:30.1},{n:'Jalen Williams',t:'OKC',p:'F',c:'#007ac1',$:1,f:31.6},
];
const LAST_BATTLE = [{m:'Jordan',fp:142.3,pts:7},{m:'Riley',fp:140.3,pts:3},{m:ME.name,fp:134.3,pts:2,me:true},{m:'Casey',fp:128.5,pts:1},{m:'Morgan',fp:117.5,pts:0}];
const FUT = [ // route map nodes
  {id:'WA', lane:0, row:0, q:'WEST GROUP A', teams:['DEN','HOU','PHX','DAL','UTA'], mine:'HOU', win:'HOU'},
  {id:'WB', lane:1, row:0, q:'WEST GROUP B', teams:['OKC','MIN','LAC','NOP','MEM'], mine:'MIN', win:'OKC'},
  {id:'WC', lane:2, row:0, q:'WEST GROUP C', teams:['SAS','LAL','POR','GSW','SAC'], mine:'SAS'},
  {id:'EA', lane:0, row:1, q:'EAST GROUP A', teams:['DET','TOR','ORL','MIL','BKN'], mine:'DET'},
  {id:'EB', lane:1, row:1, q:'EAST GROUP B', teams:['NYK','CLE','PHI','MIA','IND'], today:true},
  {id:'EC', lane:2, row:1, q:'EAST GROUP C', teams:['BOS','ATL','CHA','CHI','WAS'], soon:true},
  {id:'QF', lane:1, row:2, q:'QUARTERFINALS', lock:true},
  {id:'SF', lane:1, row:3, q:'SEMIFINALS', lock:true},
  {id:'F',  lane:1, row:4, q:'CHAMPIONSHIP · LAS VEGAS', lock:true, final:true},
];

/* ── mode styles (content area only) ─────────────────────────────────────── */
document.head.insertAdjacentHTML('beforeend', `<style>
.mode{display:flex;flex-direction:column;gap:14px}
.mhead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.mhead h1{margin:0;font-size:16px;font-weight:normal;text-shadow:0 3px 0 #000;color:var(--mc)}
.lsw{position:relative}
.lsw>button{display:flex;align-items:center;gap:6px;font-size:7px;padding:8px 10px;border-radius:8px;border:2px solid var(--edge);background:var(--card);cursor:pointer}
.lsw>button b{font-weight:normal;color:var(--t1)}
.ldrop{position:absolute;right:0;top:calc(100% + 6px);z-index:20;width:250px;background:var(--bg2);border:2px solid var(--edge);border-radius:10px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.6)}
.ldrop .cap{font-size:6px;color:var(--t3);padding:6px 8px}
.ldrop a{display:block;padding:10px 8px;border-radius:6px;cursor:pointer;font-size:7px;line-height:1.7}
.ldrop a:hover,.ldrop a.on{background:rgba(57,255,106,.1)}
.ldrop a small{display:block;font-size:6px;color:var(--t2)}
.ldrop a.on::after{content:'✓';float:right;color:var(--green)}
.ldrop .add{border-top:1px solid var(--edge);margin-top:4px;color:var(--gold)}
.mtabs{display:flex;gap:6px}
.mtabs button{flex:1;font-size:6.5px;padding:10px 2px;border-radius:7px;border:2px solid var(--edge);background:var(--card);color:var(--t2);cursor:pointer}
.mtabs button.on{border-color:var(--mc);color:var(--t1);box-shadow:0 0 10px color-mix(in srgb,var(--mc) 35%,transparent)}
.hrt{width:16px;height:14px;image-rendering:pixelated}
.gem{width:9px;height:12px;vertical-align:-2px;margin-right:3px}

/* Fantasy · adventure */
.fz{--mc:var(--green)}
.zbox{position:relative;background:#0a1020;border:3px solid #e8d8a0;border-radius:4px;box-shadow:0 0 0 3px #000,inset 0 0 0 2px #000;padding:12px}
.zbox .zl{position:absolute;top:-9px;left:10px;background:#0a1020;padding:0 6px;font-size:6.5px;color:#e8d8a0}
.boss{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}
.boss .sp canvas{width:96px;height:96px;animation:bob 1.6s ease-in-out infinite}
.boss .bn{font-size:6px;color:#ff8fa0;line-height:1.7}
.boss .bn b{display:block;font-weight:normal;font-size:8px;color:var(--t1);margin-top:3px}
.bhp{height:10px;background:#300;border:2px solid #000;margin:8px 0 4px;position:relative}
.bhp span{position:absolute;inset:0 auto 0 0;background:linear-gradient(180deg,#ff6b81,#c4122f)}
.bsc{display:flex;align-items:baseline;gap:8px;font-size:22px;margin-top:6px}
.bsc b{font-weight:normal;color:var(--green)}.bsc i{font-style:normal;font-size:8px;color:var(--t3)}
.rooms{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.room{border:2px solid #3b4a66;background:#0f1830;border-radius:3px;padding:6px 0;text-align:center;font-size:5.5px;color:var(--t3);line-height:1.8}
.room b{display:block;font-weight:normal;font-size:7px;color:var(--t1)}
.room.w{border-color:var(--green)}.room.l{border-color:#ff3b5c}.room.live{border-color:var(--gold);animation:blink 1.2s steps(2) infinite}
.room.w b{color:var(--green)}.room.l b{color:#ff3b5c}
.dlg{background:#000;border:3px solid #fff;border-radius:6px;padding:12px 14px;font-size:7.5px;line-height:2;min-height:64px}
.dlg .more{float:right;animation:blink .8s steps(2) infinite;color:var(--gold)}
.inv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.slot{position:relative;aspect-ratio:3/4;border:2px solid #3b4a66;border-radius:4px;overflow:hidden;cursor:pointer;background:var(--tc,#1e3258);max-width:100%}
.slot img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.slot .pv{position:absolute;left:0;right:0;bottom:0;font-size:5.5px;text-align:center;padding:4px 0 3px;background:rgba(0,0,0,.75)}
.slot .pos{position:absolute;top:3px;left:3px;font-size:5px;background:#000;padding:2px 3px;border-radius:2px}
.slot.out img{filter:grayscale(1) brightness(.5)}
.slot.out::after{content:'OUT';position:absolute;top:38%;left:0;right:0;text-align:center;font-size:8px;color:#ff3b5c;text-shadow:0 2px 0 #000}
.slot.sel{border-color:transparent}
.slot.sel::before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;
  background:linear-gradient(var(--gold),var(--gold)) 0 0/10px 3px no-repeat,linear-gradient(var(--gold),var(--gold)) 0 0/3px 10px no-repeat,
    linear-gradient(var(--gold),var(--gold)) 100% 0/10px 3px no-repeat,linear-gradient(var(--gold),var(--gold)) 100% 0/3px 10px no-repeat,
    linear-gradient(var(--gold),var(--gold)) 0 100%/10px 3px no-repeat,linear-gradient(var(--gold),var(--gold)) 0 100%/3px 10px no-repeat,
    linear-gradient(var(--gold),var(--gold)) 100% 100%/10px 3px no-repeat,linear-gradient(var(--gold),var(--gold)) 100% 100%/3px 10px no-repeat;animation:blink .7s steps(2) infinite}
.bag{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.bag .slot{opacity:.9}
.desc{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;font-size:7px;line-height:1.9}
.desc .dp{width:56px;height:68px;border:2px solid #e8d8a0;border-radius:3px;overflow:hidden;background:var(--tc)}
.desc .dp img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.desc b{font-weight:normal;color:#e8d8a0}.desc small{color:var(--t2);font-size:6px}
.wmap{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:22px 10px;padding:8px 4px}
.wn{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:6px;border:3px solid #3b4a66;background:#0f1830;font-size:6px;text-align:center;line-height:1.7;max-width:100%}
.wn b{display:block;font-weight:normal;font-size:9px}
.wn.W{border-color:var(--green)}.wn.W b{color:var(--green)}
.wn.cur{border-color:var(--gold);box-shadow:0 0 14px rgba(255,217,61,.4)}
.wn.fog{opacity:.4}
.wn.boss{border-color:#ff3b5c;border-style:dashed}
.wn .me{position:absolute;top:-22px;left:50%;transform:translateX(-50%)}
.wn .me canvas{width:30px;height:30px;animation:bob 1s ease-in-out infinite}
.wn::after{content:'';position:absolute;top:50%;right:-13px;width:10px;height:3px;background:#3b4a66}
.wn:nth-child(4n)::after{display:none}
.regions{display:flex;gap:6px;flex-wrap:wrap}
.regions span{font-size:6px;padding:6px 8px;border-radius:5px;border:2px solid var(--edge);color:var(--t3)}
.regions span.on{border-color:var(--green);color:var(--green)}
.stand{width:100%;border-collapse:collapse;font-size:7px}
.stand td{padding:9px 4px;border-top:1px solid #1e2a44}
.stand tr.me td{color:var(--gold)}
.stand td:first-child{color:var(--t3);width:18px}.stand td.r{text-align:right;color:var(--t2)}
.stand small{display:block;font-size:5.5px;color:var(--t3);margin-top:4px}
.tonight{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.tonight div{flex:none;width:70px;text-align:center;font-size:5.5px;color:var(--t2);line-height:1.7}
.tonight .ph{width:70px;height:80px;border:2px solid #3b4a66;border-radius:4px;overflow:hidden;background:var(--tc)}
.tonight img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}

/* Duel · fighting game */
.dz{--mc:var(--pink)}
.arena{position:relative;border-radius:12px;overflow:hidden;border:3px solid #000;box-shadow:0 0 0 2px var(--pink);background:#1a0820;padding:14px 10px 12px}
.arena::before{content:'';position:absolute;inset:0;background:linear-gradient(115deg,var(--ca) 0 49.6%,#000 49.6% 50.4%,var(--cb) 50.4%);opacity:.45}
.arena::after{content:'';position:absolute;left:0;right:0;bottom:0;height:30%;background:repeating-linear-gradient(90deg,#2a1030 0 18px,#22092a 18px 36px);opacity:.8}
.hpbars{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;margin-bottom:10px}
.hp{height:14px;border:2px solid #fff;background:#600;position:relative;transform:skewX(-14deg)}
.hp span{position:absolute;top:0;bottom:0;background:linear-gradient(180deg,#ffe066,#f5a623)}
.hp.l span{right:0}.hp.r span{left:0}
.timer{font-size:12px;color:var(--gold);text-shadow:0 2px 0 #000;min-width:34px;text-align:center}
.hpn{position:relative;z-index:2;display:flex;justify-content:space-between;font-size:6px;margin:-4px 2px 8px}
.fighters{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:4px}
.ftr{cursor:pointer;text-align:center;transition:transform .15s}
.ftr .fp{height:190px;border:3px solid #000;outline:3px solid #fff;border-radius:4px;overflow:hidden;background:var(--tc)}
.ftr .fp img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.ftr.p1 .fp{outline-color:#3cf;box-shadow:0 0 24px rgba(51,204,255,.6)}
.ftr.dim{opacity:.45}
.ftr .p1tag{display:inline-block;font-size:7px;background:#3cf;color:#001;padding:3px 6px;border-radius:3px;margin-bottom:6px;visibility:hidden}
.ftr.p1 .p1tag{visibility:visible}
.fname{font-size:13px;font-style:italic;color:#ffe066;-webkit-text-stroke:1px #c4122f;text-shadow:3px 3px 0 #000;margin-top:8px;letter-spacing:-.04em}
.fsub{font-size:6px;color:#fff;margin-top:5px}
.vsbig{font-size:26px;font-style:italic;color:#fff;-webkit-text-stroke:2px #c4122f;text-shadow:4px 4px 0 #000;padding-bottom:70px}
.choose{position:relative;z-index:2;text-align:center;font-size:8px;color:#fff;margin-top:12px;animation:blink 1s steps(2) infinite}
.rounds{display:flex;gap:6px;align-items:center;font-size:6px;color:var(--t2)}
.rounds i{width:14px;height:14px;border-radius:50%;border:2px solid #000;background:#333}
.rounds i.w{background:var(--gold)}.rounds i.l{background:#552}
.fightfx{position:absolute;inset:0;z-index:60;display:grid;place-items:center;pointer-events:none}
.fightfx b{font-weight:normal;font-size:30px;font-style:italic;color:#ffe066;-webkit-text-stroke:2px #c4122f;text-shadow:5px 5px 0 #000;animation:slam .9s ease-out forwards}
@keyframes slam{0%{transform:scale(3);opacity:0}25%{transform:scale(1);opacity:1}80%{opacity:1}100%{opacity:0;transform:scale(1.1)}}
.lb{display:grid;gap:6px}
.lb div{display:flex;align-items:center;gap:8px;font-size:7px}
.lb div span:last-child{margin-left:auto;color:var(--gold)}

/* Challenge · party RPG */
.cz{--mc:var(--orange)}
.ffw{background:linear-gradient(180deg,#2c48b8,#101c66);border:3px solid #fff;border-radius:8px;box-shadow:0 0 0 2px #000,inset 0 0 0 1px #000;padding:12px;font-size:7px;line-height:1.8}
.ffw .ft{font-size:6.5px;color:#c8d4ff;margin-bottom:8px;letter-spacing:.08em}
.prow{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:5px 0;cursor:pointer}
.prow .pm{width:34px;height:40px;border:2px solid #fff;border-radius:3px;overflow:hidden;background:var(--tc)}
.prow .pm img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.prow .hpb{height:5px;background:#000;margin-top:4px;border:1px solid #c8d4ff}
.prow .hpb span{display:block;height:100%;background:linear-gradient(90deg,#39ff6a,#b6ff6a)}
.prow small{color:#c8d4ff;font-size:6px}
.prow.empty{color:#7f8fd0;cursor:default}
.gil{color:#ffe066}
.shop{max-height:330px;overflow-y:auto}
.sitem{display:grid;grid-template-columns:14px 1fr auto auto;gap:8px;align-items:center;padding:7px 2px;cursor:pointer;border-radius:4px}
.sitem .cur{visibility:hidden;color:#fff}
.sitem:hover .cur,.sitem.hot .cur{visibility:visible;animation:blink .6s steps(2) infinite}
.sitem.in{color:#7f8fd0}
.sitem.cant{color:#5b6aa8}
.sitem small{font-size:6px;color:#c8d4ff}
.pw{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pw b{font-weight:normal;font-size:12px;color:#ffe066}
.battle .br{display:grid;grid-template-columns:20px 1fr auto auto;gap:8px;padding:5px 0;align-items:center}
.battle .br.me{color:#ffe066}

/* Futures · route map */
.fx{--mc:var(--violet)}
.space{position:relative;border-radius:12px;overflow:hidden;border:2px solid #2a2a60;background:#02020c;min-height:520px}
.space canvas{position:absolute;inset:0;width:100%;height:100%}
.space svg.routes{position:absolute;inset:0;width:100%;height:100%;z-index:1}
.node{position:absolute;z-index:2;transform:translate(-50%,-50%);text-align:center;cursor:pointer;width:84px}
.planet{width:38px;height:38px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 6%,var(--pc) 22%,#000 100%);box-shadow:0 0 14px var(--pc);display:grid;place-items:center}
.planet img{width:24px;height:24px;border-radius:4px}
.node .q{font-size:5px;color:#c8c8ff;margin-top:6px;line-height:1.6}
.node.today .planet{animation:pulse 1.2s ease-in-out infinite;box-shadow:0 0 0 3px var(--gold),0 0 22px var(--gold)}
@keyframes pulse{50%{transform:scale(1.12)}}
.node.lock{opacity:.45;cursor:default}
.node .mark{font-size:6px;margin-top:3px}
.ship{position:absolute;z-index:3;transform:translate(-50%,-50%);width:26px;height:26px;transition:left .8s,top .8s;filter:drop-shadow(0 0 6px #4af)}
.fqbox{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:6px 0 14px}
.fqbox button{border:2px solid var(--edge);border-radius:8px;background:var(--card);padding:6px 2px;cursor:pointer;font-size:6px}
.fqbox button img{width:100%;max-width:56px;border-radius:4px;display:block;margin:0 auto 5px}
.fqbox button.mine{border-color:var(--green)}
</style>`);

/* ── shared bits ─────────────────────────────────────────────────────────── */
const mframe = (cls, title, inner, extraHead='') => topBar() + `<div class="screen"><div class="mode ${cls}"><div class="mhead"><h1>${title}</h1>${extraHead}</div>${inner}</div></div>`;
const face = (team, name, cls='') => img(pimg(team, name), cls);
function typewrite(el, text, speed=22){ if(!el) return; let i=0; el.textContent=''; const t=setInterval(()=>{ el.textContent=text.slice(0,++i); if(i>=text.length){ clearInterval(t); el.insertAdjacentHTML('beforeend','<span class="more">▼</span>'); } }, speed); }

/* ════════════════════════════════════════════════════════════════════════════
   FANTASY · adventure
   ════════════════════════════════════════════════════════════════════════════ */
const FZ = {tab:'battle', sel:null, drop:false};
S.roster ||= ROSTER.map((_,i)=>i);           // order: first 8 active, last 2 bench
S.league ||= 'arcade';
function leagueSwitcher(){
  const L = LEAGUES.find(l=>l.id===S.league)||LEAGUES[0];
  return `<div class="lsw"><button onclick="FZ.drop=!FZ.drop;render()"><b>${L.name}</b> ▾</button>
    ${FZ.drop?`<div class="ldrop"><div class="cap">CHOOSE DIFFERENT LEAGUE</div>
      ${LEAGUES.map(l=>`<a class="${l.id===S.league?'on':''}" onclick="pickLeague('${l.id}')">${l.name}<small>${l.team.toUpperCase()} · ${l.rec} · ${l.place}</small></a>`).join('')}
      <a class="add" onclick="addLeague()">ADD LEAGUE +</a></div>`:''}</div>`;
}
function pickLeague(id){ S.league=id; FZ.drop=false; save(); render(); if(id!=='arcade') say('Preview: every league shows the same sample data'); }
function addLeague(){ FZ.drop=false; render();
  overlay(`<div class="sheet" style="--c:var(--green)"><h3>ADD A LEAGUE</h3><p>Join a friend's league with their invite code, or start your own and invite people.</p>
    <div class="acts"><button class="btn" onclick="this.closest('.ov').remove();say('Preview: joining comes later')">JOIN WITH A CODE</button><button class="btn alt" onclick="this.closest('.ov').remove();say('Preview: creating comes later')">START A LEAGUE</button></div></div>`); }
function fantasy(){
  const tabs = [['battle','MATCH-UP'],['inv','ROSTER'],['map','SEASON'],['league','STANDINGS']];
  let body='';
  if(FZ.tab==='battle') body = fzBattle();
  if(FZ.tab==='inv') body = fzInventory();
  if(FZ.tab==='map') body = fzMap();
  if(FZ.tab==='league') body = fzLeague();
  return mframe('fz','FANTASY', `<div class="mtabs">${tabs.map(([k,l])=>`<button class="${FZ.tab===k?'on':''}" onclick="FZ.tab='${k}';FZ.sel=null;render()">${l}</button>`).join('')}</div>${body}`, leagueSwitcher());
}
function fzBattle(){
  const tot=MU.me+MU.opp, playing = S.roster.slice(0,8).map(i=>ROSTER[i]).filter(p=>/TONIGHT/.test(p.next));
  return `<div class="zbox"><span class="zl">WEEK ${MU.week} · BOSS</span>
      <div class="boss"><div class="sp" id="bossSp"></div><div>
        <div class="bn">${OPP.name.toUpperCase()}'S<b>${OPP.team.toUpperCase()}</b></div>
        <div class="bhp"><span style="width:${100*MU.opp/tot}%"></span></div>
        <div class="bsc"><b>${MU.me}</b><i>YOU</i>–<span>${MU.opp}</span><i>THEM</i></div>
        <div style="display:flex;gap:3px;margin-top:8px">${heart(1)}${heart(0)}${heart(1)}${heart(1)}${heart(1)}</div>
      </div></div></div>
    <div class="zbox"><span class="zl">DAYS</span><div class="rooms">${DAYS.map(d=>`<div class="room ${d.r==='W'?'w':d.r==='L'?'l':''} ${d.live?'live':''}">${d.d}<b>${d.me!=null?d.me+'–'+d.op:'·'}</b>${d.r||(d.live?'LIVE':'')}</div>`).join('')}</div></div>
    <div class="dlg" id="dlg"></div>
    <div class="zbox"><span class="zl">ON THE FLOOR TONIGHT</span><div class="tonight">${playing.map(p=>`<div><div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}</div>${p.s.split('-')[0]}<br>${p.next.replace('TONIGHT ','')}</div>`).join('')}</div></div>
    ${S.done.lineup?'':'<div class="todo" style="justify-content:center" onclick="FZ.tab=\'inv\';render()"><span class="w">!</span>TATUM IS OUT THURSDAY · FIX YOUR ROSTER ▶</div>'}`;
}
function fzInventory(){
  const act=S.roster.slice(0,8), bench=S.roster.slice(8);
  const slot=(i,pos)=>{ const p=ROSTER[i]; return `<div class="slot ${p.out?'out':''} ${FZ.sel===pos?'sel':''}" style="--tc:${p.c}" onclick="fzTap(${pos})">${face(p.t,p.n)}<span class="pos">${p.p}</span><div class="pv">${p.out?'—':p.wk+' FP'}</div></div>`; };
  const sp = FZ.sel!=null ? ROSTER[S.roster[FZ.sel]] : null;
  return `<div class="zbox"><span class="zl">ACTIVE · 8</span><div class="inv">${act.map((i,k)=>slot(i,k)).join('')}</div></div>
    <div class="zbox"><span class="zl">BENCH · 2</span><div class="bag">${bench.map((i,k)=>slot(i,k+8)).join('')}</div></div>
    <div class="dlg">${sp?`<div class="desc"><div class="dp" style="--tc:${sp.c}">${face(sp.t,sp.n)}</div><div><b>${sp.n.toUpperCase()}</b><br>${sp.t} · ${sp.p} · ${sp.out?'<span style="color:#ff3b5c">OUT</span>':sp.fpg.toFixed(1)+' FP/G'}<br><small>NEXT: ${sp.next} · THIS WEEK ${sp.wk} FP</small><br><small style="color:var(--gold)">TAP ANOTHER PLAYER TO SWAP</small></div></div>`
      : 'Tap a player to see them. Tap a second player to swap them between ACTIVE and BENCH.'}</div>`;
}
function fzTap(pos){
  if(FZ.sel==null){ FZ.sel=pos; render(); return; }
  if(FZ.sel===pos){ FZ.sel=null; render(); return; }
  const a=FZ.sel, b=pos; [S.roster[a],S.roster[b]]=[S.roster[b],S.roster[a]]; FZ.sel=null; save();
  const fixed = !S.roster.slice(0,8).some(i=>ROSTER[i].out);
  render(); say('Swapped');
  if(fixed && !S.done.lineup) complete('lineup', document.querySelector('.inv'));
}
function fzMap(){
  return `<div class="regions"><span class="on">FALL RUN</span><span>WINTER</span><span>SPRING</span><span>PLAYOFFS</span></div>
    <div class="zbox"><span class="zl">FALL RUN · 8 WEEKS</span><div class="wmap">${WEEKS.map(w=>`<div class="wn ${w.r||''} ${w.cur?'cur':''} ${!w.r&&!w.cur?'fog':''} ${w.boss?'boss':''}">${w.cur?'<span class="me" id="mapMe"></span>':''}WK<b>${w.w}</b>${w.r?w.r+' '+w.s.split('–')[0]:w.cur?'NOW':w.boss?'FINAL':''}</div>`).join('')}</div></div>
    <div class="dlg">Win weeks to move along the map. Clear the Fall Run to reach the Winter region. Week 8 decides who takes the Fall crown.</div>`;
}
function fzLeague(){
  return `<div class="zbox"><span class="zl">STANDINGS</span><table class="stand">${STANDINGS.map((r,i)=>`<tr class="${r.me?'me':''}"><td>${i+1}</td><td>${r.t.toUpperCase()}<small>${r.m.toUpperCase()}</small></td><td class="r">${r.w}-${r.l}</td><td class="r">${gem}${r.pf}</td></tr>`).join('')}</table></div>`;
}
AFTER.fantasy = ()=>{
  const b=document.getElementById('bossSp'); if(b) b.appendChild(ballerCv('bee',3));
  const m=document.getElementById('mapMe'); if(m) m.appendChild(ballerCv(S.active,1));
  typewrite(document.getElementById('dlg'), `${OPP.name}'s ${OPP.team} block the path! You lead by ${MU.me-MU.opp}. ${S.roster.slice(0,8).map(i=>ROSTER[i]).filter(p=>/TONIGHT/.test(p.next)).length} of your players take the floor tonight.`);
};

/* ════════════════════════════════════════════════════════════════════════════
   DUEL · fighting game
   ════════════════════════════════════════════════════════════════════════════ */
function duel(){
  const pick=S.done.duel, A=DUEL.a, B=DUEL.b;
  const f=(p,side)=>`<div class="ftr ${pick===p.short?'p1':pick?'dim':''}" onclick="duelPick('${p.short}',this)"><span class="p1tag">YOUR PICK</span>
      <div class="fp" style="--tc:${p.tc}">${face(p.team,p.name)}</div><div class="fname">${p.short}</div><div class="fsub">${p.team} · ${side==='a'?'39.8':'42.1'} FP/G</div></div>`;
  return mframe('dz','DUEL', `
    <div class="arena" style="--ca:${A.tc};--cb:${B.tc}">
      <div class="hpbars"><div class="hp l"><span style="width:100%"></span></div><div class="timer">7:00</div><div class="hp r"><span style="width:100%"></span></div></div>
      <div class="hpn"><span>${A.short}</span><span>${DUEL.title.toUpperCase()}</span><span>${B.short}</span></div>
      <div class="fighters">${f(A,'a')}<div class="vsbig">VS</div>${f(B,'b')}</div>
      ${pick?`<div class="choose" style="animation:none;color:var(--gold)">FIGHT STARTS AT TIP-OFF · BARS DRAIN AS POINTS COME IN</div>`:`<div class="choose">CHOOSE YOUR FIGHTER · LOCKS ${DUEL.lock}</div>`}
    </div>
    <div class="panel"><div class="sec">YOUR RECORD</div>
      <div class="rounds">${['w','w','l','w','w','w'].map(r=>`<i class="${r}"></i>`).join('')}<span style="margin-left:8px">5-1 · STREAK 🔥3</span></div></div>
    <div class="panel" style="cursor:pointer;border-color:var(--violet)" onclick="go('futures')"><div class="sec" style="color:var(--violet)">FUTURES · NBA CUP</div>
      ${todoLine('futures',{need:"TODAY'S PICK: EAST GROUP B ▶",done:'TODAY\'S PICK IS IN · OPEN THE MAP ▶'})}</div>
    <div class="panel"><div class="sec">HOT STREAKS</div><div class="lb">
      ${[['Jordan',5],[ME.name,3],['Riley',2],['Casey',1]].map(([n,s],i)=>`<div><span style="color:var(--t3)">${i+1}</span><span>${n.toUpperCase()}</span><span>🔥${s}</span></div>`).join('')}</div></div>`);
}
function duelPick(short, el){
  if(S.done.duel) return;
  const fx=document.createElement('div'); fx.className='fightfx'; fx.innerHTML='<b>FIGHT!</b>'; document.getElementById('app').appendChild(fx);
  setTimeout(()=>fx.remove(), 950);
  complete('duel', el, short);
}

/* ════════════════════════════════════════════════════════════════════════════
   CHALLENGE · party RPG
   ════════════════════════════════════════════════════════════════════════════ */
S.party ||= [];
const BUDGET = 15;
function challenge(){
  const party=S.party.map(i=>POOL[i]), spent=party.reduce((a,p)=>a+p.$,0), left=BUDGET-spent, power=party.reduce((a,p)=>a+p.f,0);
  const rows=[...Array(5)].map((_,k)=>{ const p=party[k]; if(!p) return `<div class="prow empty"><div class="pm"></div><div>— EMPTY —</div><span></span></div>`;
    return `<div class="prow" onclick="partyDrop(${k})"><div class="pm" style="--tc:${p.c}">${face(p.t,p.n)}</div><div>${p.n.split(' ').slice(-1)[0].toUpperCase()} <small>${p.t} · ${p.p}</small><div class="hpb"><span style="width:${Math.min(100,p.f/56*100)}%"></span></div></div><span class="gil">$${p.$}</span></div>`; }).join('');
  const ready = party.length===5 && left>=0;
  return mframe('cz','CHALLENGE', `
    <div class="ffw"><div class="ft">THIS WEEK · ${WLC.pool} · 5 FOR $${BUDGET}</div>
      <div class="pw"><span>GOLD <b class="gil">$${left}</b></span><span>PARTY POWER <b>${power.toFixed(1)}</b></span></div></div>
    <div class="ffw"><div class="ft">PARTY ${party.length}/5 · TAP TO REMOVE</div>${rows}
      <div style="text-align:center;margin-top:10px">${S.done.wlc&&ready?'<span class="todo ok" style="justify-content:center"><span class="w">✓</span>ENTRY SAVED · BATTLE BEGINS MON 7 PM</span>':`<button class="btn" ${ready?'':'disabled style="opacity:.45"'} onclick="partySave(this)">${ready?'SAVE ENTRY ▶':party.length<5?`PICK ${5-party.length} MORE`:'OVER BUDGET'}</button>`}</div></div>
    <div class="ffw"><div class="ft">SHOP · TAP TO ADD</div><div class="shop">${POOL.map((p,i)=>{ const inP=S.party.includes(i), cant=!inP&&(p.$>left||party.length>=5);
      return `<div class="sitem ${inP?'in':''} ${cant?'cant':''}" onclick="partyAdd(${i})"><span class="cur">▶</span><span>${p.n.toUpperCase()}<br><small>${p.t} · ${p.p} · ${p.f} FP/G</small></span><span>${inP?'IN PARTY':''}</span><span class="gil">$${p.$}</span></div>`; }).join('')}</div></div>
    <div class="ffw battle"><div class="ft">LAST WEEK'S BATTLE · ROOKIE CLASS</div>${LAST_BATTLE.map((r,i)=>`<div class="br ${r.me?'me':''}"><span>${i+1}</span><span>${r.m.toUpperCase()}</span><span>${r.fp} FP/G</span><span class="gil">+${r.pts}</span></div>`).join('')}</div>`);
}
function partyAdd(i){ const party=S.party, spent=party.reduce((a,k)=>a+POOL[k].$,0);
  if(party.includes(i)){ partyDrop(party.indexOf(i)); return; }
  if(party.length>=5){ say('Party is full · tap a member to remove'); return; }
  if(POOL[i].$>BUDGET-spent){ say('Not enough gold'); return; }
  party.push(i); if(S.done.wlc) delete S.done.wlc; save(); render(); }
function partyDrop(k){ S.party.splice(k,1); save(); render(); }
function partySave(el){ if(S.party.length!==5) return; if(S.done.wlc){ render(); return; } complete('wlc', el); }

/* ════════════════════════════════════════════════════════════════════════════
   FUTURES · route map
   ════════════════════════════════════════════════════════════════════════════ */
S.fut ||= {};
const nodeXY = n => ({x: [18,50,82][n.lane], y: 9 + n.row*20});
function futures(){
  const routes = [];
  const QF=nodeXY(FUT.find(x=>x.id==='QF'));
  const segCol = n => n.win ? (n.mine===n.win?'#39ff6a':'#ff3b5c') : '#3a3a80';
  FUT.filter(n=>n.row===0).forEach(n=>{ const a=nodeXY(n), e=nodeXY(FUT.find(x=>x.row===1&&x.lane===n.lane));
    routes.push(`<line x1="${a.x}" y1="${a.y}" x2="${e.x}" y2="${e.y}" stroke="${segCol(n)}" stroke-width=".6" stroke-dasharray="${n.win?'0':'1.2 1'}"/>`); });
  FUT.filter(n=>n.row===1).forEach(n=>{ const a=nodeXY(n);
    routes.push(`<line x1="${a.x}" y1="${a.y}" x2="${QF.x}" y2="${QF.y}" stroke="${segCol(n)}" stroke-width=".6" stroke-dasharray="1.2 1"/>`); });
  routes.push(`<line x1="50" y1="${nodeXY(FUT[6]).y}" x2="50" y2="${nodeXY(FUT[8]).y}" stroke="#3a3a80" stroke-width=".5" stroke-dasharray="1.2 1"/>`);
  const nodes = FUT.map(n=>{ const {x,y}=nodeXY(n); const mine = n.today ? S.fut[n.id] : n.mine;
    const col = n.win ? (n.mine===n.win?'#39ff6a':'#ff3b5c') : n.today ? '#ffd93d' : n.lock ? '#555' : '#b36bff';
    const mark = n.win ? (n.mine===n.win?'<span style="color:#39ff6a">✓ HIT</span>':`<span style="color:#ff3b5c">✗ ${n.win} WON</span>`) : n.today ? (mine?`<span style="color:var(--gold)">PICKED</span>`:'<span style="color:var(--gold)">PICK TODAY</span>') : n.soon?'<span style="color:#888">TOMORROW</span>':n.lock?'':'<span style="color:#c8c8ff">PENDING</span>';
    return `<div class="node ${n.today?'today':''} ${n.lock||n.soon?'lock':''}" style="left:${x}%;top:${y}%;--pc:${col}" onclick="futNode('${n.id}')"><div class="planet">${mine?`<img src="${LOGO(mine)}" alt="">`:n.final?'🏆':''}</div><div class="q">${n.q}</div><div class="mark">${mark}</div></div>`; }).join('');
  const t=nodeXY(FUT.find(n=>n.today));
  return mframe('fx','FUTURES', `<div class="space"><canvas id="stars"></canvas><svg class="routes" viewBox="0 0 100 100" preserveAspectRatio="none">${routes.join('')}</svg>${nodes}
      <svg class="ship" style="left:${t.x}%;top:${t.y-9}%" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#dfe8ff" d="M7 1h2v4h1v2h4v2h-4v2H9v2H7v-2H6V9H2V7h4V5h1z"/><path fill="#4af" d="M7 3h2v3H7z"/><path fill="#ff6b3d" d="M7 13h2v2H7z"/></svg>
    </div>
    <div class="panel"><div class="sec">HOW IT WORKS</div><div class="reward">One NBA Cup question a day. Each correct pick lights your route green. Every pick is final the moment you tap.</div></div>`,
    `<span style="font-size:6px;color:var(--t2)">NBA CUP · 2 OF 2 HIT</span>`);
}
function futNode(id){
  const n=FUT.find(x=>x.id===id); if(n.lock||n.soon){ say(n.soon?'Opens tomorrow at 12 AM ET':'Unlocks when the knockouts are set'); return; }
  const mine = n.today ? S.fut[id] : n.mine, done = !n.today || !!mine;
  const o=overlay(`<div class="sheet" style="--c:var(--violet)"><h3>${n.q}</h3><p>${n.today?(mine?'Your pick is locked in.':'Who wins the group? Your pick is final the moment you tap.'):n.win?`Winner: ${n.win}.`:'Waiting on the games.'}</p>
    <div class="fqbox">${n.teams.map(t=>`<button class="${t===mine?'mine':''}" data-t="${t}" ${done?'disabled':''}><img src="${LOGO(t)}" alt="">${t}</button>`).join('')}</div></div>`);
  o.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ if(S.fut[id]) return; S.fut[id]=b.dataset.t; save(); o.remove(); complete('futures', document.querySelector('.node.today')); });
}
AFTER.futures = ()=>{
  const cv=document.getElementById('stars'); if(!cv) return; const c=cv.getContext('2d');
  const W=cv.width=cv.clientWidth*devicePixelRatio, H=cv.height=cv.clientHeight*devicePixelRatio;
  const st=[...Array(120)].map(()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()}));
  (function f(){ if(!cv.isConnected) return; c.fillStyle='rgba(2,2,12,.55)'; c.fillRect(0,0,W,H);
    for(const s of st){ s.z-=.004; if(s.z<=.02){ s.x=Math.random()*2-1; s.y=Math.random()*2-1; s.z=1; }
      const px=W/2+s.x/s.z*W*.25, py=H/2+s.y/s.z*H*.25, r=(1-s.z)*2.2*devicePixelRatio;
      c.fillStyle=`rgba(200,210,255,${1-s.z})`; c.fillRect(px,py,r,r); }
    requestAnimationFrame(f); })();
};

Object.assign(SCREENS, {fantasy, duel, wlc:challenge, futures});
