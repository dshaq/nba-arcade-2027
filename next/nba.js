/* NBA Arcade · NEXT · menu pages
   · STATS: a fighting-game select screen of every Baller in the league; tap one to see their numbers.
   · NBA SCORES: real scores (any date) and conference standings, straight from ESPN's public feed.
   · BALLERS → PROFILE: display name, team name and app theme (saved on this phone in the preview).
   · Team Duels: fills in yesterday's final score. */

/* ── profile + theme ── */
S.profile ||= {};
const THEMES = {
  arcade:  {name:'ARCADE',   v:{}},
  midnight:{name:'MIDNIGHT', v:{'--bg':'#05030f','--bg2':'#0d0820','--card':'#140c2e','--edge':'#2e2058','--t2':'#c0b0f0','--t3':'#6a5a9a'}},
  gameboy: {name:'POCKET', v:{'--bg':'#0f1f0f','--bg2':'#163016','--card':'#1b3a1b','--edge':'#2f5a2f','--t1':'#e0f8d0','--t2':'#a8d890','--t3':'#5a8a4a'}},
  sunset:  {name:'SUNSET',   v:{'--bg':'#1a0610','--bg2':'#2a0a1a','--card':'#3a1022','--edge':'#6a2440','--t2':'#ffc0a0','--t3':'#a06070'}},
};
function applyTheme(){ const t=THEMES[S.theme]||THEMES.arcade, r=document.documentElement;
  Object.values(THEMES).forEach(x=>Object.keys(x.v).forEach(k=>r.style.removeProperty(k)));
  Object.entries(t.v).forEach(([k,v])=>r.style.setProperty(k,v)); }
applyTheme();
// your saved names show everywhere in the preview
const nb_render = render;
render = function(){ if(S.profile.name) ME.name=S.profile.name; if(S.profile.team){ ME.team=S.profile.team; if(TEAMS[0]) TEAMS[0].team=S.profile.team; } if(S.profile.name && TEAMS[0]) TEAMS[0].m=S.profile.name; return nb_render.apply(this, arguments); };

/* ── TEXT SIZE ── Large (default) = every font 30% bigger than the original design; Small = original.
   Works by scaling each px font-size in the page's styles once (remembering the original), plus any
   inline font-sizes in rendered markup. Switching back and forth always starts from the originals. */
S.text ||= 'large';
const TXT_K = () => S.text==='small' ? 1 : 1.3;
const _fsOrig = new WeakMap();
function scaleFonts(){
  const k=TXT_K();
  for(const sh of document.styleSheets){ let rs; try{ rs=sh.cssRules; }catch(e){ continue; }
    const walk=rs=>{ for(const r of rs){ if(r.cssRules) walk(r.cssRules);
      const st=r.style; if(!st||!st.fontSize) continue;
      let o=_fsOrig.get(r); if(o===undefined){ const m=st.fontSize.match(/^([\d.]+)px$/); o=m?+m[1]:null; _fsOrig.set(r,o); }
      if(o) st.setProperty('font-size',(o*k).toFixed(2)+'px', st.getPropertyPriority('font-size')); } };
    walk(rs); }
  document.querySelectorAll('[style*="font-size"]').forEach(el=>{
    if(el.closest('svg')) return;
    if(el.dataset.fs0===undefined){ const m=el.style.fontSize.match(/^([\d.]+)px$/); el.dataset.fs0=m?m[1]:''; }
    if(el.dataset.fs0) el.style.fontSize=(+el.dataset.fs0*k).toFixed(2)+'px'; });
  document.documentElement.dataset.text=S.text;
}
let _fsQ=0; const queueFonts=()=>{ if(_fsQ) return; _fsQ=requestAnimationFrame(()=>{ _fsQ=0; scaleFonts(); }); };
new MutationObserver(queueFonts).observe(document.head,{childList:true});
new MutationObserver(muts=>{ if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1 && (n.matches?.('[style*="font-size"]') || n.querySelector?.('[style*="font-size"]'))))) queueFonts(); }).observe(document.body,{childList:true,subtree:true});
scaleFonts();

/* ── BALLERS is only Ballers again; profile, theme and text size live in SETTINGS ── */
const BZ = {tab:'baller'};
function settings(){
  const f=(id,l,v,ph)=>`<label class="pf"><span>${l}</span><input id="${id}" value="${String(v||'').replace(/"/g,'&quot;')}" placeholder="${ph}" maxlength="24"></label>`;
  return topBar()+`<div class="screen"><div class="head"><button class="back" onclick="go('home')">◀</button><h1>SETTINGS</h1></div>
    <div class="panel"><div class="sec">PROFILE</div>
      ${f('pfn','DISPLAY NAME',ME.name,'Your name')}${f('pft','FANTASY TEAM NAME',ME.team,'Your team')}
      <button class="go" style="width:100%;margin-top:12px" onclick="saveProfile()">SAVE</button>
      <div class="reward" style="margin:12px 0 0">Preview: saved on this phone only, so the real league isn't touched.</div></div>
    <div class="panel"><div class="sec">SOUND</div><div class="sndrow"><button class="sndt ${S.snd!==false?'on':''}" onclick="S.snd=${S.snd===false};save();render();${S.snd===false?"SFX('saved')":''}">${S.snd!==false?'🔊 ON':'🔇 OFF'}</button>
      <input type="range" min="0" max="100" value="${Math.round((S.sndVol==null?.6:S.sndVol)*100)}" oninput="S.sndVol=this.value/100;save()" onchange="SFX('check')" ${S.snd===false?'disabled':''} aria-label="Volume" style="accent-color:var(--gold)"></div></div>
    <div class="panel"><div class="sec">APP THEME</div><div class="thm">${Object.entries(THEMES).map(([k,t])=>`<button class="${(S.theme||'arcade')===k?'on':''}" onclick="S.theme='${k}';save();applyTheme();render()"><i style="background:${t.v['--bg']||'#020c18'};border-color:${t.v['--edge']||'#1e3258'}"><b style="background:${t.v['--card']||'#0d1530'}"></b></i>${t.name}</button>`).join('')}</div></div>
    <div class="panel"><div class="sec">TEXT SIZE</div><div class="tsz">${[['large','LARGE','Aa'],['small','SMALL','Aa']].map(([k,l,a])=>`<button class="${S.text===k?'on':''}" onclick="S.text='${k}';save();scaleFonts();render()"><b style="font-size:${k==='large'?18:13}px">${a}</b>${l}${k==='large'?'<small>DEFAULT</small>':''}</button>`).join('')}</div></div>
  </div>`;
}
SCREENS.settings = settings;
function saveProfile(){ const n=document.getElementById('pfn').value.trim(), t=document.getElementById('pft').value.trim();
  if(n.length<2){ say('Name is too short'); return; } S.profile={name:n, team:t||ME.team}; save(); render(); say('Profile saved'); }

