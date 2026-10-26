/* Android only. TOFFI RAGE HUD B2; source game, music and saves remain original. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const gameFrame=$('gameFrame'),gameScreen=$('gameScreen'),play=$('play'),story=$('storyLayer');
if(!gameFrame||!gameScreen)return;
const styles=[
'body.b2-game #header,body.b2-game #playToolbar{display:none!important}',
'body.b2-game #app{height:100dvh!important;min-height:0!important}',
'body.b2-game #play{display:block!important;height:100%!important;min-height:0!important}',
'body.b2-game #gameScreen{height:100%!important;min-height:0!important}',
'body.b2-game #gameFrame{opacity:0!important;pointer-events:none!important}',
'body.b2-game #storyLayer{top:0!important}',
'#b2Root[hidden]{display:none!important}',
'#b2Root{position:absolute;inset:0;z-index:13;overflow:hidden;background:#07101c;touch-action:none}',
'#b2Road{position:absolute;top:var(--hud-h,214px);left:0;right:0;bottom:0;width:100%;height:calc(100% - var(--hud-h,214px));display:block;image-rendering:pixelated;touch-action:none}',
'#b2HUD{position:absolute;top:0;left:0;width:100%;height:var(--hud-h,214px);display:block;image-rendering:pixelated;touch-action:manipulation}',
'#b2Left,#b2Right{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));height:49px;width:49px;border:3px solid #91a8b8;background:#102638db;color:#fff5df;font:900 21px monospace;touch-action:manipulation;z-index:4}',
'#b2Left{left:12px}#b2Right{right:12px}',
'body.android-arcade-active[data-android-game="toffi"] #nativeArcadePause{top:max(5px,env(safe-area-inset-top));left:max(5px,env(safe-area-inset-left));min-width:35px;min-height:32px;padding:3px 6px;font-size:14px;border-width:2px}'
].join('\n');
const sheet=document.createElement('style');sheet.textContent=styles;document.head.appendChild(sheet);
const root=document.createElement('div');root.id='b2Root';root.hidden=true;
root.innerHTML='<canvas id="b2Road"></canvas><canvas id="b2HUD"></canvas><button id="b2Left" aria-label="Влево">◀</button><button id="b2Right" aria-label="Вправо">▶</button>';
gameScreen.appendChild(root);
const road=root.querySelector('#b2Road'),hud=root.querySelector('#b2HUD');
const C=hud.getContext('2d'),R=road.getContext('2d',{alpha:false});
const glyph=document.createElement('canvas'),G=glyph.getContext('2d');
let game=null,scene=null,visible=false,lastDraw=0,lastStops=[],errCount=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b));
function box(x,y,w,h,r,fill,stroke,weight=1){
 C.beginPath();C.roundRect(x,y,w,h,r);if(fill){C.fillStyle=fill;C.fill();}
 if(stroke){C.strokeStyle=stroke;C.lineWidth=weight;C.stroke();}
}
function pix(s,x,y,size=12,color='#e6edf0',maxWidth=500,align='left'){
 s=String(s).toUpperCase();
 const base=Math.max(7,Math.round(size/1.5)),scale=size/base;
 G.font='900 '+base+'px Arial Black,Arial,sans-serif';
 while(s.length>2&&G.measureText(s).width*scale>maxWidth)s=s.slice(0,-2)+'…';
 const width=Math.ceil(G.measureText(s).width)+4;
 glyph.width=width;glyph.height=base+7;G.font='900 '+base+'px Arial Black,Arial,sans-serif';
 G.fillStyle=color;G.textBaseline='top';G.fillText(s,2,1);
 const dw=width*scale;if(align==='right')x-=dw;if(align==='center')x-=dw/2;
 C.imageSmoothingEnabled=false;C.drawImage(glyph,Math.round(x),Math.round(y),Math.ceil(dw),Math.ceil(glyph.height*scale));
}
function rect(x,y,w,h,color){C.fillStyle=color;C.fillRect(x,y,w,h);}
function card(x,y,w,h){
 C.save();C.shadowColor='#000b';C.shadowBlur=4;C.shadowOffsetY=3;
 box(x,y,w,h,10,'#3d5363');C.restore();
 box(x+.5,y+.5,w-1,h-1,9,'#253b4c','#b8a88d',1.3);
 box(x+4,y+4,w-8,h-8,7,'#111f2e','#617786',1);
 const grd=C.createLinearGradient(x,y,x+w,y+h);
 grd.addColorStop(0,'#182b3b');grd.addColorStop(1,'#07111e');
 box(x+7,y+7,w-14,h-14,5,grd,'#283b4b',1);
 [[7,7],[w-8,7],[7,h-8],[w-8,h-8]].forEach(a=>rect(x+a[0],y+a[1],2,2,'#b8a68b'));
}
function clock(x,y){
 C.beginPath();C.arc(x,y,8,0,Math.PI*2);C.strokeStyle='#d6dbd4';C.lineWidth=2;C.stroke();
 C.beginPath();C.moveTo(x,y-5);C.lineTo(x,y);C.lineTo(x+5,y+3);C.stroke();
}
function gauge(x,y,value){
 C.strokeStyle='#71c487';C.lineWidth=2;C.beginPath();C.arc(x,y,8,Math.PI*.75,Math.PI*2.2);C.stroke();
 const angle=Math.PI*(.8+1.45*value/145);C.strokeStyle='#ed9f4e';C.beginPath();
 C.moveTo(x,y);C.lineTo(x+7*Math.cos(angle),y+7*Math.sin(angle));C.stroke();
}
function metric(type,y,t){
 const x=5,w=128,h=51;card(x,y,w,h);
 pix(type==='time'?'ВРЕМЯ':type==='speed'?'СКОРОСТЬ':'СОСТОЯНИЕ',x+11,y+8,10,'#bdcbd4',105);
 if(type==='time'){
  clock(x+21,y+33);
  const secs=Math.max(0,Math.round(t.time));
  const value=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  pix(value,x+38,y+25,20,'#e6eef3',81);
 }else if(type==='speed'){
  gauge(x+21,y+33,t.speed);
  pix(t.speed,x+38,y+24,21,'#ffb75b',57);
  pix('КМ/Ч',x+w-7,y+29,9,'#ffd1a0',37,'right');
 }else{
  rect(x+10,y+28,72,16,'#050e17');rect(x+12,y+30,68,12,'#1b333a');
  rect(x+12,y+30,Math.round(68*clamp(t.health/100,0,1)),12,t.health>60?'#64d66e':t.health>30?'#d9bf58':'#e76354');
  for(let i=17;i<80;i+=9)rect(x+i,y+30,2,12,'#14383a');
  pix(t.health+'%',x+w-7,y+25,18,'#ffb358',43,'right');
 }
}
function route(t,stops){
 const x=138,y=42,w=114,h=166;card(x,y,w,h);
 pix('МАРШРУТ',x+w/2,y+10,12,'#e6eaeb',104,'center');
 const names=stops&&stops.length===4?stops:[
  {name:'СКЛАД',at:0},{name:'ГОРОД',at:155},{name:'ТРАССА',at:560},{name:'ТАМОЖНЯ',at:4200}
 ];
 const rail=x+18,top=y+41,step=27;
 rect(rail-2,top-4,4,step*3+10,'#738993');
 const limit=names[3].at||4200,progress=clamp((t.distance||0)/limit,0,1);
 rect(rail-1,top-4,2,step*3*progress,'#f8a448');
 names.forEach((s,i)=>{
  let iy=top+i*step;
  const passed=t.distance>=s.at,current=passed&&(i===3||t.distance<(names[i+1]?.at??Infinity));
  rect(rail-6,iy-5,12,12,'#0c1923');
  rect(rail-4,iy-3,8,8,current?'#f6ab53':passed?'#8dd2a9':'#708d9c');
  pix(s.name,x+30,iy-4,9,current?'#ffe4b5':'#c4d2da',w-35);
 });
 rect(x+10,y+h-37,w-20,1,'#71818f');
 pix('ПРОЙДЕНО',x+10,y+h-30,9,'#bccbd1',78);
 pix(t.progress+'%',x+w-9,y+h-20,16,'#ffa64c',58,'right');
}
function portrait(){
 const x=255,y=42,w=164,h=130;card(x,y,w,h);
 pix('ИГОРЬ',x+13,y+9,10,'#ccdae1',85);
 const bx=x+9,by=y+26,bw=w-18,bh=92;
 rect(bx,by,bw,bh,'#0e1c29');
 if(scene){
  C.save();C.beginPath();C.rect(bx,by,bw,bh);C.clip();
  C.imageSmoothingEnabled=false;
  // 130x82 original sprite from the actual animated game's Canvas, including belt and wheel.
  C.drawImage(scene,282,359,130,82,bx,by,bw,bh);C.restore();
 }
 C.strokeStyle='#8399a5';C.strokeRect(bx+.5,by+.5,bw-1,bh-1);
}
function speech(s){
 const x=255,y=175,w=164,h=36,tail=344;
 C.save();C.shadowColor='#000b';C.shadowBlur=3;
 C.beginPath();C.moveTo(x+3,y);C.lineTo(tail-9,y);C.lineTo(tail,y-9);
 C.lineTo(tail+9,y);C.lineTo(x+w-3,y);C.lineTo(x+w,y+3);
 C.lineTo(x+w,y+h-4);C.lineTo(x+w-4,y+h);C.lineTo(x+3,y+h);
 C.lineTo(x,y+h-4);C.lineTo(x,y+3);C.closePath();C.fillStyle='#f1eddf';C.fill();
 C.lineWidth=1.5;C.strokeStyle='#212b37';C.stroke();C.restore();
 const e=s?.emo||'neutral';
 const lines=e==='happy'?['ОТЛИЧНО ЕДЕМ!','ТАК ДЕРЖАТЬ!']:
 e==='bruised'?['ФУРУ ПОТРЕПАЛО…','НО ЕДЕМ ДАЛЬШЕ!']:
 e==='alarm'?['ТОПЛИВО НА НУЛЕ!','ИЩЕМ ЗАПРАВКУ!']:
 e==='worry'?['ОСТОРОЖНЕЕ…','ДЕРЖИ ПОЛОСУ!']:
 ['ДОРОГА НОРМАЛЬНАЯ.','ДЕРЖИМ КУРС.'];
 pix(lines[0],x+8,y+7,10,'#182134',w-15);
 pix(lines[1],x+8,y+20,10,'#182134',w-15);
}
function fitCanvas(canvas,w,h){
 const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.max(1,Math.round(w*dpr)),ch=Math.max(1,Math.round(h*dpr));
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 return dpr;
}
function drawHud(t,stops,s){
 const width=root.clientWidth,height=214*width/424;
 root.style.setProperty('--hud-h',height+'px');
 const dpr=fitCanvas(hud,width,height);
 C.setTransform(dpr*width/424,0,0,dpr*width/424,0,0);
 C.clearRect(0,0,424,214);
 const bg=C.createLinearGradient(0,0,0,214);bg.addColorStop(0,'#091522');bg.addColorStop(1,'#162e40');
 rect(0,0,424,214,bg);rect(0,211,424,3,'#9b9d94');
 pix('TOFFI',59,10,19,'#ffe0ab',91);pix('RAGE',125,10,19,'#ed8e49',90);
 pix('РЕЙС',352,13,9,'#b1cbd1',45);pix(String(t.level).padStart(2,'0'),410,13,10,'#fad093',24,'right');
 metric('time',42,t);metric('speed',97,t);metric('health',152,t);route(t,stops);portrait();speech(s);
}
function drawRoad(){
 const w=road.clientWidth,h=road.clientHeight;if(!w||!h)return;
 fitCanvas(road,w,h);const dw=road.width,dh=road.height;
 const scale=Math.max(dw/270,dh/518),sw=dw/scale,sh=dh/scale;
 R.imageSmoothingEnabled=false;R.drawImage(scene,(270-sw)/2,(518-sh)/2,sw,sh,0,0,dw,dh);
}
function tick(now){
 requestAnimationFrame(tick);
 if(!root.isConnected)return;
 try{
  const api=gameFrame.contentWindow?.__toffi,doc=gameFrame.contentDocument,s=api?.state?.();
  const briefing=doc?.getElementById('briefing');
  const run=!!(api&&s&&doc?.getElementById('scene')&&getComputedStyle(play).display!=='none'&&
   ['cinematic','run','pause'].includes(s.mode)&&
   (!briefing||getComputedStyle(briefing).display==='none')&&
   !story?.classList.contains('active'));
  if(!run){if(visible){visible=false;root.hidden=true;document.body.classList.remove('b2-game');}return;}
  if(!visible){visible=true;root.hidden=false;document.body.classList.add('b2-game');}
  game=api;scene=doc.getElementById('scene');
  if(now-lastDraw>80){
   let stops=null;
   try{stops=gameFrame.contentWindow.__toffiHUDStops?.();}catch(e){}
   const t=api.hudTelemetry();t.level=(window.__toffiUnified?.getLevel?.()??0)+1;
   drawHud(t,stops,s);lastDraw=now;
  }
  drawRoad();
 }catch(e){if(errCount++<3)console.warn('B2 Android HUD',e);}
}
function steer(dir){try{game?.move?.(dir);}catch(e){}}
root.querySelector('#b2Left').addEventListener('pointerdown',e=>{e.preventDefault();steer(-1);});
root.querySelector('#b2Right').addEventListener('pointerdown',e=>{e.preventDefault();steer(1);});
road.addEventListener('pointerdown',e=>{e.preventDefault();const r=road.getBoundingClientRect();steer(e.clientX<r.left+r.width/2?-1:1);});
hud.addEventListener('pointerdown',e=>{
 const r=hud.getBoundingClientRect(),x=(e.clientX-r.left)*424/r.width,y=(e.clientY-r.top)*214/r.height;
 if(x>138&&x<252&&y>42&&y<208){try{let s=game?.state?.();if(s)s.routeView=s.routeView==='details'?'map':'details';}catch(e){}}
});
requestAnimationFrame(tick);
})();
