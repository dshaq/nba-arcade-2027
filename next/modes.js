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

/* ── sample data (the rest lives in data.js) ─────────────────────────────── */
const LEAGUES = [
  {id:'arcade', name:"NBA ARCADE '27", team:ME.team, rec:'2-0', place:'2ND'},
  {id:'office', name:'OFFICE HOOPS',   team:'Spreadsheet Slammers', rec:'1-1', place:'5TH'},
];
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
.ftr .fp img.logo,.yf .ph img.logo{object-fit:contain;padding:14%}
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

document.head.insertAdjacentHTML('beforeend', `<style>
.av{display:inline-grid;place-items:center;width:28px;height:28px;flex:none}
.av canvas{width:28px;height:28px}
.mtabs.t5 button{font-size:5.5px;padding:10px 0}
.qf{display:flex;border:2px solid var(--edge);border-radius:8px;overflow:hidden}
.qf button{font-size:6px;padding:7px 9px;border:none;background:var(--card);color:var(--t3);cursor:pointer}
.qf button.on{background:var(--mc);color:#022}
/* fantasy: match-up */
.bhp.two{background:transparent;display:flex}
.bhp.two i{display:block;height:100%;background:linear-gradient(180deg,#8dffab,#1fbf4a)}
.bhp.two span{position:static;display:block;height:100%}
.boss>div{min-width:0}.bsc{font-size:17px;gap:6px;flex-wrap:wrap}
.bsc b,.bsc span{font-weight:normal;color:var(--t1)}
.room b{font-size:5.5px;line-height:1.7}.bsc .up{color:var(--green)}
.room.tdy{border-color:var(--gold)}
.dlg{cursor:pointer}
/* fantasy: select panel (also used by Waivers) */
.selp{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center;background:#0a1020;border:3px solid #e8d8a0;border-radius:6px;padding:8px 10px;box-shadow:0 0 0 3px #000;min-height:76px}
.selp b,.selp small{display:block}
.selp .ph{width:52px;height:58px;border:2px solid #000;outline:2px solid #e8d8a0;border-radius:3px;overflow:hidden;background:var(--tc)}
.selp .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.selp .tx{min-width:0;display:flex;flex-direction:column;gap:4px}
.selp b{font-weight:normal;font-size:8px;color:#e8d8a0;line-height:1.5}
.selp small{font-size:6px;color:var(--t2);line-height:1.6}
.selp small.on{color:var(--green)}.selp small.out{color:#ff3b5c}.selp small.gtd{color:var(--gold)}
.selp.empty{border-style:dashed}
.selp.empty .q{width:52px;height:52px;border:2px solid #3b4a66;border-radius:6px;display:grid;place-items:center;font-size:26px;color:#3b4a66}
.selp.empty b{color:var(--gold)}
.recs{display:flex;flex-direction:column;gap:6px}
.recs .cap,.qcap{font-size:6px;color:#e8d8a0;letter-spacing:.08em}
.qcap{margin-bottom:-6px}
.fz.quick{gap:10px}
.rec{display:grid;grid-template-columns:30px auto 30px 1fr auto;gap:7px;align-items:center;background:#1a1408;border:2px solid var(--gold);border-radius:6px;padding:5px 8px}
.rec .mini{width:30px;height:32px}
.rec.open{border-color:var(--blue);background:#081430}.rec.open .go{background:var(--blue)}
.rec .ar{font-size:10px;color:var(--gold)}
.rec .why{font-size:6px;line-height:1.7;color:var(--t1)}
.rec .go{padding:8px 8px}
.mini{width:34px;height:38px;border:2px solid #000;border-radius:3px;overflow:hidden;background:var(--tc,#1e3258);display:grid;place-items:center;font-size:7px;flex:none}
.mini img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.mini.irb{background:#2a1040;color:var(--violet);border-color:var(--violet)}
.okline{font-size:7px;color:var(--green);text-align:center;padding:10px;border:2px solid var(--green);border-radius:6px;background:rgba(57,255,106,.06)}
.qgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.qt{text-align:center;cursor:pointer;min-width:0}
.qt .ph{position:relative;aspect-ratio:4/3;border:2px solid #3b4a66;border-radius:5px;overflow:hidden;background:var(--tc,#0f1830);display:grid;place-items:center;font-size:12px;color:#3b4a66}
.qt .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.qt .nm{font-size:6px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qt .u{font-size:5px;color:var(--green);margin-top:4px;white-space:nowrap}
.qt.idle .u{color:var(--t3)}.qt.idle .ph img{filter:grayscale(.7) brightness(.75)}
.qt.out .u{color:#ff3b5c}.qt.out .ph img{filter:grayscale(1) brightness(.5)}
.qt .inj{position:absolute;top:3px;right:3px;font-size:5px;padding:2px 3px;border-radius:2px;background:var(--gold);color:#1a1200}
.qt .inj.o{background:#ff3b5c;color:#fff}
.qt.empty .ph{border-style:dashed}
.qt.sel .ph{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),0 0 12px rgba(255,217,61,.5);animation:blink .8s steps(2) infinite}
/* fantasy: full roster (like the live Rosters page) */
.chips{display:grid;grid-template-columns:30px 1fr 30px;gap:6px;align-items:center}
.chips .ar{height:30px;border-radius:50%;border:2px solid var(--edge);background:var(--card);cursor:pointer;font-size:12px}
.chips .cs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.chips .cs button{flex:none;font-size:6px;padding:8px 10px;border-radius:14px;border:2px solid var(--edge);background:var(--card);color:var(--t2);cursor:pointer;white-space:nowrap}
.chips .cs button.on{background:var(--blue);border-color:var(--blue);color:#001}
.rhead{font-size:6px;color:var(--t3);line-height:1.7}
.dstrip{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.dstrip button{font-size:5px;padding:6px 0;border-radius:6px;border:2px solid var(--edge);background:var(--card);color:var(--t3);cursor:pointer;line-height:1.6}
.dstrip b{display:block;font-weight:normal;font-size:10px;color:var(--t1)}
.dstrip small{display:block;font-size:4.5px;color:var(--t2)}
.dstrip button.on{border-color:var(--blue);background:rgba(74,158,255,.12)}
.rlist{border:2px solid var(--edge);border-radius:10px;overflow:hidden;background:var(--card)}
.rsec{display:flex;justify-content:space-between;align-items:center;font-size:6.5px;color:var(--green);padding:10px 10px;border-top:1px solid var(--edge)}
.rsec:first-child{border-top:none}.rsec>span:last-child:not(:first-child){color:var(--t3)}
.fpt{display:flex;border:2px solid var(--edge);border-radius:6px;overflow:hidden}
.fpt button{font-size:5px;padding:4px 6px;border:none;background:none;color:var(--t3);cursor:pointer}.fpt button.on{background:var(--blue);color:#001}
.rr{display:grid;grid-template-columns:52px 1fr auto auto;gap:8px;align-items:center;padding:0 8px 0 0;border-top:1px solid var(--edge);min-height:58px}
.rr.sel{background:rgba(255,217,61,.08)}
.rp{position:relative;width:52px;height:58px;overflow:hidden;background:var(--tc,#0f1830)}
.rp img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.rp .lv{position:absolute;top:3px;left:3px;font-size:4.5px;background:#ff3b5c;color:#fff;padding:2px 3px;border-radius:2px}
.rt{min-width:0}.rt b{display:block;font-weight:normal;font-size:7px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rt b i{font-style:normal;font-size:5px;padding:1px 3px;border-radius:2px;background:var(--gold);color:#1a1200;vertical-align:1px}.rt b i.o{background:#ff3b5c;color:#fff}
.rt small{display:block;font-size:5.5px;color:var(--t3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf{text-align:right;font-size:5.5px;color:var(--gold);white-space:nowrap}.rf b{font-weight:normal;font-size:11px}.rf small{display:block;color:var(--t3);margin-top:3px}
.sw{width:30px;height:30px;border-radius:6px;border:2px solid var(--blue);background:transparent;color:var(--blue);cursor:pointer;font-size:12px}
.sw.on{background:var(--gold);border-color:var(--gold);color:#1a1200}
.rr.empty .rt b{color:var(--t3)}
/* waivers */
.wtop{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.adds{display:flex;align-items:center;gap:6px;font-size:6px;color:var(--t3)}
.adds span{display:flex;gap:3px}.adds i{width:10px;height:10px;border-radius:2px;border:2px solid var(--blue)}.adds i.on{background:var(--blue)}
.srep{font-size:6px;padding:8px 10px;border-radius:8px;border:2px solid var(--gold);background:transparent;color:var(--gold);cursor:pointer}
.srep b{font-weight:normal;background:var(--gold);color:#1a1200;border-radius:6px;padding:1px 5px;margin-left:4px}
.srep.blu{border-color:var(--blue);color:var(--blue)}
.wbtns{display:flex;gap:8px;margin-top:2px}
.wb{flex:1 1 0;white-space:nowrap;font-size:7px;padding:9px 6px;border-radius:7px;border:2px solid var(--blue);background:transparent;color:var(--blue);cursor:pointer}
.wb.sc{border-color:var(--gold);color:var(--gold)}.wb.sc.on{background:rgba(255,217,61,.12)}
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.tt{text-align:center;cursor:pointer;min-width:0}
.tt .ph{position:relative;aspect-ratio:1/1;border:2px solid #3b4a66;border-radius:6px;overflow:hidden;background:var(--tc)}
.tt .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.tt .rk{position:absolute;top:4px;left:4px;font-size:7px;background:#000;color:var(--gold);padding:3px 4px;border-radius:3px}
.tt .scd{position:absolute;top:3px;right:3px;font-size:10px}
.tt .nm{font-size:7px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt .l5{font-size:5.5px;color:var(--t2);margin-top:4px}.tt .l5 b{font-weight:normal;color:var(--green);font-size:8px}
.tt .u{font-size:5px;color:var(--t3);margin-top:4px}
.tt.sel .ph{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold)}
.wpanel{margin:0;display:flex;flex-direction:column;gap:10px}
.wbtnrow{display:flex;gap:8px}
.wsearch{display:grid;grid-template-columns:1fr auto;gap:8px}
.wsearch input,.wsearch select{font-family:var(--px);font-size:7px;padding:11px 10px;border-radius:8px;border:2px solid var(--edge);background:var(--card);color:var(--t1);min-width:0}
.wtog{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.seg{display:flex;border:2px solid var(--edge);border-radius:8px;overflow:hidden;background:var(--card)}
.seg button{font-size:6px;padding:8px 9px;border:none;background:none;color:var(--t3);cursor:pointer;white-space:nowrap}
.seg button.on{background:var(--blue);color:#001}
.wfil{display:flex;align-items:center;gap:8px;font-size:6px;color:var(--t3)}
.wfil button{font-size:6px;padding:7px 9px;border-radius:12px;border:2px solid var(--fc);background:transparent;color:var(--fc);cursor:pointer}
.wfil button.on{background:var(--fc);color:#000}
.wsq{width:38px;height:36px;border-radius:7px;border:2px solid var(--blue);background:transparent;color:var(--blue);cursor:pointer;font-size:11px;line-height:1;display:grid;place-items:center;padding:3px 0}
.wsq small{font-size:4.5px}
.wsq.sc{border-color:var(--gold);color:var(--gold)}.wsq.sc.on{background:rgba(255,217,61,.12)}
#wvl .rr{grid-template-columns:52px 1fr auto auto auto}
.ownd{grid-column:span 2;font-size:5px;color:var(--t3)}
.dlist{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow-y:auto}
.dlist button{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;text-align:left;font-size:7px;padding:6px 8px;border-radius:8px;border:2px solid var(--edge);background:var(--card);cursor:pointer;line-height:1.5}
.dlist button small{display:block;font-size:5.5px;color:var(--t3)}
.dlist button b{font-weight:normal;font-size:6px;color:#ff3b5c;border:2px solid #ff3b5c;border-radius:5px;padding:5px 6px}
.tx div{display:grid;grid-template-columns:40px 1fr;gap:4px 8px;font-size:7px;padding:9px 0;border-top:1px solid var(--edge)}
.tx div small{grid-column:2;font-size:5.5px;color:var(--t3)}
.tx span{font-size:6px}.tx .a{color:var(--green)}.tx .d{color:#ff3b5c}
/* schedule + standings (like the live pages) */
.wkn{display:grid;grid-template-columns:38px 1fr 38px;gap:8px;align-items:center;text-align:center;font-size:5.5px;color:var(--t3)}
.wkn b{display:block;font-weight:normal;font-size:8px;color:var(--t1);margin-top:5px}
.wkn button{height:32px;border-radius:7px;border:2px solid var(--edge);background:var(--card);cursor:pointer;font-size:9px}
.lbox{border:3px solid var(--blue);border-radius:12px;background:#0b1430;padding:12px 10px;box-shadow:0 0 18px rgba(74,158,255,.18)}
.lbox h3{margin:0;text-align:center;font-weight:normal;font-size:11px;color:var(--orange);text-shadow:0 2px 0 #000}
.lbox .sub{text-align:center;font-size:5.5px;color:var(--t3);margin:6px 0 12px}
.lbox .foot{text-align:center;font-size:5px;color:var(--t3);margin-top:12px}
.mrow{display:grid;grid-template-columns:1fr auto auto auto 1fr;gap:8px;align-items:center;padding:9px 6px;border-radius:8px;cursor:pointer;border:2px solid transparent}
.mrow.me{border-color:var(--blue);background:rgba(74,158,255,.1)}
.mrow .side{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.mrow .side.r{justify-content:flex-end;text-align:right}
.mrow .side small{flex-basis:100%;font-size:4.5px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mrow .wl{font-size:6px}
.mrow>b{font-weight:normal;font-size:10px}.mrow>b.hi{color:var(--green)}
.mrow>i{font-style:normal;font-size:5px;color:var(--t3)}
.shead,.srow{display:grid;grid-template-columns:30px 28px 1fr 34px 46px;gap:6px;align-items:center}
.shead{font-size:5px;color:var(--t3);padding:0 6px 6px}
.shead span:nth-child(2){grid-column:span 2}.shead span:nth-child(3){text-align:left}
.srow{font-size:6.5px;padding:8px 6px;border-radius:8px;border:2px solid transparent}
.srow .tn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t2)}
.srow b{font-weight:normal;font-size:9px;text-align:right}
.srow.top,.srow.top .tn{color:var(--orange)}
.srow.me{border-color:var(--blue);background:rgba(74,158,255,.1)}
/* VS splash */
.vss{position:absolute;inset:0;z-index:55;overflow:hidden;cursor:pointer;background:#000}
.vss .half{position:absolute;left:0;right:0;height:50%;display:flex;align-items:center;gap:14px;padding:0 22px}
.vss .half.a{top:0;background:linear-gradient(160deg,#0c6b2c,#03210f);animation:inL .45s cubic-bezier(.2,.9,.3,1.2) both;clip-path:polygon(0 0,100% 0,100% 82%,0 100%)}
.vss .half.b{bottom:0;justify-content:flex-end;text-align:right;background:linear-gradient(200deg,#8a1020,#22050a);animation:inR .45s .12s cubic-bezier(.2,.9,.3,1.2) both;clip-path:polygon(0 18%,100% 0,100% 100%,0 100%)}
.vss canvas{width:120px;height:120px;filter:drop-shadow(0 6px 0 rgba(0,0,0,.5))}
.vss b{display:block;font-weight:normal;font-size:12px;line-height:1.5;text-shadow:0 3px 0 #000}
.vss small{display:block;font-size:7px;color:#ffe9a0;margin-top:8px}
.vss .vsx{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:46px;font-style:italic;color:#ffe066;-webkit-text-stroke:2px #c4122f;text-shadow:5px 5px 0 #000;animation:slamIn .5s .45s both}
.vss .vwk{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 18px);text-align:center;font-size:7px;color:#fff;letter-spacing:.14em;animation:fade .3s .7s both}
.vss .vtap{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);text-align:center;font-size:7px;color:#fff;animation:blink 1s steps(2) 1s infinite}
.vss.out{animation:fade .35s reverse forwards}
@keyframes inL{from{transform:translateX(-100%)}}@keyframes inR{from{transform:translateX(100%)}}
@keyframes slamIn{0%{transform:translate(-50%,-50%) scale(3);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}

/* Duel */
.seg2{display:flex;gap:6px;background:var(--card);border:2px solid var(--edge);border-radius:10px;padding:4px}
.seg2 button{position:relative;flex:1;font-size:6.5px;padding:10px 4px;border-radius:7px;border:none;background:none;color:var(--t3);cursor:pointer}
.seg2 button.on{background:var(--violet);color:#fff}
.seg2 .dot{top:-4px;right:-2px}
.streak{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 14px;border-radius:10px;border:3px solid #000;background:linear-gradient(90deg,#ff5a1f,#ffb020);box-shadow:0 0 0 2px var(--gold),0 0 20px rgba(255,140,30,.45)}
.streak .fl{font-size:28px;animation:bob 1s ease-in-out infinite}
.streak small{display:block;font-size:6.5px;color:#3a1200}
.streak b{display:block;font-weight:normal;font-size:22px;color:#fff;text-shadow:3px 3px 0 #7a2000;margin-top:4px}
.streak .best{font-size:6px;color:#3a1200;text-align:right;line-height:1.8}
.arena .dtitle{position:relative;z-index:2;text-align:center;font-size:9px;color:#fff;text-shadow:0 2px 0 #000;margin-bottom:4px}
.arena .dsub{position:relative;z-index:2;text-align:center;font-size:5.5px;color:#ffe066;margin-bottom:10px}
.prog{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;background:rgba(0,0,0,.55);border:2px solid #fff;border-radius:6px;padding:8px}
.prog .ps{display:flex;flex-direction:column;gap:5px}.prog .ps.r{align-items:flex-end}
.prog .pc{font-size:6px;color:#fff}.prog .pc b{font-weight:normal;font-size:12px;color:#ffe066;margin:0 3px}
.prog .ic{display:flex;flex-wrap:wrap;gap:3px}.prog .ps.r .ic{justify-content:flex-end}
.prog .ic svg{width:14px;height:14px}
.prog .ic svg.e{opacity:.22}
.prog .ic svg.n{animation:pop .5s}
.alert{display:flex;align-items:center;justify-content:center;gap:8px;font-size:7.5px;padding:10px;border-radius:8px;border:2px solid var(--red);background:rgba(233,69,96,.1);color:#fff}
.alert .w{width:16px;height:16px;display:grid;place-items:center;background:var(--red);font-size:8px;clip-path:polygon(50% 0,100% 100%,0 100%);padding-top:4px;animation:blink 1.2s steps(2) infinite}
.alert.ok{border-color:var(--green);background:rgba(57,255,106,.08);color:var(--green)}
.alert.live{border-color:#ff3b5c;color:#ff8fa0}.alert.live::before{content:'●';animation:blink 1s steps(2) infinite}
.ydr{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.yf{text-align:center;border:3px solid transparent;border-radius:10px;padding:10px 6px;position:relative}
.yf.win{border-color:var(--gold);background:rgba(255,217,61,.06)}
.yf .wt{position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:5.5px;background:var(--gold);color:#1a1200;padding:3px 6px;border-radius:4px;white-space:nowrap}
.yf .ph{width:64px;height:70px;margin:0 auto;border:2px solid #000;border-radius:4px;overflow:hidden;background:var(--tc)}
.yf .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.yf:not(.win) .ph img{filter:grayscale(1) brightness(.6)}
.yf b{display:block;font-weight:normal;font-size:7px;margin-top:7px}
.yf .v{font-size:14px;color:var(--gold);margin-top:5px}.yf:not(.win) .v{color:var(--t3)}
.yf small{display:block;font-size:5px;color:var(--t3);margin-top:3px}
.ydr>i{font-style:normal;color:var(--violet);font-size:11px}
.pbar2{display:flex;height:8px;border-radius:4px;overflow:hidden;margin:12px 0 5px}.pbar2 i{background:var(--pink)}.pbar2 span{flex:1;background:#4adfff}
.pbl{display:flex;justify-content:space-between;font-size:5px;color:var(--t3)}
.ydres{text-align:center;font-size:7px;margin:12px 0 10px;color:var(--green)}
.who{font-size:6px;color:var(--t3)}.who div{display:flex;gap:10px;margin-top:8px}.who span{text-align:center;font-size:5px;color:var(--t2)}
.who canvas{width:30px;height:30px;display:block;margin:0 auto 4px}
.dtab{border:2px solid var(--edge);border-radius:10px;overflow:hidden;background:var(--card)}
.dtab .h,.dtab .r{display:grid;grid-template-columns:22px 28px 1fr 44px 44px 46px;gap:6px;align-items:center;padding:8px}
.dtab .h{font-size:4.5px;color:var(--t3);line-height:1.6}
.dtab .h span:nth-child(2){grid-column:span 2}
.dtab .r{font-size:6.5px;border-top:1px solid var(--edge)}.dtab .r span:nth-child(n+4){text-align:center}
.dtab .r.me{background:rgba(57,255,106,.06);color:var(--green)}
.dtab .r .cs{color:var(--gold)}
.dtab .cap{font-size:5px;color:var(--t3);padding:8px;line-height:1.7}

/* Challenge (like the live Weekly Line-up Challenge) */
.cz{--mc:var(--orange)}
.wban{border:3px solid #5b8cff;border-radius:12px;padding:14px 12px;text-align:center;background:linear-gradient(180deg,#2a2a8a,#5a2a5a 60%,#8a3a3a);box-shadow:0 0 18px rgba(91,140,255,.3)}
.wban .th{font-size:10px;color:#ffd93d;line-height:1.6;text-shadow:0 2px 0 #000}.wban .th b{display:block;font-weight:normal;color:#fff;font-size:12px}
.wban .dt{font-size:5.5px;color:#dfe4ff;margin:8px 0 10px}
.wban .lk{font-size:7.5px;color:var(--green);border:2px solid var(--green);border-radius:6px;padding:9px;line-height:1.7;background:rgba(0,0,0,.35)}
.wban .sb{font-size:6px;color:#fff;line-height:1.8;margin-top:10px}
.ctabs{display:flex;border-bottom:1px solid var(--edge)}
.ctabs button{flex:1;font-size:6px;padding:10px 4px;background:none;border:none;border-bottom:3px solid transparent;color:var(--t3);cursor:pointer}
.ctabs button.on{color:var(--teal);border-bottom-color:var(--teal)}
.cpv{display:grid;grid-template-columns:86px 1fr;gap:12px;align-items:center;border:3px solid var(--edge);border-radius:12px;background:var(--card);padding:10px;min-height:112px}
.cpv .ph{position:relative;width:86px;height:96px;border:3px solid var(--tcol,#3b4a66);border-radius:8px;overflow:hidden;background:var(--tc,#0f1830);display:grid;place-items:center;font-size:30px;color:#3b4a66}
.cpv .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.cpv .ph .tag{position:absolute;top:3px;left:3px;font-size:6px;background:var(--tcol);color:#000;padding:2px 4px;border-radius:3px}
.cpv b{display:block;font-weight:normal;font-size:8px;color:var(--gold);line-height:1.5}
.cpv small{display:block;font-size:6px;color:var(--t2);line-height:1.7;margin-top:3px}
.cpv .go{margin-top:8px}
.tierg{display:grid;grid-template-columns:34px repeat(5,1fr);gap:5px;align-items:stretch}
.tierg .tg{display:grid;place-items:center;border-radius:6px;font-size:8px;color:#000;background:var(--tcol);border:2px solid #000}
.ct{position:relative;border:2px solid var(--tcol);border-radius:6px;overflow:hidden;background:#0d1530;cursor:pointer;min-width:0}
.ct .ph{aspect-ratio:4/5;background:var(--tc)}
.ct .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.ct .nm{font-size:4.5px;text-align:center;padding:4px 1px 1px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct .tm{font-size:4px;text-align:center;color:var(--t3);padding-bottom:4px}
.ct.in{box-shadow:0 0 0 2px var(--green),0 0 10px rgba(57,255,106,.5)}
.ct.in::after{content:'✓';position:absolute;top:3px;right:3px;width:13px;height:13px;border-radius:50%;background:var(--green);color:#022;font-size:7px;display:grid;place-items:center}
.ct.cur{outline:2px solid #fff;outline-offset:1px}
.ct.cant{opacity:.35}
.cbar{position:sticky;bottom:-24px;z-index:4;display:grid;grid-template-columns:1fr 1fr auto auto;gap:8px;align-items:center;background:rgba(2,12,24,.96);border:2px solid var(--edge);border-radius:12px;padding:9px 10px}
.cbar .l{font-size:5px;color:var(--t3)}.cbar .v{font-size:11px;margin-top:5px}
.cbar button{font-size:6px;line-height:1.6;padding:8px 9px;border-radius:7px;border:2px solid var(--edge);background:var(--card);color:var(--t2);cursor:pointer}
.cbar button.save.ready{background:var(--gold);color:#1a1200;border-color:#000;box-shadow:0 3px 0 #000}
.cbar button:disabled{opacity:.4;cursor:default}
.lcard{border:2px solid var(--edge);border-radius:10px;background:var(--card);padding:10px}
.lcard .lh{display:flex;justify-content:space-between;align-items:baseline;font-size:5.5px;color:var(--t3);margin-bottom:8px}
.lcard .lh b{font-weight:normal;font-size:14px;color:var(--teal)}.lcard .lh b small{font-size:5px;color:var(--t3);margin-left:3px}
.l5c{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.lc{position:relative;border:2px solid var(--tcol);border-radius:6px;overflow:hidden;background:#0d1530;text-align:center}
.lc .ph{aspect-ratio:4/5;background:var(--tc)}.lc .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.lc .tag{position:absolute;top:3px;left:3px;font-size:5px;background:var(--tcol);color:#000;padding:2px 3px;border-radius:2px}
.lc .nm{font-size:4.5px;padding:4px 1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc .fp{font-size:9px;color:var(--gold);padding:3px 0 1px}.lc small{display:block;font-size:4px;color:var(--t3);padding-bottom:4px}
.ment{display:flex;align-items:center;gap:8px;font-size:7px;margin:12px 0 6px}.ment .rk{margin-left:auto;font-size:6px;color:var(--t3)}
.hid{border:2px solid var(--edge);border-radius:8px;padding:12px;font-size:6px;color:var(--teal);background:var(--card)}
.hid.no{color:var(--t3)}
.note{font-size:5.5px;color:var(--t3);line-height:1.8}
.wch{border:2px solid var(--edge);border-radius:12px;background:var(--card);padding:10px}
.wch .hd{display:flex;justify-content:space-between;font-size:6px;color:var(--gold);margin-bottom:6px}.wch .hd span:last-child{color:var(--t3)}
.wch svg{width:100%;height:auto;display:block}
.wch text{font-family:var(--px);font-size:5px;fill:var(--t3)}
.wch .lg{display:flex;flex-wrap:wrap;gap:8px 12px;justify-content:center;font-size:5.5px;margin-top:6px}.wch .lg i{display:inline-block;width:10px;height:3px;margin-right:4px;vertical-align:2px}
.ctab{border:2px solid var(--edge);border-radius:10px;overflow:hidden;background:var(--card)}
.ctab .h,.ctab .r{display:grid;grid-template-columns:22px 28px 1fr 40px 40px 40px;gap:6px;align-items:center;padding:8px}
.ctab .h{font-size:4.5px;color:var(--t3);line-height:1.6}.ctab .h span:nth-child(2){grid-column:span 2}
.ctab .r{font-size:6.5px;border-top:1px solid var(--edge)}.ctab .r span:nth-child(n+4){text-align:center}
.ctab .r .fp{color:var(--teal);font-size:9px}
.ctab .r.me{background:rgba(57,255,106,.06);color:var(--green)}
</style>`);

