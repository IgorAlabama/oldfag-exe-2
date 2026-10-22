(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
const stage=$('stage'),overlay=$('overlay'),title=$('modalTitle'),modalText=$('modalText'),play=$('play'),status=$('status');
let W=960,H=540,worldW=1630,cam=0,shake=0,flash=0;
const IM={};
let phase='loading',last=0,gameTime=0,p=null,enemies=[],hitFx=[],keys=new Set(),finger=null,attackQueued=false,pausedFrom='playing';
let spawnTimer=0,regularKills=0,spawnedTrashCount=0,potions=[],potionDropTimer=0;
let bossSpawned=false,bossDefeated=false,bossRef=null,fatality=null,victoryReady=false;
let currentStage='street',stageKey='stage';
let finalCutscene=null,fireworks=[],victoryFireTimer=.28,lives=3,maxLives=3,finisherSfx=null;
const OFFICE_TOTAL=13, OFFICE_BAGS=7, OFFICE_TRASH=6, BAG_HP=64, BAG_SCALE=.84, PREPACK_SCALE=.58;
const STORE_TOTAL=13, STORE_PREPACKS=7, STORE_BAGS=6, PREPACK_GRUNT_SCALE=.39, PREPACK_GRUNT_HP=78;
let officeSpawnQueue=[],officeSpawned=0,officeKills=0,officeBagKills=0,officeTrashKills=0,shots=[],officeCleared=false,officeBulletInvuln=0;
let storeSpawnQueue=[],storeSpawned=0,storeKills=0,storeBagKills=0,storePrepackKills=0,storeCleared=false;
let walrus=null;
const WALRUS_GROUND_HP=190,WALRUS_AIR_HP=190, WALRUS_SCALE=.44;
// Boss joins ordinary enemies after 5 defeated; one of the 3 active-enemy slots is reserved for him.
const STORE_BOSS_KILL_THRESHOLD=5;

let audioCtx=null,soundOn=true;
let uidCounter=1;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const HERO_SCALE=.726, TRASH_SCALE=1.0, BOSS_SCALE=.64;
const STORE_HERO_SCALE=HERO_SCALE*1.15, STORE_WALRUS_SCALE=WALRUS_SCALE*1.15;
const WALRUS_PLATFORM_DRAW_BASE=188, WALRUS_PLATFORM_AIR_BOTTOM=344, WALRUS_PLATFORM_GROUND_BOTTOM=462, WALRUS_PLATFORM_TRANSITION=1.15;
const WALRUS_DEATH_DURATION=2.9, WALRUS_DEATH_FRAME_DURS=[.36,.64,.72,.72,.46];
const REGULAR_TARGET=6, TRASH_HP=68, BOSS_HP=TRASH_HP*3, PREPACK_HP=TRASH_HP*3;
const MAX_REGULAR_ALIVE=3;
const RESPAWN_INVULN=2.15, RESPAWN_BLINK=2.15;

function beep(freq,duration,type='square',gain=.045,nextFreq=null){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(nextFreq)o.frequency.exponentialRampToValueAtTime(Math.max(nextFreq,1),t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.01);}catch(err){}}
function confirmBeep(){beep(540,.08,'square',.026,310)}
function hitBeep(crit){beep(crit?390:210,.16,'sawtooth',.055,crit?110:70);if(crit){setTimeout(()=>beep(960,.16,'square',.04,560),90)}}
function potionBeep(){beep(880,.07,'triangle',.032,1180);setTimeout(()=>beep(1180,.10,'triangle',.028,980),70)}
function bossWarnBeep(){beep(180,.18,'square',.06,90);setTimeout(()=>beep(140,.25,'sawtooth',.06,70),180)}
function heroGroundY(){return currentStage==='store'?451:(currentStage==='office'?447:448)}
function resetLives(count=3){lives=count;maxLives=count;}
function ensureFinisherAudio(){if(!finisherSfx){finisherSfx=new Audio(window.FIGHTER_FINISHER_AUDIO || 'assets/nani-hit.mp3');finisherSfx.preload='auto';}return finisherSfx;}
function pauseFinisherAudio(){try{if(finisherSfx){finisherSfx.pause();finisherSfx.currentTime=0;}}catch(err){}}
function maybePlayFinisherAudio(){const a=ensureFinisherAudio();if(!a)return 2.2;try{a.pause();a.currentTime=0;if(soundOn)a.play().catch(()=>{});}catch(err){}return (Number.isFinite(a.duration)&&a.duration>0)?Math.max(2.2,a.duration):12.46;}
function heroRespawnPosition(){return {x:clamp(cam+W*.5,120,worldW-120),y:heroGroundY()}}
function resize(){const r=stage.getBoundingClientRect();const a=(r.width&&r.height)?r.width/r.height:16/9;W=clamp(Math.round(H*a),640,1800);canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;if(p)cam=clamp(cam,0,Math.max(0,worldW-W));}
window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);resize();
function changePhase(next,headline='',body='',action=''){phase=next;if(['intro','won','lost','paused','loading','officePreview'].includes(phase)){overlay.hidden=false;if(headline)title.textContent=headline;if(body)modalText.textContent=body;if(action)play.textContent=action;play.disabled=phase==='loading';}else{overlay.hidden=true;}}
function setState(ent,s){if(ent.state!==s){ent.state=s;ent.anim=0;ent.attackHit=false;}}
function respawnPlayerAfterLifeLoss(){const sp=heroRespawnPosition();p.x=sp.x;p.y=sp.y;p.hp=p.maxHp;p.dir=1;p.cd=0;p.stun=0;p.blink=RESPAWN_BLINK;p.invuln=RESPAWN_INVULN;setState(p,'idle');shots=shots.filter(sh=>Math.abs(sh.x-p.x)>120||Math.abs(sh.y-p.y)>80);status.textContent=`Тимур потерял жизнь! Осталось жизней: ${lives}`;fx(p.x,p.y-170,'RESPAWN!','#8ff0ff',true);beep(330,.12,'triangle',.04,520);}
function activeEnemies(){return enemies.filter(e=>!e.deadBody)}
function liveEnemies(){return enemies.filter(e=>!e.deadBody && e.state!=='dead')}
function remainingOfficeEnemies(){return OFFICE_TOTAL-officeKills;}
function makeOfficeQueue(){
 // Mix of six bins and seven mascots; each arrives individually.
 const q=['bag','trash','bag','trash','bag','bag','trash','bag','trash','bag','trash','bag','trash'];
 return q;
}
function spawnBag(side){
 const fromLeft=side==='left';
 const e={id:uidCounter++,kind:'bag',x:outsideCameraX(side,260*BAG_SCALE),y:rand(currentStage==='store'?402:426,475),dir:fromLeft?1:-1,
  hp:BAG_HP,maxHp:BAG_HP,state:'idle',anim:0,cd:rand(1.0,1.8),stun:0,blink:0,attackHit:false,deadBody:false,
  hitDamage:10,attackRange:380,bodyScale:BAG_SCALE,shotLane:null};
 enemies.push(e);return e;
}
function spawnOfficeEnemy(){
 if(officeSpawned>=OFFICE_TOTAL) return;
 const kind=officeSpawnQueue[officeSpawned],side=(officeSpawned%2===0?'right':'left');
 if(kind==='bag') spawnBag(side); else spawnTrash(side);
 officeSpawned++;
 status.textContent=kind==='bag'?'Пятёрочка выходит на смену!':'Откуда в офисе ещё одна мусорка?!';
}

