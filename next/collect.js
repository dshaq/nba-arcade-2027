/* NBA Arcade · NEXT · the collection layer.
   Every player has ONE card, and the card grows with him (the Card Forge model).
   · Player EXP: use a player in any game and he earns EXP.
       Fantasy  – starters earn about half their FP each day
       Duel     – +15 for picking him, +25 more if he wins
       Challenge– +20 when he's in your saved line-up
       Daily reward – optionally spend the day's 50 EXP on one player
       Packs    – a duplicate feeds his card +40 EXP
   · Each level unlocks an ADD-ON for his card: LV2 SHINE · LV3 GOLD FOIL · LV4 HOLO FOIL · LV5 JERSEY FOIL · LV6 STARS.
     You choose which add-ons are switched on, and that card shows everywhere on the site.
   · 10 copies of a player = EVOLVE into his next card (Fit Check for Tatum; more to come).
   Stored on this device for the preview. */

const PX_LV = [0, 50, 150, 300, 500, 800];                       // EXP needed for LV1..LV6
const VERS = [                                                   // card add-ons, in unlock order (one per level)
  {k:'base',   name:'BASE CARD',   lv:1, d:'Silver frame, the whole portrait, nothing cropped.'},
  {k:'shine',  name:'SHINE',       lv:2, d:'A gloss and a glare that follow the light.'},
  {k:'gold',   name:'GOLD FOIL',   lv:3, d:'Etched gold frame that shifts as you tilt.'},
  {k:'holo',   name:'HOLO FOIL',   lv:4, d:'The backdrop turns to team-colored holo.'},
  {k:'jersey', name:'JERSEY FOIL', lv:5, d:'Foil across the jersey. Never the face.'},
  {k:'stars',  name:'STARS',       lv:6, d:'Stars float around the edges, in front of the art.'},
];
const EVO_N = 10, DUPE_XP = 40, EVO_READY = {'Jayson Tatum':'FIT CHECK'};
const VK = Object.fromEntries(VERS.map(v=>[v.k,v]));
S.px ||= {}; S.own ||= {};
// carry over cards pulled before packs used names
if(S.cards && !S.ownMigrated){ for(const [id,r] of Object.entries(S.cards)){ const c=SET[id-1]; if(!c) continue; const o=S.own[c.n] ||= {}; for(const [v,n] of Object.entries(r)) o[v]=(o[v]||0)+n; } S.ownMigrated=true; }
// one card per player now: fold any old version pulls (neon/holo/gold…) into his copy count
if(!S.ownV2){ for(const r of Object.values(S.own)){ const t=Object.entries(r).reduce((a,[k,v])=>a+(+v||0),0); for(const k in r) delete r[k]; r.base=t; } for(const v of Object.values(S.px)) delete v.show; S.ownV2=1; }
// starting EXP so the preview has something to look at (made up)
if(!S.pxSeed){
  try{ myNames().forEach(n=>{ (S.px[n] ||= {}).xp = Math.round(25 + hsh(n+'xp')*560); }); }catch(e){}
  PL.slice().sort((a,b)=>b.f-a.f).slice(0,40).forEach(p=>{ if(!S.px[p.n] && hsh(p.n+'met')>.55) S.px[p.n]={xp:Math.round(hsh(p.n+'x2')*120)}; });
  S.pxSeed=1; save();
}

const pxXp = n => (S.px[n]||{}).xp||0;
function pxLv(n){ const x=pxXp(n); let lv=1; PX_LV.forEach((t,i)=>{ if(x>=t) lv=i+1; });
  const max=lv>=PX_LV.length, lo=PX_LV[lv-1], hi=max?lo:PX_LV[lv];
  return {lv, xp:x, lo, hi, max, pct:max?100:Math.round(100*(x-lo)/(hi-lo)), need:max?0:hi-x, next:VERS[lv]}; }
const owns = (n,k) => pxLv(n).lv >= (VK[k]?.lv||99);              // add-on unlocked?
const ownedVers = n => VERS.filter(v=>owns(n,v.k)).map(v=>v.k);
const addOn = (n,k) => k!=='base' && owns(n,k) && !((S.px[n]||{}).off||{})[k];
const copies = n => (S.own[n]||{}).base||0;
const met = n => pxXp(n)>0 || copies(n)>0;

