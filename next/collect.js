/* NBA Arcade · NEXT · the collection layer.
   Every player is a card, and every card can level up.
   · Player EXP: use a player in any game and he earns EXP.
       Fantasy  – starters earn about half their FP each day
       Duel     – +15 for picking him, +25 more if he wins
       Challenge– +20 when he's in your saved line-up
       Daily reward – optionally spend the day's 50 EXP on one player
   · Levels unlock card versions: LV2 NEON · LV3 HOLO · LV4 RETRO · LV5 GOLD · LV6 ALL-STAR.
     Packs can drop any version early.
   · You choose which owned card shows for each player, everywhere on the site.
   Stored on this device for the preview. */

const PX_LV = [0, 50, 150, 300, 500, 800];                       // EXP needed for LV1..LV6
const VERS = [                                                   // card versions, in unlock order
  {k:'base',  name:'CLASSIC',  lv:1},
  {k:'neon',  name:'NEON',     lv:2},
  {k:'holo',  name:'HOLO',     lv:3},
  {k:'retro', name:'RETRO',    lv:4},
  {k:'gold',  name:'GOLD',     lv:5},
  {k:'star',  name:'ALL-STAR', lv:6},
];
const VK = Object.fromEntries(VERS.map(v=>[v.k,v]));
RAR.retro ||= {name:'RETRO', w:0, rank:2}; RAR.star ||= {name:'ALL-STAR', w:0, rank:4};

S.px ||= {}; S.own ||= {};
// carry over cards pulled before packs used names
if(S.cards && !S.ownMigrated){ for(const [id,r] of Object.entries(S.cards)){ const c=SET[id-1]; if(!c) continue; const o=S.own[c.n] ||= {}; for(const [v,n] of Object.entries(r)) o[v]=(o[v]||0)+n; } S.ownMigrated=true; }
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
const owns = (n,v) => v==='base' || pxLv(n).lv>=VK[v].lv || ((S.own[n]||{})[v]>0);
const ownedVers = n => VERS.filter(v=>owns(n,v.k)).map(v=>v.k);
function pxShow(n){ const c=(S.px[n]||{}).show; if(c && owns(n,c)) return c; const o=ownedVers(n); return o[o.length-1]; }
const met = n => pxXp(n)>0 || Object.values(S.own[n]||{}).some(x=>x>0);

/* ── the card, at any size. mini = art + frame + level only ── */
function pcard(n, o={}){
  const p=P(n); if(!p||!p.n) return '';
  const v=o.v||pxShow(n), L=pxLv(n), parts=p.n.split(' ');
  if(!o.full) o={...o, mini:1};   // no text on the art, ever (o.full keeps the old name strip)
  return `<div class="tcard pc r-${v} ${o.mini?'mini':''}" ${o.noTap?'':`data-pn="${escA(p.n)}"`} style="--tc:${p.c}"><div class="fr"></div><div class="in">
    <div class="art">${img(pimg(p.t,p.n))}</div>
    ${o.mini?'':`<div class="top"><span>${p.t} · ${p.p||''}</span><span>${VK[v].name}</span></div>
    <div class="nm">${parts[0].toUpperCase()}<b>${parts.slice(1).join(' ').toUpperCase()}</b></div>
    <div class="ft"><span>LV ${L.lv}</span><span class="fpg">${(+p.f).toFixed(1)} FP/G</span></div>`}</div>
    <div class="glare"></div>${o.lv===true?`<span class="lvg ${L.max?'max':''}" title="Player level">${L.lv}</span>`:''}</div>`;
}
/* class for the 16-bit roster cards, so they show the chosen version too */
const pxArt = n => 'va-'+pxShow(n);

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
  const [n, lv]=PXQ.shift(), v=VERS[lv-1], p=P(n);
  const o=overlay(`<div class="pxlv"><div class="rib">LEVEL UP!</div><div class="pxc" id="pxc">${pcard(n,{v:v.k,noTap:1})}</div>
    <p>${p.n.toUpperCase()} reached <b>LV ${lv}</b>${lv===PX_LV.length?' · MAX':''}<br>New card: <b style="color:var(--gold)">${v.name}</b></p>
    <div class="acts"><button class="btn" id="sh">SHOW THIS CARD</button><button class="btn alt" id="kp">KEEP MY CURRENT CARD</button></div></div>`, true);
  attachTilt(o.querySelector('.pxlv'), ()=>o.querySelector('#pxc .tcard'), 1);
  const done=()=>{ o.remove(); render(); setTimeout(pxNextLevel, 250); };
  o.querySelector('#sh').onclick=()=>{ (S.px[n] ||= {}).show=v.k; save(); done(); };
  o.querySelector('#kp').onclick=done;
}

