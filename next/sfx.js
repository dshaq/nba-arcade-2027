/* NBA Arcade · NEXT · sound effects.
   Every sound is synthesized in the browser (Web Audio): no audio files. These are Dave's picks from the Sound Lab (Nov 24).
   Settings → Sound Effects turns them on/off and sets the volume. Phones only allow sound after the first tap. */
(function(){
let AC=null, OUT=null;
const on = () => S.snd !== false;
const vol = () => (S.sndVol==null ? .6 : +S.sndVol);
function ac(){ if(!on()) return null;
  try{ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); OUT=AC.createGain(); const comp=AC.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=3; OUT.connect(comp); comp.connect(AC.destination); }
    OUT.gain.value=vol(); if(AC.state==='suspended') AC.resume(); return AC; }catch(e){ return null; } }
const NOTE={F3:175,A3:220,C4:262,E4:330,G4:392,C5:523,E5:659,G5:784,A5:880,B5:988,C6:1047,D6:1175,E6:1319,G6:1568,A6:1760,C7:2093};
const hz=n=>typeof n==='number'?n:NOTE[n];
function tone(f,{t=0,d=.08,type='square',v=.06,a=.002,f2=null,lp=null}={}){ const c=ac(); if(!c) return; const T=c.currentTime+t;
  const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(hz(f),T); if(f2) o.frequency.exponentialRampToValueAtTime(hz(f2),T+d);
  g.gain.setValueAtTime(0,T); g.gain.linearRampToValueAtTime(v,T+a); g.gain.setValueAtTime(v,T+d*.6); g.gain.exponentialRampToValueAtTime(.0001,T+d);
  let n=o; if(lp){ const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=lp; o.connect(fl); n=fl; } n.connect(g); g.connect(OUT); o.start(T); o.stop(T+d+.03); }
let NB=null;
function noise({t=0,d=.1,v=.15,type='bandpass',f=2000,f2=null,q=1}={}){ const c=ac(); if(!c) return; const T=c.currentTime+t;
  if(!NB){ NB=c.createBuffer(1,c.sampleRate,c.sampleRate); const x=NB.getChannelData(0); let s=7; for(let i=0;i<x.length;i++){ s=(s*16807)%2147483647; x[i]=s/1073741823-1; } }
  const src=c.createBufferSource(); src.buffer=NB; src.loop=true; const fl=c.createBiquadFilter(); fl.type=type; fl.Q.value=q; fl.frequency.setValueAtTime(f,T); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,T+d);
  const g=c.createGain(); g.gain.setValueAtTime(0,T); g.gain.linearRampToValueAtTime(v,T+.004); g.gain.exponentialRampToValueAtTime(.0001,T+d); src.connect(fl); fl.connect(g); g.connect(OUT); src.start(T,(T*7.3)%.5); src.stop(T+d+.03); }
const arp=(notes,{step=.06,d=.08,type='square',v=.05,t=0}={})=>notes.forEach((n,i)=>tone(n,{t:t+i*step,d,type,v}));

