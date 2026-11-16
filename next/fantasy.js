/* NBA Arcade · test site · FANTASY
   Tabs: MATCH-UP · ROSTER · WAIVERS · SCHEDULE · STANDINGS.
   Roster and Waivers each have QUICK (default, one screen) and FULL (like the live site). */

const FZ = {tab:'roster', sel:null, drop:false, view:0, day:TODAY_I, fpm:'WEEK', wk:MU.week, wsel:null, wq:'', wteam:'', wall:false, wsort:'fp', whide:false, wrook:false};
S.rq ||= 'quick'; S.wq ||= 'quick';
S.wv ||= {used:1, scouted:['Saddiq Bey'], log:[{t:'ADD',n:'Dyson Daniels',d:'Nov 3'},{t:'DROP',n:'Klay Thompson',d:'Nov 3'}]};

/* ── Battle text: (1) a highlight from yesterday, (2) the score, (3) who plays today ──
   {hi} {hifp} = your top scorer yesterday · {ohi} {ohifp} = theirs · {opp} = opponent
   {d} = points between you · {n} = your players with a game today · {first} {time} = first to tip off */
const BATTLE = {
  highlight: [
    '{hi} went off for {hifp} FP yesterday.',
    'Yesterday belonged to {hi}: {hifp} FP.',
    '{hi} put up {hifp} last night. Somebody check the rim.',
    'Highlight of the night: {hi}, {hifp} FP, zero mercy.',
    '{hi} logged {hifp} FP last night. The legend grows.',
    'Quiet night for most of the squad, but {hi} still dropped {hifp}.',
    '{hi} carried the team yesterday with {hifp} FP.',
    '{ohi} hit you with {ohifp} FP yesterday. Don\'t let it happen twice.',
    '{opp}\'s {ohi} scored {ohifp} last night. Respect, but get back on D.',
    '{hi} ({hifp} FP) outscored {opp}\'s best player yesterday.',
  ],
  scoreLead: [
    'You lead {opp} by {d}. Keep the pressure on.',
    'Up {d}. {opp} is checking the waiver wire.',
    '{d} points of daylight between you and {opp}.',
    'You\'re ahead by {d}. Don\'t take your foot off the gas.',
  ],
  scoreClose: [
    'It\'s tight: {d} points between you and {opp}.',
    'One big night flips this. Only {d} in it.',
    'Neck and neck with {opp}. {d} points separate you.',
  ],
  scoreTrail: [
    '{opp} leads by {d}. Very catchable.',
    'Down {d} to {opp}. Time for a comeback story.',
    '{opp} is up {d}. Your bench is restless.',
    'You trail by {d}. Plenty of week left.',
  ],
  today: [
    '{n} of your players take the floor today.',
    '{n} players suit up for you today. {first} tips off first at {time}.',
    '{n} of yours are playing today. Set your line-up before tip-off.',
    '{n} active players have games today.',
  ],
  todayNone: ['Nobody on your team plays today. Rest up.'],
};
let btI = 0;
function battleText(){
  const pick = (arr,k) => arr[Math.floor(hsh(k+btI)*arr.length)];
  const mine = myNames().map(P).sort((a,b)=>b.yd-a.yd)[0], theirs = OTHER[1].map(P).sort((a,b)=>b.yd-a.yd)[0];
  const d = Math.abs(MU.me-MU.opp), lead = MU.me-MU.opp;
  const playing = S.fl.act.filter(plays).map(P).sort((a,b)=>GAMES[a.t].time.localeCompare(GAMES[b.t].time));
  const sc = d<=20 ? BATTLE.scoreClose : lead>0 ? BATTLE.scoreLead : BATTLE.scoreTrail;
  const fill = s => s.replace(/{hi}/g, mine.s.charAt(0)+mine.s.slice(1).toLowerCase()).replace(/{hifp}/g, mine.yd)
    .replace(/{ohi}/g, theirs.s.charAt(0)+theirs.s.slice(1).toLowerCase()).replace(/{ohifp}/g, theirs.yd)
    .replace(/{opp}/g, OPP.name).replace(/{d}/g, d).replace(/{n}/g, playing.length)
    .replace(/{first}/g, playing[0] ? playing[0].s.charAt(0)+playing[0].s.slice(1).toLowerCase() : '').replace(/{time}/g, playing[0] ? GAMES[playing[0].t].time : '');
  return [pick(BATTLE.highlight,'h'), pick(sc,'s'), playing.length ? pick(BATTLE.today,'t') : BATTLE.todayNone[0]].map(fill).join(' ');
}
function nextLine(){ btI++; typewrite(document.getElementById('dlg'), battleText()); }

