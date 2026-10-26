/* APK-only compact service labels for the new Toffi pixel HUD.
   Preserve all original click handlers, state toggles and accessibility. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const fullscreen=$('fullscreenToggle'),sound=$('soundToggle'),back=$('menuTop');
 if(!fullscreen||!sound||!back)return;
 const compact=(node,getLabel)=>{
  let last='';
  const sync=()=>{
   const existing=node.textContent||'';
   const label=getLabel(existing);
   if(!label||label===existing)return;
   node.textContent=label;
   node.setAttribute('aria-label',label);
   last=label;
  };
  new MutationObserver(sync).observe(node,{childList:true,characterData:true,subtree:true});
  sync();
 };
 compact(fullscreen,s=>/ОКНО/.test(s)?'▣ ОКНО':'⛶ ЭКРАН');
 compact(sound,s=>/ВЫКЛ/.test(s)?'♪ ВЫКЛ':'♪ ВКЛ');
 compact(back,()=>'⌂ МЕНЮ');
 // The font is hosted on-device. Mark the screen after it is available so
 // CSS fallbacks do not flash during quick transitions into story dialogue.
 document.fonts?.load("10px ToffiPixel").catch(()=>{});
})();