/* ── shared bits ─────────────────────────────────────────────────────────── */
const mframe = (cls, title, inner, extraHead='') => topBar() + `<div class="screen"><div class="mode ${cls}"><div class="mhead"><h1>${title}</h1>${extraHead}</div>${inner}</div></div>`;
const face = (team, name, cls='') => img(pimg(team, name), cls);
function typewrite(el, text, speed=22){ if(!el) return; clearInterval(el._t); let i=0; el.textContent=''; const t=el._t=setInterval(()=>{ el.textContent=text.slice(0,++i); if(i>=text.length){ clearInterval(t); el.insertAdjacentHTML('beforeend','<span class="more">▼</span>'); } }, speed); }

/* ════════════════════════════════════════════════════════════════════════════
   DUEL · fighting game look, live-site flow (CURRENT · STANDINGS, Daily · Futures)
   ════════════════════════════════════════════════════════════════════════════ */
const DZ = {tab:'cur', sec:'daily', st:'daily'};
const STREAK = {cur:3, best:5};
const DUEL_STAT = {label:'3-POINTERS MADE', short:'3PM', a:3, b:4};   // a/b = makes so far once games are on
const YDUEL = {title:'TUESDAY BUCKETS', stat:'PTS', win:{n:'Scottie Barnes',v:27}, lose:{n:'Alperen Sengun',v:22}, pct:62, mine:'Scottie Barnes', right:[['Riley','bee'],['Jordan','hoot'],['Casey','bolt']]};
const DSTAND = [['Jordan','hoot',61,6,5],['Dave',null,58,5,3],['Riley','bee',55,4,2],['Casey','bolt',50,3,1],['Morgan','karl',44,2,0],['Taylor','jack',40,2,0]];
const FSTAND = [['Riley','bee',3,4],['Dave',null,2,2],['Jordan','hoot',2,3],['Casey','bolt',1,3],['Morgan','karl',1,4],['Taylor','jack',0,2]];
let futuresToday = () => FUT.some(n=>n.today);
const threeIc = (cls='') => `<svg class="${cls}" viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="#f08020" d="M2 0h4v1h1v1h1v4H7v1H6v1H2V7H1V6H0V2h1V1h1z"/><path fill="#000" d="M4 0h1v8H4zM0 4h8v1H0z" opacity=".55"/><path fill="#ffc080" d="M2 1h1v1H2z"/></svg>`;
function duelProg(){
  const live = gs()==='live';
  const per = DUEL_STAT.per||1;   // one icon per make (or per 5 points for bigger stats)
  const side = (p,n,r) => { const k=Math.floor((live?n:0)/per), slots=Math.min(12,Math.max(6,k)); return `<div class="ps ${r?'r':''}"><div class="pc">${r?'':p.short}<b>${live?n:0}</b>${r?p.short:''}</div><div class="ic">${[...Array(slots)].map((_,j)=>threeIc(j<k?'':'e')).join('')}</div></div>`; };
  return `<div class="prog">${side(DUEL.a,DUEL_STAT.a,false)}${side(DUEL.b,DUEL_STAT.b,true)}</div>`;
}
function duelDaily(){
  const pick=S.done.duel, A=DUEL.a, B=DUEL.b, live=gs()==='live';
  const f=(p)=>{ const fp=P(p.name); return `<div class="ftr ${pick===p.short?'p1':pick?'dim':''}" onclick="duelPick('${p.short}',this)"><span class="p1tag">YOUR PICK</span>
      <div class="fp" style="--tc:${p.tc}">${p.img?img(p.img,'logo'):face(p.team,p.name)}</div><div class="fname">${p.short}</div><div class="fsub">${p.sub||`${p.team} · ${fp.f} FP/G`}</div></div>`; };
  const alert = !pick ? `<div class="alert"><span class="w">!</span>PICK BY ${DUEL.lock} ET</div>`
    : live ? `<div class="alert live">DUEL IS LIVE · ${DUEL_STAT.short} UPDATE AS THEY HAPPEN</div>` : `<div class="alert ok">✓ DUEL BEGINS AT ${DUEL.lock} ET</div>`;
  const y=YDUEL, w=y.win.p||P(y.win.n), l=y.lose.p||P(y.lose.n), gotIt = y.mine===y.win.n;
  return `<div class="streak"><span class="fl">🔥</span><div><small>CURRENT STREAK</small><b>${STREAK.cur} IN A ROW</b></div><div class="best">BEST<br>${STREAK.best}</div></div>
    ${alert}
    <div class="arena" id="arena" style="--ca:${A.tc};--cb:${B.tc}">
      <div class="dtitle">${DUEL.title.toUpperCase()}</div><div class="dsub">${DUEL.q||'WHO MAKES MORE 3-POINTERS TODAY?'}</div>
      <div class="fighters">${f(A)}<div class="vsbig">VS</div>${f(B)}</div>
      ${duelProg()}
      ${pick?'':`<div class="choose">CHOOSE YOUR FIGHTER</div>`}
    </div>
    <div class="panel"><div class="sec">YESTERDAY'S DUEL · ${y.title}</div>
      <div class="ydr"><div class="yf win"><span class="wt">🏆 WINNER</span><div class="ph" style="--tc:${w.c}">${w.img?img(w.img,'logo'):face(w.t,w.n)}</div><b>${w.s}</b><div class="v">${y.win.v}</div><small>${y.stat}</small></div><i>VS</i>
        <div class="yf"><div class="ph" style="--tc:${l.c}">${l.img?img(l.img,'logo'):face(l.t,l.n)}</div><b>${l.s}</b><div class="v">${y.lose.v}</div><small>${y.stat}</small></div></div>
      <div class="pbar2"><i style="width:${y.pct}%"></i><span></span></div><div class="pbl"><span>${y.pct}% PICKED</span><span>${100-y.pct}% PICKED</span></div>
      <div class="ydres" style="color:${gotIt?'var(--green)':'#ff3b5c'}">${gotIt?`✓ YOU CALLED IT · STREAK 🔥${STREAK.cur}`:'✗ NOT THIS TIME · STREAK RESET'}</div>
      <div class="who">GOT IT RIGHT · ${y.right.length+(gotIt?1:0)}<div>${(gotIt?[[ME.name,S.active]]:[]).concat(y.right).map(([n,c])=>`<span><span class="av" data-ch="${c}"></span>${n}</span>`).join('')}</div></div></div>`;
}
function duel(){
  const futNeed = futuresToday() && !S.done.futures;
  let body;
  if(DZ.tab==='stand'){
    const daily = DZ.st==='daily', rows = daily ? DSTAND : FSTAND;
    body = `<div class="seg2">${[['daily','⚡ DAILY DUEL'],['fut','🔮 FUTURES DUEL']].map(([k,l])=>`<button class="${DZ.st===k?'on':''}" onclick="DZ.st='${k}';render()">${l}</button>`).join('')}</div>
      <div class="dtab"><div class="cap">${daily?'RANKED BY CURRENT STREAK · TIEBREAK: % CORRECT':'RANKED BY CORRECT PICKS · NBA CUP'}</div>
      <div class="h"><span></span><span>USER</span><span>${daily?'% CORRECT':'CORRECT'}</span><span>${daily?'ALL-TIME STREAK':'PICKS'}</span><span>${daily?'CURRENT STREAK':'HIT %'}</span></div>
      ${rows.map((r,k)=>{ const me=r[1]==null; return `<div class="r ${me?'me':''}"><span>${k+1}</span><span class="av" data-ch="${me?S.active:r[1]}"></span><span>${r[0]}</span>
        ${daily?`<span>${r[2]==='—'?'—':r[2]+'%'}</span><span>${r[3]}</span><span class="cs">${r[4]?'🔥 '+r[4]:'—'}</span>`:`<span>${r[2]}</span><span>${r[3]}</span><span class="cs">${Math.round(100*r[2]/r[3])}%</span>`}</div>`; }).join('')}</div>`;
  } else {
    body = `<div class="seg2"><button class="${DZ.sec==='daily'?'on':''}" onclick="DZ.sec='daily';render()">⚡ DAILY DUEL${S.done.duel?'':'<span class="dot"></span>'}</button><button class="${DZ.sec==='futures'?'on':''}" onclick="DZ.sec='futures';render()">🔮 FUTURES DUEL${futNeed?'<span class="dot"></span>':''}</button></div>
      ${DZ.sec==='futures' ? futuresBody() : duelDaily()}`;
  }
  return mframe('dz','DUEL', `<div class="ctabs">${[['cur','CURRENT'],['stand','STANDINGS']].map(([k,l])=>`<button class="${DZ.tab===k?'on':''}" onclick="DZ.tab='${k}';render()">${l}</button>`).join('')}</div>${body}`);
}
function duelPick(short, el){
  if(S.done.duel) return;
  const fx=document.createElement('div'); fx.className='fightfx'; fx.innerHTML='<b>FIGHT!</b>'; document.getElementById('app').appendChild(fx);
  setTimeout(()=>fx.remove(), 950);
  complete('duel', el, short);
  // Futures Duel today? The Daily Duel dissolves and the Futures map takes its place.
  if(futuresToday() && !S.done.futures) setTimeout(()=>{ if(cur!=='duel') return; say('Next up: your Futures Duel'); dissolve(()=>{ DZ.sec='futures'; render(); }, '#02020c'); }, 1500);
}

