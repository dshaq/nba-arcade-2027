/* NBA Arcade · NEXT · new Fantasy rules (Nov 24): waivers, IR roster lock, trades.
   · Acquisitions: 7 per matchup (7-day week)                     [fantasy.js addsLeft]
   · Waiver period: 1 day. A dropped player sits on waivers for a day; adding him is a CLAIM.
   · Waiver order: rolling. A successful claim moves you to the back; it never resets.
     The starting order is the reverse of the draft order.
   · IR roster lock: if your IR player is no longer OUT, you can't add, claim or trade until you move him off IR.
   · Trades: up to 3 teams. Deadline at 3/5 of the way through each run. 2-day review; 5 veto votes kill a trade.
   Preview only: sample data on this phone, nothing reaches the real league. */

/* ── IR ROSTER LOCK ── */
const rosterLocked = () => !!S.fl.ir[0] && !isOut(S.fl.ir[0]);
function lockSay(){ say(`🔒 Roster locked · ${nm(S.fl.ir[0])} is healthy but still on IR`); }
const lockBanner = () => rosterLocked() ? `<div class="lockb"><b>🔒 ROSTER LOCKED</b><span>${nm(S.fl.ir[0])} is no longer OUT. Move him off IR to unlock adds, claims and trades.</span><button onclick="FZ.tab='roster';render()">FIX ▶</button></div>` : '';

/* ── WAIVERS ── */
const DRAFT_ORDER = [2,5,0,3,1,4];                        // sample Fall draft order (team indexes)
S.wo ||= DRAFT_ORDER.slice().reverse();                   // waiver order starts as the reverse of the draft
/* keep the order valid for however many teams the league has (the test league has more than the sample) */
const woList = () => { const n=TEAMS.length; const w=(S.wo||[]).filter(t=>t<n); for(let i=0;i<n;i++) if(!w.includes(i)) w.unshift(i); return S.wo=w; };
S.claims ||= [];
const ymdET = (d=new Date()) => d.toLocaleDateString('en-CA',{timeZone:'America/New_York'});
const addDays = (ymd,n) => { const d=new Date(ymd+'T12:00:00'); d.setDate(d.getDate()+n); return ymdET(d); };
/* Sample: three players other teams dropped yesterday are on waivers until tomorrow */
S.wvDrops ||= (()=>{ const r=rostered(); const L=PL.filter(p=>p.n && !r.has(p.n) && !isOut(p.n)).sort((a,b)=>b.l5-a.l5); return [L[1],L[4],L[8]].filter(Boolean).map((p,k)=>({n:p.n, by:1+k, until:addDays(ymdET(),1)})); })();
const onWaivers = n => S.wvDrops.some(w=>w.n===n && w.until>ymdET()) || S.claims.some(c=>c.n===n);
const myWaiverSpot = () => woList().indexOf(0)+1;

