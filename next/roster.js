/* NBA Arcade · new site · ROSTER as a 16-bit card select screen, plus the player lightbox.
   Cards: Pokémon-style collectibles drawn like Balatro (pixelated art, chunky frames, idle wobble).
   Tap a card → player lightbox. Press and hold → drag it onto another slot to swap.
   AUTO-SET TODAY / AUTO-SET WEEK sort your line-up and flag problems. */

const escA = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const rarity = f => f>=30 ? 'legend' : f>=24 ? 'gold' : f>=18 ? 'silver' : 'bronze';
const RARE_LBL = {legend:'★ LEGEND', gold:'GOLD', silver:'SILVER', bronze:'BRONZE'};

/* ── Pixel art: portraits redrawn small and posterized, then shown big with hard pixels ── */
const PIXIMG = new Map();
function pixLoad(src){
  if(PIXIMG.has(src)) return PIXIMG.get(src);
  const p = new Promise(res=>{ const a=new Image(); a.crossOrigin='anonymous'; a.onload=()=>res({im:a, cors:true});
    a.onerror=()=>{ const b=new Image(); b.onload=()=>res({im:b, cors:false}); b.onerror=()=>res(null); b.src=src; }; a.src=src; });
  PIXIMG.set(src,p); return p;
}
const pix = (team, name, w=40, h=48) => `<canvas class="pix" width="${w}" height="${h}" data-src="${escA(pimg(team,name))}" data-tc="${TC[team]||'#1e3258'}"></canvas>`;
function paintPix(root=document){
  root.querySelectorAll('canvas.pix:not([data-done])').forEach(async cv=>{
    cv.dataset.done=1; const g=cv.getContext('2d'), W=cv.width, H=cv.height, tc=cv.dataset.tc;
    // dithered team-colour backdrop
    g.fillStyle=tc; g.fillRect(0,0,W,H); g.fillStyle='rgba(0,0,0,.28)';
    for(let y=0;y<H;y++) for(let x=(y%2);x<W;x+=2) if(y>H*.45) g.fillRect(x,y,1,1);
    g.fillStyle='rgba(255,255,255,.10)'; for(let y=0;y<H*.35;y+=2) for(let x=(y/2)%2;x<W;x+=2) g.fillRect(x,y,1,1);
    const r = await pixLoad(cv.dataset.src);
    if(!r){ g.fillStyle='rgba(0,0,0,.45)'; g.beginPath(); g.arc(W/2,H*.42,W*.2,0,7); g.fill(); g.fillRect(W*.18,H*.66,W*.64,H*.34); return; }
    const {im}=r, s=Math.max(W/im.width, H/im.height), dw=im.width*s, dh=im.height*s;
    g.imageSmoothingEnabled=true; g.drawImage(im, (W-dw)/2, -(dh-H)*.08, dw, dh);
    if(r.cors){ try{ const d=g.getImageData(0,0,W,H), a=d.data;         // posterize → 16-bit palette feel
        for(let i=0;i<a.length;i+=4){ for(let k=0;k<3;k++){ const v=Math.min(255,a[i+k]*1.08); a[i+k]=Math.round(v/51)*51; } }
        g.putImageData(d,0,0); }catch(e){} }
  });
}

/* ── One card ── */
function card16(n, pos, o={}){
  if(!n) return `<div class="rc16 empty ${pos&&pos[0]==='i'?'irs':''}" ${pos?`data-pos="${pos}"`:''}><div class="rc-in"><div class="rc-art"><span class="plus">${pos&&pos[0]==='i'?'IR':'+'}</span></div><div class="rc-bot"><b>${pos&&pos[0]==='i'?'EMPTY IR':'OPEN SLOT'}</b></div></div></div>`;
  const p=P(n), rr=rarity(p.f), di=FZ.day, g = (()=>{ const sv=p.inj; if(sv!=='OUT') return dayGame(n,di); p.inj=null; try{ return dayGame(n,di); } finally{ p.inj=sv; } })(), off = g==='NO GAME';
  const fm = fpMode(), fr = fpFor(p), fp = (fr==='—'||fr==null||fr==='') ? '—' : `${fm==='DAY'?fr:Math.ceil(parseFloat(fr))} FP`;
  /* footer: game on the left (start time, LIVE/FINAL, OFF or OUT), FP on the right (orange = FP/G, blue = today) */
  const gl = off ? 'OFF' : /FINAL/i.test(g) ? 'FINAL' : /^\d/.test(g) ? g.split(' ')[0].replace(/P$/,'') : 'LIVE';
  return `<div class="rc16 r-${rr} ${p.inj==='OUT'?'out':''} ${off?'idle':''} ${o.p1?'p1':''}" data-own="1" ${pos?`data-pos="${pos}"`:''} data-pn="${escA(n)}" style="--tc:${p.c};--d:${(hsh(n)*-4).toFixed(2)}s">
    <div class="rc-in"><div class="rc-top"><span class="nm" style="${p.s.length>9?`font-size:${Math.max(3.4,46/p.s.length).toFixed(1)}px`:''}">${p.s}</span></div>
    <div class="rc-art ${typeof pxArt==='function'?pxArt(n):''}">${face(p.t,p.n)}${o.p1?'<span class="p1t">P1</span>':''}${p.inj&&!o.noinj?`<span class="injb ${p.inj==='OUT'?'o':''}">${p.inj}</span>`:''}</div>
    <div class="rc-bot"><b class="gm ${gl==='OFF'?'x':''}">${gl}</b><i class="fp ${fm==='DAY'?'d':'a'}">${fp}</i></div></div></div>`;
}

