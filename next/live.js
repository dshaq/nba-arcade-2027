/* NBA Arcade · new site · TEST LEAGUE MODE
   A hidden copy of the real app runs underneath, pointed at the test league (../index.html?league=next).
   This file reads the league from it and sends your taps to its own functions, so scoring, locks,
   saving and rules are exactly the live app's. Only the look is new.
   If you aren't signed in, aren't in the test league, or add ?sample to the address, the site shows sample data. */

const LIVE = {on:false, state:'connecting', W:null, E:null, mid:null, sig:''};
const HUMANS = ['1','2'];
const LOGOJ = t => `../logos/jam/${t}.png`;

(function boot(){
  if(new URLSearchParams(location.search).has('sample') || S.sample){ LIVE.state='sample'; return; }
  const fr=document.createElement('iframe'); fr.id='eng'; fr.src='../index.html?league=next';
  fr.style.cssText='position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0;visibility:hidden;pointer-events:none';
  fr.setAttribute('aria-hidden','true'); fr.tabIndex=-1;
  document.body.appendChild(fr);
  const t0=Date.now();
  const poll=setInterval(()=>{
    let W; try{ W=fr.contentWindow; if(!W || !W.document) return; }catch(e){ return; }
    const E = s => { try{ return W.eval(s); }catch(e){ return undefined; } };
    LIVE.W=W; LIVE.E=E;
    if(!W._errHooked){ W._errHooked=true; LIVE.engErrs=[]; W.addEventListener('error',e=>LIVE.engErrs.push(`${e.message} @ ${(e.filename||'').split('/').pop()}:${e.lineno}`)); W.addEventListener('unhandledrejection',e=>LIVE.engErrs.push('promise: '+(e.reason?.message||e.reason))); }
    if(W._testMissing){ done('missing'); return; }
    const login=W.document.getElementById('login-screen');
    if(login && login.style.display==='flex'){ done('signedout'); return; }
    const ls=E('leagueState'), me=E('myProfile');
    const core = ls && me && ls.rosters && E('PLAYERS')?.length;
    if(core && !LIVE.coreAt) LIVE.coreAt=Date.now();
    // wait for today's games to load (or a few seconds, on days with no games)
    if(core && (Object.keys(E('todayGamesCache')||{}).length || Date.now()-LIVE.coreAt>6000)){
      if(!HUMANS.includes(String(me.id))){ done('notmember'); return; }
      if(!ls.test){ if(Date.now()-t0>45000) done('waiting'); return; }
      LIVE.on=true; LIVE.mid=String(me.id); done('on'); return;
    }
    if(Date.now()-t0>60000) done('timeout');
  }, 700);
  function done(st){ clearInterval(poll); LIVE.state=st;
    if(LIVE.on){ try{ sync(); }catch(e){ console.error('[live] sync', e); LIVE.on=false; LIVE.state='error'; } }
    render(); liveNotice();
    if(LIVE.on) setInterval(refresh, 20000);
  }
})();

function liveNotice(){
  const msg = {signedout:['SIGN IN TO PLAY','You\'re signed out. Sign in on the main NBA Arcade site in this same browser, then come back here.','../','SIGN IN'],
    notmember:['JUST DAVE & DAN FOR NOW','This test league is only for Dave and Dan. You\'re seeing sample data.'],
    missing:['TEST LEAGUE NOT SET UP','Dave needs to run the one-time setup in Supabase first. Showing sample data until then.'],
    waiting:['ALMOST READY','The test league switches on the first time Dave opens this page. Showing sample data for now.'],
    timeout:['COULDN\'T REACH THE LEAGUE','Check your connection and reload. Showing sample data for now.'],
    error:['SOMETHING WENT WRONG','The test league didn\'t load properly. Showing sample data for now.']}[LIVE.state];
  if(!msg) return;
  if(LIVE.engErrs?.length && LIVE.state!=='signedout') msg[1] += '<br><br><small style="color:#ff8fa0">Engine: '+LIVE.engErrs.slice(-4).join(' · ').replace(/</g,'&lt;')+'</small>';
  if(LIVE.state==='waiting' && LIVE.E && String(LIVE.E('myProfile')?.id)==='1') msg[1] = 'The test league is still switching on. Leave this page open for a minute, then reload.' + (LIVE.engErrs?.length?'<br><br><small style="color:#ff8fa0">Engine: '+LIVE.engErrs.slice(-4).join(' · ').replace(/</g,'&lt;')+'</small>':'');
  const o=overlay(`<div class="sheet" style="--c:var(--gold)"><h3>${msg[0]}</h3><p>${msg[1]}</p><div class="acts">${msg[2]?`<a class="btn" href="${msg[2]}" style="text-decoration:none">${msg[3]} ▶</a>`:''}<button class="btn alt" id="okx">OK</button></div></div>`);
  o.querySelector('#okx').onclick=()=>o.remove();
}