function makeStoreQueue(){
 // Seven melee display-stand golems and six ranged bags, interleaved.
 return ['prepackGrunt','bag','prepackGrunt','bag','prepackGrunt','bag','prepackGrunt','bag','prepackGrunt','bag','prepackGrunt','bag','prepackGrunt'];
}
function spawnStorePrepack(side){
 const fromLeft=side==='left';
 const e={id:uidCounter++,kind:'prepackGrunt',
  x:outsideCameraX(side,500*PREPACK_GRUNT_SCALE),y:rand(397,473),dir:fromLeft?1:-1,
  hp:PREPACK_GRUNT_HP,maxHp:PREPACK_GRUNT_HP,
  state:'idle',anim:0,cd:rand(.5,1.25),stun:0,blink:0,attackHit:false,
  deadBody:false,hitDamage:12,attackRange:106,bodyScale:PREPACK_GRUNT_SCALE};
 enemies.push(e);return e;
}
function spawnStoreEnemy(){
 if(bossDefeated)return;
 const side=storeSpawned%2===0?'right':'left';
 const kind=storeSpawned<STORE_TOTAL ? storeSpawnQueue[storeSpawned] : (storeSpawned%2===0?'prepackGrunt':'bag');
 if(kind==='bag') spawnBag(side); else spawnStorePrepack(side);
 storeSpawned++;
 status.textContent=kind==='bag'?'В магазин ворвалась Пятёрочка с леденцами!':'Препак спешит разобраться с Тимуром!';
}
function spawnWalrusBoss(testMode=false){
 if(currentStage!=='store'||bossSpawned)return null;
 bossSpawned=true; bossDefeated=false; storeCleared=false;
 const x=testMode?clamp(p.x+365,170,worldW-120):outsideCameraX('right',260);
 walrus={id:uidCounter++,kind:'walrusBoss',name:'МОРЖЕНАЛЬЕОСТЬ',x,y:445,dir:-1,
   hp:WALRUS_GROUND_HP,maxHp:WALRUS_GROUND_HP,mode:1,phase:'ground',
   state:'idle',anim:0,attackHit:false,cd:1,stun:0,blink:0,
   flightClock:0,aimX:x,laserHits:false,deadBody:false,bodyScale:1};
 enemies.push(walrus);bossRef=walrus;
 potionDropTimer=Math.min(potionDropTimer,3.2);
 bossWarnBeep();status.textContent='ФИНАЛЬНЫЙ БОСС — МОРЖЕНАЛЬЕОСТЬ! Первая фаза: наземный бой.';
 fx(Math.min(x,cam+W-110),270,'FINAL BOSS!','#ffd58c',true);
 return walrus;
}
function startWalrusSecondPhase(e){
 e.mode=2; e.phase='ascend';e.flightClock=0;
 e.hp=WALRUS_AIR_HP;e.maxHp=WALRUS_AIR_HP;e.stun=0;e.blink=0;
 e.cd=0;e.anim=0;e.attackHit=false;
 e.aimX=e.x;e.laserHits=false;
 potionDropTimer=Math.min(potionDropTimer,3.2);
 bossWarnBeep();fx(e.x,225,'PHASE 2!','#7eeeff',true);
 status.textContent='МОРЖ ВЗЛЕТЕЛ! Избегай луча, бей во время посадки.';
}
function startWalrusFinisher(e){
 if(finalCutscene)return;
 finalCutscene={boss:e,t:0,duration:maybePlayFinisherAudio(),stage:'windup'};
 p.cd=999;p.stun=999;p.blink=0;
 status.textContent='ФИНАЛЬНЫЙ УДАР ПО МОРЖУ!';
}
function beginWalrusDeath(e){
 e.hp=0;e.phase='deathFall';e.mode=2;e.state='dead';e.anim=0;e.flightClock=0;e.attackHit=false;e.deadBody=false;
 bossDefeated=true;walrus=e;shots=[];
 fx(e.x,e.y-185,'FINAL BOSS DOWN!','#ffe082',true);
 for(const foe of enemies){
   if(foe!==e && foe.state!=='dead' && !foe.deadBody){
     killEnemy(foe);
     fx(foe.x,foe.y-155,'СМЕТЁН БОССОМ!','#ffdb8c',true);
   }
 }
 status.textContent='Морженальеость повержена! Остальные враги рассыпались.';
 beep(720,.25,'triangle',.05,1040);
}
function finishWalrusBoss(e){beginWalrusDeath(e)}
function updateFinalCutscene(dt){
 if(!finalCutscene)return;
 finalCutscene.t+=dt;
 if(finalCutscene.t>=finalCutscene.duration){
   pauseFinisherAudio();
   const boss=finalCutscene.boss;
   finalCutscene=null;
   beginWalrusDeath(boss);
 }
}
function spawnFireworkBurst(){
 const x=rand(cam+70,cam+W-70), y=rand(55,205), colors=['#ffb05e','#7ee6ff','#ff77cc','#fff38c','#98ffb2'];
 for(let i=0;i<24;i++){
   const ang=Math.PI*2*(i/24)+rand(-.08,.08), sp=rand(70,195);
   fireworks.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:rand(.7,1.2),t:0,color:colors[i%colors.length]});
 }
}
function updateFireworks(dt){
 if(p?.state==='win'){victoryFireTimer-=dt;if(victoryFireTimer<=0){spawnFireworkBurst();victoryFireTimer=rand(.22,.48);}}
 for(const fw of fireworks){fw.t+=dt;fw.x+=fw.vx*dt;fw.y+=fw.vy*dt;fw.vy+=110*dt;}
 fireworks=fireworks.filter(fw=>fw.t<fw.life);
}
function finishStoreIfClear(){
 if(currentStage!=='store'||storeCleared||!bossDefeated)return;
 if(walrus&&walrus.phase==='deathFall'&&!walrus.deadBody)return;
 if(liveEnemies().length>0)return;
 storeCleared=true; shots=[];
 if(p.state!=='win' && !fatality){ setState(p,'win'); victoryFireTimer=.05; }
 status.textContent='Магазин очищен! Морженальеость повержена.';
 beep(640,.18,'triangle',.045,920);
}
function updateWalrusBoss(e,dt){
 if(e.phase==='dead')return;
 e.anim+=dt;e.stun=Math.max(0,e.stun-dt);e.blink=Math.max(0,e.blink-dt);
 e.cd=Math.max(0,e.cd-dt);e.flightClock+=dt;
 if(e.phase==='deathFall'){
   if(e.flightClock>=WALRUS_DEATH_DURATION){
     e.deadBody=true;
     if(!storeCleared){storeCleared=true;shots=[];setState(p,'win');p.cd=0;p.stun=0;victoryReady=false;victoryFireTimer=.05;status.textContent='Морженальеость повержена. Тимур празднует победу!';beep(590,.18,'triangle',.05,880);}
   }
   return;
 }
 const dx=p.x-e.x,dy=p.y-e.y;
 // v0.16.1: without this phase the boss was permanently stuck in ascend.
 // Flight transition lasts the same time as the visual platform animation.
 if(e.mode===2 && e.phase==='ascend'){
   if(e.flightClock>=WALRUS_PLATFORM_TRANSITION){
     e.phase='beamPrep';e.flightClock=0;e.y=292;
     setState(e,'idle');
     status.textContent='Морженальеость взлетел и готовит луч!';
   }
   return;
 }
 if(e.mode===1){
   if(e.state==='attack'){
     if(!e.attackHit && e.anim>=.44){e.attackHit=true;if(Math.abs(dx)<115&&Math.abs(dy)<78)hitPlayer({...e,dir:dx>0?1:-1});}
     if(e.anim>=.94){setState(e,'idle');e.cd=rand(1.0,1.35);}
   } else if(Math.abs(dx)<125 && Math.abs(dy)<86 && e.cd<=0){
     e.state='attack';e.anim=0;e.attackHit=false;
   } else {
     const speed=88;
     if(Math.abs(dx)>78){const dir=dx>0?1:-1; e.dir=dir; const pos=slideAlongFence(e,e.x+dir*speed*dt,e.y+Math.sign(dy)*Math.min(26,Math.abs(dy))*dt*.22); e.x=pos.x; e.y=pos.y; setState(e,'walk');}
     else if(Math.abs(dy)>48){const pos=slideAlongFence(e,e.x,e.y+Math.sign(dy)*56*dt); e.x=pos.x; e.y=pos.y; setState(e,'walk');}
     else setState(e,'idle');
   }
   return;
 }
 if(e.phase==='intro'){
   if(e.flightClock<1.35){e.x=worldW*.72+Math.sin(e.flightClock*6)*8; e.y=295+Math.cos(e.flightClock*5)*4;}
   else if(e.flightClock<3.0){setState(e,'idle'); e.phase='beamPrep'; e.flightClock=0; e.y=292; status.textContent='Морженальеость взлетает на платформе!';}
   return;
 }
 if(e.phase==='beamPrep'){
   e.x=clamp(e.x+(p.x-e.x)*Math.min(1,dt*.8),190,worldW-190);
   e.y=292+Math.sin(gameTime*5)*4;
   if(e.flightClock>=1.2){e.phase='charge'; e.flightClock=0; e.aimX=p.x; status.textContent='Морженальеость наводит прожарочный луч!';}
   return;
 }
 if(e.phase==='charge'){
   e.x=clamp(e.x+(e.aimX-e.x)*Math.min(1,dt*.55),190,worldW-190);
   e.y=292+Math.sin(gameTime*8)*3;
   if(e.flightClock>=1.0){e.phase='beam'; e.flightClock=0; e.laserHit=0; flash=Math.max(flash,.10); shake=Math.max(shake,7);}
   return;
 }
 if(e.phase==='beam'){
   e.y=292+Math.sin(gameTime*18)*2;
   if(Math.abs(p.x-e.aimX)<58)hitPlayer({kind:'walrusLaser',dir:p.x<e.aimX?-1:1});
   for(const foe of enemies){if(foe!==e && foe.state!=='dead' && !foe.deadBody && Math.abs(foe.x-e.aimX)<50){killEnemy(foe);fx(foe.x,foe.y-150,'ПОДЖАРЕН!','#ffdb74',true);}}
   if(e.flightClock>=1.0){e.phase='descend'; e.flightClock=0; status.textContent='Платформа Моржа идёт на посадку.';}
   return;
 }
 if(e.phase==='descend'){
   if(e.flightClock>=WALRUS_PLATFORM_TRANSITION){e.phase='landed'; e.flightClock=0; e.y=448; status.textContent='Морженальеость приземлилась — бей!';}
   return;
 }
 if(e.phase==='landed'){
   e.y=448;
   if(Math.abs(dx)<128 && Math.abs(dy)<76 && e.cd<=0){e.state='attack';e.anim=0;e.attackHit=false;e.cd=1.2;}
   else if(e.state==='attack'){
     if(!e.attackHit && e.anim>=.48){e.attackHit=true;if(Math.abs(dx)<130&&Math.abs(dy)<80)hitPlayer({...e,dir:dx>0?1:-1});}
     if(e.anim>=.92){setState(e,'idle');}
   }
   if(e.flightClock>=3.35){e.phase='takeoff'; e.flightClock=0; setState(e,'idle'); status.textContent='Морженальеость снова взлетает на платформу!';}
   return;
 }
 if(e.phase==='takeoff'){
   if(e.flightClock>=WALRUS_PLATFORM_TRANSITION){e.phase='beamPrep'; e.flightClock=0; e.y=294; e.aimX=e.x; setState(e,'idle');}
 }
}
function startStoreBossTest(){
 startStore(true);storeSpawned=STORE_TOTAL;storeKills=STORE_TOTAL;
 storeBagKills=STORE_BAGS;storePrepackKills=STORE_PREPACKS;
 enemies=[];shots=[];potions=[];p.x=clamp(280,90,worldW-90);p.y=448;p.hp=100;
 spawnWalrusBoss(true);
}

