(() => {'use strict';
const W=1024,H=1152,cv=document.getElementById('game'),ctx=cv.getContext('2d');
const $=id=>document.getElementById(id),rand=(a,b)=>a+Math.random()*(b-a),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const files={bg:'assets/bg.webp',ul:'assets/ul.png',dl:'assets/dl.png',ur:'assets/ur.png',dr:'assets/dr.png',tea:'assets/tea.png',tea2:'assets/tea2.png',lemon:'assets/lemon.png',gold:'assets/gold.png',sugar:'assets/sugar.png',coffee:'assets/coffee.png',head:'assets/head.png',kettleSprite:'assets/kettleSprite.png',employeeSprite:'assets/employeeSprite.png'};
const images={};
const lanes={
 ul:{from:[109,261],to:[314,362],sprite:[206,368,1.04],side:1,floor:1048},
 dl:{from:[105,671],to:[288,762],sprite:[196,564,1.12],side:1,floor:1048},
 ur:{from:[920,263],to:[786,346],sprite:[415,372,1.04],side:-1,floor:1048},
 dr:{from:[918,666],to:[814,760],sprite:[469,562,1.12],side:-1,floor:1048}
};
const groups=['ul','dl','ur','dr'];
let phase='loading',score=0,paceScore=0,lives=3,best=0,elapsed=0,spawnClock=1.4,items=[],particles=[],pose='dl',selectedLane='dl',selTime=0,toast='',toastTime=0,streak=0,spawnIndex=0,clock=0,soundOn=true,level=1,startLevel=1;
let last=0,audioCtx=null,feedbackPulse=0,nextLifeScore=100,popup1upTime=0,popup1upText='1 UP!';
// Dedicated 8-bit background song. Sound effects still use the existing oscillator.
const soundtrack = new Audio('assets/vstolovkuda8bit.mp3');
soundtrack.loop = true;
soundtrack.preload = 'none';
let musicVolume=.35,sfxVolume=.85;
try{
 const saved=JSON.parse(localStorage.getItem('krymskiy-tea-audio-v1')||'null');
 if(saved){const m=Number(saved.music),e=Number(saved.effects);
   if(Number.isFinite(m))musicVolume=clamp(m,0,1);
   if(Number.isFinite(e))sfxVolume=clamp(e,0,1);}
}catch(_e){}
soundtrack.volume=musicVolume;
function saveVolumes(){try{localStorage.setItem('krymskiy-tea-audio-v1',JSON.stringify({music:musicVolume,effects:sfxVolume}))}catch(_e){}}
function syncSoundtrack(){
  if(soundOn && musicVolume>0 && phase === 'playing' && !document.hidden){
    const promise = soundtrack.play();
    if(promise && typeof promise.catch === 'function'){
      promise.catch(err=>{
        // An audio file that has not yet been published must never block gameplay.
        if(err?.name !== 'NotAllowedError' && err?.name !== 'NotSupportedError'){
          console.warn('Крымский чай: фоновая музыка недоступна',err);
        }
      });
    }
  }else{
    soundtrack.pause();
  }
}
let pauseAction='resume';
let panelReveal=0,panelTarget=0;
let kettleState='hidden',kettleTimer=0,employeeState='none',employeeProgress=0;
let employeeBubble='',employeeBubbleTimer=0,employeeMood='neutral';
let levelBannerTime=0;
const WIN_SCORE=400, FINAL_WARNING_SCORE=300;
let finalWarningShown=false,finalWarningTime=0,finaleTriggered=false;
const PANEL={h:182,pad:18};
const kettleRect={x:W-215,y:H-170,w:158,h:145};
const PLAYER_SCALE=1.12;
 const BOIL_SECONDS=20,REFILL_SECONDS=7,COLLEAGUE_SECONDS=6;
 const FRUSTRATED_LINES=['БЛИН, ОПЯТЬ МИМО!','НУ ВОТ, ЧАЙ УШЁЛ!','ЭХ, ПЕРЕХВАТИЛИ...','ДА ЧТО Ж ТАКОЕ!'];
 function pick(a){return a[Math.floor(Math.random()*a.length)]}
 // Offscreen pixel canvas for a sharper, more recognizable kettle silhouette.
 const kettlePixels=document.createElement('canvas');kettlePixels.width=52;kettlePixels.height=44;
 const kp=kettlePixels.getContext('2d',{alpha:true});
try{best=Number(localStorage.getItem('krymskiy-tea-highscore')||0)||0}catch(_e){}
// Continuous difficulty curve: +0.6x per 100 points until 300.
// Final 300–400 points ease to +0.2x per 100: 300=2.8x, 350=2.9x, 400=3.0x.
// No discontinuity at 100 or 300, no slowdown from kettle penalties.
// HUD multiplier remains the actual item-movement multiplier.
function speed(){const p=Math.max(0,paceScore); return p<=300 ? 1+.006*p : 2.8+.002*(p-300);}
function itemDuration(){return Math.max(.43,3.05/speed())}
// Spawn intensity accelerates slightly faster than movement at very high speed.
function itemInterval(){return Math.max(.32,1.95/Math.pow(speed(),1.18))}
function hud(){ $('score').textContent=score; $('speed').textContent='×'+speed().toFixed(1); $('lives').innerHTML='♥'.repeat(lives)+'<i>'+'♡'.repeat(Math.max(0,5-lives))+'</i>'; }
function noise(f=540,d=.12,kind='square'){if(!soundOn||sfxVolume<=0)return;try{audioCtx ||=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;o.type=kind;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(70,f*.62),now+d);g.gain.setValueAtTime(.085*sfxVolume,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+d)}catch(e){}}
function showDialog(title,message,note,b1='▶ ПРОДОЛЖИТЬ'){ $('dialogTitle').textContent=title; $('dialogText').textContent=message; $('dialogNote').textContent=note; $('startBtn').textContent=b1; $('overlay').hidden=false; }
function showStartDialog(){ showDialog('КРЫМСКИЙ ЧАЙ','Лови чайные пакетики, избегай кофе и сахара. Собери 400 очков, чтобы победить!','Нажимай на нужный из четырёх секторов экрана.','▶ НАЧАТЬ ИГРУ'); }
function hideDialog(){$('overlay').hidden=true}
function setPhase(x){phase=x;$('pauseBtn').disabled=!(x==='playing'||x==='paused');$('pauseBtn').textContent=x==='paused'?'▶ ПРОДОЛЖИТЬ':'Ⅱ ПАУЗА';syncSoundtrack();}
function saveBest(){try{if(score>best){best=score;localStorage.setItem('krymskiy-tea-highscore',String(score))}}catch(_e){}}
function reset(){
   hideFinale(); finalWarningShown=false; finalWarningTime=0; finaleTriggered=false;
   startLevel=1; level=1;
   score=0; paceScore=0; lives=3; nextLifeScore=100;
  elapsed=0;spawnClock=1.2;items=[];particles=[];pose='dl';selectedLane='dl';selTime=0;toast='';toastTime=0;streak=0;spawnIndex=0;clock=0;feedbackPulse=0;popup1upTime=0;panelReveal=0;panelTarget=0;levelBannerTime=0;
  kettleState='hidden'; kettleTimer=0; employeeState='none'; employeeProgress=0; employeeBubble=''; employeeBubbleTimer=0; employeeMood='neutral';
  hud(); hideDialog(); setPhase('playing'); noise(650,.13);

}

function hideFinale(){
 const e=$('finaleOverlay'),f=$('finaleFrame');
 e.hidden=true; $('finaleControls').hidden=true;
 if(f.getAttribute('src')!=='about:blank') f.setAttribute('src','about:blank');
 document.body.classList.remove('finale-playing');
}
function startFinale(){
 if(finaleTriggered)return;
 finaleTriggered=true;
 try{window.parent.OLDfagProgress?.recordArcadeWin('tea');}catch(e){}
 saveBest();
 setPhase('victory');hideDialog();
 const e=$('finaleOverlay'),f=$('finaleFrame');
 $('finaleControls').hidden=true;
 e.hidden=false;document.body.classList.add('finale-playing');
 f.setAttribute('src','finale/play.html');
}
window.addEventListener('message',ev=>{
 if(ev.source!==$('finaleFrame').contentWindow)return;
 if(ev.data?.type==='krymskiy-finale-complete')$('finaleControls').hidden=false;
});
$('finaleAgain').addEventListener('click',reset);

$('finaleReplay').addEventListener('click',()=>{
 $('finaleControls').hidden=true;
 $('finaleFrame').setAttribute('src','about:blank');
 $('finaleFrame').setAttribute('src','finale/play.html');
});
$('finaleSkip').addEventListener('click',()=>{
 $('finaleControls').hidden=false;
 $('finaleFrame').contentWindow?.postMessage({type:'krymskiy-finale-skip'},'*');
});


function setPose(lane){if(phase!=='playing')return;selectedLane=lane;pose=lane;selTime=.25;feedbackPulse=.23;noise(380,.038,'triangle')}
function spawner(){
 const lane=groups[Math.floor(Math.random()*4)];
 const hazardChance=Math.min(.29,.16+score*.0012);
 const r=Math.random();let type;
 if(r<hazardChance)type=Math.random()<.5?'sugar':'coffee';
 else if(r<hazardChance+.055)type='lemon';
 else if(r<hazardChance+.075)type='gold';
 else type=Math.random()<.5?'tea':'tea2';
 if(items.some(it=>it.lane===lane && it.progress<.23))return false;
 items.push({id:spawnIndex++,lane,type,progress:0,duration:itemDuration(),phase:Math.random()*6.28,rot:rand(-.4,.4),state:'roll',x:0,y:0,vy:0});
 return true;
}
function pop(x,y,color,n){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),s=rand(35,135);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.26,.68),age:0,color});}}
// Popup and bonus particles appear at Maxim's chest, following his current pose.
function maxChest(){
  const sp=lanes[pose].sprite, im=images[pose];
  if(!im) return {x:W/2,y:690};
  const scale=sp[2]||PLAYER_SCALE,w=im.width*scale,h=im.height*scale;
  const sx=sp[0],sy=sp[1]-(h-im.height)+20;
  return {x:sx+w*.57,y:sy+h*(pose.startsWith('u')?.41:.44)};
}
function grant1Up(){
  if(lives<5){
    lives++;popup1upTime=1.3;popup1upText='1 UP!';toast='ДОП. ЖИЗНЬ!';toastTime=.85;
    noise(980,.22,'triangle');const p=maxChest();pop(p.x,p.y,'#ffd95c',22);
  }
}
function addScore(amount,x,y,toastMsg){
  score+=amount;saveBest();
  paceScore=Math.max(paceScore,score);
  while(score>=nextLifeScore){ grant1Up(); nextLifeScore+=100; }
  hud();
  if(!finalWarningShown && paceScore>=FINAL_WARNING_SCORE && level>=2){
    finalWarningShown=true;finalWarningTime=2.7;
    toast='ПОСЛЕДНИЙ ЛИТР!';toastTime=1.3;
    noise(920,.12,'triangle');
  }
  if(score>=WIN_SCORE && phase==='playing'){
    startFinale(); return;
  }
  if(toastMsg){toast=toastMsg; toastTime=1.0;}
  if(x!=null&&y!=null)pop(x,y,amount>=20?'#7ef2f3':amount>0?'#8efec2':'#ff6b7f', amount>=20?18:14);
}
function earn(type,x,y){const gain=type==='gold'?5:type==='lemon'?2:1; streak++; addScore(gain,x,y, type==='gold'?'ЗОЛОТАЯ ЗАВАРКА! +5':type==='lemon'?'ЛИМОНЧИК! +2':streak>=5?'КРЕПЧЕ НЕКУДА!':'ЕЩЁ ПАКЕТИК!'); feedbackPulse=.4; noise(type==='gold'?900:type==='lemon'?680:515,.17,'triangle');}
function loseLife(msg,x,y){lives--;streak=0;hud();toast=msg;toastTime=1.05;feedbackPulse=.65;pop(x,y,'#ff5f7d',23);noise(180,.30,'sawtooth');if(lives<=0){saveBest();setPhase('over');showDialog('ЗАВАРКА ЗАКОНЧИЛАСЬ',`Счёт: ${score}. Лучший результат: ${Math.max(best,score)}. Максим отправляется за новой пачкой чая.`, 'Начать новую игру?','↻ ЕЩЁ РАЗ');pauseAction='gameover';}}
function resolveCaught(it){ const lane=lanes[it.lane],x=lane.to[0],y=lane.to[1]; if(['tea','tea2','gold','lemon'].includes(it.type))earn(it.type,x,y); else loseLife(it.type==='coffee'?'КОФЕ В ЧАЕ?!':'САХАР?! НИ ЗА ЧТО!',x,y); }
function resolveFloor(it){ const lane=lanes[it.lane],x=it.x||lane.to[0],y=lane.floor; if(['tea','tea2','gold'].includes(it.type))loseLife('ПАКЕТИК УПУЩЕН!',x,y); else {pop(x,y,it.type==='lemon'?'#ffd76b':'#b8c1d1',it.type==='lemon'?9:5);streak=0;} }
function activateLevel2(){ if(level>=2)return; level=2;panelTarget=1;kettleState='ready';employeeState='none';employeeProgress=0;levelBannerTime=2;toast='УРОВЕНЬ 2: КИПЯТОК!';toastTime=1.4;noise(790,.15,'triangle');}
function handleKettleTap(){
  if(level<2 || panelReveal<.8) return false;
  if(kettleState==='ready'){
    kettleState='boiling'; kettleTimer=BOIL_SECONDS; toast='ЧАЙНИК ВКЛЮЧЁН'; toastTime=.75; noise(520,.08,'triangle');
    return true;
  }
  if(kettleState==='boiled'){
    addScore(20,kettleRect.x+70,kettleRect.y+55,'КИПЯТОК ТВОЙ! +20');
    kettleState='cooldown'; kettleTimer=REFILL_SECONDS;
    if(employeeState==='walking'){
      employeeState='return'; employeeMood='angry'; employeeBubble=pick(FRUSTRATED_LINES); employeeBubbleTimer=1.9;
      toast=employeeBubble; toastTime=1.0;
      noise(210,.18,'sawtooth'); setTimeout(()=>noise(170,.14,'sawtooth'),80);
    } else {
      employeeState='none'; employeeMood='neutral';
    }
    noise(880,.22,'triangle');
    return true;
  }
  return false;
}
function updateKettle(dt){
  panelReveal += (panelTarget-panelReveal)*Math.min(1,dt*4);
  employeeBubbleTimer=Math.max(0,employeeBubbleTimer-dt);
  if(employeeBubbleTimer<=0 && employeeState==='none') employeeBubble='';
  if(level<2 || phase!=='playing') return;
  if(kettleState==='boiling'){
    kettleTimer-=dt;
    if(kettleTimer<=0){
      kettleState='boiled'; kettleTimer=0; employeeState='walking'; employeeProgress=0; employeeMood='neutral'; employeeBubble='';
      toast='ЧАЙНИК ВСКИПЕЛ!'; toastTime=.8; noise(760,.16,'triangle');
    }
  } else if(kettleState==='boiled'){
    if(employeeState==='walking'){
      employeeProgress += dt/COLLEAGUE_SECONDS;
      if(employeeProgress>=1){
        employeeProgress=1;
        addScore(-20,kettleRect.x+20,kettleRect.y+50,'КОЛЛЕГА СЛИЛ КИПЯТОК! -20');
        if(score<0)score=0; hud(); kettleState='cooldown'; kettleTimer=REFILL_SECONDS;
        employeeState='return'; employeeMood='satisfied'; employeeBubble='О, НОРМ, УСПЕЛ!'; employeeBubbleTimer=1.2;
        noise(150,.35,'sawtooth');
      }
    }
  } else if(kettleState==='cooldown'){
    kettleTimer-=dt;
    if(employeeState==='return'){
      employeeProgress -= dt/2.3;
      if(employeeProgress<=0){ employeeProgress=0; employeeState='none'; employeeMood='neutral'; if(employeeBubbleTimer<=0)employeeBubble=''; }
    }
    if(kettleTimer<=0){ kettleState='ready'; kettleTimer=0; }
  }
 }
