/* Card Shape Lab · FINISHES / BORDERS / MIX tabs */
(function(){
const PORTRAITS='https://ipsngddnavymcmfbbcxu.supabase.co/storage/v1/object/public/player-portraits';
const pimg=(t,n)=>`${PORTRAITS}/${t}/${encodeURIComponent(n)}.jpeg`;
const pcut=(t,n)=>`/cutouts/${t}/${encodeURIComponent(n)}.webp?v=2`;
const PLAYERS=[['Jayson','Tatum','BOS','Boston Celtics','#007a33','7:30 PM','41'],['Shai','Gilgeous-Alexander','OKC','Oklahoma City Thunder','#007ac1','8:00 PM','52'],['Victor','Wembanyama','SAS','San Antonio Spurs','#8a96a0','8:30 PM','58']];

/* ── generated textures ── */
let seed=11; const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
const cv=(w,h,f)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; f(c.getContext('2d'),w,h); return c; };
const set=(k,c,t='image/png')=>document.documentElement.style.setProperty(k,`url(${c.toDataURL(t,.85)})`);
set('--glit',cv(256,256,(g,w,h)=>{ for(let i=0;i<260;i++){ const x=R()*w,y=R()*h,s=R()<.85?R()*1.6+.4:R()*2.5+2; g.fillStyle=['#fff','#fff6c4','#ffd1f4','#c4f4ff'][i%4]; g.globalAlpha=.5+R()*.5;
  if(s>2){ g.fillRect(x-s*2,y-.5,s*4,1); g.fillRect(x-.5,y-s*2,1,s*4); } g.beginPath(); g.arc(x,y,s/2,0,7); g.fill(); } }));
(function(){ const W=300,H=420,N=80, P=[...Array(N)].map(()=>[R()*W,R()*H,R()]);
  const lines=cv(W,H,(g)=>{}), shards=cv(W,H,()=>{}); const lg=lines.getContext('2d'), sg=shards.getContext('2d');
  const L=lg.createImageData(W,H), S=sg.createImageData(W,H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let d1=1e9,d2=1e9,i1=0; for(let i=0;i<N;i++){ const dx=x-P[i][0],dy=y-P[i][1],d=dx*dx+dy*dy; if(d<d1){d2=d1;d1=d;i1=i;} else if(d<d2) d2=d; }
    const e=Math.sqrt(d2)-Math.sqrt(d1), o=(y*W+x)*4, a=e<.9?255:e<2?110:0; L.data[o]=L.data[o+1]=L.data[o+2]=255; L.data[o+3]=a;
    const v=P[i1][2]; S.data[o]=S.data[o+1]=S.data[o+2]=v>.5?255:0; S.data[o+3]=Math.round(40+v*90); }
  lg.putImageData(L,0,0); sg.putImageData(S,0,0); set('--ice',lines); set('--shards',shards); })();
set('--frost',cv(300,420,(g,w,h)=>{ g.strokeStyle='rgba(235,250,255,.75)'; g.lineCap='round';
  const br=(x,y,a,l,d)=>{ if(d>5||l<3) return; const x2=x+Math.cos(a)*l, y2=y+Math.sin(a)*l; g.lineWidth=Math.max(.5,2.2-d*.4); g.beginPath(); g.moveTo(x,y); g.lineTo(x2,y2); g.stroke();
    br(x2,y2,a+(R()-.5)*.6,l*.75,d+1); if(R()<.8) br(x+(x2-x)*.5,y+(y2-y)*.5,a+(R()<.5?1:-1)*(.6+R()*.5),l*.5,d+1); };
  for(let i=0;i<60;i++){ const s=Math.floor(R()*4); const [x,y,a]=[[R()*w,0,Math.PI/2],[R()*w,h,-Math.PI/2],[0,R()*h,0],[w,R()*h,Math.PI]][s]; br(x,y,a+(R()-.5)*.9,25+R()*40,0); } }));
set('--stars',cv(300,300,(g,w,h)=>{ for(let i=0;i<220;i++){ g.fillStyle=`rgba(255,255,255,${.3+R()*.7})`; const s=R()<.9?1:2.2; g.fillRect(R()*w,R()*h,s,s); }
  for(let i=0;i<7;i++){ const x=R()*w,y=R()*h; g.fillStyle='#fff'; g.fillRect(x-5,y-.5,10,1); g.fillRect(x-.5,y-5,1,10); } }));
set('--mosaic',cv(140,196,(g,w,h)=>{ for(let y=0;y<h;y+=7) for(let x=0;x<w;x+=7){ const v=R(); g.fillStyle=`rgba(255,255,255,${.15+v*.85})`; g.fillRect(x+.6,y+.6,5.8,5.8); } }));
set('--camo',cv(300,420,(g,w,h)=>{ g.fillStyle='#bbb'; g.fillRect(0,0,w,h); ['#888','#555','#e6e6e6','#333'].forEach(c=>{ g.fillStyle=c; for(let i=0;i<22;i++){ const x=R()*w,y=R()*h; g.beginPath(); for(let a=0;a<6.3;a+=.7){ const r=14+R()*24; g.lineTo(x+Math.cos(a)*r*1.4,y+Math.sin(a)*r); } g.fill(); } }); }));
set('--caus',cv(256,256,(g,w,h)=>{ const d=g.createImageData(w,h), k=Math.PI*2/w;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const v=Math.sin(x*k*3+Math.sin(y*k*2)*2.2)+Math.sin(y*k*3+Math.sin(x*k*4)*1.8)+Math.sin((x+y)*k*2+Math.sin(x*k*1)*1.5); const a=Math.max(0,1-Math.abs(v)*1.6); const o=(y*w+x)*4; d.data[o]=d.data[o+1]=d.data[o+2]=255; d.data[o+3]=Math.round(a*a*255); }
  g.putImageData(d,0,0); }));