function spawnOfficeBoss(){
 if(bossSpawned) return;
 bossSpawned=true;
 const fromLeft=Math.random()<.5;
 const e={
   id:uidCounter++,kind:'prepackBoss',name:'ЧЕЛОВЕК ПРЕПАК',
   x:outsideCameraX(fromLeft?'left':'right',500*PREPACK_SCALE),
   y:430,dir:fromLeft?1:-1,
   hp:PREPACK_HP,maxHp:PREPACK_HP,
   state:'idle',anim:0,cd:.65,stun:0,blink:0,attackHit:false,
   deadBody:false,hitDamage:18,attackRange:132,bodyScale:PREPACK_SCALE
 };
 enemies.push(e);bossRef=e;
 potionDropTimer=Math.min(potionDropTimer,4.5);
 status.textContent='БОСС! На арену выходит ЧЕЛОВЕК ПРЕПАК!';
 bossWarnBeep();
 fx(e.x,e.y-245,'PREPACK BOSS','#ffcc66',true);
 return e;
}
function enemiesLeftCount(){
  if(currentStage==='store'){
    if(!bossSpawned) return Math.max(0,STORE_TOTAL-storeKills)+1;
    if(!bossDefeated) return Math.max(1,liveEnemies().filter(e=>e.kind!=='walrusBoss').length+1);
    return 0;
  }
  if(currentStage==='office'){
    let bossLeft=(officeSpawned>=OFFICE_TOTAL || bossSpawned) && !bossDefeated ? 1 : 0;
    return remainingOfficeEnemies()+bossLeft;
  }
  let leftRegular=Math.max(0,REGULAR_TARGET-regularKills);
  let bossLeft=bossDefeated?0:1;
  return leftRegular+bossLeft;
}

// Spawn relative to the current CAMERA rather than a fixed world edge.
// The entire sprite is initially outside the visible playing field and WALKS in.
function outsideCameraX(side, spriteWidth){
 const margin=spriteWidth/2+22;
 return side==='left' ? cam-margin : cam+W+margin;
}
function spawnTrash(side=null){
 if(currentStage==='street' && spawnedTrashCount>=REGULAR_TARGET) return null;
 side=side||((uidCounter%2===0)?'right':'left');
 const fromLeft=side==='left';
 const e={
   id:uidCounter++,kind:'trash',
   x:outsideCameraX(side,260*TRASH_SCALE),
   y:rand(currentStage==='office'?426:395,470),dir:fromLeft?1:-1,
   hp:TRASH_HP,maxHp:TRASH_HP,
   state:'idle',anim:0,cd:rand(.3,.9),stun:0,blink:0,attackHit:false,
   deadBody:false,hitDamage:12,attackRange:118,bodyScale:TRASH_SCALE
 };
 enemies.push(e);if(currentStage==='street') spawnedTrashCount++;return e;
}
function spawnBoss(){
 if(bossSpawned) return;
 bossSpawned=true;
 const fromLeft=Math.random()<.5;
 const e={
   id:uidCounter++,kind:'boss',name:'САП ФОРМА',
   x:outsideCameraX(fromLeft?'left':'right',500*BOSS_SCALE),
   y:430,dir:fromLeft?1:-1,
   hp:BOSS_HP,maxHp:BOSS_HP,
   state:'idle',anim:0,cd:.5,stun:0,blink:0,attackHit:false,
   deadBody:false,hitDamage:18,attackRange:128,bodyScale:BOSS_SCALE
 };
 enemies.push(e);bossRef=e;
 potionDropTimer=Math.min(potionDropTimer,4.5);
 status.textContent='БОСС! На арену выходит САП ФОРМА!';
 bossWarnBeep();
 fx(e.x,e.y-245,'BOSS APPEARS','#ffcc66',true);
 return e;
}
function start(){
 currentStage='street'; stageKey='stage';$('stageTag').textContent='STAGE 01 — ДВОР / УЛИЦА';worldW=H*IM.stage.naturalWidth/IM.stage.naturalHeight;
 resetLives(3);pauseFinisherAudio();finalCutscene=null;fireworks=[];victoryFireTimer=.28;
 p={x:200,y:448,dir:1,hp:100,maxHp:100,state:'idle',anim:0,cd:0,stun:0,blink:0,invuln:0};
 enemies=[]; hitFx=[]; potions=[]; shots=[]; spawnTimer=3.3; regularKills=0; spawnedTrashCount=0; bossSpawned=false; bossDefeated=false; bossRef=null; fatality=null;
 cam=0;shake=0;flash=0;attackQueued=false;keys.clear();finger=null;gameTime=0;victoryReady=false;$('next').hidden=true;$('next').textContent='В ОФИС';
 potionDropTimer=rand(5.5,8.5);
 spawnTrash('right');
 changePhase('playing');
 status.textContent='Во дворе начинается новый мусорный бунт…';
 confirmBeep();
}
function restart(){start()}
function startOffice(fromTest=false){
 currentStage='office'; stageKey='office';$('stageTag').textContent='STAGE 02 — ОФИС / ПРЕПАК';worldW=H*IM.office.naturalWidth/IM.office.naturalHeight;
 if(fromTest)resetLives(3);else lives=Math.max(1,lives||3);pauseFinisherAudio();finalCutscene=null;fireworks=[];victoryFireTimer=.28;
 p={x:220,y:447,dir:1,hp:fromTest?100:Math.max(75,p?.hp||100),maxHp:100,state:'idle',anim:0,cd:0,stun:0,blink:0,invuln:0};
 enemies=[]; hitFx=[]; shots=[]; potions=[]; spawnTimer=1.8; officeSpawned=0; officeKills=0; officeTrashKills=0; officeBagKills=0; officeSpawnQueue=makeOfficeQueue(); bossSpawned=false; bossDefeated=false; bossRef=null; fatality=null; victoryReady=false; officeCleared=false;
 cam=0; shake=0; flash=0; attackQueued=false; keys.clear(); finger=null; $('next').hidden=true; $('next').textContent='В МАГАЗИН';
 potionDropTimer=rand(6.0,9.0);
 if(fromTest){status.textContent='Тест офиса: полная волна из 6 мусорок и 7 стреляющих Пятёрочек, затем босс.';}
 else {status.textContent='Тимур ворвался в офис ПРЕПАКА.';}
 spawnOfficeEnemy();spawnTimer=2.8;
 changePhase('playing'); confirmBeep();
}
function startStore(fromTest=false){
 currentStage='store'; stageKey='store';$('stageTag').textContent='STAGE 03 — МАГАЗИН / МОРЖ';worldW=H*IM.store.naturalWidth/IM.store.naturalHeight;
 if(fromTest)resetLives(3);else lives=Math.max(1,lives||3);pauseFinisherAudio();finalCutscene=null;fireworks=[];victoryFireTimer=.28;
 p={x:205,y:451,dir:1,hp:fromTest?100:Math.max(75,p?.hp||100),maxHp:100,state:'idle',anim:0,cd:0,stun:0,blink:0,invuln:0};
 enemies=[]; hitFx=[]; shots=[]; potions=[]; spawnTimer=1.9; storeSpawned=0; storeKills=0; storeBagKills=0; storePrepackKills=0; storeSpawnQueue=makeStoreQueue(); bossSpawned=false; bossDefeated=false; bossRef=null; fatality=null; victoryReady=false; storeCleared=false; walrus=null;
 cam=0; shake=0; flash=0; attackQueued=false; keys.clear(); finger=null; $('next').hidden=true; $('next').textContent='ПОБЕДА!';
 potionDropTimer=rand(6.5,9.5);
 if(fromTest){status.textContent='Тест магазина: полная волна из 7 ПРЕПАКОВ и 6 Пятёрочек; Морж после 5 побед.';}
 else {status.textContent='Финальный уровень: магазин и Морженальеость.';}
 spawnStoreEnemy();spawnTimer=2.8;
 changePhase('playing'); confirmBeep();
}
function togglePause(){if(phase==='playing'){pausedFrom=phase;changePhase('paused','ПАУЗА','Тимур решил немного перевести дух.','ПРОДОЛЖИТЬ')}else if(phase==='paused'){changePhase('playing')}}
function tryAttack(){if(phase!=='playing'||!p||p.hp<=0||p.state==='win'||fatality||p.cd>0)return;setState(p,'attack');p.cd=.46;beep(165,.07,'square',.020,95);}
function killEnemy(e){
 if(e.state==='dead') return;
 setState(e,'dead'); e.anim=0; e.attackHit=false;
 if(currentStage==='store' && (e.kind==='prepackGrunt'||e.kind==='bag')){
   if(storeKills<STORE_TOTAL) storeKills++;
   if(e.kind==='bag'){ if(storeBagKills<STORE_BAGS)storeBagKills++; }
   else { if(storePrepackKills<STORE_PREPACKS)storePrepackKills++; }
   status.textContent=bossSpawned && !bossDefeated ? 'Магазин: босс на поле. Обычные враги будут идти, пока жив Морж!' : `Магазин: побеждено ${storeKills}/${STORE_TOTAL}`;
 } else if(currentStage==='office' && (e.kind==='trash'||e.kind==='bag')){
   officeKills++;
   if(e.kind==='trash')officeTrashKills++; else officeBagKills++;
   status.textContent=`Офис: побеждено ${officeKills}/${OFFICE_TOTAL}`;
 } else if(e.kind==='trash'){
   regularKills++;
   status.textContent=`Разгромлено мусорок: ${regularKills}/${REGULAR_TARGET}`;
 } else if(e.kind==='boss' || e.kind==='prepackBoss'){
   bossDefeated=true;
 }
}
function beginFatality(e){
 if(fatality||!(e.kind==='boss'||e.kind==='prepackBoss')) return;
 fatality={boss:e,t:0,hitDone:false};
 p.cd=999; p.stun=999;
 setState(p,'attack');
 status.textContent='Финальный удар по '+(e.name||'боссу')+'!';
 }