/* ── the card, at any size. The square portrait sits whole at the bottom of the window;
   above it, the same picture blurred fills the space, so nothing gets cropped.
   o.upTo = preview with every add-on up to that level switched on. ── */
function pcard(n, o={}){
  const p=P(n); if(!p||!p.n) return '';
  const L=pxLv(n), src=pimg(p.t,p.n);
  const on = k => o.upTo!=null ? VK[k].lv<=o.upTo && k!=='base' : addOn(n,k);
  const cls = VERS.filter(v=>on(v.k)).map(v=>'u-'+v.k).join(' ');
  return `<div class="tcard pc mini ${cls}" ${o.noTap?'':`data-pn="${escA(p.n)}"`} style="--tc:${p.c}"><div class="fr"></div><div class="in">
    <div class="bgb" style="background-image:url('${src}')"></div><div class="hf"></div>
    <div class="art">${img(src)}</div><div class="jf"></div><div class="gl"></div><div class="sk"></div><div class="crt"></div></div>
    <div class="glare"></div>${o.lv===true?`<span class="lvg ${L.max?'max':''}" title="Player level">${L.lv}</span>`:''}</div>`;
}
/* 16-bit roster cards keep their own look (no filters) */
const pxArt = n => '';

/* ── earning EXP ── */
const PXQ = [];   // level-ups waiting to be shown
function pxGain(n, xp, why, quiet){
  if(!n || !xp) return;
  const before=pxLv(n).lv; (S.px[n] ||= {}).xp = pxXp(n)+xp; (S.px[n].log ||= []).unshift([TODAY, why, xp]); S.px[n].log.length=Math.min(S.px[n].log.length,12);
  save(); const after=pxLv(n).lv;
  if(!quiet) say(`+${xp} EXP · ${P(n).s||n}`);
  if(after>before){ PXQ.push([n, after]); setTimeout(pxNextLevel, quiet?50:900); }
}
function pxNextLevel(){
  if(document.querySelector('.pxlv') || !PXQ.length) return;
  if(document.querySelector('.po')){ setTimeout(pxNextLevel, 1500); return; }
  const [n, lv]=PXQ.shift(), v=VERS[lv-1], p=P(n);
  const o=overlay(`<div class="pxlv"><div class="rib">LEVEL UP!</div><div class="pxc" id="pxc">${pcard(n,{noTap:1})}</div>
    <p>${p.n.toUpperCase()} reached <b>LV ${lv}</b>${lv===PX_LV.length?' · MAX':''}<br>New add-on: <b style="color:var(--gold)">${v.name}</b><br><small>${v.d}</small></p>
    <div class="acts"><button class="btn" id="sh">KEEP IT ON</button><button class="btn alt" id="kp">SWITCH IT OFF</button></div></div>`, true);
  attachTilt(o.querySelector('.pxlv'), ()=>o.querySelector('#pxc .tcard'), 1);
  const done=()=>{ o.remove(); render(); setTimeout(pxNextLevel, 250); };
  o.querySelector('#sh').onclick=done;
  o.querySelector('#kp').onclick=()=>{ ((S.px[n] ||= {}).off ||= {})[v.k]=1; save(); done(); };
}

/* Fantasy: once a day, yesterday's starters collect their EXP */
function pxDaily(){
  if(S.pxDay===TODAY || !S.greeted || document.querySelector('.ov,.greet,.vss')) return;
  const yest = (S.pxStarters||[]).filter(Boolean);
  S.pxDay=TODAY; S.pxStarters=(S.fl&&S.fl.act||[]).filter(Boolean); save();
  if(!yest.length) return;
  const rows=yest.map(n=>[n, Math.max(4, Math.round((+P(n).f||8)*(.35+hsh(n+TODAY)*.3)))]);
  const o=overlay(`<div class="sheet pxd" style="--c:var(--green)"><h3>YESTERDAY'S STARTERS</h3><p>Every player you start earns EXP. Level them up to unlock add-ons for their cards.</p>
    <div class="pxrows">${rows.map(([n,x])=>{ const L=pxLv(n); return `<div class="pxr" data-n="${escA(n)}"><div class="cw">${pcard(n,{mini:1,noTap:1})}</div><div class="mid"><b>${P(n).n}</b>
      <div class="xb"><i style="width:${L.pct}%"></i></div><small>LV ${L.lv} · ${L.max?'MAX':`${L.need} TO LV ${L.lv+1}`}</small></div><span class="gx">+${x}</span></div>`; }).join('')}</div>
    <div class="acts"><button class="btn" id="col">COLLECT ${rows.reduce((a,r)=>a+r[1],0)} EXP ▶</button></div></div>`);
  o.querySelector('#col').onclick=()=>{
    rows.forEach(([n,x],i)=>{ pxGain(n,x,'Fantasy starter',true); const L=pxLv(n), r=o.querySelector(`.pxr[data-n="${CSS.escape(n)}"]`);
      if(r){ r.querySelector('.xb i').style.width=L.pct+'%'; r.querySelector('small').textContent=`LV ${L.lv} · ${L.max?'MAX':`${L.need} TO LV ${L.lv+1}`}`; r.classList.add('got'); } });
    o.querySelector('#col').textContent='NICE ▶'; o.querySelector('#col').onclick=()=>{ o.remove(); render(); pxNextLevel(); };
  };
}

