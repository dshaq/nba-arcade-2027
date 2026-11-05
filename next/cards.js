/* NBA Arcade · test site · collectible cards
   Packs are earned (full Missions bar, a welcome pack to start). Opening one: swipe across
   the top to tear it, tap to flip each card, rarest last. Cards live in a binder by number.
   Sample data; cosmetic only — cards never change fantasy scores. */

const SET = [ // Series 1 · #, name, team, pos, team colour, FP/G
  ['Shai Gilgeous-Alexander','OKC','G','#007ac1',52.4], ['Nikola Jokic','DEN','C','#0e2240',55.1], ['Giannis Antetokounmpo','MIL','F','#00471b',50.2],
  ['Victor Wembanyama','SAS','C','#8a9aa6',51.3], ['Luka Doncic','LAL','G','#552583',53.0], ['Anthony Edwards','MIN','G','#236192',42.7],
  ['Cade Cunningham','DET','G','#c8102e',44.0], ['Jalen Brunson','NYK','G','#006bb6',40.2], ['Jayson Tatum','BOS','F','#007a33',45.6],
  ['Tyrese Maxey','PHI','G','#006bb6',39.8], ['Devin Booker','PHX','G','#e56020',41.0], ['Donovan Mitchell','CLE','G','#860038',40.9],
  ['Alperen Sengun','HOU','C','#ce1141',41.5], ['Scottie Barnes','TOR','F','#ce1141',38.9], ['Stephen Curry','GSW','G','#1d428a',33.3],
  ['Dyson Daniels','ATL','G','#e03a3e',30.1], ['Jalen Williams','OKC','F','#007ac1',31.6], ['Evan Mobley','CLE','F','#860038',36.2],
].map(([n,t,p,c,f],i)=>({id:i+1, n, t, p, c, f}));
const MOMENTS = [ // made from a single big game (sample lines)
  {id:'m1', pid:1,  date:'NOV 4', vs:'DEN', line:'41 PTS · 7 REB · 9 AST', fp:68.5},
  {id:'m2', pid:4,  date:'NOV 2', vs:'POR', line:'28 PTS · 18 REB · 8 BLK', fp:71.0},
  {id:'m3', pid:7,  date:'OCT 30', vs:'MIA', line:'33 PTS · 11 REB · 14 AST', fp:66.0},
];
const RAR = { // version → look, odds weight, rank (higher = rarer)
  base: {name:'CLASSIC', w:62, rank:0},
  neon: {name:'NEON',    w:22, rank:1},
  holo: {name:'HOLO',    w:10, rank:2},
  gold: {name:'GOLD',    w:3,  rank:3, of:10},
  moment:{name:'MOMENT', w:3,  rank:4},
};
S.cards ||= {}; S.moments ||= []; S.gold ||= {};
if(S.packs==null){ S.packs = 1; S.welcome = true; }   // a welcome pack on first visit
const nowOwned = () => Object.values(S.cards).reduce((a,v)=>a+Object.values(v).reduce((x,y)=>x+y,0),0) + S.moments.length;
const ownedIds = () => SET.filter(c=>S.cards[c.id] && Object.values(S.cards[c.id]).some(n=>n>0)).length;
const no3 = n => '#'+String(n).padStart(3,'0');

