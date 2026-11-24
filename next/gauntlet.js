/* NBA Arcade · NEXT · WEEKLY GAUNTLET (test mode, Nov 24)
   A Weekly Challenge revamp. Each day of the week has a BOSS: an NBA player with a game that day.
   You pick 1 fighter per day from 4 other players with games that day, all within 5 FP/G of each other.
   Your fighter beats the boss if he scores more FP that day. 1 point per boss defeated.
   Picks lock at Monday's first tip-off. Sample data only (this is a design test, not wired to the league). */

const GZ = {sel:null, phase:null};
const GDAY = ['M','TU','W','TH','F','SA','SU'];
const gPhase = () => GZ.phase || S.gtPhase || 'pick';

/* The week's board: for each day, a 5 FP/G band (different band each day) with 5 players who play that day */
function gBoard(){
  const wk = (typeof weekKey==='function') ? weekKey() : 'wk';
  if(gBoard.c && gBoard.k===wk) return gBoard.c;
  const used=new Set(), out=[];
  const pool=PL.filter(p=>p.n && isFinite(+p.f) && +p.f>0 && !(/OUT/.test(p.inj||''))).sort((a,b)=>b.f-a.f).slice(0,160);
  for(let di=0; di<7; di++){
    const plays = pool.filter(p=>{ if(used.has(p.n)) return false; let g=''; try{ g=dayGame(p.n,di); }catch(e){} return g && g!=='NO GAME' && g!=='—'; });
    const src = plays.length>=5 ? plays : pool.filter(p=>!used.has(p.n));   // no schedule for that day yet? use anyone
    const starts=[...Array(24)].map((_,k)=>14+k).sort((a,b)=>hsh(wk+di+a)-hsh(wk+di+b));   // a different band each day
    let row=null;
    for(const lo of starts){ const band=src.filter(p=>p.f>=lo && p.f<=lo+5); if(band.length>=5){ const pick=band.sort((a,b)=>hsh(wk+di+a.n)-hsh(wk+di+b.n)).slice(0,5); row={lo, boss:pick[0].n, fighters:pick.slice(1).map(p=>p.n)}; break; } }
    if(!row){ const pick=src.slice().sort((a,b)=>b.f-a.f).slice(0,5); row={lo:null, boss:pick[0]?.n, fighters:pick.slice(1).map(p=>p.n)}; }
    [row.boss,...row.fighters].forEach(n=>used.add(n)); out.push(row);
  }
  gBoard.k=wk; gBoard.c=out; return out;
}
/* Sample FP for finished days (deterministic) */
const gFP = (n, di) => Math.round((+P(n).f||15) * (.45 + hsh(n+'|g'+di) * 1.1));
const gDone = di => gPhase()==='live' && di < TODAY_I;
const gWon = (n, di) => gFP(n,di) > gFP(gBoard()[di].boss, di);

function gMy(){ const wk=(typeof weekKey==='function')?weekKey():'wk'; if(!S.gt || S.gt.wk!==wk) S.gt={wk, picks:{}, saved:false}; return S.gt; }
/* Everyone else's picks (sample) */
function gEntries(){
  const B=gBoard(), me=gMy();
  const users=TEAMS.map((t,i)=>({i, m:i===0?ME.name:t.m, ch:i===0?S.active:chOf(t), me:i===0}));
  return users.map(u=>{ const picks=B.map((r,di)=> u.me ? (me.picks[di]||null) : r.fighters[Math.floor(hsh(u.m+'|gp'+di)*r.fighters.length)]);
    const wins=picks.filter((n,di)=>n && gDone(di) && gWon(n,di)).length; return {...u, picks, wins}; })
    .sort((a,b)=>b.wins-a.wins || a.m.localeCompare(b.m)).map((e,k,arr)=>({...e, rank:arr.findIndex(x=>x.wins===e.wins)+1}));
}

