/* Toffi Rage Android HUD B2: canvas/pixel typography, original game telemetry and portrait. */
(()=>{'use strict';
if(window.__toffiB2)return;
const W=424,H=224,el=document.createElement('div');el.id='toffiB2';el.hidden=true;
el.innerHTML='<div id="toffiB2World"><canvas id="toffiB2Road"></canvas><button id="toffiB2Left" class="b2Dir">◀</button><button id="toffiB2Right" class="b2Dir">▶</button></div><div id="toffiB2Head"><canvas id="toffiB2HUD" width="424" height="224"></canvas></div>';
document.body.appendChild(el);
const $=id=>document.getElementById(id),hud=$('toffiB2HUD'),world=$('toffiB2Road'),g=hud.getContext('2d'),r=world.getContext('2d',{alpha:false}),mini=document.createElement('canvas'),mc=mini.getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let active=false,api=null,last=null,detail=false,tickNo=0,lastTime=0,stage=-1;
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
function meter(kind,x,y,w,h,t){
 casing(x,y,w,h);
 const label=kind==='time'?'ВРЕМЯ':kind==='speed'?'СКОРОСТЬ':'СОСТОЯНИЕ';
 type(label,x+9,y+7,10.5,'#b7ccd7',w-18);
 if(kind==='time'){type('◷',x+9,y+22,15,'#deebdf',20);type(fmt(t.time),x+34,y+22,21,'#f1f5ee',w-40)}
 if(kind==='speed'){
  g.beginPath();g.arc(x+20,y+38,10,3.4,6);g.strokeStyle='#78d17c';g.lineWidth=2;g.stroke();
  type(t.speed,x+33,y+22,22,'#ffa848',w-56);type('КМ/Ч',x+w-7,y+32,8.3,'#e6ba75',27,'right');
 }
 if(kind==='health'){
  const hp=clamp(t.health,0,100),bx=x+9,by=y+31,bw=w-54;
  rect(bx-2,by-2,bw+4,15,'#040b13');rect(bx,by,bw,11,'#152f38');
  rect(bx,by,Math.round(bw*hp/100),11,hp>60?'#62d96b':hp>30?'#e9c54c':'#e96050');
  for(let i=0;i<bw;i+=8)rect(bx+i,by,2,11,'#17313a');
  type(hp+'%',x+w-6,y+26,16,'#ffb65c',44,'right');
 }
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
 rect(x+9,y+135,w-18,1,'#516b7b');
 type('ПРОЙДЕНО',x+9,y+141,8,'#c0d1db',58);
 type(t.progress+'%',x+w-8,y+140,14,'#ffaf51',38,'right');
}
function portrait(scene){
 const x=257,y=56,w=160,h=111;casing(x,y,w,h);type('ИГОРЬ',x+10,y+6,10,'#d5e0e9',65);
 g.save();rounded(x+6,y+21,w-12,h-27,4);g.clip();rect(x+6,y+21,w-12,h-27,'#07131f');
 // Copy the actual original driver's sprite from the live mission canvas.
 // Its changing emotions, hands, seatbelt, steering wheel, and cab stay intact.
 if(scene){g.imageSmoothingEnabled=false;g.drawImage(scene,282,359,130,82,x+6,y+21,w-12,h-27)}
 g.restore();
}
const chats={
 neutral:['Дорога нормальная.','Держим курс.'],happy:['Отлично едем!','Так держать!'],
 worry:['Блин...','Надо аккуратнее.'],bruised:['Фуру потрепало...','Но едем дальше!'],alarm:['Топливо на нуле!','Надо заправиться!']
};
function talk(state){
 const x=253,y=171,w=164,h=44,tip=341;
 g.save();g.shadowBlur=3;g.shadowColor='#000b';g.shadowOffsetY=2;
 g.fillStyle='#070d14';g.beginPath();g.moveTo(x+3,y);g.lineTo(tip-10,y);g.lineTo(tip,y-10);g.lineTo(tip+10,y);g.lineTo(x+w-3,y);g.lineTo(x+w,y+3);g.lineTo(x+w,y+h-3);g.lineTo(x+w-3,y+h);g.lineTo(x+3,y+h);g.lineTo(x,y+h-3);g.lineTo(x,y+3);g.closePath();g.fill();g.restore();
 g.fillStyle='#eae6de';g.beginPath();g.moveTo(x+4,y+3);g.lineTo(tip-8,y+3);g.lineTo(tip,y-7);g.lineTo(tip+8,y+3);g.lineTo(x+w-4,y+3);g.lineTo(x+w-3,y+4);g.lineTo(x+w-3,y+h-4);g.lineTo(x+w-4,y+h-3);g.lineTo(x+4,y+h-3);g.lineTo(x+3,y+h-4);g.lineTo(x+3,y+4);g.closePath();g.fill();
 const words=chats[state.emo]||chats.neutral;
 type(words[0],x+8,y+10,10.8,'#14202c',w-16);type(words[1],x+8,y+25,10.8,'#14202c',w-16);
}
function paint(t,st,scene){
 g.clearRect(0,0,W,H);
 const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#070f1a');grad.addColorStop(1,'#1a3443');rect(0,0,W,H,grad);
 casing(58,5,167,40);type('TOFFI',65,9,23,'#f9dfa8',86);type('RAGE',148,9,23,'#f69a4e',72);
 type('РЕЙС '+String(stage+1).padStart(2,'0'),W-8,16,11,'#b6ccd7',64,'right');
 meter('time',6,56,127,50,t);meter('speed',6,110,127,50,t);meter('health',6,164,127,50,t);
 route(t);portrait(scene);talk(st);rect(0,221,W,3,'#8197a0');
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
 const inStory=story&&getComputedStyle(story).display!=='none'&&getComputedStyle(story).opacity!=='0';
 const should=!!s&&['run','pause','cinematic'].includes(s.st.mode)&&!inStory;
 if(active!==should){active=should;el.hidden=!active;document.body.classList.toggle('toffi-b2-active',active)}
 if(!active)return;
 api=s.child;last=s.st;stage=s.wrap.getLevel?.()??0;
 if(++tickNo%2===0){try{roadDraw(s.scene)}catch(e){}}
 if(now-lastTime>75){lastTime=now;try{paint(api.hudTelemetry(),s.st,s.scene)}catch(e){console.warn('Toffi B2:',e)}}
}
function move(d){if(last?.mode==='run')try{api?.move?.(d)}catch(e){}}
$('toffiB2Left').addEventListener('pointerdown',e=>{e.preventDefault();move(-1)});
$('toffiB2Right').addEventListener('pointerdown',e=>{e.preventDefault();move(1)});
world.addEventListener('pointerdown',e=>{e.preventDefault();const b=world.getBoundingClientRect();move(e.clientX<b.left+b.width/2?-1:1)});
hud.addEventListener('pointerdown',e=>{let b=hud.getBoundingClientRect(),x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*H/b.height;if(x>=138&&x<=252&&y>=56&&y<=216)detail=!detail});
window.__toffiB2={active:()=>active,stats:()=>({level:stage,mode:last?.mode,width:world.width,height:world.height})};
requestAnimationFrame(frame);
})();