/* THE ИЛЬЮХА: ORIGINAL RETRO SOUND EFFECTS / NO MUSIC */
(()=>{'use strict';
let ctx=null,enabled=true,last=null,lastStory=null;
try{enabled=localStorage.getItem('ilyuha-sfx')!=='0'}catch(e){}
const Audio=window.AudioContext||window.webkitAudioContext;
function unlock(){if(!Audio)return;try{if(!ctx)ctx=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch(e){}}
function note(f,d=.1,delay=0,type='square',vol=.045,to=0){
 if(!enabled||!ctx||ctx.state!=='running')return;
 const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(35,to),t+d);
 g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);
 o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.02);
}
function play(k){
 switch(k){
 case 'tap':note(500,.04,0,'square',.017);break;
 case 'stand':note(180,.10,0,'triangle',.055,95);note(390,.06,.10);break;
 case 'buy':note(440,.07,0,'triangle',.03);note(650,.08,.075,'triangle',.035);break;
 case 'sale':note(560,.07);note(740,.10,.09,'triangle');note(1050,.13,.19,'triangle');break;
 case 'miss':note(220,.23,0,'sawtooth',.04,70);break;
 case 'arrest':[590,740,990].forEach((n,i)=>note(n,.14,i*.13,'square',.035));break;
 case 'fire':note(330,.17,0,'sawtooth',.06,130);note(180,.28,.17,'sawtooth',.045,70);break;
 case 'alarm':[810,530,810].forEach((n,i)=>note(n,.15,i*.2));break;
 case 'win':[520,660,780,1040].forEach((n,i)=>note(n,.18,i*.15,'triangle'));break;
 case 'lose':[380,280,180].forEach((n,i)=>note(n,.2,i*.18,'triangle'));break;
 }}
function save(on){enabled=!!on;try{localStorage.setItem('ilyuha-sfx',enabled?'1':'0')}catch(e){};unlock();controls();if(enabled)play('tap')}
function controls(){
 let bar=document.querySelector('#mainMenu .mmTools');
 if(bar&&!document.getElementById('ilyuhaSoundButton')){
  let b=document.createElement('button');b.type='button';b.id='ilyuhaSoundButton';b.className='mmTool';
  b.addEventListener('click',e=>{e.stopPropagation();save(!enabled)});
  bar.insertBefore(b,bar.firstChild);
 }
 let panel=document.getElementById('mmSettingsPanel');
 if(panel&&!document.getElementById('ilyuhaSoundCheck')){
  const l=document.createElement('label');l.className='mmCheck';
  l.innerHTML='<input type="checkbox" id="ilyuhaSoundCheck"> ЗВУКОВЫЕ ЭФФЕКТЫ';
  panel.insertBefore(l,panel.querySelector('[data-mm-back]'));
  l.querySelector('input').addEventListener('change',e=>save(e.target.checked));
 }
 let b=document.getElementById('ilyuhaSoundButton');
 if(b){b.textContent=enabled?'♫':'×';b.title=enabled?'Звуки включены':'Звуки выключены';b.setAttribute('aria-label',b.title)}
 let c=document.getElementById('ilyuhaSoundCheck');if(c)c.checked=enabled;
}
document.addEventListener('pointerdown',unlock,{passive:true});
document.addEventListener('keydown',unlock,{passive:true});
document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('#ilyuhaSoundButton'))play('tap')},true);
function tick(){
 const api=window.POSMTEST;if(!api?.getState)return;
 try{
 let s=api.getState(),story=api.getStoryState?.();
 let now={score:s.score,sales:s.sales,lost:s.lost,catches:s.thiefCatches,
 fired:s.firedMerchants,money:s.money,posm:new Set((s.posm||[]).map(p=>p.id))};
 if(last&&s.running){
  if(s.thiefCatches>last.catches)play('arrest');
  if(s.firedMerchants>last.fired)play('fire');
  if(s.sales>last.sales)play('sale');
  if(s.lost>last.lost)play('miss');
  if([...now.posm].some(id=>!last.posm.has(id)))play('stand');
  if(s.money<last.money&&now.posm.size===last.posm.size&&s.firedMerchants===last.fired)play('buy');
 }
 if(story&&lastStory){
  if(!lastStory.lunchTriggered&&story.lunchTriggered)play('alarm');
  if(!lastStory.lunchFinalPlayed&&story.lunchFinalPlayed)play(story.lunchTotalEarned>=1200?'win':'lose');
 }
 last=now;lastStory=story;
 }catch(e){} // Never interfere with game logic.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',controls,{once:true});else controls();
setInterval(tick,220);window.IlyuhaSFX={play,save,get enabled(){return enabled}};
})();