/* Duel: picking a player, and being right about him */
const cx_duelPick = duelPick;
duelPick = function(short, el){
  const had=S.done.duel; const r=cx_duelPick.apply(this, arguments);
  setTimeout(()=>{ if(!had && S.done.duel===short){ const d=[DUEL.a,DUEL.b].find(x=>x.short===short); if(d && !d.img && P(d.name).n) pxGain(d.name, 15, 'Duel pick'); } }, 400);
  return r;
};
const cx_ydSplash = ydSplash;
ydSplash = function(){
  const before=!!document.querySelector('.dsplash'); cx_ydSplash(); const g=document.querySelector('.dsplash');
  if(!before && g){ const hit=YDUEL.mine && YDUEL.mine===YDUEL.win.n, w=YDUEL.win.p||P(YDUEL.win.n);
    if(hit && w && w.n && !w.img){ const L=pxLv(w.n); g.querySelector('.yres').insertAdjacentHTML('afterend',`<div class="ybon">${w.s} +25 EXP · LV ${L.lv}</div>`);
      g.querySelector('#ygo').addEventListener('click',()=>pxGain(w.n, 25, 'Called the Duel'), {once:true}); } }
};
/* Challenge: everyone in a saved line-up */
const cx_lockedSplash = lockedSplash;
lockedSplash = function(picks){ cx_lockedSplash(picks); if(S.pxWlc!==WLC.pool+MU.week){ S.pxWlc=WLC.pool+MU.week; picks.forEach(n=>pxGain(n,20,'Challenge line-up',true)); save();
  document.querySelector('.lgl')?.insertAdjacentHTML('beforebegin',`<div class="lxp">+20 EXP TO EACH PLAYER</div>`); } };

/* ── Daily reward: a pack, plus 50 EXP for your Baller or for one player ── */
claim = function(){
  const L=pxLv; const cand=[...new Set([...(myNames?myNames():[]), ...(S.party||[]), DUEL.a.name, DUEL.b.name])].filter(n=>P(n).n && !L(n).max)
    .sort((a,b)=>{ const ua=L(a).need<=FULL_BONUS, ub=L(b).need<=FULL_BONUS; return ub-ua || L(b).xp-L(a).xp; });
  const o=overlay(`<div class="sheet rwd" style="--c:var(--gold)"><h3>🎁 DAILY REWARD</h3><p>+1 card pack, and <b>${FULL_BONUS} EXP</b>. Who gets the EXP?</p>
    <button class="rbtn" id="rb"><span class="bv" id="rbv"></span><span><b>YOUR BALLER</b><small>${BB.CHARS[S.active].name} · LV ${lvOf(B(S.active).exp).lv}</small></span><i>▶</i></button>
    <div class="sec">OR A PLAYER · ${cand.length}</div>
    <div class="rlist">${cand.map(n=>{ const l=L(n), up=l.need<=FULL_BONUS; return `<button class="rp ${up?'up':''}" data-n="${escA(n)}"><div class="cw">${pcard(n,{mini:1,noTap:1})}</div>
      <span><b>${P(n).n}</b><div class="xb"><i style="width:${l.pct}%"></i><em style="left:${l.pct}%;width:${Math.min(100-l.pct,Math.round(100*FULL_BONUS/(l.hi-l.lo)))}%"></em></div>
      <small>LV ${l.lv} · ${up?`<u>LEVELS UP → ${l.next.name}</u>`:`${l.need} TO LV ${l.lv+1}`}</small></span></button>`; }).join('')}</div></div>`);
  o.querySelector('#rbv').appendChild(ballerCv(S.active,2));
  const fin=(msgEl)=>{ S.bonus=true; S.packs=(S.packs||0)+1; save(); o.remove(); render(); setTimeout(()=>say('+1 card pack · open it in Collection'), 2400); };
  o.querySelector('#rb').onclick=()=>{ S.bonusTo='baller'; fin(); gain(FULL_BONUS, document.querySelector('.chest')); };
  o.querySelectorAll('.rp').forEach(b=>b.onclick=()=>{ const n=b.dataset.n; S.bonusTo=n; fin(); pxGain(n, FULL_BONUS, 'Daily reward'); });
};