set('--wood',cv(300,420,(g,w,h)=>{ for(let p=0;p<w;p+=38){ const base=[201,138,75].map(v=>v+(R()-.5)*26); g.fillStyle=`rgb(${base})`; g.fillRect(p,0,38,h);
    for(let i=0;i<14;i++){ g.strokeStyle=`rgba(${R()<.5?'90,45,10':'255,220,170'},${.1+R()*.2})`; g.lineWidth=.6+R()*1.4; g.beginPath(); const x0=p+R()*38; for(let y=0;y<=h;y+=20) g.lineTo(x0+Math.sin(y*.02+i)*2.5,y); g.stroke(); }
    g.fillStyle='rgba(60,30,8,.55)'; g.fillRect(p,0,1.2,h); }
  const gl=g.createLinearGradient(0,0,w,h); gl.addColorStop(0,'rgba(255,255,255,.18)'); gl.addColorStop(.5,'rgba(255,255,255,0)'); gl.addColorStop(1,'rgba(255,255,255,.1)'); g.fillStyle=gl; g.fillRect(0,0,w,h); }));
set('--marble',cv(300,420,(g,w,h)=>{ g.fillStyle='#f3f1ee'; g.fillRect(0,0,w,h); g.lineCap='round';
  for(let i=0;i<16;i++){ g.strokeStyle=`rgba(${R()<.3?'170,140,90':'110,115,125'},${.15+R()*.35})`; g.lineWidth=.5+R()*2.5; g.filter=`blur(${R()<.5?0:1}px)`; g.beginPath(); let x=R()*w,y=0; g.moveTo(x,y); while(y<h){ x+=(R()-.45)*40; y+=20+R()*30; g.lineTo(x,y); } g.stroke(); } g.filter='none'; }),'image/jpeg');