/* ════════════════════════════════════════════════════════════════════════════
   CHALLENGE · same look and flow as the live Weekly Line-up Challenge
   ════════════════════════════════════════════════════════════════════════════ */
const BUDGET = 15;
const CZ = {tab:'pick', sel:null};
if(!Array.isArray(S.party) || S.party.some(x=>typeof x!=='string')) S.party = [];
const C_LINEUPS = [
  ['Jordan','hoot',['Luka Doncic','Franz Wagner','Isaiah Hartenstein','Duncan Robinson','Aday Mara']],
  ['Riley','bee',['Alperen Sengun','Austin Reaves','Brandin Podziemski','Christian Braun','Danny Wolf']],
  ['Casey','bolt',['Cooper Flagg','Walker Kessler','Matas Buzelis','Grayson Allen','Moritz Wagner']],
  ['Morgan','karl',['Domantas Sabonis','Donovan Clingan','Jakob Poeltl','Pelle Larsson','Sandro Mamukelashvili']]];
const CSTAND = [['Jordan','hoot',7,7,'50%'],['Riley','bee',3,3,'0%'],['Dave',null,3,3,'0%'],['Casey','bolt',2,2,'0%'],['Morgan','karl',0,0,'—'],['Taylor','jack',0,0,'—']];
let wkFpg = n => +(P(n).f*(0.86+hsh(n+'wl')*0.32)).toFixed(1);
let myEntry = () => S.party.length===5 ? S.party : ['Nikola Jokic','Deni Avdija','Josh Giddey','Cam Spencer','Payton Pritchard'];
function cEntries(){ const all=[[ME.name,null,myEntry()], ...C_LINEUPS].map(([m,ch,picks])=>({m,ch,picks,me:!ch,tot:+picks.reduce((a,n)=>a+wkFpg(n),0).toFixed(1)}));
  all.sort((a,b)=>b.tot-a.tot); all.forEach((e,k)=>e.rank=k+1); return all; }