/* ── SCREEN ── */
function gauntlet(){
  try{ return gauntletInner(); }catch(e){ return mframe('cz gt','GAUNTLET', `<div class="gpv empty"><p>The Gauntlet hit a snag loading this week.<br><small style="color:var(--t3)">${String(e.message||e).replace(/</g,'&lt;')}</small></p></div>`); }
}
function gauntletInner(){
  const me=gMy(), B=gBoard(), live=gPhase()==='live';
  const head=`<button class="rules" onclick="gSplash(true)">ⓘ RULES</button>`;
  const sw=`<div class="gsw"><span>PREVIEW</span><button class="${!live?'on':''}" onclick="S.gtPhase='pick';save();render()">PICKING</button><button class="${live?'on':''}" onclick="S.gtPhase='live';save();render()">IN PROGRESS</button></div>`;
  if(live) return mframe('cz gt','GAUNTLET', sw + gLeader() + gActive(), head);
  // ── SELECT ──
  const sel=GZ.sel, sp=sel?P(sel.n):null, isBoss=sel&&sel.boss;
  const stick = `<div class="gstick">${sel ? `<div class="gpv">
      <div class="pp cw">${scard(sel.n,{fm:'AVG',noTap:1})}</div>
      <div class="gpi"><small>${isBoss?`<b class="bs">BOSS</b> · ${DAYN[sel.di]}`:`${DAYN[sel.di]} FIGHTER`}</small><h3>${sp.n.toUpperCase()}</h3><p>${sp.t} · ${sp.p} · ${dayGame(sel.n,sel.di)}</p>
        <div class="gst"><div><b>${(+sp.f).toFixed(1)}</b>FP/G</div><div><b>${sp.l5}</b>LAST 5</div><div><b>${sp.fall}</b>FALL</div></div>
        ${isBoss?'':`<div class="ga"><button class="btn alt" onclick="GZ.sel=null;render()">CANCEL</button><button class="btn" onclick="gPick(${sel.di},'${sel.n.replace(/'/g,"\\'")}')">${me.picks[sel.di]===sel.n?'✓ SELECTED':'SELECT'}</button></div>`}</div></div>`
    : `<div class="gpv empty"><p>Tap a <b class="bs">BOSS</b> to scout him, or a fighter to pick him for that day.</p></div>`}</div>`;
  const rows = B.map((r,di)=>`<div class="grow"><b class="gd">${GDAY[di]}</b>
      <div class="gboss ${sel&&sel.di===di&&sel.boss?'cur':''}" data-act="1" onclick="GZ.sel={di:${di},n:'${r.boss.replace(/'/g,"\\'")}',boss:true};render()"><div class="ph cw">${scard(r.boss,{fm:'AVG',noTap:1})}</div><i>BOSS</i></div>
      <div class="gfs">${r.fighters.map(n=>`<div class="gf ${me.picks[di]===n?'in':''} ${sel&&sel.di===di&&sel.n===n?'cur':''}" data-act="1" onclick="GZ.sel={di:${di},n:'${n.replace(/'/g,"\\'")}'};render()"><div class="ph cw">${scard(n,{fm:'AVG',noTap:1})}</div></div>`).join('')}</div></div>`).join('');
  const n=Object.keys(me.picks).length, ready=n===7;
  return mframe('cz gt','GAUNTLET', `${sw}${stick}
    <div class="ghd"><span>BOSS</span><span>CHOOSE 1 FIGHTER FOR EACH DAY</span></div>
    <div class="gboard">${rows}</div>
    <div class="cbar gbar"><div><div class="l">PICKED</div><div class="v" style="color:var(--teal)">${n}/7</div></div>
      <button ${n?'':'disabled'} onclick="S.gt.picks={};GZ.sel=null;save();render()">START<br>OVER</button>
      <button class="save ${ready?'ready':''}" ${ready&&!me.saved?'':'disabled'} onclick="gSubmit()">${me.saved?'SUBMITTED ✓':'SUBMIT'}</button></div>`, head);
}
function gPick(di, n){ const me=gMy(); if(me.saved){ say('Your Gauntlet is locked in'); return; } if(me.picks[di]===n) delete me.picks[di]; else me.picks[di]=n; GZ.sel=null; save(); render();
  if(Object.keys(me.picks).length===7) say('All 7 days picked · submit when ready'); }
function gSubmit(){
  const o=overlay(`<div class="sheet" style="--c:var(--orange)"><h3>SUBMIT YOUR GAUNTLET?</h3><p>Seven fighters, one per day. Once submitted, your picks are final for the week.</p>
    <div class="acts"><button class="btn alt" id="no">NOT YET</button><button class="btn" id="yes">SUBMIT</button></div></div>`);
  o.querySelector('#no').onclick=()=>o.remove();
  o.querySelector('#yes').onclick=()=>{ o.remove(); gMy().saved=true; save(); render(); window.SFX?.('saved'); say('Gauntlet submitted · good luck'); };
}