/* ── catalogue ── */
const FIN=[
 ['shine','CHROME SHINE','A bright streak of light sweeps the whole card as you tilt it. The simplest upgrade.'],
 ['holo','RAINBOW HOLO','The classic: the backdrop turns to shifting rainbow foil.',1],
 ['ice','CRACKED ICE','The background splits into glassy shards with rainbow edges.'],
 ['gold','GOLD FOIL','The backdrop becomes etched gold that catches the light.',1],
 ['tiedye','TIE-DYE','A swirl of colour spirals out behind him and slowly cycles.',1],
 ['prizm','PRIZM','Fine rainbow lines run across the card, like a refractor.'],
 ['glitter','GLITTER','Sparkles twinkle across the card in two layers.'],
 ['galaxy','GALAXY','Deep space behind him: nebula colours and a starfield that drifts with the tilt.',1],
 ['fire','ON FIRE','Flames lick up from the bottom and embers rise. The heat-check card.'],
 ['frozen','FROZEN','Frost creeps in from the edges and the backdrop goes icy blue.',1],
 ['neon','NEON','A flickering neon tube rings the portrait and the name glows.'],
 ['glitch','GLITCH','The background splits into red and blue and jumps now and then.'],
 ['electric','ELECTRIC','Lightning crackles around the edges of the card.'],
 ['sunset','ARCADE SUNSET','A retro sunset sky with a glowing grid floor, very arcade.',1],
 ['disco','DISCO','The background breaks into tiny mirror tiles that flash rainbow.'],
 ['camo','TEAM CAMO','Camouflage in the team\'s own colours.',1],
 ['water','WATER','Rippling pool-light patterns wash across the card.'],
 ['confetti','CONFETTI','Confetti falls in front of the card. For a win or a milestone.'],
 ['glints','DIAMOND GLINTS','Four-point star glints pop on and off around the card.'],
 ['speed','SPEED LINES','Comic-book speed lines burst out from behind him.',1],
];
const BOR=[
 ['silver','SILVER','The current frame. Brushed silver with a light streak.'],
 ['gold','GOLD','Etched gold that shifts as you tilt.'],
 ['rose','ROSE GOLD','Warm pink-gold. A softer premium metal.'],
 ['chrome','BLACK CHROME','Dark mirror metal with bright edges. Very premium.'],
 ['holo','HOLO FRAME','A rainbow foil frame that turns with the tilt.'],
 ['prizm','PRIZM FRAME','Silver with fine rainbow refractor lines.'],
 ['team','TEAM STRIPES','The team colour with jersey-trim stripes down the sides.'],
 ['wood','HARDWOOD','Court floorboards with a painted boundary line.'],
 ['ball','BASKETBALL','Pebbled orange leather with black seams.'],
 ['neon','NEON TUBES','Black frame with pink and blue neon lines that flicker.'],
 ['bulbs','MARQUEE LIGHTS','Chasing arcade-marquee bulbs all the way round.'],
 ['pixel','8-BIT','Stepped pixel corners and a two-tone bevel, like an old game window.'],
 ['marble','MARBLE','White marble with gold trim.'],
 ['carbon','CARBON FIBER','Woven carbon with a team-colour pinline.'],
 ['filigree','FILIGREE','Black frame with ornate gold corners.'],
 ['ticket','TICKET STUB','Cream ticket paper with notched sides and ADMIT ONE.'],
 ['frost','FROSTED','Icy blue frame with frost crystals.'],
];
const corner='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 38V8q0-6 6-6h30"/><path d="M6 34V12q0-6 6-6h22"/><path d="M10 10c8 0 12 4 12 12M10 10c0 8 4 12 12 12"/><circle cx="10" cy="10" r="2.2" fill="currentColor"/></svg>';
function extras(fx,border){ let h='';
  if(fx==='fire') h+=[...Array(10)].map(()=>`<i style="left:${R()*96}%;--dx:${(R()-.5)*20}cqw;animation-delay:${-R()*2.2}s;animation-duration:${1.6+R()*1.4}s"></i>`).join('');
  if(fx==='confetti') h+=[...Array(18)].map((_,i)=>`<i style="left:${R()*100}%;background:${['#ff4f8b','#ffd93d','#4adfff','#5cff8a','#fff','#b36bff'][i%6]};--dx:${(R()-.5)*30}cqw;animation-delay:${-R()*3}s;animation-duration:${2.2+R()*1.8}s"></i>`).join('');
  if(fx==='glints') h+=[...Array(9)].map(()=>`<i style="left:${R()*85}%;top:${R()*88}%;animation-delay:${-R()*2.4}s"></i>`).join('');
  if(fx==='electric'){ const bolt=(pts)=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(''); const P=[];
    for(let b=0;b<5;b++){ const side=b%4; let pts=[]; for(let s=0;s<=10;s++){ const t=s/10, j=(R()-.5)*5; pts.push(side===0?[t*100,2+Math.abs(j)]:side===1?[98-Math.abs(j),t*140]:side===2?[t*100,138-Math.abs(j)]:[2+Math.abs(j),t*140]); } P.push(`<path d="${bolt(pts)}" style="animation-delay:${-R()*1.8}s;animation-duration:${1.2+R()*1.4}s"/>`); }
    h+=`<svg viewBox="0 0 100 140" preserveAspectRatio="none">${P.join('')}</svg>`; }
  return h; }