/* ── Line-up helpers (live.js swaps these for the real engine) ── */
var commitLineup = () => { save(); };            // write S.fl back
var commitPlan = (di, names) => { (S.plans ||= {})[di] = names; save(); };
var lockedN = n => false;                         // has this player's game started?
const playsOn = (n, di) => !!n && !isOut(n) && (di===TODAY_I ? plays(n) : dayGame(n, di)!=='NO GAME');
const lineupScore = (n, di) => (isOut(n)?-500:0) + (playsOn(n,di)?100:0) + P(n).f;

function bestFor(di, pool){
  const locked = pool.filter(n=>lockedN(n)), lockedAct = locked.filter(n=>S.fl.act.includes(n));
  const free = pool.filter(n=>!locked.includes(n)).sort((a,b)=>lineupScore(b,di)-lineupScore(a,di));
  const act = [...lockedAct, ...free.slice(0, Math.max(0, 8-lockedAct.length))];
  return {act, bench: pool.filter(n=>!act.includes(n)), locked};
}
function lineupIssues(di=TODAY_I, pool){
  pool ||= [...S.fl.act, ...S.fl.bench].filter(Boolean);
  const out=[], playing=pool.filter(n=>playsOn(n,di)), outs=pool.filter(isOut);
  if(outs.length && !S.fl.ir[0]) out.push({w:'ir', t:`${nm(outs[0])} is OUT · move him to IR to free a spot`});
  if(outs.length>1 || (outs.length && S.fl.ir[0])) out.push({w:'inj', t:`${outs.filter(n=>n!==outs[0]||S.fl.ir[0]).map(nm).join(', ')} OUT · your IR spot is full`});
  if(S.fl.ir[0] && !isOut(S.fl.ir[0])) out.push({w:'ir2', t:`${nm(S.fl.ir[0])} is healthy but still on IR`});
  if(playing.length>8) out.push({w:'many', t:`${playing.length} players have games but only 8 slots · ${bestFor(di,pool).bench.filter(n=>playsOn(n,di)).map(nm).join(' & ')} sit`});
  if(playing.length<8) out.push({w:'few', t:`Only ${playing.length} of your players have a game${di===TODAY_I?' today':''} · ${8-playing.length} slot${8-playing.length>1?'s':''} will score 0`});
  return out;
}
function autoDay(silent){
  const ch=[], before=new Set(S.fl.act.filter(Boolean));
  if(!S.fl.ir[0]){ for(const k of ['act','bench']) S.fl[k].forEach((n,i)=>{ if(n && isOut(n) && !S.fl.ir[0] && !lockedN(n)){ S.fl.ir[0]=n; S.fl[k][i]=null; ch.push(`${nm(n)} → IR`); } }); }
  const pool=[...S.fl.act, ...S.fl.bench].filter(Boolean), b=bestFor(TODAY_I, pool);
  S.fl.act=[...b.act]; while(S.fl.act.length<8) S.fl.act.push(null);
  S.fl.bench=[...b.bench]; while(S.fl.bench.length<2) S.fl.bench.push(null);
  b.act.filter(n=>!before.has(n)).forEach(n=>ch.push(`${nm(n)} IN`));
  [...before].filter(n=>!b.act.includes(n) && S.fl.ir[0]!==n).forEach(n=>ch.push(`${nm(n)} OUT`));
  commitLineup(); FZ.day=TODAY_I;
  if(!silent){ render(); lineupSheet('TODAY', ch, lineupIssues().filter(x=>x.w!=='ir'), b.locked); lineupCheck(); }
  return ch;
}
function autoWeek(){
  const ch=autoDay(true), rows=[];
  for(let di=TODAY_I; di<7; di++){
    const pool=[...S.fl.act, ...S.fl.bench].filter(Boolean), b=di===TODAY_I?{act:S.fl.act.filter(Boolean)}:bestFor(di,pool);
    if(di>TODAY_I) commitPlan(di, b.act);
    const n=b.act.filter(x=>playsOn(x,di)).length, games=pool.filter(x=>playsOn(x,di)).length;
    rows.push(`<div class="wkrow ${n<8?'warn':''}"><b>${DAYN[di]}</b><span>${n} of 8 slots playing${games>8?` · ${games-8} sit`:''}</span><i>${n<8?'!':'✓'}</i></div>`);
  }
  render(); lineupCheck();
  overlay(`<div class="sheet" style="--c:var(--green)"><h3>📅 WEEK SET</h3><p>Every day from today to Sunday now starts your best available players. You can still change any day.</p>
    ${ch.length?`<div class="chg">${ch.map(c=>`<span>${c}</span>`).join('')}</div>`:''}<div class="wkrows">${rows.join('')}</div></div>`);
}
function lineupSheet(when, ch, issues, locked=[]){
  overlay(`<div class="sheet" style="--c:var(--green)"><h3>⚡ LINE-UP SET · ${when}</h3>
    ${ch.length?`<div class="chg">${ch.map(c=>`<span>${c}</span>`).join('')}</div>`:'<p>Already your best line-up. No changes needed.</p>'}
    ${locked.length?`<p class="lk">🔒 Left in place (game started): ${locked.map(nm).join(', ')}</p>`:''}
    ${issues.map(i=>`<div class="iss">! ${i.t}</div>`).join('')}</div>`);
}

