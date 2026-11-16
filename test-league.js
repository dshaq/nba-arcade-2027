/* NBA Arcade · TEST LEAGUE ONLY (index.html?league=next)
   Dave and Dan play themselves. Every other manager becomes a bot that runs its team:
   daily line-ups, Duel and Futures picks, a Weekly Challenge entry, the odd waiver move.
   Does nothing at all in the real league. */
(function(){
  if(typeof IS_TEST === 'undefined' || !IS_TEST) return;

  const HUMANS = ['1','2'];                       // Dave, Dan (Danny G)
  const STYLES = ['steady','gambler','tinkerer']; // how each bot plays
  const ET = () => new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  const rng = seed => { let h=2166136261; for(const c of String(seed)) h=Math.imul(h^c.charCodeAt(0),16777619); return ((h>>>0)%100000)/100000; };
  const fpg = pid => { const p=getPlayer(pid); if(!p) return 0; try{ return +seasonFpPG(p.name, 0)||0; }catch(e){ return 0; } };
  const isOut = p => !!(p && injuryInfo(p.name)?.isOut);
  const playsToday = p => !!(p && todayGamesCache[(p.team||'').toUpperCase()]);
  const bots = () => (leagueState.managers||[]).filter(m=>m.bot);
  const log = (...a) => console.log('[bots]', ...a);

  /* First open by the commissioner: the other managers become bots, chat starts empty */
  async function setupFork(){
    if(leagueState.test) return true;
    if(!myProfile?.is_commissioner) return false;
    leagueState.test = {humans:HUMANS.map(Number), forkedAt:new Date().toISOString(), days:{}};
    let k = 0;
    leagueState.managers = (leagueState.managers||[]).map(m => HUMANS.includes(String(m.id)) ? m
      : {...m, display_name:`${m.display_name} (CPU)`, bot:true, botStyle:STYLES[(k++)%STYLES.length]});
    leagueState.chat = [];
    await saveLeagueState();
    log('test league set up');
    return true;
  }

  function setLineup(mid){
    const roster = (leagueState.rosters||{})[mid]||[]; if(!roster.length) return false;
    let changed = false;
    // An OUT player goes to IR if the slot is free
    if(!getIrSlot(mid)){ const out = roster.map(getPlayer).find(p=>p && isOut(p) && !isPlayerLocked(p));
      if(out){ (leagueState.ir ||= {})[mid] = out.id; changed = true; } }
    const ir = getIrSlot(mid);
    const act = new Set(((leagueState.active||{})[mid] || autoActiveFor(mid)).filter(id=>id!==ir));
    const pool = roster.filter(id=>id!==ir).map(id=>({id, p:getPlayer(id)})).filter(x=>x.p);
    const locked = pool.filter(x=>isPlayerLocked(x.p)), free = pool.filter(x=>!isPlayerLocked(x.p));
    const keep = locked.filter(x=>act.has(x.id)).map(x=>x.id);
    const score = x => (isOut(x.p) ? -200 : 0) + (playsToday(x.p) ? 100 : 0) + fpg(x.id);
    const pick = free.sort((a,b)=>score(b)-score(a)).slice(0, Math.max(0, ACTIVE_SIZE-keep.length)).map(x=>x.id);
    const nextAct = [...keep, ...pick], nextIn = pool.map(x=>x.id).filter(id=>!nextAct.includes(id));
    const same = (a,b) => a && a.length===b.length && a.every(x=>b.includes(x));
    if(!same((leagueState.active||{})[mid], nextAct)){ (leagueState.active ||= {})[mid] = nextAct; changed = true; }
    if(!same((leagueState.inactive||{})[mid], nextIn)){ (leagueState.inactive ||= {})[mid] = nextIn; changed = true; }
    return changed;
  }

  function duelPick(mid){
    const dk = todayKey(), duel = (leagueState.duels||{})[dk];
    if(!duel || duel.result!=null || isDuelLocked(duel)) return false;
    duel.picks ||= {}; if(duel.picks[mid]!==undefined || duel.picks[Number(mid)]!==undefined) return false;
    duel.picks[mid] = rng(mid+dk+'duel') < .5 ? 1 : 2;
    (duel.pickedAt ||= {})[mid] = new Date().toISOString();
    return true;
  }

  function futuresPicks(mid){
    let changed = false;
    for(const f of (typeof FUTURES_DUELS!=='undefined' ? FUTURES_DUELS : [])){
      try{ if(futLocked(f)) continue; }catch(e){ continue; }
      const opts = f.options || f.opts || f.teams || []; if(!opts.length) continue;
      const st = (leagueState.futures ||= {})[f.id] ||= {picks:{}, pickedAt:{}};
      if(st.picks?.[mid]!==undefined) continue;
      const o = opts[Math.floor(rng(mid+f.id)*opts.length)]; const v = o?.v ?? o?.id ?? o;
      st.picks = {...(st.picks||{}), [mid]:v}; st.pickedAt = {...(st.pickedAt||{}), [mid]:new Date().toISOString()};
      changed = true;
    }
    return changed;
  }

  function wlcEntry(mid, style){
    const wk = wlcWeekKey(), week = leagueState.wlc?.weeks?.[wk];
    if(!week || week.status!=='active' || week.testers || week.held || isWlcLocked(wk)) return false;
    const pool = week.pool||[]; if(pool.length<5) return false;
    const L = ((leagueState.wlc.lineups ||= {})[wk] ||= {});
    if(L[mid]?.saved) return false;
    const val = p => (seasonFpPG(p.n, 0)||0) * (1 + (rng(mid+wk+p.n)-.5)*(style==='gambler'?.6:.25));
    let best=null, bestV=-1;
    for(let t=0;t<300;t++){                       // random lineups under the cap; keep the best one
      const shuffled = [...pool].sort((a,b)=>rng(mid+wk+t+a.n)-rng(mid+wk+t+b.n)), picks=[]; let cost=0;
      for(const p of shuffled){ if(picks.length<5 && cost+p.salary<=WLC_SALARY_CAP){ picks.push(p); cost+=p.salary; } }
      if(picks.length<5) continue;
      const v = picks.reduce((a,p)=>a+val(p),0); if(v>bestV){ bestV=v; best=picks; }
    }
    if(!best) return false;
    L[mid] = {picks:best.map(p=>p.n), swaps:[], saved:true, savedAt:new Date().toISOString()};
    return true;
  }

  function waiverMove(mid, style){
    const dk = todayKey(), chance = style==='tinkerer' ? .5 : style==='gambler' ? .3 : .15;
    if(rng(mid+dk+'wv') > chance || !canWaiver(mid) || !inFantasyRun(mid)) return false;
    const roster = (leagueState.rosters||{})[mid]||[], ir = getIrSlot(mid);
    const top = Math.max(...roster.map(id=>playerTotalFP(id)));
    const droppable = roster.filter(id=>id!==ir && playerTotalFP(id)<top && !isPlayerLocked(getPlayer(id)));
    const worst = droppable.sort((a,b)=>fpg(a)-fpg(b))[0]; if(worst==null) return false;
    const free = PLAYERS.filter(p=>p.team && !rosterOwnerOf(p.id) && !isOut(p) && !isPlayerLocked(p)).sort((a,b)=>fpg(b.id)-fpg(a.id));
    const add = free[0]; if(!add || fpg(add.id) < fpg(worst)+2) return false;
    const ts = new Date().toISOString(), day = todayStr(), key = mid+'_'+currentWeekStart().getTime().toString();
    leagueState.rosters[mid] = [...roster.filter(id=>id!==worst), add.id];
    leagueState.active[mid] = (leagueState.active[mid]||[]).filter(id=>id!==worst);
    leagueState.inactive[mid] = (leagueState.inactive[mid]||[]).filter(id=>id!==worst);
    (leagueState.waiverLog[mid] ||= []).push({pid:worst, date:day, type:'drop', ts}, {pid:add.id, date:day, type:'add', ts});
    leagueState.waiverWeekCount[key] = (leagueState.waiverWeekCount[key]||0) + 2;
    log(mid, 'dropped', getPlayer(worst)?.name, 'added', add.name);
    return true;
  }

  let running = false;
  async function tick(){
    if(running || !leagueState || !myProfile) return; running = true;
    try{
      if(!(await setupFork())) return;
      if(!PLAYERS?.length || !Object.keys(todayGamesCache||{}).length) return;   // wait for today's games to load
      let changed = false; const dk = todayKey(), hr = ET().getHours();
      for(const m of bots()){
        const mid = String(m.id), style = m.botStyle||'steady';
        changed = setLineup(mid) || changed;
        changed = duelPick(mid) || changed;
        changed = futuresPicks(mid) || changed;
        changed = wlcEntry(mid, style) || changed;
        if(hr>=9 && !leagueState.test.days?.[dk]) changed = waiverMove(mid, style) || changed;   // waivers once a day
      }
      if(hr>=9 && !leagueState.test.days?.[dk]){ (leagueState.test.days ||= {})[dk] = new Date().toISOString(); changed = true; }
      if(changed){ await saveLeagueState(); log('bots played', dk); }
    } finally { running = false; }
  }
  window.testLeagueTick = tick;
  setInterval(()=>{ if(currentUser) tick(); }, 10*60*1000);   // every 10 minutes, so picks land before tip-off
})();