function hitEnemy(){
 const targets=[];
 for(const e of liveEnemies()){
   if(e.kind==='walrusBoss' && e.mode===2 && e.phase!=='landed')continue;
   const dx=e.x-p.x,dy=Math.abs(e.y-p.y);
   const range=(e.kind==='boss'||e.kind==='prepackBoss'||e.kind==='walrusBoss')?145:125;
   if(Math.abs(dx)<range&&dy<70&&dx*p.dir>-38) targets.push(e);
 }
 if(!targets.length) return;
 for(const e of targets){
   const dx=e.x-p.x;
   const critical=Math.random()<.24;
   let dmg=(e.kind==='boss'||e.kind==='prepackBoss'||e.kind==='walrusBoss')?(critical?28:18):(e.kind==='bag'?(critical?28:20):(e.kind==='prepackGrunt'?(critical?31:22):(critical?34:22)));
   e.hp=Math.max(0,e.hp-dmg);
   e.blink=.16; e.stun=(e.kind==='boss'||e.kind==='prepackBoss')?.22:.32;
   e.x=clamp(e.x+p.dir*(critical?((e.kind==='boss'||e.kind==='prepackBoss')?35:48):((e.kind==='boss'||e.kind==='prepackBoss')?18:24)),105,worldW-105);
   e.dir=dx>=0?1:-1;
   shake=Math.max(shake,critical?13:6); flash=Math.max(flash,critical?.09:.035);
   hitBeep(critical);
   fx(e.x,e.y-((e.kind==='boss'||e.kind==='prepackBoss')?235:e.kind==='bag'?176:190),critical?'CRITICAL!  -'+dmg:'ХРЯСЬ!  -'+dmg,critical?'#ffe46f':'#ff8db6',critical);
   if(e.hp<=0){
     if(e.kind==='walrusBoss'){if(e.mode===1)startWalrusSecondPhase(e);else startWalrusFinisher(e);}
     else if(e.kind==='boss' || e.kind==='prepackBoss') beginFatality(e); else killEnemy(e);
   }
 }
}
function hitPlayer(fromEnemy){
 if(phase!=='playing'||!p||p.hp<=0||p.state==='win'||fatality||finalCutscene||(p.invuln||0)>0)return;
 const damage=fromEnemy.kind==='walrusLaser'?32:(fromEnemy.kind==='boss'||fromEnemy.kind==='prepackBoss'||fromEnemy.kind==='walrusBoss')?18:fromEnemy.kind==='bag'?10:12;
 p.hp=Math.max(0,p.hp-damage);p.blink=.25;p.stun=.26;shake=Math.max(shake,8);flash=Math.max(flash,.06);
 p.x=slideAlongFence(p,p.x+fromEnemy.dir*24,p.y).x;fx(p.x,p.y-172,'-'+damage+' HP','#f96f8e',false);beep(155,.20,'sawtooth',.07,60);
 if(p.hp<=0){
   lives=Math.max(0,lives-1);
   if(lives>0){respawnPlayerAfterLifeLoss();}
   else{changePhase('lost','GAME OVER','У Тимура закончились все 3 жизни. Повторим?','ЕЩЁ ПОПЫТКА');status.textContent='Поражение';}
 }
}
function fx(x,y,text,color,crit){hitFx.push({x,y,text,color,crit,life:1.1,t:0});}
function fenceNearY(x){return 395-(x-435)*.099;}
// World-space office collision zones are measured against the original office.png
// displayed at 540px height. Left and right workstations block their whole upper
// tabletop + chair area; the reception is farther back in perspective.
const OFFICE_FURNITURE=[
  {left:0,right:495,front:412},      // desks + chairs, left wing
  {left:894,right:2000,front:409},  // desks + chairs, right wing
  {left:497,right:765,front:333}   // reception desk, central background
];
function blockedByOfficeFurniture(x,y,radius){
  return OFFICE_FURNITURE.some(o => x+radius>o.left && x-radius<o.right && y<o.front);
}
// Based on original shop art at 540px world height. Shelves and checkout
// counters are solid above their floor-contact edge; free foreground passage.
const STORE_FURNITURE=[
 {left:0,right:775,front:349},    // long candy shelf, left
 {left:805,right:1800,front:342} // cashier counters, right
];
function blockedByStoreFixtures(x,y,radius){
 return STORE_FURNITURE.some(o=>x+radius>o.left && x-radius<o.right && y<o.front);
}
function blockedByFence(x,y,radius){
  if(currentStage==='office') return blockedByOfficeFurniture(x,y,radius);
  if(currentStage==='store') return blockedByStoreFixtures(x,y,radius);
  if(currentStage!=='street') return false;
  if(x+radius>0&&x-radius<408&&y<370)return true;
  const nearX=clamp(x,435,874);
  if(x+radius>435&&x-radius<874&&y<fenceNearY(nearX)+9)return true;
  return false;
}
function slideAlongFence(ent,x,y){
 const r=ent===p?19:((ent.kind==='boss'||ent.kind==='prepackBoss')?46:ent.kind==='prepackGrunt'?35:ent.kind==='bag'?34:38);
 // Incoming enemies may be temporarily OUTSIDE the world to enter on screen naturally.
 // Players are still restricted to the level's boundaries.
 const nx=clamp(x,ent===p?70:-230,ent===p?worldW-70:worldW+230),ny=clamp(y,355,500);
 const result={x:ent.x,y:ent.y};
 if(!blockedByFence(nx,ent.y,r))result.x=nx;
 if(!blockedByFence(result.x,ny,r))result.y=ny;
 return result;
}
function movement(){let mx=0,my=0;if(keys.has('arrowleft')||keys.has('a')||keys.has('ф'))mx-=1;if(keys.has('arrowright')||keys.has('d')||keys.has('в'))mx+=1;if(keys.has('arrowup')||keys.has('w')||keys.has('ц'))my-=1;if(keys.has('arrowdown')||keys.has('s')||keys.has('ы'))my+=1;if(finger&&finger.moving){mx+=finger.dx;my+=finger.dy}const mag=Math.hypot(mx,my);return mag>.08?{x:mx/mag,y:my/mag}:{x:0,y:0}}
function spitLollipop(e){
 const dir=e.dir;
 shots.push({x:e.x+dir*65,y:e.shotLane ?? e.y,dir,life:0,speed:365,id:uidCounter++});
 beep(660,.09,'triangle',.024,270);
 fx(e.x,e.y-170,'ПЛЮХ!','#ffa34b',false);
}
function updateShots(dt){
 officeBulletInvuln=Math.max(0,officeBulletInvuln-dt);
 for(const sh of shots){
  sh.x += sh.dir*sh.speed*dt;sh.life+=dt;
  if(sh.life>3.8 || sh.x<-120 || sh.x>worldW+120){sh.remove=true;continue;}
  // Projectiles remain in the attacker's ground-depth lane. Move up/down to dodge.
  if(p.hp>0 && officeBulletInvuln<=0 && Math.abs(sh.x-p.x)<27 && Math.abs(sh.y-p.y)<28){
   sh.remove=true;officeBulletInvuln=.65;
   hitPlayer({kind:'bag',dir:sh.dir});
  }
 }
 shots=shots.filter(sh=>!sh.remove);
}
function maybeSpawnPotion(){
 // Earlier potions remain on the floor until collected, including in boss fights.
 // Keep the drop reachable and generally visible instead of hiding it behind desks.
 const targetY=currentStage==='office'?rand(429,482):currentStage==='store'?rand(390,485):rand(402,474);
 const visibleMin=Math.max(120,cam+95),visibleMax=Math.min(worldW-120,cam+W-95);
 const candidate=clamp(p.x+rand(-230,230),visibleMin,visibleMax);
 let x=candidate;
 if(blockedByFence(x,targetY,14)){
   x=clamp(p.x,visibleMin,visibleMax);
 }
 potions.push({x,y:-30,targetY,vy:0,state:'falling',pulse:Math.random()*6,heal:28});
 status.textContent='С неба падает зелье здоровья!';
}