/* ── Roster moves ─────────────────────────────────────────────────────────── */
const getSlot = pos => ({a:S.fl.act, b:S.fl.bench, i:S.fl.ir})[pos[0]][+pos.slice(1)];
const setSlot = (pos,n) => { ({a:S.fl.act, b:S.fl.bench, i:S.fl.ir})[pos[0]][+pos.slice(1)] = n; };
const nm = n => { const p=P(n); return p.s.charAt(0)+p.s.slice(1).toLowerCase(); };
function recs(){
  const A=S.fl.act, out=[], used=new Set();
  A.forEach((n,i)=>{ if(n && isOut(n) && !S.fl.ir[0] && !out.length) { out.push({from:'a'+i, to:'i0', a:n, why:`${nm(n)} is OUT · move him to IR`}); used.add('a'+i); } });
  let bench = S.fl.bench.map((n,i)=>({n,pos:'b'+i})).filter(x=>plays(x.n)).sort((x,y)=>P(y.n).f-P(x.n).f);
  A.forEach((n,i)=>{ if(!n){ const b=bench.shift(); if(b) out.push({from:b.pos, to:'a'+i, a:b.n, why:`Open slot · start ${nm(b.n)} (${GAMES[P(b.n).t].time})`}); } });
  const idle = A.map((n,i)=>({n,pos:'a'+i})).filter(x=>x.n && !used.has(x.pos) && !plays(x.n)).sort((x,y)=>P(x.n).f-P(y.n).f);
  idle.forEach(x=>{ const b=bench.shift(); if(b) out.push({from:b.pos, to:x.pos, a:b.n, b:x.n, why:`${nm(x.n)} ${isOut(x.n)?'is OUT':'has no game'} · ${nm(b.n)} plays ${GAMES[P(b.n).t].time}`}); });
  const weak = A.map((n,i)=>({n,pos:'a'+i})).filter(x=>plays(x.n)).sort((x,y)=>P(x.n).f-P(y.n).f);
  bench.forEach(b=>{ const w=weak[0]; if(w && P(b.n).f > P(w.n).f+1){ weak.shift(); out.push({from:b.pos, to:w.pos, a:b.n, b:w.n, why:`${nm(b.n)} averages ${P(b.n).f} FP/G · ${nm(w.n)} ${P(w.n).f}`}); } });
  return out;
}
function swapPos(a,b){
  const na=getSlot(a), nb=getSlot(b);
  if(b[0]==='i' && na && !isOut(na)){ say('Only OUT players can go on IR'); return false; }
  if(a[0]==='i' && nb && !isOut(nb)){ say('Only OUT players can go on IR'); return false; }
  setSlot(a,nb); setSlot(b,na); save(); return true;
}
function doRec(k){ const r=recs()[k]; if(!r) return; if(swapPos(r.from,r.to)){ render(); say(r.to==='i0'?`${nm(r.a)} moved to IR`:`${nm(r.a)} is in`); lineupCheck(); } }
function lineupCheck(){ if(!recs().length && !S.done.lineup) setTimeout(()=>complete('lineup', document.querySelector('.qgrid')||document.querySelector('.rlist')), 250); }
function fzTap(pos){
  if(S.rq==='full' && FZ.view!==0) return;
  if(FZ.sel==null){ FZ.sel=pos; render(); return; }
  if(FZ.sel===pos){ FZ.sel=null; render(); return; }
  const a=FZ.sel; FZ.sel=null;
  if(swapPos(a,pos)){ render(); say('Swapped'); lineupCheck(); } else render();
}

