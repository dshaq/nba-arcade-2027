/* NBA Arcade · test site · FANTASY
   Tabs: MATCH-UP · ROSTER · WAIVERS · SCHEDULE · STANDINGS.
   Roster and Waivers each have QUICK (default, one screen) and FULL (like the live site). */

const FZ = {tab:'roster', sel:null, drop:false, view:0, day:TODAY_I, fpm:null, wk:MU.week, wsel:null, wq:'', wteam:'', wall:false, wsort:'fp', whide:false, wrook:false, wpg:0, wavail:true, wf:null, rdrop:false, ssort:'wl'};
S.run ||= 'fall';
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
  const pick = (arr,k) => arr[Math.floor(hsh(k+TODAY+MU.week)*arr.length)];   // one set of lines per day
  const mine = myNames().map(P).sort((a,b)=>b.yd-a.yd)[0], theirs = OTHER[1].map(P).sort((a,b)=>b.yd-a.yd)[0];
  const d = Math.abs(MU.me-MU.opp), lead = MU.me-MU.opp;
  const playing = S.fl.act.filter(plays).map(P).sort((a,b)=>GAMES[a.t].time.localeCompare(GAMES[b.t].time));
  const sc = d<=20 ? BATTLE.scoreClose : lead>0 ? BATTLE.scoreLead : BATTLE.scoreTrail;
  const fill = s => s.replace(/{hi}/g, mine.s.charAt(0)+mine.s.slice(1).toLowerCase()).replace(/{hifp}/g, mine.yd)
    .replace(/{ohi}/g, theirs.s.charAt(0)+theirs.s.slice(1).toLowerCase()).replace(/{ohifp}/g, theirs.yd)
    .replace(/{opp}/g, OPP.team).replace(/{d}/g, d).replace(/{n}/g, playing.length)
    .replace(/{first}/g, playing[0] ? playing[0].s.charAt(0)+playing[0].s.slice(1).toLowerCase() : '').replace(/{time}/g, playing[0] ? GAMES[playing[0].t].time : '');
  if(TODAY_I===0 || FZ.mon) return mondayText(pick);
  return [pick(BATTLE.highlight,'h'), pick(sc,'s'), playing.length ? pick(BATTLE.today,'t') : BATTLE.todayNone[0]].map(fill).join(' ');
}
/* Monday: a fresh week, so no talk of yesterday. Two sentences built from the opponent's
   record and streak, players trending on your side, and anyone newly OUT. */
const oppIdx = () => { const i=TEAMS.findIndex(t=>t.team===OPP.team); return i>0?i:1; };
function oppStreak(){
  if(typeof LIVE!=='undefined' && LIVE.on) return null;
  let k=0, kind=null;
  for(let wk=MU.week-1; wk>=1; wk--){ if(!SCORES[wk]) continue; const i=oppIdx(), j=weekPairs(wk).findIndex(pr=>pr.includes(i)); if(j<0) continue;
    const pr=weekPairs(wk)[j], sc=SCORES[wk][j], me=pr.indexOf(i), won=sc[me]>sc[1-me];
    if(kind==null) kind=won; if(won!==kind) break; k++; }
  return kind==null ? null : {won:kind, n:k};
}
function mondayText(pick){
  const r=record(oppIdx()), st=oppStreak(), T=OPP.team, mine=myNames().map(P);
  const hot=mine.filter(p=>!isOut(p.n)).sort((a,b)=>(b.l5-b.f)-(a.l5-a.f))[0], out=mine.filter(p=>isOut(p.n));
  const nmP = p => p.s.charAt(0)+p.s.slice(1).toLowerCase();
  const opp = [
    `${T} comes in at ${r.w}-${r.l}.`,
    st&&st.n>1 ? (st.won?`${T} has won ${st.n} straight. Somebody has to stop them.`:`${T} has dropped ${st.n} in a row and will be desperate.`) : `${T} (${r.w}-${r.l}) is your test this week.`,
  ];
  const you = [
    hot && hot.l5>hot.f ? `${nmP(hot)} is heating up at ${hot.l5} FP/G over his last 5.` : null,
    out.length ? `${out.map(nmP).join(' and ')} ${out.length>1?'are':'is'} OUT to start the week, so check your line-up.` : null,
    `A new week, a clean slate: every point counts from here.`,
  ].filter(Boolean);
  return pick(opp,'mo') + ' ' + pick(you.slice(0, you.length>1?you.length-1:1),'my');
}
function nextLine(){ typewrite(document.getElementById('dlg'), battleText(), 45); }   // tap = type it out again

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
function openFantasy(tab='roster'){
  if(cur!=='fantasy'){ FZ.tab=tab; FZ.sel=null; FZ.view=0; }
  const wk=weekKey(), first = S.vsWeek!==wk && !(typeof LIVE!=='undefined' && LIVE.state==='connecting');
  go('fantasy').then(()=>{ if(first){ S.vsWeek=wk; save(); vsSplash(); } });
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
  const tabs = [['battle','MATCH-UP'],['roster','ROSTER'],['waivers','WAIVERS'],['trades','TRADES'],['sched','SCHEDULE'],['stand','STANDINGS']];
  const body = {battle:fzBattle, roster:rosterStage, waivers:wvPage, trades:()=>typeof tradesPage==='function'?tradesPage():'', sched:fzSched, stand:fzStand}[FZ.tab]();
  const head = runHead();
  if(S.run==='winter') return mframe('fz run-winter','FANTASY', winterBody(), head);
  return mframe('fz run-'+S.run+(FZ.tab==='roster'&&S.rq==='quick'||FZ.tab==='waivers'?' quick':''),'FANTASY', `<div class="mtabs t5 t6">${tabs.map(([k,l])=>`<button class="${FZ.tab===k?'on':''}" onclick="FZ.tab='${k}';FZ.sel=null;FZ.wsel=null;FZ.drop=false;render()">${l}</button>`).join('')}</div>${body}`, head);
}

/* Run picker beside the title: Fall Run now, Winter Run after the December draft.
   The little bar is the live site's run progress, one segment per week. */