document.head.insertAdjacentHTML('beforeend', `<style>
/* the card */
.tcard{--tc:#1d428a;position:relative;aspect-ratio:5/7;width:100%;border-radius:9px;overflow:hidden;background:#111;padding:5%;
  box-shadow:0 0 0 2px #000,0 6px 16px rgba(0,0,0,.5);font-family:var(--px);color:#fff;container-type:inline-size}
.tcard .fr{position:absolute;inset:0;background:linear-gradient(160deg,#e8ecf5,#9aa4b8)}
.tcard .in{position:relative;height:100%;border-radius:5px;overflow:hidden;background:var(--tc);box-shadow:inset 0 0 0 2px #000}
.tcard .art{position:absolute;inset:0}
.tcard .art img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.tcard .top{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:5% 6%;font-size:5.5cqw;z-index:4;text-shadow:0 1px 0 #000}
.tcard .nm{position:absolute;left:0;right:0;bottom:15%;z-index:4;padding:3% 6%;background:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.35));font-size:5cqw;line-height:1.5}
.tcard .nm b{display:block;font-weight:normal;font-size:7cqw}
.tcard .ft{position:absolute;left:0;right:0;bottom:0;height:15%;z-index:4;display:flex;align-items:center;justify-content:space-between;padding:0 6%;background:#000;font-size:5cqw}
.tcard .ft .fpg{color:var(--gold)}
.tcard .glare{position:absolute;inset:0;z-index:6;pointer-events:none;mix-blend-mode:overlay;background:radial-gradient(circle at calc(var(--px,.5)*100%) calc(var(--py,.3)*100%),rgba(255,255,255,.8),rgba(255,255,255,0) 50%);opacity:var(--go,.2)}
.tcard .dupe{position:absolute;top:4%;right:4%;z-index:7;font-size:6cqw;background:var(--gold);color:#1a1200;padding:2% 4%;border-radius:4px}
.tcard .newb{position:absolute;top:-1px;left:50%;transform:translateX(-50%);z-index:7;font-size:6cqw;background:var(--red);color:#fff;padding:2% 5%;border-radius:0 0 5px 5px}
/* rarities */
.tcard.r-neon .fr{background:linear-gradient(160deg,#ff2e88,#00e5ff)}
.tcard.r-neon .art img{filter:grayscale(1) contrast(1.3)}
.tcard.r-neon .art::after{content:'';position:absolute;inset:0;mix-blend-mode:color;background:linear-gradient(160deg,#ff2e88,#00e5ff)}
.tcard.r-holo .fr{background:linear-gradient(120deg,#ff5fbf,#ffd93d,#39ff6a,#4a9eff,#b36bff,#ff5fbf);background-size:300% 300%;background-position:calc(var(--px,.5)*100%) 50%}
.tcard.r-holo .art::after{content:'';position:absolute;inset:0;z-index:2;mix-blend-mode:color-dodge;opacity:.55;background:linear-gradient(115deg,transparent 18%,#ff5fbf 32%,#ffd93d 42%,#39ff6a 52%,#4a9eff 62%,#b36bff 70%,transparent 84%);background-size:320% 320%;background-position:calc(var(--px,.5)*100%) calc(var(--py,.5)*100%)}
.tcard.r-holo .art::before{content:'';position:absolute;inset:0;z-index:3;mix-blend-mode:color-dodge;opacity:.45;background:radial-gradient(circle,#fff 0 1px,transparent 1.5px) 0 0/17px 17px,radial-gradient(circle,#ffe9a0 0 1px,transparent 1.5px) 7px 9px/23px 23px}
.tcard.r-gold .fr{background:linear-gradient(135deg,#7a5200,#ffe98a 30%,#c88a10 50%,#fff6c0 70%,#8a6000);background-size:250% 250%;background-position:calc(var(--px,.5)*100%) calc(var(--py,.5)*100%)}
.tcard.r-gold .art img{filter:sepia(1) saturate(2.2) hue-rotate(-8deg) contrast(1.15)}
.tcard.r-gold .ft{background:linear-gradient(90deg,#3a2600,#000)}
.tcard.r-moment .fr{background:repeating-linear-gradient(135deg,#c4122f 0 8px,#8a0a20 8px 16px)}
.tcard.r-moment .in{background:#000}
.tcard.r-moment .art{bottom:42%}
.tcard.r-moment .mo{position:absolute;left:0;right:0;bottom:15%;top:58%;z-index:4;background:#0a0a14;padding:5% 6%;font-size:5cqw;line-height:1.7}
.tcard.r-moment .mo b{display:block;font-weight:normal;font-size:12cqw;color:var(--gold);line-height:1.3}
.tcard.r-moment .rib{position:absolute;top:44%;left:0;right:0;z-index:5;text-align:center;font-size:6cqw;background:#c4122f;padding:2% 0;letter-spacing:.1em}
/* card back */
.tback{position:absolute;inset:0;border-radius:9px;background:radial-gradient(circle at 50% 45%,#1d3a7a,#060c22 75%);box-shadow:inset 0 0 0 4px #e8ecf5,inset 0 0 0 7px #000,0 6px 16px rgba(0,0,0,.5);display:grid;place-items:center;backface-visibility:hidden;transform:rotateY(180deg);font-family:var(--px)}
.tback .lg{font-size:13px;text-align:center;line-height:1.5;text-shadow:0 3px 0 #000}.tback .lg b{color:var(--red);font-weight:normal}.tback .lg i{color:var(--gold);font-style:normal}
.tback::before{content:'';position:absolute;inset:10px;border-radius:5px;background:repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 6px,transparent 6px 12px)}

/* pack opening */
.po{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:radial-gradient(90% 60% at 50% 45%,#1a2f66,#020611 75%);animation:fade .3s;touch-action:none;user-select:none;-webkit-user-select:none}
.po .hint{font-size:8px;color:var(--t2);animation:blink 1.2s steps(2) infinite;text-align:center;line-height:2}
.po .x{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:max(16px,env(safe-area-inset-right,0px));width:40px;height:40px;border-radius:50%;border:2px solid var(--edge);background:var(--card);font-size:12px;cursor:pointer}
.pack{position:relative;width:230px;height:340px;transform-style:preserve-3d}
.pack .body,.pack .flap{position:absolute;left:0;right:0;background:linear-gradient(135deg,#c4122f,#ff5f6d 30%,#ffd93d 50%,#4a9eff 75%,#1d2a8a);background-size:220% 220%;background-position:calc(var(--px,.5)*100%) calc(var(--py,.5)*100%);
  box-shadow:inset 0 0 0 3px rgba(255,255,255,.35),0 14px 30px rgba(0,0,0,.6)}
.pack .flap{top:0;height:13%;border-radius:6px 6px 0 0;clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transition:transform .7s cubic-bezier(.3,.6,.3,1),opacity .7s}
.pack .body{top:13%;bottom:0;border-radius:0 0 6px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.pack .crimp{position:absolute;left:0;right:0;height:8px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 4px,rgba(255,255,255,.2) 4px 8px)}
.pack .logo{font-size:18px;text-align:center;line-height:1.4;text-shadow:0 3px 0 #000}
.pack .logo b{color:#fff;font-weight:normal}.pack .logo i{color:#fff;font-style:normal}
.pack .ser{font-size:7px;background:#000;padding:6px 9px;border-radius:4px;color:var(--gold)}
.pack .mascot canvas{width:96px;height:96px;filter:drop-shadow(0 6px 0 rgba(0,0,0,.4))}
.pack .cut{position:absolute;top:13%;left:0;height:3px;width:0;background:#fff;box-shadow:0 0 10px #fff,0 0 20px var(--gold);z-index:5}
.pack .sheen{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;background:radial-gradient(circle at calc(var(--px,.5)*100%) calc(var(--py,.3)*100%),rgba(255,255,255,.7),transparent 50%)}
.pack.torn .flap{transform:translate(60px,-140px) rotate(28deg);opacity:0}
.pack.gone{transition:transform .5s ease-in,opacity .5s;transform:translateY(120%);opacity:0}
.burst{position:absolute;inset:0;pointer-events:none;z-index:61;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.95),rgba(255,233,138,.5) 25%,transparent 60%);animation:burst .7s ease-out forwards}
@keyframes burst{from{opacity:1;transform:scale(.3)}to{opacity:0;transform:scale(1.6)}}
.stack{position:relative;width:230px;aspect-ratio:5/7;perspective:1000px}
.flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.3,.7,.2,1.1);cursor:pointer}
.flip .front{position:absolute;inset:0;backface-visibility:hidden}
.flip.down{transform:rotateY(180deg)}
.flip.away{transition:transform .45s ease-in,opacity .45s;transform:translate(-140%,-30px) rotate(-18deg);opacity:0}
.flip.special.down.top .tback{animation:shake .4s infinite;box-shadow:inset 0 0 0 4px var(--gold),inset 0 0 0 7px #000,0 0 30px var(--gold),0 0 60px var(--glow,var(--gold))}
@keyframes shake{25%{transform:rotateY(180deg) rotate(-1.5deg)}75%{transform:rotateY(180deg) rotate(1.5deg)}}
.stack .ct{position:absolute;bottom:-26px;left:0;right:0;text-align:center;font-size:7px;color:var(--t2)}
.revname{font-size:9px;text-align:center;line-height:1.8;min-height:34px}
.revname small{display:block;font-size:7px}
.sumgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:min(440px,92%)}
.sumgrid .tcard{animation:in .35s backwards}

/* binder */
.binder{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.slotc{position:relative;cursor:pointer}
.slotc.miss{cursor:default}
.slotc.miss .ph{aspect-ratio:5/7;border-radius:9px;border:2px dashed #2a3b64;display:grid;place-items:center;font-size:8px;color:#2a3b64;background:rgba(10,18,40,.6)}
.slotc .cap{font-size:5.5px;color:var(--t2);text-align:center;margin-top:5px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prog{display:flex;align-items:center;gap:10px;font-size:7px;color:var(--t2)}
.prog .xpbar{flex:1;margin:0}
.packrow{display:flex;align-items:center;gap:14px}
.minipack{width:54px;height:78px;border-radius:5px;flex:none;background:linear-gradient(135deg,#c4122f,#ffd93d 50%,#1d2a8a);box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 4px 10px rgba(0,0,0,.5);display:grid;place-items:center;font-size:6px;text-shadow:0 1px 0 #000;animation:bob 1.6s ease-in-out infinite}
.cardbtn{font-size:11px}
.cv{width:min(300px,82%);text-align:center}
.cv .tcard{transition:transform .5s cubic-bezier(.2,.9,.25,1.2)}
.cv .tcard.live{transition:transform .07s linear}
.vchips{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:14px 0 6px}
.vchips button{font-size:6px;padding:7px 8px;border-radius:5px;border:2px solid var(--edge);background:var(--card);cursor:pointer}
.vchips button.on{border-color:var(--gold);color:var(--gold)}
.vchips button[disabled]{opacity:.35;cursor:default}
</style>`);