async function refresh(){
  if(!LIVE.on || document.querySelector('.ov,.greet,.vss,.rc16.ghost') || document.activeElement?.tagName==='INPUT') return;
  const E=LIVE.E, live=E('livePlayerStats')||{};
  const sig = String(E('_leagueTs'))+'|'+Object.values(live).reduce((a,x)=>a+(x?.fp||0),0)+'|'+Object.values(E('todayGamesCache')||{}).map(g=>g.myScore).join(',');
  if(sig===LIVE.sig) return;
  try{ sync(); render(); }catch(e){ console.error('[live] refresh', e); }
}
async function afterAction(){ for(let i=0;i<20;i++){ if(LIVE.E('_lastSaveOk')!==null) break; await new Promise(r=>setTimeout(r,150)); } sync(); render(); }

/* ── read everything from the engine ─────────────────────────────────────── */
function sync(){
  const W=LIVE.W, E=LIVE.E, ls=E('leagueState'), mid=LIVE.mid, run=E('currentRun');
  const players=E('PLAYERS'), livePS=E('livePlayerStats')||{}, games=E('todayGamesCache')||{};
  const now=W.etWallNow(), today=W.ymd(now), yday=W.ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,12));
  LIVE.sig = String(E('_leagueTs'))+'|'+Object.values(livePS).reduce((a,x)=>a+(x?.fp||0),0)+'|'+Object.values(games).map(g=>g.myScore).join(',');
  // Which week of the run is this?
  let widx=0; for(let i=0;i<30;i++){ const r=W.runWeekRange(run,i); if(r.from<=today && today<=r.to){ widx=i; break; } if(r.from>today) break; widx=i; }
  const wr=W.runWeekRange(run,widx); LIVE.run=run; LIVE.widx=widx; LIVE.today=today;
  // Saved stat lines, one per player per day
  const byPid=new Map(), byDate={}, seen=new Set();
  for(const e of Object.values(ls.playerStats||{})){ const d=String(e.date), k=e.pid+'_'+d; if(seen.has(k)) continue; seen.add(k);
    (byPid.get(String(e.pid)) || byPid.set(String(e.pid),[]).get(String(e.pid))).push(e); (byDate[d] ||= []).push(e); }
  LIVE.byPid=byPid; LIVE.byDate=byDate;
  const owned=new Set(Object.values(ls.rosters||{}).flat().map(String));
  // Players
  PL.length=0; const idx=new Map(), pid=new Map();
  for(const p of players){ if(!p.team) continue;
    let f=0; try{ f=+W.seasonFpPG(p.name,0)||0; }catch(e){}
    if(!f && !owned.has(String(p.id))) continue;
    const lines=(byPid.get(String(p.id))||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const lv=livePS[p.id], lvFp = lv && !W.liveAlreadySaved(p.id, lv) ? (lv.fp||0) : 0;
    const sum=(from,to)=>lines.filter(e=>String(e.date)>=from && String(e.date)<=to).reduce((a,e)=>a+(e.fp||0),0);
    const inj=W.injuryInfo(p.name), last5=lines.slice(0,5);
    const o={id:p.id, n:p.name, t:p.team.toUpperCase(), p:p.pos||p.position||'', f:+f.toFixed(1), c:TC[p.team.toUpperCase()]||'#1e3258',
      s:p.name.replace(/ (Jr\.|Sr\.|III|II|IV)$/,'').split(' ').pop().toUpperCase(),
      l5: last5.length ? +(last5.reduce((a,e)=>a+(e.fp||0),0)/last5.length).toFixed(1) : +f.toFixed(1),
      wk: Math.round(sum(wr.from,wr.to)+lvFp), fall: Math.round(W.playerTotalFP(p.id)),
      td: Math.round(sum(today,today)+lvFp), yd: Math.round(sum(yday,yday)),
      inj: inj ? (inj.isOut?'OUT':inj.label) : null};
    PL.push(o); idx.set(o.n,o); pid.set(o.n,p.id);
  }
  LIVE.idx=idx; LIVE.pid=pid;
  P = n => idx.get(n) || {n, s:String(n||'').split(' ').pop().toUpperCase(), t:'', p:'', f:0, c:'#1e3258', l5:0, wk:0, fall:0, td:0, yd:0};
  const nameOf = id => { const p=W.getPlayer(Number(id))||W.getPlayer(id); return p?p.name:null; };
  // Today's games
  for(const k in GAMES) delete GAMES[k];
  for(const [t,g] of Object.entries(games)) GAMES[t]={opp:g.opponent, home:!!g.isHome, time:(g.time||'').replace(/ ET$/,''), live:!!g.isLive, final:!!g.isFinal, score:g.myScore!=null?`${g.myScore}-${g.oppScore}`:''};
  S.gsO = Object.values(games).some(g=>g.isLive||g.isFinal) ? 'live' : 'pre';
  // Teams: you first, then this week's opponent, then everyone else in standings order
  const mgrs=W.runManagers(run), sched=(ls.schedule||{})[run]||[], mine=(sched[widx]||[]).find(mu=>String(mu.home)===mid||String(mu.away)===mid);
  const oppId = mine ? String(String(mine.home)===mid?mine.away:mine.home) : null;
  const st=W.fantasyStandings(run), order=st.map(r=>String(r.id));
  const chFor = m => { const b=ls.prefs?.[m.id]?.avatar?.ball; try{ const r=b&&W.BB.parse(b); if(r?.ch) return r.ch; }catch(e){} return BB.ORDER[Number(m.id)%BB.ORDER.length]; };
  const sorted=[...mgrs].sort((a,b)=>(String(a.id)===mid?-2:String(a.id)===oppId?-1:order.indexOf(String(a.id)))-(String(b.id)===mid?-2:String(b.id)===oppId?-1:order.indexOf(String(b.id))));
  TEAMS.length=0; for(const k in OTHER) delete OTHER[k];
  sorted.forEach((m,i)=>{ const me=String(m.id)===mid;
    TEAMS.push({m:m.display_name, team:m.team_name||m.display_name, me, ch:me?undefined:chFor(m), mid:String(m.id), bot:!!m.bot});
    if(!me){ const act=(ls.active?.[m.id]||W.autoActiveFor(m.id)).map(nameOf).filter(Boolean);
      OTHER[i]=[...act, ...(ls.rosters?.[m.id]||[]).map(nameOf).filter(n=>n && !act.includes(n))]; } });
  const meM=mgrs.find(m=>String(m.id)===mid)||{}, opM=mgrs.find(m=>String(m.id)===oppId)||{};
  Object.assign(ME,{name:meM.display_name||ME.name, team:meM.team_name||ME.team});
  Object.assign(OPP,{name:(opM.display_name||'—').replace(' (CPU)',''), team:opM.team_name||'—'});
  OPP.ch = opM.id!=null ? chFor(opM) : 'bee';
  LEAGUES[0].name="NBA ARCADE · TEST"; LEAGUES.length=1;
  // Your line-up
  const roster=(ls.rosters?.[mid]||[]), ir=W.getIrSlot(mid), act=(ls.active?.[mid]||W.autoActiveFor(mid)).filter(id=>id!==ir);
  const bench=roster.filter(id=>id!==ir && !act.includes(id));
  const pad=(a,n)=>{ const x=a.map(nameOf); while(x.length<n) x.push(null); return x; };
  S.fl={act:pad(act,8), bench:pad(bench,2), ir:[ir!=null?nameOf(ir):null]};
  // Score this week
  MU.week=widx+1; LIVE.mu={me:Math.round(W.managerFP(mid)), opp:oppId?Math.round(W.managerFP(oppId)):0}; LIVE.oppId=oppId;
  TODAY_I = Math.floor((W.etWallNow()-new Date(wr.mon.getFullYear(),wr.mon.getMonth(),wr.mon.getDate()))/864e5);
  TODAY_I = Math.max(0,Math.min(6,Math.floor(TODAY_I)));
  WEEK_START = w => W.runWeekRange(run, w-1).mon;
  const dayFp = (m,d) => W.teamFPForDates(m, d, d, byDate);
  let pm=0, po=0; LIVE.days = DAYN.map((dn,i)=>{ const d=W.ymd(new Date(wr.mon.getFullYear(),wr.mon.getMonth(),wr.mon.getDate()+i,12)), o={d:dn};
    if(i<TODAY_I){ o.me=Math.round(dayFp(mid,d)); o.op=oppId?Math.round(dayFp(oppId,d)):0; pm+=o.me; po+=o.op; o.r=o.me>o.op?'W':o.me<o.op?'L':'T'; }
    if(i===TODAY_I){ o.today=true; o.me=Math.max(0,LIVE.mu.me-pm); o.op=Math.max(0,LIVE.mu.opp-po); if(S.gsO==='live') o.live=true; else if(!o.me&&!o.op){ delete o.me; delete o.op; } }
    return o; });
  syncDuel(ls, mid, nameOf, today);
  syncWlc(ls, mid);
  // Waivers + scouting
  S.wv.scouted=(ls.prefs?.[mid]?.scout||[]).map(nameOf).filter(Boolean);
  if(!LIVE.synced){ FZ.wk=MU.week; LIVE.synced=true; }
  const ms=k=>MISSIONS.find(x=>x.k===k);
  ms('lineup').d = recs().length ? `Fantasy · ${recs().length} suggested move${recs().length>1?'s':''} today` : 'Fantasy · your line-up looks good';
  if(LIVE.duel) ms('duel').d = `${DUEL.a.short} or ${DUEL.b.short} · locks ${DUEL.lock}`;
  ms('wlc').d = LIVE.week ? `${WLC.pool} · ${S.wphase==='live'?'under way':'picks lock Monday'}` : 'Opens Monday';
}