/* ── ACTIVE: everyone's seven fighters, fanned. Beat the boss → green glow; lose → the card is torn ── */
const RIPS=['rip-d','rip-z','rip-x','rip-c'];
function gCard(n, di, who){
  if(!n) return `<div class="gc empty"><span>${GDAY[di]}</span></div>`;
  const done=gDone(di), won=done&&gWon(n,di), rip=RIPS[Math.floor(hsh(who+'|'+di)*RIPS.length)];
  const face=scard(n,{fm:'AVG',noTap:1,gl:GDAY[di],fpv:done?`${gFP(n,di)} FP`:null});
  return `<div class="gc ${done?(won?'won':'lost '+rip):'tbd'}" title="${GDAY[di]} · vs ${P(gBoard()[di].boss).s}">
    ${done&&!won ? `<div class="h1">${face}</div><div class="h2">${face}</div>${rip==='rip-x'?'<i class="xx"></i>':''}` : face}</div>`;
}
function gActive(){
  const E=gEntries();
  return `<div class="gents">${E.map(e=>`<div class="gent ${e.me?'me':''}"><div class="gn"><span class="av" data-ch="${e.ch}"></span><b>${e.m}</b><i>${e.wins} ${e.wins===1?'WIN':'WINS'}</i></div>
    <div class="g7">${e.picks.map((n,di)=>gCard(n,di,e.m)).join('')}</div></div>`).join('')}</div>`;
}
function gStory(){
  const di=TODAY_I-1; if(di<0) return 'THE FIRST BOSS FIGHT IS TONIGHT';
  const boss=P(gBoard()[di].boss).s, E=gEntries(), beat=E.filter(e=>e.picks[di] && gWon(e.picks[di],di));
  if(!beat.length) return `NO ONE COULD BEAT ${boss.toUpperCase()} YESTERDAY`;
  if(beat.length===1) return `YESTERDAY, ONLY ${beat[0].m.toUpperCase()} DEFEATED ${boss.toUpperCase()}, CHOOSING ${P(beat[0].picks[di]).s.toUpperCase()} AS ${beat[0].me?'YOUR':'THEIR'} FIGHTER`;
  if(beat.length===E.length) return `EVERYONE TOOK DOWN ${boss.toUpperCase()} YESTERDAY`;
  return `${beat.length} OF ${E.length} DEFEATED ${boss.toUpperCase()} YESTERDAY`;
}
function gLeader(){
  const E=gEntries().slice(0,3);
  return `<div class="hs gl"><div class="t">LEADERBOARD</div><div class="th">WEEKLY GAUNTLET · ${typeof cDates==='function'?cDates():''}</div>
    <div class="hd"><span>RANK</span><span></span><span>NAME</span><span></span><span>VICTORIES</span></div>
    ${E.map(e=>`<div class="r c${e.rank}"><span>${ordinal(e.rank).toUpperCase()}</span><span class="sp" data-ch="${e.ch}"></span><span class="nm">${e.m.slice(0,3).toUpperCase()}</span><span class="dots">..........</span><span class="sc">${e.wins}</span></div>`).join('')}
    <div class="coin">${gStory()}</div></div>`;
}

/* ── SPLASH (first visit each week) ── */
function gSplash(force){
  const wk=(typeof weekKey==='function')?weekKey():'wk';
  if(!force && (S.gtSplash===wk || document.querySelector('.csplash'))) return;
  const g=document.createElement('div'); g.className='csplash gsplash';
  g.innerHTML=`<div class="cs0">THIS WEEK'S CHALLENGE</div>
    <div class="glogo"><span class="g1">NBA</span><span class="g2">GAUNTLET</span><i class="sw s1"></i><i class="sw s2"></i></div>
    <div class="csd">${typeof cDates==='function'?cDates():''}</div>
    <ul><li>You will fight a different <b>Boss</b> each day.</li><li>For each day, pick <b>1 player</b> you think will earn more FP.</li><li>Picks lock at <b>Monday's first tip-off</b>.</li><li>Earn 1 point for each boss you defeat.</li></ul>
    <button class="btn">LET'S GO ▶</button>`;
  g.querySelector('.btn').onclick=()=>{ S.gtSplash=wk; save(); dissolve(()=>g.remove(), '#020c18'); };
  document.getElementById('app').appendChild(g);
}
SCREENS.gauntlet = gauntlet;
AFTER.gauntlet = ()=>{ try{ document.querySelectorAll('.gt .av[data-ch], .gt .sp[data-ch]').forEach(el=>{ if(!el.firstChild && BB.CHARS[el.dataset.ch]) el.appendChild(ballerCv(el.dataset.ch,1)); }); gSplash(); }catch(e){} };