/* ── STATS: Baller select screen ── */
const SU = {sel:0};
function statsUsers(){
  const st=standings(), sorted=[...st].sort((a,b)=>b.w-a.w||b.pf-a.pf);
  const users=TEAMS.map((t,i)=>({i, m:i===0?ME.name:t.m, team:i===0?ME.team:t.team, ch:i===0?S.active:chOf(t), me:i===0}));
  SU.sel=Math.min(SU.sel,users.length-1);
  const u=users[SU.sel], row=st.find(x=>x.i===u.i)||{w:0,l:0,pf:0}, rank=sorted.findIndex(x=>x.i===u.i)+1;
  const roster=(u.i===0?myNames():(OTHER[u.i]||[])).filter(Boolean), fc=featuredOf(u.i, roster);
  const byName=(rows)=>rows.find(r=>u.me?r[1]==null:r[0]===u.m);
  const d=byName(DSTAND), c=byName(CSTAND);
  const stat=(l,v,sub,col)=>`<div class="ust" style="--sc:${col}"><span>${l}</span><b>${v}</b><small>${sub}</small></div>`;
  // character select: balanced rows (10 → 5+5, 6 → 3+3, 7 → 4+3), every other row nudged half a tile
  const nRows=Math.ceil(users.length/5), per=Math.ceil(users.length/nRows), rows=[]; for(let k=0;k<users.length;k+=per) rows.push(users.slice(k,k+per));
  const tile=(x,k)=>`<button class="ut ${k===SU.sel?'on':''} ${x.me?'me':''}" onclick="SU.sel=${k};render()"><span class="in"><span class="av" data-ch="${x.ch}"></span></span>${k===SU.sel?'<i class="p1">1P</i>':''}</button>`;
  const nm=u.m, nsz=Math.max(12,Math.min(26,Math.floor(170/Math.max(4,nm.length))));
  return `<div class="usel"><div class="ugrid2">${rows.map((r,ri)=>`<div class="urow ${ri%2?'off':''}" style="--per:${per}">${r.map(x=>tile(x,users.indexOf(x))).join('')}</div>`).join('')}</div>
    <div class="ustage" id="ustage"><span class="u1p">${u.me?'1P':'CPU'}</span>
      <div class="uhero"><span class="av" data-ch="${u.ch}"></span></div>
      <div class="ubio"><div class="uname" style="font-size:${nsz}px">${nm}</div><div class="uteam">${u.team.toUpperCase()}</div><div class="urank">FANTASY: ${ordinal(rank).toUpperCase()} OF ${users.length}</div></div></div>
    <div class="ufold">
      <div class="ucol">
        ${stat('FANTASY', `${row.w}-${row.l}`, 'FALL RUN', 'var(--orange)')}
        ${stat('DUEL', d?(d[2]==='—'?'—':d[2]+'%'):'—', 'CORRECT', 'var(--pink)')}
        ${stat('CHALLENGE', c?c[4]:'—', 'WIN %', 'var(--gold)')}
      </div>
      <div class="ufeat ${u.me?'mine':''}"><span class="fl">FEATURED CARD${u.me?'<button class="fpk" onclick="pickFeatured()" aria-label="Pick your featured card">✎ PICK</button>':''}</span>
        <div class="fcard">${fc?pcard(fc,{noTap:1}):'<div class="tcard pc mini"></div>'}</div></div>
    </div></div>`;
}
/* Featured card: yours is any player you choose; everyone else shows their top scorer this run until they choose */
function featuredOf(i, roster){
  if(i===0 && S.featured && P(S.featured)?.n) return S.featured;
  if(i===0 && S.captain && P(S.captain)?.n) return S.captain;
  return [...roster].sort((a,b)=>(+P(b).fall||0)-(+P(a).fall||0))[0]||null;
}
const captainOf = featuredOf;
function pickFeatured(){
  const all=PL.filter(p=>p.n).sort((a,b)=>b.f-a.f);
  const o=overlay(`<div class="sheet capk" style="--c:var(--gold)"><h3>⭐ FEATURED CARD</h3><p>Show off any player's card on your profile. It doesn't have to be someone on your team.</p>
    <input class="fq" id="fq" placeholder="Search players" autocomplete="off">
    <div class="capg" id="fg"></div></div>`);
  const draw=q=>{ const L=all.filter(p=>!q||p.n.toLowerCase().includes(q)).slice(0,40);
    o.querySelector('#fg').innerHTML=L.map(p=>`<button data-n="${escA(p.n)}" class="${S.featured===p.n?'on':''}">${pcard(p.n,{noTap:1})}<em>${p.s}</em></button>`).join('')||'<p>No players found</p>';
    o.querySelectorAll('#fg button').forEach(b=>b.onclick=()=>{ S.featured=b.dataset.n; save(); o.remove(); render(); say(`${P(b.dataset.n).s} is your featured card`); }); };
  draw(''); o.querySelector('#fq').oninput=e=>draw(e.target.value.trim().toLowerCase());
}
const pickCaptain = pickFeatured;
/* stage colour = the baller's own colour */
AFTER.stats = (prev=>()=>{ prev&&prev(); const st=document.getElementById('ustage'); if(!st) return;
  setTimeout(()=>{ const cv=st.querySelector('.uhero canvas'); if(!cv) return; try{ const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; const bins={};
    for(let k=0;k<d.length;k+=4){ if(d[k+3]<200) continue; const r=d[k],g=d[k+1],b=d[k+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b); if(mx-mn<50||mx<70) continue; const key=(r>>5)+','+(g>>5)+','+(b>>5); (bins[key]||=[0,0,0,0]); bins[key][0]++; bins[key][1]+=r; bins[key][2]+=g; bins[key][3]+=b; }
    const top=Object.values(bins).sort((a,b)=>b[0]-a[0])[0]; if(top) st.style.setProperty('--bc',`rgb(${top[1]/top[0]|0},${top[2]/top[0]|0},${top[3]/top[0]|0})`); }catch(e){} }, 30); })(AFTER.stats);