let daysLeft = () => 6-TODAY_I;
const spent = () => S.party.reduce((a,n)=>a+WLC_COST(n),0);
function lineupCard(picks, live, mine){
  const tot = live ? picks.reduce((a,n)=>a+wkFpg(n),0).toFixed(1) : '—';
  return `<div class="lcard"><div class="lh"><span>5 PLAYERS · $${picks.reduce((a,n)=>a+WLC_COST(n),0)} SPENT</span><b>${tot}<small>FP/G</small></b></div>
    <div class="l5c">${picks.slice().sort((a,b)=>WLC_COST(b)-WLC_COST(a)).map(n=>{ const p=P(n), c=WLC_COST(n); return `<div class="lc" style="--tcol:${TIER_C[c]}"><div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}</div><span class="tag">$${c}</span><div class="nm">${p.s}</div><div class="fp">${live?wkFpg(n):p.f}</div><small>${live?'THIS WEEK':'SEASON'} · FP/G</small></div>`; }).join('')}</div></div>`;
}
function wlcChart(){
  const E=cEntries(), cols=['#ff5fbf','#ffd93d','#39ff6a','#4adfff','#b36bff'], W=320, H=120, L=24, R=10, T=10, B=18, n=TODAY_I+1;
  const vals = E.map(e=>[...Array(n)].map((_,d)=>+(e.tot*(0.55+0.45*(d+1)/n)+(hsh(e.m+d)-.5)*14).toFixed(1)));
  const all=vals.flat(), lo=Math.floor(Math.min(...all)/25)*25, hi=Math.ceil(Math.max(...all)/25)*25;
  const x=i=>L+i*(W-L-R)/6, y=v=>T+(1-(v-lo)/Math.max(1,hi-lo))*(H-T-B);
  const grid=[...Array((hi-lo)/25+1)].map((_,i)=>{ const v=lo+i*25; return `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#1e3258" stroke-width=".6"/><text x="${L-4}" y="${y(v)+2}" text-anchor="end">${v}</text>`; }).join('');
  const xl=['MON','TUE','WED','THU','FRI','SAT','SUN'].map((t,i)=>`<text x="${x(i)}" y="${H-5}" text-anchor="middle" ${i===TODAY_I?'style="fill:#ffd93d"':''}>${t}</text>`).join('');
  const lines=vals.map((v,k)=>`<polyline fill="none" stroke="${cols[k]}" stroke-width="${E[k].me?2.2:1.4}" points="${v.map((q,i)=>x(i)+','+y(q)).join(' ')}"/><circle cx="${x(n-1)}" cy="${y(v[n-1])}" r="2.4" fill="${cols[k]}"/>`).join('');
  return `<div class="wch"><div class="hd"><span>${WLC.pool} · FP/G</span><span>🔒 PICKS LOCKED</span></div><svg viewBox="0 0 ${W} ${H}">${grid}${xl}${lines}</svg>
    <div class="lg">${E.map((e,k)=>`<span style="color:${e.me?'var(--green)':'var(--t2)'}"><i style="background:${cols[k]}"></i>${e.m}</span>`).join('')}</div></div>`;
}
function challenge(){
  const live = S.wphase==='live', saved = !!S.wsaved || live, tab = CZ.tab;
  const banner = live ? wlcChart() : `<div class="wban"><div class="th">THIS WEEK'S THEME:<b>${WLC.pool}</b></div><div class="dt">NOV 16 – NOV 22 · LOCKS MON 7:00 PM ET</div>
    <div class="lk">MAKE PICKS BEFORE<br>MONDAY'S FIRST TIP-OFF</div><div class="sb">Choose the players you think will average the most Fantasy Points (FP) per game this week!</div></div>`;
  const tabs = `<div class="ctabs">${[['pick',saved?"CURRENT WEEK'S LINEUPS":'PICK PLAYERS'],['stand','STANDINGS']].map(([k,l])=>`<button class="${tab===k?'on':''}" onclick="CZ.tab='${k}';render()">${l}</button>`).join('')}</div>`;
  let body='';
  if(tab==='stand'){
    body = `<div class="ctab"><div class="h"><span></span><span>STANDINGS</span><span>FALL PTS</span><span>TOTAL PTS</span><span>WIN %</span></div>
      ${CSTAND.map((r,k)=>{ const me=r[1]==null; return `<div class="r ${me?'me':''}"><span>${k+1}</span><span class="av" data-ch="${me?S.active:r[1]}"></span><span>${r[0]}</span><span class="fp">${r[2]}</span><span>${r[3]}</span><span>${r[4]}</span></div>`; }).join('')}</div>
      <div class="note">Each week: 1st place earns 3 points, 2nd earns 2, 3rd earns 1.</div>`;
  } else if(live){
    body = cEntries().map(e=>`<div class="ment"><span class="av" data-ch="${e.me?S.active:e.ch}"></span><span style="color:${e.me?'var(--green)':'var(--t1)'}">${e.m}</span><span class="rk">${ordinal(e.rank)}</span></div>${lineupCard(e.picks,true)}`).join('');
  } else if(saved){
    body = `<div class="qcap" style="color:var(--t3);margin:0">YOUR LINEUP</div>${lineupCard(S.party,false,true)}
      <div class="note">Your lineup is final. The only change allowed: one swap of a player listed OUT for a same-tier player whose game hasn't started.</div>
      <div class="qcap" style="color:var(--t3);margin:6px 0 0">ALL ENTRIES · PICKS REVEALED AT LOCK</div>
      ${C_LINEUPS.map(([m,ch,picks],k)=>{ const has = LIVE.on ? picks.length : k!==3; return `<div class="ment"><span class="av" data-ch="${ch}"></span>${m}</div><div class="hid ${has?'':'no'}">${has?`LINEUP SAVED · ${LIVE.on?picks.length:5} PLAYERS · HIDDEN UNTIL LOCK`:'NO LINEUP YET'}</div>`; }).join('')}`;
  } else {
    const left=BUDGET-spent(), sel=CZ.sel;
    let pv;
    if(!sel) pv = `<div class="cpv"><div class="ph">?</div><div><b>SELECT YOUR PLAYER</b><small>TAP ANY PORTRAIT BELOW</small></div></div>`;
    else { const p=P(sel), c=WLC_COST(sel), inL=S.party.includes(sel), can=!inL && c<=left && S.party.length<5;
      pv = `<div class="cpv"><div class="ph" style="--tc:${p.c};--tcol:${TIER_C[c]}">${face(p.t,p.n)}<span class="tag">$${c}</span></div><div><b>${p.n.toUpperCase()}</b><small>${p.t} · ${p.p} · ${p.f} FP/G THIS SEASON</small><small>LAST 5 GAMES: ${p.l5} FP/G</small><small style="color:${p.inj==='OUT'?'#ff3b5c':'var(--t2)'}">${p.inj?p.inj+' · ':''}${GAMES[p.t]?'PLAYS TODAY':'NO GAME TODAY'}</small>
        ${inL?`<button class="go" style="background:transparent;color:#ff3b5c;border-color:#ff3b5c;box-shadow:none" onclick="cToggle()">REMOVE FROM LINEUP</button>`:can?`<button class="go" onclick="cToggle()">ADD TO LINEUP · $${c}</button>`:`<button class="go" disabled style="opacity:.45">${S.party.length>=5?'LINEUP IS FULL':'NOT ENOUGH SALARY'}</button>`}</div></div>`; }
    const grid = WLC_TIERS.map((row,k)=>{ const c=5-k; return `<div class="tg" style="--tcol:${TIER_C[c]}">$${c}</div>` + row.map(n=>{ const p=P(n), inL=S.party.includes(n), cant=!inL&&(c>left||S.party.length>=5);
      return `<div class="ct ${inL?'in':''} ${sel===n?'cur':''} ${cant?'cant':''}" style="--tcol:${TIER_C[c]}" onclick="CZ.sel='${n.replace(/'/g,"\\'")}';render()"><div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}</div><div class="nm">${p.s}</div><div class="tm">${p.t} · ${p.p}</div></div>`; }).join(''); }).join('');
    const ready = S.party.length===5 && left>=0;
    body = `${pv}<div class="tierg">${grid}</div>
      <div class="cbar"><div><div class="l">SALARY REMAINING</div><div class="v" style="color:var(--teal)">$${left}</div></div><div><div class="l">PLAYERS SELECTED</div><div class="v">${S.party.length} / 5</div></div>
        <button ${S.party.length?'':'disabled'} onclick="S.party=[];CZ.sel=null;save();render()">START<br>OVER</button><button class="save ${ready?'ready':''}" ${ready?'':'disabled'} onclick="cSave(this)">SAVE<br>LINEUP</button></div>`;
  }
  return mframe('cz','CHALLENGE', banner + tabs + body);
}
function cToggle(){ const n=CZ.sel, i=S.party.indexOf(n); if(i>=0) S.party.splice(i,1); else S.party.push(n); save(); render(); }
function cSave(el){
  const o=overlay(`<div class="sheet" style="--c:var(--orange)"><h3>SAVE THIS LINEUP?</h3><p>Once saved, your picks are final for the week. The only change allowed: one swap of a player listed OUT.</p>
    <div class="acts"><button class="btn alt" id="no">NOT YET</button><button class="btn" id="yes">SAVE LINEUP</button></div></div>`);
  o.querySelector('#no').onclick=()=>o.remove();
  o.querySelector('#yes').onclick=()=>{ o.remove(); S.wsaved=true; CZ.sel=null; save(); if(!S.done.wlc) complete('wlc', el); else render(); say('Lineup saved'); };
}