/* ── packs now pull from every player ── */
pullPack = function(){
  const pool=PL.filter(p=>p.n), pick=()=>{ const top=pool.slice().sort((a,b)=>b.f-a.f); return Math.random()<.5 ? top[Math.floor(Math.random()*60)] : pool[Math.floor(Math.random()*pool.length)]; };
  const out=[];
  for(let i=0;i<5;i++){
    if(Math.random()<.025){ const left=MOMENTS.filter(m=>!S.moments.includes(m.id) && !out.some(o=>o.m===m)); if(left.length){ out.push({v:'moment', m:left[Math.floor(Math.random()*left.length)]}); continue; } }
    const p=pick(); out.push({v:'base', c:{n:p.n, t:p.t, p:p.p, c:p.c, f:+p.f, id:0}}); }
  return out.sort((a,b)=>(a.v==='moment')-(b.v==='moment'));
};
keep = function(pull){
  return pull.map(p=>{ if(p.v==='moment'){ S.moments.push(p.m.id); return {...p, isNew:true}; }
    const n=p.c.n, isNew=!copies(n), r=S.own[n] ||= {}; r.base=(r.base||0)+1;
    if(!isNew) pxGain(n, DUPE_XP, 'Pack duplicate', true);
    return {...p, isNew, dupe:!isNew, copies:r.base}; });
};
cardHtml = (orig => function(c, v, extra={}){ if(v==='moment') return orig(c,v,extra); return pcard(c.n,{v,noTap:1}).replace(/<\/div>$/, (extra.isNew?'<span class="newb">NEW</span>':'')+'</div>'); })(cardHtml);

