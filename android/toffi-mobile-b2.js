/* Toffi Rage Android HUD B2: canvas/pixel typography, original game telemetry and portrait. */
(()=>{'use strict';
if(window.__toffiB2)return;
const W=424,H=236,el=document.createElement('div');el.id='toffiB2';el.hidden=true;
el.innerHTML='<div id="toffiB2World"><canvas id="toffiB2Road"></canvas><button id="toffiB2Left" class="b2Dir">◀</button><button id="toffiB2Right" class="b2Dir">▶</button></div><div id="toffiB2Head"><canvas id="toffiB2HUD" width="424" height="236"></canvas></div><div id="toffiB2Folders" aria-label="Собранные папки" hidden><span class="b2FolderIcon" aria-hidden="true"></span><span class="b2FolderTitle">ПАПКИ</span><span id="toffiB2FolderValue" class="b2FolderValue">0/5</span></div>';
document.body.appendChild(el);
const $=id=>document.getElementById(id),hud=$('toffiB2HUD'),world=$('toffiB2Road'),g=hud.getContext('2d'),r=world.getContext('2d',{alpha:false}),mini=document.createElement('canvas'),mc=mini.getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const folderBadge=$('toffiB2Folders'),folderValue=$('toffiB2FolderValue');let active=false,api=null,last=null,detail=false,tickNo=0,lastTime=0,stage=-1;
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function rounded(x,y,w,h,rr){g.beginPath();g.roundRect(x,y,w,h,rr)}
function type(s,x,y,n=11,c='#dce6eb',mw=100,align='left'){
 s=String(s);let sz=Math.max(7,Math.round(n*.80));mc.font='900 '+sz+'px Arial Black,Arial,sans-serif';
 mini.width=Math.ceil(mc.measureText(s).width)+6;mini.height=sz+6;
 mc.font='900 '+sz+'px Arial Black,Arial,sans-serif';mc.textBaseline='top';
 mc.fillStyle='#17202b';mc.fillText(s,3,2);mc.fillStyle=c;mc.fillText(s,2,1);
 let w=mini.width*1.27,h=mini.height*1.27;if(w>mw){h*=mw/w;w=mw}
 if(align==='right')x-=w;if(align==='center')x-=w/2;
 g.imageSmoothingEnabled=false;g.drawImage(mini,Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
}
function casing(x,y,w,h){
 g.save();g.shadowColor='#000b';g.shadowBlur=4;g.shadowOffsetY=2;rounded(x,y,w,h,9);g.fillStyle='#3c5061';g.fill();g.restore();
 rounded(x+.5,y+.5,w-1,h-1,9);g.strokeStyle='#c3ad8a';g.lineWidth=1.4;g.stroke();
 rounded(x+3,y+3,w-6,h-6,7);g.fillStyle='#07111b';g.fill();
 let fill=g.createLinearGradient(x+6,y+6,x+w-6,y+h-6);fill.addColorStop(0,'#213347');fill.addColorStop(.6,'#122338');fill.addColorStop(1,'#091626');
 rounded(x+6,y+6,w-12,h-12,5);g.fillStyle=fill;g.fill();
 rounded(x+5,y+5,w-10,h-10,6);g.strokeStyle='#576f7d';g.lineWidth=1;g.stroke();
 for(const [dx,dy] of [[7,7],[w-8,7],[7,h-8],[w-8,h-8]]){rect(x+dx-1,y+dy-1,3,3,'#050c15');rect(x+dx,y+dy,1,1,'#cfb997')}
}
const fmt=n=>{n=Math.max(0,Math.ceil(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
function drawSpeedometer(x,y,speed){
 const cx=x+22,cy=y+35,rad=10.5,start=Math.PI*.82,sweep=Math.PI*1.40;
 g.save();g.lineCap='square';
 for(let i=0;i<25;i++){
  const a=start+(sweep*i/24);g.strokeStyle=i<13?'#55c36e':i<19?'#f3ca5b':'#e4744d';
  g.lineWidth=2.3;g.beginPath();g.arc(cx,cy,rad,a,a+sweep/27);g.stroke();
 }
 for(let i=0;i<=9;i++){
  const a=start+sweep*i/9;
  const x1=cx+Math.cos(a)*7.7,y1=cy+Math.sin(a)*7.7;
  const x2=cx+Math.cos(a)*12.6,y2=cy+Math.sin(a)*12.6;
  g.strokeStyle=i===0||i===9?'#e0d7bb':'#a9c5bb';g.lineWidth=i%3===0?1.4:1;
  g.beginPath();g.moveTo(Math.round(x1),Math.round(y1));g.lineTo(Math.round(x2),Math.round(y2));g.stroke();
 }
 const ang=start+sweep*clamp(Number(speed)||0,0,180)/180;
 const endX=cx+Math.cos(ang)*8.5,endY=cy+Math.sin(ang)*8.5;
 g.strokeStyle='#101923';g.lineWidth=3.4;g.beginPath();g.moveTo(cx,cy);g.lineTo(endX,endY);g.stroke();
 g.strokeStyle='#ffe8b0';g.lineWidth=1.9;g.beginPath();g.moveTo(cx,cy);g.lineTo(endX,endY);g.stroke();
 g.fillStyle='#ff9945';g.beginPath();g.arc(cx,cy,2.3,0,Math.PI*2);g.fill();g.restore();
}
function drawTruckHealth(x,y,w,h,health){
 const hp=clamp(Number(health)||0,0,100),by=y+30;
 // Original HUD motif: the truck's cargo box IS the damage gauge.
 // Trailer and cab share one chassis, instead of separate gauge and icon.
 // A left-facing cab and a rightward cargo gauge. Damage still eats the
 // cargo bar from RIGHT to LEFT; only the cab direction/position changes.
 rect(x+7,by-4,70,19,'#050e19');
 rect(x+23,by-3,52,13,'#8b9ca7');
 rect(x+25,by-1,48,9,'#1a3336');
 const fill=hp>60?'#4bdd67':hp>30?'#e9c04a':'#eb6250';
 rect(x+25,by-1,Math.round(48*hp/100),9,fill);
 for(let xx=32;xx<73;xx+=7)rect(x+xx,by-1,1,9,'#101e28aa');
 // Cab faces left: windshield and bumper are on its left-hand edge.
 rect(x+9,by-2,15,12,'#dbe5e9');rect(x+10,by,13,2,'#9daebd');
 rect(x+9,by+1,6,5,'#45677b');rect(x+7,by+5,3,4,'#b5c0ca');
 rect(x+9,by+10,66,2,'#8495a5');
 for(const wx of [x+11,x+35,x+66]){rect(wx,by+10,7,4,'#050c15');rect(wx+2,by+11,3,3,'#405869')}
 type(Math.round(hp)+'%',x+w-6,y+27,15.3,hp>60?'#ffb95f':hp>30?'#ffd46b':'#ff9176',35,'right');
}
function drawRouteTruck(cx,cy){
 const x=Math.round(cx),y=Math.round(cy);
 // Orange rolling cargo marker follows the rail between checkpoints.
 rect(x-10,y-6,19,13,'#08121a');rect(x-8,y-4,11,7,'#f6a342');
 rect(x-6,y-3,7,4,'#f7d295');rect(x+3,y-2,5,5,'#dbe8e7');
 rect(x+5,y-1,2,2,'#63869b');rect(x-6,y+4,4,3,'#182733');rect(x+4,y+4,4,3,'#182733');
 rect(x-5,y+5,2,1,'#b4c3c9');rect(x+5,y+5,2,1,'#b4c3c9');
}
function meter(kind,x,y,w,h,t){
 casing(x,y,w,h);
 const label=kind==='time'?'ВРЕМЯ':kind==='speed'?'СКОРОСТЬ':'СОСТОЯНИЕ';
 type(label,x+9,y+7,10.5,'#b7ccd7',w-18);
 if(kind==='time'){type('◷',x+9,y+22,15,'#deebdf',20);type(fmt(t.time),x+34,y+22,21,'#f1f5ee',w-40)}
 if(kind==='speed'){
  drawSpeedometer(x,y,t.speed);
  type(t.speed,x+43,y+22,21.5,'#ffa848',46);
  type('КМ/Ч',x+w-5,y+32,8.5,'#e6ba75',30,'right');
 }
 if(kind==='health')drawTruckHealth(x,y,w,h,t.health);
}
const firstStops=['СКЛАД','ГОРОД','ТРАССА','ТАМОЖНЯ'];
function route(t){
 const x=138,y=56,w=114,h=160;casing(x,y,w,h);type('МАРШРУТ',x+9,y+8,11,'#ebeeea',w-18);
 if(detail){
  type('СЕЙЧАС',x+9,y+36,9,'#d4b579',w-18);type(t.phase||'РЕЙС',x+9,y+51,9,'#eef1f2',w-18);
  type('ДАЛЬШЕ',x+9,y+76,9,'#d4b579',w-18);type(t.next||'ФИНИШ',x+9,y+91,9,'#eef1f2',w-18);
  type('ДО ТОЧКИ',x+9,y+119,9,'#b9c9d5',w-18);type(Math.round(t.toNext||0)+' М',x+w-8,y+135,13,'#ffa94c',w-18,'right');return;
 }
 const names=stage===0?firstStops:['СТАРТ',String(t.phase||'ЭТАП').toUpperCase(),String(t.next||'ЦЕЛЬ').toUpperCase(),'ФИНИШ'];
 let a=clamp(t.progress/100,0,1),bx=x+18,by=y+41,gap=25;
 rect(bx-1,by,3,gap*3+3,'#6b8190');rect(bx-1,by,3,Math.round(gap*3*a),'#5bd17a');
 names.forEach((name,i)=>{
  let yy=by+i*gap,cur=i===Math.min(3,Math.floor(a*3)),passed=i/3<a;
  rect(bx-5,yy-4,11,10,'#05101a');rect(bx-3,yy-2,7,6,cur?'#ffa544':passed?'#85ce9c':'#728da0');
  type(name,x+29,yy-6,9,cur?'#fff2c7':'#bdcfd9',w-34);
 });
 // Draw over the checkpoints so it always visibly follows the route.
 drawRouteTruck(bx+3,by+gap*3*a);
 rect(x+9,y+135,w-18,1,'#516b7b');
 type('ПРОЙДЕНО',x+9,y+141,8,'#c0d1db',58);
 type(t.progress+'%',x+w-8,y+140,14,'#ffaf51',38,'right');
}
function portrait(scene){
 const x=257,y=56,w=160,h=132;casing(x,y,w,h);type('ИГОРЬ',x+10,y+6,10,'#d5e0e9',65);
 g.save();rounded(x+6,y+21,w-12,h-27,4);g.clip();rect(x+6,y+21,w-12,h-27,'#07131f');
 // Copy the actual original driver's sprite from the live mission canvas.
 // Its changing emotions, hands, seatbelt, steering wheel, and cab stay intact.
 if(scene){
   // Contain, never deform: the approved original Igor sprite is exactly 130x82.
   const innerW=w-12,innerH=h-27,scale=Math.min(innerW/130,innerH/82);
   const pw=130*scale,ph=82*scale;
   g.imageSmoothingEnabled=false;
   g.drawImage(scene,282,359,130,82,x+6+(innerW-pw)/2,y+21+(innerH-ph)/2,pw,ph);
  }
 g.restore();
}
const chats={
 neutral:['Дорога нормальная.','Держим курс.'],happy:['Отлично едем!','Так держать!'],
 worry:['Блин...','Надо аккуратнее.'],bruised:['Фуру потрепало...','Но едем дальше!'],alarm:['Топливо на нуле!','Надо заправиться!']
};
function talk(state){
 const x=249,y=188,w=171,h=44,tip=338;
 g.save();g.shadowBlur=3;g.shadowColor='#000b';g.shadowOffsetY=2;
 g.fillStyle='#070d14';g.beginPath();g.moveTo(x+3,y);g.lineTo(tip-10,y);g.lineTo(tip,y-10);g.lineTo(tip+10,y);g.lineTo(x+w-3,y);g.lineTo(x+w,y+3);g.lineTo(x+w,y+h-3);g.lineTo(x+w-3,y+h);g.lineTo(x+3,y+h);g.lineTo(x,y+h-3);g.lineTo(x,y+3);g.closePath();g.fill();g.restore();
 g.fillStyle='#eae6de';g.beginPath();g.moveTo(x+4,y+3);g.lineTo(tip-8,y+3);g.lineTo(tip,y-7);g.lineTo(tip+8,y+3);g.lineTo(x+w-4,y+3);g.lineTo(x+w-3,y+4);g.lineTo(x+w-3,y+h-4);g.lineTo(x+w-4,y+h-3);g.lineTo(x+4,y+h-3);g.lineTo(x+3,y+h-4);g.lineTo(x+3,y+4);g.closePath();g.fill();
 const words=chats[state.emo]||chats.neutral;
 // The original dialogue used plain native bold text. Render it directly
 // at pixel scale to avoid blurry double-resampling of miniature Cyrillic glyphs.
 g.save();g.imageSmoothingEnabled=false;g.textAlign='left';g.textBaseline='top';
 g.font='bold 11px Arial,sans-serif';g.fillStyle='#14212b';
 g.fillText(words[0],x+8,y+10,w-16);
 g.fillText(words[1],x+8,y+24,w-16);
 g.restore();
}
function paint(t,st,scene){
 g.clearRect(0,0,W,H);
 const grad=g.createLinearGradient(0,0,0,224);grad.addColorStop(0,'#070f1a');grad.addColorStop(1,'#1a3443');rect(0,0,W,224,grad);
 // The left-aligned name stays clear of the centered OnePlus camera cutout.
 casing(7,5,164,39);
 type('TOFFI',13,10,22,'#f9dfa8',84);
 type('RAGE',95,10,22,'#f69a4e',69);
 type('РЕЙС '+String(stage+1).padStart(2,'0'),W-8,17,11,'#b6ccd7',64,'right');
 meter('time',6,56,127,50,t);meter('speed',6,110,127,50,t);meter('health',6,164,127,50,t);
 route(t);portrait(scene);
 // A stylized dashboard lip: metal edge + inset glass seam and fasteners.
 rect(0,217,W,2,'#0a141f');
 rect(0,219,W,2,'#6f8390');
 rect(0,221,W,2,'#b1a28d');
 rect(0,223,W,1,'#111b25');
 for(let xx=13;xx<W;xx+=44){rect(xx,219,4,3,'#07111a');rect(xx+1,219,2,1,'#b8a98c')}
 talk(st);
}

function syncFolderCounter(telemetry){
 // Only the third main mission exposes docs and requiredDocs.
 // Read values from the original engine; never maintain a second count.
 const got=Number(telemetry?.docs),need=Number(telemetry?.requiredDocs);
 const visible=active&&Number.isFinite(got)&&Number.isFinite(need)&&need>0;
 folderBadge.hidden=!visible;
 if(!visible)return;
 const collected=Math.max(0,Math.trunc(got)),required=Math.trunc(need);
 const display=collected+'/'+required;
 if(folderValue.textContent!==display)folderValue.textContent=display;
 folderBadge.classList.toggle('complete',collected>=required);
 folderBadge.setAttribute('aria-label','Папки: '+collected+' из '+required);
}
function roadDraw(scene){
 const b=world.getBoundingClientRect();if(!b.width||!b.height)return;
 const dpr=Math.min(2,devicePixelRatio||1),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);
 if(world.width!==w||world.height!==h){world.width=w;world.height=h}
 const k=Math.max(w/270,h/518),sw=Math.min(270,w/k),sh=Math.min(518,h/k);
 r.imageSmoothingEnabled=false;r.drawImage(scene,(270-sw)/2,(518-sh)/2,sw,sh,0,0,w,h);
}
function sample(){
 try{const wrap=window.__toffiUnified,child=wrap?.debugChild?.(),st=child?.state?.(),scene=$('gameFrame')?.contentDocument?.querySelector('#scene');
 if(!wrap||!child||!st||!scene)return null;return {wrap,child,st,scene};}catch(e){return null}
}
function frame(now){
 requestAnimationFrame(frame);
 const s=sample(),story=$('storyLayer');
 const inStory=story&&story.classList.contains('active');
 const briefing=$('gameFrame')?.contentDocument?.getElementById('briefing');
 const briefingVisible=briefing&&getComputedStyle(briefing).display!=='none';
 // The scripted customs-parking arrival uses 'finish', not 'cinematic'.
 // Keep the same portrait HUD and full-width road throughout the animation.
 const should=!!s&&['run','pause','cinematic','finish','win'].includes(s.st.mode)&&!inStory&&!briefingVisible;
 if(active!==should){active=should;el.hidden=!active;if(!active)folderBadge.hidden=true;document.body.classList.toggle('toffi-b2-active',active)}
 if(!active)return;
 api=s.child;last=s.st;stage=s.wrap.getLevel?.()??0;
 if(++tickNo%2===0){try{roadDraw(s.scene)}catch(e){}}
 if(now-lastTime>75){lastTime=now;try{const telemetry=api.hudTelemetry();paint(telemetry,s.st,s.scene);syncFolderCounter(telemetry)}catch(e){console.warn('Toffi B2:',e)}}
}
function move(d){if(last?.mode==='run')try{api?.move?.(d)}catch(e){}}
$('toffiB2Left').addEventListener('pointerdown',e=>{e.preventDefault();move(-1)});
$('toffiB2Right').addEventListener('pointerdown',e=>{e.preventDefault();move(1)});
world.addEventListener('pointerdown',e=>{e.preventDefault();const b=world.getBoundingClientRect();move(e.clientX<b.left+b.width/2?-1:1)});
hud.addEventListener('pointerdown',e=>{let b=hud.getBoundingClientRect(),x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*H/b.height;if(x>=138&&x<=252&&y>=56&&y<=216)detail=!detail});
window.__toffiB2={active:()=>active,stats:()=>({level:stage,mode:last?.mode,width:world.width,height:world.height})};
requestAnimationFrame(frame);
})();