/* ── one card ─────────────────────────────────────────────────────────────── */
function cardHtml(c, v, extra={}){
  if(v==='moment'){ const m=c, p=SET[m.pid-1];
    return `<div class="tcard r-moment" style="--tc:${p.c}"><div class="fr"></div><div class="in">
      <div class="art">${img(pimg(p.t,p.n))}</div><div class="top"><span>MOMENT</span><span>${m.date}</span></div>
      <div class="rib">★ MOMENT ★</div><div class="mo"><b>${m.fp} FP</b>${p.n.split(' ').slice(-1)[0].toUpperCase()} VS ${m.vs}<br>${m.line}</div>
      <div class="ft"><span>${p.t} · ${p.p}</span><span>${m.date}</span></div></div><div class="glare"></div>${extra.isNew?'<span class="newb">NEW</span>':''}</div>`; }
  const serial = v==='gold' ? `${(S.gold[c.id]||1)}/${RAR.gold.of}` : no3(c.id);
  const parts=c.n.split(' '), first=parts[0], last=parts.slice(1).join(' ');
  return `<div class="tcard r-${v}" style="--tc:${c.c}"><div class="fr"></div><div class="in">
    <div class="art">${img(pimg(c.t,c.n))}</div>
    <div class="top"><span>${serial}</span><span>${RAR[v].name}</span></div>
    <div class="nm">${first.toUpperCase()}<b>${last.toUpperCase()}</b></div>
    <div class="ft"><span>${c.t} · ${c.p}</span><span class="fpg">${c.f.toFixed(1)} FP/G</span></div></div>
    <div class="glare"></div>${extra.dupe>1?`<span class="dupe">×${extra.dupe}</span>`:''}${extra.isNew?'<span class="newb">NEW</span>':''}</div>`;
}