const RUNS_N = {fall:{name:'FALL RUN', weeks:10, dates:'OCT 20 – DEC 27'}, winter:{name:'WINTER RUN', weeks:10, dates:'DEC 29 – MAR 8'}};
function runHead(){
  const R0=RUNS_N[S.run], tot=R0.weeks, wk=S.run==='fall'?MU.week:0;
  return `<div class="runh"><button class="rsel" onclick="FZ.rdrop=!FZ.rdrop;render()">${R0.name} ▾</button>
    <div class="rprog"><div class="rtx"><span>${wk?`WEEK ${wk} OF ${tot}`:'STARTS DEC 29'}</span></div><div class="rsegs">${Array.from({length:tot},(_,i)=>`<i class="${i<wk-1?'on':i===wk-1?'cur':''}"></i>`).join('')}</div></div>
    ${FZ.rdrop?`<div class="ldrop rdrop">${Object.entries(RUNS_N).map(([k,r])=>`<a class="${S.run===k?'on':''}" onclick="S.run='${k}';FZ.rdrop=false;save();render()">${r.name}<small>${r.dates}${k==='winter'?' · DRAFT DEC 20':` · ${(()=>{const m=standings().find(t=>t.me)||{w:0,l:0};return m.w+'-'+m.l;})()}`}</small></a>`).join('')}</div>`:''}</div>`;
}
function winterBody(){
  return `<div class="zbox wint"><div class="snow">❄</div><b>WINTER RUN</b><p>A brand-new team for everyone. The Winter draft is Saturday, Dec 20 at 8 PM ET, and your new roster shows up here once it's done.</p><button class="btn alt" onclick="go('draft')" style="margin-bottom:10px">GO TO THE DRAFT ROOM ▶</button>
    <p class="dim">DEC 29 – MAR 8 · 10 WEEKS</p><button class="btn" onclick="S.run='fall';save();render()">◀ BACK TO THE FALL RUN</button></div>`;
}
/* The biggest threat on the other side today: their best FP/G player with a game, plus a boss nickname. */
const NICKS = {C:['THE IRON TOWER','RIM REAPER','THE GLASS EATER','BIG BOSS'], F:['THE BULLDOZER','SKY STRIKER','THE JUGGERNAUT','STORM BRINGER'], G:['THE SNIPER','QUICKSILVER','SHADOW STEP','THE BLUR']};
function threat(){
  const ros=(OTHER[oppIdx()]||[]).filter(n=>{ try{ return plays(n); }catch(e){ return false; } }).map(P).sort((a,b)=>b.f-a.f);
  const p=ros[0]; if(!p) return null;
  const pos=String(p.p||'G').includes('C')?'C':String(p.p||'').includes('F')?'F':'G', L=NICKS[pos];
  return {p, nick:L[Math.floor(hsh(p.n+'nick')*L.length)]};
}