/* ── The page ── */
function rosterStage(){
  const i=FZ.view, mine=i===0, T=TEAMS[i];
  const names = mine ? null : OTHER[i]||[];
  const act = mine ? S.fl.act : names.slice(0,8), bench = mine ? S.fl.bench : names.slice(8);
  const selN = mine && FZ.pick ? getSlot(FZ.pick) : null;
  return `<div class="stage ${mine?'':'ro'}">
    <div class="sg-head"><button class="ar" onclick="FZ.view=(FZ.view+TEAMS.length-1)%TEAMS.length;render()">◀</button>
      <div class="sg-t"><small>${mine?'SELECT YOUR STARTERS':T.m.toUpperCase()+"'S ROSTER"}</small><b>${T.team.toUpperCase()}</b></div>
      <button class="ar" onclick="FZ.view=(FZ.view+1)%TEAMS.length;render()">▶</button></div>
    <div class="dstrip dmini">${DAYN.map((d,k)=>`<button class="${k===FZ.day?'on':''}" onclick="FZ.day=${k};FZ.fpm=null;FZ.pick=null;render()">${d}${k===TODAY_I?'<small>TODAY</small>':''}</button>`).join('')}</div>
    ${mine?`<div class="autos"><button onclick="autoDay()">⚡ AUTO-SET TODAY</button><button onclick="autoWeek()">📅 AUTO-SET WEEK</button></div>`:''}
    <div class="sg-lbl"><span>ACTIVE ${act.filter(Boolean).length}/8</span>${fpTog()}</div>
    <div class="cgrid">${act.map((n,k)=>card16(n, mine?'a'+k:null, {p1:mine&&FZ.pick==='a'+k&&!!n})).join('')}</div>
    <div class="sg-lbl"><span style="color:var(--red)">BENCH</span>${mine?`<span>HOLD + DRAG TO SWAP · TAP FOR PROFILE</span>`:'<span>TAP A CARD FOR PROFILE</span>'}</div>
    <div class="cgrid">${bench.map((n,k)=>card16(n, mine?'b'+k:null, {p1:mine&&FZ.pick==='b'+k&&!!n})).join('')}${mine?card16(S.fl.ir[0],'i0',{p1:FZ.pick==='i0'&&!!S.fl.ir[0]}):''}</div>
  </div>`;
}