function card({size='big',border='silver',fx='',p=0}){ const [f,l,t,tn,tc,tm,fp]=PLAYERS[p], src=pimg(t,f+' '+l), fil=border==='filigree'?[0,90,180,270].map((r,i)=>`<span style="position:absolute;${['left:2%;top:1.5%','right:2%;top:1.5%','right:2%;bottom:1.5%','left:2%;bottom:1.5%'][i]};transform:rotate(${r}deg);width:22cqw;height:22cqw;color:#e3c272">${corner}</span>`).join(''):'';
  const cut=pcut(t,f+' '+l), art=`<div class="art"><img class="bgi" src="${src}" alt=""><div class="fx1"></div><div class="fx2"></div><img class="pl" src="${cut}" alt="" onload="this.parentNode.classList.add('cut')" onerror="this.remove()"><div class="crt" style="--cut:url('${cut}')"></div></div>`;
  const L=l.toUpperCase(), lsz=Math.min(9.5,72/L.length).toFixed(2), ssz=Math.min(8,80/L.length).toFixed(2);
  const inner= size==='big'
    ? `${art}<div class="nmp"><b class="f1">${f.toUpperCase()}</b><b class="f2" style="font-size:${lsz}cqw">${L}</b><small>${tn.toUpperCase()}</small></div>`
    : `<div class="tb" style="font-size:${ssz}cqw">${L}</div>${art}<div class="ft"><span>${tm}</span><span><b>${fp}</b><small>FP</small></span></div>`;
  return `<div class="k ${size==='big'?'':'sm'} b-${border} ${fx?'e-'+fx:''}" style="--tc:${tc};--src:url('${src}')"><div class="fr"></div><div class="in">${inner}</div><div class="ov">${fil}${extras(fx,border)}</div><div class="glare"></div></div>`; }


/* ── tabs ── */
const opts=document.getElementById('opts'), main=opts.parentNode;
main.insertBefore(Object.assign(document.createElement('div'),{className:'tabs',id:'tabs'}),opts);
const pane=document.createElement('div'); pane.id='pane'; main.appendChild(pane);
pane.insertAdjacentHTML('beforebegin','<svg width="0" height="0" style="position:absolute"><filter id="onlyR"><feColorMatrix values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter><filter id="onlyB"><feColorMatrix values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>');
let MIX={border:'silver',fx:'holo'}, TAB='fin';
const TABS={shape:'SHAPES',fin:'FINISHES · 20',bor:'BORDERS · 17',mix:'MIX & MATCH',cut:'CUT-OUTS'};
function tabs(){ document.getElementById('tabs').innerHTML=Object.entries(TABS).map(([k,l])=>`<button class="${k===TAB?'on':''}" data-t="${k}">${l}</button>`).join('');
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ TAB=b.dataset.t; draw(); window.scrollTo({top:0}); }); }
function draw(){ tabs(); opts.style.display=TAB==='shape'?'':'none'; pane.style.display=TAB==='shape'?'none':'';
  if(TAB==='fin') pane.innerHTML=`<p class="intro">Twenty finishes, all on the silver frame so you can compare them. Tilt a card (or just watch, they move on their own). Every finish now sits <b>behind the player</b>: the portrait is cut out and laid on top, always with its CRT scanlines. Only light, sparks, embers and confetti pass in front. Players without a cut-out yet fall back to fading the effect out over the face. Tap any card to try it in Mix &amp; Match.</p><div class="grid">${FIN.map(([k,n,d,b],i)=>`<div class="tile" data-fx="${k}">${card({fx:k})}<h3><i>${String(i+1).padStart(2,'0')}</i>${n}</h3><p>${d}</p></div>`).join('')}</div>`;
  if(TAB==='bor') pane.innerHTML=`<p class="intro">Seventeen frames, all with no finish so the border is the only change. Tap one to try it in Mix &amp; Match.</p><div class="grid">${BOR.map(([k,n,d],i)=>`<div class="tile" data-bo="${k}">${card({border:k})}<h3><i>${String(i+1).padStart(2,'0')}</i>${n}</h3><p>${d}</p></div>`).join('')}</div>`;
  if(TAB==='mix') mix();
  if(TAB==='cut') cuts();
  pane.querySelectorAll('[data-fx]').forEach(t=>t.onclick=()=>{ MIX.fx=t.dataset.fx; TAB='mix'; draw(); window.scrollTo({top:0}); });
  pane.querySelectorAll('[data-bo]').forEach(t=>t.onclick=()=>{ MIX.border=t.dataset.bo; TAB='mix'; draw(); window.scrollTo({top:0}); });
  watch(); }