/* ── page ─────────────────────────────────────────────────────────────────── */
function openFantasy(){
  if(cur!=='fantasy'){ FZ.tab='roster'; FZ.sel=null; FZ.view=0; }
  const first = S.vsWeek!==MU.week;
  go('fantasy').then(()=>{ if(first){ S.vsWeek=MU.week; save(); vsSplash(); } });
}
function leagueSwitcher(){
  const L = LEAGUES.find(l=>l.id===S.league)||LEAGUES[0];
  return `<div class="lsw"><button onclick="FZ.drop=!FZ.drop;render()"><b>${L.name}</b> ▾</button>
    ${FZ.drop?`<div class="ldrop"><div class="cap">CHOOSE DIFFERENT LEAGUE</div>
      ${LEAGUES.map(l=>`<a class="${l.id===S.league?'on':''}" onclick="pickLeague('${l.id}')">${l.name}<small>${l.team.toUpperCase()} · ${l.rec} · ${l.place}</small></a>`).join('')}
      <a class="add" onclick="addLeague()">ADD LEAGUE +</a></div>`:''}</div>`;
}
const qfToggle = key => `<div class="qf">${['quick','full'].map(v=>`<button class="${S[key]===v?'on':''}" onclick="S.${key}='${v}';FZ.sel=null;FZ.wsel=null;save();render()">${v.toUpperCase()}</button>`).join('')}</div>`;
function fantasy(){
  const tabs = [['battle','MATCH-UP'],['roster','ROSTER'],['waivers','WAIVERS'],['sched','SCHEDULE'],['stand','STANDINGS']];
  const body = {battle:fzBattle, roster:()=>S.rq==='quick'?fzQuick():fzFull(), waivers:()=>S.wq==='quick'?wvQuick():wvFull(), sched:fzSched, stand:fzStand}[FZ.tab]();
  const head = FZ.tab==='battle' ? leagueSwitcher() : FZ.tab==='roster' ? qfToggle('rq') : FZ.tab==='waivers' ? qfToggle('wq') : '';
  return mframe('fz'+(FZ.tab==='roster'&&S.rq==='quick'||FZ.tab==='waivers'&&S.wq==='quick'?' quick':''),'FANTASY', `<div class="mtabs t5">${tabs.map(([k,l])=>`<button class="${FZ.tab===k?'on':''}" onclick="FZ.tab='${k}';FZ.sel=null;FZ.wsel=null;FZ.drop=false;render()">${l}</button>`).join('')}</div>${body}`, head);
}

/* MATCH-UP */
function fzBattle(){
  const tot=Math.max(1,MU.me+MU.opp), playing=S.fl.act.filter(plays);
  return `<div class="zbox"><span class="zl">WEEK ${MU.week} · ${fmtD(WEEK_START(MU.week)).toUpperCase()} – ${fmtD(new Date(+WEEK_START(MU.week)+6*864e5)).toUpperCase()}</span>
      <div class="boss"><div class="sp" id="bossSp"></div><div>
        <div class="bn">${OPP.name.toUpperCase()}'S<b>${OPP.team.toUpperCase()}</b></div>
        <div class="bhp two"><i style="width:${100*MU.me/tot}%"></i><span style="width:${100*MU.opp/tot}%"></span></div>
        <div class="bsc"><b class="${MU.me>=MU.opp?'up':''}">${MU.me}</b><i>YOU</i>–<span class="${MU.opp>MU.me?'up':''}">${MU.opp}</span><i>THEM</i></div>
      </div></div></div>
    <div class="zbox"><div class="rooms">${days().map(d=>`<div class="room ${d.r==='W'?'w':d.r==='L'?'l':''} ${d.live?'live':''} ${d.today&&!d.live?'tdy':''}">${d.d}<b>${d.me!=null?d.me+'–'+d.op:'·'}</b>${d.r||(d.live?'LIVE':d.today?'TODAY':'')}</div>`).join('')}</div></div>
    <div class="dlg" id="dlg" onclick="nextLine()" title="Tap for another line"></div>
    <div class="zbox"><span class="zl">PLAYING TODAY · ${playing.length}</span><div class="tonight">${playing.map(n=>{ const p=P(n); return `<div><div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}</div>${p.s}<br>${GAMES[p.t].time}</div>`; }).join('')||'<span style="font-size:6px;color:var(--t3)">Nobody plays today</span>'}</div></div>
    ${recs().length?`<div class="todo" style="justify-content:center;cursor:pointer" onclick="FZ.tab='roster';S.rq='quick';render()"><span class="w">!</span>${recs().length} SUGGESTED MOVE${recs().length>1?'S':''} FOR TODAY ▶</div>`:''}`;
}