function update(dt){
 clock+=dt;finalWarningTime=Math.max(0,finalWarningTime-dt);feedbackPulse=Math.max(0,feedbackPulse-dt);selTime=Math.max(0,selTime-dt);toastTime=Math.max(0,toastTime-dt);popup1upTime=Math.max(0,popup1upTime-dt); levelBannerTime=Math.max(0,levelBannerTime-dt); updateKettle(dt);
 if(phase!=='playing')return;
  elapsed+=dt;
  spawnClock-=dt;
 if(spawnClock<=0){if(spawner())spawnClock=itemInterval()*rand(.89,1.13);else spawnClock=.22;}
 for(const it of items){
   const lane=lanes[it.lane];
   if(it.state==='roll'){
     it.progress+=dt/it.duration;
     if(it.progress>=1){
       if(it.lane===selectedLane){it.done=true;resolveCaught(it);if(phase==='over')break;}
       else {it.state='fall';it.progress=1;it.x=lane.to[0];it.y=lane.to[1];it.vy=110;}
     }
   }else if(it.state==='fall'){
     it.vy+=1180*dt; it.y+=it.vy*dt; it.x+=(lane.side*8)*dt; it.phase += dt*9*lane.side;
     if(it.y>=lane.floor){it.y=lane.floor;it.done=true;resolveFloor(it);if(phase==='over')break;}
   }
 }
 items=items.filter(it=>!it.done);
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=95*dt;}
 particles=particles.filter(p=>p.age<p.life);
 if(score>=100 && level===1) activateLevel2();
}
function drawItem(it){ const lane=lanes[it.lane]; let x,y,spinFactor; if(it.state==='fall'){x=it.x;y=it.y;spinFactor=1.1;} else { const t=Math.min(1,it.progress); x=lane.from[0]+(lane.to[0]-lane.from[0])*t; y=lane.from[1]+(lane.to[1]-lane.from[1])*t+Math.sin(t*Math.PI)*-7; spinFactor=t*2.75; } let k=it.type==='tea2'?'tea2':it.type; const im=images[k]; if(!im)return; const w=it.type==='gold'?92:it.type==='lemon'?70:it.type==='sugar'?61:it.type==='coffee'?67:80; const h=w*im.height/im.width; const ang=it.phase+(spinFactor*Math.PI)*lane.side; ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=9;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore(); }
 // Pixel-art kettle and employee are drawn procedurally to keep the prototype fully self-contained.
 function paintKettlePixels(){
   kp.clearRect(0,0,52,44);
   function px(x,y,w,h,c){kp.fillStyle=c;kp.fillRect(x,y,w,h)}
   const hot=kettleState==='boiling',boiled=kettleState==='boiled',cool=kettleState==='cooldown';
   const signal=hot?'#ff5c4f':boiled?'#6cff95':cool?'#53c7f7':'#89a2bc';
   const glow=hot?'rgba(255,86,76,.18)':boiled?'rgba(110,255,145,.16)':'rgba(120,170,220,.08)';
   px(7,7,35,28,glow); px(10,4,29,34,glow);
   // Spout and lid: closer to the original electric kettle silhouette.
   px(5,15,7,3,'#b7c9d4'); px(2,16,4,2,'#d7e3e8'); px(9,18,4,2,'#8196a8');
   px(20,2,8,3,'#1d2740'); px(17,4,14,2,'#e4d897'); px(16,6,16,2,'#2b3651');
   // Curved handle on the right.
   px(39,9,5,3,'#d7e2e6'); px(42,12,4,16,'#d7e2e6'); px(39,28,6,3,'#839ab0');
   px(39,13,3,14,'#152033');
   // Main glass body with a slight belly.
   px(12,9,26,3,'#dae1e2');
   px(10,12,29,3,'#334960');
   px(9,15,30,17,'#20334d');
   px(10,16,28,15,'#a9c2cf');
   px(11,17,26,13,'#527896');
   px(12,18,3,10,'#bfe3eb'); px(34,18,2,10,'#d4e3e9');
   // Water fill.
   const fill=cool?Math.max(0,1-kettleTimer/REFILL_SECONDS)*.78:.78;
   const waterRows=Math.floor(13*fill);
   if(waterRows>0){
     const wy=30-waterRows;
     px(13,wy,21,waterRows,hot?'#5a90ad':boiled?'#49a8a4':'#3f7fae');
     px(13,wy,21,1,hot?'#ffaba0':boiled?'#c9ffcf':'#a9def4');
     px(14,wy+1,2,Math.max(0,waterRows-2),'#d8f6ff');
     const bubbles=hot?12:boiled?5:cool?3:1;
     for(let i=0;i<bubbles;i++){
       const bx=16+((i*5)%15), span=Math.max(1,waterRows-1);
       const by=29-((Math.floor(clock*(hot?8:3))+i*3)%span);
       if(by>=wy && by<30)px(bx,by,i%3===0?2:1,i%4===0?2:1,'#edfefe');
     }
   }
   // Body outline and metallic base.
   px(9,15,1,16,'#edf2f4'); px(38,15,1,16,'#7086a1');
   px(9,31,30,4,'#172337'); px(12,32,24,1,'#7b91a8'); px(13,34,22,1,signal);
   px(17,35,12,2,signal); px(10,36,28,2,'#6f8295');
   // Steam only while heating.
   if(hot){
     const s=Math.floor(clock*4)%4;
     px(13,4+s,2,2,'#ffab91'); px(31,5+((s+1)%4),2,2,'#ffab91');
   }
 }
 function drawEmployeeSprite(x,y,dir='right',mood='neutral'){
   const step=Math.sin(clock*10 + employeeProgress*12*(dir==='right'?1:-1));
   const bob=Math.abs(Math.sin(clock*10 + employeeProgress*12))*3;
   const sx=x, sy=y-bob;
   ctx.save();
   ctx.imageSmoothingEnabled=false;
   ctx.translate(sx,sy);
   if(dir==='left'){ ctx.scale(-1,1); }
   function px(ax,ay,w,h,c){ ctx.fillStyle=c; ctx.fillRect(ax,ay,w,h); }
   // shadowed half-body sprite
   px(18,44,20,2,'rgba(0,0,0,.18)');
   // head and hair
   px(15,6,16,12,'#f0c8a2'); px(14,5,18,5,'#5e4334'); px(15,9,3,2,'#4b3427'); px(28,9,2,2,'#4b3427');
   px(20,13,2,2,'#1c1c1c'); px(25,13,2,2,'#1c1c1c');
   px(21,16,5,1,mood==='angry'?'#5b2d2d':'#92553f');
   if(mood==='angry'){ px(18,11,4,1,'#2c1a16'); px(24,11,4,1,'#2c1a16'); }
   // neck + torso
   px(20,18,5,3,'#d6b08f');
   px(13,21,20,16,'#4b74a6'); px(16,22,14,14,'#6e96c8');
   px(21,21,4,15,'#f2efe6'); px(21,25,4,4,'#c84545');
   // hips small, keeping the character "up to the waist"
   px(16,37,14,4,'#2a4563');
   // walking arms
   const armShift=Math.round(step*2);
   // back arm swings
   px(11,23+Math.max(0,armShift),4,11,'#d3a580'); px(10,22+Math.max(0,armShift),4,4,'#4b74a6');
   // front arm with mug
   px(32,23+Math.max(0,-armShift),4,10,'#d3a580'); px(31,22+Math.max(0,-armShift),4,4,'#4b74a6');
   px(35,28+Math.max(0,-armShift),7,7,'#ffffff'); px(41,29+Math.max(0,-armShift),2,4,'#cfd7e5');
   px(36,29+Math.max(0,-armShift),5,2,'#dfe7f0');
   // tiny legs hint below waist for walking feeling
   px(18,41,4,6,'#2d3f56'); px(24,41,4,6,'#2d3f56');
   px(17,46+(step>0?1:0),5,2,'#52382f'); px(24,46+(step<0?1:0),5,2,'#52382f');
   ctx.restore();
 }
 function drawSpeechBubble(x,y,text){
   if(!text) return;
   ctx.save();
   ctx.font='bold 12px monospace';
   const pad=9, tw=Math.min(210,ctx.measureText(text).width+pad*2), th=28;
   const bx=clamp(x-tw/2,8,W-tw-8), by=y-th-18;
   ctx.fillStyle='rgba(12,18,31,.92)'; ctx.strokeStyle='#f3d17f'; ctx.lineWidth=2;
   if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(bx,by,tw,th,8); ctx.fill(); ctx.stroke(); }
   else { ctx.fillRect(bx,by,tw,th); ctx.strokeRect(bx,by,tw,th); }
   ctx.beginPath(); ctx.moveTo(x-6,by+th); ctx.lineTo(x+2,by+th); ctx.lineTo(x-2,by+th+7); ctx.closePath(); ctx.fill(); ctx.stroke();
   ctx.fillStyle='#fff6d0'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,bx+tw/2,by+th/2+1);
   ctx.restore();
 }
 