/* ── NBA SCORES ── */
const NZ = {tab:'scores', d:0, cache:{}};
const ESPN='https://site.api.espn.com/apis';
const ymdOff = k => { const t=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'})); t.setDate(t.getDate()+k); return t; };
const ymdStr = t => `${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}`;
async function espn(url){ if(NZ.cache[url]) return NZ.cache[url];
  const r=await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status); const j=await r.json(); NZ.cache[url]=j; return j; }
function nbaLoad(){
  const url = NZ.tab==='scores' ? `${ESPN}/site/v2/sports/basketball/nba/scoreboard?dates=${ymdStr(ymdOff(NZ.d))}` : `${ESPN}/v2/sports/basketball/nba/standings`;
  if(NZ.cache[url]) return NZ.cache[url];
  if(!NZ.busy){ NZ.busy=url; espn(url).then(()=>{ NZ.busy=null; NZ.err=null; if(cur==='nba') render(); }).catch(e=>{ NZ.busy=null; NZ.err=e.message; if(cur==='nba') render(); }); }
  return null;
}
function nba(){
  const data=nbaLoad(), tabs=`<div class="mtabs">${[['scores','SCORES'],['stand','STANDINGS']].map(([k,l])=>`<button class="${NZ.tab===k?'on':''}" onclick="NZ.tab='${k}';render()">${l}</button>`).join('')}</div>`;
  let body = !data ? `<div class="nbx">${NZ.err?`Couldn't reach the scores right now (${NZ.err}). <button class="go" onclick="NZ.err=null;render()">TRY AGAIN</button>`:'LOADING…'}</div>` : NZ.tab==='scores' ? nbaScores(data) : nbaStand(data);
  if(NZ.tab==='scores'){ const d=ymdOff(NZ.d);
    body = `<div class="ndate"><button class="ar" onclick="NZ.d--;render()">◀</button><b>${NZ.d===0?'TODAY':NZ.d===-1?'YESTERDAY':NZ.d===1?'TOMORROW':''}<small>${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase()}</small></b><button class="ar" onclick="NZ.d++;render()">▶</button></div>`+body; }
  return mframe('nb','NBA SCORES', tabs+body);
}
function nbaScores(j){
  const ev=j.events||[]; if(!ev.length) return '<div class="nbx">No games on this day.</div>';
  return `<div class="ngames">${ev.map(e=>{ const c=e.competitions[0], st=c.status.type, sides=['away','home'].map(h=>c.competitors.find(x=>x.homeAway===h));
    const done=st.state==='post', live=st.state==='in', sc=sides.map(x=>+x.score||0), win=done?(sc[0]>sc[1]?0:1):-1;
    const row=(x,k)=>`<div class="nt ${k===win?'w':''}"><img src="${x.team.logo}" alt=""><b>${x.team.abbreviation}</b><small>${(x.records&&x.records[0]&&x.records[0].summary)||''}</small><span>${st.state==='pre'?'':x.score}</span></div>`;
    return `<div class="ng ${live?'live':''}">${row(sides[0],0)}${row(sides[1],1)}<div class="ns">${live?'● ':''}${st.shortDetail.replace(' - ',' ').toUpperCase()}</div></div>`; }).join('')}</div>`;
}
function nbaStand(j){
  const conf=(j.children||[]);
  if(!conf.length) return '<div class="nbx">No standings yet.</div>';
  const sv=(e,n)=>{ const s=(e.stats||[]).find(x=>x.name===n); return s?(s.displayValue??s.value):''; };
  return conf.map(cf=>{ const seed=e=>{ const v=(e.stats||[]).find(x=>x.name==='playoffSeed'); return v?+v.value:99; }, ent=[...(cf.standings&&cf.standings.entries||[])].sort((a,b)=>seed(a)-seed(b)||(+sv(b,'winPercent'))-(+sv(a,'winPercent')));
    return `<div class="ncf"><div class="nch">${cf.name.toUpperCase()}</div><div class="nsh"><span>#</span><span>TEAM</span><span>W-L</span><span>GB</span><span>STRK</span></div>
      ${ent.map((e,k)=>`<div class="nsr ${k===5||k===9?'cut':''}"><span>${k+1}</span><span class="tm"><img src="${(e.team.logos&&e.team.logos[0]&&e.team.logos[0].href)||''}" alt="">${e.team.abbreviation}</span><span>${sv(e,'wins')}-${sv(e,'losses')}</span><span>${sv(e,'gamesBehind')}</span><span>${sv(e,'streak')}</span></div>`).join('')}</div>`; }).join('')
    + '<div class="nbx" style="padding:8px 0">— AFTER 6TH: PLAY-IN · AFTER 10TH: OUT</div>';
}
SCREENS.nba = nba;