/* ── Hold & drag ── */
/* Tap a card for the player card. Hold a beat, then drag onto another card to swap. */
function stageDrag(){
  const stage=document.querySelector('.stage'); if(!stage) return;
  stage.querySelectorAll('.rc16[data-pn],.rc16[data-pos]').forEach(card=>{
    let t=null, held=false, sx=0, sy=0, moved=false, ghost=null, over=null, dx=0, dy=0;
    const canDrag = ()=> FZ.view===0 && !!card.dataset.pos && !!card.dataset.pn;
    const lift=()=>{ held=true; navigator.vibrate?.(12); const r=card.getBoundingClientRect(); dx=sx-r.left; dy=sy-r.top;
      ghost=card.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width=r.width+'px'; ghost.style.height=r.height+'px'; ghost.style.left=r.left+'px'; ghost.style.top=r.top+'px';
      document.body.appendChild(ghost); card.classList.add('lifted'); };
    const start=(x,y)=>{ held=false; moved=false; sx=x; sy=y; clearTimeout(t); if(canDrag()) t=setTimeout(lift, 280); };
    const move=(x,y)=>{
      if(!held){ if(Math.hypot(x-sx,y-sy)>10){ moved=true; clearTimeout(t); } return; }
      ghost.style.left=(x-dx)+'px'; ghost.style.top=(y-dy)+'px';
      const el=document.elementFromPoint(x,y)?.closest('.stage .rc16[data-pos]');
      const tgt = el && el!==card ? el : null;
      if(tgt!==over){ over?.classList.remove('over'); over=tgt; over?.classList.add('over'); }
    };
    const drop=()=>{ const a=card.dataset.pos, b=over?.dataset.pos; ghost?.remove(); ghost=null; card.classList.remove('lifted'); over?.classList.remove('over'); over=null; held=false;
      if(a&&b){ FZ.pick=null; if(swapPos(a,b)){ render(); say('Swapped'); lineupCheck(); } else render(); } };
    const end=()=>{ clearTimeout(t); if(held){ drop(); return; } if(moved) return;
      if(card.dataset.pn) openPlayer(card.dataset.pn, FZ.view===0&&card.dataset.pos?rosterActions(card.dataset.pos):[]); };
    card.addEventListener('touchstart', e=>{ const p=e.touches[0]; start(p.clientX,p.clientY); }, {passive:true});
    card.addEventListener('touchmove', e=>{ const p=e.touches[0]; if(held) e.preventDefault(); move(p.clientX,p.clientY); }, {passive:false});
    card.addEventListener('touchend', e=>{ e.preventDefault(); end(); });
    card.addEventListener('touchcancel', ()=>{ clearTimeout(t); if(held){ over=null; drop(); } });
    card.addEventListener('mousedown', e=>{ if(e.button) return; e.preventDefault(); start(e.clientX,e.clientY);
      const mm=ev=>move(ev.clientX,ev.clientY), mu=()=>{ removeEventListener('mousemove',mm); removeEventListener('mouseup',mu); end(); };
      addEventListener('mousemove',mm); addEventListener('mouseup',mu); });
    card.addEventListener('contextmenu', e=>e.preventDefault());
  });
}
function tap(card){ if(card.dataset.pn) openPlayer(card.dataset.pn, FZ.view===0&&card.dataset.pos?rosterActions(card.dataset.pos):[]); }
function killGhosts(){}
function rosterActions(pos){
  const n=getSlot(pos); if(!n) return [];
  const a=[];
  if(isOut(n) && pos[0]!=='i' && !S.fl.ir[0]) a.push(['MOVE TO IR', ()=>{ if(swapPos(pos,'i0')){ render(); say(`${nm(n)} moved to IR`); lineupCheck(); } }]);
  if(pos[0]==='a') a.push(['BENCH HIM', ()=>{ const b=S.fl.bench.findIndex(x=>x==null); if(b>=0){ if(swapPos(pos,'b'+b)){ render(); say('Benched'); } } else say('Bench is full · hold and drag him onto a bench card to swap'); }]);
  if(pos[0]==='b'){ const open=S.fl.act.findIndex(x=>x==null); a.push(['START HIM', ()=>{ const k=open>=0?open:S.fl.act.map((x,i)=>[x,i]).filter(([x])=>x).sort((p,q)=>lineupScore(p[0],TODAY_I)-lineupScore(q[0],TODAY_I))[0][1]; if(swapPos(pos,'a'+k)){ render(); say(`${nm(n)} is in`); lineupCheck(); } }]); }
  return a;
}

