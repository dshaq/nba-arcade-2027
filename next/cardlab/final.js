/* Card Lab · THE COURT BACK, final candidate.
   Original + Name, plus: name truly centred, corner balls without the squiggles, pixel-stepped frame corners
   (from Pixel Frame), faint CRT scanlines (from CRT Hint), and a lightly pixelated centre ball drawn like the corner balls.
   Also a Team Series: the same back in any team's colours, for rare or special packs. */

// Draw something small on a canvas, then turn its pixels into SVG squares (a light pixel look)
function pixelize(draw, res, size, x, y, colors){
  const c=document.createElement('canvas'); c.width=c.height=res; const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  draw(g, res); const d=g.getImageData(0,0,res,res).data, s=size/res; let out='';
  const near=(r,gg,b)=>{ let best=null,bd=1e9; for(const k in colors){ const [R,G,B]=colors[k].rgb; const dd=(r-R)**2+(gg-G)**2+(b-B)**2; if(dd<bd){bd=dd;best=k;} } return colors[best].hex; };
  for(let j=0;j<res;j++){ let i=0; while(i<res){ const a=d[(j*res+i)*4+3]; if(a<110){ i++; continue; }
      const col=near(d[(j*res+i)*4],d[(j*res+i)*4+1],d[(j*res+i)*4+2]); let e=i;
      while(e+1<res && d[(j*res+e+1)*4+3]>=110 && near(d[(j*res+e+1)*4],d[(j*res+e+1)*4+1],d[(j*res+e+1)*4+2])===col) e++;
      out+=`<rect x="${(x+i*s).toFixed(2)}" y="${(y+j*s).toFixed(2)}" width="${((e-i+1)*s+.05).toFixed(2)}" height="${(s+.05).toFixed(2)}" fill="${col}"/>`; i=e+1; } }
  return out;
}
const hexRgb=h=>{ h=h.replace('#',''); if(h.length===3) h=[...h].map(x=>x+x).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); };
// The ball, exactly like the corner balls (outline, cross seams, two side curves), optionally filled
function ballDraw(line, fill, rot=0){ return (g,res)=>{ const r=res/2-1.7, c=res/2; g.translate(c,c); g.rotate(rot*Math.PI/180); g.translate(-c,-c);
  if(fill){ g.fillStyle=fill; g.beginPath(); g.arc(c,c,r,0,7); g.fill(); }
  g.strokeStyle=line; g.lineWidth=Math.max(1.2,res/15); g.lineCap='butt';
  g.save(); g.beginPath(); g.arc(c,c,r,0,7); g.clip();            // seams stay inside the ball
  g.beginPath(); g.moveTo(c-r,c); g.lineTo(c+r,c); g.moveTo(c,c-r); g.lineTo(c,c+r); g.stroke();
  g.beginPath(); g.moveTo(c-r*.72,c-r*.69); g.bezierCurveTo(c-r*.25,c-r*.3,c-r*.25,c+r*.3,c-r*.72,c+r*.69); g.stroke();
  g.beginPath(); g.moveTo(c+r*.72,c-r*.69); g.bezierCurveTo(c+r*.25,c-r*.3,c+r*.25,c+r*.3,c+r*.72,c+r*.69); g.stroke();
  g.restore(); g.beginPath(); g.arc(c,c,r,0,7); g.stroke(); }; }