/* ── Team Duels: yesterday's final score ── */
const nb_yd = ydSplash;
ydSplash = function(){
  const had=!!document.querySelector('.dsplash'); nb_yd(); const g=document.querySelector('.dsplash');
  if(had || !g) return; const ts=[...g.querySelectorAll('.yf[data-team]')].map(x=>x.dataset.team).filter(Boolean); if(ts.length<2) return;
  espn(`${ESPN}/site/v2/sports/basketball/nba/scoreboard?dates=${ymdStr(ymdOff(-1))}`).then(j=>{
    const e=(j.events||[]).find(e=>{ const ab=e.competitions[0].competitors.map(c=>c.team.abbreviation); return ts.every(t=>ab.includes(t)||ab.includes({UTA:'UTAH',GSW:'GS',NOP:'NO',NYK:'NY',SAS:'SA',WAS:'WSH'}[t])); });
    if(!e) return; const cs=e.competitions[0].competitors;
    g.querySelectorAll('.yf[data-team]').forEach(y=>{ const t=y.dataset.team, c=cs.find(c=>c.team.abbreviation===t||c.team.abbreviation===({UTA:'UTAH',GSW:'GS',NOP:'NO',NYK:'NY',SAS:'SA',WAS:'WSH'}[t]));
      if(c){ y.querySelector('.v').innerHTML=`${c.score}<small>PTS</small>`; const bot=y.querySelector('.rc-bot b'); if(bot) bot.textContent=`FINAL · ${c.score}`; } });
  }).catch(()=>{});
};

