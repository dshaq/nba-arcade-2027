/* Card Lab · BACKS. Four original card-back directions plus a pack-pull flip demo.
   Like Pokémon / Magic / Bicycle: one iconic back that never changes, symmetric so it reads the same
   either way up, so every flip is a surprise. */

const BALL = (cx, cy, r, stroke, fill='none', sw=2) => `<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}">
  <circle cx="${cx}" cy="${cy}" r="${r}"/><path d="M${cx-r} ${cy}H${cx+r}M${cx} ${cy-r}V${cy+r}"/>
  <path d="M${cx-r*.72} ${cy-r*.69}C${cx-r*.25} ${cy-r*.3} ${cx-r*.25} ${cy+r*.3} ${cx-r*.72} ${cy+r*.69}"/>
  <path d="M${cx+r*.72} ${cy-r*.69}C${cx+r*.25} ${cy-r*.3} ${cx+r*.25} ${cy+r*.3} ${cx+r*.72} ${cy+r*.69}"/></g>`;

const BACKS = {
  /* 1 · COURT — Bicycle-style line engraving: a full court is already symmetric end to end */
  court: {name:'COURT', from:'Bicycle', desc:'One-color engraving of a full court. The two ends mirror each other, so it reads the same either way up. Classic, quiet, timeless.',
    svg:()=>{ const ln='#e9eefc', g=[];
      for(const s of [1,-1]){ const y0=s>0?32:318, dir=s;          // each half of the court
        g.push(`<rect x="94" y="${s>0?y0:y0-70}" width="62" height="70" fill="none" stroke="${ln}" stroke-width="1.6"/>`);
        g.push(`<circle cx="125" cy="${y0+70*dir}" r="22" fill="none" stroke="${ln}" stroke-width="1.6"/>`);
        g.push(`<path d="M44 ${y0} V${y0+18*dir} A81 81 0 0 ${s>0?0:1} 206 ${y0+18*dir} V${y0}" fill="none" stroke="${ln}" stroke-width="1.6"/>`);
        g.push(`<circle cx="125" cy="${y0+12*dir}" r="4" fill="none" stroke="${ln}" stroke-width="1.6"/><path d="M114 ${y0+6*dir}H136" stroke="${ln}" stroke-width="1.6"/>`); }
      const corner=(x,y,rot)=>`<g transform="translate(${x} ${y}) rotate(${rot})">${BALL(0,0,9,ln,'none',1.3)}<path d="M14 0 Q22 -8 30 0 T46 0 M0 14 Q-8 22 0 30 T0 46" fill="none" stroke="${ln}" stroke-width="1.2"/></g>`;
      return `<svg viewBox="0 0 250 350"><defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".8" fill="${ln}" opacity=".35"/></pattern></defs>
        <rect width="250" height="350" rx="14" fill="#f7f8fc"/><rect x="9" y="9" width="232" height="332" rx="8" fill="#1e44a4"/><rect x="9" y="9" width="232" height="332" rx="8" fill="url(#dots)"/>
        <rect x="16" y="16" width="218" height="318" rx="5" fill="none" stroke="${ln}" stroke-width="1.4"/><rect x="21" y="21" width="208" height="308" rx="3" fill="none" stroke="${ln}" stroke-width=".8"/>
        <rect x="32" y="32" width="186" height="286" fill="#1e44a4" stroke="${ln}" stroke-width="1.6"/><rect x="32" y="32" width="186" height="286" fill="url(#dots)" opacity=".5"/>
        <path d="M32 175H218" stroke="${ln}" stroke-width="1.6"/><circle cx="125" cy="175" r="30" fill="#1e44a4" stroke="${ln}" stroke-width="1.6"/>
        ${BALL(125,175,19,ln,'#1e44a4',1.6)}${g.join('')}
        ${corner(32,32,0)}${corner(218,32,90)}${corner(218,318,180)}${corner(32,318,270)}</svg>`; }},

  /* 2 · ARCADE — Pokémon-style: swirl, sparkles, a glossy ball, the name twice (one upside down) */
  arcade: {name:'ARCADE', from:'Pokémon', desc:'Bright, glossy and loud. A swirling arcade sky, a shiny ball in the middle, and the name top and bottom, upside down, so it looks right whichever way you hold it.',
    svg:()=>{ const stars=[...Array(26)].map((_,i)=>{ const a=i*137.5*Math.PI/180, r=30+((i*53)%120), x=125+Math.cos(a)*r*.82, y=175+Math.sin(a)*r*1.15, s=2+(i%4);
        return `<path d="M${x} ${y-s*2}L${x+s*.5} ${y-s*.5}L${x+s*2} ${y}L${x+s*.5} ${y+s*.5}L${x} ${y+s*2}L${x-s*.5} ${y+s*.5}L${x-s*2} ${y}L${x-s*.5} ${y-s*.5}Z" fill="${['#fff','#ffe066','#8ff','#f9c'][i%4]}" opacity="${.5+(i%3)*.2}"/>`; }).join('');
      const word=(y,rot)=>`<g transform="rotate(${rot} 125 ${y})"><text x="125" y="${y}" text-anchor="middle" font-family="'Press Start 2P',monospace" font-size="21" fill="#ffd93d" stroke="#1a3a8a" stroke-width="7" paint-order="stroke" letter-spacing="1">NBA</text><text x="125" y="${y+26}" text-anchor="middle" font-family="'Press Start 2P',monospace" font-size="17" fill="#ffd93d" stroke="#1a3a8a" stroke-width="7" paint-order="stroke">ARCADE</text></g>`;
      return `<svg viewBox="0 0 250 350"><defs>
        <radialGradient id="sky" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#7fe0ff"/><stop offset=".35" stop-color="#2a7be0"/><stop offset="1" stop-color="#0b2470"/></radialGradient>
        <radialGradient id="gloss" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffd2a0"/><stop offset=".35" stop-color="#ff8a2a"/><stop offset="1" stop-color="#8a3200"/></radialGradient>
        <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6fb"/><stop offset=".5" stop-color="#aeb6c6"/><stop offset="1" stop-color="#eef1f7"/></linearGradient></defs>
        <rect width="250" height="350" rx="14" fill="url(#silver)"/><rect x="10" y="10" width="230" height="330" rx="8" fill="url(#sky)"/>
        <g opacity=".35" fill="none" stroke="#bff" stroke-width="10">${[0,60,120,180,240,300].map(a=>`<path transform="rotate(${a} 125 175)" d="M125 175 C150 120 200 110 230 140"/>`).join('')}</g>
        ${stars}<circle cx="125" cy="175" r="48" fill="#fff" opacity=".18"/><circle cx="125" cy="175" r="40" fill="url(#gloss)" stroke="#2a1000" stroke-width="3"/>
        ${BALL(125,175,40,'#2a1000','none',2.4)}<ellipse cx="111" cy="158" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-30 111 158)"/>
        ${word(62,0)}${word(288,180)}</svg>`; }},

  /* 3 · LEATHER — Magic-style: a worn frame, a pebbled ball-leather oval, a nameplate, four rivets */
  leather: {name:'LEATHER', from:'Magic: The Gathering', desc:'Old-school and textured. A worn bronze frame, a pebbled basketball-leather oval with seams, a stamped nameplate and four rivets. Feels like a relic.',
    svg:()=>`<svg viewBox="0 0 250 350"><defs>
        <filter id="pebble"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .25  0 0 0 0 .08  0 0 0 .7 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
        <filter id="grime"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .18  0 0 0 0 .12  0 0 0 0 .04  0 0 0 .85 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
        <radialGradient id="oval" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#e07a2c"/><stop offset="1" stop-color="#a24a12"/></radialGradient>
        <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6e2"/><stop offset="1" stop-color="#6fa8a2"/></linearGradient></defs>
        <rect width="250" height="350" rx="14" fill="#141008"/><rect x="10" y="10" width="230" height="330" rx="4" fill="#8a6a2a"/><rect x="10" y="10" width="230" height="330" rx="4" fill="#000" filter="url(#grime)"/>
        <rect x="20" y="20" width="210" height="310" fill="none" stroke="#3a2a10" stroke-width="2"/>
        <ellipse cx="125" cy="172" rx="94" ry="140" fill="url(#oval)" stroke="#6f6ab8" stroke-width="2.5"/><ellipse cx="125" cy="172" rx="94" ry="140" fill="#000" filter="url(#pebble)"/>
        <g fill="none" stroke="#2a1000" stroke-width="3" opacity=".75"><path d="M31 172H219M125 32V312"/><path d="M58 70C100 120 100 224 58 274"/><path d="M192 70C150 120 150 224 192 274"/></g>
        <g transform="translate(125 98)"><text text-anchor="middle" font-family="'Bangers',cursive" font-size="44" letter-spacing="2" fill="#7fc6d6" stroke="#1d1206" stroke-width="5" paint-order="stroke">ARCADE</text><text y="22" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#e8e0c8" stroke="#1d1206" stroke-width="3" paint-order="stroke">Hoops Collectibles</text></g>
        <rect x="58" y="282" width="134" height="26" fill="url(#plate)" stroke="#1d1206" stroke-width="2.5"/><text x="125" y="300" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="4" fill="#1d1206">EST. 2026</text>
        ${[[30,30],[220,30],[30,320],[220,320]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#d8642a" stroke="#3a1500" stroke-width="1.5"/><circle cx="${x-1.5}" cy="${y-1.5}" r="2" fill="#ffc79e"/>`).join('')}</svg>`},

  /* 4 · NEON NIGHT — Lorcana-style: black, ribbons of light, a gold emblem, thin gold corner brackets */
  neon: {name:'NEON NIGHT', from:'Lorcana', desc:'Dark and premium. Ribbons of light swirl around a gold ball emblem inside a hexagon, with thin gold brackets at the corners. Pairs best with holo fronts.',
    svg:()=>{ const rib=(d,c1,c2,w,id)=>`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient><path d="${d}" fill="none" stroke="url(#${id})" stroke-width="${w}" filter="url(#glow)"/>`;
      const br=(x,y,sx,sy)=>`<path d="M${x} ${y+sy*34}V${y}H${x+sx*34}" fill="none" stroke="#d9c38a" stroke-width="1.4"/><path d="M${x+sx*5} ${y+sy*20}V${y+sy*5}H${x+sx*20}" fill="none" stroke="#d9c38a" stroke-width=".9"/>`;
      return `<svg viewBox="0 0 250 350"><defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="gold" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff3c8"/><stop offset=".6" stop-color="#d9b86a"/><stop offset="1" stop-color="#8a6a2a"/></radialGradient></defs>
        <rect width="250" height="350" rx="14" fill="#050508"/>
        ${rib('M-10 300 C60 220 40 120 140 80 S260 40 260 -10','#7a5cff','#e9e4ff',2.2,'r1')}${rib('M-10 120 C70 160 90 260 180 290 S250 330 270 360','#ff5fbf','#ffe0f2',1.6,'r2')}
        ${rib('M20 360 C40 260 120 230 160 170 S200 60 240 20','#4adfff','#e0fbff',1.4,'r3')}${rib('M260 230 C200 200 160 250 110 300 S30 340 0 330','#ffd93d','#fff6cc',1.2,'r4')}
        <path d="M125 117 L175 146 V204 L125 233 L75 204 V146Z" fill="none" stroke="#d9c38a" stroke-width="1.2" opacity=".8"/>
        <circle cx="125" cy="175" r="40" fill="url(#gold)"/>${BALL(125,175,40,'#2a1d06','none',3)}
        <path d="M125 132 L132 168 L168 175 L132 182 L125 218 L118 182 L82 175 L118 168Z" fill="#050508" opacity=".85"/><circle cx="125" cy="175" r="7" fill="#fff3c8"/>
        ${br(14,14,1,1)}${br(236,14,-1,1)}${br(14,336,1,-1)}${br(236,336,-1,-1)}</svg>`; }},
};

let backKey = 'court';
function backsSection(){
  const [t,n]=PLAYERS[cur];
  return `<h1 style="margin-top:56px">CARD BACKS</h1>
    <p class="sub">The back never changes, so every pull is a mystery until you flip it. Four directions, all symmetric so they read the same either way up. Tap a back to flip it and see a front.</p>
    <div class="row backs">${Object.entries(BACKS).map(([k,b])=>`<div class="opt"><h2><b>${b.name}</b></h2>
      <div class="scene"><div class="flip" data-k="${k}"><div class="face back">${b.svg()}</div><div class="face front">${cards()[k==='court'?2:k==='arcade'?1:0].html}</div></div></div>
      <p>${b.desc}</p><p style="color:#5d6a88">Inspired by ${b.from}</p></div>`).join('')}</div>
    <h1 style="margin-top:56px">PACK PULL</h1>
    <p class="sub">Pick a back, then tap the card to flip it. Each pull is a random player and style.</p>
    <div class="picks" id="bpick">${Object.entries(BACKS).map(([k,b])=>`<button class="${k===backKey?'on':''}" onclick="backKey='${k}';pullReset()">${b.name}</button>`).join('')}</div>
    <div class="pull"><div class="scene big"><div class="flip" id="pullCard" onclick="pullFlip()"><div class="face back">${BACKS[backKey].svg()}</div><div class="face front" id="pullFront"></div></div></div></div>`;
}
function pullReset(){ document.getElementById('backsWrap').innerHTML=backsSection(); wireBacks(); }
function pullFlip(){
  const c=document.getElementById('pullCard');
  if(c.classList.contains('on')){ c.classList.remove('on'); return; }
  const keep=cur; cur=Math.floor(Math.random()*PLAYERS.length); const html=cards()[Math.floor(Math.random()*3)].html; cur=keep;
  document.getElementById('pullFront').innerHTML=html;
  const f=document.getElementById('pullFront'); f.querySelectorAll('img.in[data-alt],.pop img').forEach(i=>i.onerror=()=>{ if(i.dataset.alt) i.src=i.dataset.alt; else i.remove(); });
  requestAnimationFrame(()=>{ c.classList.add('on'); fitAll(); });
}
function wireBacks(){
  document.querySelectorAll('.backs .flip').forEach(f=>{ f.onclick=()=>f.classList.toggle('on'); });
  requestAnimationFrame(fitAll);
}
document.head.insertAdjacentHTML('beforeend', `<style>
.flip{position:relative;aspect-ratio:5/7;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,1.4,.5,1);cursor:pointer}
.flip.on{transform:rotateY(180deg)}
.flip .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.flip .face.front{transform:rotateY(180deg)}
.flip .face.back svg{width:100%;height:100%;display:block;filter:drop-shadow(0 16px 26px rgba(0,0,0,.55));border-radius:14px}
.flip .face.front .card{width:100%;height:100%}
.row.backs{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){.row.backs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.row.backs{grid-template-columns:1fr}}
.pull{display:flex;justify-content:center;margin-top:28px}.scene.big{max-width:280px;width:100%}
</style>`);