function drawLamp(x,y,color,on,label){
  ctx.save();
  ctx.globalAlpha=on?1:.25;
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#0b1220'; ctx.lineWidth=2; ctx.stroke();
  if(on){ ctx.globalAlpha=.35; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(x-2,y-2,3,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=.8; ctx.fillStyle='#c8d6e3'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText(label,x,y+20);
  ctx.restore();
}
function drawKettleWater(kx,ky,kw,kh,fill,hot,boiled){
  const gx=kx+17, gy=ky+42, gw=70, gh=82;
  ctx.save();
  const waterTop=gy + gh*(1-fill);
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(gx,gy,gw,gh,6); ctx.clip(); }
  else { ctx.beginPath(); ctx.rect(gx,gy,gw,gh); ctx.clip(); }
  ctx.fillStyle=hot?'rgba(114,180,220,.70)':boiled?'rgba(125,230,170,.65)':'rgba(132,188,236,.58)';
  ctx.fillRect(gx,waterTop,gw,gy+gh-waterTop);
  ctx.fillStyle=hot?'rgba(255,120,110,.55)':boiled?'rgba(185,255,205,.72)':'rgba(220,242,255,.45)';
  ctx.fillRect(gx,waterTop,gw,3);
  const bubbles=hot?10:boiled?4:2;
  for(let i=0;i<bubbles;i++){
    const bx=gx+8+((i*13)%Math.max(20,gw-18));
    const travel=Math.max(8,(gy+gh-waterTop)-8);
    const by=gy+gh-6-((Math.floor(clock*(hot?14:4))+i*9)%travel);
    const br=i%3===0?3:2;
    if(by>waterTop+2){ctx.fillStyle='rgba(240,250,255,.92)'; ctx.fillRect(bx,by,br,br);}
  }
  ctx.restore();
}
function drawDigitalTimer(x,y,txt){
  ctx.save();
  ctx.fillStyle='#101724'; ctx.fillRect(x,y,92,26);
  ctx.strokeStyle='#5e738c'; ctx.lineWidth=2; ctx.strokeRect(x,y,92,26);
  ctx.fillStyle='#92ffa6'; ctx.font='bold 16px monospace'; ctx.textAlign='center'; ctx.fillText(txt,x+46,y+18);
  ctx.restore();
}
function drawKettlePanel(){
   if(panelReveal<.02) return;
   const h=PANEL.h*panelReveal,y=H-h;
   ctx.save();ctx.globalAlpha=Math.max(.2,panelReveal);
   ctx.fillStyle='rgba(10,17,33,.93)';ctx.fillRect(0,y,W,h);
   ctx.fillStyle='#c69b62';ctx.fillRect(0,y,W,3);
   ctx.textAlign='left';ctx.globalAlpha=.95;
   ctx.fillStyle='#e5f7ff';ctx.font='bold 22px monospace';ctx.fillText('ЧАЙНИК',24,y+33);
   let status='ГОТОВ';if(kettleState==='boiling')status='КИПИТ...';else if(kettleState==='boiled')status='ВСКИПЕЛ!';else if(kettleState==='cooldown')status='НАПОЛНЯЕТСЯ';
   ctx.font='bold 17px monospace';ctx.fillStyle=kettleState==='boiling'?'#ff988c':kettleState==='boiled'?'#90ffa4':'#a9c6db';ctx.fillText(status,24,y+59);
   let prog=1;
   if(kettleState==='boiling')prog=1-kettleTimer/BOIL_SECONDS;
   else if(kettleState==='cooldown')prog=1-kettleTimer/REFILL_SECONDS;
   ctx.fillStyle='#24314c';ctx.fillRect(22,y+69,240,20);
   ctx.fillStyle=kettleState==='boiled'?'#7cf38e':kettleState==='boiling'?'#ff655a':'#6cc4ff';
   ctx.fillRect(24,y+71,236*clamp(prog,0,1),16);
   ctx.strokeStyle='#7b8ea7';ctx.lineWidth=2;ctx.strokeRect(22,y+69,240,20);
   let detail='ТАПНИ ПО ЧАЙНИКУ →';
   let timerTxt='READY';
   if(kettleState==='boiling'){detail=`ДО ГОТОВНОСТИ: ${Math.ceil(kettleTimer)} С`; timerTxt=`${String(Math.ceil(kettleTimer)).padStart(2,'0')} S`;}
   else if(kettleState==='boiled'){detail=`КОЛЛЕГА ИДЁТ! ${Math.ceil((1-employeeProgress)*COLLEAGUE_SECONDS)} С`; timerTxt=`${String(Math.ceil((1-employeeProgress)*COLLEAGUE_SECONDS)).padStart(2,'0')} S`;}
   else if(kettleState==='cooldown'){detail=`НАПОЛНЕНИЕ: ${Math.ceil(kettleTimer)} С`; timerTxt=`${String(Math.ceil(kettleTimer)).padStart(2,'0')} S`;}
   ctx.fillStyle='#e1e8ed';ctx.font='bold 16px monospace';ctx.fillText(detail,22,y+118);
   
   // colleague sprite with pseudo walking motion and reduced scale so it doesn't cover Maxim
   if(kettleState==='boiled'||employeeState==='walking'||employeeState==='return'){
     const goingBack=employeeState==='return';
     const baseX=48, endX=kettleRect.x-176;
     let ex=baseX+(endX-baseX)*employeeProgress;
     const stepPhase=clock*10 + employeeProgress*18;
     ex += Math.sin(stepPhase)*2.5;
     const bob=Math.abs(Math.sin(stepPhase))*4;
     const ew=92, eh=140, ey=H-eh-8-bob;
     if(images.employeeSprite){
       ctx.save();
       ctx.imageSmoothingEnabled=false;
       ctx.translate(ex+ew/2,ey+eh/2);
       if(goingBack) ctx.scale(-1,1);
       ctx.rotate(Math.sin(stepPhase)*0.015);
       ctx.drawImage(images.employeeSprite,-ew/2,-eh/2,ew,eh);
       ctx.restore();
     }
     ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(ex+ew/2,H-18,30,6,0,0,Math.PI*2);ctx.fill();
     if(employeeBubbleTimer>0 && employeeBubble) drawSpeechBubble(ex+ew/2,ey+10,employeeBubble);
   }
   // kettle asset
   const kx=kettleRect.x-4,ky=y-2,kw=139,kh=163;
   ctx.fillStyle='#111c32';ctx.fillRect(kx-8,ky+8,kw+14,kh-10);
   ctx.fillStyle='#536983';ctx.fillRect(kx-8,ky+8,kw+14,3);
   const fill=kettleState==='cooldown'?Math.max(0,1-kettleTimer/REFILL_SECONDS)*.78:.78;
   const hot=kettleState==='boiling',boiled=kettleState==='boiled';
   if(images.kettleSprite){
      ctx.save(); ctx.imageSmoothingEnabled=false; ctx.drawImage(images.kettleSprite,kx,ky,kw,kh); ctx.restore();
      drawKettleWater(kx,ky,kw,kh,fill,hot,boiled);
   }
   drawLamp(kx+12,ky+137,'#ff534d',kettleState==='boiling','RED');
   drawLamp(kx+38,ky+137,'#66ff87',kettleState==='boiled' || kettleState==='ready','GRN');
   drawDigitalTimer(kx-92,ky+96,timerTxt);
   ctx.fillStyle='#dfefff';ctx.font='bold 14px monospace';ctx.textAlign='center';
   ctx.fillText(kettleState==='ready'?'▶ ВКЛЮЧИТЬ':kettleState==='boiled'?'▶ ЗАБРАТЬ +20':kettleState==='boiling'?'НАГРЕВ 20 СЕК.':'НАПОЛНЕНИЕ',kx+kw/2,ky+kh+6);
   ctx.restore();
 }
function draw1Up(){
  if(popup1upTime<=0) return;
  const p=maxChest(),x=p.x,y=p.y-18+Math.sin((1.3-popup1upTime)*8)*3;
  ctx.save();ctx.globalAlpha=Math.min(1,popup1upTime/.3);
  ctx.fillStyle='rgba(8,14,28,.88)';ctx.strokeStyle='#ffd96a';ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(x-120,y-38,240,76,16);ctx.fill();ctx.stroke();
  if(images.head)ctx.drawImage(images.head,x-102,y-30,60,60);
  ctx.fillStyle='#fff2a6';ctx.font='bold 28px Verdana';ctx.textAlign='left';
  ctx.fillText('1 UP!',x-8,y+9);ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,H); if(images.bg)ctx.drawImage(images.bg,0,0,1024,1152,0,0,W,H); else {ctx.fillStyle='#57433a';ctx.fillRect(0,0,W,H)}
 if(phase==='playing'||phase==='paused'||phase==='over'||phase==='ready'){
   const l=lanes[selectedLane]; ctx.save(); ctx.globalAlpha=.14+Math.sin(clock*7)*.06; ctx.strokeStyle='#72ffca'; ctx.lineWidth=8; ctx.beginPath(); ctx.ellipse(l.to[0],l.to[1],70,22,0,0,2*Math.PI); ctx.stroke(); ctx.restore();
   const im=images[pose]; if(im){ const sp=lanes[pose].sprite; const scale=sp[2]||PLAYER_SCALE; const w=im.width*scale,h=im.height*scale; const x=sp[0],y=sp[1]-(h-im.height)+20; ctx.save(); ctx.shadowColor='#0008'; ctx.shadowBlur=8; ctx.drawImage(im,x,y,w,h); ctx.restore(); }
   for(const it of items)drawItem(it);
   for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,1-p.age/p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x-4,p.y-4,8,8);ctx.restore();}
   drawKettlePanel();
   if(toastTime>0){ctx.save();ctx.textAlign='center';ctx.font='bold 32px monospace';ctx.lineWidth=7;ctx.strokeStyle='#16152b';ctx.fillStyle=(toast.includes('УПУЩЕН')||toast.includes('КОФЕ')||toast.includes('САХАР')||toast.includes('-20'))?'#ff818a':'#fff6a9';ctx.strokeText(toast,W/2,1060);ctx.fillText(toast,W/2,1060);ctx.restore();}
   if(levelBannerTime>0){ctx.save();const a=Math.min(1,levelBannerTime/.25);ctx.globalAlpha=Math.min(1,levelBannerTime/.4);ctx.fillStyle='rgba(6,12,24,.82)';ctx.fillRect(200,465,624,96);ctx.strokeStyle='#ffe280';ctx.lineWidth=3;ctx.strokeRect(200,465,624,96);ctx.fillStyle='#ffe280';ctx.textAlign='center';ctx.font='bold 20px Verdana';ctx.fillText('УРОВЕНЬ 2',512,503);ctx.font='bold 30px Verdana';ctx.fillText('БИТВА ЗА КИПЯТОК',512,540);ctx.restore();}
   draw1Up();
   if(finalWarningTime>0 && phase==='playing'){
     const life=2.7-finalWarningTime;
     const alpha=Math.min(1,life*5,finalWarningTime*2);
     const shake=life<.35?Math.sin(life*47)*5:0;
     ctx.save();ctx.globalAlpha=Math.max(0,alpha);
     ctx.translate(W/2+shake,445);
     const scale=1+.07*Math.sin(life*12)*Math.exp(-life*1.7);
     ctx.scale(scale,scale);
     ctx.textAlign='center';ctx.font='900 62px monospace';
     ctx.lineWidth=16;ctx.lineJoin='round';ctx.strokeStyle='#1b1535';
     ctx.fillStyle='#ffe36b';ctx.shadowColor='#ff6528';ctx.shadowBlur=20;
     ctx.strokeText('ПОСЛЕДНИЙ ЛИТР!',0,0);ctx.fillText('ПОСЛЕДНИЙ ЛИТР!',0,0);
     ctx.restore();
   }
 }
}
function frame(ts){if(!last)last=ts;const dt=Math.min(.06,Math.max(0,(ts-last)/1000));last=ts;update(dt);draw();requestAnimationFrame(frame)}
function pointer(ev){ if(phase!=='playing')return; ev.preventDefault(); const rect=cv.getBoundingClientRect(),x=(ev.clientX-rect.left)*W/rect.width,y=(ev.clientY-rect.top)*H/rect.height; const currentPanelY=H-PANEL.h*panelReveal; if(level>=2 && panelReveal>.65 && x>=kettleRect.x-10 && x<=kettleRect.x+kettleRect.w+10 && y>=currentPanelY+4 && y<=H-8){ handleKettleTap(); return; } if(y<95)return; setPose((y<632?'u':'d')+(x<W/2?'l':'r')); }
$('gameArea').addEventListener('pointerdown',pointer,{passive:false});
window.addEventListener('keydown',ev=>{ if(phase!=='playing')return; const m={'1':'ul','2':'ur','3':'dl','4':'dr','q':'ul','w':'ur','a':'dl','s':'dr','ArrowUp':selectedLane.endsWith('l')?'ul':'ur','ArrowDown':selectedLane.endsWith('l')?'dl':'dr','ArrowLeft':selectedLane.startsWith('u')?'ul':'dl','ArrowRight':selectedLane.startsWith('u')?'ur':'dr'}; if(m[ev.key]){ev.preventDefault();setPose(m[ev.key]); return;} if((ev.key===' '||ev.key==='Enter') && level>=2){ handleKettleTap(); }});
$('startBtn').addEventListener('click',()=>{if(phase==='paused'){setPhase('playing');hideDialog();return;}reset();});
$('pauseBtn').addEventListener('click',()=>{ if(phase==='playing'){ setPhase('paused'); pauseAction='resume'; showDialog('ПАУЗА','Максим решил немного остудить чай.','Нажми, чтобы продолжить ловлю.','▶ ПРОДОЛЖИТЬ'); } else if(phase==='paused'){ setPhase('playing'); hideDialog(); }});
$('restartBtn').addEventListener('click',reset);
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent='♪ ЗВУК: '+(soundOn?'ВКЛ':'ВЫКЛ');syncSoundtrack();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing'){$('pauseBtn').click()}syncSoundtrack();});
window.addEventListener('pagehide',()=>soundtrack.pause());
window.KrymskiyTeaAndroid={
 isReady:()=>!['loading','error'].includes(phase),
 getPhase:()=>phase,
 start:()=>{if(['loading','error'].includes(phase))return false;reset();return true;},
 getBest:()=>Math.max(best,score),
 getVolumes:()=>({music:musicVolume,effects:sfxVolume}),
 setVolumes:(music,effects)=>{
   const m=Number(music),e=Number(effects);
   if(Number.isFinite(m))musicVolume=clamp(m,0,1);
   if(Number.isFinite(e))sfxVolume=clamp(e,0,1);
   soundtrack.volume=musicVolume;saveVolumes();syncSoundtrack();
 }
};
Promise.all(Object.entries(files).map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve()};im.onerror=()=>reject(new Error('Не загрузилось изображение: '+url));im.src=url;}))).then(()=>{ setPhase('ready'); showStartDialog();window.dispatchEvent(new Event('tea-game-ready')); }).catch(err=>{setPhase('error');showDialog('ОШИБКА ЗАГРУЗКИ',err.message,'Попробуй открыть автономную HTML-версию.','↻ ПЕРЕЗАГРУЗИТЬ');$('startBtn').onclick=()=>location.reload();});
hud(); requestAnimationFrame(frame);
})();