/* tilt any element toward the pointer, with an idle sway */
function attachTilt(host, getEl, amt=1){
  let mode='idle', last=0, down=false;
  const set=(px,py,live)=>{ const el=getEl(); if(!el) return; el.classList.toggle('live',!!live);
    el.style.transform=`rotateY(${(px-.5)*30*amt}deg) rotateX(${(.5-py)*22*amt}deg)`;
    el.style.setProperty('--px',px); el.style.setProperty('--py',py); el.style.setProperty('--go', live?.85:.3); };
  const rel=e=>{ const el=getEl(); if(!el) return [.5,.5]; const r=el.getBoundingClientRect(); return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]; };
  host.addEventListener('pointermove',e=>{ if(e.pointerType==='mouse'||down){ mode='hand'; last=performance.now(); set(...rel(e),true); } });
  host.addEventListener('pointerdown',e=>{ down=true; mode='hand'; set(...rel(e),true); });
  const up=()=>{ down=false; mode='idle'; last=performance.now(); set(.5,.5,false); };
  host.addEventListener('pointerup',up); host.addEventListener('pointerleave',up); host.addEventListener('pointercancel',up);
  (function idle(t){ if(!host.isConnected) return; if(mode==='idle' && performance.now()-last>900){ const el=getEl(); if(el){ el.classList.add('live'); const a=t/1700;
      el.style.transform=`rotateY(${Math.sin(a)*8*amt}deg) rotateX(${Math.cos(a*.8)*4*amt}deg)`; el.style.setProperty('--px',.5+Math.sin(a)*.35); el.style.setProperty('--py',.4+Math.cos(a*.8)*.25); } }
    requestAnimationFrame(idle); })(0);
  return set;
}