/* calendar week (Monday's date, ET): the VS splash plays once per week */
function weekKey(){ const t=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'})); t.setDate(t.getDate()-((t.getDay()+6)%7)); return t.toDateString(); }

/* MATCH-UP */
function fzBattle(){
  const tot=Math.max(1,MU.me+MU.opp), playing=S.fl.act.filter(plays);
  return `<div class="zbox"><span class="zl">WEEK ${MU.week} · ${fmtD(WEEK_START(MU.week)).toUpperCase()} – ${fmtD(new Date(+WEEK_START(MU.week)+6*864e5)).toUpperCase()}</span>
      <div class="boss"><div class="sp" id="bossSp"></div><div>
        <div class="bn">${OPP.name.toUpperCase()}'S<b>${OPP.team.toUpperCase()}</b></div>
        <div class="bhp two"><i style="width:${100*MU.me/tot}%"></i><span style="width:${100*MU.opp/tot}%"></span></div>
        <div class="bsc"><b class="${MU.me>=MU.opp?'up':''}">${MU.me}</b><i>YOU</i>–<span class="${MU.opp>MU.me?'up':''}">${MU.opp}</span><i>THEM</i></div>
      </div></div>
      <div class="rooms in">${days().map(d=>`<div class="room ${d.r==='W'?'w':d.r==='L'?'l':''} ${d.live?'live':''} ${d.today&&!d.live?'tdy':''}">${d.d}<b>${d.me!=null?d.me+'–'+d.op:'·'}</b></div>`).join('')}</div>${(()=>{ const t=threat(); if(!t) return ''; return `<div class="threat" data-own="1" onclick="event.stopPropagation();openPlayer('${t.p.n.replace(/'/g,"\\'")}')"><div class="ph cw">${scard(t.p.n,{noTap:1,noinj:1})}</div><div><span>TODAY'S BOSS</span><b>“${t.nick}”</b><small>${t.p.n.toUpperCase()} · ${t.p.f} FP/G · ${gameTxt(t.p.n)}</small></div></div>`; })()}</div>
    <div class="dlg" id="dlg" onclick="nextLine()" title="Tap to replay"></div>
    <div class="zbox"><span class="zl">PLAYING TODAY · ${playing.length}</span><div class="tonight">${playing.map(n=>{ const p=P(n); return `<div><div class="ph cw">${scard(p.n,{noinj:1})}</div></div>`; }).join('')||'<span style="font-size:6px;color:var(--t3)">Nobody plays today</span>'}</div></div>
`;
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
      ${myNames().length - (S.fl.ir[0]?1:0) < ACT_N+BENCH_N ? `<div class="rec open"><div class="mini irb">+</div><span></span><span></span><div class="why">You have an open roster spot · pick someone up</div><button class="go" onclick="FZ.tab='waivers';S.wq='quick';render()">WAIVERS</button></div>` : ''}</div>
    <div class="qcap">ACTIVE · ${S.fl.act.filter(Boolean).length}/${ACT_N}</div>
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
/* FP shown on cards: FP/G (orange) or today's FP (blue). Default: finished days and live games show the day's FP. */
function fpMode(){ return FZ.fpm || (FZ.day<TODAY_I || (FZ.day===TODAY_I && gs()==='live') ? 'DAY' : 'AVG'); }
function fpFor(p){ if(fpMode()==='AVG') return (+p.f).toFixed(1); if(true) return FZ.day===TODAY_I ? (gs()==='live'&&GAMES[p.t]&&!isOut(p.n)?p.td:'—') : FZ.day<TODAY_I ? (hsh(p.n+FZ.day)<.4?'—':Math.round(p.f*(.6+hsh(p.n+'x'+FZ.day)))) : '—';
  return '—'; }
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
    const r=OTHER[i]; body = `<div class="rsec"><span>ACTIVE ${ACT_N}</span>${fpTog()}</div>${r.slice(0,ACT_N).map(n=>rrow(n,'x',false)).join('')}<div class="rsec"><span style="color:var(--red)">BENCH</span></div>${r.slice(ACT_N).map(n=>rrow(n,'x',false)).join('')}`;
  }
  return `<div class="chips"><button class="ar" onclick="FZ.view=(FZ.view+5)%6;FZ.sel=null;render()">‹</button><div class="cs">${chips}</div><button class="ar" onclick="FZ.view=(FZ.view+1)%6;FZ.sel=null;render()">›</button></div>
    <div class="rhead">${T.team.toUpperCase()} · ${rosterOf(i).length}/10 PLAYERS${mine?` · ${S.fl.ir[0]?1:0} ON IR`:` · ${T.m.toUpperCase()}`}</div>
    <div class="dstrip">${DAYN.map((d,k)=>`<button class="${k===FZ.day?'on':''} ${k===TODAY_I?'tdy':''}" onclick="FZ.day=${k};render()">${d}<b>${WEEK_START(MU.week).getDate()+k}</b>${k===TODAY_I?'<small>TODAY</small>':''}</button>`).join('')}</div>
    <div class="rlist">${body}</div>`;
}
const fpTog = () => `<div class="fpt">${[['AVG','FP/G'],['DAY','FP TODAY']].map(([m,l])=>`<button class="${fpMode()===m?'on '+m.toLowerCase():''}" onclick="FZ.fpm='${m}';render()">${l}</button>`).join('')}</div>`;

/* WAIVERS */
const pool = () => { const r=rostered(); return PL.filter(p=>!r.has(p.n)); };
const trending = () => pool().filter(p=>!isOut(p.n)).sort((a,b)=>b.l5-a.l5).slice(0,6);
/* NEXT rule: 7 acquisitions per matchup (7-day week); resets each matchup week */
if(S.wv.wk!==weekKey()){ S.wv.wk=weekKey(); S.wv.used=0; }
let addsLeft = () => Math.max(0, 7 - S.wv.used);
const addBar = () => `<div class="adds">ACQUISITIONS <span>${[0,1,2,3,4,5,6].map(k=>`<i class="${k<addsLeft()?'on':''}"></i>`).join('')}</span> ${addsLeft()}/7</div>`;
function wvQuick(){
  const t=trending(), sel=FZ.wsel;
  const btns = sel ? `<div class="wbtns"><button class="wb add" onclick="wvAdd('${sel.replace(/'/g,"\\'")}')">+ ADD</button><button class="wb sc ${S.wv.scouted.includes(sel)?'on':''}" onclick="wvScout('${sel.replace(/'/g,"\\'")}')">${S.wv.scouted.includes(sel)?'✓ SCOUTED':'🔭 SCOUT'}</button></div>` : '';
  return `<div class="wtop">${addBar()}<button class="srep" onclick="scoutReport()">🔭 SCOUTING REPORT <b>${S.wv.scouted.length}</b></button></div>
    <div class="qcap">TRENDING · BEST FP/G OVER THE LAST 5 GAMES</div>
    <div class="tgrid">${t.map((p,k)=>`<div class="tt" data-act="1" onclick="wvOpen('${p.n.replace(/'/g,"\\'")}')">
      <div class="ph" style="--tc:${p.c}">${face(p.t,p.n)}<span class="rk">${k+1}</span>${S.wv.scouted.includes(p.n)?'<span class="scd">🔭</span>':''}</div>
      <div class="nm">${p.n[0]}. ${p.s}</div><div class="l5"><b>${p.l5}</b> FP/G</div><div class="u">${gameTxt(p.n)}</div></div>`).join('')}</div>`;
}
/* WAIVERS · one page: trending carousel (or search results) six at a time, arrows to page. */
function wvList(){
  const f=FZ.wf; if(!f) return pool().filter(p=>!isOut(p.n)).sort((a,b)=>b.l5-a.l5).slice(0,48);
  const q=(f.q||'').toLowerCase();
  return (f.avail?pool():PL).filter(p=>(!q||p.n.toLowerCase().includes(q)) && (!f.team||p.t===f.team) && (!f.hide||!p.inj)).sort((a,b)=>b.l5-a.l5||b.f-a.f);
}
function wvPage(){
  const L=wvList(), pages=Math.max(1,Math.ceil(L.length/6)), r=rostered();
  FZ.wpg=Math.min(FZ.wpg,pages-1);
  const card=(p,k)=>{ const own=r.has(p.n); return `<div class="tt ${own?'own':''}" data-act="1" onclick="wvOpen('${p.n.replace(/'/g,"\\'")}')">
      <div class="ph cw">${scard(p.n,{fm:'AVG',fpv:`${Math.ceil(p.l5)} FP`})}<span class="rk">${k+1}</span>${S.wv.scouted.includes(p.n)?'<span class="scd">🔭</span>':''}${own?'<span class="owt">ROSTERED</span>':(typeof onWaivers==='function'&&onWaivers(p.n))?'<span class="owt wvt">WAIVERS</span>':''}</div></div>`; };
  const f=FZ.wf, chips=f?[f.q&&`“${f.q}”`, f.avail?'AVAILABLE':'ALL PLAYERS', f.hide&&'NO OUT/INJ', f.team].filter(Boolean).join(' · '):'';
  return `<div class="wtop">${addBar()}<div class="wbtn2"><button class="srep sm" onclick="scoutReport()">🔭 SCOUTING <b>${S.wv.scouted.length}</b></button><button class="srep sm blu" onclick="wvSearch()">🔍 SEARCH</button></div></div>
    <div class="qcap">${f?`RESULTS · ${L.length} <span class="clr" onclick="FZ.wf=null;FZ.wpg=0;render()">✕ CLEAR</span><br><span class="dim">${chips}</span>`:'TRENDING · BEST FP/G OVER THE LAST 5 GAMES'}</div>
    ${L.length?`<div class="wcar"><button class="warr" ${FZ.wpg?'':'disabled'} onclick="wvGo(-1)" aria-label="Previous">◀</button>
      <div class="wtrack" id="wtrack">${Array.from({length:pages},(_,g)=>`<div class="tgrid wpage">${L.slice(g*6,g*6+6).map((p,k)=>card(p,g*6+k)).join('')}</div>`).join('')}</div>
      <button class="warr" ${FZ.wpg<pages-1?'':'disabled'} onclick="wvGo(1)" aria-label="Next">▶</button></div>
      <div class="wdots">${pages>1?Array.from({length:pages},(_,g)=>`<i class="${g===FZ.wpg?'on':''}"></i>`).join(''):''}</div>`
      :'<div class="wnone">No players match. Try fewer filters.</div>'}`;
}
const wvSt = () => cur==='draft' ? DR : FZ;
function wvGo(d){ const t=document.getElementById('wtrack'); if(!t) return; const n=t.children.length, st=wvSt();
  st.wpg=Math.max(0,Math.min(n-1,st.wpg+d)); t.scrollTo({left:st.wpg*t.clientWidth, behavior:'smooth'}); wvSync(); }