/* ROSTER · QUICK */
function selPanel(n, extra=''){
  if(!n) return `<div class="selp empty"><div class="q">?</div><div><b>SELECT A PLAYER</b><small>TAP ANY PORTRAIT BELOW</small></div></div>`;
  const p=P(n), g=GAMES[p.t];
  return `<div class="selp" style="--tc:${p.c}"><div class="ph">${face(p.t,p.n)}</div><div class="tx">
    <b>${p.n.toUpperCase()}</b><small>${p.t} · ${p.p} · ${p.f} FP/G</small>
    <small class="${p.inj==='OUT'?'out':p.inj?'gtd':g?'on':''}">${p.inj==='OUT'?'OUT · INJURED':g?`TODAY ${g.time} ${g.home?'vs':'@'} ${g.opp}${p.inj?' · '+p.inj:''}`:'NO GAME TODAY'}</small>
    ${extra}</div></div>`;
}
function qtile(n, pos){
  if(!n) return `<div class="qt empty ${FZ.sel===pos?'sel':''}" onclick="fzTap('${pos}')"><div class="ph">${pos[0]==='i'?'IR':'+'}</div><div class="u">${pos[0]==='i'?'EMPTY IR':'OPEN SLOT'}</div></div>`;
  const p=P(n), flag = p.inj==='OUT' ? 'out' : !GAMES[p.t] ? 'idle' : '';
  return `<div class="qt ${flag} ${FZ.sel===pos?'sel':''}" onclick="fzTap('${pos}')"><div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}${p.inj?`<span class="inj ${p.inj==='OUT'?'o':''}">${p.inj}</span>`:''}</div>
    <div class="nm">${p.s}</div><div class="u">${p.inj==='OUT'?'OUT':gameTxt(n)}</div></div>`;
}
function fzQuick(){
  const r=recs();
  const recRow = (x,k) => { const a=P(x.a), b=x.b?P(x.b):null;
    return `<div class="rec"><div class="mini" style="--tc:${a.c}">${face(a.t,a.n)}</div><span class="ar">${x.to==='i0'?'➜':'⇄'}</span>
      ${x.to==='i0'?'<div class="mini irb">IR</div>':b?`<div class="mini" style="--tc:${b.c}">${face(b.t,b.n)}</div>`:'<div class="mini irb">+</div>'}
      <div class="why">${x.why}</div><button class="go" onclick="doRec(${k})">${x.to==='i0'?'MOVE':'SWAP'}</button></div>`; };
  return `${selPanel(FZ.sel!=null?getSlot(FZ.sel):null, FZ.sel!=null?'<small style="color:var(--gold)">TAP ANOTHER PLAYER TO SWAP</small>':'')}
    <div class="recs">${r.length ? `<div class="cap">SUGGESTED FOR TODAY</div>${r.slice(0,2).map(recRow).join('')}${r.length>2?`<div class="cap" style="text-align:center">+${r.length-2} MORE AFTER THESE</div>`:''}`
      : '<div class="okline">✓ YOUR LINE-UP IS READY FOR TODAY</div>'}
      ${myNames().length - (S.fl.ir[0]?1:0) < 10 ? `<div class="rec open"><div class="mini irb">+</div><span></span><span></span><div class="why">You have an open roster spot · pick someone up</div><button class="go" onclick="FZ.tab='waivers';S.wq='quick';render()">WAIVERS</button></div>` : ''}</div>
    <div class="qcap">ACTIVE · ${S.fl.act.filter(Boolean).length}/8</div>
    <div class="qgrid">${S.fl.act.map((n,i)=>qtile(n,'a'+i)).join('')}</div>
    <div class="qcap">BENCH · IR</div>
    <div class="qgrid">${S.fl.bench.map((n,i)=>qtile(n,'b'+i)).join('')}${qtile(S.fl.ir[0],'i0')}</div>`;
}

/* ROSTER · FULL (like the live Rosters page) */
const DAYN = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
function dayGame(n, di){
  if(di===TODAY_I) return GAMES[P(n).t] ? gameTxt(n) : 'NO GAME';
  const p=P(n); if(hsh(p.t+di)<.45) return 'NO GAME';
  const opp=Object.keys(TC)[Math.floor(hsh(p.t+'o'+di)*30)]; return `${['7:00','7:30','8:00','10:00'][Math.floor(hsh(p.t+'t'+di)*4)]}P ${hsh(p.t+'h'+di)<.5?'vs':'@'} ${opp===p.t?'MEM':opp}`;
}
function fpFor(p){ if(FZ.fpm==='DAY') return FZ.day===TODAY_I ? (gs()==='live'&&GAMES[p.t]&&!isOut(p.n)?p.td:'—') : FZ.day<TODAY_I ? (hsh(p.n+FZ.day)<.4?'—':Math.round(p.f*(.6+hsh(p.n+'x'+FZ.day)))) : '—';
  return FZ.fpm==='WEEK' ? p.wk : p.fall; }