/* ── COLLECTION (replaces the old binder) ── */
const CL = {f:'mine', q:''};
function collection(){
  const all=PL.filter(p=>p.n), tot=all.length*(VERS.length-1);
  const have=all.reduce((a,p)=>a+(met(p.n)?ownedVers(p.n).length-1:0),0), metN=all.filter(p=>met(p.n)).length, maxN=all.filter(p=>pxLv(p.n).max).length;
  let list = CL.f==='mine' ? myNames().map(P) : CL.f==='met' ? all.filter(p=>met(p.n)) : CL.f==='close' ? all.filter(p=>met(p.n)&&!pxLv(p.n).max).sort((a,b)=>pxLv(a.n).need-pxLv(b.n).need) : all;
  if(CL.f!=='close') list=list.slice().sort((a,b)=>pxXp(b.n)-pxXp(a.n) || b.f-a.f);
  list=list.slice(0, 90);
  const tab=(k,l)=>`<button class="${CL.f===k?'on':''}" onclick="CL.f='${k}';render()">${l}</button>`;
  return topBar()+`<div class="screen"><div class="mode cl" style="--mc:var(--gold)"><div class="mhead"><h1>COLLECTION</h1><span class="clp">${(100*(metN+have)/(all.length+tot)).toFixed(1)}%</span></div>
    <div class="panel"><div class="clst"><div><b>${metN}</b><span>PLAYERS</span><small>OF ${all.length}</small></div><div><b>${have}</b><span>ADD-ONS</span><small>OF ${tot.toLocaleString()}</small></div><div><b>${maxN}</b><span>MAXED</span><small>LV 6</small></div><div><b>${S.moments.length}</b><span>MOMENTS</span><small>OF ${MOMENTS.length}</small></div></div>
      <div class="xb big"><i style="width:${100*(metN+have)/(all.length+tot)}%"></i></div></div>
    <div class="panel"><div class="packrow"><div class="minipack">${S.packs||0}</div><div style="flex:1"><div style="font-size:8px;margin-bottom:8px">${S.packs?`${S.packs} PACK${S.packs>1?'S':''} TO OPEN`:'NO PACKS RIGHT NOW'}</div>
      <div class="reward" style="margin:0 0 10px;text-align:left">Finish your Daily Checklist for a pack. A new player adds his card to your collection; a duplicate feeds his card +40 EXP and counts toward EVOLVE (10 copies).</div>
      ${S.packs?'<button class="btn" onclick="openPack()">OPEN PACK ▶</button>':`<button class="go" style="background:var(--card);color:var(--t2);border-color:var(--edge)" onclick="S.packs=(S.packs||0)+1;save();render()">+1 PACK (PREVIEW ONLY)</button>`}</div></div></div>
    <div class="ladder">${VERS.map(v=>`<div><div class="cw">${pcard(myNames()[0]||all[0].n,{upTo:v.lv,noTap:1})}</div><b>LV ${v.lv}</b><small>${v.name}</small></div>`).join('')}</div>
    <div class="ctabs">${tab('mine','MY TEAM')}${tab('close','NEXT UP')}${tab('met','COLLECTED')}${tab('all','ALL')}</div>
    <div class="clg">${list.map(p=>{ const L=pxLv(p.n), m=met(p.n); return `<div class="cli ${m?'':'unmet'}"><div class="cw">${m?pcard(p.n,{mini:1}):`<div class="cbk" data-pn="${escA(p.n)}">${CARD_BACK}</div>`}</div><b>${p.s}</b>
      <div class="xb"><i style="width:${L.pct}%"></i></div><small>${m?`LV ${L.lv}${L.max?' · MAX':''} · ×${copies(p.n)}`:'NOT YET'}</small></div>`; }).join('')}</div>
  </div></div>`;
}
SCREENS.cards = collection;

/* ── lightbox: level, EXP and the card picker ── */
const cx_openPlayer = openPlayer;
openPlayer = function(n, actions=[]){
  cx_openPlayer(n, actions);
  const box=[...document.querySelectorAll('.ov .pbox')].pop(); if(!box) return;
  const top=box.querySelector('.pb-top .rc16'); if(top) top.outerHTML=`<div class="pbc">${pcard(n,{noTap:1})}</div>`;
  const L=pxLv(n), log=(S.px[n]||{}).log||[];
  const sec=document.createElement('div'); sec.className='pxs';
  const draw=()=>{ const c=copies(n), evo=EVO_READY[n];
    sec.innerHTML=`<div class="cap">PLAYER LEVEL</div><div class="pxlvrow"><span class="lvg big ${L.max?'max':''}">${L.lv}</span><div style="flex:1"><div class="xb"><i style="width:${L.pct}%"></i></div>
      <small>${L.max?'MAX LEVEL · EVERY ADD-ON UNLOCKED':`${L.xp} / ${L.hi} EXP · ${L.need} MORE UNLOCKS ${L.next.name}`}</small></div></div>
      <div class="cap">CARD ADD-ONS · TAP TO SWITCH ON OR OFF</div>
      <div class="aons">${VERS.slice(1).map(v=>{ const ok=owns(n,v.k), isOn=addOn(n,v.k); return `<button class="${isOn?'on':''}" ${ok?'':'disabled'} data-k="${v.k}"><b>${v.name}</b><small>${ok?(isOn?'ON':'OFF'):'🔒 LV '+v.lv}</small></button>`; }).join('')}</div>
      <div class="cap">EVOLVE · ${Math.min(c,EVO_N)}/${EVO_N} COPIES</div>
      <div class="evr"><div class="xb"><i style="width:${Math.min(100,100*c/EVO_N)}%;background:linear-gradient(90deg,#b36bff,#ff5fbf)"></i></div>
        ${c>=EVO_N&&evo?`<a class="go" href="forge/">EVOLVE → ${evo} ▶</a>`:`<small>${evo?`10 copies evolve him into <b>${evo}</b>.`:'His evolved card is still being designed.'} Duplicates come from packs.</small>`}</div>
      <div class="howxp">EARN EXP: START HIM IN FANTASY · PICK HIM IN A DUEL · PUT HIM IN YOUR CHALLENGE LINE-UP · PULL A DUPLICATE · OR GIVE HIM YOUR DAILY REWARD</div>
      ${log.length?`<div class="xlog">${log.slice(0,4).map(([d,w,x])=>`<div><span>${w}</span><b>+${x}</b></div>`).join('')}</div>`:''}`;
    sec.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ const off=((S.px[n] ||= {}).off ||= {}); off[b.dataset.k]=off[b.dataset.k]?0:1; save(); draw(); const pc=box.querySelector('.pbc'); if(pc) pc.innerHTML=pcard(n,{noTap:1}); render(); });
  };
  draw(); box.querySelector('.pstats')?.after(sec);
};