/* Dave's picks */
const SND={
  tap:      ()=>tone(1320,{d:.03,v:.035}),                                                            // Button tap A
  tab:      ()=>{ tone('A5',{d:.04,v:.04}); tone('E6',{t:.05,d:.05,v:.04}); },                       // Tab switch A
  back:     ()=>tone(660,{f2:330,d:.09,v:.045}),                                                       // Back / close A
  nope:     ()=>tone(140,{d:.18,type:'sawtooth',v:.05,lp:800}),                                        // Not allowed B
  blip:     ()=>tone(1046,{d:.018,v:.025}),                                                            // Typewriter blip A
  box:      ()=>arp(['C6','G6'],{step:.04,d:.05,v:.04}),                                               // Text box opens A
  lock:     ()=>{ tone(220,{f2:880,d:.12,v:.05}); tone('A5',{t:.12,d:.08,v:.05}); },                  // Lock in your pick A
  win:      ()=>{ arp(['G5','C6'],{step:.09,d:.1,v:.05}); tone('E6',{t:.2,d:.5,type:'triangle',v:.09}); }, // You called it B
  miss:     ()=>tone(400,{f2:70,d:.6,v:.06}),                                                          // You missed B
  live:     ()=>{ tone('G5',{d:.07,v:.04}); tone('G5',{t:.14,d:.07,v:.04}); },                        // LIVE marquee A
  tick:     ()=>tone(1760,{d:.012,v:.03}),                                                             // Count-up tick B
  land:     ()=>{ tone('C6',{d:.5,type:'sine',v:.12}); tone(1047*2.76,{d:.2,type:'sine',v:.03}); },   // Count-up lands A
  saved:    ()=>{ tone('B5',{d:.07,v:.06}); tone('E6',{t:.07,d:.3,v:.06}); },                         // Line-up saved A
  leader:   ()=>{ arp(['C5','E5','G5','C6'],{step:.08,d:.12,v:.05}); tone('G6',{t:.36,d:.6,type:'triangle',v:.08}); }, // New leader A
  lift:     ()=>tone(300,{f2:600,d:.07,type:'triangle',v:.12}),                                        // Card lifts A
  swap:     ()=>{ tone('E5',{d:.04,v:.04}); tone('A5',{t:.05,d:.06,v:.04}); },                        // Swap lands B
  vs:       ()=>{ tone(80,{f2:1600,d:.5,type:'sine',v:.06}); tone('C6',{t:.45,d:.15,v:.05}); },       // VS splash B
  rip:      ()=>noise({d:.35,f:800,f2:5000,v:.2,q:.7}),                                                // Pack rip B
  flip:     ()=>tone(500,{f2:1000,d:.06,type:'triangle',v:.1}),                                        // Card flip B
  newcard:  ()=>{ for(let i=0;i<6;i++) tone(['C6','E6','G6','A6','C7'][i%5],{t:i*.04,d:.5,type:'sine',v:.05}); }, // New card! A
  dupe:     ()=>{ tone('B5',{d:.07,v:.05}); tone('E6',{t:.07,d:.25,v:.05}); },                        // Duplicate A
  levelup:  ()=>{ arp(['G4','C5','E5','G5'],{step:.08,d:.12,v:.05}); arp(['C6','E6','G6'],{t:.36,step:.06,d:.3,type:'triangle',v:.06}); }, // Level up B
  evolve:   ()=>{ tone(120,{f2:1200,d:1.1,type:'sawtooth',v:.05,lp:2500}); noise({d:1.1,f:300,f2:4000,v:.12}); tone(90,{t:1.1,f2:40,d:.6,type:'sine',v:.45}); for(let i=0;i<8;i++) tone(['C6','E6','G6','C7'][i%4],{t:1.12+i*.05,d:.5,type:'sine',v:.05}); }, // Evolve A
  check:    ()=>{ tone('B5',{d:.07,v:.06}); tone('E6',{t:.07,d:.3,v:.06}); },                        // Item checked A
  ring:     ()=>{ arp(['G5','C6','E6','G6'],{step:.09,d:.16,v:.05}); tone('C7',{t:.4,d:.8,type:'sine',v:.08}); }, // Ring full B
  gift:     ()=>{ noise({d:.25,f:500,f2:4000,v:.12}); for(let i=0;i<6;i++) tone(['C6','D6','E6','G6','A6','C7'][i],{t:.2+i*.04,d:.5,type:'sine',v:.05}); }, // Gift opens A
};
let lastSpecific=0;
window.SFX = (k)=>{ if(!on()||!SND[k]) return; lastSpecific=performance.now(); try{ SND[k](); }catch(e){} };

/* ── generic taps: tab / back / tap, unless something more specific played for the same tap ── */
document.addEventListener('pointerdown', e=>{ const b=e.target.closest('button[disabled],.btn[disabled]'); if(b) SFX('nope'); }, true);
document.addEventListener('click', e=>{
  const b=e.target.closest('button,a.go,.ibtn,[onclick],select'); if(!b || b.disabled || b.closest('.stage .rc16')) return;
  const t0=performance.now();
  const kind = b.matches('.mtabs button,.dstrip button,.fpt button,.thm button,.tsz button,.tabs button') ? 'tab'
    : (b.matches('.pbx,.x,.back,#no,[aria-label=Close]') || /^(✕|×|CLOSE|CANCEL|NOT YET|◀)$/i.test((b.textContent||'').trim())) ? 'back' : 'tap';
  setTimeout(()=>{ if(lastSpecific>=t0) return; SFX(kind); }, 0);
}, true);
document.addEventListener('change', e=>{ if(e.target.closest('.stdd')) SFX('tab'); }, true);