function wvSync(){ const t=document.getElementById('wtrack'); if(!t) return; const n=t.children.length, st=wvSt();
  document.querySelectorAll('.wdots i').forEach((x,g)=>x.classList.toggle('on',g===st.wpg));
  const [a,b]=document.querySelectorAll('.warr'); if(a){ a.disabled=st.wpg===0; b.disabled=st.wpg>=n-1; } }
function wvTrackHook(){ const st=wvSt(), wt=document.getElementById('wtrack'); if(!wt) return; wt.scrollLeft=st.wpg*wt.clientWidth; let to; wt.onscroll=()=>{ clearTimeout(to); to=setTimeout(()=>{ st.wpg=Math.round(wt.scrollLeft/wt.clientWidth); wvSync(); },80); }; }
function wvSearch(st=FZ, defHide=false){
  const f=Object.assign({q:'',avail:true,hide:defHide,team:''}, st.wf||{}), teams=[...new Set(PL.map(p=>p.t))].sort();
  const seg=(k,opts)=>`<div class="seg" data-k="${k}">${opts.map(([v,l])=>`<button data-v="${v}" class="${String(f[k])===String(v)?'on':''}">${l}</button>`).join('')}</div>`;
  const o=overlay(`<div class="sheet wsrch" style="--c:var(--blue)"><h3>🔍 SEARCH PLAYERS</h3>
    <label>NAME</label><input id="sq" placeholder="Search by name..." value="${f.q.replace(/"/g,'&quot;')}">
    <label>AVAILABLE TO ADD</label>${seg('avail',[[false,'ALL PLAYERS'],[true,'AVAILABLE ONLY']])}
    <label>INJURY STATUS</label>${seg('hide',[[false,'ALL'],[true,'HIDE OUT/INJ']])}
    <label>NBA TEAM</label><select id="st"><option value="">All Teams</option>${teams.map(t=>`<option ${f.team===t?'selected':''}>${t}</option>`).join('')}</select>
    <div class="acts"><button class="btn alt" id="sc">CLEAR</button><button class="btn" id="sg">SHOW PLAYERS</button></div></div>`);
  o.querySelectorAll('.seg').forEach(g=>g.querySelectorAll('button').forEach(b=>b.onclick=()=>{ f[g.dataset.k]=b.dataset.v==='true'; g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); }));
  const go=()=>{ f.q=o.querySelector('#sq').value.trim(); f.team=o.querySelector('#st').value; st.wf=f; st.wpg=0; o.remove(); render(); };
  o.querySelector('#sg').onclick=go; o.querySelector('#sq').onkeydown=e=>{ if(e.key==='Enter') go(); };
  o.querySelector('#sc').onclick=()=>{ st.wf=null; st.wpg=0; o.remove(); render(); };
  setTimeout(()=>o.querySelector('#sq').focus(),50);
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
  if(typeof rosterLocked==='function' && rosterLocked()){ lockSay(); return; }
  if(addsLeft()<=0){ say('No acquisitions left this matchup'); return; }
  if(typeof onWaivers==='function' && onWaivers(n)){ placeClaim(n); return; }
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

function wvOpen(n){ openPlayer(n, [['+ ADD', ()=>wvAdd(n)], [S.wv.scouted.includes(n)?'✓ SCOUTED':'🔭 SCOUT', ()=>wvScout(n)]]); }
/* SCHEDULE */
function fzSched(){
  const w=FZ.wk, st=WEEK_START(w), rows=weekPairs(w).map((pr,k)=>{ const [a,b]=pr.map(i=>TEAMS[i]);
    let sa='—', sb='—';
    if(SCORES[w]){ [sa,sb]=SCORES[w][k]; } else if(w===MU.week){ if(k===0){ sa=MU.me; sb=MU.opp; } else { sa=[0,301,270][k]; sb=[0,288,265][k]; } }
    const ra=record(pr[0]), rb=record(pr[1]), me=pr.includes(0);
    return `<div class="mrow ${me?'me':''}" onclick="say('Preview: box scores come later')"><div class="side"><span class="av" data-ch="${chOf(a)}"></span><span class="wl">${ra.w}-${ra.l}</span><small>${a.team.toUpperCase()}</small></div>
      <b class="${sa>sb?'hi':''}">${sa}</b><i>VS</i><b class="${sb>sa?'hi':''}">${sb}</b>
      <div class="side r"><span class="wl">${rb.w}-${rb.l}</span><span class="av" data-ch="${chOf(b)}"></span><small>${b.team.toUpperCase()}</small></div></div>`; }).join('');
  return `<div class="wkn"><button class="warr" ${w<=1?'disabled':''} onclick="FZ.wk=Math.max(1,FZ.wk-1);render()">◀</button><div>${w===MU.week?'▸ THIS WEEK':w<MU.week?'FINAL':'UPCOMING'}<b>${fmtD(st)} – ${fmtD(new Date(+st+6*864e5))}</b></div><button class="warr" ${w>=8?'disabled':''} onclick="FZ.wk=Math.min(8,FZ.wk+1);render()">▶</button></div>
    <div class="lbox"><h3>WEEK ${w} MATCH-UPS</h3><div class="sub">${fmtD(st).toUpperCase()} – ${fmtD(new Date(+st+6*864e5)).toUpperCase()}</div>${rows}<div class="foot">TAP A MATCH-UP FOR ITS BOX SCORE</div></div>`;
}
/* STANDINGS */
function fzStand(){
  const s=[...standings()]; if(FZ.ssort==='fp') s.sort((a,b)=>b.pf-a.pf);
  return `<div class="lbox"><h3>FALL RUN STANDINGS</h3><div class="sub">OCT 20 – DEC 27 · WEEK ${MU.week} OF 10</div>
    <div class="shead"><span>#</span><span>TEAM</span><span class="sk ${FZ.ssort==='wl'?'on':''}" onclick="FZ.ssort='wl';render()">W-L${FZ.ssort==='wl'?' ▼':''}</span><span class="sk ${FZ.ssort==='fp'?'on':''}" onclick="FZ.ssort='fp';render()">FP${FZ.ssort==='fp'?' ▼':''}</span></div>
    ${s.map((t,k)=>`<div class="srow ${t.me?'me':''} ${k===0?'first':''}" style="cursor:pointer" onclick="FZ.tab='roster';S.rq='full';FZ.view=${t.i};FZ.sel=null;render()"><span>${k+1}</span><span class="av" data-ch="${chOf(t)}"></span><span class="tn"><em>${t.team.toUpperCase()}</em></span><span class="${FZ.ssort==='wl'?'hl':''}">${t.w}-${t.l}</span><b class="${FZ.ssort==='fp'?'hl':''}" data-v="${t.pf}" title="${t.pf.toLocaleString()} FP">${kFmt(t.pf)}</b></div>`).join('')}
    <div class="foot">TAP A TEAM FOR ITS ROSTER</div></div>`;
}