/* hooks */
AFTER.home = (prev => () => { prev && prev(); setTimeout(pxDaily, 400); })(AFTER.home);

document.head.insertAdjacentHTML('beforeend', `<style>
/* the card at small sizes */
.tcard.pc{box-shadow:0 0 0 2px #000,0 4px 10px rgba(0,0,0,.45)}
.tcard.mini{padding:6%;border-radius:7%/5%}
.tcard.pc{height:auto!important;aspect-ratio:5/7}
.tcard.pc .in{position:absolute;left:5%;right:5%;top:3.6%;bottom:3.6%;height:auto}
.tcard.pc.mini .in{left:6%;right:6%;top:4.3%;bottom:4.3%}
.tcard.mini .in{border-radius:5%/3.6%}
.tcard .lvg{position:absolute;top:-1px;left:-1px;z-index:8}
.lvg{display:grid;place-items:center;min-width:15px;height:15px;padding:0 2px;font-size:6px;color:#000;background:#7dffa0;border:2px solid #000;border-radius:3px;font-family:var(--px)}
.lvg.max{background:linear-gradient(135deg,#ff5fbf,#ffd93d,#39ff6a,#4adfff);animation:holo 3s linear infinite;background-size:300% 300%}
.lvg.big{min-width:30px;height:30px;font-size:11px;border-radius:6px}
@keyframes spin{to{filter:hue-rotate(360deg)}}
/* wrapper that turns any portrait slot into a card slot */
.cw{position:relative;background:none!important;border:0!important;outline:0!important;height:auto!important;aspect-ratio:5/7!important;overflow:visible!important;border-radius:0!important;box-shadow:none!important;padding:0!important}
.cw>.tcard{width:100%;height:100%}
.cw>span:not(.lvg){z-index:9}
.rc16 .lvg{position:absolute;left:1px;top:1px;z-index:5;min-width:11px;height:11px;font-size:5px;border-width:1px}
.xb{position:relative;height:6px;background:#0a1226;border:1px solid #000;box-shadow:0 0 0 1px #2a3b64;overflow:hidden}
.xb i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#39ff6a,#7dffa0);transition:width 1s ease-out}
.xb em{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(90deg,#ffd93d 0 3px,#f5a623 3px 6px);opacity:.85;animation:blink 1s steps(2) infinite}
.xb.big{height:10px;margin-top:10px}.xb.big i{background:linear-gradient(90deg,#ffd93d,#f5a623)}
/* level up */
.pxlv{text-align:center;width:min(300px,86%)}
.pxlv .rib{font-size:14px;color:var(--gold);text-shadow:3px 3px 0 #000;margin-bottom:16px;animation:lisPop .5s steps(5) both}
.pxlv .pxc{width:62%;margin:0 auto;perspective:900px}
.pxlv p{font-size:7px;line-height:2;color:var(--t2);margin:16px 0}.pxlv p b{font-weight:normal;color:var(--t1)}
.pxlv .acts{display:flex;flex-direction:column;gap:8px}
/* starters sheet + reward */
.pxrows,.rlist{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;margin:10px 0}
.pxrows>*,.rlist>*{flex:none}
.pxr{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,.25)}
.pxr .mid b{display:block;font-weight:normal;font-size:6.5px;margin-bottom:5px}.pxr small,.rp small{display:block;font-size:5px;color:var(--t3);margin-top:4px}
.pxr .gx{font-size:8px;color:var(--green)}.pxr.got .gx{animation:lisPop .4s steps(4)}
.rbtn,.rp{display:grid;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:var(--t1);border:2px solid var(--edge);background:var(--card);border-radius:8px;padding:6px 8px;cursor:pointer}
.rbtn{grid-template-columns:44px 1fr auto;margin-top:12px;border-color:var(--gold)}.rbtn b,.rp b{display:block;font-weight:normal;font-size:7px;margin-bottom:5px}.rbtn small{font-size:5.5px;color:var(--t2)}
.rbtn .bv canvas{width:44px;height:44px}.rbtn i{font-style:normal;color:var(--gold)}
.rp{grid-template-columns:32px 1fr}.rp.up{border-color:var(--green)}.rp u{text-decoration:none;color:var(--green)}
.rwd .sec{font-size:6px;color:var(--t3);margin-top:14px}
/* lightbox additions */
.pbc{width:110px;flex:none}
.pxs{margin-top:4px}
.pxlvrow{display:flex;align-items:center;gap:10px}.pxlvrow small{display:block;font-size:5.5px;color:var(--t2);margin-top:6px;line-height:1.6}
.aons{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
.aons button{font:inherit;border:2px solid var(--edge);background:var(--card);border-radius:6px;padding:7px 2px;cursor:pointer;color:var(--t2);text-align:center}
.aons button b{display:block;font-weight:normal;font-size:4.5px;line-height:1.5}.aons button small{display:block;font-size:4px;margin-top:4px;color:var(--t3)}
.aons button.on{border-color:var(--gold);color:var(--gold);background:rgba(255,217,61,.08)}.aons button.on small{color:var(--green)}
.aons button[disabled]{opacity:.45;cursor:default}
.evr{display:flex;flex-direction:column;gap:7px}.evr small{font-size:5px;line-height:1.8;color:var(--t3)}.evr small b{font-weight:normal;color:#e6d4ff}.evr .go{align-self:flex-start;text-decoration:none;background:#b36bff;border-color:#b36bff;color:#fff}
.vrow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}
.vrow button{position:relative;font:inherit;background:none;border:2px solid transparent;border-radius:6px;padding:2px;cursor:pointer;color:var(--t2)}
.vrow button.on{border-color:var(--gold);color:var(--gold)}.vrow button small{display:block;font-size:4px;margin-top:4px;white-space:nowrap}
.vrow button[disabled]{cursor:default}.vrow button[disabled] .cw{filter:grayscale(1) brightness(.35)}
.vrow .lk{position:absolute;left:0;right:0;top:28%;font-size:5px;line-height:1.8;color:#fff;text-align:center;z-index:9}
.howxp{font-size:5px;line-height:1.9;color:var(--t3);margin-top:10px}
.xlog{margin-top:8px}.xlog div{display:flex;justify-content:space-between;font-size:5.5px;color:var(--t2);padding:3px 0;border-bottom:1px solid #16223c}.xlog b{font-weight:normal;color:var(--green)}
/* collection */
.cl .clp{font-size:10px;color:var(--gold)}
.clst{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}
.clst b{display:block;font-weight:normal;font-size:12px;color:var(--gold)}.clst span{display:block;font-size:5px;color:var(--t1);margin-top:6px}.clst small{font-size:4.5px;color:var(--t3)}
.ladder{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;text-align:center}
.ladder b{display:block;font-weight:normal;font-size:5.5px;margin-top:6px;color:var(--t1)}.ladder small{font-size:4.5px;color:var(--t3)}
.clg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.cli{text-align:center;min-width:0}.cli b{display:block;font-weight:normal;font-size:5.5px;margin:6px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cli small{display:block;font-size:4.5px;color:var(--t3);margin-top:4px}
.cli.unmet .cw{opacity:.85}
.ybon{font-size:7px;color:var(--green)}
.lxp{font-size:7px;color:var(--green);margin:-6px 0 10px}
</style>`);
render();

