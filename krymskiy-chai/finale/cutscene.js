/* КРЫМСКИЙ ЧАЙ — финальная кат-сцена (без повторного титульного кадра).
   No external dependencies, network requests, tracking, or added music. */
(()=>{'use strict';
const W=1280,H=720,canvas=document.getElementById('movie'),ctx=canvas.getContext('2d',{alpha:false});
const $=id=>document.getElementById(id);
const imageFiles=[
 '02_max_stare','03_mug_stare','04_max_stare_close',
 '05_big_gulp','06_eyes_focus','07_eyes_dilate','08_fire_awaken',
 '09_fire_overload','10_mission_complete'
];
const images=[];
// Repeated images are intentional: the rhythm accelerates like a film montage.
const shots=[
 {image:0,d:1.05,zoom:[1.02,1.13],x:[12,-8],y:[3,0],fx:'pause'},
 {image:1,d:.82, zoom:[1.08,1.15],x:[0,8],y:[0,-2],fx:'mug'},
 {image:2,d:.86, zoom:[1.07,1.18],x:[3,2],y:[0,1],fx:'pause'},
 {image:1,d:.60, zoom:[1.16,1.22],x:[4,-1],y:[3,0],fx:'mug'},
 {image:2,d:.44, zoom:[1.21,1.24],x:[2,0],y:[0,1],fx:'pause'},
 {image:1,d:.38, zoom:[1.19,1.21],x:[2,2],y:[0,0],fx:'mug'},
 {image:3,d:1.90,zoom:[1.01,1.13],x:[-8,8],y:[7,0],fx:'gulp',flash:.25},
 {image:4,d:1.55,zoom:[1.02,1.21],x:[0,0],y:[0,0],fx:'eyes',flash:.18},
 {image:5,d:1.55,zoom:[1.08,1.31],x:[0,0],y:[0,0],fx:'eyesMax',flash:.36},
 {image:6,d:1.95,zoom:[1.01,1.10],x:[0,0],y:[0,0],fx:'fire',flash:.65},
 {image:7,d:1.95,zoom:[1.06,1.19],x:[0,0],y:[0,0],fx:'fireMax',flash:.35},
 {image:8,d:1.75,zoom:[1.055,1.075],x:[0,-12],y:[0,0],fx:'rush',flash:.70},
 {image:8,d:3.50,zoom:[1.00,1.00],x:[0,0],y:[0,0],fx:'victory',flash:.3}
];
let total=0;for(const s of shots){s.start=total;total+=s.d;s.end=total;}
let t=0,paused=false,ready=false,prev=0,ended=false, dragSeek=false,completionSent=false;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,f)=>a+(b-a)*f;
function smooth(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function noise(n){let x=Math.sin(n*129.9898+78.233)*43758.5453;return x-Math.floor(x)}
function activeShot(sec){let j=shots.findIndex(s=>sec<s.end);if(j<0)j=shots.length-1;return {s:shots[j],index:j,p:clamp((sec-shots[j].start)/shots[j].d,0,1)}}
function image(s,p){
 const img=images[s.image]; if(!img) return;
 const zoom=mix(s.zoom[0],s.zoom[1],smooth(p));
 let x=mix(s.x[0],s.x[1],p),y=mix(s.y[0],s.y[1],p);
 if(s.fx==='eyes'||s.fx==='eyesMax'){
   const intensity=s.fx==='eyesMax'?12:5;
   x+=Math.round((Math.sin(t*61)+Math.sin(t*109)*.5)*intensity);
   y+=Math.round((Math.cos(t*89)+Math.sin(t*151)*.4)*intensity*.65);
 }
 if(s.fx==='fireMax') {x+=Math.sin(t*49)*4;y+=Math.cos(t*54)*3}
 if(s.fx==='rush'){x+=Math.sin(t*24)*5;y+=Math.sin(t*34)*2}
 ctx.save();ctx.translate(W/2+x,H/2+y);ctx.scale(zoom,zoom);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(img,-W/2,-H/2,W,H);ctx.restore();
}
function drawVignette(amount=.2){let v=ctx.createRadialGradient(640,340,185,640,350,790);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${amount})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}
function steam(p){
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<12;i++){
  const age=(t*.21+i*.18)%1,xx=355+i*23+Math.sin(t*2+i)*22,yy=470-age*500;
  const a=(1-age)*.055;
  ctx.fillStyle=`rgba(246,225,186,${a})`;
  ctx.fillRect(Math.round(xx),Math.round(yy),Math.max(2,Math.round(20*(1-age))),13);
 }
 ctx.restore();
}
function streaks(p,hard){
 const strength=hard?1:.52;
 ctx.save();ctx.globalCompositeOperation='screen';
 const n=hard?56:34;
 for(let i=0;i<n;i++){
  const ang=i*Math.PI*2/n+noise(i)*.2;
  const u=(t*(hard?1.8:1.2)+noise(i*3))%1;
  const r0=240+u*135,r1=r0+80+u*260;
  const a=hard?.42:.25;
  ctx.strokeStyle=(i%4===0?`rgba(255,254,210,${a})`:`rgba(255,137,27,${a*.75})`);
  ctx.lineWidth=hard?(i%5===0?6:2):(i%5===0?4:1);
  ctx.beginPath();ctx.moveTo(640+Math.cos(ang)*r0,355+Math.sin(ang)*r0);
  ctx.lineTo(640+Math.cos(ang)*r1,355+Math.sin(ang)*r1);ctx.stroke();
 }
 if(hard){ctx.fillStyle=`rgba(255,237,155,${.025+.04*(Math.sin(t*21)**2)})`;ctx.fillRect(0,0,W,H)}
 ctx.restore();
}
function flames(p,hard){
 ctx.save();ctx.globalCompositeOperation='screen';
 const power=hard?1.7:1;
 // Stylized flames rise only beside the silhouette, leaving Max's face readable.
 for(let side=0;side<2;side++){
  const base=side===0?160:1120;
  for(let i=0;i<15;i++){
   const px=base+(side===0?-1:1)*(i*11+Math.sin(t*3+i)*10);
   const wave=(t*175+i*37)%H;
   const h=40+noise(i*1.7)*120*power;
   const w=11+noise(i*3.33)*15;
   ctx.fillStyle=i%3===0?'rgba(255,228,53,.27)':'rgba(255,83,24,.31)';
   ctx.beginPath();ctx.moveTo(px-w/2,H-wave+5);ctx.lineTo(px+w/2,H-wave+5);ctx.lineTo(px+Math.sin(t*6+i)*17,H-wave-h);ctx.closePath();ctx.fill();
  }
 }
 for(let i=0;i<86;i++){
  const xx=noise(i*7.11)*W;
  const yy=(H+45-((t*(115+noise(i)*145)+noise(i*3)*H)%(H+110)));
  const sz=1+Math.floor(noise(i*11.7)*5)*power;
  ctx.fillStyle=i%3===0?'rgba(255,235,115,.5)':'rgba(255,108,21,.6)';
  ctx.fillRect(xx+Math.sin(t*2+i)*21,yy,sz,sz);
 }
 ctx.fillStyle=`rgba(255,141,17,${(.04+Math.sin(t*20)*.02)*power})`;ctx.fillRect(0,0,W,H);
 ctx.restore();
}
function rush(){
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<55;i++){
  const yy=(noise(i*12.34)*H)|0;
  const v=1100+noise(i*4.3)*1600;
  const xx=((noise(i*9.12)*1800+t*v)%(W+380))-300;
  const len=60+noise(i*2.99)*210;
  ctx.lineWidth=1+Math.floor(noise(i*5)*6);
  ctx.strokeStyle=i%3===0?'rgba(255,216,96,.38)':i%3===1?'rgba(110,221,255,.35)':'rgba(255,255,255,.17)';
  ctx.beginPath();ctx.moveTo(xx-len,yy);ctx.lineTo(xx,yy);ctx.stroke();
 }
 ctx.restore();
}
function fireworks(p){
 ctx.save();ctx.globalCompositeOperation='screen';
 const bursts=[{x:1045,y:130,start:.08},{x:335,y:148,start:.32},{x:1110,y:410,start:.65},{x:650,y:90,start:.95},{x:910,y:540,start:1.55},{x:210,y:370,start:1.95},{x:1040,y:240,start:2.4},{x:380,y:520,start:2.85}];
 const palettes=['#ffca62','#f9578a','#78e9ff','#8cff6b','#ffefba','#f5a246'];
 const elapsed=(document.body.dataset.embedded==='yes' && ended)?(performance.now()/1000)%9:p*shots[shots.length-1].d;
 for(let b=0;b<bursts.length;b++){
  const burst=bursts[b], age=elapsed-burst.start;
  if(age<0 || age>1.18) continue;
  for(let i=0;i<38;i++){
   const angle=i*Math.PI*2/38+noise(i+b*33)*.24;
   const vel=45+noise(i*13.3+b)*190;
   const xx=burst.x+Math.cos(angle)*vel*age;
   const yy=burst.y+Math.sin(angle)*vel*age+age*age*35;
   const size=age<.8?4:2;
   ctx.globalAlpha=Math.max(0,1-age/1.18);
   ctx.fillStyle=palettes[(i+b)%palettes.length];ctx.fillRect(Math.round(xx),Math.round(yy),size,size);
  }
 }
 ctx.globalAlpha=1;
 for(let i=0;i<90;i++){
  const speed=25+noise(i*1.1)*90;
  const x=noise(i*2.2)*W+Math.sin(elapsed*2+i)*26;
  const y=(noise(i*3.9)*H+elapsed*speed)%H;
  ctx.fillStyle=palettes[i%palettes.length];ctx.fillRect(x,y,4+(i%3)*2,3+(i%2)*3);
 }
 ctx.restore();
}
function sceneEffects(s,p){
 if(s.fx==='steam')steam(p);
 if(s.fx==='eyes')streaks(p,false);
 if(s.fx==='eyesMax')streaks(p,true);
 if(s.fx==='fire')flames(p,false);
 if(s.fx==='fireMax')flames(p,true);
 if(s.fx==='rush')rush();
 if(s.fx==='victory')fireworks(p);
 // Tiny impact flashes on the most important cuts.
 if(s.flash && p<.085){const a=s.flash*(1-p/.085);ctx.fillStyle=`rgba(255,238,186,${a})`;ctx.fillRect(0,0,W,H)}
 // First/last frame fades; no caption bars or labels are ever drawn.
 if(s.fade && p<.13){ctx.fillStyle=`rgba(0,0,0,${1-p/.13})`;ctx.fillRect(0,0,W,H)}
}
function render(){
 ctx.fillStyle='#090b14';ctx.fillRect(0,0,W,H);
 const {s,p}=activeShot(clamp(t,0,total-.00001));
 image(s,p);sceneEffects(s,p);drawVignette(s.fx==='victory'?.04:.13);
}
function format(sec){const n=Math.floor(sec);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
function syncUI(){
 if(!dragSeek)$('seek').value=Math.round(t/total*1000);
 $('timer').textContent=`${format(t)} / ${format(total)}`;
 $('toggle').textContent=paused?'▶ ПРОДОЛЖИТЬ':'Ⅱ ПАУЗА';
}
function run(now){
 const dt=prev?Math.min(.09,(now-prev)/1000):0;prev=now;
 if(ready && !paused && !ended){t+=dt;if(t>=total){t=total-.001;ended=true;paused=true;if(!completionSent){completionSent=true;window.parent?.postMessage({type:'krymskiy-finale-complete'},'*');}}}
 if(ready){render();syncUI()}
 requestAnimationFrame(run);
}
function seekTo(x,autoPlay){t=clamp(x,0,total-.001);ended=false;completionSent=false;if(autoPlay)paused=false;render();syncUI()}
function restart(){seekTo(0,true)}
function toggle(){if(!ready)return;if(ended){restart();return}paused=!paused;syncUI()}
window.addEventListener('message',e=>{if(e.data?.type==='krymskiy-finale-skip'){
 seekTo(shots[shots.length-1].start,true);
 // Final victory frame keeps fireworks running until the parent closes it.
 if(!completionSent){completionSent=true;window.parent?.postMessage({type:'krymskiy-finale-complete'},'*');}
 }});
$('restart').addEventListener('click',restart);
$('toggle').addEventListener('click',toggle);
$('finale').addEventListener('click',()=>seekTo(shots[11].start,true));
$('fullscreen').addEventListener('click',()=>{const e=$('stage'); if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else e.requestFullscreen?.().catch(()=>{});});
$('seek').addEventListener('pointerdown',()=>dragSeek=true);
$('seek').addEventListener('pointerup',()=>dragSeek=false);
$('seek').addEventListener('input',e=>{seekTo(Number(e.target.value)/1000*total,false);});
$('seek').addEventListener('change',()=>dragSeek=false);
document.addEventListener('keydown',e=>{
 if(['INPUT','BUTTON'].includes(document.activeElement?.tagName)&&![' ','ArrowLeft','ArrowRight'].includes(e.key))return;
 if(e.key===' '){e.preventDefault();toggle()}
 if(e.key==='r'||e.key==='R')restart();
 if(e.key==='f'||e.key==='F')$('fullscreen').click();
 if(e.key==='ArrowLeft')seekTo(t-1.8,false);
 if(e.key==='ArrowRight')seekTo(t+1.8,false);
});
requestAnimationFrame(run);
Promise.all(imageFiles.map((name,i)=>new Promise((resolve,reject)=>{
 const im=new Image();im.onload=()=>{images[i]=im;resolve()};im.onerror=()=>reject(new Error('Не открылся кадр '+name));im.src=`assets/${name}.webp`;
}))).then(()=>{
 ready=true;
 $('loadingText').textContent='Готово!';$('loading').classList.add('hidden');
 setTimeout(()=>$('loading').remove(),370);
 render();syncUI();
}).catch(err=>{$('loadingText').textContent=`Ошибка: ${err.message}. Проверьте, что папка assets находится рядом с index.html.`;document.querySelector('.loader')?.remove();});
})();
