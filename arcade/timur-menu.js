/* Responsive, clickable title screen for The Adventures of Timur. */
(()=>{'use strict';
if(document.getElementById('timurTitleMenu'))return;
const html="<div id=\"timurTitleMenu\" role=\"region\" aria-label=\"Меню Приключения Тимура\">\n <div id=\"timurMenuBoard\">\n  <img id=\"timurMenuCover\" src=\"../krymskiy-chai/assets/timur-menu-hq.png\" alt=\"Тимур сражается с ожившими мусорками. Злобный морж наблюдает издалека.\" draggable=\"false\">\n  <nav id=\"timurMenuButtons\" aria-label=\"Главное меню\">\n   <button id=\"timurMenuNew\" type=\"button\" aria-label=\"Новая игра\"></button>\n   <button id=\"timurMenuOptions\" type=\"button\" aria-label=\"Настройки\"></button>\n   <button id=\"timurMenuBest\" type=\"button\" aria-label=\"Рекорды\"></button>\n   <button id=\"timurMenuExit\" type=\"button\" aria-label=\"Выход\"></button>\n  </nav>\n  <section id=\"timurMenuSettings\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"Настройки звука\"><div class=\"timurMenuPanel\">\n   <h2>НАСТРОЙКИ</h2>\n   <div class=\"timurRow\"><label for=\"timurMusic\">МУЗЫКА</label><output id=\"timurMusicPct\">30%</output></div>\n   <input id=\"timurMusic\" type=\"range\" min=\"0\" max=\"100\" step=\"5\" value=\"30\" aria-label=\"Громкость музыки\">\n   <div class=\"timurRow\"><label for=\"timurEffects\">ЭФФЕКТЫ</label><output id=\"timurEffectsPct\">100%</output></div>\n   <input id=\"timurEffects\" type=\"range\" min=\"0\" max=\"100\" step=\"5\" value=\"100\" aria-label=\"Громкость эффектов\">\n   <button id=\"timurOptionsBack\" type=\"button\">◀ НАЗАД</button></div>\n  </section>\n  <section id=\"timurMenuRecords\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"Рекорды\"><div class=\"timurMenuPanel\">\n   <h2>РЕКОРДЫ</h2><div id=\"timurBestValue\" class=\"timurRecord\">0</div>\n   <p class=\"timurNote\">ПОБЕЖДЕНО ВРАГОВ ЗА ИГРУ</p>\n   <button id=\"timurRecordsBack\" type=\"button\">◀ НАЗАД</button></div>\n  </section>\n </div>\n</div>";
document.body.insertAdjacentHTML('beforeend',html);
const $=id=>document.getElementById(id);
const menu=$('timurTitleMenu'),sets=$('timurMenuSettings'),recs=$('timurMenuRecords');
const engine=()=>window.TimurMenuAPI;
function closePanels(){sets.hidden=true;recs.hidden=true}
function show(){closePanels();menu.hidden=false}
function hide(){closePanels();menu.hidden=true}
$('timurMenuCover').addEventListener('error',()=>{console.warn('Ожидание изображения меню Тимура');hide()});
$('timurMenuNew').addEventListener('click',()=>{
 if(!engine()?.isReady?.())return;
 if(engine().start())hide();
});
$('timurMenuOptions').addEventListener('click',()=>{
 const v=engine()?.getVolumes?.()||{music:.3,effects:1};
 $('timurMusic').value=Math.round(v.music*100);
 $('timurEffects').value=Math.round(v.effects*100);
 $('timurMusicPct').textContent=Math.round(v.music*100)+'%';
 $('timurEffectsPct').textContent=Math.round(v.effects*100)+'%';
 closePanels();sets.hidden=false;$('timurMusic').focus({preventScroll:true});
});
function volumeChanged(){
 const m=Number($('timurMusic').value)/100,e=Number($('timurEffects').value)/100;
 $('timurMusicPct').textContent=Math.round(m*100)+'%';
 $('timurEffectsPct').textContent=Math.round(e*100)+'%';
 engine()?.setVolumes?.(m,e);
}
$('timurMusic').addEventListener('input',volumeChanged);
$('timurEffects').addEventListener('input',volumeChanged);
$('timurMenuBest').addEventListener('click',()=>{
 $('timurBestValue').textContent=String(engine()?.getBest?.()||0);
 closePanels();recs.hidden=false;$('timurRecordsBack').focus({preventScroll:true});
});
$('timurOptionsBack').addEventListener('click',closePanels);
$('timurRecordsBack').addEventListener('click',closePanels);
$('timurMenuExit').addEventListener('click',()=>{
 try{const b=window.parent.document.getElementById('arcadeExitBtn');if(b){b.click();return;}}catch(e){}
 if(history.length>1)history.back();else location.href='../index.html';
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden&&(!sets.hidden||!recs.hidden)){e.preventDefault();closePanels()}});
window.TimurMainMenu={show,hide,active:()=>!menu.hidden};
})();