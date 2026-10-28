/* Android-only visual launcher for original Krymskiy Chai. */
(()=>{'use strict';
if(document.getElementById('teaMainMenu'))return;
const html="<div id=\"teaMainMenu\" role=\"region\" aria-label=\"Главное меню Крымский чай\">\n<div id=\"teaMenuArtboard\">\n<img id=\"teaMenuBackground\" src=\"assets/tea-menu-hq.png\" alt=\"Офисная кухня. Максим и Николай беседуют у стола и чайника\" draggable=\"false\"/>\n<nav id=\"teaMenuHitboxes\" aria-label=\"Меню игры\">\n<button id=\"teaMenuNew\" type=\"button\" aria-label=\"Новая игра\"></button>\n<button id=\"teaMenuOptions\" type=\"button\" aria-label=\"Настройки\"></button>\n<button id=\"teaMenuBest\" type=\"button\" aria-label=\"Рекорды\"></button>\n<button id=\"teaMenuExit\" type=\"button\" aria-label=\"Выход\"></button>\n</nav>\n<section id=\"teaMenuSettings\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"Настройки звука\">\n<div class=\"teaMenuWindow\"><h2>НАСТРОЙКИ</h2>\n<div class=\"teaVolumeHeader\"><label for=\"teaMusicVolume\">МУЗЫКА</label><output id=\"teaMusicPercent\">35%</output></div>\n<input id=\"teaMusicVolume\" type=\"range\" min=\"0\" max=\"100\" step=\"5\" value=\"35\" aria-label=\"Громкость музыки\"/>\n<div class=\"teaVolumeHeader\"><label for=\"teaEffectsVolume\">ЭФФЕКТЫ</label><output id=\"teaEffectsPercent\">85%</output></div>\n<input id=\"teaEffectsVolume\" type=\"range\" min=\"0\" max=\"100\" step=\"5\" value=\"85\" aria-label=\"Громкость звуковых эффектов\"/>\n<p class=\"teaMenuNote\">ГРОМКОСТЬ СОХРАНЯЕТСЯ НА ЭТОМ УСТРОЙСТВЕ</p>\n<button id=\"teaOptionsBack\" type=\"button\">◀ НАЗАД</button></div></section>\n<section id=\"teaMenuRecords\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"Рекорды\">\n<div class=\"teaMenuWindow\"><h2>ЛУЧШИЙ СЧЁТ</h2><div id=\"teaBestNumber\" class=\"teaBestScore\">0</div>\n<p class=\"teaMenuNote\">РЕКОРД ЭТОГО УСТРОЙСТВА</p><button id=\"teaRecordsBack\" type=\"button\">◀ НАЗАД</button></div>\n</section></div></div>";
document.body.insertAdjacentHTML('beforeend',html);
const cover=document.getElementById('teaMenuBackground');
cover.addEventListener('error',()=>{
  console.warn('Крымский чай: ожидание полноразмерной обложки');
  document.getElementById('teaMainMenu').hidden=true;
});
const $=id=>document.getElementById(id),menu=$('teaMainMenu'),settings=$('teaMenuSettings'),records=$('teaMenuRecords');
const engine=()=>window.KrymskiyTeaAndroid;
function closePanels(){settings.hidden=true;records.hidden=true}
function showMenu(){closePanels();menu.hidden=false;}
function hideMenu(){menu.hidden=true;closePanels();}
function doStart(){
 const api=engine();
 if(!api?.isReady?.()){
   $('teaMenuNew').setAttribute('aria-label','Загрузка игры');
   return;
 }
 if(api.start())hideMenu();
}
$('teaMenuNew').addEventListener('click',doStart);
$('teaMenuOptions').addEventListener('click',()=>{
 const api=engine(),v=api?.getVolumes?.()||{music:.35,effects:.85};
 $('teaMusicVolume').value=Math.round(v.music*100);
 $('teaEffectsVolume').value=Math.round(v.effects*100);
 $('teaMusicPercent').textContent=Math.round(v.music*100)+'%';
 $('teaEffectsPercent').textContent=Math.round(v.effects*100)+'%';
 closePanels();settings.hidden=false;
 $('teaMusicVolume').focus({preventScroll:true});
});
function soundChanged(){
 const m=Number($('teaMusicVolume').value)/100,e=Number($('teaEffectsVolume').value)/100;
 $('teaMusicPercent').textContent=Math.round(m*100)+'%';
 $('teaEffectsPercent').textContent=Math.round(e*100)+'%';
 engine()?.setVolumes?.(m,e);
}
$('teaMusicVolume').addEventListener('input',soundChanged);
$('teaEffectsVolume').addEventListener('input',soundChanged);
$('teaMenuBest').addEventListener('click',()=>{
 $('teaBestNumber').textContent=String(Math.max(0,Number(engine()?.getBest?.()||0)));
 closePanels();records.hidden=false;$('teaRecordsBack').focus({preventScroll:true});
});
$('teaOptionsBack').addEventListener('click',closePanels);
$('teaRecordsBack').addEventListener('click',closePanels);
$('teaMenuExit').addEventListener('click',()=>{
 try{
   const back=window.parent?.document?.getElementById('arcadeExitBtn');
   if(back){back.click();return}
 }catch(e){}
 window.history.length>1?history.back():showMenu();
});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape'||menu.hidden)return;
 if(!settings.hidden||!records.hidden){e.preventDefault();closePanels()}
});
window.addEventListener('tea-game-ready',()=>{
 $('teaMenuNew').setAttribute('aria-label','Новая игра');
});
window.TeaStartMenu={show:showMenu,hide:hideMenu,active:()=>!menu.hidden};
})();