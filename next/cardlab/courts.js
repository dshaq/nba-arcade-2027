/* Card Lab · COURT back variations.
   Drawn as real pixel art: every back is a small grid (e.g. 72×100) painted pixel by pixel,
   then scaled up with hard edges, so lines step like a 16-bit game. A tiny 3×5 pixel font spells NBA ARCADE. */

const FONT = { // 3×5 glyphs, rows top→bottom
  N:['1001','1101','1011','1001','1001'], B:['110','101','110','101','110'], A:['010','101','111','101','101'],
  R:['110','101','110','101','101'], C:['011','100','100','100','011'], D:['110','101','101','101','110'],
  E:['111','100','110','100','111'], ' ':['000','000','000','000','000'], '★':['010','111','010','101','000']};

function pixelCourt(o){
  const W=o.w||72, H=o.h||100, px=[...Array(H)].map(()=>Array(W).fill(null));
  const set=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<W&&y<H&&c) px[y][x]=c; };
  const rect=(x0,y0,x1,y1,c)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) set(x,y,c); };
  const box=(x0,y0,x1,y1,c)=>{ for(let x=x0;x<=x1;x++){ set(x,y0,c); set(x,y1,c); } for(let y=y0;y<=y1;y++){ set(x0,y,c); set(x1,y,c); } };
  const circ=(cx,cy,r,c,keep=()=>true)=>{ let x=r,y=0,e=1-r; while(x>=y){ for(const [dx,dy] of [[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]]) if(keep(dx,dy)) set(cx+dx,cy+dy,c); y++; if(e<0) e+=2*y+1; else { x--; e+=2*(y-x)+1; } } };
  const disc=(cx,cy,r,c)=>{ for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++) if(x*x+y*y<=r*r+r*.8) set(cx+x,cy+y,c); };
  const twidth=s=>[...s].reduce((a,ch)=>a+(FONT[ch]||FONT[' '])[0].length+1,0)-1;
  const text=(s,x,y,c,rot=false)=>{ const w=twidth(s); let ox=0; [...s].forEach(ch=>{ const g=FONT[ch]||FONT[' ']; g.forEach((row,ry)=>[...row].forEach((b,rx)=>{ if(b==='1'){ const gx=ox+rx, gy=ry; rot ? set(x+w-1-gx, y+4-gy, c) : set(x+gx, y+gy, c); } })); ox+=g[0].length+1; }); return w; };
  const P=o.pal;
  // card stock + field
  rect(0,0,W-1,H-1,P.stock);
  const m=o.margin??3; rect(m,m,W-1-m,H-1-m,P.field);
  // field texture
  for(let y=m;y<H-m;y++) for(let x=m;x<W-m;x++){
    if(o.tex==='dots' && x%3===1 && y%3===1) set(x,y,P.tex);
    if(o.tex==='planks' && (y%6===0 || (x+Math.floor(y/6)*11)%23===0)) set(x,y,P.tex);
    if(o.tex==='checker' && (x+y)%2===0) set(x,y,P.tex);
    if(o.tex==='scan' && y%2===0) set(x,y,P.tex);
  }
  // borders
  if(o.border==='double'){ box(m+2,m+2,W-3-m,H-3-m,P.line); box(m+4,m+4,W-5-m,H-5-m,P.line2||P.line); }
  if(o.border==='checker'){ for(let x=m;x<W-m;x++) for(const y of [m,m+1,H-1-m,H-2-m]) if((x+y)%2===0) set(x,y,P.line); for(let y=m;y<H-m;y++) for(const x of [m,m+1,W-1-m,W-2-m]) if((x+y)%2===0) set(x,y,P.line); }
  if(o.border==='single') box(m+2,m+2,W-3-m,H-3-m,P.line);
  // court
  const cx0=Math.round(W*.15), cx1=W-1-cx0, cy0=Math.round(H*.155), cy1=H-1-cy0, mid=Math.floor(H/2), cxm=Math.floor(W/2);
  const laneW=Math.round(W*.1), laneD=Math.round(H*.16), r3=Math.round(W*.29), cr=o.cr||Math.round(W*.11);
  if(o.paint){ rect(cxm-laneW,cy0+1,cxm+laneW-1+ (W%2?1:0),cy0+laneD-1,P.paint); rect(cxm-laneW,cy1-laneD+1,cxm+laneW-1+(W%2?1:0),cy1-1,P.paint); disc(cxm,mid,cr-1,P.paint); }
  box(cx0,cy0,cx1,cy1,P.line);
  for(let x=cx0;x<=cx1;x++) set(x,mid,P.line);
  if(H%2===0) for(let x=cx0;x<=cx1;x++) set(x,mid-1, o.thickMid?P.line:null);
  circ(cxm,mid,cr,P.line); if(H%2===0) circ(cxm,mid-1,cr,P.line,(dx,dy)=>dy<0);
  for(const end of [0,1]){
    const base=end?cy1:cy0, s=end?-1:1, laneEnd=base+s*laneD;
    box(cxm-laneW, Math.min(base,laneEnd), cxm+laneW-(W%2?0:1), Math.max(base,laneEnd), P.line);
    circ(cxm, laneEnd, laneW-1, P.line, (dx,dy)=> s>0 ? dy>=0 || o.ftFull : dy<=0 || o.ftFull);
    const hoop=base+s*Math.round(H*.05);
    // three-point line: short straight corners, then the arc
    const corner=Math.round(H*.07), k=corner-Math.round(H*.05), xs=Math.round(Math.sqrt(r3*r3-k*k));
    for(let i=0;i<=corner;i++){ set(cxm-xs, base+s*i, P.line); set(cxm+xs, base+s*i, P.line); }
    circ(cxm, hoop, r3, P.line, (dx,dy)=> s>0 ? dy>=k : dy<=-k);
    // hoop + backboard
    circ(cxm, hoop, 1, P.hoop||P.line); for(let x=cxm-3;x<=cxm+3-(W%2?0:1);x++) set(x, hoop-s*2, P.line);
  }
  // centre emblem
  if(o.center==='ball'){ disc(cxm,mid,cr-3,P.ball||P.field); circ(cxm,mid,cr-3,P.line); for(let i=-(cr-3);i<=cr-3;i++){ set(cxm+i,mid,P.line); set(cxm,mid+i,P.line); } circ(cxm-(cr-3),mid,Math.round((cr-3)*.75),P.line,(dx,dy)=>dx>0); circ(cxm+(cr-3),mid,Math.round((cr-3)*.75),P.line,(dx,dy)=>dx<0); }
  if(o.center==='star'){ text('★',cxm-1,mid-2,P.line); }
  // corner balls
  if(o.corners){ for(const [x,y] of [[m+7,m+7],[W-8-m,m+7],[m+7,H-8-m],[W-8-m,H-8-m]]){ disc(x,y,3,P.ball||P.line); circ(x,y,3,P.line); set(x,y-3,P.line); set(x,y+3,P.line); for(let i=-3;i<=3;i++) set(x+i,y,P.line); } }
  // NBA ARCADE, small, placed so the card still reads the same either way up
  const T=P.text||P.line, label='NBA ARCADE', lw=twidth(label);
  if(o.label==='baselines'){ text(label, cxm-Math.floor(lw/2), cy1+3, T); text(label, cxm-Math.floor(lw/2)-(W%2?0:0), cy0-8, T, true); }
  if(o.label==='midline'){ text('NBA', cx0+3, mid-6, T); text('ARCADE', cx1-25, mid-6, T); text('NBA', cx1-13, mid+2, T, true); text('ARCADE', cx0+3, mid+2, T, true); }
  if(o.label==='center'){ disc(cxm,mid,cr-1,P.paint||P.field); text('NBA', cxm-Math.floor(twidth('NBA')/2), mid-6, T); text('ARCADE', cxm-Math.floor(twidth('ARCADE')/2), mid+2, T); }
  if(o.label==='plaque'){ for(const end of [0,1]){ const y=end?cy1+2:cy0-9; rect(cxm-Math.ceil(lw/2)-2,y,cxm+Math.ceil(lw/2)+1,y+6,P.plaque||P.line); text(label, cxm-Math.floor(lw/2), y+1, P.plaqueText||P.field, end===0); } }
  // emit: one <rect> per horizontal run of the same colour
  let out=''; for(let y=0;y<H;y++){ let x=0; while(x<W){ const c=px[y][x]; let e=x; while(e+1<W && px[y][e+1]===c) e++; if(c) out+=`<rect x="${x}" y="${y}" width="${e-x+1}" height="1" fill="${c}"/>`; x=e+1; } }
  return `<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" preserveAspectRatio="none">${out}</svg>`;
}