document.head.insertAdjacentHTML('beforeend',`<style>
.gt{--mc:#ff3b5c}
.gsw{display:flex;align-items:center;gap:6px;font-size:5px;color:var(--t3);margin:-2px 0 10px}
.gsw button{font:inherit;font-size:5.5px;padding:6px 8px;border-radius:6px;border:2px solid var(--edge);background:var(--card);color:var(--t2);cursor:pointer}.gsw button.on{border-color:var(--mc);color:#fff;background:rgba(255,59,92,.15)}
.gstick{position:sticky;top:0;z-index:6;padding:4px 0 8px;background:linear-gradient(180deg,var(--bg) 85%,transparent)}
.gpv{display:grid;grid-template-columns:74px 1fr;gap:10px;align-items:start;padding:10px;border:2px solid var(--edge);border-radius:10px;background:var(--card)}
.gpv.empty{display:block;text-align:center}.gpv.empty p{margin:6px 0;font-size:6px;line-height:2;color:var(--t2)}
.gpv .pp{width:74px}
.gpi small{font-size:5px;color:var(--t3)}.gpi h3{margin:5px 0 4px;font-size:9px;font-weight:normal;line-height:1.3}.gpi p{margin:0 0 7px;font-size:5px;color:var(--t2)}
.gst{display:flex;gap:10px}.gst div{font-size:4.5px;color:var(--t3)}.gst b{display:block;font-weight:normal;font-size:9px;color:#fff;margin-bottom:3px}
.ga{display:flex;gap:6px;margin-top:9px}.ga .btn{flex:1;font-size:6px;padding:8px 4px}
b.bs{font-weight:normal;color:#ff5a3c;text-shadow:0 0 6px rgba(255,90,60,.6)}
.ghd{display:grid;grid-template-columns:22px 19% 1fr;gap:6px;font-size:5px;color:var(--t3);margin:4px 0 6px;padding:0 2px}.ghd span:first-child{grid-column:2}.ghd span:last-child{padding-left:8px}
.gboard{display:flex;flex-direction:column;gap:9px}
.grow{display:grid;grid-template-columns:22px 19% 1fr;gap:6px;align-items:center}
.gd{font-weight:normal;font-size:7px;color:var(--gold);text-align:center}
.gboss{position:relative;cursor:pointer;padding:3px;border-radius:7px;background:repeating-linear-gradient(45deg,#ff3b5c 0 4px,#7a0016 4px 8px);box-shadow:0 0 10px rgba(255,59,92,.5)}
.gboss>i{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font-style:normal;font-size:4.5px;color:#fff;background:#c4122f;padding:2px 4px;border:1px solid #000;z-index:4}
.gboss.cur{box-shadow:0 0 0 2px #fff,0 0 14px rgba(255,59,92,.8)}
.gfs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding-left:8px;border-left:2px dashed var(--edge)}
.gf{cursor:pointer;border-radius:6px;padding:2px;border:2px solid transparent}.gf.cur{border-color:#fff}.gf.in{border-color:var(--green);box-shadow:0 0 10px rgba(57,255,106,.45)}
.gboard .rc-bot{font-size:3.8px;letter-spacing:-.04em}
.gbar{position:sticky;bottom:0;margin-top:14px;z-index:7}
.gboard{padding-bottom:6px}
.gc.lost .h1 .rc16,.gc.lost .h2 .rc16{filter:grayscale(.75) brightness(.7) drop-shadow(0 2px 0 #000)}
/* active */
.gl{margin-bottom:14px}.gl .hd,.gl .r{grid-template-columns:30px 26px 34px minmax(0,1fr) 54px!important}
.gents{display:flex;flex-direction:column;gap:12px}
.gent{padding:9px 9px 11px;border:2px solid var(--edge);border-radius:10px;background:var(--card)}.gent.me{border-color:var(--mc)}
.gn{display:flex;align-items:center;gap:8px;margin-bottom:8px}.gn .av canvas{width:22px;height:22px}.gn b{font-weight:normal;font-size:7px;flex:1}.gn i{font-style:normal;font-size:6px;color:var(--green)}
.g7{display:flex;justify-content:center}
.gc{position:relative;flex:0 0 16.5%;max-width:16.5%;margin-right:-2.6%}.gc:last-child{margin-right:0}
.gc:nth-child(odd){transform:rotate(-2deg)}.gc:nth-child(even){transform:rotate(2deg) translateY(-2px)}
.gc .rc-bot{font-size:3.4px;letter-spacing:-.05em}.gc .rc-top .nm{font-size:3.2px!important}
.gc.empty{aspect-ratio:5/7;border:2px dashed var(--edge);border-radius:6px;display:grid;place-items:center;font-size:6px;color:var(--t3)}
.gc.won .rc16{filter:drop-shadow(0 0 5px #39ff6a) drop-shadow(0 0 2px #39ff6a)}
.gc.lost{isolation:isolate}
.gc.lost .h1,.gc.lost .h2{position:relative}.gc.lost .h2{position:absolute;inset:0}
.gc.lost .rc16{filter:grayscale(.75) brightness(.7)}
/* rip 1: diagonal tear */
.gc.rip-d .h1{clip-path:polygon(0 0,100% 0,100% 38%,70% 44%,45% 52%,20% 58%,0 64%);transform:translate(-4px,-6px) rotate(-6deg)}
.gc.rip-d .h2{clip-path:polygon(0 66%,20% 60%,45% 54%,70% 46%,100% 40%,100% 100%,0 100%);transform:translate(4px,6px) rotate(5deg)}
/* rip 2: zigzag across the middle */
.gc.rip-z .h1{clip-path:polygon(0 0,100% 0,100% 50%,88% 46%,76% 53%,63% 46%,50% 53%,37% 46%,24% 53%,12% 46%,0 52%);transform:translate(-2px,-8px) rotate(-4deg)}
.gc.rip-z .h2{clip-path:polygon(0 54%,12% 48%,24% 55%,37% 48%,50% 55%,63% 48%,76% 55%,88% 48%,100% 52%,100% 100%,0 100%);transform:translate(2px,7px) rotate(3deg)}
/* rip 3: torn corner + big X */
.gc.rip-x .h1{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}.gc.rip-x .h2{display:none}
.gc.rip-x .xx{position:absolute;inset:8%;z-index:5;pointer-events:none;background:linear-gradient(45deg,transparent 46%,#ff3b5c 46% 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,#ff3b5c 46% 54%,transparent 54%);filter:drop-shadow(0 1px 0 #000)}
/* rip 4: cracked with a red glow, upper-right shard knocked loose */
.gc.rip-c .h1{clip-path:polygon(0 0,58% 0,48% 30%,62% 44%,40% 70%,55% 100%,0 100%)}
.gc.rip-c .h2{clip-path:polygon(60% 0,100% 0,100% 100%,57% 100%,42% 70%,64% 44%,50% 30%);transform:translate(6px,3px) rotate(8deg)}
.gc.rip-c{filter:drop-shadow(0 0 5px rgba(255,59,92,.8))}
/* splash logo */
.glogo{position:relative;margin:12px auto 10px;padding:16px 18px 14px;width:max-content;max-width:100%;text-align:center;transform:skewX(-8deg);background:linear-gradient(180deg,#2a0008,#5c0014);border:3px solid #000;box-shadow:0 0 0 2px #ff3b5c,0 0 26px rgba(255,59,92,.55)}
.glogo .g1{display:block;font-size:9px;color:#ffd93d;letter-spacing:.3em;margin-bottom:6px}
.glogo .g2{display:block;font-size:22px;color:#fff;text-shadow:3px 3px 0 #c4122f,5px 5px 0 #000;letter-spacing:.02em}
.glogo .sw{position:absolute;top:50%;width:26px;height:4px;background:linear-gradient(90deg,#c9d0de,#fff);box-shadow:0 0 0 1px #000}
.glogo .s1{left:-18px;transform:rotate(35deg)}.glogo .s2{right:-18px;transform:rotate(-35deg)}
</style>`);