/* ── Duel ────────────────────────────────────────────────────────────────── */
function syncDuel(ls, mid, nameOf, today){
  const W=LIVE.W, E=LIVE.E, dk=W.todayKey(), duel=(ls.duels||{})[dk], labels=E('DUEL_STAT_LABEL')||{}, NT=E('NBA_TEAMS')||{};
  const side = (duel, n) => { if(duel.type==='team'){ const t=duel['team'+n]; return {name:NT[t]||t, short:t, team:t, tc:TC[t]||'#333', img:LOGOJ(t), sub:'TEAM'}; }
    const p=W.getPlayer(duel['pid'+n]); if(!p) return {name:'?',short:'?',team:'',tc:'#333'};
    const q=P(p.name); return {name:p.name, short:q.s, team:p.team, tc:TC[p.team]||'#333', pid:p.id}; };
  LIVE.duel=duel||null;
  if(duel){
    const lbl=labels[duel.stat]||String(duel.stat||'').toUpperCase()||'FP';
    Object.assign(DUEL,{title:duel.theme||'Daily Duel', a:side(duel,1), b:side(duel,2), q:duel.type==='team'?'WHICH TEAM WINS TODAY?':`WHO HAS MORE ${lbl} TODAY?`});
    const tips=[DUEL.a.team,DUEL.b.team].map(t=>GAMES[t]?.time).filter(Boolean).sort(); DUEL.lock=tips[0]||'TIP-OFF';
    const val = s => { if(duel.type==='team'){ const g=GAMES[s.team]; return g&&g.score?+g.score.split('-')[0]:0; }
      const lv=E('livePlayerStats')?.[s.pid]; let v=lv?W.getDuelStatValue(lv, duel.stat):null; if(v==null) v=W.getDuelStatValue(W.findSavedStat(s.pid, LIVE.today), duel.stat); return v||0; };
    Object.assign(DUEL_STAT,{label:lbl, short:lbl, a:val(DUEL.a), b:val(DUEL.b), per:/pts|fp|pra|dd|parlay|team/.test(duel.stat||duel.type)?5:1});
    const pick=W.getMyDuelPick(); if(pick) S.done.duel = pick===1?DUEL.a.short:DUEL.b.short; else delete S.done.duel;
  }
  // Yesterday
  const yk=(()=>{ const d=new Date(dk+'T12:00:00'); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })(), y=(ls.duels||{})[yk];
  YDUEL.none=!y || y.result==null;
  if(!YDUEL.none){
    const A=side(y,1), B=side(y,2), dstr=yk.replace(/-/g,'');
    const v = s => y.type==='team' ? '' : (W.getDuelStatValue(W.findSavedStat(s.pid, dstr), y.stat) ?? '—');
    const wS=y.result===1?A:B, lS=y.result===1?B:A, picks=Object.entries(y.picks||{});
    const pp = s => s.img ? {n:s.name, s:s.short, t:s.team, c:s.tc, img:s.img} : P(s.name);
    Object.assign(YDUEL,{title:(y.theme||'DUEL').toUpperCase(), stat:labels[y.stat]||String(y.stat||'').toUpperCase(),
      win:{n:wS.name, v:v(wS), p:pp(wS)}, lose:{n:lS.name, v:v(lS), p:pp(lS)},
      pct: picks.length ? Math.round(100*picks.filter(([,s])=>s===1).length/picks.length) : 50,
      mine: (y.picks?.[mid]??y.picks?.[Number(mid)]) ? ((y.picks?.[mid]??y.picks?.[Number(mid)])===y.result ? wS.name : lS.name) : null,
      right: picks.filter(([m,s])=>s===y.result && String(m)!==mid).map(([m])=>{ const t=TEAMS.find(x=>x.mid===String(m)); const mm=(ls.managers||[]).find(x=>String(x.id)===String(m)); return [(mm?.display_name||'?').replace(' (CPU)',''), t?.ch||BB.ORDER[Number(m)%BB.ORDER.length]]; })});
    YDUEL.picked = (y.picks?.[mid]??y.picks?.[Number(mid)])!=null;
  }
  STREAK.cur=W.getMyDuelStreak()||0; STREAK.best=Math.max(STREAK.cur, ls.duelStreaks?.[mid]?.longest||0);
  // Standings (same order as the live leaderboard)
  const recs=W.duelRecords(), streaks=ls.duelStreaks||{};
  const rows=(ls.managers||[]).map(m=>{ const r=recs[m.id]||{picked:0,correct:0,best:0}, cur=W.liveDuelStreak(streaks[m.id]);
    return {m, cur, best:Math.max(r.best,cur,streaks[m.id]?.longest||0), pct:r.picked?r.correct/r.picked:null}; })
    .sort((a,b)=>b.cur-a.cur || (b.pct??-1)-(a.pct??-1) || b.best-a.best);
  const chOfM = m => TEAMS.find(t=>t.mid===String(m.id))?.ch || BB.ORDER[Number(m.id)%BB.ORDER.length];
  DSTAND.length=0; rows.forEach(r=>DSTAND.push([r.m.display_name.replace(' (CPU)',''), String(r.m.id)===mid?null:chOfM(r.m), r.pct==null?'—':Math.round(r.pct*100), r.best||0, r.cur||0]));
  FSTAND.length=0; (ls.managers||[]).map(m=>{ let hit=0, n=0; for(const st of Object.values(ls.futures||{})){ const p=st.picks?.[m.id]; if(p==null||!st.result) continue; n++; if(p===st.result) hit++; } return [m.display_name.replace(' (CPU)',''), String(m.id)===mid?null:chOfM(m), hit, n]; })
    .filter(r=>r[3]).sort((a,b)=>b[2]-a[2]).forEach(r=>FSTAND.push(r));
}
futuresToday = () => LIVE.on ? (LIVE.W.futuresNow?.()||[]).some(f=>!LIVE.W.futLocked(f)) : FUT.some(n=>n.today);
const _futuresBody = futuresBody;
futuresBody = function(){
  if(!LIVE.on) return _futuresBody();
  const W=LIVE.W, ls=LIVE.E('leagueState'), list=(W.futuresNow?.()||[]);
  if(!list.length) return `<div class="panel"><div class="sec">FUTURES DUEL</div><div class="reward">No Futures Duel today. NBA Cup knockout picks will show up here when they open.</div></div>`;
  return list.map(f=>{ const st=(ls.futures||{})[f.id]||{}, mine=st.picks?.[LIVE.mid], locked=W.futLocked(f);
    return `<div class="panel"><div class="sec" style="color:var(--violet)">${f.title}</div><div class="reward" style="margin:0 0 10px">${f.question}</div>
      <div class="fqbox">${(f.options||[]).map(t=>`<button class="${t===mine?'mine':''}" ${locked||mine?'disabled':''} onclick="liveFuture('${f.id}','${t}')"><img src="${LOGOJ(t)}" alt="">${t}</button>`).join('')}</div>
      <div class="reward">${st.result?`Winner: ${st.result}. ${mine===st.result?'✓ You hit it':'✗ Not this time'}`:mine?'Your pick is locked in.':locked?'🔒 Picks are locked.':'Your pick is final the moment you tap.'}</div></div>`; }).join('');
};
async function liveFuture(id, t){ await LIVE.W.futuresPick(id, t); await afterAction(); if(!S.done.futures) complete('futures', document.querySelector('.fqbox')); }
const _duelDaily = duelDaily;
duelDaily = function(){
  if(!LIVE.on || LIVE.duel) return _duelDaily();
  return `<div class="arena" style="--ca:#333;--cb:#333;min-height:200px"><div class="stk">🔥<b>${STREAK.cur}</b></div>
    <div class="dtitle" style="margin-top:70px">NO DAILY DUEL TODAY</div><div class="dsub">CHECK BACK TOMORROW</div></div>`;
};
const _duelPick = duelPick;
duelPick = async function(short, el){
  if(!LIVE.on) return _duelPick(short, el);
  if(S.done.duel) return;
  const side = short===DUEL.a.short ? 1 : 2;
  const fx=document.createElement('div'); fx.className='fightfx'; fx.innerHTML='<b>FIGHT!</b>'; document.getElementById('app').appendChild(fx); setTimeout(()=>fx.remove(),950);
  await LIVE.W.makeDuelPick(side); await afterAction();
  if(LIVE.W.getMyDuelPick()){ delete S.done.duel; complete('duel', el, short); }
  else say('Pick didn\'t go through · it may be locked');
  if(futuresToday() && !S.done.futures) setTimeout(()=>{ if(cur!=='duel') return; say('Next up: your Futures Duel'); dissolve(()=>{ DZ.sec='futures'; render(); }, '#02020c'); }, 1500);
};