/* Home-page line for the Challenge box once the week is under way */
function wlcStatus(){ const me=cEntries().find(e=>e.me); const d=daysLeft(); return `${ordinal(me.rank)} PLACE · ${d>1?d+' DAYS REMAIN':d===1?'1 DAY LEFT':'LAST DAY'}`; }

/* ════════════════════════════════════════════════════════════════════════════
   FUTURES · route map
   ════════════════════════════════════════════════════════════════════════════ */
S.fut ||= {};
const nodeXY = n => ({x: [18,50,82][n.lane], y: 9 + n.row*20});
function futuresBody(){
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
  return `<div class="fx" style="display:flex;flex-direction:column;gap:14px"><div class="space"><canvas id="stars"></canvas><svg class="routes" viewBox="0 0 100 100" preserveAspectRatio="none">${routes.join('')}</svg>${nodes}
      <svg class="ship" style="left:${t.x}%;top:${t.y-9}%" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#dfe8ff" d="M7 1h2v4h1v2h4v2h-4v2H9v2H7v-2H6V9H2V7h4V5h1z"/><path fill="#4af" d="M7 3h2v3H7z"/><path fill="#ff6b3d" d="M7 13h2v2H7z"/></svg>
    </div>
    <div class="panel"><div class="sec">HOW IT WORKS</div><div class="reward">One NBA Cup question a day. Each correct pick lights your route green. Every pick is final the moment you tap.</div></div></div>`;
}
function futNode(id){
  const n=FUT.find(x=>x.id===id); if(n.lock||n.soon){ say(n.soon?'Opens tomorrow at 12 AM ET':'Unlocks when the knockouts are set'); return; }
  const mine = n.today ? S.fut[id] : n.mine, done = !n.today || !!mine;
  const o=overlay(`<div class="sheet" style="--c:var(--violet)"><h3>${n.q}</h3><p>${n.today?(mine?'Your pick is locked in.':'Who wins the group? Your pick is final the moment you tap.'):n.win?`Winner: ${n.win}.`:'Waiting on the games.'}</p>
    <div class="fqbox">${n.teams.map(t=>`<button class="${t===mine?'mine':''}" data-t="${t}" ${done?'disabled':''}><img src="${LOGO(t)}" alt="">${t}</button>`).join('')}</div></div>`);
  o.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ if(S.fut[id]) return; S.fut[id]=b.dataset.t; save(); o.remove(); complete('futures', document.querySelector('.node.today')); });
}
AFTER.duel = ()=>{
  const cv=document.getElementById('stars'); if(!cv) return; const c=cv.getContext('2d');
  const W=cv.width=cv.clientWidth*devicePixelRatio, H=cv.height=cv.clientHeight*devicePixelRatio;
  const st=[...Array(120)].map(()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()}));
  (function f(){ if(!cv.isConnected) return; c.fillStyle='rgba(2,2,12,.55)'; c.fillRect(0,0,W,H);
    for(const s of st){ s.z-=.004; if(s.z<=.02){ s.x=Math.random()*2-1; s.y=Math.random()*2-1; s.z=1; }
      const px=W/2+s.x/s.z*W*.25, py=H/2+s.y/s.z*H*.25, r=(1-s.z)*2.2*devicePixelRatio;
      c.fillStyle=`rgba(200,210,255,${1-s.z})`; c.fillRect(px,py,r,r); }
    requestAnimationFrame(f); })();
};

function futures(){ DZ.tab='cur'; DZ.sec='futures'; return duel(); }
AFTER.futures = ()=>AFTER.duel();
Object.assign(SCREENS, {duel, wlc:challenge, futures});
