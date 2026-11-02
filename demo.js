// NBA Arcade · DEMO MODE (open the site with ?demo)
// Stands in for supabase-js so the app runs with no login:
//  - League data is a snapshot of the real league's game data (demo-data.json: stats, schedule,
//    rosters, duels, challenge) WITHOUT the managers list or chat, given made-up names.
//  - Every save stays in this browser tab; nothing is ever written to the real league.
//  - Adds a DEMO ribbon and a guided tour.
(function(){
  const URL = 'https://ipsngddnavymcmfbbcxu.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc25nZGRuYXZ5bWNtZmJiY3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDk3NDMsImV4cCI6MjA5MTc4NTc0M30.0MmQn49Y0FCn3r8GFI5XspZR12YwGWTcTbv765VoJEQ';
  const KEY = 'nba-arcade-2027';
  const H = {apikey:ANON, Authorization:'Bearer '+ANON};
  window.NBA_DEMO = true;

  const NAMES = [
    ['Alex','Pixel Pushers'],['Jordan R','Full Court Press'],['Casey','Glass Cleaners'],['Morgan','Fast Break Bandits'],
    ['Riley','Bank Shot Bros'],['Taylor','Triple Double Trouble'],['Jamie','Paint Patrol'],['Quinn','Sixth Man Squad'],
    ['Drew','Alley-Oop Academy'],['Sky','Box-Out Brigade'],['Parker','Corner Three Club'],['Reese','Shot Clock Heroes'],
    ['Rowan','Buzzer Beaters'],['Emery','Hardwood Hustle'],['Blake','Euro Step Society'],['Sage','Midrange Mavens']];
  const COLORS = ['#4a9eff','#f5a623','#00d4aa','#e94560','#7b2fff','#ffd93d','#06b6d4','#84cc16','#ff6600','#cc44ff','#2cb50d','#ff3366','#fec419','#00ff88','#8d86c4','#ff8a80'];
  const VIEWER = 1;   // the visitor plays as this team

  let league = null, managers = null, bdlKey = null, ready = null, ts = 0;
  const stamp = () => new Date(Date.now() + (++ts)).toISOString();

  async function load(){
    // demo-data.json: a snapshot of the league's game data only (no managers, no chat),
    // taken by the developer; refresh it to bring the demo up to date
    const st = await fetch('demo-data.json', {cache:'no-cache'}).then(x=>x.json()).catch(()=>({}));
    // Everyone who appears anywhere in the game data
    const ids = new Set();
    const add = o => Object.keys(o||{}).forEach(k=>{ if(/^\d+$/.test(k)) ids.add(+k); });
    add(st.rosters); add(st.prefs); add(st.duelStreaks); add(st.wlc?.standings);
    Object.values(st.duels||{}).forEach(d=>add(d.picks)); Object.values(st.wlc?.lineups||{}).forEach(add);
    Object.values(st.futures||{}).forEach(f=>add(f.picks));
    (Object.values(st.schedule||{})).flat(2).forEach(m=>{ if(m && m.home!=null){ ids.add(+m.home); ids.add(+m.away); } });
    (st.managerIds||[]).forEach(x=>ids.add(+x)); delete st.managerIds;
    ids.add(VIEWER);
    const list = [...ids].filter(x=>!isNaN(x)).sort((a,b)=>a-b);
    managers = list.map((id,i)=>{ const [n,t] = NAMES[i % NAMES.length];
      return {id, user_id: id===VIEWER ? 'demo-user' : 'demo-'+id, display_name: id===VIEWER ? 'You (Demo)' : n, team_name: t,
        color: COLORS[i % COLORS.length], icon: null, is_commissioner: false, photo: st.prefs?.[id]?.avatar?.ball || null,
        email: id===VIEWER ? 'demo@example.invalid' : null, created_at: new Date(2026,9,1,12,i).toISOString()}; });
    // Keep only look-and-feel prefs
    for(const [id,p] of Object.entries(st.prefs||{})) st.prefs[id] = {avatar:p.avatar, secrets:p.secrets};
    st.managers = managers.map(({email, created_at, ...m})=>m);
    st.chat = [
      {id:'d1', managerId:managers[1]?.id, text:'Who else took Boozer in the Challenge 👀', ts:new Date(Date.now()-5*3600e3).toISOString()},
      {id:'d2', managerId:managers[3]?.id, text:'Duel streak at 4. Nobody stop me.', ts:new Date(Date.now()-3*3600e3).toISOString()},
      {id:'d3', managerId:managers[5]?.id, text:'Waiver wire is cooking this week 🔥', ts:new Date(Date.now()-1*3600e3).toISOString()}];
    league = {id:KEY, state:st, updated_at:stamp()};
    try{ const c = await fetch(`${URL}/rest/v1/config?key=eq.bdl_api_key&select=value`, {headers:H}).then(x=>x.json()); bdlKey = c?.[0]?.value || null; }catch(e){}
  }
  ready = load();

  function q(table){
    let filt = [], mode = 'select', payload = null;
    const rowsFor = () => table==='leagues' ? [league] : table==='managers' ? managers : table==='config' ? (bdlKey ? [{key:'bdl_api_key', value:bdlKey}] : []) : [];
    const match = x => filt.every(([k,v])=>String(x?.[k])===String(v));
    const run = async () => {
      await ready;
      const rows = rowsFor().filter(Boolean);
      if(mode==='upsert' || mode==='update'){
        if(table==='leagues'){
          if(mode==='update' && !match(league)) return {data:[], error:null};
          league = {...league, ...payload, updated_at:stamp()};
          return {data:[{...league}], error:null};
        }
        if(table==='managers'){ managers.filter(match).forEach(m=>Object.assign(m, payload)); return {data:managers.filter(match), error:null}; }
        return {data:[], error:null};
      }
      if(mode==='insert') return {data:[payload], error:null};
      return {data: rows.filter(match).map(x=>({...x})), error:null};
    };
    const b = {
      select(){ return b; }, order(){ return b; }, limit(){ return b; }, neq(){ return b; }, in(){ return b; },
      eq(k,v){ filt.push([k,v]); return b; },
      maybeSingle: async()=>{ const r = await run(); return {data:r.data[0]||null, error:null}; },
      single: async()=>{ const r = await run(); return {data:r.data[0]||null, error:null}; },
      upsert(p){ mode='upsert'; payload=p; return b; }, update(p){ mode='update'; payload=p; return b; },
      insert(p){ mode='insert'; payload=p; return b; }, delete(){ mode='delete'; return b; },
      then(res, rej){ return run().then(res, rej); },
    };
    return b;
  }
  const user = {id:'demo-user', email:'demo@example.invalid', user_metadata:{}};
  const noop = async()=>({data:{}, error:null});
  window.supabase = { createClient(){ return {
    from:q,
    auth:{ onAuthStateChange(cb){ ready.then(()=>cb('INITIAL_SESSION', {user})); return {data:{subscription:{unsubscribe(){}}}}; },
           getSession: async()=>({data:{session:{user}}}), refreshSession: noop,
           signOut: async()=>{ location.reload(); return {}; }, signInWithPassword: noop, signUp: noop, resend: noop },
    storage:{ from(){ return {upload:noop, getPublicUrl:()=>({data:{publicUrl:''}})}; } },
  }; } };

  // ── Ribbon + guided tour ────────────────────────────────────────────────────
  const TOUR = [
    {t:'WELCOME TO NBA ARCADE', b:'A private NBA league for a group of friends: season-long fantasy, a weekly line-up challenge and a daily pick\'em, all in one retro arcade. This demo runs on real NBA data with made-up managers.', go:()=>showScreen('home')},
    {t:'HOME', b:'Live NBA scoreboard (or tips before tip-off), today\'s Daily Duel, a bonus Futures Duel, and every fantasy match-up with live scores and records.', go:()=>{ showScreen('home'); window.scrollTo(0,0); }},
    {t:'FANTASY', b:'Four "runs" a season (Fall, Winter, Spring, Summer), each with its own draft and standings. The run bar fills like a Mega Man weapon meter, one pip per day.', go:()=>{ showScreen('fantasy'); switchFantasyTab('standings'); }},
    {t:'YOUR ROSTER', b:'Set your line-up day by day, swap players in and out, use the IR slot, and see every player\'s fantasy points. Each player locks at his own tip-off.', go:()=>{ showScreen('fantasy'); switchFantasyTab('roster'); }},
    {t:'WEEKLY LINE-UP CHALLENGE', b:'Each week the commissioner picks a themed pool of 25 players in five salary tiers. Build the best line-up for $15. Points for every line-up you beat.', go:()=>showScreen('wlc')},
    {t:'DAILY DUEL', b:'One question a day, with a theme for each weekday: Monster Monday, Wet Wednesday, Stocks Saturday… Pick a side, build a streak, climb the standings.', go:()=>showScreen('duel')},
    {t:'SELECT YOUR BALLER', b:'Everyone plays as a pixel-art Baller, with styles, all 30 team colorways or fully custom colors. Some say there\'s a secret one…', go:()=>{ showScreen('profile'); openAvatarEditor(); }},
    {t:'WEEKLY RESULTS', b:'Every Monday the league gets an awards show: Team and Player of the Week, the biggest letdown, the nicest surprise and the Challenge winner.', go:()=>{ document.getElementById('avatar-modal')?.remove(); const w = latestFinishedWeek(); if(w) showWeekResults(w.runId, w.idx); }},
    {t:'THAT\'S THE TOUR', b:'Everything here is clickable. Changes you make stay in this tab only and reset when you reload. Have fun!', go:()=>{ showScreen('home'); window.scrollTo(0,0); }},
  ];
  let step = -1;
  function closeAll(){ ['avatar-modal','week-results-modal','wp-modal','fs-modal'].forEach(id=>document.getElementById(id)?.remove()); }
  function tour(n){
    step = n; const el = document.getElementById('demo-tour');
    if(n<0 || n>=TOUR.length){ el.hidden = true; return; }
    if(n!==6 && n!==7) closeAll();
    try{ TOUR[n].go(); }catch(e){ console.warn('[demo tour]', e); }
    el.hidden = false;
    el.querySelector('b').textContent = TOUR[n].t;
    el.querySelector('p').textContent = TOUR[n].b;
    el.querySelector('i').textContent = `${n+1} / ${TOUR.length}`;
    el.querySelector('[data-k=back]').disabled = n===0;
    el.querySelector('[data-k=next]').textContent = n===TOUR.length-1 ? 'DONE ✓' : 'NEXT ▶';
  }
  window.demoTour = tour;
  document.addEventListener('DOMContentLoaded', ()=>{
    const css = document.createElement('style');
    css.textContent = `
      #demo-ribbon{position:fixed;top:calc(env(safe-area-inset-top,0px) + var(--topbar-h,52px) + 4px);right:max(10px,calc(50% - var(--max-w,480px)/2 + 10px));z-index:2147483100;display:flex;gap:6px;align-items:center;
        font-family:var(--pixel,monospace);font-size:5px;background:#ff3b5c;color:#fff;border:2px solid #000;border-radius:4px;padding:3px 5px;box-shadow:0 2px 0 #000;opacity:.95}
      #demo-ribbon button{font:inherit;background:#ffd93d;color:#000;border:1px solid #000;border-radius:3px;padding:3px 6px;cursor:pointer}
      #demo-tour{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 70px);transform:translateX(-50%);width:min(420px,calc(100% - 24px));z-index:2147483100;
        background:#0b0f2a;border:3px solid #ffd93d;border-radius:10px;box-shadow:0 0 0 3px #000,0 10px 30px rgba(0,0,0,.6);padding:12px 14px;font-family:var(--pixel,monospace)}
      #demo-tour b{display:block;font-size:8px;color:#ffd93d;font-weight:normal;margin-bottom:8px}
      #demo-tour p{font-size:6px;line-height:1.9;color:#fff;margin:0 0 10px}
      #demo-tour .row{display:flex;align-items:center;gap:8px}
      #demo-tour i{flex:1;font-style:normal;font-size:5px;color:#8d86c4}
      #demo-tour button{font-family:inherit;font-size:6px;padding:7px 10px;border-radius:5px;cursor:pointer;border:1px solid #39ff6a;background:#39ff6a;color:#04130f}
      #demo-tour button[data-k=back],#demo-tour button[data-k=x]{background:none;color:#8d86c4;border-color:#3d3585}
      #demo-tour button:disabled{opacity:.35;cursor:default}`;
    document.head.appendChild(css);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="demo-ribbon">DEMO <button type="button" onclick="demoTour(0)">▶ TAKE THE TOUR</button></div>
      <div id="demo-tour" hidden><b></b><p></p><div class="row"><i></i>
        <button type="button" data-k="x" onclick="demoTour(-1)">✕</button><button type="button" data-k="back">◀</button><button type="button" data-k="next">NEXT ▶</button></div></div>`);
    const t = document.getElementById('demo-tour');
    t.querySelector('[data-k=back]').onclick = ()=>tour(step-1);
    t.querySelector('[data-k=next]').onclick = ()=>tour(step===TOUR.length-1 ? -1 : step+1);
    // Start the tour once the app is up
    const wait = setInterval(()=>{ if(document.getElementById('app')?.style.display==='block'){ clearInterval(wait); setTimeout(()=>{ if(step<0) tour(0); }, 1200); } }, 300);
  });
})();