/* ── Player lightbox (opens from any portrait on the site) ── */
function openPlayer(n, actions=[]){
  const p=P(n); if(!p || !p.n) return;
  const owner = myNames().includes(n) ? 'ON YOUR TEAM' : (()=>{ const i=TEAMS.findIndex((t,k)=>k>0 && (OTHER[k]||[]).includes(n)); return i>0 ? `${TEAMS[i].team.toUpperCase()}` : 'FREE AGENT'; })();
  const sched = DAYN.map((d,di)=>{ const g = di===TODAY_I ? (GAMES[p.t] ? `${GAMES[p.t].home?'vs':'@'} ${GAMES[p.t].opp}` : '') : (()=>{ const s=dayGame(n,di); return s==='NO GAME'?'':s.replace(/^\S+ /,''); })();
    const fp = di<TODAY_I ? (()=>{ const v=(typeof LIVE!=='undefined'&&LIVE.on) ? (()=>{ const ymd=LIVE.W.ymd(new Date(+WEEK_START(MU.week)+di*864e5+432e5)); const e=(LIVE.byPid.get(String(p.id))||[]).find(x=>String(x.date)===ymd); return e?Math.round(e.fp||0):null; })() : (g?Math.round(p.f*(.6+hsh(n+'x'+di)*.9)):null); return v; })() : di===TODAY_I && gs()==='live' && g ? p.td : null;
    return `<div class="sd ${di===TODAY_I?'tdy':''} ${g?'':'off'}"><b>${d}</b><span>${g||'—'}</span><i>${fp!=null?fp:''}</i></div>`; }).join('');
  const log = gameLog(p).map(r=>`<tr><td>${r.d}</td><td>${r.o}</td><td>${r.pts}</td><td>${r.reb}</td><td>${r.ast}</td><td><b>${r.fp}</b></td></tr>`).join('');
  const o=overlay(`<div class="sheet pbox" style="--c:${({legend:'#ff5fbf',gold:'#ffd93d',silver:'#c8d0e0',bronze:'#d98a4e'})[rarity(p.f)]}">
    <div class="pb-top">${card16(n,null,{noinj:1})}<div class="pb-id"><small>${RARE_LBL[rarity(p.f)]} · ${owner}</small><h3>${p.n.toUpperCase()}</h3><p>${p.t} · ${p.p}${p.inj?` · <b style="color:${p.inj==='OUT'?'#ff3b5c':'var(--gold)'};font-weight:normal">${p.inj}</b>`:''}</p>
      <p class="tdg">${GAMES[p.t]?`TODAY ${GAMES[p.t].time} ${GAMES[p.t].home?'vs':'@'} ${GAMES[p.t].opp}`:'NO GAME TODAY'}</p></div></div>
    <div class="pstats"><div><b>${p.f}</b>FP/G</div><div><b>${p.l5}</b>LAST 5</div><div><b>${p.wk}</b>THIS WEEK</div><div><b>${p.fall}</b>FALL</div></div>
    <div class="cap">THIS WEEK</div><div class="sched7">${sched}</div>
    ${log?`<div class="cap">LAST GAMES</div><table class="glog"><tr><th></th><th>OPP</th><th>PTS</th><th>REB</th><th>AST</th><th>FP</th></tr>${log}</table>`:''}
    ${actions.length?`<div class="acts">${actions.map((a,k)=>`<button class="btn ${k?'alt':''}" data-k="${k}">${a[0]}</button>`).join('')}</div>`:''}</div>`);
  o.querySelector('.pb-top .rc16')?.classList.add('big');
  const x=document.createElement('button'); x.className='pbx'; x.setAttribute('aria-label','Close'); x.textContent='✕'; x.onclick=()=>o.remove(); o.querySelector('.pbox').prepend(x);
  paintPix(o);
  o.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ o.remove(); actions[+b.dataset.k][1](); });
}
function gameLog(p){
  if(typeof LIVE!=='undefined' && LIVE.on){
    const W=LIVE.W, lines=(LIVE.byPid.get(String(p.id))||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
    return lines.map(e=>{ const d=String(e.date); return {d:`${+d.slice(4,6)}/${+d.slice(6)}`, o:e.opp||'', pts:e.pts??'', reb:e.reb??'', ast:e.ast??'', fp:Math.round(e.fp||0)}; });
  }
  return [...Array(5)].map((_,k)=>{ const f=Math.round(p.f*(.55+hsh(p.n+'g'+k)*.95)); return {d:`11/${12-k}`, o:Object.keys(TC)[Math.floor(hsh(p.n+'o'+k)*30)], pts:Math.round(f*.55), reb:Math.round(f*.2), ast:Math.round(f*.14), fp:f}; });
}
// Any portrait (img or card with data-pn) opens the lightbox, unless the tap is the game action there
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-pn]'); if(!el || el.closest('[data-act],[data-own],.ov,.pcard')) return;
  e.stopPropagation(); e.preventDefault(); openPlayer(el.dataset.pn);
}, true);