/* ── pulling a pack ─────────────────────────────────────────────────────── */
function rollVersion(){ const tot=Object.values(RAR).reduce((a,r)=>a+r.w,0); let x=Math.random()*tot; for(const [k,r] of Object.entries(RAR)){ x-=r.w; if(x<0) return k; } return 'base'; }
function pullPack(){
  const out=[];
  for(let i=0;i<5;i++){
    let v = rollVersion();
    if(i===4 && out.every(c=>RAR[c.v].rank===0) && v==='base') v = Math.random()<.7?'neon':'holo';   // every pack has at least one rare
    if(v==='moment'){ const left=MOMENTS.filter(m=>!S.moments.includes(m.id) && !out.some(o=>o.m===m)); if(left.length){ out.push({v, m:left[Math.floor(Math.random()*left.length)]}); continue; } v='holo'; }
    out.push({v, c:SET[Math.floor(Math.random()*SET.length)]});
  }
  return out.sort((a,b)=>RAR[a.v].rank-RAR[b.v].rank);   // rarest last
}
function keep(pull){
  return pull.map(p=>{ if(p.v==='moment'){ S.moments.push(p.m.id); return {...p, isNew:true}; }
    const rec = S.cards[p.c.id] ||= {}; const isNew = !rec[p.v]; rec[p.v]=(rec[p.v]||0)+1;
    if(p.v==='gold' && !S.gold[p.c.id]) S.gold[p.c.id]=1+Math.floor(Math.random()*RAR.gold.of);
    return {...p, isNew}; });
}