function placeClaim(n){
  if(S.claims.some(c=>c.n===n)){ say('You already have a claim on him'); return; }
  const slots=[...S.fl.act.map((x,i)=>['a'+i,x]), ...S.fl.bench.map((x,i)=>['b'+i,x])].filter(x=>x[1]);
  const full = !S.fl.act.includes(null) && !S.fl.bench.includes(null);
  const o=overlay(`<div class="sheet" style="--c:var(--gold)"><h3>⏳ WAIVER CLAIM</h3>
    <p><b style="color:var(--gold);font-weight:normal">${n}</b> is on waivers until tomorrow. Claims run then, in waiver order. You're <b style="color:var(--gold);font-weight:normal">#${myWaiverSpot()} of ${woList().length}</b>. If you get him, you move to the back of the line.</p>
    ${full?`<div class="cap">PICK WHO TO DROP IF THE CLAIM GOES THROUGH</div><div class="dlist">${slots.map(([pos,x])=>{ const p=P(x); return `<button data-p="${pos}"><span class="mini" style="--tc:${p.c}">${face(p.t,p.n)}</span><span>${p.n}<small>${p.t} · ${p.f} FP/G</small></span><b>DROP</b></button>`; }).join('')}</div>`
      :`<div class="acts"><button class="btn" id="go">PLACE CLAIM</button></div>`}</div>`);
  const done=drop=>{ o.remove(); S.claims.push({n, drop, at:ymdET()}); save(); render(); say(`Claim placed on ${nm(n)} · runs tomorrow`); window.SFX?.('saved'); };
  o.querySelector('#go')?.addEventListener('click',()=>done(null));
  o.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>done(getSlot(b.dataset.p)));
}
/* Run the claims (preview button; the real thing runs once a day) */
function runClaims(){
  if(!S.claims.length){ say('No claims to run'); return; }
  const res=[];
  for(const c of S.claims.splice(0)){
    // a CPU team ahead of you in line wants the same player half the time
    const ahead=woList().slice(0, woList().indexOf(0)), rival=ahead.find(t=>hsh(c.n+'|cl'+t)<.25);
    if(rival!=null || addsLeft()<=0){ res.push(`✗ ${nm(c.n)} went to ${TEAMS[rival??1].team}`); if(rival!=null){ S.wo=S.wo.filter(x=>x!==rival).concat(rival); (OTHER[rival] ||= []).push(c.n); } continue; }
    let pos = S.fl.act.indexOf(null)>=0 ? 'a'+S.fl.act.indexOf(null) : S.fl.bench.indexOf(null)>=0 ? 'b'+S.fl.bench.indexOf(null) : null;
    if(!pos && c.drop){ const k=S.fl.act.indexOf(c.drop); pos = k>=0 ? 'a'+k : 'b'+S.fl.bench.indexOf(c.drop); }
    if(!pos){ res.push(`✗ ${nm(c.n)} · no room on your roster`); continue; }
    setSlot(pos, c.n); S.wv.used++; S.wo=S.wo.filter(x=>x!==0).concat(0);
    const d=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}); S.wv.log.unshift({t:'ADD',n:c.n,d}); if(c.drop) S.wv.log.unshift({t:'DROP',n:c.drop,d});
    res.push(`✓ ${nm(c.n)} is yours · you move to #${S.wo.length} in waiver order`);
  }
  S.wvDrops=S.wvDrops.filter(w=>!S.fl.act.includes(w.n)&&!S.fl.bench.includes(w.n));
  save(); render(); overlay(`<div class="sheet" style="--c:var(--gold)"><h3>⏳ CLAIMS RUN</h3><div class="chg">${res.map(r=>`<span>${r}</span>`).join('')}</div></div>`);
}
function waiverOrder(){
  overlay(`<div class="sheet" style="--c:var(--gold)"><h3>WAIVER ORDER</h3><p>Rolling order. A successful claim sends that team to the back. It never resets. It started as the reverse of the draft order.</p>
    <div class="wol">${woList().map((t,k)=>`<div class="${t===0?'me':''}"><b>${k+1}</b><span class="av" data-ch="${t===0?S.active:chOf(TEAMS[t])}"></span><span>${TEAMS[t].team}</span><small>${t===0?'YOU':TEAMS[t].m}</small></div>`).join('')}</div>
    ${S.claims.length?`<div class="cap">YOUR CLAIMS · RUN TOMORROW</div>${S.claims.map(c=>`<div class="clm"><span>${c.n}</span><small>${c.drop?'DROP '+nm(c.drop):'OPEN SPOT'}</small><button onclick="S.claims=S.claims.filter(x=>x.n!=='${c.n.replace(/'/g,"\\'")}');save();this.closest('.ov').remove();waiverOrder();render()">CANCEL</button></div>`).join('')}<div class="acts"><button class="btn alt" onclick="this.closest('.ov').remove();runClaims()">PREVIEW: RUN CLAIMS NOW</button></div>`:''}</div>`);
  document.querySelectorAll('.wol .av[data-ch]').forEach(el=>{ if(!el.firstChild&&BB.CHARS[el.dataset.ch]) el.appendChild(ballerCv(el.dataset.ch,1)); });
}
/* waivers page: lock banner + waiver-order strip on top */
const _wvPage = wvPage;
wvPage = function(){
  return lockBanner() + `<div class="wostrip" onclick="waiverOrder()"><span>WAIVER ORDER</span><b>#${myWaiverSpot()} OF ${woList().length}</b>${S.claims.length?`<i>${S.claims.length} CLAIM${S.claims.length>1?'S':''} PENDING</i>`:'<i>1-DAY WAIVERS</i>'}<em>▶</em></div>` + _wvPage();
};
const _rosterStage = rosterStage;
rosterStage = function(){ return lockBanner() + _rosterStage(); };