document.head.insertAdjacentHTML('beforeend',`<style>
.tsz{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tsz button{font:inherit;font-size:6px;color:var(--t2);background:var(--bg);border:2px solid var(--edge);border-radius:8px;padding:10px 4px;cursor:pointer;line-height:1.8}
.tsz button b{display:block;font-weight:normal;color:var(--t1);margin-bottom:4px}.tsz button small{display:block;font-size:5px;color:var(--t3)}
.tsz button.on{border-color:var(--gold);color:var(--gold)}
.pf{display:block;margin-top:12px}.pf span{display:block;font-size:6px;color:var(--t3);margin-bottom:6px}
.pf input{width:100%;font:inherit;font-size:9px;padding:11px 10px;border-radius:8px;border:2px solid var(--edge);background:var(--bg);color:var(--t1)}
.thm{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.thm button{font:inherit;font-size:5.5px;color:var(--t2);background:none;border:2px solid transparent;border-radius:8px;padding:6px 2px;cursor:pointer}
.thm button.on{border-color:var(--gold);color:var(--gold)}
.thm i{display:block;height:44px;border:2px solid;border-radius:6px;margin-bottom:6px;padding:8px}.thm i b{display:block;height:100%;border-radius:3px}
/* stats select screen */
.st{--mc:var(--blue)}
.usel{display:flex;flex-direction:column;gap:10px}
.ugrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:6px;background:#000;border:3px solid #000;box-shadow:0 0 0 2px var(--blue);border-radius:8px}
.ut{position:relative;aspect-ratio:1/1;font:inherit;border:2px solid #24325a;background:linear-gradient(180deg,#14214a,#0a1230);border-radius:3px;cursor:pointer;padding:0;display:grid;place-items:center;overflow:hidden}
.ut .av canvas{width:34px;height:34px;image-rendering:pixelated}
.ut em{position:absolute;left:0;right:0;bottom:1px;font-style:normal;font-size:4px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ut.on{border-color:var(--gold);box-shadow:0 0 0 2px #e94560 inset,0 0 12px rgba(255,217,61,.5);background:linear-gradient(180deg,#3a2a10,#1a1230)}
.ut .p1{position:absolute;left:1px;top:1px;font-style:normal;font-size:5px;color:#fff;background:#e94560;padding:1px 2px;animation:blink .7s steps(2) infinite}
.ut.me em{color:var(--green)}
.upick{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:12px;border:3px solid #000;box-shadow:0 0 0 2px var(--blue);border-radius:10px;background:radial-gradient(circle at 25% 40%,#1d3a7a,#060c22 70%)}
.ubig{position:relative;display:grid;place-items:center;grid-row:span 2}
.ubig .av canvas{width:96px;height:96px;image-rendering:pixelated;animation:float 2.4s ease-in-out infinite}
.ubig .ush{width:60px;height:8px;border-radius:50%;background:rgba(0,0,0,.5);margin-top:4px;animation:shad 2.4s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-10px)}}@keyframes shad{50%{transform:scaleX(.7);opacity:.6}}
.uid b{display:block;font-weight:normal;font-size:11px;color:#fff;text-shadow:2px 2px 0 #000}.uid small{display:block;font-size:5.5px;color:var(--t2);margin-top:6px}
.usts{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}
.ust{background:rgba(0,0,0,.45);border:2px solid #24325a;border-radius:6px;padding:7px 5px;text-align:center;min-width:0}
.ust span{display:block;font-size:4.5px;color:#7fc8ff}.ust b{display:block;font-weight:normal;font-size:9px;color:#fff;margin:6px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ust small{display:block;font-size:4.5px;color:var(--gold)}
/* NBA scores */
.nb{--mc:#ff7a18}
.ndate{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:8px;text-align:center}
.ndate b{font-weight:normal;font-size:9px}.ndate small{display:block;font-size:5.5px;color:var(--t2);margin-top:5px}
.ndate .ar{height:34px;border:2px solid #000;border-radius:6px;background:#e94560;color:#fff;font-size:10px;cursor:pointer;box-shadow:0 3px 0 #7a1020}
.nbx{text-align:center;font-size:7px;color:var(--t2);padding:30px 0;line-height:2}
.ngames{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ng{background:var(--card);border:2px solid var(--edge);border-radius:8px;padding:8px}.ng.live{border-color:var(--green)}
.nt{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:5px;padding:3px 0;font-size:7px;color:var(--t2)}
.nt img{width:18px;height:18px;object-fit:contain}.nt b{font-weight:normal}.nt small{display:none}.nt span{font-size:9px}
.nt.w{color:#fff}.nt.w span{color:var(--gold)}
.ns{font-size:5px;color:var(--t3);margin-top:6px;text-align:center}.ng.live .ns{color:var(--green)}
.ncf{margin-bottom:12px}.nch{font-size:7px;color:var(--mc);margin:4px 0 8px}
.nsh,.nsr{display:grid;grid-template-columns:18px 1fr 50px 34px 34px;gap:4px;align-items:center;font-size:6px}
.nsh{font-size:5px;color:var(--t3);padding-bottom:5px;border-bottom:1px solid var(--edge)}
.nsr{padding:4px 0;border-bottom:1px solid #12203c;color:var(--t1)}.nsr.cut{border-bottom:2px dashed var(--t3)}
.nsr .tm{display:flex;align-items:center;gap:6px}.nsr img{width:16px;height:16px;object-fit:contain}
.nsr span:nth-child(n+3),.nsh span:nth-child(n+3){text-align:right}
</style>`);

if(!document.querySelector('link[href*="Bungee"]')) document.head.insertAdjacentHTML('beforeend','<link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">');
document.head.insertAdjacentHTML('beforeend',`<style>
/* Nov 20 · Stats */
.st .mhead{align-items:center}
.stdd{position:relative;margin-left:auto;display:inline-block}
.stdd span{display:block;font-size:6.5px;padding:8px 10px;border-radius:14px;border:2px solid var(--blue);background:var(--card);color:var(--t1);white-space:nowrap;pointer-events:none}
.stdd select{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:16px;width:100%}
.ustage{--bc:#ff6a1a;position:relative;height:150px;border:3px solid #000;box-shadow:0 0 0 2px #2d2668,0 8px 24px rgba(0,0,0,.5);overflow:hidden;border-radius:4px;
  background:repeating-linear-gradient(-62deg,transparent 0 14px,color-mix(in srgb,var(--bc) 22%,transparent) 14px 16px),radial-gradient(ellipse at 22% 35%,color-mix(in srgb,var(--bc) 55%,#000) 0%,#0b0726 62%)}
.ustage::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}
.u1p{position:absolute;right:9px;top:9px;font-size:7px;color:#000;background:#ff3b5c;padding:4px 6px;transform:skewX(-12deg);z-index:2;box-shadow:2px 2px 0 #000}
.uhero{position:absolute;left:8px;top:8px;z-index:1}
.uhero .av canvas{width:96px;height:96px;image-rendering:pixelated;filter:drop-shadow(5px 5px 0 rgba(0,0,0,.45));animation:float 2.4s ease-in-out infinite}
.ubio{position:absolute;right:12px;left:42%;top:34px;bottom:10px;display:flex;flex-direction:column;align-items:flex-end;gap:7px;text-align:right;z-index:2}
.uname{font-family:'Bungee','Arial Black',Impact,sans-serif;font-size:30px;line-height:.9;transform:skewX(-12deg);color:#f4f2ff;text-shadow:3px 3px 0 var(--bc),5px 5px 0 #000;word-break:break-word}
.uteam{font-size:6.5px;color:#ffd23d;letter-spacing:.1em;line-height:1.5}
.urank{margin-top:auto;font-size:5.5px;color:#c8c2ff}
.usts{grid-template-columns:repeat(3,minmax(0,1fr))!important;margin-top:0!important}
.ucap{display:grid;grid-template-columns:118px 1fr;gap:12px;align-items:center;padding:12px;border:3px solid #000;box-shadow:0 0 0 2px var(--gold);border-radius:10px;background:radial-gradient(circle at 20% 30%,#3a2a10,#0a0818 70%);min-height:190px}
.ucap.mine{cursor:pointer}
.ucap .cc .tcard{width:118px}
.ucap .ci{display:flex;flex-direction:column;gap:7px;min-width:0}
.ucap .ci>span{font-size:6px;color:var(--gold);letter-spacing:.1em}
.ucap .ci b{font-family:'Bungee','Arial Black',Impact,sans-serif;font-weight:normal;font-size:24px;line-height:.95;color:#fff;transform:skewX(-10deg);text-shadow:2px 2px 0 #c4122f,4px 4px 0 #000;white-space:nowrap}
.ucap .ci small{font-size:5.5px;color:var(--t2);line-height:1.6}
.ucap .cst{display:flex;gap:10px}.ucap .cst i{font-style:normal;font-size:10px;color:#fff}.ucap .cst em{display:block;font-style:normal;font-size:4.5px;color:var(--t3);margin-top:4px}
.ucap .go{align-self:flex-start;font-size:6px;padding:8px 10px}
.capg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;max-height:52vh;overflow-y:auto;padding:2px}
.capg button{font:inherit;background:none;border:2px solid transparent;border-radius:6px;padding:3px;cursor:pointer;color:var(--t2);display:flex;flex-direction:column;gap:4px;align-items:center}
.capg button.on{border-color:var(--gold)}
.capg em{font-style:normal;font-size:5px}
</style>`);