function finalCourt(o){
  const P=o.pal, L=P.line, sw=1.6, T=36, B=314, id=o.id||'f';
  // every court line, so it can be drawn twice: a soft dark underlay (legible on busy floors), then the line
  const court=(c,w,op=1)=>{ const g=[`<g fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${op}">`];
    g.push(`<rect x="32" y="${T}" width="186" height="${B-T}"/><path d="M32 175H218"/><circle cx="125" cy="175" r="30"/>`);
    for(const s of [1,-1]){ const y0=s>0?T:B;
      g.push(`<rect x="94" y="${s>0?y0:y0-70}" width="62" height="70"/><circle cx="125" cy="${y0+70*s}" r="22"/>`);
      g.push(`<path d="M44 ${y0} V${y0+18*s} A81 81 0 0 ${s>0?0:1} 206 ${y0+18*s} V${y0}"/>`);
      g.push(`<circle cx="125" cy="${y0+12*s}" r="4"/><path d="M114 ${y0+6*s}H136"/>`); }
    return g.join('')+'</g>'; };
  const keys = (o.paintKey!==false) ? `<g fill="${o.keyColor||P.key}"><rect x="94" y="${T}" width="62" height="70"/><rect x="94" y="${B-70}" width="62" height="70"/><circle cx="125" cy="175" r="30"/></g>` : '';
  // name, smaller and with more air, centred in the band between frame and court
  const ls=.9, fs=5.4, pw=78, ph=11, st=2;
  const plaque=(cy)=>{ const x0=125-pw/2, x1=125+pw/2, y0=cy-ph/2, y1=cy+ph/2;   // stepped (pixel-cut) ends
    return `<path d="M${x0+st*2} ${y0}H${x1-st*2}V${y0+st}H${x1-st}V${y0+st*2}H${x1}V${y1-st*2}H${x1-st}V${y1-st}H${x1-st*2}V${y1}H${x0+st*2}V${y1-st}H${x0+st}V${y1-st*2}H${x0}V${y0+st*2}H${x0+st}V${y0+st}H${x0+st*2}Z" fill="${P.plaque}"/>`; };
  const label=(cy,rot)=>`${plaque(cy)}<text x="${125+ls/2}" y="${cy+fs/2}" text-anchor="middle" font-family="'Press Start 2P',monospace" font-size="${fs}" letter-spacing="${ls}" fill="${P.plaqueText}" ${rot?`transform="rotate(180 125 ${cy})"`:''}>NBA ARCADE</text>`;
  // the big centre ball: lightly pixelated, turned 90° so the curved seams sit top and bottom like a real ball
  const bl=o.ballLine||L, cols={line:{hex:bl, rgb:hexRgb(bl)}, fill:{hex:P.ball, rgb:hexRgb(P.ball)}};
  const centre = `<g transform="rotate(90 125 175)"><circle cx="125" cy="175" r="21" fill="${P.ball}"/>${BALL(125,175,21,P.seam||'#2a1000','none',1.8)}</g>`;
  // corners: the stepped pixel frame, with a tiny pixel ball tucked into each step (clear of the court)
  const fc=P.frame||L;
  const notch=(x0,y0,x1,y1,st,w)=>`<path d="M${x0+st*2} ${y0}H${x1-st*2}V${y0+st}H${x1-st}V${y0+st*2}H${x1}V${y1-st*2}H${x1-st}V${y1-st}H${x1-st*2}V${y1}H${x0+st*2}V${y1-st}H${x0+st}V${y1-st*2}H${x0}V${y0+st*2}H${x0+st}V${y0+st}H${x0+st*2}Z" fill="none" stroke="${fc}" stroke-width="${w}"/>`;
  const mini=(cx,cy)=>pixelize((g,res)=>{ const c=res/2, r=res/2-.8; g.strokeStyle=fc; g.lineWidth=1; g.beginPath(); g.arc(c,c,r,0,7); g.stroke(); g.fillStyle=fc; g.fillRect(0,Math.floor(c),res,1); g.fillRect(Math.floor(c),0,1,res); }, 9, 10, cx-5, cy-5, {line:{hex:fc,rgb:hexRgb(fc)}});
  const floor = o.parquet ? `url(#pq-${id})` : `url(#fl-${id})`;
  return `<svg viewBox="0 0 250 350"><defs>
      <radialGradient id="fl-${id}" cx=".5" cy=".46" r=".78"><stop offset="0" stop-color="${P.field2}"/><stop offset="1" stop-color="${P.field}"/></radialGradient>
      <pattern id="pq-${id}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${P.field}"/>
        ${[0,1].map(a=>[0,1].map(b=>{ const x=a*10,y=b*10, h=(a+b)%2===0; return [0,1,2,3,4].map(k=>h?`<rect x="${x}" y="${y+k*2}" width="10" height="2" fill="${k%2?P.field:P.field2}"/>`:`<rect x="${x+k*2}" y="${y}" width="2" height="10" fill="${k%2?P.field:P.field2}"/>`).join(''); }).join('')).join('')}
        <rect width="20" height="20" fill="none" stroke="#000" stroke-opacity=".15" stroke-width=".5"/></pattern>
      <pattern id="dt-${id}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".75" fill="${L}" opacity=".22"/></pattern>
      <pattern id="sc-${id}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".16"/></pattern></defs>
    <rect width="250" height="350" rx="14" fill="${P.stock}"/>
    <rect x="9" y="9" width="232" height="332" rx="8" fill="${P.apron||floor}"/>
    ${P.apron?`<rect x="32" y="${T}" width="186" height="${B-T}" fill="${floor}"/>`:`<rect x="9" y="9" width="232" height="332" rx="8" fill="url(#dt-${id})"/>`}
    <rect x="16" y="16" width="218" height="318" rx="5" fill="none" stroke="${fc}" stroke-width="1.4"/><rect x="21" y="21" width="208" height="308" rx="3" fill="none" stroke="${fc}" stroke-width=".8"/>
    ${keys}${o.underlay?court('#000',sw+2.2,.35):''}${court(L,sw)}
    ${centre}
    ${label(28.5,true)}${label(321.5,false)}
    <rect x="9" y="9" width="232" height="332" rx="8" fill="url(#sc-${id})"/></svg>`;
}