function openPack(){
  if(S.packs<=0){ say('No packs yet · fill your Missions bar to earn one'); return; }
  const app=document.getElementById('app');
  const po=document.createElement('div'); po.className='po';
  po.innerHTML=`<button class="x" aria-label="Close">✕</button>
    <div class="hint" id="ph">${S.welcome?'WELCOME PACK!<br>':''}SWIPE ACROSS THE TOP TO OPEN</div>
    <div class="pack" id="pk"><div class="flap"><div class="crimp" style="top:0"></div></div><div class="cut" id="cut"></div>
      <div class="body"><div class="logo"><b>NBA</b><br><i>ARCADE</i></div><span class="mascot" id="pm"></span><span class="ser">SERIES 1 · 5 CARDS</span><div class="crimp" style="bottom:0"></div></div>
      <div class="sheen"></div></div>`;
  app.appendChild(po);
  po.querySelector('.x').onclick=()=>{ po.remove(); render(); };
  po.querySelector('#pm').appendChild(ballerCv(S.active,3));
  const pk=po.querySelector('#pk'), cut=po.querySelector('#cut');
  const setT = attachTilt(po, ()=>pk.classList.contains('torn')?null:pk, .8);
  // tear: drag across the top part of the pack
  let x0=null, best=0, done=false;
  po.addEventListener('pointerdown',e=>{ const r=pk.getBoundingClientRect(); if(e.clientY>r.top+r.height*.35) return; x0=e.clientX; best=0; });
  po.addEventListener('pointermove',e=>{ if(x0==null||done) return; const r=pk.getBoundingClientRect(); const p=Math.max(0,Math.min(1,(Math.max(e.clientX,x0)-r.left)/r.width)); const from=Math.max(0,(x0-r.left)/r.width);
    best=Math.max(best,p-from); cut.style.left=(from*100)+'%'; cut.style.width=(best*100)+'%'; if(best>.7) tear(); });
  po.addEventListener('pointerup',()=>{ if(!done){ x0=null; cut.style.width='0'; best=0; } });
  pk.addEventListener('dblclick',tear); // desktop shortcut
  function tear(){ if(done) return; done=true; cut.style.width='100%';
    S.packs--; S.welcome=false; const pull=keep(pullPack()); save();
    pk.classList.add('torn'); po.querySelector('#ph').textContent='';
    setTimeout(()=>{ const b=document.createElement('div'); b.className='burst'; po.appendChild(b); setTimeout(()=>b.remove(),700); pk.classList.add('gone'); }, 350);
    setTimeout(()=>{ pk.remove(); reveal(po, pull); }, 850);
  }
}
function reveal(po, pull){
  po.querySelector('#ph')?.remove();
  const nm=document.createElement('div'); nm.className='revname'; nm.textContent='TAP TO FLIP';
  const st=document.createElement('div'); st.className='stack';
  pull.forEach((p,i)=>{ const f=document.createElement('div'); const sp=RAR[p.v].rank>=2;
    f.className='flip down'+(sp?' special':''); f.style.zIndex=10+pull.length-i; f.style.transform=`rotateY(180deg) translateY(${-i*3}px)`;
    if(p.v==='gold') f.style.setProperty('--glow','#ffd93d'); if(p.v==='moment') f.style.setProperty('--glow','#ff3b5c'); if(p.v==='holo') f.style.setProperty('--glow','#b36bff');
    f.innerHTML=`<div class="front">${cardHtml(p.v==='moment'?p.m:p.c, p.v, {isNew:p.isNew})}</div><div class="tback"><div class="lg"><b>NBA</b><br><i>ARCADE</i></div></div>`;
    st.appendChild(f); });
  const ct=document.createElement('div'); ct.className='ct'; st.appendChild(ct);
  po.append(nm, st);
  let k=0, flipped=false;
  const cards=[...st.querySelectorAll('.flip')];
  const label=p=> p.v==='moment' ? `${SET[p.m.pid-1].n.toUpperCase()}<small style="color:#ff6b81">★ MOMENT · ${p.m.fp} FP ★</small>` : `${p.c.n.toUpperCase()}<small style="color:${p.v==='gold'?'#ffd93d':p.v==='holo'?'#b36bff':p.v==='neon'?'#ff5fbf':'#a8c0e8'}">${RAR[p.v].name}${p.isNew?' · NEW!':''}</small>`;
  const upd=()=>{ ct.textContent = `${k+1} / ${pull.length}`; cards.forEach((c,j)=>c.classList.toggle('top',j===k)); };
  upd();
  attachTilt(st, ()=>flipped?cards[k]?.querySelector('.tcard'):null, .9);
  st.addEventListener('click',()=>{
    const f=cards[k]; if(!f) return;
    if(!flipped){ f.classList.remove('down'); f.style.transform=''; flipped=true; nm.innerHTML=label(pull[k]);
      if(RAR[pull[k].v].rank>=2){ const b=document.createElement('div'); b.className='burst'; po.appendChild(b); setTimeout(()=>b.remove(),700); }
      return; }
    f.classList.add('away'); flipped=false; k++;
    if(k>=cards.length){ setTimeout(()=>summary(po,pull),350); return; }
    nm.textContent='TAP TO FLIP'; upd();
  });
}
function summary(po, pull){
  po.innerHTML=`<button class="x" aria-label="Close">✕</button><div class="revname">YOU PULLED<small style="color:var(--t2)">${pull.filter(p=>p.isNew).length} NEW FOR YOUR BINDER</small></div>
    <div class="sumgrid">${pull.map((p,i)=>`<div style="animation-delay:${i*.08}s">${cardHtml(p.v==='moment'?p.m:p.c,p.v,{isNew:p.isNew})}</div>`).join('')}</div>
    <div class="acts" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      ${S.packs>0?`<button class="btn" id="again">OPEN ANOTHER (${S.packs})</button>`:''}<button class="btn ${S.packs>0?'alt':''}" id="bind">SEE BINDER ▶</button></div>`;
  po.querySelector('.x').onclick=()=>{ po.remove(); render(); };
  po.querySelector('#bind').onclick=()=>{ po.remove(); if(cur==='cards') render(); else go('cards'); };
  const ag=po.querySelector('#again'); if(ag) ag.onclick=()=>{ po.remove(); openPack(); };
}