/* ── wrap game moments ── */
const wrap=(name, fn)=>{ const orig=window[name]; if(typeof orig!=='function') return; window[name]=function(...a){ return fn(orig, this, a); }; };
wrap('duelPick', (o,t,a)=>{ const was=!!S.done.duel; const r=o.apply(t,a); if(!was && S.done.duel) SFX('lock'); return r; });
wrap('complete', (o,t,a)=>{ const k=a[0], was=!!S.done[k]; const r=o.apply(t,a);
  if(!was && S.done[k]){ setTimeout(()=>SFX(doneCount()===MIS().length?'ring':'check'), k==='duel'?260:0); } return r; });
wrap('claim', (o,t,a)=>{ SFX('gift'); return o.apply(t,a); });
wrap('vsSplash', (o,t,a)=>{ const r=o.apply(t,a); SFX('vs'); return r; });
wrap('typewrite', (o,t,a)=>{ const [el,text,speed=22]=a; if(!el) return o.apply(t,a); SFX('box'); clearInterval(el._sfx); let i=0;
  el._sfx=setInterval(()=>{ if(!el.isConnected||i>=String(text).length){ clearInterval(el._sfx); return; } if(text[i]!==' ' && i%2===0 && document.visibilityState==='visible') SND.blip&&on()&&SND.blip(); i++; }, speed);
  return o.apply(t,a); });
wrap('cSave', (o,t,a)=>{ const r=o.apply(t,a); const yes=document.querySelector('.ov #yes, #yes'); yes?.addEventListener('click',()=>SFX('saved'),{once:true}); return r; });
wrap('hsAfter', (o,t,a)=>{ const fresh=S.hsSeen!==TODAY, prev=S.hsPrev?.order?.[0]; const r=o.apply(t,a);
  if(fresh && document.getElementById('hs')){ const rows=document.querySelectorAll('#hs .r'); rows.forEach((_,i)=>{ for(let k=0;k<12;k++) setTimeout(()=>SFX('tick'),400+i*650+k*(40+k*6)); setTimeout(()=>SFX('land'),400+i*650+620); });
    try{ const lead=cEntries().slice().sort((x,y)=>x.rank-y.rank)[0]; if(lead?.me && prev && prev!==lead.m) setTimeout(()=>SFX('leader'),400+rows.length*650+300); }catch(e){} }
  return r; });
if(typeof keep==='function'){ const k0=keep; keep=function(...a){ SFX('rip'); return k0.apply(this,a); }; }

/* ── things that show up on screen: duel results, LIVE, pack reveals, level-ups ── */
const seen=new WeakSet();
new MutationObserver(muts=>{ for(const m of muts){
  if(m.type==='childList') for(const n of m.addedNodes){ if(n.nodeType!==1) continue;
    const ys=n.matches?.('.dsplash')?n:n.querySelector?.('.dsplash'); if(ys && !seen.has(ys)){ seen.add(ys); const r=ys.querySelector('.yres'); if(r?.classList.contains('ok')) setTimeout(()=>SFX('win'),500); else if(r?.classList.contains('bad')) setTimeout(()=>SFX('miss'),500); }
    const lv=n.matches?.('.pxlv,.lvup')?n:n.querySelector?.('.pxlv,.lvup'); if(lv && !seen.has(lv)){ seen.add(lv); SFX('levelup'); }
    const mq=n.matches?.('.livemq')?n:n.querySelector?.('.livemq'); if(mq && S.lvSnd!==TODAY){ S.lvSnd=TODAY; save(); SFX('live'); }
  }
  const rn=(m.target.nodeType===1?m.target:m.target.parentElement)?.closest?.('.revname');
  if(rn){ const t=rn.textContent; if(/NEW CARD/.test(t) && rn._s!==t){ rn._s=t; SFX('newcard'); } else if(/DUPLICATE/.test(t) && rn._s!==t){ rn._s=t; SFX('dupe'); } }
} }).observe(document.getElementById('app')||document.body,{childList:true,subtree:true,characterData:true});
document.addEventListener('click', e=>{ if(e.target.closest('.po .stack')) SFX('flip'); }, true);
})();