const PAL = {
  royal:   {stock:'#f4f1e8', field:'#1e44a4', tex:'#2a55c2', line:'#f4f6ff', line2:'#9fb4ef', ball:'#e8742a', hoop:'#ff7a3a', paint:'#18388a', plaque:'#f4f6ff', plaqueText:'#1e44a4'},
  hardwood:{stock:'#f4f1e8', field:'#d9a066', tex:'#c48a52', line:'#1b2a5a', line2:'#1b2a5a', ball:'#e8742a', hoop:'#c4122f', paint:'#2a4a9a', text:'#1b2a5a', plaque:'#1b2a5a', plaqueText:'#f4d9b0'},
  night:   {stock:'#101018', field:'#0a0a14', tex:'#14142a', line:'#4adfff', line2:'#ff5fbf', ball:'#ff8a2a', hoop:'#ff5fbf', paint:'#14143a', text:'#ffd93d', plaque:'#4adfff', plaqueText:'#0a0a14'},
  red:     {stock:'#f4f1e8', field:'#b4232c', tex:'#c53340', line:'#f9eed6', line2:'#f9eed6', ball:'#f9eed6', hoop:'#ffd93d', paint:'#8f1820', plaque:'#f9eed6', plaqueText:'#b4232c'},
  gameboy: {stock:'#9bbc0f', field:'#306230', tex:'#3a7a3a', line:'#9bbc0f', line2:'#8bac0f', ball:'#0f380f', hoop:'#0f380f', paint:'#0f380f', text:'#9bbc0f', plaque:'#9bbc0f', plaqueText:'#0f380f'},
  ink:     {stock:'#f4f1e8', field:'#14161c', tex:'#1e2230', line:'#e8d9a8', line2:'#b89a52', ball:'#d9a24a', hoop:'#e8d9a8', paint:'#22283a', text:'#e8d9a8', plaque:'#e8d9a8', plaqueText:'#14161c'},
  purple:  {stock:'#f4f1e8', field:'#4b2a8a', tex:'#5a35a0', line:'#ffd93d', line2:'#ffd93d', ball:'#ffd93d', hoop:'#ffd93d', paint:'#3a1f70', plaque:'#ffd93d', plaqueText:'#4b2a8a'},
};