/* ── Weekly Challenge ────────────────────────────────────────────────────── */
function syncWlc(ls, mid){
  const W=LIVE.W, wk=W.wlcWeekKey(), week=ls.wlc?.weeks?.[wk], pool=(week?.status==='active'&&!week.testers)?(week.pool||[]):[];
  LIVE.wk=wk; LIVE.week=pool.length?week:null;
  WLC.pool=(week?.theme||'NO CHALLENGE YET').toUpperCase();
  WLC_TIERS.length=0; for(let c=5;c>=1;c--) WLC_TIERS.push(pool.filter(p=>p.salary===c).map(p=>p.n));
  for(const p of pool) if(!LIVE.idx.has(p.n)){ const t=(p.t||p.team||'').toUpperCase(); LIVE.idx.set(p.n,{n:p.n,s:p.n.split(' ').pop().toUpperCase(),t,p:p.p||'',f:+(p.fpPG||p.f||0),c:TC[t]||'#1e3258',l5:0,wk:0,fall:0,td:0,yd:0}); }
  const L=(ls.wlc?.lineups?.[wk])||{}, my=L[mid];
  S.wphase = LIVE.week && W.isWlcLocked(wk) ? 'live' : 'open';
  S.wsaved = !!my?.saved;
  if(my?.saved) S.party=[...my.picks]; else S.party=(S.party||[]).filter(n=>pool.some(p=>p.n===n));
  if(LIVE.week){ const [ws,we]=W.wlcWeekRange(wk), f=d=>W.statDateObj(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
    LIVE.wlcDates=`${f(ws)} – ${f(we)}${week.tipoffTime&&!W.isWlcLocked(wk)?' · LOCKS '+new Date(week.tipoffTime).toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).toUpperCase()+' ET':''}`; }
  const chOfId = id => TEAMS.find(t=>t.mid===String(id))?.ch || BB.ORDER[Number(id)%BB.ORDER.length];
  C_LINEUPS.length=0; (ls.managers||[]).filter(m=>String(m.id)!==mid).forEach(m=>C_LINEUPS.push([m.display_name.replace(' (CPU)',''), chOfId(m.id), L[m.id]?.saved?L[m.id].picks:[]]));
  // Season standings (Fall points, total, win %)
  CSTAND.length=0; try{ const {T}=W.wlcPointsTable();
    (ls.managers||[]).map(m=>({m, ...(T[String(m.id)]||{run:0,total:0,wins:0,weeks:0})})).sort((a,b)=>b.run-a.run||b.total-a.total)
      .forEach(r=>CSTAND.push([r.m.display_name.replace(' (CPU)',''), String(r.m.id)===mid?null:chOfId(r.m.id), r.run, r.total, r.weeks?Math.round(100*r.wins/r.weeks)+'%':'—'])); }catch(e){}
  // Live chart numbers once the week is locked
  LIVE.series=null;
  if(S.wphase==='live'){ try{ W.wlcChartHtml(wk, week); LIVE.series=(W._wchSeries||[]).map(s=>({m:s.m.display_name.replace(' (CPU)',''), ch:chOfId(s.m.id), me:String(s.m.id)===mid, picks:L[s.m.id]?.picks||[], tot:s.now, vals:s.vals, rank:s.rank})); }catch(e){ console.warn('[live] chart', e); } }
}
const _cEntries = cEntries;
cEntries = function(){ if(!LIVE.on || !LIVE.series) return _cEntries(); return LIVE.series.map(s=>({...s})); };
const _wkFpg = wkFpg;
wkFpg = n => { if(!LIVE.on) return _wkFpg(n); const p=P(n), id=LIVE.pid?.get(n); const lines=(LIVE.byPid?.get(String(id))||[]).filter(e=>{ const [ws,we]=LIVE.W.wlcWeekRange(LIVE.wk); return String(e.date)>=ws && String(e.date)<=we; });
  return lines.length ? +(lines.reduce((a,e)=>a+(e.fp||0),0)/lines.length).toFixed(1) : 0; };
const _wlcChart = wlcChart;
wlcChart = function(){
  if(!LIVE.on || !LIVE.series) return _wlcChart();
  const E=LIVE.series, cols=['#ff5fbf','#ffd93d','#39ff6a','#4adfff','#b36bff','#ff8c42','#9aa4b8','#f2f2f7','#5b8cff','#c8a26e','#7ee36b','#ff5c6c','#2ae8b8'], W=320, H=130, L=24, R=10, T=10, B=18;
  const all=E.flatMap(e=>e.vals).filter(v=>v>0), lo=Math.max(0,Math.floor(Math.min(...all,100)/25)*25-25), hi=Math.ceil(Math.max(...all,50)/25)*25;
  const x=i=>L+i*(W-L-R)/6, y=v=>T+(1-(Math.max(v,lo)-lo)/Math.max(1,hi-lo))*(H-T-B);
  const grid=[...Array(Math.round((hi-lo)/25)+1)].map((_,i)=>{ const v=lo+i*25; return `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#1e3258" stroke-width=".6"/><text x="${L-4}" y="${y(v)+2}" text-anchor="end">${v}</text>`; }).join('');
  const xl=DAYN.map((t,i)=>`<text x="${x(i)}" y="${H-5}" text-anchor="middle" ${i===TODAY_I?'style="fill:#ffd93d"':''}>${t}</text>`).join('');
  const lines=E.map((e,k)=>`<polyline fill="none" stroke="${cols[k%cols.length]}" stroke-width="${e.me?2.4:1.2}" opacity="${e.me?1:.75}" points="${e.vals.map((q,i)=>x(i)+','+y(q)).join(' ')}"/>`).join('');
  return `<div class="wch"><div class="hd"><span>${WLC.pool} · FP/G</span><span>🔒 PICKS LOCKED</span></div><svg viewBox="0 0 ${W} ${H}">${grid}${xl}${lines}</svg>
    <div class="lg">${E.map((e,k)=>`<span style="color:${e.me?'var(--green)':'var(--t2)'}"><i style="background:${cols[k%cols.length]}"></i>${e.m}</span>`).join('')}</div></div>`;
};
const _challenge = challenge;
challenge = function(){
  if(LIVE.on && !LIVE.week) return mframe('cz','CHALLENGE', `<div class="wban"><div class="th">WEEKLY CHALLENGE</div><div class="sb">No Challenge is open right now. The next one opens Monday at 12 AM ET.</div></div>`);
  return _challenge();
};
SCREENS.wlc = challenge;
const _cSave = cSave;
cSave = function(el){
  if(!LIVE.on) return _cSave(el);
  const o=overlay(`<div class="sheet" style="--c:var(--orange)"><h3>SAVE THIS LINEUP?</h3><p>Once saved, your picks are final for the week. The only change allowed: one swap of a player listed OUT.</p>
    <div class="acts"><button class="btn alt" id="no">NOT YET</button><button class="btn" id="yes">SAVE LINEUP</button></div></div>`);
  o.querySelector('#no').onclick=()=>o.remove();
  o.querySelector('#yes').onclick=async()=>{ o.remove(); await LIVE.W.saveWlcLineup([...S.party]); LIVE.W.document.getElementById('wlc-lockin')?.remove(); await afterAction();
    if(S.wsaved){ CZ.sel=null; if(!S.done.wlc) complete('wlc', el); lockedSplash([...S.party]); } else say('Didn\'t save · picks may be locked'); };
};

/* ── Fantasy: line-ups, waivers, schedule ────────────────────────────────── */
Object.defineProperties(MU, {me:{configurable:true, get:()=>LIVE.on?LIVE.mu.me:days().reduce((a,d)=>a+(d.me||0),0)}, opp:{configurable:true, get:()=>LIVE.on?LIVE.mu.opp:days().reduce((a,d)=>a+(d.op||0),0)}});
const _days = days; days = () => LIVE.on ? LIVE.days.map(d=>({...d})) : _days();
const _swapPos = swapPos;
swapPos = function(a,b){
  if(!LIVE.on) return _swapPos(a,b);
  const W=LIVE.W, na=getSlot(a), nb=getSlot(b);
  for(const n of [na,nb]) if(n && W.isPlayerLocked(W.getPlayer(LIVE.pid.get(n)))){ say(`🔒 ${nm(n)}'s game has started`); return false; }
  if(b[0]==='i' && na && !isOut(na)){ say('Only OUT players can go on IR'); return false; }
  if(a[0]==='i' && nb && !isOut(nb)){ say('Only OUT players can go on IR'); return false; }
  setSlot(a,nb); setSlot(b,na);
  commitLineup();
  return true;
};
const _commitLineup = commitLineup, _commitPlan = commitPlan;
commitLineup = function(){
  if(!LIVE.on) return _commitLineup();
  const ls=LIVE.E('leagueState'), mid=LIVE.mid, id=n=>LIVE.pid.get(n);
  ls.active[mid]=S.fl.act.filter(Boolean).map(id); ls.inactive[mid]=S.fl.bench.filter(Boolean).map(id);
  if(S.fl.ir[0]) (ls.ir ||= {})[mid]=id(S.fl.ir[0]); else if(ls.ir) delete ls.ir[mid];
  LIVE.W.saveLeagueState().then(afterAction);
};
commitPlan = function(di, names){
  if(!LIVE.on) return _commitPlan(di, names);
  const W=LIVE.W, ls=LIVE.E('leagueState'), mid=LIVE.mid, ymd=W.ymd(new Date(+WEEK_START(MU.week)+di*864e5+432e5));
  ((ls.lineupPlans ||= {})[mid] ||= {})[ymd] = W.planEligible(mid, names.map(n=>LIVE.pid.get(n)));
  clearTimeout(LIVE._planT); LIVE._planT=setTimeout(()=>W.saveLeagueState().then(afterAction), 300);
};
lockedN = n => LIVE.on ? !!LIVE.W.isPlayerLocked(LIVE.W.getPlayer(LIVE.pid.get(n))) : false;
addsLeft = () => LIVE.on ? Math.max(0, LIVE.E('WAIVER_WEEKLY') - LIVE.W.waiverUsedThisWeek(LIVE.mid)) : 3 - S.wv.used;
const _wvScout = wvScout;
wvScout = async function(n){ if(!LIVE.on) return _wvScout(n); const was=S.wv.scouted.includes(n); await LIVE.W.toggleScout(LIVE.pid.get(n)); await afterAction(); say(was?'Removed from your Scouting Report':'Added to your Scouting Report'); };
const _wvAdd = wvAdd;
wvAdd = async function(n){
  if(!LIVE.on) return _wvAdd(n);
  const W=LIVE.W, mid=LIVE.mid, ls=LIVE.E('leagueState'), pid=LIVE.pid.get(n);
  if(addsLeft()<=0){ say('No add/drops left this week'); return; }
  if((ls.rosters[mid]||[]).length < W.effectiveRosterSize(mid)){ const ok=await W.addPlayer(mid,pid); await afterAction(); if(ok){ FZ.wsel=null; render(); say(`Added ${nm(n)}`); lineupCheck(); } return; }
  const slots=[...S.fl.act, ...S.fl.bench].filter(Boolean);
  const o=overlay(`<div class="sheet" style="--c:var(--green)"><h3>ROSTER FULL · DROP SOMEONE</h3><p>To add <b style="color:var(--green);font-weight:normal">${n}</b>, pick a player to drop. This uses one of your ${addsLeft()} add/drops this week.</p>
    <div class="dlist">${slots.map(x=>{ const p=P(x); return `<button data-n="${x.replace(/"/g,'&quot;')}"><span class="mini" style="--tc:${p.c}">${face(p.t,p.n)}</span><span>${p.n}<small>${p.t} · ${p.f} FP/G${p.inj?' · '+p.inj:''}</small></span><b>DROP</b></button>`; }).join('')}</div></div>`);
  o.querySelectorAll('[data-n]').forEach(b=>b.onclick=async()=>{ o.remove(); const drop=b.dataset.n;
    await W.executeAddDrop(mid, pid, LIVE.pid.get(drop)); W.document.getElementById('add-drop-modal')?.remove(); await afterAction();
    if(myNames().includes(n)){ FZ.wsel=null; render(); say(`Added ${nm(n)} · dropped ${nm(drop)}`); lineupCheck(); } else say('That move didn\'t go through'); });
};
const _txLog = txLog;
txLog = function(){
  if(!LIVE.on) return _txLog();
  const ls=LIVE.E('leagueState'), W=LIVE.W, all=[];
  for(const [m,log] of Object.entries(ls.waiverLog||{})){ const mm=(ls.managers||[]).find(x=>String(x.id)===String(m)); for(const e of log||[]) all.push({...e, who:(mm?.display_name||'?').replace(' (CPU)','')}); }
  all.sort((a,b)=>String(b.ts||b.date).localeCompare(String(a.ts||a.date)));
  overlay(`<div class="sheet" style="--c:var(--blue)"><h3>📜 TRANSACTIONS</h3><div class="tx dlist">${all.slice(0,40).map(l=>`<div><span class="${l.type==='add'?'a':'d'}">${l.type.toUpperCase()}</span>${W.getPlayer(l.pid)?.name||'?'}<small>${l.who.toUpperCase()} · ${l.date}</small></div>`).join('')}</div></div>`);
};
const _fpFor = fpFor;
fpFor = function(p){
  if(!LIVE.on) return _fpFor(p);
  if(FZ.fpm==='WEEK') return p.wk; if(FZ.fpm==='FALL') return p.fall;
  if(FZ.day===TODAY_I) return GAMES[p.t] ? p.td : '—';
  const d=LIVE.W.ymd(new Date(+WEEK_START(MU.week)+FZ.day*864e5+432e5)), e=(LIVE.byPid.get(String(p.id))||[]).find(x=>String(x.date)===d);
  return e ? Math.round(e.fp||0) : '—';
};
const _dayGame = dayGame;
dayGame = function(n, di){
  if(!LIVE.on || di===TODAY_I) return _dayGame(n, di);
  try{ const ymd=LIVE.W.ymd(new Date(+WEEK_START(MU.week)+di*864e5+432e5)), g=(LIVE.W.teamWeekGames(P(n).t)||[]).find(x=>String(x.date).replace(/-/g,'')===ymd);
    return g ? `${(g.time||'').replace(/ ?(PM|AM)? ?ET$/,'').replace(' PM','P')} ${g.isHome?'vs':'@'} ${g.opp}`.trim() : 'NO GAME'; }catch(e){ return ''; }
};
const _fzSched = fzSched;
fzSched = function(){
  if(!LIVE.on) return _fzSched();
  const W=LIVE.W, ls=LIVE.E('leagueState'), run=LIVE.run, w=FZ.wk, sched=(ls.schedule||{})[run]||[], wr=W.runWeekRange(run,w-1), n=sched.length;
  const rec = {}; W.fantasyStandings(run).forEach(r=>rec[String(r.id)]=r);
  const T = id => TEAMS.find(t=>t.mid===String(id)) || {team:'?', m:'?'};
  const rows=(sched[w-1]||[]).map(mu=>{ const a=T(mu.home), b=T(mu.away);
    let sa='—', sb='—'; if(w-1<LIVE.widx){ sa=Math.round(mu.homeFP||0); sb=Math.round(mu.awayFP||0); } else if(w-1===LIVE.widx){ sa=Math.round(W.managerFP(mu.home)); sb=Math.round(W.managerFP(mu.away)); }
    const ra=rec[String(mu.home)]||{wins:0,losses:0}, rb=rec[String(mu.away)]||{wins:0,losses:0}, me=a.me||b.me;
    return `<div class="mrow ${me?'me':''}"><div class="side"><span class="av" data-ch="${chOf(a)}"></span><span class="wl">${ra.wins}-${ra.losses}</span><small>${a.team.toUpperCase()}</small></div>
      <b class="${sa>sb?'hi':''}">${sa}</b><i>VS</i><b class="${sb>sa?'hi':''}">${sb}</b>
      <div class="side r"><span class="wl">${rb.wins}-${rb.losses}</span><span class="av" data-ch="${chOf(b)}"></span><small>${b.team.toUpperCase()}</small></div></div>`; }).join('');
  return `<div class="wkn"><button onclick="FZ.wk=Math.max(1,FZ.wk-1);render()">◀</button><div>${w-1===LIVE.widx?'▸ THIS WEEK':w-1<LIVE.widx?'FINAL':'UPCOMING'}<b>${fmtD(wr.mon)} – ${fmtD(wr.sun)}</b></div><button onclick="FZ.wk=Math.min(${n||8},FZ.wk+1);render()">▶</button></div>
    <div class="lbox"><h3>WEEK ${w} MATCH-UPS</h3><div class="sub">${fmtD(wr.mon).toUpperCase()} – ${fmtD(wr.sun).toUpperCase()}</div>${rows}<div class="foot">${n} WEEKS IN THE FALL RUN</div></div>`;
};
const _standings = standings;
standings = function(){
  if(!LIVE.on) return _standings();
  return LIVE.W.fantasyStandings(LIVE.run).map(r=>{ const i=TEAMS.findIndex(t=>t.mid===String(r.id)), t=TEAMS[i]||{};
    return {...t, i, w:r.wins, l:r.losses, pf:Math.round(r.fp)}; });
};
const _record = record;
record = i => LIVE.on ? (standings().find(t=>t.i===i)||{w:0,l:0,pf:0}) : _record(i);