const FINAL_PAL = {stock:'#f7f8fc', field:'#1a3f9e', field2:'#2b5bd2', line:'#eef2ff', ball:'#f07a26', seam:'#2a1000', text:'#eef2ff', key:'#14327f', plaque:'#c8102e', plaqueText:'#ffffff'};
const NBA_RED='#c8102e';
const lum = h => { const [r,g,b]=hexRgb(h); return (r*299+g*587+b*114)/1000; };
function teamPal(t){
  const a=TC[t]||'#1a3f9e', b=TC2[t]||'#ffffff', light=lum(b)>110;
  const mix=(h,k)=>'#'+hexRgb(h).map(v=>Math.round(Math.min(255,v*k)).toString(16).padStart(2,'0')).join('');
  const apron=mix(a,.5), contrast=Math.abs(lum(b)-lum(apron))>70;
  return {stock:'#f7f8fc', field:mix(a,.85), field2:mix(a,1.18), apron, line:'#ffffff', ball:'#f07a26', seam:'#2a1000', text:'#ffffff', frame: light&&contrast?b:'#ffffff', key: mix(a,.62),
    plaque: light&&contrast?b:'#ffffff', plaqueText: apron};
}
let finalTeam='BOS';
function finalSection(){
  const tile=(title, svg, note, cls='')=>`<div class="opt"><h2><b>${title}</b></h2><div class="scene"><div class="flip ${cls}"><div class="face back cback">${svg}${cls?'<i class="sheen"></i>':''}</div><div class="face front">${cards()[2].html}</div></div></div><p>${note}</p></div>`;
  const teams=Object.keys(TC).sort();
  return `<h1 style="margin-top:56px">THE COURT BACK · FINAL CANDIDATE</h1>
    <p class="sub">Original + Name with your notes: the smooth ball from before (turned like a real one), clean corners, painted keys, and the name on solid red plaques with pixel-cut ends, so the 16-bit touch lives there. Faint CRT scanlines. No foil.</p>
    <div class="row finals">
      ${tile('STANDARD', finalCourt({pal:FINAL_PAL, id:'s1'}), 'Darker painted keys, red name plaques (a nod to the NBA logo), orange ball.')}
      ${tile('STANDARD · RED KEYS', finalCourt({pal:FINAL_PAL, id:'s2', keyColor:NBA_RED}), 'Same back with red keys and centre circle: the red, white and blue of the logo, more boldly.')}
    </div>
    <h1 style="margin-top:56px">TEAM SERIES</h1>
    <p class="sub">The same back in a team's colours, for special packs. A solid border keeps the name and frame readable; court lines get a soft shadow so they stay crisp on busy floors. Pick any team:</p>
    <div class="picks" id="tpick">${teams.map(t=>`<button class="${t===finalTeam?'on':''}" onclick="finalTeam='${t}';renderFinal()">${t}</button>`).join('')}</div>
    <div class="row finals two">
      ${tile(finalTeam+' · SERIES', finalCourt({pal:teamPal(finalTeam), id:'t1', parquet:finalTeam==='BOS', underlay:true}), finalTeam==='BOS'?'Celtics green on a parquet floor, gold frame and lettering.':'Team colours with painted keys; lettering in the team\'s second colour.')}
    </div>`;
}
function renderFinal(){ const w=document.getElementById('finalWrap'); if(!w) return; w.innerHTML=finalSection();
  w.querySelectorAll('.flip').forEach(f=>{ f.onclick=()=>f.classList.toggle('on'); f.addEventListener('pointermove',e=>{ const r=f.getBoundingClientRect(); f.style.setProperty('--sx',((e.clientX-r.left)/r.width*100)+'%'); f.style.setProperty('--sy',((e.clientY-r.top)/r.height*100)+'%'); }); });
  const tp=document.getElementById('tpick'), on=tp?.querySelector('.on'); if(tp&&on) tp.scrollLeft=on.offsetLeft-tp.clientWidth/2;
  requestAnimationFrame(fitAll); }
BACKS.final={name:'FINAL', from:'Court', desc:'', svg:()=>finalCourt({pal:FINAL_PAL, id:'pp'})};
document.head.insertAdjacentHTML('beforeend', `<style>.row.finals{grid-template-columns:repeat(2,minmax(0,1fr));max-width:560px;margin-inline:auto}@media (max-width:640px){.row.finals{grid-template-columns:1fr}}</style>`);
