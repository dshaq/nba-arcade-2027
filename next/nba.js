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
  gameboy: {name:'GAME BOY', v:{'--bg':'#0f1f0f','--bg2':'#163016','--card':'#1b3a1b','--edge':'#2f5a2f','--t1':'#e0f8d0','--t2':'#a8d890','--t3':'#5a8a4a'}},
  sunset:  {name:'SUNSET',   v:{'--bg':'#1a0610','--bg2':'#2a0a1a','--card':'#3a1022','--edge':'#6a2440','--t2':'#ffc0a0','--t3':'#a06070'}},
};
function applyTheme(){ const t=THEMES[S.theme]||THEMES.arcade, r=document.documentElement;
  Object.values(THEMES).forEach(x=>Object.keys(x.v).forEach(k=>r.style.removeProperty(k)));
  Object.entries(t.v).forEach(([k,v])=>r.style.setProperty(k,v)); }
applyTheme();
// your saved names show everywhere in the preview
const nb_render = render;
render = function(){ if(S.profile.name) ME.name=S.profile.name; if(S.profile.team){ ME.team=S.profile.team; if(TEAMS[0]) TEAMS[0].team=S.profile.team; } if(S.profile.name && TEAMS[0]) TEAMS[0].m=S.profile.name; return nb_render.apply(this, arguments); };

/* ── BALLERS: two tabs ── */
const BZ = {tab:'baller'};
const nb_baller = SCREENS.baller;
SCREENS.baller = function(){
  const tabs=`<div class="mtabs bzt">${[['baller','🎨 BALLER'],['profile','👤 PROFILE']].map(([k,l])=>`<button class="${BZ.tab===k?'on':''}" onclick="BZ.tab='${k}';render()">${l}</button>`).join('')}</div>`;
  if(BZ.tab==='baller') return nb_baller().replace('<h1>BALLERS</h1></div>','<h1>BALLERS</h1></div>'+tabs);
  const f=(id,l,v,ph)=>`<label class="pf"><span>${l}</span><input id="${id}" value="${String(v||'').replace(/"/g,'&quot;')}" placeholder="${ph}" maxlength="24"></label>`;
  return topBar()+`<div class="screen"><div class="head"><button class="back" onclick="go('home')">◀</button><h1>BALLERS</h1></div>${tabs}
    <div class="panel"><div class="sec">PROFILE</div>
      ${f('pfn','DISPLAY NAME',ME.name,'Your name')}${f('pft','FANTASY TEAM NAME',ME.team,'Your team')}
      <button class="go" style="width:100%;margin-top:12px" onclick="saveProfile()">SAVE</button>
      <div class="reward" style="margin:12px 0 0">Preview: saved on this phone only, so the real league isn't touched.</div></div>
    <div class="panel"><div class="sec">APP THEME</div><div class="thm">${Object.entries(THEMES).map(([k,t])=>`<button class="${(S.theme||'arcade')===k?'on':''}" onclick="S.theme='${k}';save();applyTheme();render()"><i style="background:${t.v['--bg']||'#020c18'};border-color:${t.v['--edge']||'#1e3258'}"><b style="background:${t.v['--card']||'#0d1530'}"></b></i>${t.name}</button>`).join('')}</div></div>
  </div>`;
};
function saveProfile(){ const n=document.getElementById('pfn').value.trim(), t=document.getElementById('pft').value.trim();
  if(n.length<2){ say('Name is too short'); return; } S.profile={name:n, team:t||ME.team}; save(); render(); say('Profile saved'); }

/* ── STATS: Baller select screen ── */
const SU = {sel:0};
function statsUsers(){
  const st=standings(), sorted=[...st].sort((a,b)=>b.w-a.w||b.pf-a.pf);
  const users=TEAMS.map((t,i)=>({i, m:i===0?ME.name:t.m, team:i===0?ME.team:t.team, ch:i===0?S.active:chOf(t), me:i===0}));
  SU.sel=Math.min(SU.sel,users.length-1);
  const u=users[SU.sel], row=st.find(x=>x.i===u.i)||{w:0,l:0,pf:0}, rank=sorted.findIndex(x=>x.i===u.i)+1;
  const roster=(u.i===0?myNames():(OTHER[u.i]||[])).map(P).filter(p=>p&&p.n), mvp=roster.sort((a,b)=>(+b.fall||0)-(+a.fall||0))[0];
  const byName=(rows)=>rows.find(r=>u.me?r[1]==null:r[0]===u.m);
  const d=byName(DSTAND), c=byName(CSTAND);
  const stat=(l,v,sub)=>`<div class="ust"><span>${l}</span><b>${v}</b>${sub?`<small>${sub}</small>`:''}</div>`;
  return `<div class="usel"><div class="ugrid">${users.map((x,k)=>`<button class="ut ${k===SU.sel?'on':''} ${x.me?'me':''}" onclick="SU.sel=${k};render()"><span class="av" data-ch="${x.ch}"></span>${k===SU.sel?'<i class="p1">P1</i>':''}<em>${x.m}</em></button>`).join('')}</div>
    <div class="upick"><div class="ubig"><span class="av big" data-ch="${u.ch}"></span><div class="ush"></div></div>
      <div class="uid"><b>${u.m.toUpperCase()}</b><small>${u.team.toUpperCase()}</small></div>
      <div class="usts">
        ${stat('FANTASY RECORD', `${row.w}-${row.l}`, `${ordinal(rank).toUpperCase()} OF ${users.length}`)}
        ${stat('RUN TOTAL FP', (+row.pf||0).toLocaleString())}
        ${stat('FANTASY MVP', mvp?mvp.s:'—', mvp?`${(+mvp.fall||0).toLocaleString()} FP`:'')}
        ${stat('DUEL', d?(d[2]==='—'?'—':d[2]+'%'):'—', d?`🔥 ${d[4]} STREAK`:'')}
        ${stat('CHALLENGE', c?c[4]:'—', c?`${c[3]} PTS`:'')}
        ${stat('CARDS', '—', 'COMING SOON')}
      </div></div></div>`;
}

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
.bzt{margin-bottom:10px}
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