/* ── RULES (copied from the live site's rule pop-ups; Fantasy roster numbers updated to NEXT's 13 + IR) ── */
const RZ={tab:'fz'};
function rulesScreen(){
  const sec=(t,c,b)=>`<div class="rlsec"><div class="rlh" style="color:${c}">${t}</div>${b}</div>`;
  const row=(l,v)=>`<div class="rlr"><span>${l}</span><b>${v}</b></div>`;
  const note=t=>`<p class="rln">${t}</p>`;
  const FP=[['Points','+ 1.0 FP each'],['Rebounds','+ 1.0 FP each'],['Assists','+ 1.0 FP each'],['Steals','+ 1.0 FP each'],['Blocks','+ 1.0 FP each'],['Missed FG','− 1.0 FP each'],['Missed FT','− 1.0 FP each'],['Turnovers','− 1.0 FP each'],['Flagrant Fouls','− 1.0 FP each'],['Technical Fouls','− 1.0 FP each']].map(([l,v])=>row(l,v)).join('');
  const RUNS_=[['Fall','2026-10-20','2026-12-27','#ff6600'],['Winter','2026-12-28','2027-02-18','#4a9eff'],['Spring','2027-02-25','2027-04-11','#00d4aa'],['Summer','2027-04-13','2027-06-30','#fec419']];
  const T={
   fz:()=>sec('ROSTER','var(--green)',`${row('Total Roster Size','13 players')}${row('Active (scoring)','10 players')}${row('Bench','3 players')}${row('Injured Reserve','+1 (14 with IR)')}${note('Set players Active or Bench each day from the Roster tab. Your top-FP player cannot be dropped.')}`)
     +sec('SCORING','var(--gold)',`${FP}${note('Only your 10 active players score each week. Stats are updated from live NBA box scores.')}`)
     +sec('MATCHUPS','var(--orange)',`${row('Schedule','Weekly · Mon – Sun')}${row('Scoring period','Each run has its own standings')}${row('Tiebreaker','Total FP for the run')}${note('Head-to-head matchups reset every Monday. Win your matchup by scoring more FP than your opponent across all active players that week.')}`)
     +sec('WAIVERS','var(--blue)',`${row('Acquisitions per matchup','7 (7-day matchups)')}${row('Waiver period','1 day')}${row('Waiver order','Rolling · successful claim → back of the line')}${row('Order resets','Never')}${row('Starting order','Reverse of the draft order')}${row('Free agents','Add anytime, no claim needed')}${note('A dropped player sits on waivers for 1 day. Adding him is a claim, and claims run in waiver order the next day. Whoever gets him moves to the back of the line. After the waiver period he becomes a free agent anyone can add.')}`)
     +sec('TRADES','var(--violet,#b36bff)',`${row('Teams per trade','2 or 3')}${row('Trade deadline','3/5 of the way through each run')}${row('Review period','2 days')}${row('Votes to veto','5')}${note('Every team in the trade has to accept. Then the trade sits in a 2-day league review; if 5 managers vote to veto, it is cancelled. Rosters have to stay at 13 or fewer after the trade.')}`)
     +sec('LINEUP CHANGES','var(--orange)',`${row('Setting','Daily')}${row('Locks','Each player locks at his own tip-off')}${row('Unlocks','Next day')}${note("Each player locks when his game tips off. Once locked, he can't be moved between Active and Bench until the next day. Players whose games haven't started stay movable, so you can still adjust for late games.")}${note('Only Active players earn FP. FP a player earns while Active stays with your team for the matchup, even if you bench or drop him later. A player who plays while on your Bench earns nothing.')}`)
     +sec('INJURY RESERVE (IR)','var(--blue)',`${row('IR slots','1 per team')}${row('Eligible','Players listed OUT only')}${row('IR roster lock','On')}${note('If your IR player is no longer listed OUT, your roster locks: no adds, claims or trades until you move him off IR.')}${note('Each team may place one injured player on the IR. While a player is on IR, you may carry an extra player beyond the 13-player limit. To remove a player from IR, you must first have no more than 12 other players on your roster.')}
       ${[['OUT','#e53e3e','Out','Will not play.','YES'],['DOUBT','#dd6b20','Doubtful','Unlikely to play.','NO'],['Q','#d69e2e','Questionable','Uncertain; decided close to tip-off.','NO'],['DTD','#d69e2e','Day-To-Day','Minor injury; may play any given day.','NO'],['PROB','#38a169','Probable','Expected to play.','NO']].map(([l,c,n,d,ok])=>`<div class="rlb"><span style="background:${c}">${l}</span><em>${n.toUpperCase()} — ${d}</em><i class="${ok==='YES'?'y':''}">IR: ${ok}</i></div>`).join('')}
       ${note("Statuses come from the official injury report and refresh every 15 minutes. Players without a badge are healthy. The same OUT rule applies to the Weekly Line-up Challenge's one injury swap.")}`)
     +sec('RUNS (SEASONS)','var(--t2)',RUNS_.map(([n,a,b,c])=>`<div class="rlr"><span><i class="dot" style="background:${c}"></i>${n.toUpperCase()}</span><b>${a} → ${b}</b></div>`).join('')+note('Each run has its own snake draft and standings. Your roster carries over but is re-drafted at the start of each run.'))
     +sec('DRAFT','var(--green)',`${row('Format','Snake draft')}${row('Rounds','13 rounds = 13 players')}${row('Order','Randomized each run')}${note('The snake draft alternates direction each round. Round 1 goes 1→N, Round 2 goes N→1, and so on. Draft order is re-randomized at the start of every run.')}`),
   wlc:()=>sec('BUILD YOUR LINE-UP','var(--green)',`${row('Players','1 to 5')}${row('Salary cap','$15')}${row('Player pool','25 players · 5 tiers, $1 – $5')}${row('Theme','New pool every week')}${note('Tap a player to preview him, then tap Select. Mix tiers however you like: three $5 stars, five $1 sleepers, anything up to $15.')}`)
     +sec('LOCK','var(--orange)',`${row('Saving','Final once you confirm')}${row('Picks lock','Monday · 7 AM ET')}${row('Other lineups','Hidden until lock')}`)
     +sec('WEEKLY SCORING','var(--gold)',`${row('Each player scores','Avg FP per game, Mon–Sun')}${row('Your score',"Sum of your players' averages")}${row("Player doesn't play",'0 FP')}${row('Weekly winner','Highest score')}${note('Averages mean a player with 4 games has no edge over one with 2.')}`)
     +sec('FANTASY POINTS (PER GAME)','var(--pink)',[['Points, Rebounds, Assists','+ 1 FP each'],['Steals, Blocks','+ 1 FP each'],['Missed FG, Missed FT','− 1 FP each'],['Turnovers','− 1 FP each'],['Flagrant & Technical Fouls','− 1 FP each']].map(([l,v])=>row(l,v)).join(''))
     +sec('INJURY SWAP','var(--blue)',`${row('Swaps per week','1')}${row('Who can be swapped','A player listed OUT')}${row('Replacement','Same tier, game not started')}${note("That slot then averages both players' games: the original player's before the swap, the replacement's after.")}`)
     +sec('STANDINGS POINTS','var(--green)',`${row('Each lineup you outscore','+ 1 pt')}${row('Winning the week','+ 3 pts bonus')}${row('Tied for 1st','Everyone tied gets the bonus')}${row('Skipping a week','0 pts')}${note('Example: in a 10-player week, 1st earns 9 + 3 = 12 pts, 5th earns 5 and last earns 0.')}`)
     +sec('STANDINGS','var(--orange)',`${row('Run Pts','This run only (e.g. Fall)')}${row('Total Pts','All season')}${row('Win %','Weeks won ÷ weeks played')}${row('Order','Run Pts → Total Pts → Win %')}${note('Run Pts start over each run; Total Pts keep counting all season.')}`),
   duel:()=>sec('HOW IT WORKS','var(--pink)',`<p class="rln big">Every day has its own theme. Pick the side you think wins. Get it right and extend your streak — get it wrong and it resets to zero. Ties are a PUSH: nobody wins or loses and streaks hold, as long as you voted.</p>`)
     +sec('DAILY THEMES','var(--pink)',[['MONSTER MONDAY','Points + Rebounds + Assists'],['TEAMS TUESDAY','Pick the team that wins'],['WET WEDNESDAY 💦','Most 3-pointers made'],['THOROUGH THURSDAY','Most Fantasy Points'],['FREE THROW FRIDAY','Most free throws made'],['STOCKS SATURDAY 📈','Steals + Blocks'],['SWISH SUNDAY','Most points']].map(([l,v])=>row(l,v)).join(''))
     +sec('STREAK & SCORING','var(--pink)',`${row('Correct pick','Streak +1 🔥')}${row('Wrong pick','Streak resets to 0')}${row('Push (tie / no hit)','Streak holds')}${row('Player sits out','No contest · streak holds')}${row('No pick','Streak resets')}${row('Picks lock','Once the game tips off')}${note('Streaks and total correct picks are tracked all season. Check the Leaderboard inside the Duel card to see how you stack up.')}`),
  };
  T.cards=()=>typeof cardHelpHtml==='function'?cardHelpHtml():'';
  const tabs=[['fz','FANTASY'],['wlc','CHALLENGE'],['duel','DUEL'],['cards','CARDS']];
  return topBar()+`<div class="screen"><div class="head"><button class="back" onclick="go('home')">◀</button><h1>RULES/HELP</h1></div>
    <div class="mtabs t4 rtabs">${tabs.map(([k,l])=>`<button class="${RZ.tab===k?'on':''}" onclick="RZ.tab='${k}';render()">${l}</button>`).join('')}</div>
    <div class="panel rules">${T[RZ.tab]()}</div></div>`;
}
SCREENS.rules = rulesScreen;
document.head.insertAdjacentHTML('beforeend',`<style>
.rtabs{margin-bottom:12px}
.rtabs.t4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.rules .rlsec{margin-bottom:18px}.rules .rlh{font-size:6.5px;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid var(--edge)}
.rules .rlr{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.rules .rlr span{font-size:5.5px;color:var(--t3);display:flex;align-items:center;gap:6px}.rules .rlr b{font-weight:normal;font-size:6px;color:var(--t1);text-align:right;max-width:58%;line-height:1.6}
.rules .rlr .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.rules .rln{font-size:5px;color:var(--t3);line-height:1.9;margin:8px 0 0}.rules .rln.big{font-size:5.5px;color:var(--t2);line-height:2.2;margin:0}
.rules .rlb{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--edge)}
.rules .rlb span{color:#fff;font-size:4.5px;padding:2px 5px;border-radius:3px;min-width:34px;text-align:center}.rules .rlb em{flex:1;font-style:normal;font-size:5px;color:var(--t2);line-height:1.6}
.rules .rlb i{font-style:normal;font-size:4.5px;color:var(--t3);white-space:nowrap}.rules .rlb i.y{color:var(--green)}
</style>`);