/* VS splash: first visit to Fantasy each week */
function vsSplash(){
  const me=standings().find(t=>t.me), op=standings().find(t=>t.i===1);
  const g=document.createElement('div'); g.className='vss';
  g.innerHTML=`<div class="half a"><span id="vsa"></span><div><b>${ME.team.toUpperCase()}</b><small>${ME.name.toUpperCase()} · ${me.w}-${me.l}</small></div></div>
    <div class="half b"><div><b>${OPP.team.toUpperCase()}</b><small>${OPP.name.toUpperCase()} · ${op.w}-${op.l}</small></div><span id="vsb"></span></div>
    <div class="vsx">VS</div><div class="vwk">WEEK ${MU.week} · FALL RUN</div><div class="vtap">TAP TO CONTINUE</div>`;
  g.querySelector('#vsa').appendChild(ballerCv(S.active,4)); g.querySelector('#vsb').appendChild(ballerCv(OPP.ch||'bee',4));
  g.onclick=()=>{ g.classList.add('out'); setTimeout(()=>g.remove(),350); };
  document.getElementById('app').appendChild(g);
}

AFTER.fantasy = ()=>{
  wvTrackHook();
  const b=document.getElementById('bossSp'); if(b) b.appendChild(ballerCv(OPP.ch||'bee',3));
  const d=document.getElementById('dlg'); if(d) typewrite(d, battleText(), 45);
  standUp();
};
/* Standings: the first visit each day rolls every FP total up from zero, like the Challenge scores */
function kFmt(n){ n=+n||0; return n>=1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'k' : String(Math.round(n)); }
function standUp(){
  const els=[...document.querySelectorAll('.srow b[data-v]')]; if(!els.length || S.stUp===TODAY) return;
  S.stUp=TODAY; save();
  els.forEach((el,i)=>{ const tgt=+el.dataset.v; let v=0, t0=null; el.classList.add('roll');
    let lt=0; const step=ts=>{ if(t0==null) t0=ts; const k=Math.min(1,(ts-t0)/(1100+i*120)); v=tgt*(1-Math.pow(1-k,3)); el.textContent=kFmt(v); if(i===0&&ts-lt>70+300*k*k){ lt=ts; window.SFX?.('tick'); } if(k<1) requestAnimationFrame(step); else { el.textContent=kFmt(tgt); el.classList.remove('roll'); if(i===0) window.SFX?.('land'); } };
    el.textContent='0'; setTimeout(()=>requestAnimationFrame(step), 150+i*90); });
}
SCREENS.fantasy = fantasy;

/* Fantasy styles for this batch */
document.head.insertAdjacentHTML('beforeend',`<style>
.fz .mhead{align-items:center}
.runh{position:relative;flex:1;display:flex;align-items:center;gap:8px;min-width:0;justify-content:flex-end}
.rsel{font-size:6px;padding:6px 8px;border-radius:14px;border:2px solid var(--green);background:var(--card);color:var(--t1);cursor:pointer;white-space:nowrap}
.rprog{flex:1;min-width:0;max-width:150px}
.rtx{font-size:5px;color:var(--t2);margin-bottom:4px;white-space:nowrap}
.rsegs{display:flex;gap:2px}.rsegs i{flex:1;height:6px;background:#1c2740;border:1px solid #000}
.rsegs i.on{background:var(--green)}.rsegs i.cur{background:var(--gold);animation:blink 1.2s steps(2) infinite}
.rdrop{right:auto;left:0;width:230px}
.wint{text-align:center;padding:26px 16px}.wint .snow{font-size:30px}.wint b{display:block;font-weight:normal;font-size:12px;color:#9ad8ff;margin:10px 0}
.wint p{font-size:7px;line-height:1.9;color:var(--t2)}.wint .dim{color:var(--t3);font-size:6px}
.threat{display:flex;align-items:center;gap:10px;margin-top:12px;padding:8px;border:2px dashed #ff3b5c;border-radius:8px;background:rgba(255,59,92,.07);cursor:pointer}
.threat .ph{width:44px;height:44px;flex:none;border:2px solid #000;border-radius:6px;overflow:hidden;background:var(--tc)}
.threat .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.threat span{display:block;font-size:5px;color:#ff8fa0}.threat b{display:block;font-weight:normal;font-size:8px;color:var(--gold);margin:4px 0}
.threat small{display:block;font-size:5px;color:var(--t2)}
.wbtn2{display:flex;gap:6px}.srep.sm{font-size:5.5px;padding:6px 8px}
.qcap .clr{color:#ff8fa0;cursor:pointer;margin-left:8px}.qcap .dim{color:var(--t3);font-size:5px}
.wcar{display:grid;grid-template-columns:22px minmax(0,1fr) 22px;align-items:center;gap:4px}
.warr{height:60px;border:2px solid var(--edge);background:var(--card);color:var(--t1);border-radius:6px;font-size:8px;cursor:pointer;padding:0}
.warr:disabled{opacity:.25;cursor:default}
.wtrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.wtrack::-webkit-scrollbar{display:none}
.wpage{flex:0 0 100%;scroll-snap-align:start;padding:2px}
.wdots{display:flex;justify-content:center;gap:5px;margin-top:10px}.wdots i{width:6px;height:6px;background:#2a3858}.wdots i.on{background:var(--green)}
.tt.own{opacity:.55}.tt .inj{position:absolute;bottom:3px;left:3px;font-size:5px;background:var(--gold);color:#000;padding:2px 3px;border-radius:2px}.tt .inj.o{background:#ff3b5c;color:#fff}
.wnone{text-align:center;font-size:7px;color:var(--t3);padding:30px 0}
.wsrch label{display:block;font-size:6px;color:var(--t3);margin:12px 0 6px}
.wsrch input,.wsrch select{width:100%;box-sizing:border-box;font:inherit;font-size:8px;padding:10px;border-radius:8px;border:2px solid var(--edge);background:var(--bg2);color:var(--t1)}
.wsrch .seg{display:flex}.wsrch .seg button{flex:1}
.wsrch .acts{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.ssort{display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:5px;color:var(--t3);margin:-4px 0 8px}
.lbox .shead,.lbox .srow{grid-template-columns:16px 22px minmax(0,1fr) 34px 44px;gap:5px}
.lbox .srow{padding:4px 6px;font-size:6.5px}
.lbox .srow .av canvas{width:22px!important;height:22px!important}
.lbox .srow .tn{display:flex;align-items:baseline;gap:3px;overflow:hidden}
.lbox .srow .tn em{font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}
.lbox .srow .tn::after{content:'';flex:1 1 10px;min-width:10px;border-bottom:2px dotted #3b4a66;transform:translateY(-2px)}
.lbox .srow .hl{color:var(--t1)}.lbox .srow>span:nth-child(4){text-align:right;color:var(--t2)}.lbox .srow>b{color:var(--t2)}.lbox .srow>b.hl,.lbox .srow>span.hl{color:var(--t1)}
</style>`);