/* ── binder ──────────────────────────────────────────────────────────────── */
const bestV = id => { const r=S.cards[id]||{}; return ['gold','holo','neon','base'].find(v=>r[v]>0); };
function cardsScreen(){
  const have=ownedIds();
  return topBar()+`<div class="screen"><div class="mode" style="--mc:var(--gold)"><div class="mhead"><h1>CARDS</h1><span style="font-size:6px;color:var(--t2)">SERIES 1</span></div>
    <div class="panel"><div class="packrow"><div class="minipack">${S.packs}</div><div style="flex:1">
      <div style="font-size:9px;margin-bottom:8px">${S.packs?`${S.packs} PACK${S.packs>1?'S':''} TO OPEN`:'NO PACKS RIGHT NOW'}</div>
      <div class="reward" style="margin:0 0 10px">Fill your Missions bar for a new pack. Cards are for collecting and showing off; they never change scores.</div>
      ${S.packs?'<button class="btn" onclick="openPack()">OPEN PACK ▶</button>':`<button class="go" style="background:var(--card);color:var(--t2);border-color:var(--edge)" onclick="S.packs++;save();render()">+1 PACK (PREVIEW ONLY)</button>`}</div></div></div>
    <div class="panel"><div class="prog"><span>${have}/${SET.length} PLAYERS</span><div class="xpbar"><span style="width:${100*have/SET.length}%;background:linear-gradient(90deg,#ffd93d,#f5a623)"></span></div><span>${S.moments.length}/${MOMENTS.length} ★</span></div></div>
    ${S.moments.length?`<div class="sec" style="margin:4px 0 -4px">MOMENTS</div><div class="binder">${MOMENTS.filter(m=>S.moments.includes(m.id)).map(m=>`<div class="slotc" onclick="viewCard('${m.id}')">${cardHtml(m,'moment')}<div class="cap">${m.date} · ${m.fp} FP</div></div>`).join('')}</div>`:''}
    <div class="sec" style="margin:4px 0 -4px">PLAYERS</div>
    <div class="binder">${SET.map(c=>{ const v=bestV(c.id); if(!v) return `<div class="slotc miss"><div class="ph">${no3(c.id)}</div><div class="cap">???</div></div>`;
      const n=Object.values(S.cards[c.id]).reduce((a,b)=>a+b,0);
      return `<div class="slotc" onclick="viewCard(${c.id})">${cardHtml(c,v,{dupe:n})}<div class="cap">${c.n.split(' ').slice(-1)[0].toUpperCase()} · ${RAR[v].name}</div></div>`; }).join('')}</div>
  </div></div>`;
}
function viewCard(id){
  const m = typeof id==='string' ? MOMENTS.find(x=>x.id===id) : null, c = m ? null : SET[id-1];
  let v = m ? 'moment' : bestV(id);
  const o=overlay(`<div class="cv"><div style="perspective:900px" id="cvh"><div id="cvc"></div></div>
    <div class="nm" style="font-size:10px;margin-top:16px">${(m?SET[m.pid-1]:c).n.toUpperCase()}</div>
    ${m?`<div class="reward">${m.line}<br>${m.date} vs ${m.vs} · one of the league's big nights</div>`:`<div class="vchips" id="vch"></div><div class="reward" id="cnt"></div>`}</div>`, true);
  const draw=()=>{ o.querySelector('#cvc').innerHTML = cardHtml(m||c, v);
    if(!m){ const r=S.cards[c.id]||{}; o.querySelector('#vch').innerHTML=['base','neon','holo','gold'].map(k=>`<button class="${k===v?'on':''}" ${r[k]?'':'disabled'} data-v="${k}">${r[k]?'':'🔒 '}${RAR[k].name}${r[k]>1?' ×'+r[k]:''}</button>`).join('');
      o.querySelector('#vch').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ v=b.dataset.v; draw(); });
      o.querySelector('#cnt').textContent = v==='gold' ? `Gold is numbered: yours is ${S.gold[c.id]} of ${RAR.gold.of} in the league.` : 'Pull duplicates to fill in the other versions.'; } };
  draw();
  attachTilt(o.querySelector('#cvh'), ()=>o.querySelector('#cvc .tcard'), 1.1);
}

/* ── hook into the rest of the site ─────────────────────────────────────── */
SCREENS.cards = cardsScreen;
const _claim = claim;
claim = function(){ S.packs=(S.packs||0)+1; save(); _claim(); setTimeout(()=>say('+1 card pack · open it in Cards'), 2600); };
render();