function rrow(n, pos, mine){
  if(!n) return `<div class="rr empty"><div class="rp"></div><div class="rt"><b>— OPEN —</b></div>${mine?`<button class="sw ${FZ.sel===pos?'on':''}" onclick="fzTap('${pos}')">⇅</button>`:''}</div>`;
  const p=P(n), live = gs()==='live' && FZ.day===TODAY_I && GAMES[p.t] && !isOut(n);
  return `<div class="rr ${FZ.sel===pos?'sel':''}"><div class="rp" style="--tc:${p.c}">${face(p.t,p.n)}${live?'<span class="lv">LIVE</span>':''}</div>
    <div class="rt"><b>${p.n}${p.inj?` <i class="${p.inj==='OUT'?'o':''}">${p.inj}</i>`:''}</b><small>${p.p} · ${p.t} · ${dayGame(n,FZ.day)}</small></div>
    <div class="rf"><b>${fpFor(p)}</b> FP<small>${p.f} FP/G</small></div>
    ${mine?`<button class="sw ${FZ.sel===pos?'on':''}" onclick="fzTap('${pos}')">⇅</button>`:''}</div>`;
}
function fzFull(){
  const i=FZ.view, mine=i===0, T=TEAMS[i];
  const chips = TEAMS.map((t,k)=>`<button class="${k===i?'on':''}" onclick="FZ.view=${k};FZ.sel=null;render()">${t.team}</button>`).join('');
  let body;
  if(mine){
    body = `<div class="rsec"><span>ACTIVE ${S.fl.act.filter(Boolean).length}</span>${fpTog()}</div>${S.fl.act.map((n,k)=>rrow(n,'a'+k,true)).join('')}
      <div class="rsec"><span style="color:var(--red)">BENCH</span></div>${S.fl.bench.map((n,k)=>rrow(n,'b'+k,true)).join('')}
      <div class="rsec"><span style="color:var(--violet)">IR</span></div>${rrow(S.fl.ir[0],'i0',true)}`;
  } else {
    const r=OTHER[i]; body = `<div class="rsec"><span>ACTIVE 8</span>${fpTog()}</div>${r.slice(0,8).map(n=>rrow(n,'x',false)).join('')}<div class="rsec"><span style="color:var(--red)">BENCH</span></div>${r.slice(8).map(n=>rrow(n,'x',false)).join('')}`;
  }
  return `<div class="chips"><button class="ar" onclick="FZ.view=(FZ.view+5)%6;FZ.sel=null;render()">‹</button><div class="cs">${chips}</div><button class="ar" onclick="FZ.view=(FZ.view+1)%6;FZ.sel=null;render()">›</button></div>
    <div class="rhead">${T.team.toUpperCase()} · ${rosterOf(i).length}/10 PLAYERS${mine?` · ${S.fl.ir[0]?1:0} ON IR`:` · ${T.m.toUpperCase()}`}</div>
    <div class="dstrip">${DAYN.map((d,k)=>`<button class="${k===FZ.day?'on':''} ${k===TODAY_I?'tdy':''}" onclick="FZ.day=${k};render()">${d}<b>${WEEK_START(MU.week).getDate()+k}</b>${k===TODAY_I?'<small>TODAY</small>':''}</button>`).join('')}</div>
    <div class="rlist">${body}</div>`;
}
const fpTog = () => `<div class="fpt">${['DAY','WEEK','FALL'].map(m=>`<button class="${FZ.fpm===m?'on':''}" onclick="FZ.fpm='${m}';render()">${m}</button>`).join('')}</div>`;