/* ════════════════════════════════════════════════════════════════════════════
   DRAFT · Winter Run. Real draft: Sat Dec 20, 8 PM ET; order drawn (snake) at 7 PM ET
   from the teams the Commissioner marks as in. Until then: a MOCK DRAFT against the CPU.
   ════════════════════════════════════════════════════════════════════════════ */
const DRAFT_AT = new Date('2026-12-20T20:00:00-05:00'), ORDER_AT = new Date('2026-12-20T19:00:00-05:00');
const DRAFT_ROUNDS = 10, PICK_SECS = 120;
const DR = {wpg:0, wf:null, mock:null};
function drTaken(){ return new Set((DR.mock?.picks||[]).map(x=>x.n)); }
function drList(){
  const t=drTaken(), f=DR.wf || {avail:true, hide:true};
  const q=(f.q||'').toLowerCase();
  return PL.filter(p=>(!f.avail||!t.has(p.n)) && (!q||p.n.toLowerCase().includes(q)) && (!f.team||p.t===f.team) && (!f.hide||!p.inj)).sort((a,b)=>b.f-a.f).slice(0,60);
}
const drBestAuto = () => PL.filter(p=>!drTaken().has(p.n) && !p.inj).sort((a,b)=>b.f-a.f)[0];
function drStart(){
  const ids=TEAMS.map((_,i)=>i), order=ids.map(i=>[i,Math.random()]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);
  const seq=[]; for(let r=0;r<DRAFT_ROUNDS;r++) seq.push(...(r%2?[...order].reverse():order));
  DR.mock={order, seq, picks:[], at:0, t0:Date.now()}; DR.wpg=0; drTick(); render(); say('Mock draft order drawn · snake format');
}
function drOnClock(){ const m=DR.mock; return m && m.at<m.seq.length ? m.seq[m.at] : null; }
function drPick(n, auto){
  const m=DR.mock, who=drOnClock(); if(who==null) return;
  m.picks.push({n, team:who, auto:!!auto, rd:Math.floor(m.at/m.order.length)+1}); m.at++; m.t0=Date.now();
  if(who===0) say(auto?`Time ran out · autodrafted ${nm(n)}`:`You drafted ${nm(n)}`);
  if(cur==='draft') render();
}
function drTick(){
  clearInterval(DR.iv);
  DR.iv=setInterval(()=>{ const m=DR.mock; if(!m || drOnClock()==null){ clearInterval(DR.iv); if(cur==='draft') render(); return; }
    const who=drOnClock(), left=PICK_SECS-Math.floor((Date.now()-m.t0)/1000);
    if(who!==0){ if(Date.now()-m.t0 > 900+hsh(m.at+'cpu')*900){ const top=PL.filter(p=>!drTaken().has(p.n)&&!p.inj).sort((a,b)=>b.f-a.f).slice(0,3); drPick(top[Math.floor(hsh(m.at+'pk')*top.length)].n); } }
    else if(left<=0){ const b=drBestAuto(); if(b) drPick(b.n, true); }
    const el=document.getElementById('drclock'); if(el){ const L=who===0?Math.max(0,left):PICK_SECS-Math.floor((Date.now()-m.t0)/1000); el.textContent=`${Math.floor(L/60)}:${String(L%60).padStart(2,'0')}`; el.classList.toggle('low', who===0 && L<=20); }
  }, 250);
}
/* tapping a player: DRAFT · CANCEL · STATS */
function drOpen(n){
  const p=P(n), taken=drTaken().has(n), mine=drOnClock()===0 && !taken;
  const o=overlay(`<div class="sheet drp" style="--c:#9ad8ff"><div class="drpc">${typeof pcard==='function'?pcard(n,{noTap:1}):face(p.t,p.n)}</div>
    <h3>${p.n.toUpperCase()}</h3><p>${p.t} · ${p.p} · ${p.f} FP/G${p.inj?` · <b style="color:#ff3b5c">${p.inj}</b>`:''}</p>
    <div class="acts3"><button class="btn" id="dd" ${mine?'':'disabled'}>${taken?'DRAFTED':mine?'DRAFT':DR.mock?'NOT YOUR PICK':'DRAFT NOT STARTED'}</button><button class="btn alt" id="dc">CANCEL</button><button class="btn alt" id="ds">STATS</button></div></div>`);
  o.querySelector('#dd').onclick=()=>{ o.remove(); drPick(n); };
  o.querySelector('#dc').onclick=()=>o.remove();
  o.querySelector('#ds').onclick=()=>{ o.remove(); const before=new Set(document.querySelectorAll('.ov')); openPlayer(n);
    /* closing the player card brings back Draft / Cancel / Stats */
    const box=[...document.querySelectorAll('.ov')].find(c=>!before.has(c));
    if(box){ const iv=setInterval(()=>{ if(!box.isConnected){ clearInterval(iv); if(cur==='draft' && !document.querySelector('.drp')) drOpen(n); } },120); } };
}
document.head.insertAdjacentHTML('beforeend',`<style>.drp{text-align:center}.drpc{width:120px;margin:0 auto 12px}.drp p{font-size:6.5px;color:var(--t2)}
.acts3{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;margin-top:14px}.acts3 .btn{font-size:7px;padding:12px 4px}.acts3 .btn:disabled{opacity:.4}</style>`);
function draft(){
  const m=DR.mock, now=new Date(), who=drOnClock(), tm=i=>TEAMS[i]||{team:'?'};
  const fmt=d=>d.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).toUpperCase()+' ET';
  let banner;
  if(!m){
    const dd=Math.max(0,Math.ceil((DRAFT_AT-now)/864e5));
    banner=`<div class="drb pre"><div class="k">WINTER RUN DRAFT</div><b>${fmt(DRAFT_AT)}</b><p>The draft order is drawn at random an hour before (${ORDER_AT.toLocaleString('en-US',{hour:'numeric',timeZone:'America/New_York'})} ET), snake format, from the teams the Commissioner has entered. Each pick gets 2:00. If time runs out, the app takes the highest FP/G player who isn't INJ or OUT.</p>
      <div class="cd">${dd>0?`${dd} DAY${dd>1?'S':''} TO GO`:'TONIGHT'}</div><button class="btn" onclick="drStart()">TRY A MOCK DRAFT ▶</button></div>`;
  } else if(who==null){
    banner=`<div class="drb done"><div class="k">MOCK DRAFT COMPLETE</div><b>${m.picks.length} PICKS</b><button class="btn alt" onclick="DR.mock=null;render()">START OVER</button></div>`;
  } else {
    const t=tm(who), rd=Math.floor(m.at/m.order.length)+1, pk=m.at%m.order.length+1, mine=who===0;
    banner=`<div class="drb ${mine?'me':''}"><div class="oc"><span class="av" data-ch="${mine?S.active:chOf(t)}"></span><div><div class="k">${mine?'YOU ARE ON THE CLOCK':'ON THE CLOCK'}</div><b>${t.team.toUpperCase()}</b><small>ROUND ${rd} · PICK ${pk} · #${m.at+1} OVERALL</small></div><div class="clk" id="drclock">2:00</div></div>
      <div class="nx">UP NEXT ${m.seq.slice(m.at+1,m.at+6).map(i=>`<span class="${i===0?'me':''}">${i===0?'YOU':tm(i).team.split(' ').pop().toUpperCase()}</span>`).join('')}</div></div>`;
  }
  const L=drList(), pages=Math.max(1,Math.ceil(L.length/6)); DR.wpg=Math.min(DR.wpg,pages-1);
  const taken=drTaken(), canPick=m&&who===0;
  const card=(p,k)=>`<div class="tt ${taken.has(p.n)?'own':''}" data-act="1" onclick="drOpen('${p.n.replace(/'/g,"\\'")}')"><div class="ph cw">${scard(p.n,{fm:'AVG',gl:p.p})}<span class="rk">${k+1}</span>${taken.has(p.n)?'<span class="owt">DRAFTED</span>':''}</div></div>`;
  const f=DR.wf;
  const mine=(m?.picks||[]).filter(x=>x.team===0);
  return mframe('fz dr','DRAFT', `${banner}
    <div class="wtop"><div class="qcap" style="margin:0">${f?`RESULTS · ${L.length} <span class="clr" onclick="DR.wf=null;DR.wpg=0;render()">✕ CLEAR</span>`:'AVAILABLE · HIGHEST FP/G · NO INJ/OUT'}</div><button class="srep sm blu" onclick="wvSearch(DR,true)">🔍 SEARCH</button></div>
    ${canPick?'<div class="drhint">TAP A PLAYER, THEN DRAFT HIM</div>':''}
    ${L.length?`<div class="wcar"><button class="warr" ${DR.wpg?'':'disabled'} onclick="wvGo(-1)">◀</button><div class="wtrack" id="wtrack">${Array.from({length:pages},(_,g)=>`<div class="tgrid wpage">${L.slice(g*6,g*6+6).map((p,k)=>card(p,g*6+k)).join('')}</div>`).join('')}</div><button class="warr" ${DR.wpg<pages-1?'':'disabled'} onclick="wvGo(1)">▶</button></div>
      <div class="wdots">${pages>1?Array.from({length:pages},(_,g)=>`<i class="${g===DR.wpg?'on':''}"></i>`).join(''):''}</div>`:'<div class="wnone">No players match.</div>'}
    ${m?`<div class="zbox"><span class="zl">YOUR PICKS · ${mine.length}/${DRAFT_ROUNDS}</span><div class="drmine">${mine.map(x=>{ const p=P(x.n); return `<div data-pn="${p.n.replace(/"/g,'&quot;')}"><div class="ph cw">${scard(p.n,{noTap:1,noinj:1,fm:'AVG',gl:'R'+x.rd})}</div></div>`; }).join('')||'<span class="dim">None yet</span>'}</div></div>
      <div class="zbox"><span class="zl">DRAFT LOG</span><div class="drlog">${m.picks.slice().reverse().slice(0,12).map((x,k)=>`<div class="${x.team===0?'me':''}"><span>#${m.picks.length-k}</span>${x.team===0?'YOU':tm(x.team).team.toUpperCase()}<b>${x.n}</b>${x.auto?'<i>AUTO</i>':''}</div>`).join('')||'<span class="dim">Waiting on the first pick</span>'}</div></div>`:''}`);
}
SCREENS.draft = draft;
AFTER.draft = ()=>{ wvTrackHook(); document.querySelectorAll('.drb .av[data-ch]').forEach(el=>{ if(!el.firstChild && BB.CHARS[el.dataset.ch]) el.appendChild(ballerCv(el.dataset.ch,2)); }); if(DR.mock && drOnClock()!=null && !DR.iv) drTick(); };
document.head.insertAdjacentHTML('beforeend',`<style>
.dr{--mc:#9ad8ff}
.drb{border:3px solid #000;box-shadow:0 0 0 2px #9ad8ff;border-radius:12px;padding:12px;background:linear-gradient(180deg,#10284a,#0a1530)}
.drb .k{font-size:6px;color:#9ad8ff;letter-spacing:.08em}
.drb.pre{text-align:center}.drb.pre b{display:block;font-weight:normal;font-size:10px;color:#fff;margin:8px 0}
.drb p{font-size:6px;line-height:1.9;color:var(--t2);margin:0 0 10px}
.drb .cd{font-size:8px;color:var(--gold);margin-bottom:12px}
.drb.done{text-align:center}.drb.done b{display:block;font-weight:normal;font-size:12px;margin:8px 0 12px}
.drb .oc{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
.drb .oc .av canvas{width:48px;height:48px}
.drb .oc b{display:block;font-weight:normal;font-size:9px;margin:5px 0}.drb .oc small{font-size:5px;color:var(--t3)}
.drb .clk{font-size:18px;color:#fff;text-shadow:0 3px 0 #000;min-width:70px;text-align:right}.drb .clk.low{color:#ff3b5c;animation:blink .6s steps(2) infinite}
.drb.me{box-shadow:0 0 0 2px var(--green),0 0 22px rgba(57,255,106,.35);background:linear-gradient(180deg,#0c3a1e,#062012)}.drb.me .k{color:var(--green);animation:blink 1s steps(2) infinite}
.drb .nx{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:5px;color:var(--t3);margin-top:10px}
.drb .nx span{padding:3px 5px;border:1px solid var(--edge);border-radius:4px;color:var(--t2)}.drb .nx span.me{border-color:var(--green);color:var(--green)}
.drhint{font-size:6px;color:var(--green);text-align:center;animation:blink 1.2s steps(2) infinite}
.drmine{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.drmine>div{text-align:center;min-width:0;cursor:pointer}.drmine .ph{aspect-ratio:1/1;border:2px solid #3b4a66;border-radius:5px;overflow:hidden;background:var(--tc)}
.drmine .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.drmine small{display:block;font-size:4.5px;color:var(--t3);margin-top:4px}.drmine b{display:block;font-weight:normal;font-size:5.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.drlog>div{display:grid;grid-template-columns:26px auto 1fr auto;gap:6px;align-items:center;font-size:5.5px;color:var(--t2);padding:5px 0;border-bottom:1px solid #16223c}
.drlog>div.me{color:var(--green)}.drlog b{font-weight:normal;color:var(--t1);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.drlog i{font-style:normal;color:var(--gold)}
.dim{font-size:6px;color:var(--t3)}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* match-up on one screen */
.boss{gap:10px}.boss .sp canvas{width:62px!important;height:62px!important}
.boss .bn{font-size:5.5px;line-height:1.6}.boss .bn b{font-size:7px}
.bhp{height:8px;margin:5px 0 3px}.bsc{font-size:14px!important;margin-top:4px}.bsc i{font-size:6px}
.rooms.in{margin-top:10px;gap:4px;align-items:stretch}.rooms.in .room{padding:4px 0;font-size:5px;display:flex;flex-direction:column;justify-content:center;min-height:42px}.rooms.in .room b{font-size:5.5px;white-space:nowrap;letter-spacing:-.04em}
/* a live day box picked up the app-wide .live label style (red dot + an 8px top margin), which made it shorter than the rest */
.rooms .room.live{margin-top:0;font-size:5px;color:var(--t3)}.rooms .room.live::before{content:none}
.threat{margin-top:10px}
.dlg{height:calc(3 * 2em + 24px);min-height:0!important;overflow-y:auto;scrollbar-width:none}.dlg::-webkit-scrollbar{display:none}
.tonight>div{flex:none;width:64px;text-align:center;font-size:5.5px;color:var(--t2);line-height:1.7}
.tonight .ph.cw{width:64px!important;margin-bottom:4px}
.tonight .tcard img{height:auto;object-fit:initial}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* run colors: Fall = orange, Winter = light blue */
.fz.run-fall{--mc:#ff9a1f}.fz.run-winter{--mc:#7fd4ff}
.fz .mtabs button{border-color:color-mix(in srgb,var(--mc) 45%,var(--edge))}
.fz .rsel{border-color:var(--mc)}.fz .rsegs i.on{background:var(--mc)}
.rdrop a.on{border:2px solid var(--mc);border-radius:6px}
.shead .sk{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}.shead .sk.on{color:var(--mc);text-decoration:none}
/* waiver arrows, styled like the roster team arrows */
.warr{height:40px!important;align-self:center;border:2px solid #000!important;border-radius:6px;background:#e94560!important;color:#fff!important;font-size:10px!important;box-shadow:0 3px 0 #7a1020}
.warr:disabled{background:#3b2a40!important;box-shadow:none;opacity:.5!important}
.wcar{grid-template-columns:30px minmax(0,1fr) 30px!important}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* Nov 20 · Fantasy */
.fz .mtabs button.on{background:var(--mc);border-color:var(--mc);color:#000;box-shadow:0 0 10px color-mix(in srgb,var(--mc) 45%,transparent)}
.dlg{height:calc(2 * 2em + 20px)!important}
.shead span:nth-child(3),.shead span:nth-child(4),.srow>span:nth-child(4),.srow>b{text-align:center!important;justify-self:center}
.srow b.roll{color:var(--gold)}
.wkn .warr{height:32px!important;width:100%}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* small cards carry their own name/game/FP, so lists show nothing extra underneath */
.ph.cw>.owt{position:absolute;left:50%;bottom:22%;transform:translateX(-50%) rotate(-8deg);z-index:9;font-size:5px;padding:3px 4px;background:#39ff6a;color:#000;border:1px solid #000;box-shadow:1px 1px 0 #000;white-space:nowrap}
.tt.own .ph.cw>.owt{background:#9ad8ff}
.tonight>div{font-size:0}
.tonight .ph.cw{width:84px!important}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
.drmine{gap:0!important}.drmine>div .ph.cw{width:124%!important;max-width:none}.drmine>div:last-child .ph.cw{width:100%!important}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
.fpt{display:grid!important;grid-template-columns:1fr 1fr;gap:4px}.fpt button{min-width:0;width:100%;text-align:center;white-space:nowrap}
/* schedule: long team names stay inside their box */
.mrow{grid-template-columns:minmax(0,1fr) auto auto auto minmax(0,1fr)!important}.mrow .side{min-width:0}.mrow .side small{display:block;max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>`);
document.head.insertAdjacentHTML('beforeend',`<style>
/* draft clock: Baller tucked into the top-left corner, text beside it */
.drb .oc{grid-template-columns:38px minmax(0,1fr) auto!important;align-items:start!important}
.drb .oc .av{position:static!important;display:block;width:38px;height:38px;transform:none!important}
.drb .oc .av canvas{width:38px!important;height:38px!important;display:block}
.drb .oc>div:nth-child(2){min-width:0}
.drb .oc b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.drb .oc small{display:block;line-height:1.6}
</style>`);