AFTER.fantasy = (prev => () => { prev && prev(); paintPix(); stageDrag(); })(AFTER.fantasy);
for(const k of ['home','wlc','duel']) AFTER[k] = (prev => () => { prev && prev(); paintPix(); })(AFTER[k]);

document.head.insertAdjacentHTML('beforeend', `<style>
/* ── 16-bit collectible cards ── */
.rc16{position:relative;aspect-ratio:5/7;border-radius:4px;padding:3px;background:#000;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  touch-action:pan-y;animation:wob 4.2s ease-in-out infinite;animation-delay:var(--d,0s);box-shadow:0 3px 0 #000,0 6px 10px rgba(0,0,0,.45);--fr:#b8702e;--fr2:#e8a35c}
.rc16.r-silver{--fr:#8d97ab;--fr2:#e4e9f2}.rc16.r-gold{--fr:#c9951a;--fr2:#ffe066}
.rc16.r-legend{--fr:#ff5fbf;--fr2:#7ef7ff}
.rc16 .rc-in{position:relative;height:100%;border-radius:2px;background:linear-gradient(180deg,var(--fr2),var(--fr));padding:3px;display:grid;grid-template-rows:auto 1fr auto;gap:2px;overflow:hidden;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.55),inset 2px 2px 0 rgba(255,255,255,.35)}
.rc16.r-legend .rc-in{background:linear-gradient(135deg,#ff5fbf,#ffd93d,#39ff6a,#4adfff,#b36bff,#ff5fbf);background-size:300% 300%;animation:holo 4s linear infinite}
.rc16 .rc-in::after{content:'';position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.55) 50%,transparent 58%);transform:translateX(-120%);animation:glint 7s ease-in-out infinite;animation-delay:var(--d,0s);pointer-events:none}
.rc-top{display:flex;justify-content:center;align-items:center;gap:2px;background:#10162a;border:1px solid #000;padding:2px 3px;min-width:0}
.rc-top .nm{font-size:4.6px;letter-spacing:-.02em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rc-art .fpg{position:absolute;right:2px;top:2px;font-size:5px;color:#fff;background:#c4122f;border:1px solid #000;padding:1px 2px;box-shadow:1px 1px 0 #000}
.rc-art .fpn{position:absolute;right:2px;bottom:2px;font-size:4.5px;color:#1a1200;background:var(--gold);border:1px solid #000;padding:1px 2px}
.rc-art{position:relative;border:1px solid #000;background:var(--tc);overflow:hidden;min-height:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.rc-art img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:50% 8%}
.rc-art::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.45));mix-blend-mode:multiply}
.rc-art>span{z-index:1}
.rc-art .pos{position:absolute;left:2px;bottom:2px;font-size:4.5px;background:#000;color:#fff;padding:1px 2px}
.rc-art .inj{position:absolute;left:2px;top:2px;font-size:4.5px;background:var(--gold);color:#1a1200;padding:1px 2px}.rc-art .inj.o{background:#ff3b5c;color:#fff}
.rc-art .plus{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;color:rgba(255,255,255,.35)}
.rc-art .p1t{position:absolute;left:2px;top:2px;z-index:6;font-size:6px;color:#fff;background:#e94560;padding:2px 3px;border:1px solid #000;animation:blink .7s steps(2) infinite}
.rc-bot{display:flex;justify-content:space-between;align-items:center;gap:2px;background:#10162a;border:1px solid #000;padding:2px 3px;font-size:4.5px;min-width:0}
.rc-bot b{font-weight:normal;color:var(--green);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.rc-bot b.x{color:var(--t3)}.rc-bot b.o{color:#ff3b5c}
.rc-bot i{font-style:normal;white-space:nowrap}.rc-bot i.a{color:#ff9a1f}.rc-bot i.d{color:#4adfff}
.rc-art .fpg,.rc-art .pos,.rc-art .inj,.rc-art .irtag,.rc-art .fpn,.rc-art .lvg{display:none!important}
.rc16.held{transform:scale(.94)}
.rc16.idle .rc-bot b{color:var(--t3)}.rc16.idle .rc-art img{filter:grayscale(.65) brightness(.75)}
.rc16.out .rc-bot b{color:#ff3b5c}.rc16.out .rc-art img{filter:grayscale(1) brightness(.5)}
.rc16.empty{animation:none;background:transparent;box-shadow:none;border:2px dashed #3b4a66;padding:2px}.rc16.empty .rc-in{background:rgba(59,74,102,.15);box-shadow:none}
.rc16.empty .rc-in::after{display:none}.rc16.empty .rc-art{background:transparent;border:none;box-shadow:none}.rc16.empty .rc-bot{background:transparent;border:none;justify-content:center}.rc16.empty .rc-bot b{color:var(--t3)}
.rc16.irs{border-color:var(--violet)}
.rc-art .irtag{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-12deg);font-size:9px;color:#fff;background:var(--violet);border:2px solid #000;padding:2px 6px;box-shadow:2px 2px 0 #000}
.rc16.p1{box-shadow:0 0 0 3px #e94560,0 0 16px rgba(233,69,96,.7),0 3px 0 #000;transform:translateY(-3px)}
.rc16.lifted{opacity:.25;animation:none}
.rc16.over{outline:3px solid var(--gold);outline-offset:2px;animation:none;transform:scale(1.05)}
.rc-art img{-webkit-user-drag:none;user-select:none;-webkit-touch-callout:none}
.rc16.ghost{position:fixed;z-index:80;pointer-events:none;animation:none;transform:rotate(-4deg) scale(1.12);box-shadow:0 0 0 2px var(--gold),0 18px 30px rgba(0,0,0,.6)}
.rc16.big{width:116px;flex:none;animation:wob 4.2s ease-in-out infinite}
.rc16.big .rc-top .nm{font-size:7px!important}.rc16.big .fpg{font-size:8px}.rc16.big .fpn{font-size:6px}.rc16.big .rc-bot{font-size:6px}
@keyframes wob{0%,100%{transform:rotate(-1.2deg) translateY(0)}50%{transform:rotate(1.2deg) translateY(-2px)}}
@keyframes glint{0%,82%{transform:translateX(-120%)}92%,100%{transform:translateX(120%)}}
@keyframes holo{to{background-position:300% 0}}

/* ── Capcom-style select screen ── */
.stage{position:relative;border:3px solid #000;border-radius:12px;padding:10px 9px 12px;display:flex;flex-direction:column;gap:9px;overflow:hidden;
  background:linear-gradient(180deg,rgba(10,16,40,.2),rgba(2,6,18,.85)),repeating-linear-gradient(135deg,#14214a 0 14px,#101a3c 14px 28px);background-size:auto,40px 40px;animation:stripes 3s linear infinite;
  box-shadow:0 0 0 2px #4a9eff,0 0 26px rgba(74,158,255,.3),inset 0 0 40px rgba(0,0,0,.6)}
.stage::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px);pointer-events:none}
.stage>*{position:relative}
@keyframes stripes{to{background-position:0 0,40px 0}}
.sg-head{display:grid;grid-template-columns:30px 1fr 30px;align-items:center;gap:6px;text-align:center}
.sg-head .ar{height:30px;border:2px solid #000;border-radius:6px;background:#e94560;color:#fff;font-size:9px;cursor:pointer;box-shadow:0 3px 0 #7a1020}
.sg-t small{display:block;font-size:6px;color:#ffe066;letter-spacing:.14em;animation:blink 1.4s steps(2) infinite}
.sg-t b{display:block;font-weight:normal;font-size:10px;color:#fff;margin-top:5px;text-shadow:2px 2px 0 #e94560,-1px -1px 0 #4adfff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stage .dstrip.dmini button{padding:5px 0;font-size:5px}.stage .dstrip.dmini small{font-size:4px}
.autos{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.autos button{font-size:6.5px;padding:10px 4px;border-radius:8px;border:2px solid #000;background:var(--gold);color:#1a1200;cursor:pointer;box-shadow:0 3px 0 #000}
.autos button+button{background:var(--teal,#2ae8b8)}
.issues{display:flex;flex-direction:column;gap:5px}
.iss{font-size:6px;line-height:1.7;color:#ffd0d8;background:rgba(233,69,96,.14);border:1px solid #e94560;border-radius:6px;padding:6px 8px}
.okline.sm{padding:7px;font-size:6px}
.sg-lbl{display:flex;justify-content:space-between;align-items:center;font-size:6px;color:var(--green)}.sg-lbl>span:last-child:not(:first-child):not(.fpt){color:var(--t3);font-size:5px}
.cgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px 8px}
.stage.ro .rc16{cursor:pointer}
/* lightbox */
.pbox .pb-top{display:flex;gap:14px;align-items:center}
.pbox .pb-id{min-width:0}.pbox .pb-id small{font-size:5.5px;color:var(--c)}.pbox h3{margin:6px 0;font-size:10px;line-height:1.5}
.pbox .pb-id p{margin:0;font-size:6.5px;color:var(--t2);line-height:1.8}.pbox .tdg{color:var(--green)!important}
.pstats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0 4px}
.pstats div{text-align:center;font-size:5px;color:var(--t3);border:2px solid var(--edge);border-radius:6px;padding:7px 2px;background:#0a1020}
.pstats b{display:block;font-weight:normal;font-size:11px;color:var(--gold);margin-bottom:4px}
.pbox .cap{font-size:6px;color:var(--t3);margin:10px 0 6px;letter-spacing:.08em}
.sched7{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.sd{text-align:center;border:1px solid var(--edge);border-radius:4px;padding:5px 1px;font-size:4.5px;color:var(--t2);background:#0a1020;min-width:0}
.sd b{display:block;font-weight:normal;font-size:5px;color:var(--t3);margin-bottom:3px}.sd span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sd i{display:block;font-style:normal;color:var(--gold);font-size:6px;margin-top:3px;min-height:6px}
.sd.tdy{border-color:var(--gold)}.sd.off{opacity:.45}
.glog{width:100%;border-collapse:collapse;font-size:6px}.glog th{font-weight:normal;color:var(--t3);font-size:5px;text-align:right;padding:3px}
.glog td{text-align:right;padding:5px 3px;border-top:1px solid var(--edge)}.glog td:first-child,.glog th:first-child{text-align:left;color:var(--t3)}.glog b{font-weight:normal;color:var(--gold)}
.chg{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.chg span{font-size:6px;padding:5px 7px;border-radius:5px;background:rgba(57,255,106,.1);border:1px solid var(--green);color:var(--green)}
.sheet .lk{font-size:6px;color:var(--t3)}.sheet .iss{margin-top:6px}
.wkrows{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.wkrow{display:grid;grid-template-columns:34px 1fr 14px;gap:8px;align-items:center;font-size:6.5px;padding:7px 8px;border-radius:6px;background:#0a1020;border:1px solid var(--edge)}
.wkrow b{font-weight:normal;color:var(--gold)}.wkrow i{font-style:normal;color:var(--green)}.wkrow.warn i{color:#ff3b5c}.wkrow.warn span{color:#ffd0d8}
.pbx{position:sticky;top:0;float:right;z-index:5;width:34px;height:34px;margin:-6px -4px 0 8px;border-radius:50%;border:2px solid #000;background:#e94560;color:#fff;font-size:12px;cursor:pointer;box-shadow:0 3px 0 #7a1020}
@media (prefers-reduced-motion: reduce){ .rc16,.stage,.rc16 .rc-in::after{animation:none!important} }
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* Nov 20 · roster cards */
.rc-bot i.d,.fpt button.on.day{color:#ffd93d}
.fpt button.on.day{background:#ffd93d!important;color:#1a1200!important}
.rc-art .injb{position:absolute;left:-12%;right:-12%;top:50%;z-index:5;transform:translateY(-50%) rotate(-14deg);text-align:center;font-size:6px;letter-spacing:.06em;color:#1a1200;background:repeating-linear-gradient(45deg,#ffd93d 0 6px,#f5b400 6px 12px);border-top:1px solid #000;border-bottom:1px solid #000;padding:2px 0;text-shadow:none;box-shadow:0 2px 0 rgba(0,0,0,.4)}
.rc-art .injb.o{color:#fff;background:repeating-linear-gradient(45deg,#ff3b5c 0 6px,#c4122f 6px 12px);text-shadow:1px 1px 0 #000}
.rc16.ghost{transition:none}
.stage .rc-bot{padding:2px 2px;gap:3px}.stage .rc-bot b.gm{overflow:visible;text-overflow:clip}.stage .rc-bot i{flex:none}
</style>`);