document.head.insertAdjacentHTML('beforeend',`<style>
/* Nov 24 · Stats: Baller-select grid, condensed stage, stats stacked left + featured card right */
.ugrid2{display:flex;flex-direction:column;gap:7px;padding:10px 12px 8px;background:#000;border:3px solid #000;box-shadow:0 0 0 2px var(--blue);border-radius:8px}
.urow{display:flex;justify-content:center;gap:7px}
/* staggered rows that stay inside the box: each row gives up half a tile on one side */
.urow{--tw:min(58px,calc((100% - 7px * (var(--per) - 1)) / (var(--per) + .5)));justify-content:center}.urow:not(.off){padding-right:calc(var(--tw) / 2)}.urow.off{padding-left:calc(var(--tw) / 2)}
.ugrid2 .ut{position:relative;width:var(--tw);flex:none;aspect-ratio:1;border:0;padding:0;background:none;cursor:pointer;transform:skewX(-10deg);overflow:visible;display:block}
.ugrid2 .ut .in{position:absolute;inset:0;border:2px solid #000;box-shadow:0 0 0 1px #2d2668;overflow:hidden;background:linear-gradient(160deg,#2a2370,#120d3a 70%);display:grid;place-items:center}
.ugrid2 .ut .av{transform:skewX(10deg)}.ugrid2 .ut .av canvas{width:38px;height:38px;image-rendering:pixelated}
.ugrid2 .ut.on .in{box-shadow:0 0 0 2px #ffd23d,0 0 12px #ffd23d}
.ugrid2 .ut .p1{position:absolute;top:-7px;left:-4px;z-index:3;font-style:normal;font-size:5px;color:#000;background:#ff3b5c;padding:2px 3px;transform:skewX(10deg);animation:blink .5s steps(2) infinite}
.ustage{height:112px!important}
.uhero .av canvas{width:74px!important;height:74px!important}
.ubio{top:22px!important;left:36%!important}
.uname{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.05!important}
.uteam{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ufold{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:10px;align-items:stretch}
.ucol{display:flex;flex-direction:column;gap:7px}
.ucol .ust{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center;text-align:left;padding:9px 11px;border:2px solid var(--edge);border-left:4px solid var(--sc);border-radius:8px;background:var(--card)}
.ucol .ust span{grid-column:1/3;font-size:5.5px;color:var(--sc);letter-spacing:.08em;margin-bottom:6px}
.ucol .ust b{font-weight:normal;font-size:15px;color:#fff}
.ucol .ust small{font-size:5px;color:#fff;opacity:.85}
.ufeat{display:flex;flex-direction:column;align-items:center;gap:7px;padding:9px 8px;border:2px solid #000;box-shadow:0 0 0 2px var(--gold);border-radius:10px;background:radial-gradient(circle at 30% 20%,#3a2a10,#0a0818 75%)}
.ufeat .fl{font-size:5px;color:var(--gold);letter-spacing:.08em}
.ufeat .fcard{width:100%}.ufeat .fcard .tcard{width:100%}
.ufeat .fl{display:flex;align-items:center;justify-content:center;gap:6px;width:100%}
.ufeat{position:relative}.ufeat .fpk{position:absolute;top:-9px;right:8px;z-index:2;font:inherit;font-size:4.5px;padding:3px 5px;border-radius:8px;border:1px solid var(--gold);background:#000;color:var(--gold);cursor:pointer;white-space:nowrap}
.sndrow{display:flex;align-items:center;gap:12px}.sndrow input{flex:1;min-width:0}
.sndt{flex:none;font:inherit;font-size:7px;padding:9px 12px;border-radius:8px;border:2px solid var(--edge);background:var(--card);color:var(--t2);cursor:pointer;min-width:88px}.sndt.on{border-color:var(--gold);color:var(--gold)}
.capk .fq{width:100%;font:inherit;font-size:7px;padding:10px;border-radius:8px;border:2px solid var(--edge);background:#060b18;color:var(--t1);margin:4px 0 10px}
</style>`);