document.head.insertAdjacentHTML('beforeend', `<style>
/* ═══ the one card (Card Forge base, for every player) ═══ */
.tcard.pc .fr{background:linear-gradient(160deg,#eef1f6,#aab3c4 45%,#d8dee8 60%,#8e98ab)}
.tcard.pc .fr::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at calc(var(--px,.5)*100%) calc(var(--py,.3)*100%),rgba(255,255,255,.5),transparent 45%);mix-blend-mode:overlay}
.tcard.pc .in{background:#05070d}
/* the fill above the portrait: the picture's own top rows, stretched upward, so it just continues his background (no ghost of his face) */
.tcard.pc .bgb{position:absolute;inset:-6px;background:var(--tc) 50% 0/100% 4000% no-repeat;filter:blur(4px) brightness(.9)}
.tcard.pc .art{position:absolute;left:-6%;right:-6%;bottom:0;top:auto;aspect-ratio:1/1;
  -webkit-mask:linear-gradient(180deg,transparent 0,#000 16%);mask:linear-gradient(180deg,transparent 0,#000 16%)}
.tcard.pc .art img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block}
.tcard.pc .hf,.tcard.pc .jf,.tcard.pc .gl,.tcard.pc .sk{position:absolute;inset:0;pointer-events:none;display:none}
.tcard.pc .crt{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px),radial-gradient(120% 90% at 50% 45%,transparent 60%,rgba(0,0,0,.35))}
/* SHINE */
.tcard.pc.u-shine .gl{display:block;mix-blend-mode:soft-light;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.75) 48%,transparent 62%);background-size:240% 240%;background-position:calc(var(--px,.5)*100%) 50%}
.tcard.pc.u-shine .glare{opacity:calc(var(--go,.2) + .25)}
/* GOLD FOIL */
.tcard.pc.u-gold .fr{background:repeating-linear-gradient(115deg,rgba(255,255,255,0) 0 3px,rgba(255,250,220,.22) 3px 4px),
  linear-gradient(125deg,#5a3a00,#c8901a 18%,#fff2b0 30%,#d9a520 42%,#7a5200 55%,#f5d061 68%,#fff8d6 76%,#b07a10 88%,#5a3a00);
  background-size:100% 100%,320% 320%;background-position:0 0,calc(var(--px,.5)*100%) calc(var(--py,.5)*100%)}
/* HOLO FOIL: the blurred backdrop above the portrait */
.tcard.pc.u-holo .hf{display:block;mix-blend-mode:color-dodge;opacity:.55;
  background:repeating-linear-gradient(105deg,#ff5fbf 0%,#ffd93d 6%,#39ff6a 12%,#4adfff 18%,#b36bff 24%,#ff5fbf 30%);background-size:300% 300%;background-position:calc(var(--px,.5)*100%) calc(var(--py,.5)*100%);
  -webkit-mask:linear-gradient(180deg,#000 22%,transparent 46%);mask:linear-gradient(180deg,#000 22%,transparent 46%)}
/* JERSEY FOIL: the bottom of the portrait, where the jersey is */
.tcard.pc.u-jersey .jf{display:block;mix-blend-mode:color-dodge;opacity:.5;
  background:repeating-linear-gradient(105deg,color-mix(in srgb,var(--tc) 70%,#fff) 0%,#fff 6%,var(--tc) 12%,color-mix(in srgb,var(--tc) 40%,#fff) 18%);background-size:260% 260%;background-position:calc(var(--px,.5)*100%) calc(var(--py,.5)*100%);
  -webkit-mask:linear-gradient(180deg,transparent 74%,#000 86%);mask:linear-gradient(180deg,transparent 74%,#000 86%)}
/* STARS: around the edges, never on the face */
.tcard.pc.u-stars .sk{display:block;z-index:3;
  background:radial-gradient(circle,#fff 0 1px,transparent 1.6px) 0 0/19px 21px,radial-gradient(circle,#ffe9a0 0 1.2px,transparent 1.8px) 9px 11px/27px 25px,radial-gradient(circle,#7ef7ff 0 .9px,transparent 1.5px) 4px 15px/23px 31px;
  -webkit-mask:radial-gradient(ellipse 38% 34% at 50% 62%,transparent 70%,#000 100%);mask:radial-gradient(ellipse 38% 34% at 50% 62%,transparent 70%,#000 100%);
  transform:translate(calc((var(--px,.5) - .5)*6px),calc((var(--py,.5) - .5)*4px));animation:twk 2.4s ease-in-out infinite}
@keyframes twk{50%{opacity:.55}}
</style>`);