const COURTS = [
  {k:'c1', name:'ROYAL · 16-BIT', note:'The original, redrawn as true pixel art. "NBA ARCADE" sits under each basket, upside down at the far end.', o:{pal:PAL.royal, tex:'dots', border:'double', center:'ball', corners:true, label:'baselines'}},
  {k:'c2', name:'ROYAL · CHUNKY', note:'Same card at a lower resolution: bigger, chunkier pixels, like an 8-bit cartridge.', o:{w:48,h:67,margin:2,pal:PAL.royal, tex:'dots', border:'single', center:'ball', label:'none'}},
  {k:'c3', name:'ROYAL · PLAQUE', note:'Name on a small plaque at both ends, like the Deckmaster bar on Magic cards.', o:{pal:PAL.royal, tex:'dots', border:'double', center:'ball', corners:true, label:'plaque'}},
  {k:'c4', name:'ROYAL · PAINTED', note:'Painted keys and center circle with fine scanlines, like a TV screen. The name stays at the baselines.', o:{pal:PAL.royal, tex:'scan', border:'double', center:'ball', label:'baselines', paint:true}},
  {k:'c5', name:'HARDWOOD', note:'A painted wood floor with navy lines and painted keys. Warm, real-arena feel.', o:{pal:PAL.hardwood, tex:'planks', border:'single', center:'ball', corners:true, label:'baselines', paint:true}},
  {k:'c6', name:'NIGHT COURT', note:'Black floor, neon cyan lines, gold lettering. The arcade-at-midnight version.', o:{pal:PAL.night, tex:'checker', border:'double', center:'ball', corners:true, label:'baselines'}},
  {k:'c7', name:'HOME RED', note:'Red and cream, like a vintage gym. Pairs well with a checkerboard border.', o:{pal:PAL.red, tex:'dots', border:'checker', center:'ball', label:'plaque'}},
  {k:'c8', name:'GAME BOY', note:'Four shades of green, straight off a 1989 handheld.', o:{w:60,h:84,margin:2,pal:PAL.gameboy, tex:'none', border:'single', center:'ball', label:'baselines', paint:true}},
  {k:'c9', name:'BLACK & GOLD', note:'Ink-black with gold linework and the name in the centre circle. The premium option.', o:{pal:PAL.ink, tex:'dots', border:'double', center:'none', corners:true, label:'center', paint:true, cr:13}},
  {k:'c10', name:'ROYAL · FOIL', note:'The 16-bit Royal with a silver foil shimmer that moves as you tilt. Could be the back for rare packs.', o:{pal:PAL.royal, tex:'dots', border:'double', center:'ball', corners:true, label:'baselines'}, foil:true},
];