/* ── TRADES ── */
const RUN = {start:'2026-10-20', end:'2026-12-27', name:'FALL RUN'};
const TRADE_DEADLINE = (()=>{ const a=new Date(RUN.start+'T12:00:00'), b=new Date(RUN.end+'T12:00:00'); return ymdET(new Date(+a + (b-a)*3/5)); })();
const VETO_N = 5, REVIEW_DAYS = 2;
const fmtYmd = ymd => new Date(ymd+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
const pastDeadline = () => ymdET() > TRADE_DEADLINE;
const rosterOfT = i => i===0 ? [...S.fl.act,...S.fl.bench].filter(Boolean) : (OTHER[i]||[]).slice();
S.trades ||= [ /* a league trade already in review, so the veto flow has something to show */
  {id:1, teams:[2,4], moves:[{n:(OTHER[2]||[])[3], from:2, to:4},{n:(OTHER[4]||[])[2], from:4, to:2},{n:(OTHER[4]||[])[9], from:4, to:2}], status:'review', at:addDays(ymdET(),-1), ends:addDays(ymdET(),1), vetoes:['Riley','Jordan']} ];
const TZ = {teams:[0,null,null], dest:{}};

function tradesPage(){
  const locked=rosterLocked(), dead=pastDeadline(), dl=Math.ceil((new Date(TRADE_DEADLINE+'T23:59:00') - new Date())/864e5);
  const parts=TZ.teams.filter(t=>t!=null);
  const pick=(slot)=>`<div class="tmpick">${TEAMS.map((t,i)=>i===0?'':`<button class="${TZ.teams[slot]===i?'on':''} ${TZ.teams.includes(i)&&TZ.teams[slot]!==i?'x':''}" onclick="tmTeam(${slot},${i})"><span class="av" data-ch="${chOf(t)}"></span><small>${t.team.split(' ').slice(-1)[0].toUpperCase()}</small></button>`).join('')}${slot===2&&TZ.teams[2]!=null?`<button class="clr" onclick="tmTeam(2,null)">✕</button>`:''}</div>`;
  const col=i=>{ const T=TEAMS[i]; return `<div class="tmcol"><div class="tmh"><span class="av" data-ch="${i===0?S.active:chOf(T)}"></span><b>${i===0?'YOU':T.team.toUpperCase()}</b></div>
    ${rosterOfT(i).sort((a,b)=>P(b).f-P(a).f).map(n=>{ const d=TZ.dest[n]; return `<button class="tmp ${d!=null?'go':''}" onclick="tmToggle('${n.replace(/'/g,"\\'")}',${i})"><span class="mini" style="--tc:${P(n).c}">${face(P(n).t,n)}</span><span class="tn">${P(n).s}<small>${P(n).f} FP/G</small></span>${d!=null?`<i>→ ${d===0?'YOU':TEAMS[d].team.split(' ').slice(-1)[0].toUpperCase()}</i>`:''}</button>`; }).join('')}</div>`; };
  const moves=Object.entries(TZ.dest).map(([n,to])=>({n,to,from:parts.find(t=>rosterOfT(t).includes(n))}));
  const net=t=>moves.reduce((a,m)=>a+(m.to===t?+P(m.n).f:0)-(m.from===t?+P(m.n).f:0),0);
  const size=t=>rosterOfT(t).length+moves.filter(m=>m.to===t).length-moves.filter(m=>m.from===t).length;
  const bad=parts.filter(t=>size(t)>13);
  const ok=moves.length && parts.every(t=>moves.some(m=>m.from===t||m.to===t)) && !bad.length && !locked && !dead && parts.length>=2;
  const machine=`<div class="tmach ${TZ.spin?'spin':''}"><div class="tmt">TRADE MACHINE</div>
    <div class="tmrows">${parts.map(t=>{ const inn=moves.filter(m=>m.to===t), v=net(t); return `<div class="tmr"><span class="av" data-ch="${t===0?S.active:chOf(TEAMS[t])}"></span><div class="get"><small>${t===0?'YOU GET':TEAMS[t].team.toUpperCase()+' GETS'}</small><div>${inn.length?inn.map(m=>`<span class="chip">${P(m.n).s}</span>`).join(''):'<em>NOTHING YET</em>'}</div></div><b class="${v>0?'up':v<0?'dn':''}">${v>0?'+':''}${v.toFixed(1)}<small>FP/G</small></b></div>`; }).join('')}</div>
    ${bad.length?`<div class="tmw">! ${bad.map(t=>t===0?'YOU':TEAMS[t].team).join(', ')} would have ${size(bad[0])} players (max 13)</div>`:''}
    <button class="lever ${ok?'':'off'}" ${ok?'':'disabled'} onclick="tmPropose()"><i></i><span>${dead?'DEADLINE PASSED':locked?'ROSTER LOCKED':'PULL TO PROPOSE'}</span></button></div>`;
  const list=S.trades.slice().reverse().map(tr=>tradeCard(tr)).join('');
  return lockBanner() + `<div class="tdl ${dead?'past':dl<=7?'soon':''}"><span>TRADE DEADLINE</span><b>${fmtYmd(TRADE_DEADLINE)}</b><i>${dead?'CLOSED FOR THIS RUN':`${dl} DAY${dl===1?'':'S'} LEFT · 3/5 OF THE ${RUN.name}`}</i></div>
    <div class="qcap">BUILD A TRADE · UP TO 3 TEAMS</div>
    <div class="tmsel"><div><small>TRADE WITH</small>${pick(1)}</div><div><small>ADD A 3RD TEAM (OPTIONAL)</small>${pick(2)}</div></div>
    ${parts.length>=2?`<div class="tmcols c${parts.length}">${parts.map(col).join('')}</div>${machine}`:'<div class="tmhint">Pick a team to trade with. Add a third to make it a 3-way deal.</div>'}
    ${list?`<div class="qcap">TRADES</div><div class="trl">${list}</div>`:''}
    <div class="tmrule">Trades need every team to accept, then sit in a ${REVIEW_DAYS}-day league review. ${VETO_N} veto votes cancel a trade.</div>`;
}
function tmTeam(slot,i){ const prev=TZ.teams[slot]; TZ.teams[slot]=i; if(i!=null && TZ.teams.filter(x=>x===i).length>1) TZ.teams[slot]=prev;
  if(slot===1 && i==null) TZ.teams[2]=null;
  const parts=TZ.teams.filter(t=>t!=null); for(const n in TZ.dest){ if(!parts.some(t=>rosterOfT(t).includes(n)) || !parts.includes(TZ.dest[n])) delete TZ.dest[n]; }
  render(); }
/* tap a player: 2 teams → send to the other team; 3 teams → cycles through destinations, then back off */
function tmToggle(n, from){
  const parts=TZ.teams.filter(t=>t!=null), others=parts.filter(t=>t!==from), cur=TZ.dest[n];
  const k = cur==null ? 0 : others.indexOf(cur)+1;
  if(k>=others.length) delete TZ.dest[n]; else TZ.dest[n]=others[k];
  window.SFX?.('tap'); render();
}
function tmPropose(){
  if(rosterLocked()){ lockSay(); return; }
  if(document.querySelector('.lever.off')){ say('Every team has to send or get someone, and rosters stay at 13 max'); return; }
  const parts=TZ.teams.filter(t=>t!=null), moves=Object.entries(TZ.dest).map(([n,to])=>({n,to,from:parts.find(t=>rosterOfT(t).includes(n))}));
  TZ.spin=true; render(); window.SFX?.('lock');
  setTimeout(()=>{ TZ.spin=false; S.trades.push({id:Date.now(), teams:parts, moves, status:'pending', at:ymdET(), accepted:[0], vetoes:[]}); TZ.dest={}; save(); render(); window.SFX?.('saved'); say('Trade proposed · waiting on the other team'+(parts.length>2?'s':'')); }, 1100);
}
function tradeCard(tr){
  const mine=tr.teams.includes(0), steps=['PROPOSED','ACCEPTED','REVIEW','DONE'], at={pending:0,review:2,done:3,vetoed:2,declined:0}[tr.status];
  const who=t=>t===0?'YOU':TEAMS[t].team.split(' ').slice(-1)[0].toUpperCase();
  if(!tr.moves.every(m=>m.n&&P(m.n)?.n) || !tr.teams.every(t=>TEAMS[t])) return '';
  const legs=tr.teams.map(t=>{ const g=tr.moves.filter(m=>m.to===t); return `<div class="leg"><span class="av" data-ch="${t===0?S.active:chOf(TEAMS[t])}"></span><b>${who(t)}</b><span>GETS</span>${g.map(m=>`<i>${P(m.n).s}</i>`).join('')||'<i>—</i>'}</div>`; }).join('');
  const vv=tr.vetoes||[], iVoted=vv.includes(ME.name);
  return `<div class="trc ${tr.status}"><div class="trs">${steps.map((s,k)=>`<span class="${k<at||(k===at&&tr.status!=='vetoed'&&tr.status!=='declined')?'on':''} ${k===at?'cur':''}">${s}</span>`).join('<em></em>')}</div>
    ${legs}
    ${tr.status==='review'?`<div class="veto"><span>REVIEW ENDS ${fmtYmd(tr.ends)}</span><div class="vd">${[...Array(VETO_N)].map((_,k)=>`<i class="${k<vv.length?'on':''}"></i>`).join('')}</div><b>${vv.length}/${VETO_N} VETOES</b>
      ${mine?'':`<button class="${iVoted?'on':''}" onclick="tmVeto(${tr.id})">${iVoted?'✓ VETOED':'VETO'}</button>`}</div>`:''}
    ${tr.status==='vetoed'?'<div class="trx">✗ VETOED BY THE LEAGUE</div>':tr.status==='declined'?'<div class="trx">✗ DECLINED</div>':tr.status==='done'?'<div class="trok">✓ TRADE COMPLETE</div>':''}
    ${tr.status==='pending'?`<div class="trprev"><span>PREVIEW</span><button onclick="tmSim(${tr.id},'accept')">THEY ACCEPT</button><button onclick="tmSim(${tr.id},'decline')">THEY DECLINE</button></div>`:''}
    ${tr.status==='review'&&mine?`<div class="trprev"><span>PREVIEW</span><button onclick="tmSim(${tr.id},'clear')">REVIEW ENDS</button><button onclick="tmSim(${tr.id},'veto')">LEAGUE VETOES</button></div>`:''}</div>`;
}
function tmVeto(id){ const tr=S.trades.find(t=>t.id===id); if(!tr) return; const v=tr.vetoes ||= []; const k=v.indexOf(ME.name); if(k>=0) v.splice(k,1); else v.push(ME.name);
  if(v.length>=VETO_N){ tr.status='vetoed'; say('5 vetoes · trade cancelled'); } save(); render(); }
function tmSim(id, what){
  const tr=S.trades.find(t=>t.id===id); if(!tr) return;
  if(what==='accept'){ tr.status='review'; tr.ends=addDays(ymdET(),REVIEW_DAYS); say(`Accepted · ${REVIEW_DAYS}-day league review`); }
  if(what==='decline'){ tr.status='declined'; }
  if(what==='veto'){ tr.vetoes=['Riley','Jordan','Casey','Morgan','Taylor']; tr.status='vetoed'; window.SFX?.('miss'); }
  if(what==='clear'){ tr.status='done'; tmApply(tr); window.SFX?.('win'); say('Trade complete'); }
  save(); render();
}
function tmApply(tr){
  for(const m of tr.moves){
    if(m.from===0){ for(const k of ['act','bench']){ const i=S.fl[k].indexOf(m.n); if(i>=0) S.fl[k][i]=null; } } else { const a=OTHER[m.from]||[]; const i=a.indexOf(m.n); if(i>=0) a.splice(i,1); }
  }
  for(const m of tr.moves){
    if(m.to===0){ const i=S.fl.bench.indexOf(null), j=S.fl.act.indexOf(null); if(i>=0) S.fl.bench[i]=m.n; else if(j>=0) S.fl.act[j]=m.n; } else (OTHER[m.to] ||= []).push(m.n);
  }
  S.wv.log.unshift({t:'TRADE', n:tr.moves.filter(m=>m.to===0).map(m=>nm(m.n)).join(', ')||'—', d:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
}
const _afterFz = AFTER.fantasy;
AFTER.fantasy = ()=>{ _afterFz && _afterFz(); document.querySelectorAll('.tmpick .av[data-ch],.tmcol .av[data-ch],.tmach .av[data-ch],.trc .av[data-ch]').forEach(el=>{ if(!el.firstChild&&BB.CHARS[el.dataset.ch]) el.appendChild(ballerCv(el.dataset.ch,1)); }); };

document.head.insertAdjacentHTML('beforeend',`<style>
.mtabs.t6{grid-template-columns:repeat(6,minmax(0,1fr))!important}.mtabs.t6 button{font-size:4.6px!important;padding:10px 0!important}
.lockb{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;padding:10px 12px;margin-bottom:10px;border:2px solid #ff3b5c;border-radius:10px;background:rgba(255,59,92,.12)}
.lockb b{font-weight:normal;font-size:7px;color:#ff6b81}.lockb span{grid-column:1;font-size:5.5px;line-height:1.8;color:var(--t2)}.lockb button{grid-row:1/3;grid-column:2;font:inherit;font-size:6px;padding:8px 10px;border-radius:6px;border:2px solid #ff3b5c;background:#ff3b5c;color:#fff;cursor:pointer}
.wostrip{display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:8px;border:2px solid var(--edge);border-radius:8px;background:var(--card);cursor:pointer;font-size:5.5px;color:var(--t3)}
.wostrip b{font-weight:normal;font-size:7px;color:var(--gold)}.wostrip i{font-style:normal;flex:1;text-align:right;color:var(--t2)}.wostrip em{font-style:normal;color:var(--t3)}
.owt.wvt{background:var(--gold)!important;color:#1a1200!important}
.wol{display:flex;flex-direction:column;gap:4px;margin:10px 0}.wol>div{display:grid;grid-template-columns:22px 26px 1fr auto;gap:8px;align-items:center;padding:6px 8px;border-radius:6px;background:var(--card);font-size:6px}
.wol>div.me{border:2px solid var(--gold)}.wol b{font-weight:normal;color:var(--gold)}.wol small{font-size:5px;color:var(--t3)}.wol .av canvas{width:22px;height:22px}
.clm{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--edge);font-size:6px}.clm small{font-size:5px;color:var(--t3)}.clm button{font:inherit;font-size:5px;padding:5px 7px;border-radius:5px;border:1px solid var(--edge);background:none;color:var(--t2)}
/* trades */
.tdl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:center;padding:10px 12px;margin-bottom:10px;border:2px solid var(--blue);border-radius:10px;background:rgba(74,223,255,.07)}
.tdl span{font-size:5px;color:var(--t3)}.tdl b{grid-row:1/3;grid-column:2;text-align:right;font-weight:normal;font-size:12px;color:var(--blue)}.tdl i{font-style:normal;font-size:5px;color:var(--t2)}
.tdl.soon{border-color:var(--orange)}.tdl.soon b{color:var(--orange)}.tdl.past{border-color:#ff3b5c;opacity:.8}.tdl.past b{color:#ff3b5c}
.tmsel{display:grid;gap:8px;margin-bottom:10px}.tmsel small{display:block;font-size:5px;color:var(--t3);margin-bottom:5px}
.tmpick{display:flex;gap:5px;flex-wrap:wrap}.tmpick button{font:inherit;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 4px;border-radius:8px;border:2px solid var(--edge);background:var(--card);cursor:pointer;min-width:46px}
.tmpick button small{font-size:4px;color:var(--t2)}.tmpick button.on{border-color:var(--gold);background:rgba(255,217,61,.1)}.tmpick button.x{opacity:.3;pointer-events:none}.tmpick .av canvas{width:22px;height:22px}
.tmpick .clr{min-width:0;justify-content:center;color:var(--t3);font-size:7px}
.tmhint{font-size:6px;line-height:2;color:var(--t3);text-align:center;padding:16px;border:2px dashed var(--edge);border-radius:10px}
.tmcols{display:grid;gap:6px}.tmcols.c2{grid-template-columns:1fr 1fr}.tmcols.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.tmcol{border:2px solid var(--edge);border-radius:8px;background:#0a1124;padding:6px;max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
.tmh{display:flex;align-items:center;gap:6px;padding-bottom:5px;border-bottom:1px solid var(--edge);font-size:5.5px}.tmh b{font-weight:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tmh .av canvas{width:18px;height:18px}
.tmp{font:inherit;display:grid;grid-template-columns:22px minmax(0,1fr);gap:5px;align-items:center;padding:4px;border-radius:6px;border:2px solid transparent;background:none;color:var(--t1);cursor:pointer;text-align:left;position:relative}
.tmp .mini{width:22px;height:22px;border-radius:4px;overflow:hidden;background:var(--tc)}.tmp .mini img{width:100%;height:100%;object-fit:cover}
.tmp .tn{font-size:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tmp small{display:block;font-size:4px;color:var(--t3);margin-top:3px}
.tmp.go{border-color:var(--green);background:rgba(57,255,106,.08)}.tmp i{grid-column:1/3;font-style:normal;font-size:4.5px;color:var(--green)}
/* the machine: an arcade cabinet with chasing marquee lights */
.tmach{position:relative;margin:12px 0;padding:16px 12px 12px;border:3px solid #000;border-radius:14px;background:linear-gradient(180deg,#2a0f4a,#0b0420);box-shadow:0 0 0 2px #b36bff,0 0 22px rgba(179,107,255,.35)}
.tmach::before{content:'';position:absolute;inset:5px;border-radius:10px;pointer-events:none;background:radial-gradient(circle,#ffd93d 0 1.5px,transparent 2px) 0 0/10px 10px;-webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);padding:3px;opacity:.55;animation:chase 1s steps(2) infinite}
@keyframes chase{50%{background-position:5px 0}}
.tmt{text-align:center;font-size:10px;color:#fff;text-shadow:0 0 8px #b36bff,2px 2px 0 #5a1aa8;margin-bottom:12px;letter-spacing:.06em}
.tmrows{display:flex;flex-direction:column;gap:7px}
.tmr{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 8px;border-radius:8px;background:rgba(0,0,0,.35);border:1px solid rgba(179,107,255,.35)}
.tmr .av canvas{width:22px;height:22px}.tmr .get small{display:block;font-size:4.5px;color:#c9a2ff;margin-bottom:4px}
.tmr .chip{display:inline-block;font-size:5px;padding:2px 4px;margin:0 3px 3px 0;border-radius:3px;background:#3a1a6a;color:#fff}.tmr em{font-style:normal;font-size:5px;color:var(--t3)}
.tmr>b{font-weight:normal;font-size:9px;text-align:right}.tmr>b small{display:block;font-size:4px;color:var(--t3)}.tmr>b.up{color:var(--green)}.tmr>b.dn{color:#ff6b81}
.tmw{font-size:5.5px;color:#ff6b81;margin-top:8px;text-align:center}
.lever{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:12px;font:inherit;font-size:7px;padding:11px;border-radius:10px;border:3px solid #000;background:linear-gradient(180deg,#ffd93d,#f5a400);color:#1a1200;cursor:pointer;box-shadow:0 4px 0 #8a5a00}
.lever i{width:10px;height:22px;border-radius:5px;background:#c4122f;box-shadow:inset 0 -6px 0 #7a0016;transform-origin:50% 100%;transition:transform .3s}
.lever:active i,.tmach.spin .lever i{transform:rotate(40deg)}.lever.off{filter:grayscale(1);opacity:.55;cursor:default}
.tmach.spin .tmr{animation:tmspin .18s steps(2) 6}
@keyframes tmspin{50%{transform:translateY(-3px);filter:brightness(1.5)}}
.trl{display:flex;flex-direction:column;gap:8px}
.trc{padding:10px;border:2px solid var(--edge);border-radius:10px;background:var(--card)}.trc.review{border-color:var(--gold)}.trc.done{border-color:var(--green)}.trc.vetoed,.trc.declined{opacity:.7}
.trs{display:flex;align-items:center;gap:3px;margin-bottom:8px}.trs span{font-size:4.2px;color:var(--t3);padding:3px 4px;border-radius:3px;border:1px solid var(--edge)}.trs span.on{color:#000;background:var(--green);border-color:var(--green)}.trs span.cur{box-shadow:0 0 6px var(--green)}.trs em{flex:1;height:1px;background:var(--edge)}
.leg{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:4px 0;font-size:5.5px}.leg b{font-weight:normal}.leg>span:not(.av){font-size:4.5px;color:var(--t3)}.leg i{font-style:normal;font-size:5px;padding:2px 4px;border-radius:3px;background:#1a2547}.leg .av canvas{width:18px;height:18px}
.veto{display:grid;grid-template-columns:1fr auto;gap:6px 8px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed var(--edge)}
.veto>span{font-size:5px;color:var(--t3)}.veto .vd{display:flex;gap:3px}.veto .vd i{width:12px;height:6px;border-radius:2px;background:#1a2547}.veto .vd i.on{background:#ff3b5c}
.veto>b{font-weight:normal;font-size:5.5px;color:#ff6b81}.veto button{grid-row:1/3;grid-column:2;font:inherit;font-size:6px;padding:7px 10px;border-radius:6px;border:2px solid #ff3b5c;background:none;color:#ff6b81;cursor:pointer}.veto button.on{background:#ff3b5c;color:#fff}
.veto .vd{grid-column:1}.veto>b{grid-column:1}
.trx{font-size:6px;color:#ff6b81;margin-top:6px}.trok{font-size:6px;color:var(--green);margin-top:6px}
.trprev{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:4.5px;color:var(--t3)}.trprev button{font:inherit;font-size:5px;padding:5px 7px;border-radius:5px;border:1px dashed var(--t3);background:none;color:var(--t2);cursor:pointer}
.tmrule{font-size:5px;line-height:1.9;color:var(--t3);text-align:center;margin:12px 0 4px}
</style>`);
