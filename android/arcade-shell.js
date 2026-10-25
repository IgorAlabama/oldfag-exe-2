/* Android-only arcade launcher and pause menu. Loaded only into bundled APK. */
(() => {
 'use strict';
 if (!window.OLDfagIsAndroidApp) return;
 const $=id=>document.getElementById(id);
 const frame=$('arcadeIframe');
 const screen=$('screen-arcade');
 const names={timur:'ПРИКЛЮЧЕНИЯ ТИМУРА',tea:'КРЫМСКИЙ ЧАЙ',toffi:'TOFFI RAGE'};
 let game=null,pausedByHost=false,menuOpen=false,settingMode=false;
 let overlay=null;
 const inner=()=>{try{return frame.contentDocument}catch(e){return null}};
 const innerWindow=()=>{try{return frame.contentWindow}catch(e){return null}};
 const clickInner=id=>{const el=inner()?.getElementById(id);if(!el||el.disabled)return false;el.click();return true;};
 function toffiAPI(){
   try{return innerWindow()?.__toffiUnified?.debugChild?.()||null}catch(e){return null}
 }
 function soundtrack(){
   try{return inner()?.getElementById('themeTrack')||null}catch(e){return null}
 }
 function phoneOrientation(mode){
   try{window.OldfagAndroid?.setOrientation?.(mode)}catch(e){}
 }
 function actualPause(){
   if(!game)return false;
   if(game==='toffi'){
     const api=toffiAPI();
     const mode=api?.state?.()?.mode;
     if(api&&['run','cinematic'].includes(mode)){api.pause();soundtrack()?.pause();return true;}
     soundtrack()?.pause();
     return false;
   }
   if(game==='timur'){
     const doc=inner();if(doc?.getElementById('overlay')?.hidden)return clickInner('pause');
     return false;
   }
   if(game==='tea'){
     const doc=inner();
     if(doc?.getElementById('overlay')?.hidden)return clickInner('pauseBtn');
   }
   return false;
 }
 function actualResume(){
   if(!pausedByHost)return;
   if(game==='toffi'){
     const api=toffiAPI();
     if(api?.state?.()?.mode==='pause')api.pause();
     if(!inner()?.getElementById('soundToggle')?.textContent.includes('ВЫКЛ')) {
       const song=soundtrack();
       if(song && song.paused) song.play().catch(()=>{});
     }
   } else if(game==='timur')clickInner('pause');
   else if(game==='tea')clickInner('pauseBtn');
   pausedByHost=false;
 }
 function showSettings(){
   settingMode=true;
   overlay.querySelector('#nativeArcadeMain').hidden=true;
   overlay.querySelector('#nativeArcadeSettings').hidden=false;
   const sound=overlay.querySelector('#nativeArcadeSound');
   const selector=game==='timur'?'sound':game==='tea'?'soundBtn':'soundToggle';
   let on=true;
   try{
     const btn=inner()?.getElementById(selector);
     if(btn)on=!/ВЫКЛ|OFF/i.test(btn.textContent);
   }catch(e){}
   sound.textContent='♫ ЗВУК: '+(on?'ВКЛ':'ВЫКЛ');
 }
 function showMain(){
   settingMode=false;
   overlay.querySelector('#nativeArcadeSettings').hidden=true;
   overlay.querySelector('#nativeArcadeMain').hidden=false;
 }
 function openMenu(){
   if(!game||menuOpen)return;
   pausedByHost=actualPause();
   menuOpen=true;showMain();
   overlay.querySelector('#nativeArcadeGame').textContent=names[game];
   overlay.hidden=false;
   overlay.querySelector('#nativeArcadeContinue').focus({preventScroll:true});
 }
 function closeMenu(resume=true){
   if(!menuOpen)return;
   overlay.hidden=true;menuOpen=false;
   showMain();
   if(resume)actualResume();else pausedByHost=false;
 }
 function restart(){
   closeMenu(false);
   let ok=false;
   if(game==='timur')ok=clickInner('restart');
   else if(game==='tea')ok=clickInner('restartBtn');
   else if(game==='toffi')ok=clickInner('newGameButton');
   if(!ok){frame.contentWindow?.location?.reload?.();}
 }
 function exit(){
   closeMenu(false);
   const exitButton=$('arcadeExitBtn');
   if(exitButton)exitButton.click();
   resetArcade();
 }
 function toggleSound(){
   const selector=game==='timur'?'sound':game==='tea'?'soundBtn':'soundToggle';
   clickInner(selector);
   showSettings();
 }
 function resetArcade(){
   closeMenu(false);
   document.body.classList.remove('android-arcade-active');
   game=null;pausedByHost=false;menuOpen=false;settingMode=false;
   if(overlay)overlay.hidden=true;
   phoneOrientation('auto');
 }
 function start(gameName){
   resetArcade();
   game=gameName;
   document.body.classList.add('android-arcade-active');
   phoneOrientation(game==='timur'?'landscape':'auto');
 }
 function init(){
   overlay=document.createElement('div');
   overlay.id='nativeArcadeLayer';
   overlay.hidden=true;
   overlay.innerHTML=`<button id="nativeArcadePause" type="button" aria-label="Пауза и меню" title="Пауза и меню">Ⅱ</button>
     <div id="nativeArcadeModal" role="dialog" aria-modal="true" aria-label="Меню аркады">
      <div class="native-arcade-panel">
       <div class="native-arcade-subtitle" id="nativeArcadeGame">АРКАДА</div>
       <h2>Ⅱ ПАУЗА</h2>
       <div id="nativeArcadeMain">
         <button id="nativeArcadeContinue" type="button">▶ ПРОДОЛЖИТЬ</button>
         <button id="nativeArcadeRestart" type="button">↻ НОВАЯ ИГРА</button>
         <button id="nativeArcadeOptions" type="button">⚙ НАСТРОЙКИ</button>
         <button id="nativeArcadeExit" type="button">← В КЛУБ</button>
       </div>
       <div id="nativeArcadeSettings" hidden>
         <button id="nativeArcadeSound" type="button">♫ ЗВУК: ВКЛ</button>
         <button id="nativeArcadeSettingsBack" type="button">← НАЗАД</button>
       </div>
      </div>
     </div>`;
   screen.appendChild(overlay);
   // Pause stays available above each game's own graphics, even for full-screen iframes.
   const pause=overlay.querySelector('#nativeArcadePause');
   pause.addEventListener('click',openMenu);
   overlay.querySelector('#nativeArcadeContinue').addEventListener('click',()=>closeMenu(true));
   overlay.querySelector('#nativeArcadeRestart').addEventListener('click',restart);
   overlay.querySelector('#nativeArcadeOptions').addEventListener('click',showSettings);
   overlay.querySelector('#nativeArcadeExit').addEventListener('click',exit);
   overlay.querySelector('#nativeArcadeSound').addEventListener('click',toggleSound);
   overlay.querySelector('#nativeArcadeSettingsBack').addEventListener('click',showMain);
   [['arcadeLaunch','timur'],['arcadeLaunchTea','tea'],['arcadeLaunchToffi','toffi']].forEach(([id,name])=>{
     $(id)?.addEventListener('click',()=>start(name));
   });
   $('arcadeExitBtn')?.addEventListener('click',resetArcade);
   const existingBack=window.OLDfagAndroidBack;
   window.OLDfagAndroidBack=()=>{
     if(menuOpen){
       if(settingMode)showMain();else closeMenu(true);
       return true;
     }
     if(game){openMenu();return true;}
     return existingBack?.()===true;
   };
   window.OLDfagMobileArcade={start,openMenu,closeMenu,resetArcade};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();