function mix(){ const sel=(k,list,none)=>`<select data-m="${k}">${none?'<option value="">NONE</option>':''}${list.map(([v,n])=>`<option value="${v}" ${MIX[k]===v?'selected':''}>${n}</option>`).join('')}</select>`;
  pane.innerHTML=`<style>#pane .mx{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:6.5px;color:var(--t2)}#pane select{font:inherit;font-size:7px;padding:9px;border-radius:8px;background:#0b1a33;color:#fff;border:2px solid var(--edge)}
   #pane .stage{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end;justify-content:center;padding:26px 0}#pane .stage .lab{font-size:5.5px;color:var(--t3);text-align:center;margin-top:9px}#pane .rowsm{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}</style>
   <div class="mx">BORDER ${sel('border',BOR)} FINISH ${sel('fx',FIN,1)}</div>
   <div class="stage"><div><div style="width:min(270px,70vw)">${card({border:MIX.border,fx:MIX.fx})}</div><div class="lab">BIG · PACKS, COLLECTION, POP-UPS</div></div>
   <div><div class="rowsm">${[0,1,2].map(p=>`<div style="width:96px">${card({size:'sm',border:MIX.border,fx:MIX.fx,p})}</div>`).join('')}</div><div class="lab">SMALL · ROSTER, WAIVERS, LISTS</div></div></div>`;
  pane.querySelectorAll('[data-m]').forEach(s=>s.onchange=()=>{ MIX[s.dataset.m]=s.value; draw(); }); }