/* WAIVERS */
const pool = () => { const r=rostered(); return PL.filter(p=>!r.has(p.n)); };
const trending = () => pool().filter(p=>!isOut(p.n)).sort((a,b)=>b.l5-a.l5).slice(0,6);
const addsLeft = () => 3 - S.wv.used;
const addBar = () => `<div class="adds">ADD/DROPS LEFT <span>${[0,1,2].map(k=>`<i class="${k<addsLeft()?'on':''}"></i>`).join('')}</span> ${addsLeft()}/3</div>`;
function wvQuick(){
  const t=trending(), sel=FZ.wsel;
  const btns = sel ? `<div class="wbtns"><button class="wb add" onclick="wvAdd('${sel.replace(/'/g,"\\'")}')">＋ ADD</button><button class="wb sc ${S.wv.scouted.includes(sel)?'on':''}" onclick="wvScout('${sel.replace(/'/g,"\\'")}')">${S.wv.scouted.includes(sel)?'✓ SCOUTED':'🔭 SCOUT'}</button></div>` : '';
  return `<div class="wtop">${addBar()}<button class="srep" onclick="scoutReport()">🔭 SCOUTING REPORT <b>${S.wv.scouted.length}</b></button></div>
    ${selPanel(sel, sel?`<small>LAST 5 GAMES <span style="color:var(--green)">${P(sel).l5} FP/G</span></small>${btns}`:'')}
    <div class="qcap">TRENDING · BEST FP/G OVER THE LAST 5 GAMES</div>
    <div class="tgrid">${t.map((p,k)=>`<div class="tt ${sel===p.n?'sel':''}" onclick="FZ.wsel=FZ.wsel==='${p.n.replace(/'/g,"\\'")}'?null:'${p.n.replace(/'/g,"\\'")}';render()">
      <div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}<span class="rk">${k+1}</span>${S.wv.scouted.includes(p.n)?'<span class="scd">🔭</span>':''}</div>
      <div class="nm">${p.n[0]}. ${p.s}</div><div class="l5"><b>${p.l5}</b> FP/G</div><div class="u">${gameTxt(p.n)}</div></div>`).join('')}</div>`;
}
function wvRows(){
  const q=FZ.wq.toLowerCase(), r=rostered();
  let list = (FZ.wall?PL:pool()).filter(p=>(!q||p.n.toLowerCase().includes(q)) && (!FZ.wteam||p.t===FZ.wteam) && (!FZ.whide||!p.inj) && (!FZ.wrook||ROOKIES.has(p.n)));
  list.sort(FZ.wsort==='az'?(a,b)=>a.n.localeCompare(b.n):FZ.wsort==='fpg'?(a,b)=>b.f-a.f:(a,b)=>b.fall-a.fall);
  return `<div class="rsec"><span style="color:var(--green)">${FZ.wall?'ALL PLAYERS':'AVAILABLE'} · ${list.length}</span><span>${FZ.wsort==='fpg'?'FP/G':'SEASON FP'}</span></div>` + list.slice(0,40).map(p=>{ const own=r.has(p.n), esc=p.n.replace(/'/g,"\\'");
    return `<div class="rr"><div class="rp" style="--tc:${p.c}">${face(p.t,p.n)}${gs()==='live'&&GAMES[p.t]&&!isOut(p.n)?'<span class="lv">LIVE</span>':''}</div>
      <div class="rt"><b>${p.n}${p.inj?` <i class="${p.inj==='OUT'?'o':''}">${p.inj}</i>`:''}</b><small>${p.p} · ${p.t} · ${gameTxt(p.n)}</small></div>
      ${own?'<span class="ownd">ROSTERED</span>':`<button class="wsq add" onclick="wvAdd('${esc}')">+<small>ADD</small></button><button class="wsq sc ${S.wv.scouted.includes(p.n)?'on':''}" onclick="wvScout('${esc}')">${S.wv.scouted.includes(p.n)?'✓':'🔭'}<small>${S.wv.scouted.includes(p.n)?'SCOUTED':'SCOUT'}</small></button>`}
      <div class="rf"><b>${FZ.wsort==='fpg'?p.f:p.fall}</b> FP<small>${FZ.wsort==='fpg'?p.fall+' FP':p.f+' FP/G'}</small></div></div>`; }).join('');
}
function wvFull(){
  const teams=[...new Set(PL.map(p=>p.t))].sort();
  return `<div class="panel wpanel">${addBar()}<div class="wbtnrow"><button class="srep" onclick="scoutReport()">🔭 SCOUTING REPORT <b>${S.wv.scouted.length}</b></button><button class="srep blu" onclick="txLog()">📜 TRANSACTIONS</button></div></div>
    <div class="wsearch"><input id="wq" placeholder="Search players..." value="${FZ.wq.replace(/"/g,'&quot;')}" oninput="FZ.wq=this.value;document.getElementById('wvl').innerHTML=wvRows()"><select onchange="FZ.wteam=this.value;render()"><option value="">All Teams</option>${teams.map(t=>`<option ${FZ.wteam===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="wtog"><div class="seg">${[['0','AVAILABLE'],['1','ALL PLAYERS']].map(([v,l])=>`<button class="${(+FZ.wall)==v?'on':''}" onclick="FZ.wall=${v==='1'};render()">${l}</button>`).join('')}</div>
      <div class="seg">${[['fp','FP'],['fpg','FP/G'],['az','A–Z']].map(([v,l])=>`<button class="${FZ.wsort===v?'on':''}" onclick="FZ.wsort='${v}';render()">${l}</button>`).join('')}</div></div>
    <div class="wfil">FILTERS <button class="${FZ.whide?'on':''}" style="--fc:var(--red)" onclick="FZ.whide=!FZ.whide;render()">HIDE OUT/INJ</button><button class="${FZ.wrook?'on':''}" style="--fc:var(--gold)" onclick="FZ.wrook=!FZ.wrook;render()">★ ROOKIES</button></div>
    <div class="rlist" id="wvl">${wvRows()}</div>`;
}
function wvScout(n){ const s=S.wv.scouted, i=s.indexOf(n); if(i>=0) s.splice(i,1); else s.push(n); save(); render(); say(i>=0?'Removed from your Scouting Report':'Added to your Scouting Report'); }
function wvAdd(n){
  if(addsLeft()<=0){ say('No add/drops left this week'); return; }
  const open = S.fl.act.indexOf(null)>=0 ? 'a'+S.fl.act.indexOf(null) : S.fl.bench.indexOf(null)>=0 ? 'b'+S.fl.bench.indexOf(null) : null;
  const doAdd = (dropPos) => { const dropped = dropPos ? getSlot(dropPos) : null;
    setSlot(dropPos||open, n);
    S.wv.used++; const d=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});
    S.wv.log.unshift({t:'ADD',n,d}); if(dropped) S.wv.log.unshift({t:'DROP',n:dropped,d});
    const si=S.wv.scouted.indexOf(n); if(si>=0) S.wv.scouted.splice(si,1);
    FZ.wsel=null; save(); render(); say(dropped?`Added ${nm(n)} · dropped ${nm(dropped)}`:`Added ${nm(n)}`); lineupCheck(); };
  if(open){ doAdd(null); return; }
  const slots=[...S.fl.act.map((x,i)=>['a'+i,x]), ...S.fl.bench.map((x,i)=>['b'+i,x])].filter(x=>x[1]);
  const o=overlay(`<div class="sheet" style="--c:var(--green)"><h3>ROSTER FULL · DROP SOMEONE</h3><p>To add <b style="color:var(--green);font-weight:normal">${n}</b>, pick a player to drop. This uses one of your ${addsLeft()} add/drops this week.</p>
    <div class="dlist">${slots.map(([pos,x])=>{ const p=P(x); return `<button data-p="${pos}"><span class="mini" style="--tc:${p.c}">${face(p.t,p.n)}</span><span>${p.n}<small>${p.t} · ${p.f} FP/G${p.inj?' · '+p.inj:''}</small></span><b>DROP</b></button>`; }).join('')}</div></div>`);
  o.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ o.remove(); doAdd(b.dataset.p); });
}
function scoutReport(){
  const s=S.wv.scouted.map(P);
  const o=overlay(`<div class="sheet" style="--c:var(--gold)"><h3>🔭 SCOUTING REPORT</h3><p>Players you're keeping an eye on. Tap ADD to pick one up.</p>
    <div class="dlist">${s.length?s.map(p=>`<button data-n="${p.n.replace(/"/g,'&quot;')}"><span class="mini" style="--tc:${p.c}">${face(p.t,p.n)}</span><span>${p.n}<small>${p.t} · ${p.f} FP/G · LAST 5: ${p.l5}</small></span><b style="color:var(--green);border-color:var(--green)">ADD</b></button>`).join(''):'<p>Nobody yet. Tap 🔭 SCOUT on any player.</p>'}</div></div>`);
  o.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{ o.remove(); wvAdd(b.dataset.n); });
}
function txLog(){ overlay(`<div class="sheet" style="--c:var(--blue)"><h3>📜 TRANSACTIONS</h3><div class="tx">${S.wv.log.map(l=>`<div><span class="${l.t==='ADD'?'a':'d'}">${l.t}</span>${l.n}<small>${ME.name.toUpperCase()} · ${l.d}</small></div>`).join('')}
  <div><span class="a">ADD</span>Saddiq Bey<small>RILEY · NOV 2</small></div><div><span class="d">DROP</span>Josh Hart<small>RILEY · NOV 2</small></div></div></div>`); }

/* SCHEDULE */
function fzSched(){
  const w=FZ.wk, st=WEEK_START(w), rows=weekPairs(w).map((pr,k)=>{ const [a,b]=pr.map(i=>TEAMS[i]);
    let sa='—', sb='—';
    if(SCORES[w]){ [sa,sb]=SCORES[w][k]; } else if(w===MU.week){ if(k===0){ sa=MU.me; sb=MU.opp; } else { sa=[0,301,270][k]; sb=[0,288,265][k]; } }
    const ra=record(pr[0]), rb=record(pr[1]), me=pr.includes(0);
    return `<div class="mrow ${me?'me':''}" onclick="say('Preview: box scores come later')"><div class="side"><span class="av" data-ch="${chOf(a)}"></span><span class="wl">${ra.w}-${ra.l}</span><small>${a.team.toUpperCase()}</small></div>
      <b class="${sa>sb?'hi':''}">${sa}</b><i>VS</i><b class="${sb>sa?'hi':''}">${sb}</b>
      <div class="side r"><span class="wl">${rb.w}-${rb.l}</span><span class="av" data-ch="${chOf(b)}"></span><small>${b.team.toUpperCase()}</small></div></div>`; }).join('');
  return `<div class="wkn"><button onclick="FZ.wk=Math.max(1,FZ.wk-1);render()">◀</button><div>${w===MU.week?'▸ THIS WEEK':w<MU.week?'FINAL':'UPCOMING'}<b>${fmtD(st)} – ${fmtD(new Date(+st+6*864e5))}</b></div><button onclick="FZ.wk=Math.min(8,FZ.wk+1);render()">▶</button></div>
    <div class="lbox"><h3>WEEK ${w} MATCH-UPS</h3><div class="sub">${fmtD(st).toUpperCase()} – ${fmtD(new Date(+st+6*864e5)).toUpperCase()}</div>${rows}<div class="foot">TAP A MATCH-UP FOR ITS BOX SCORE</div></div>`;
}
/* STANDINGS */
function fzStand(){
  const s=standings();
  return `<div class="lbox"><h3>FALL RUN STANDINGS</h3><div class="sub">OCT 20 – DEC 27 · WEEK ${MU.week} OF 10</div>
    <div class="shead"><span>RANK</span><span>TEAM</span><span>W-L</span><span>FP</span></div>
    ${s.map((t,k)=>`<div class="srow ${t.me?'me':''} ${k===0?'top':''}" style="cursor:pointer" onclick="FZ.tab='roster';S.rq='full';FZ.view=${t.i};FZ.sel=null;render()"><span>${ordinal(k+1)}</span><span class="av" data-ch="${chOf(t)}"></span><span class="tn">${t.team.toUpperCase()}</span><span>${t.w}-${t.l}</span><b>${t.pf.toLocaleString()}</b></div>`).join('')}
    <div class="foot">TAP A TEAM FOR ITS ROSTER</div></div>`;
}

/* VS splash: first visit to Fantasy each week */
function vsSplash(){
  const me=standings().find(t=>t.me), op=standings().find(t=>t.i===1);
  const g=document.createElement('div'); g.className='vss';
  g.innerHTML=`<div class="half a"><span id="vsa"></span><div><b>${ME.team.toUpperCase()}</b><small>${ME.name.toUpperCase()} · ${me.w}-${me.l}</small></div></div>
    <div class="half b"><div><b>${OPP.team.toUpperCase()}</b><small>${OPP.name.toUpperCase()} · ${op.w}-${op.l}</small></div><span id="vsb"></span></div>
    <div class="vsx">VS</div><div class="vwk">WEEK ${MU.week} · FALL RUN</div><div class="vtap">TAP TO CONTINUE</div>`;
  g.querySelector('#vsa').appendChild(ballerCv(S.active,4)); g.querySelector('#vsb').appendChild(ballerCv('bee',4));
  g.onclick=()=>{ g.classList.add('out'); setTimeout(()=>g.remove(),350); };
  document.getElementById('app').appendChild(g);
}

AFTER.fantasy = ()=>{
  const b=document.getElementById('bossSp'); if(b) b.appendChild(ballerCv('bee',3));
  const d=document.getElementById('dlg'); if(d) typewrite(d, battleText());
};
SCREENS.fantasy = fantasy;