/* Fantasy: once a day, yesterday's starters collect their EXP */
function pxDaily(){
  if(S.pxDay===TODAY || !S.greeted || document.querySelector('.ov,.greet,.vss')) return;
  const yest = (S.pxStarters||[]).filter(Boolean);
  S.pxDay=TODAY; S.pxStarters=(S.fl&&S.fl.act||[]).filter(Boolean); save();
  if(!yest.length) return;
  const rows=yest.map(n=>[n, Math.max(4, Math.round((+P(n).f||8)*(.35+hsh(n+TODAY)*.3)))]);
  const o=overlay(`<div class="sheet pxd" style="--c:var(--green)"><h3>YESTERDAY'S STARTERS</h3><p>Every player you start earns EXP. Level them up to unlock new cards.</p>
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
  const W={base:56, neon:22, holo:12, retro:6, gold:3, moment:1}, tot=Object.values(W).reduce((a,b)=>a+b,0);
  const roll=()=>{ let x=Math.random()*tot; for(const [k,w] of Object.entries(W)){ x-=w; if(x<0) return k; } return 'base'; };
  const out=[];
  for(let i=0;i<5;i++){ let v=roll();
    if(i===4 && out.every(c=>c.v==='base') && v==='base') v='neon';
    if(v==='moment'){ const left=MOMENTS.filter(m=>!S.moments.includes(m.id) && !out.some(o=>o.m===m)); if(left.length){ out.push({v, m:left[Math.floor(Math.random()*left.length)]}); continue; } v='holo'; }
    const p=pick(); out.push({v, c:{n:p.n, t:p.t, p:p.p, c:p.c, f:+p.f, id:0}}); }
  const rank=k=>({base:0,neon:1,holo:2,retro:2,gold:3,moment:4})[k];
  return out.sort((a,b)=>rank(a.v)-rank(b.v));
};
keep = function(pull){
  return pull.map(p=>{ if(p.v==='moment'){ S.moments.push(p.m.id); return {...p, isNew:true}; }
    const isNew=!owns(p.c.n,p.v) && !(S.own[p.c.n]||{})[p.v]; const r=S.own[p.c.n] ||= {}; r[p.v]=(r[p.v]||0)+1; return {...p, isNew}; });
};
cardHtml = (orig => function(c, v, extra={}){ if(v==='moment') return orig(c,v,extra); return pcard(c.n,{v,noTap:1}).replace(/<\/div>$/, (extra.isNew?'<span class="newb">NEW</span>':'')+'</div>'); })(cardHtml);

/* ── COLLECTION (replaces the old binder) ── */
const CL = {f:'mine', q:''};
function collection(){
  const all=PL.filter(p=>p.n), tot=all.length*VERS.length;
  const have=all.reduce((a,p)=>a+(met(p.n)?ownedVers(p.n).length:0),0), metN=all.filter(p=>met(p.n)).length, maxN=all.filter(p=>pxLv(p.n).max).length;
  let list = CL.f==='mine' ? myNames().map(P) : CL.f==='met' ? all.filter(p=>met(p.n)) : CL.f==='close' ? all.filter(p=>met(p.n)&&!pxLv(p.n).max).sort((a,b)=>pxLv(a.n).need-pxLv(b.n).need) : all;
  if(CL.f!=='close') list=list.slice().sort((a,b)=>pxXp(b.n)-pxXp(a.n) || b.f-a.f);
  list=list.slice(0, 90);
  const tab=(k,l)=>`<button class="${CL.f===k?'on':''}" onclick="CL.f='${k}';render()">${l}</button>`;
  return topBar()+`<div class="screen"><div class="mode cl" style="--mc:var(--gold)"><div class="mhead"><h1>COLLECTION</h1><span class="clp">${(100*have/tot).toFixed(1)}%</span></div>
    <div class="panel"><div class="clst"><div><b>${have}</b><span>CARDS</span><small>OF ${tot.toLocaleString()}</small></div><div><b>${metN}</b><span>PLAYERS</span><small>OF ${all.length}</small></div><div><b>${maxN}</b><span>MAXED</span><small>LV 6</small></div><div><b>${S.moments.length}</b><span>MOMENTS</span><small>OF ${MOMENTS.length}</small></div></div>
      <div class="xb big"><i style="width:${100*have/tot}%"></i></div></div>
    <div class="panel"><div class="packrow"><div class="minipack">${S.packs||0}</div><div style="flex:1"><div style="font-size:8px;margin-bottom:8px">${S.packs?`${S.packs} PACK${S.packs>1?'S':''} TO OPEN`:'NO PACKS RIGHT NOW'}</div>
      <div class="reward" style="margin:0 0 10px;text-align:left">Finish your Daily Checklist for a pack. Packs can drop any card early, even GOLD.</div>
      ${S.packs?'<button class="btn" onclick="openPack()">OPEN PACK ▶</button>':`<button class="go" style="background:var(--card);color:var(--t2);border-color:var(--edge)" onclick="S.packs=(S.packs||0)+1;save();render()">+1 PACK (PREVIEW ONLY)</button>`}</div></div></div>
    <div class="ladder">${VERS.map(v=>`<div><div class="cw">${pcard(myNames()[0]||all[0].n,{v:v.k,mini:1,lv:false,noTap:1})}</div><b>LV ${v.lv}</b><small>${v.name}</small></div>`).join('')}</div>
    <div class="ctabs">${tab('mine','MY TEAM')}${tab('close','NEXT UP')}${tab('met','COLLECTED')}${tab('all','ALL')}</div>
    <div class="clg">${list.map(p=>{ const L=pxLv(p.n), m=met(p.n); return `<div class="cli ${m?'':'unmet'}"><div class="cw">${m?pcard(p.n,{mini:1}):`<div class="cbk" data-pn="${escA(p.n)}">${CARD_BACK}</div>`}</div><b>${p.s}</b>
      <div class="xb"><i style="width:${L.pct}%"></i></div><small>${m?(L.max?'MAX':`${ownedVers(p.n).length}/${VERS.length} CARDS`):'NOT YET'}</small></div>`; }).join('')}</div>
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
  const draw=()=>{ const cur=pxShow(n);
    sec.innerHTML=`<div class="cap">PLAYER LEVEL</div><div class="pxlvrow"><span class="lvg big ${L.max?'max':''}">${L.lv}</span><div style="flex:1"><div class="xb"><i style="width:${L.pct}%"></i></div>
      <small>${L.max?'MAX LEVEL · EVERY CARD UNLOCKED':`${L.xp} / ${L.hi} EXP · ${L.need} MORE UNLOCKS ${L.next.name}`}</small></div></div>
      <div class="cap">HIS CARDS · TAP ONE TO SHOW IT EVERYWHERE</div>
      <div class="vrow">${VERS.map(v=>{ const ok=owns(n,v.k); return `<button class="${v.k===cur?'on':''}" ${ok?'':'disabled'} data-v="${v.k}"><div class="cw">${pcard(n,{v:v.k,mini:1,lv:false,noTap:1})}</div>${ok?'':`<span class="lk">🔒<br>LV ${v.lv}</span>`}<small>${v.name}</small></button>`; }).join('')}</div>
      <div class="howxp">EARN EXP: START HIM IN FANTASY · PICK HIM IN A DUEL · PUT HIM IN YOUR CHALLENGE LINE-UP · OR GIVE HIM YOUR DAILY REWARD</div>
      ${log.length?`<div class="xlog">${log.slice(0,4).map(([d,w,x])=>`<div><span>${w}</span><b>+${x}</b></div>`).join('')}</div>`:''}`;
    sec.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ (S.px[n] ||= {}).show=b.dataset.v; save(); draw(); const pc=box.querySelector('.pbc'); if(pc) pc.innerHTML=pcard(n,{noTap:1}); render(); });
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
.tcard.r-base .fr{background:linear-gradient(160deg,#e8ecf5,#9aa4b8)}
.tcard.r-retro .fr{background:repeating-linear-gradient(90deg,#ff7a18 0 6px,#ffd93d 6px 12px,#2ec4b6 12px 18px)}
.tcard.r-retro .art img{filter:contrast(1.5) saturate(1.6)}
.tcard.r-retro .art::after{content:'';position:absolute;inset:0;background:radial-gradient(rgba(0,0,0,.4) 30%,transparent 32%) 0 0/4px 4px;mix-blend-mode:multiply}
.tcard.r-star .fr{background:conic-gradient(from 0deg,#ff5fbf,#ffd93d,#39ff6a,#4adfff,#b36bff,#ff5fbf);animation:spin 6s linear infinite}
.tcard.r-star .in{box-shadow:inset 0 0 0 2px #000,inset 0 0 18px rgba(255,217,61,.7)}
.tcard.r-star .art::after{content:'★';position:absolute;right:6%;top:4%;font-size:18cqw;color:#ffd93d;text-shadow:0 0 6px #000}
@keyframes spin{to{filter:hue-rotate(360deg)}}
/* wrapper that turns any portrait slot into a card slot */
.cw{position:relative;background:none!important;border:0!important;outline:0!important;height:auto!important;aspect-ratio:5/7!important;overflow:visible!important;border-radius:0!important;box-shadow:none!important;padding:0!important}
.cw>.tcard{width:100%;height:100%}
.cw>span:not(.lvg){z-index:9}
/* roster 16-bit cards pick up the version */
.rc-art.va-neon img{filter:grayscale(1) contrast(1.3)}.rc-art.va-neon::before{content:'';position:absolute;inset:0;z-index:1;mix-blend-mode:color;background:linear-gradient(160deg,#ff2e88,#00e5ff);pointer-events:none}
.rc-art.va-holo::before{content:'';position:absolute;inset:0;z-index:1;mix-blend-mode:color-dodge;opacity:.5;background:linear-gradient(115deg,transparent 20%,#ff5fbf 35%,#ffd93d 45%,#39ff6a 55%,#4a9eff 65%,transparent 80%);background-size:300% 300%;animation:holo 5s linear infinite;pointer-events:none}
.rc-art.va-retro img{filter:contrast(1.5) saturate(1.6)}
.rc-art.va-gold img{filter:sepia(1) saturate(2.2) hue-rotate(-8deg) contrast(1.15)}
.rc-art.va-star::before{content:'';position:absolute;inset:0;z-index:1;box-shadow:inset 0 0 0 2px #ffd93d,inset 0 0 10px rgba(255,217,61,.8);pointer-events:none}
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