function updatePotions(dt){
 potionDropTimer-=dt;
 if(potionDropTimer<=0){maybeSpawnPotion(); potionDropTimer=(bossSpawned&&!bossDefeated)?rand(8,11):rand(10,15);}
 for(const pt of potions){
   pt.pulse+=dt*3;
   if(pt.state==='falling'){
     pt.vy=Math.min(380,pt.vy+620*dt);
     pt.y+=pt.vy*dt;
     if(pt.y>=pt.targetY){pt.y=pt.targetY;pt.state='ground';pt.vy=0;beep(420,.05,'square',.03,260);}
   } else if(pt.state==='ground'){
     if(Math.abs(p.x-pt.x)<44 && Math.abs(p.y-pt.y)<50){
       p.hp=Math.min(p.maxHp,p.hp+pt.heal);
       fx(pt.x,pt.y-58,'+'+pt.heal+' HP','#6ff3a1',true);
       potionBeep();
       pt.remove=true;
       status.textContent='Тимур подобрал зелье здоровья!';
     }
   }
 }
 potions=potions.filter(pt=>!pt.remove);
}
function updateEnemy(e,dt){
 e.anim+=dt; e.cd=Math.max(0,e.cd-dt); e.stun=Math.max(0,e.stun-dt); e.blink=Math.max(0,e.blink-dt);
 if(e.state==='dead') return;
 if(e.state==='attack'){
   const hitMoment=(e.kind==='boss'||e.kind==='prepackBoss')?.34:.34;
   if(!e.attackHit&&e.anim>=hitMoment){e.attackHit=true;const dx=p.x-e.x;if(Math.abs(dx)<((e.kind==='boss'||e.kind==='prepackBoss')?118:107)&&Math.abs(p.y-e.y)<((e.kind==='boss'||e.kind==='prepackBoss')?64:55))hitPlayer(e)}
   if(e.anim>=((e.kind==='boss'||e.kind==='prepackBoss')?.80:.93)){setState(e,'idle');e.cd=rand(.75,1.1);} 
   return;
 }
 if(e.stun>0) return;
 const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);
 if(e.kind==='bag'){
   // Keep a standoff distance and freeze the lane when winding up the spit.
   if(e.state==='shoot'){
      if(!e.attackHit&&e.anim>=.72){e.attackHit=true;spitLollipop(e)}
      if(e.anim>=1.12){setState(e,'idle');e.cd=rand(1.65,2.35)}
      return;
   }
   if(Math.abs(dx)<390&&Math.abs(dx)>135&&Math.abs(dy)<62&&e.cd<=0){
      e.dir=dx>=0?1:-1; e.shotLane=e.y;setState(e,'shoot');return;
   }
   let vx=0,vy=0;
   if(Math.abs(dx)>270)vx=Math.sign(dx)*90*dt;
   else if(Math.abs(dx)<165)vx=-Math.sign(dx||1)*75*dt;
   if(Math.abs(dy)>38)vy=Math.sign(dy)*55*dt;
   let pos=slideAlongFence(e,e.x+vx,e.y+vy);e.x=pos.x;e.y=pos.y;
   if(Math.abs(vx)>.01)e.dir=vx>0?1:-1;
   setState(e,Math.abs(vx)+Math.abs(vy)>0.01?'walk':'idle');
   return;
 }
 if(d<e.attackRange&&Math.abs(dy)<((e.kind==='boss'||e.kind==='prepackBoss')?70:58)&&e.cd<=0){e.dir=dx>=0?1:-1;setState(e,'attack');e.cd=(e.kind==='boss'||e.kind==='prepackBoss')?1.8:1.55;return;}
 // Keep walking toward the camera/player even when spawning beyond the old AI radius.
 if(d>84){
   const speed=(e.kind==='boss'||e.kind==='prepackBoss')?82:92;
   const vspeed=(e.kind==='boss'||e.kind==='prepackBoss')?56:62;
   const mvx=clamp(dx,-1,1)*Math.min(speed*dt,Math.abs(dx));
   const mvy=clamp(dy,-1,1)*Math.min(vspeed*dt,Math.abs(dy));
   const pos=slideAlongFence(e,e.x+mvx,e.y+mvy);
   e.x=pos.x;e.y=pos.y;
   if(Math.abs(mvx)>.01)e.dir=mvx>0?1:-1;
   setState(e,'walk');
 } else setState(e,'idle');
}
// Keep separate ground positions for every trash can (including defeated containers).
// Depth is visually foreshortened: 1px of vertical separation counts as ~2px sideways.
// Dead containers are stationary; living enemies step around them rather than stacking.
function solveEnemySeparation(){
 const DEPTH=2.2;
 for(let iteration=0;iteration<5;iteration++){
   let any=false;
   for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
     const a=enemies[i],b=enemies[j];
     if((a.kind==='walrusBoss'&&a.mode===2&&a.phase!=='landed') || (b.kind==='walrusBoss'&&b.mode===2&&b.phase!=='landed'))continue;
     const aDead=a.state==='dead', bDead=b.state==='dead';
     // Corpses stay on the map visually but stop affecting movement entirely.
     if(aDead||bDead)continue;
     const minDist=((a.kind==='boss'||a.kind==='prepackBoss')?77:a.kind==='bag'?60:a.kind==='prepackGrunt'?49:54)+((b.kind==='boss'||b.kind==='prepackBoss')?77:b.kind==='bag'?60:b.kind==='prepackGrunt'?49:54);
     let dx=b.x-a.x,dy=(b.y-a.y)*DEPTH;
     let dist=Math.hypot(dx,dy);
     if(dist>=minDist)continue;
     any=true;
     if(dist<.001){
       dx=(a.id<b.id?1:-1)*.8;dy=(a.id+b.id)%2?.6:-.6;dist=Math.hypot(dx,dy);
     }
     const overlap=(minDist-dist)+.8;
     const nx=dx/dist,ny=dy/dist/DEPTH;
     const pa=slideAlongFence(a,a.x-nx*overlap*.5,a.y-ny*overlap*.5);
     const pb=slideAlongFence(b,b.x+nx*overlap*.5,b.y+ny*overlap*.5);
     a.x=pa.x;a.y=pa.y;b.x=pb.x;b.y=pb.y;
   }
   if(!any)break;
 }
}
function updateFatality(dt){
 if(!fatality) return;
 const b=fatality.boss; fatality.t+=dt;
 p.dir=(b.x>=p.x)?1:-1;
 if(fatality.t<.32){
   const targetX=b.x-p.dir*95;
   p.x = clamp(p.x+(targetX-p.x)*Math.min(1,dt*8),70,worldW-70);
   setState(p,'walk');
 } else {
   setState(p,'attack');
   p.anim += dt*1.6;
 }
 if(!fatality.hitDone && fatality.t>.58){
   fatality.hitDone=true;
   shake=16; flash=.18;
   hitBeep(true); hitBeep(true);
   fx(b.x,b.y-250,'FATALITY!','#ffe46f',true);
   killEnemy(b);
 }
 if(fatality.hitDone){
   b.anim+=dt*1.1;
 }
 if(fatality.t>1.5){
   fatality=null; p.cd=0; p.stun=0; setState(p,'win');victoryFireTimer=.05;
   beep(560,.14,'triangle',.04);setTimeout(()=>beep(760,.20,'triangle',.04),150);
   status.textContent='Босс повержен! Тимур празднует победу…';
 }
}
function update(dt){
 gameTime+=dt;
 p.anim+=dt; p.cd=Math.max(0,p.cd-dt); p.stun=Math.max(0,p.stun-dt); p.blink=Math.max(0,p.blink-dt); p.invuln=Math.max(0,(p.invuln||0)-dt);
 shake=Math.max(0,shake-30*dt); flash=Math.max(0,flash-dt);
 for(const f of hitFx){f.t+=dt;f.y-=36*dt;} hitFx=hitFx.filter(f=>f.t<f.life);
 if(attackQueued){attackQueued=false;tryAttack()}
 if(finalCutscene){updateFinalCutscene(dt);cam+=((clamp(p.x-W*.38,0,Math.max(0,worldW-W)))-cam)*Math.min(1,dt*5);return;}
 if(fatality){updateFatality(dt);updateFireworks(dt);cam+=((clamp(p.x-W*.38,0,Math.max(0,worldW-W)))-cam)*Math.min(1,dt*5);return;}
 const m=movement();
 if(p.state==='win'){
   // celebrate
 } else if(p.state==='attack'){
   if(!p.attackHit&&p.anim>=.22){p.attackHit=true;hitEnemy()}
   if(p.anim>=.57)setState(p,'idle');
 } else if(p.stun<=0){
   if(m.x||m.y){const pos=slideAlongFence(p,p.x+m.x*208*dt,p.y+m.y*150*dt);p.x=pos.x;p.y=pos.y;if(m.x!==0)p.dir=m.x>0?1:-1;setState(p,'walk');}
   else setState(p,'idle');
 }
 
 updatePotions(dt);
 if(currentStage==='office'||currentStage==='store') updateShots(dt);
 
 spawnTimer-=dt;
 const liveRegular=liveEnemies().filter(e=>e.kind==='trash').length;
 if(currentStage==='store'){
   if(!bossSpawned && storeKills>=STORE_BOSS_KILL_THRESHOLD && liveEnemies().length<MAX_REGULAR_ALIVE){spawnWalrusBoss();spawnTimer=Math.max(spawnTimer,1.4);}
   const canSpawnStoreMob=!bossDefeated && liveEnemies().length<MAX_REGULAR_ALIVE && spawnTimer<=0 && (storeSpawned<STORE_TOTAL || bossSpawned);
   if(canSpawnStoreMob){spawnStoreEnemy();spawnTimer=rand(2.6,3.8);}
 } else if(currentStage==='office'){
   if(officeSpawned<OFFICE_TOTAL && liveEnemies().length<MAX_REGULAR_ALIVE && spawnTimer<=0){spawnOfficeEnemy();spawnTimer=rand(2.6,4.0);}
 }else if(spawnedTrashCount<REGULAR_TARGET && liveRegular<MAX_REGULAR_ALIVE && spawnTimer<=0){spawnTrash(spawnedTrashCount%2===0?'right':'left');spawnTimer=rand(2.9,4.7); status.textContent='Новая мусорка лезет в драку!';}
 for(const e of enemies.filter(e=>!e.deadBody)) {if(e.kind==='walrusBoss')updateWalrusBoss(e,dt);else updateEnemy(e,dt);}
 solveEnemySeparation();
 
 if(currentStage==='street'&&regularKills>=REGULAR_TARGET && !bossSpawned && liveEnemies().filter(e=>e.kind==='trash').length===0){spawnBoss();}
 if(currentStage==='store' && storeKills>=STORE_TOTAL && !bossSpawned && liveEnemies().length===0){spawnWalrusBoss();}
 if(currentStage==='store')finishStoreIfClear();
 if(currentStage==='office' && officeKills>=OFFICE_TOTAL && !bossSpawned && liveEnemies().length===0){spawnOfficeBoss();}
 if(currentStage==='office' && bossDefeated && p.state!=='win' && !fatality){ setState(p,'win'); victoryFireTimer=.05; }
 if(currentStage==='office' && bossDefeated && liveEnemies().length===0 && !officeCleared){officeCleared=true;shots=[];status.textContent='Офис очищен! Человек ПРЕПАК повержен.';beep(580,.16,'triangle',.045,840);}
 if(currentStage==='street' && bossDefeated && p.state!=='win' && !fatality){ setState(p,'win'); victoryFireTimer=.05; }
 if(p.state==='win'&&p.anim>=1.2&&!victoryReady){victoryReady=true;$('next').hidden=false;$('next').textContent=currentStage==='store'?'ЗАВЕРШИТЬ ИГРУ':currentStage==='office'?'ДАЛЕЕ → МАГАЗИН':'ДАЛЕЕ → ОФИС';status.textContent=currentStage==='store'?'ФИНАЛЬНЫЙ БОСС ПОВЕРЖЕН! Нажми «ЗАВЕРШИТЬ ИГРУ».':currentStage==='office'?'ОФИС ЗАЧИЩЕН! Нажми «ДАЛЕЕ → МАГАЗИН».':'ПОБЕДА! Нажми «ДАЛЕЕ → ОФИС».';}
 updateFireworks(dt);
 cam+=((clamp(p.x-W*.38,0,Math.max(0,worldW-W)))-cam)*Math.min(1,dt*5);
}
function drawSprite(key,x,y,flip,frame,anchor,blink,scale=1,lean=0,frameW=260){
 const im=IM[key]; if(!im) return;
 const dw=frameW*scale;
 const xOnScreen=Math.round(x-cam-dw/2),yOnScreen=Math.round(y-anchor*scale);
 ctx.save();
 if(blink>0&&Math.floor(gameTime*22)%2===0)ctx.globalAlpha=.45;
 ctx.translate(xOnScreen+dw/2,yOnScreen+dw*.88);
 if(lean)ctx.rotate(lean);
 ctx.scale(flip?-1:1,1);
 ctx.drawImage(im,Math.floor(frame)*frameW,0,frameW,frameW,-dw/2,-dw*.88,dw,dw);
 ctx.restore();
}
function drawSingleSprite(key,x,bottomY,flip,blink,drawWidth,drawHeight=drawWidth){
 const im=IM[key]; if(!im) return;
 const xx=Math.round(x-cam-drawWidth/2), yy=Math.round(bottomY-drawHeight);
 ctx.save();
 if(blink>0&&Math.floor(gameTime*22)%2===0)ctx.globalAlpha=.45;
 ctx.translate(xx+drawWidth/2,yy+drawHeight/2);
 ctx.scale(flip?-1:1,1);
 ctx.drawImage(im,-drawWidth/2,-drawHeight/2,drawWidth,drawHeight);
 ctx.restore();
}
function shadow(x,y,w){const xx=Math.round(x-cam);ctx.save();ctx.fillStyle='#09070b6f';ctx.beginPath();ctx.ellipse(xx,Math.round(y)+4,w,11,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function hpbar(x,y,hp,max,label,isPlayer,boss=false){const xx=Math.round(x-cam),ww=boss?150:(isPlayer?118:120);ctx.save();ctx.fillStyle='#06101ce8';ctx.fillRect(xx-ww/2-3,y-3,ww+6,17);ctx.fillStyle='#233549';ctx.fillRect(xx-ww/2,y,ww,10);ctx.fillStyle=boss?'#9d74ff':(isPlayer?'#2ff6a6':'#f47437');ctx.fillRect(xx-ww/2,y,Math.ceil(ww*Math.max(hp,0)/max),10);ctx.strokeStyle='#071019';ctx.strokeRect(xx-ww/2-.5,y-.5,ww+1,11);ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(label,xx,y-10);ctx.restore()}
function drawBg(){const bg=IM[stageKey];const sw=bg.naturalWidth,sh=bg.naturalHeight;worldW=H*sw/sh;ctx.drawImage(bg,0,0,sw,sh,Math.round(-cam),0,Math.round(worldW),H);ctx.fillStyle='#00000016';ctx.fillRect(0,310,W,230)}
function drawPotion(pt){const xx=Math.round(pt.x-cam), yy=Math.round(pt.y);if(pt.state==='ground') shadow(pt.x,pt.y,14);ctx.save();if(pt.state==='falling'){ctx.strokeStyle='#95e5ff'; ctx.lineWidth=2;ctx.beginPath(); ctx.moveTo(xx,yy-24); ctx.lineTo(xx,yy-6); ctx.stroke();}const bob=pt.state==='ground'?Math.sin(pt.pulse)*2:0;ctx.translate(xx,yy-18+bob);ctx.fillStyle='#0b1730'; ctx.fillRect(-8,-12,16,20);ctx.fillStyle='#8ef0ff'; ctx.fillRect(-5,-9,10,13);ctx.fillStyle='#ff5fa8'; ctx.fillRect(-4,-8,8,10);ctx.fillStyle='#d7f9ff'; ctx.fillRect(-2,-13,4,4);ctx.fillStyle='#f2fbff'; ctx.fillRect(-2,-10,1,5);ctx.restore();}
function drawLifeIcon(x,y,size,alive){const im=IM['timur-walk'];ctx.save();ctx.globalAlpha=alive?1:.28;ctx.fillStyle=alive?'#10263c':'#2a2f38';ctx.fillRect(x-2,y-2,size+4,size+4);ctx.strokeStyle=alive?'#8de1ff':'#61656c';ctx.strokeRect(x-.5,y-.5,size+1,size+1);if(im){ctx.drawImage(im,28,2,150,126,x,y,size,size);}if(!alive){ctx.strokeStyle='#ff6d83';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+size-3,y+size-3);ctx.moveTo(x+size-3,y+3);ctx.lineTo(x+3,y+size-3);ctx.stroke();}ctx.restore();}
function drawHud(){
 const mobile=W<800;
 const panelH=mobile?104:92;
 ctx.save();ctx.fillStyle='#041021df';ctx.fillRect(12,12,mobile?278:264,panelH);ctx.strokeStyle='#3d87c7';ctx.strokeRect(12.5,12.5,mobile?278:264,panelH);
 ctx.fillStyle='#e7f7ff';ctx.font=`bold ${mobile?18:14}px monospace`;ctx.fillText('ТИМУР',25,mobile?37:32);
 ctx.fillStyle='#314157';ctx.fillRect(24,mobile?48:42,mobile?210:186,mobile?19:15);
 ctx.fillStyle=p.hp>=36?'#48eba9':'#fe626f';ctx.fillRect(24,mobile?48:42,(mobile?210:186)*p.hp/100,mobile?19:15);
 ctx.fillStyle='#fff';ctx.font=`bold ${mobile?16:12}px monospace`;ctx.fillText(`${p.hp}/100`,mobile?150:143,mobile?63:54);
 ctx.textAlign='right';ctx.font=`bold ${mobile?19:14}px monospace`;ctx.fillStyle='#fdd77e';ctx.fillText(currentStage==='store'?(mobile?'STORE 03':'STAGE 03 / STORE'):currentStage==='office'?(mobile?'OFFICE 02':'STAGE 02 / OFFICE'):(mobile?'WAVE 01':'STAGE 01 / TRASH AMBUSH'),W-16,mobile?37:28);
 ctx.fillStyle='#b2d9ee'; ctx.textAlign='left'; ctx.font=`bold ${mobile?14:11}px monospace`; ctx.fillText(currentStage==='store'?`KILLS ${storeKills}/${STORE_TOTAL}`:currentStage==='office'?`KILLS ${officeKills}/${OFFICE_TOTAL}`:`KILLS ${regularKills}/${REGULAR_TARGET}`,25,mobile?79:70);
 ctx.fillStyle='#ffd9a4';ctx.font=`bold ${mobile?13:11}px monospace`;ctx.fillText('ЖИЗНИ',25,mobile?96:87);
 const iconSize=mobile?18:17;for(let i=0;i<maxLives;i++)drawLifeIcon(88+i*(iconSize+6),mobile?80:71,iconSize,i<lives);
 const boxW=mobile?148:190, boxH=mobile?44:38, boxX=W-boxW-14, boxY=mobile?48:36;
 ctx.fillStyle='#091423dd'; ctx.fillRect(boxX,boxY,boxW,boxH); ctx.strokeStyle='#6db5ff'; ctx.strokeRect(boxX+.5,boxY+.5,boxW-1,boxH-1);
 ctx.fillStyle='#ffffff'; ctx.textAlign='left'; ctx.font=`bold ${mobile?13:12}px monospace`; ctx.fillText('ВРАГОВ ОСТАЛОСЬ', boxX+10, boxY+15);
 ctx.fillStyle='#ffdd7c'; ctx.font=`bold ${mobile?21:18}px monospace`; ctx.fillText(String(enemiesLeftCount()), boxX+10, boxY + (mobile ? 36 : 32));
 ctx.restore();}
function drawEffects(){ctx.save();for(const f of hitFx){let a=clamp((f.life-f.t)/.4,0,1);ctx.globalAlpha=a;const xx=f.x-cam,yy=f.y,scale=f.crit?1.30:1;ctx.save();ctx.translate(Math.round(xx),Math.round(yy));ctx.scale(scale,scale);ctx.rotate(f.crit?-.12:0);ctx.textAlign='center';ctx.font=`900 ${f.crit?26:19}px Impact,Arial Black,monospace`;ctx.lineWidth=6;ctx.strokeStyle='#251120';ctx.strokeText(f.text,0,0);ctx.fillStyle=f.color;ctx.fillText(f.text,0,0);ctx.restore();}ctx.restore()}
function drawHoverPlatform(x,y){
 const xx=Math.round(x-cam),yy=Math.round(y);
 ctx.save();
 ctx.translate(xx,yy);
 ctx.fillStyle='#0c1734';ctx.beginPath();ctx.ellipse(0,18,86,16,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#57d8ff';ctx.fillRect(-76,8,152,12);
 ctx.fillStyle='#102c59';ctx.fillRect(-60,18,120,10);
 ctx.fillStyle='#f6d84f';ctx.fillRect(-72,4,20,8);ctx.fillRect(52,4,20,8);
 ctx.fillStyle='rgba(109,230,255,.28)';ctx.beginPath();ctx.ellipse(0,26,62,9,0,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function drawWalrusPrototype(e){
 const walrusScale=currentStage==='store'?STORE_WALRUS_SCALE:WALRUS_SCALE;
 const scaleRatio=walrusScale/WALRUS_SCALE;
 const flip=e.dir===1;
 if(e.phase==='deathFall'){
   const deathTime=e.flightClock;
   let acc=0, frame=0;
   for(let i=0;i<WALRUS_DEATH_FRAME_DURS.length;i++){acc+=WALRUS_DEATH_FRAME_DURS[i]; if(deathTime<acc){frame=i; break;} frame=i;}
   const deathScale=walrusScale;
   const sink=Math.max(0,deathTime-1.85)*12;
   const drawY=e.y+Math.min(18,sink);
   const shadowSize=frame>=3?Math.round(38*deathScale/.44):Math.round(62*deathScale/.44);
   shadow(e.x,drawY,shadowSize);
   if(frame>=2){ctx.save();ctx.globalAlpha=.82;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(Math.round(e.x-cam),Math.round(drawY+4),Math.round(52*deathScale/.44),12,0,0,Math.PI*2);ctx.fill();ctx.restore();}
   drawSprite('walrus-death',e.x,drawY,flip,frame,430,e.blink,deathScale,0,500);
   if(frame>=1 && frame<=3){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#fff0ae';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(Math.round(e.x-cam)+Math.sin(gameTime*7+i)*26,Math.round(drawY-120)+i*7,2.8,0,Math.PI*2);ctx.fill();}ctx.restore();}
   return;
 }
 const onPlatform=e.mode===2 && e.phase!=='dead';
 if(onPlatform){
   const attackPose=(e.phase==='charge'||e.phase==='beam');
   const imgKey=attackPose?'walrus-platform-attack':'walrus-platform';
   const drawW=Math.round(WALRUS_PLATFORM_DRAW_BASE*scaleRatio);
   const drawH=drawW;
   let bottomY=WALRUS_PLATFORM_AIR_BOTTOM;
   let bob=0;
   if(e.phase==='ascend'){
     const t=clamp(e.flightClock/WALRUS_PLATFORM_TRANSITION,0,1);
     bottomY=WALRUS_PLATFORM_GROUND_BOTTOM+(WALRUS_PLATFORM_AIR_BOTTOM-WALRUS_PLATFORM_GROUND_BOTTOM)*t;
   } else if(e.phase==='descend'){
     const t=clamp(e.flightClock/WALRUS_PLATFORM_TRANSITION,0,1);
     bottomY=WALRUS_PLATFORM_AIR_BOTTOM+(WALRUS_PLATFORM_GROUND_BOTTOM-WALRUS_PLATFORM_AIR_BOTTOM)*t;
   } else if(e.phase==='landed'){
     bottomY=WALRUS_PLATFORM_GROUND_BOTTOM;
   } else if(e.phase==='takeoff'){
     const t=clamp(e.flightClock/WALRUS_PLATFORM_TRANSITION,0,1);
     bottomY=WALRUS_PLATFORM_GROUND_BOTTOM+(WALRUS_PLATFORM_AIR_BOTTOM-WALRUS_PLATFORM_GROUND_BOTTOM)*t;
   } else {
     bob=Math.sin(gameTime*4)*6;
     bottomY=WALRUS_PLATFORM_AIR_BOTTOM+bob;
   }
   const grounded=['descent','landed','takeoff'].includes(e.phase);
   const shadowW=Math.round((grounded?84:66)*scaleRatio);
   shadow(e.x,e.y+8,shadowW);
   if(grounded){
     ctx.save();
     ctx.globalAlpha=e.phase==='landed'?0.22:0.12;
     ctx.fillStyle='#000';
     ctx.beginPath();
     ctx.ellipse(Math.round(e.x-cam),Math.round(e.y+8),Math.round(90*scaleRatio),16,0,0,Math.PI*2);
     ctx.fill();
     ctx.restore();
   }
   drawSingleSprite(imgKey,e.x,bottomY,flip,e.blink,drawW,drawH);
   if(e.phase==='landed'){
     ctx.save();ctx.textAlign='center';ctx.font='bold 12px monospace';ctx.fillStyle='#91ffcb';ctx.fillText('УЯЗВИМ',Math.round(e.x-cam),Math.round(bottomY-drawH+18));ctx.restore();
   }
   hpbar(e.x,86,e.hp,e.maxHp,'МОРЖ • ПЛАТФОРМА',false,true);
   return;
 }
 const spriteY=e.y;
 const frameWalk=Math.floor(e.anim/.16)%5;
 const frameIdle=Math.floor(e.anim/.22)%5;
 let key='walrus-idle', frame=frameIdle, anchor=430;
 if(e.state==='attack' && e.mode===1){
   // The user's four real 500px GIF frames: ready -> wind-up -> bite -> recovery.
   // Keep the same feet/pivot instead of fake lean/idle during a bite.
   key='walrus-attack';
   frame=Math.min(3,Math.floor(e.anim/.21));
 } else if(e.state==='walk'){
   key='walrus-walk'; frame=frameWalk;
 }
 shadow(e.x,e.y,Math.round(62*walrusScale/.44));
 drawSprite(key,e.x,spriteY,flip,frame,anchor,e.blink,walrusScale,0,500);
 hpbar(e.x,Math.round(e.y-248),e.hp,e.maxHp,'МОРЖ • ЗЕМЛЯ',false,true);
}
function drawWalrusLaser(){
 if(currentStage!=='store'||!walrus||walrus.mode!==2)return;
 const e=walrus;
 if(!['charge','beam'].includes(e.phase))return;
 const x=Math.round(e.aimX-cam),top=160,bottom=530;
 ctx.save();
 if(e.phase==='charge'){
   const intensity=.2+.3*Math.min(1,e.flightClock/2);
   ctx.fillStyle=`rgba(255,55,80,${intensity})`;
   ctx.fillRect(x-61,350,122,164);
   ctx.strokeStyle='#ff5d72';ctx.lineWidth=3;ctx.setLineDash([9,7]);
   ctx.strokeRect(x-59,160,118,349);ctx.setLineDash([]);
   ctx.fillStyle='#ffedb3';ctx.textAlign='center';ctx.font='bold 18px monospace';
   ctx.fillText('⚠ ЛУЧ!',x,356);
 }else{
   ctx.fillStyle='rgba(255,79,62,.35)';ctx.fillRect(x-75,top,150,bottom-top);
   ctx.fillStyle='#ff8555';ctx.fillRect(x-57,top,114,bottom-top);
   ctx.fillStyle='#fff4bf';ctx.fillRect(x-36,top,72,bottom-top);
   ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(x-15,top,30,bottom-top);
   const fl=Math.sin(gameTime*60)*6;
   ctx.fillStyle='#ffa644';ctx.fillRect(x-89,495+fl,178,17);
 }
 ctx.restore();
}
function drawFireworks(){ctx.save();for(const fw of fireworks){const a=Math.max(0,1-fw.t/fw.life);ctx.globalAlpha=a;ctx.fillStyle=fw.color;ctx.beginPath();ctx.arc(Math.round(fw.x-cam),Math.round(fw.y),2.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle=fw.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.round(fw.x-cam),Math.round(fw.y));ctx.lineTo(Math.round(fw.x-cam-fw.vx*.025),Math.round(fw.y-fw.vy*.025));ctx.stroke();}ctx.restore();}
function drawCutsceneLines(){ctx.save();ctx.fillStyle='#050912';ctx.fillRect(0,0,W,H);ctx.translate(W/2,H/2);const spokes=120;for(let i=0;i<spokes;i++){const a=(Math.PI*2*i)/spokes;const len=W*.7+Math.sin(gameTime*11+i)*28;ctx.strokeStyle=i%2?'rgba(255,255,255,.22)':'rgba(255,232,171,.3)';ctx.lineWidth=i%6===0?3:1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.stroke();}ctx.restore();}
function drawFinalCutscene(){if(!finalCutscene)return;drawCutsceneLines();const windupEnd=Math.min(.72,finalCutscene.duration*.42);const isWindup=finalCutscene.t<windupEnd;const key=isWindup?'cutscene-windup':'cutscene-punch';const im=IM[key];ctx.save();if(im){const punchT=isWindup?0:clamp((finalCutscene.t-windupEnd)/Math.max(.001,finalCutscene.duration-windupEnd),0,1);const windT=isWindup?clamp(finalCutscene.t/Math.max(.001,windupEnd),0,1):1;const shakeAmt=isWindup?1.4+windT*2.0:2.8+punchT*5.2;ctx.translate((Math.random()-.5)*shakeAmt,(Math.random()-.5)*shakeAmt);const scale=Math.min(W/im.naturalWidth,H/im.naturalHeight)*.92*(isWindup?1+windT*.01:1+punchT*.02);const dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;ctx.drawImage(im,(W-dw)/2,(H-dh)/2,dw,dh);}ctx.restore();ctx.save();ctx.textAlign='center';ctx.fillStyle='#fff5be';ctx.strokeStyle='#251120';ctx.lineWidth=7;ctx.font='900 34px Impact,Arial Black,sans-serif';ctx.strokeText(isWindup?'ЗАМАХ!':'УДАР!',W/2,H-34);ctx.fillText(isWindup?'ЗАМАХ!':'УДАР!',W/2,H-34);ctx.restore();}
function draw(){if(!IM[stageKey]){ctx.fillStyle='#111c32';ctx.fillRect(0,0,W,H);return}ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake)}drawBg();
 if(p){
   const chars=[{who:'p',v:p},...enemies.map(e=>({who:'e',v:e}))].sort((a,b)=>a.v.y-b.v.y);
   for(const pt of potions) drawPotion(pt);
   for(const c of chars){
     if(c.who==='p'){
       shadow(p.x,p.y,currentStage==='store'?30:26);let s=p.state==='attack'?'timur-punch':p.state==='win'?'timur-victory':'timur-walk';let frame=p.state==='attack'?Math.min(5,Math.floor(p.anim/.095)):p.state==='win'?Math.floor(p.anim/.20)%6:p.state==='walk'?Math.floor(p.anim/.105)%6:0;drawSprite(s,p.x,p.y,p.dir===-1,frame,p.state==='win'?252:241,p.blink,currentStage==='store'?STORE_HERO_SCALE:HERO_SCALE);
       if(p.state==='win'){ctx.save();const mugX=Math.round(p.x-cam+(p.dir===1?18:-18)),mugY=Math.round(p.y-130);ctx.fillStyle='#f2d068';ctx.fillRect(mugX,mugY,12,12);ctx.fillStyle='#fff5d4';ctx.fillRect(mugX+2,mugY+2,8,8);ctx.strokeStyle='#9f7a1f';ctx.strokeRect(mugX-.5,mugY-.5,13,13);ctx.strokeStyle='#f2d068';ctx.beginPath();ctx.arc(mugX+12,mugY+6,4,-1.2,1.2);ctx.stroke();ctx.restore();}
       hpbar(p.x,p.y-(currentStage==='store'?174:162),p.hp,p.maxHp,'ТИМУР',true,false);
     } else {
       const e=c.v;
       if(e.kind==='trash'){
         shadow(e.x,e.y,55); let s=e.state==='dead'?'trash-death':e.state==='attack'?'trash-attack':e.state==='walk'?'trash-walk':'trash-idle'; let frame=e.state==='dead'?3:(e.state==='attack'?Math.min(6,Math.floor(e.anim/.13)):e.state==='walk'?Math.floor(e.anim/.14)%8:Math.floor(e.anim/.5)%2);
         drawSprite(s,e.x,e.y,e.dir===1,frame,e.state==='dead'?190:197,e.blink,1,e.state==='walk'?e.dir*.04:0);
         if(e.state!=='dead') hpbar(e.x,e.y-210,e.hp,e.maxHp,'МУСОРКА',false,false);
       } else if(e.kind==='bag'){
         shadow(e.x,e.y,43);
         const key=e.state==='dead'?'bag-death':e.state==='shoot'?'bag-spit':'bag-walk';
         const frame=e.state==='dead'?4:(e.state==='shoot'?Math.min(5,Math.floor(e.anim/.185)):e.state==='walk'?Math.floor(e.anim/.2)%6:0);
         // Base sheet faces left; mirror only when the enemy moves or shoots to the right.
         drawSprite(key,e.x,e.y,e.dir===1,frame,225,e.blink,BAG_SCALE,0,260);
         if(e.state!=='dead') hpbar(e.x,e.y-200,e.hp,e.maxHp,'ПЯТЁРОЧКА',false,false);
       } else if(e.kind==='prepackGrunt'){
         shadow(e.x,e.y,37);
         const s=e.state==='dead'?'prepack-death':e.state==='attack'?'prepack-attack':'prepack-walk';
         const frame=e.state==='dead'?Math.min(5,Math.floor(e.anim/.16)):e.state==='attack'?Math.min(3,Math.floor(e.anim/.20)):(e.state==='walk'?Math.min(2,Math.floor(e.anim/.20)%3):0);
         drawSprite(s,e.x,e.y,e.dir===-1,frame,e.state==='dead'?430:430,e.blink,PREPACK_GRUNT_SCALE,e.state==='walk'?e.dir*.02:0,500);
         if(e.state!=='dead')hpbar(e.x,e.y-181,e.hp,e.maxHp,'ПРЕПАК',false,false);
       } else if(e.kind==='walrusBoss'){
         drawWalrusPrototype(e);
       } else if(e.kind==='boss') {
         shadow(e.x,e.y,70); 
         let s=e.state==='dead'?'sap-death':e.state==='attack'?'sap-attack':'sap-idlewalk';
         let frame=e.state==='dead'?Math.min(3,Math.floor(e.anim/.18)):e.state==='attack'?Math.min(3,Math.floor(e.anim/.18)):(e.state==='walk'?Math.min(3,1+Math.floor(e.anim/.16)%3):0);
         drawSprite(s,e.x,e.y,e.dir===-1,frame,425,e.blink,BOSS_SCALE,e.state==='walk'?e.dir*.03:0,500);
         if(e.state!=='dead') hpbar(e.x,e.y-258,e.hp,e.maxHp,'САП ФОРМА',false,true);
       } else {
         shadow(e.x,e.y,72);
         let s=e.state==='dead'?'prepack-death':e.state==='attack'?'prepack-attack':'prepack-walk';
         let frame=e.state==='dead'?Math.min(5,Math.floor(e.anim/.15)):e.state==='attack'?Math.min(3,Math.floor(e.anim/.16)):(e.state==='walk'?Math.min(2,Math.floor(e.anim/.17)%3):0);
         drawSprite(s,e.x,e.y,e.dir===-1,frame,430,e.blink,PREPACK_SCALE,e.state==='walk'?e.dir*.02:0,500);
         if(e.state!=='dead') hpbar(e.x,e.y-255,e.hp,e.maxHp,'ПРЕПАК',false,true);
       }
     }
   }
   if(currentStage==='store')drawWalrusLaser();
   if(currentStage==='office'||currentStage==='store')for(const sh of shots){
      const im=IM['lollipop-projectile']; if(!im)continue;
      const xx=sh.x-cam,yy=sh.y-120;
      ctx.save();ctx.translate(Math.round(xx),Math.round(yy));ctx.scale(sh.dir===-1?-1:1,1);
      ctx.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);
      ctx.restore();
   }
   drawEffects();
   if(p&&p.state==='win')drawFireworks();
 }
 if(flash>0){ctx.fillStyle=`rgba(255,239,162,${Math.min(.19,flash*1.7)})`;ctx.fillRect(0,0,W,H)}ctx.restore();if(finalCutscene){drawFinalCutscene();}else if(p)drawHud();}
function tick(t){const dt=clamp((t-last)/1000||0,0,.05);last=t;if(phase==='playing'&&p)update(dt);if(IM[stageKey]){ctx.imageSmoothingEnabled=false;draw()}requestAnimationFrame(tick)}
function pointerPos(ev){const b=canvas.getBoundingClientRect();return{x:(ev.clientX-b.left)/b.width*W,y:(ev.clientY-b.top)/b.height*H}}
canvas.addEventListener('pointerdown',ev=>{if(phase!=='playing')return;ev.preventDefault();const q=pointerPos(ev);if(finger){attackQueued=true;return}finger={id:ev.pointerId,x0:q.x,y0:q.y,dx:0,dy:0,moving:false,time:performance.now()};try{canvas.setPointerCapture(ev.pointerId)}catch{}});
canvas.addEventListener('pointermove',ev=>{if(!finger||ev.pointerId!==finger.id)return;ev.preventDefault();const q=pointerPos(ev),dx=q.x-finger.x0,dy=q.y-finger.y0,m=Math.hypot(dx,dy);if(m>20){finger.moving=true;finger.dx=dx/m;finger.dy=dy/m;}});
function releasePointer(ev){if(!finger||ev.pointerId!==finger.id)return;const elapsed=performance.now()-finger.time;if(!finger.moving && elapsed<500)attackQueued=true;finger=null;}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);window.addEventListener('blur',()=>{keys.clear();finger=null;});
window.addEventListener('keydown',ev=>{const k=ev.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','j','p','r','ф','ц','ы','в'].includes(k))ev.preventDefault();if(k==='enter'&&victoryReady&&phase==='playing'){goToNextStage();return}if(k==='r'){restart();return}if(k==='p'){togglePause();return}if(k===' '||k==='j'){if(!ev.repeat)attackQueued=true}keys.add(k)});
window.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));
function enterOfficePreview(){startOffice(false)}
function officeEnd(){
 changePhase('won','ОФИС ЗАЧИЩЕН!','13 обычных врагов и босс Человек ПРЕПАК повержены. Следующий уровень добавим в следующем обновлении.','ИГРАТЬ ОФИС СНОВА');
 status.textContent='Уровень 2 пройден. Босс ПРЕПАК побеждён.';
}
function storeEnd(){
 changePhase('won','ФИНАЛ! МОРЖЕНАЛЬЕОСТЬ ПОВЕРЖЕНА!','Тимур прошёл три уровня и победил Морженальеость в двух фазах. Теперь у босса есть спрайты, платформа и луч, который сжигает даже обычных врагов.','ПРОЙТИ ЗАНОВО С НАЧАЛА');
 status.textContent='Три уровня пройдены — финальный босс побеждён!';
}
function goToNextStage(){
 if(!victoryReady||phase!=='playing')return;
 victoryReady=false;$('next').hidden=true;
 if(currentStage==='street')startOffice(false);
 else if(currentStage==='office')startStore(false);
 else storeEnd();
}
$('next').addEventListener('click',goToNextStage);



$('restart').addEventListener('click',restart);$('pause').addEventListener('click',togglePause);
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').textContent='♫ Звук: '+(soundOn?'ON':'OFF');$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)confirmBeep()});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('shell').requestFullscreen()}catch{}resize()});
play.addEventListener('click',()=>{if(phase==='paused'){changePhase('playing')}else start()});
Promise.all(Object.entries(window.FIGHTER_ASSETS).map(([name,url])=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{IM[name]=im;res()};im.onerror=()=>rej(Error('Cannot load: '+name));im.src=url}))).then(()=>{worldW=H*IM.stage.naturalWidth/IM.stage.naturalHeight;changePhase('intro','The Adventures of Тимур!','Три полноценных уровня, 3 жизни на всю игру и финальный удар по Моржу. Пройди улицу, офис и магазин по порядку через кнопку «ДАЛЕЕ».','НАЧАТЬ ИГРУ');status.textContent='Готово. Тапай по экрану или используй клавиатуру.';play.disabled=false}).catch(err=>{changePhase('loading','ОШИБКА ЗАГРУЗКИ',err.message,'НЕДОСТУПНО');status.textContent=err.message;});
window.__fighterDebug=()=>({phase,currentStage,player:p&&{x:p.x,y:p.y,hp:p.hp,state:p.state,dir:p.dir},enemies:enemies.map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,hp:e.hp,state:e.state,dir:e.dir})),potions:potions.map(pt=>({x:pt.x,y:pt.y,state:pt.state})),cam,worldW,viewW:W,loaded:Object.keys(IM).length,victoryReady,heroScale:HERO_SCALE,regularKills,spawnedTrashCount,bossSpawned,bossDefeated,officeSpawned,officeKills,officeBagKills,officeTrashKills,storeSpawned,storeKills,storeBagKills,storePrepackKills,storeCleared,storeBossThreshold:STORE_BOSS_KILL_THRESHOLD,liveEnemyCount:liveEnemies().length,walrus:walrus&&{mode:walrus.mode,phase:walrus.phase,state:walrus.state,anim:walrus.anim,attackHit:walrus.attackHit,clock:walrus.flightClock,hp:walrus.hp,maxHp:walrus.maxHp,aimX:walrus.aimX,x:walrus.x},shots:shots.map(sh=>({x:sh.x,y:sh.y,dir:sh.dir})),left:enemiesLeftCount(),visibleRange:[cam,cam+W],corpses:enemies.filter(e=>e.state==='dead').length,potionDropTimer,lives,officeQueue:officeSpawnQueue.slice(),storeQueue:storeSpawnQueue.slice(),officeObstacles:currentStage==='office'?OFFICE_FURNITURE:[],storeObstacles:currentStage==='store'?STORE_FURNITURE:[],blockedAtPlayer:blockedByFence(p?.x??200,p?.y??448,19)});
requestAnimationFrame(tick);
})();