function courtsSection(){
  return `<h1 style="margin-top:56px">COURT BACKS · VARIATIONS</h1>
    <p class="sub">Your pick, iterated. All drawn as real pixel art, with a small NBA ARCADE placed so the card still reads the same either way up. Tap any back to flip it.</p>
    <div class="row courts">${COURTS.map(c=>`<div class="opt"><h2><b>${c.name}</b></h2>
      <div class="scene"><div class="flip ${c.foil?'foil':''}"><div class="face back cback">${pixelCourt(c.o)}${c.foil?'<i class="sheen"></i>':''}</div><div class="face front">${cards()[2].html}</div></div></div>
      <p>${c.note}</p></div>`).join('')}</div>`;
}
function renderCourts(){ const w=document.getElementById('courtsWrap'); if(!w) return; w.innerHTML=courtsSection();
  w.querySelectorAll('.flip').forEach(f=>{ f.onclick=()=>f.classList.toggle('on');
    const tilt=e=>{ const r=f.getBoundingClientRect(), p=e.touches?e.touches[0]:e; f.style.setProperty('--sx',((p.clientX-r.left)/r.width*100)+'%'); f.style.setProperty('--sy',((p.clientY-r.top)/r.height*100)+'%'); };
    f.addEventListener('pointermove',tilt); });
  requestAnimationFrame(fitAll); }
// let the Pack Pull use the court variations too
Object.assign(BACKS, Object.fromEntries(COURTS.map(c=>[c.k,{name:c.name, from:'Court', desc:c.note, svg:()=>pixelCourt(c.o)+(c.foil?'<i class="sheen"></i>':'')}])));

document.head.insertAdjacentHTML('beforeend', `<style>
.cback{border-radius:14px;overflow:hidden;box-shadow:0 16px 26px rgba(0,0,0,.55)}
.cback svg{width:100%;height:100%;display:block;image-rendering:pixelated}
.row.courts{grid-template-columns:repeat(5,minmax(0,1fr));gap:22px 16px}
@media (max-width:1000px){.row.courts{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.row.courts{grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 14px;max-width:none}.row.courts .opt p{font-size:5.5px}}
.sheen{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:.75;
  background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.0) 38%,rgba(200,230,255,.65) 46%,rgba(255,220,250,.55) 52%,rgba(220,255,240,.5) 58%,transparent 66%);background-size:250% 250%;
  background-position:var(--sx,30%) var(--sy,30%);animation:sheen 4.5s ease-in-out infinite}
.flip.foil:hover .sheen{animation:none}
@keyframes sheen{0%,100%{background-position:0% 0%}50%{background-position:100% 100%}}
</style>`);