const TN={ATL:['Atlanta Hawks','#C8102E'],BOS:['Boston Celtics','#007A33'],BKN:['Brooklyn Nets','#222'],CHA:['Charlotte Hornets','#1D1160'],CHI:['Chicago Bulls','#CE1141'],CLE:['Cleveland Cavaliers','#860038'],DAL:['Dallas Mavericks','#00538C'],DEN:['Denver Nuggets','#0E2240'],DET:['Detroit Pistons','#C8102E'],GSW:['Golden State Warriors','#1D428A'],HOU:['Houston Rockets','#CE1141'],IND:['Indiana Pacers','#002D62'],LAC:['LA Clippers','#1D428A'],LAL:['Los Angeles Lakers','#552583'],MEM:['Memphis Grizzlies','#5D76A9'],MIA:['Miami Heat','#98002E'],MIL:['Milwaukee Bucks','#00471B'],MIN:['Minnesota Timberwolves','#0C2340'],NOP:['New Orleans Pelicans','#0C2340'],NYK:['New York Knicks','#006BB6'],OKC:['Oklahoma City Thunder','#007AC1'],ORL:['Orlando Magic','#0077C0'],PHI:['Philadelphia 76ers','#006BB6'],PHX:['Phoenix Suns','#1D1160'],POR:['Portland Trail Blazers','#E03A3E'],SAC:['Sacramento Kings','#5A2D81'],SAS:['San Antonio Spurs','#8A96A0'],TOR:['Toronto Raptors','#CE1141'],UTA:['Utah Jazz','#002B5C'],WAS:['Washington Wizards','#002B5C']};
async function cuts(){ pane.innerHTML='<p class="intro">Every player\'s cut-out laid over a bright test pattern, so anything left behind (or cut off) stands out. Tap one to try him in Mix &amp; Match.</p><div class="grid" id="cg" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px"></div>';
  let RAW=[]; try{ const t=await fetch('../data.js').then(r=>r.text()); RAW=JSON.parse(t.match(/const RAW = (\[[\s\S]*?\]);/)[1]); }catch(e){}
  document.getElementById('cg').innerHTML=RAW.filter(r=>r[0]).map(([n,t])=>`<div class="tile" data-pl="${n}|${t}" style="gap:5px"><div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:repeating-conic-gradient(#ff2fb0 0 25%,#2fd0ff 0 50%) 0 0/16px 16px"><img loading="lazy" src="${pcut(t,n)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'NO CUT-OUT',style:'position:absolute;inset:0;display:grid;place-items:center;font-weight:normal;font-size:6px;background:#0b1a33;color:#ff8fa0'}))"></div><p style="font-size:5px;color:#fff">${n.toUpperCase()}</p></div>`).join('');
  pane.querySelectorAll('[data-pl]').forEach(el=>el.onclick=()=>{ const [n,t]=el.dataset.pl.split('|'), sp=n.indexOf(' '); PLAYERS[0]=[n.slice(0,sp),n.slice(sp+1),t,(TN[t]||[t])[0],(TN[t]||[0,'#1d428a'])[1],'7:30 PM','40']; TAB='mix'; draw(); window.scrollTo({top:0}); }); }
/* ── tilt: follow the pointer, otherwise drift on their own (visible cards only) ── */
const vis=new Set(); const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?vis.add(e.target):vis.delete(e.target)));
function watch(){ vis.clear(); io.disconnect(); document.querySelectorAll('#pane .k').forEach(k=>io.observe(k)); }
let hov=null; document.addEventListener('pointermove',e=>{ const k=e.target.closest&&e.target.closest('#pane .k'); hov=k; if(!k) return; const r=k.getBoundingClientRect(); k.style.setProperty('--mx',((e.clientX-r.left)/r.width).toFixed(3)); k.style.setProperty('--my',((e.clientY-r.top)/r.height).toFixed(3)); });
(function loop(){ const t=performance.now()/1000; let i=0; vis.forEach(k=>{ i++; if(k===hov) return; k.style.setProperty('--mx',(.5+.33*Math.sin(t*.7+i*1.3)).toFixed(3)); k.style.setProperty('--my',(.45+.22*Math.sin(t*.9+i*.7)).toFixed(3)); }); requestAnimationFrame(loop); })();
if(location.hash==='#check') check(); else draw();
/* ── #check: every cut-out against its original. Pink = what the cut-out removed. Pink on the player = cut off; no pink on background = left behind. ── */
async function check(){ const L=await fetch('/cutouts/index.json?'+Date.now()).then(r=>r.json()).catch(()=>[]);
  document.body.innerHTML=`<style>body{margin:0;background:#111;font-family:var(--px)}#ck{display:grid;grid-template-columns:repeat(auto-fill,150px);gap:6px;padding:6px}
   .ck{position:relative;width:150px;height:150px;background:#333;overflow:hidden}.ck img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
   .ck i{position:absolute;inset:0;background:rgba(255,0,200,.62);-webkit-mask:var(--c) center/cover no-repeat,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:var(--c) center/cover no-repeat exclude,linear-gradient(#000 0 0)}
   .ck b{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);color:#fff;font-weight:normal;font-size:6px;padding:3px;white-space:nowrap;overflow:hidden}</style>
   <div id="ck">${L.map((p,i)=>{ const [t,n]=[p.split('/')[0],p.slice(p.indexOf('/')+1)]; return `<div class="ck" id="c${i}"><img src="${pimg(t,n)}" alt=""><i style="--c:url('${pcut(t,n)}')"></i><b>${i} ${t} ${n}</b></div>`; }).join('')}</div>`; }
})();
