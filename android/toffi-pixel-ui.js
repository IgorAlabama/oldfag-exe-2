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

 // A cutscene frame is transform:scale(...) to fit the phone. Render the
 // speaker's name in a sibling DOM layer at native CSS pixel size instead:
 // no resampled glyphs and never two superimposed versions of the name.
 const layer=$('storyLayer'),scene=$('storyScene'),source=$('storyName'),panel=$('storyPanel'),ending=$('storyEnd');
 if(layer&&scene&&source&&panel){
   const badge=document.createElement('div');
   badge.className='toffi-speaker-badge';
   badge.id='toffiSpeakerNative';
   badge.setAttribute('aria-live','off');
   badge.hidden=true;
   layer.appendChild(badge);
   source.classList.add('toffi-name-replaced');
   source.setAttribute('aria-hidden','true');
   let previous='',left=-999,top=-999,lastTime=0;
   function updateSpeakerLabel(timestamp){
     requestAnimationFrame(updateSpeakerLabel);
     if(timestamp-lastTime<45)return;
     lastTime=timestamp;
     const show=layer.classList.contains('active')
       &&scene.classList.contains('active')
       &&!(ending&&ending.classList.contains('show'))
       &&panel.style.display!=='none'
       &&!!source.textContent.trim();
     if(!show){badge.hidden=true;return}
     const sourceRect=source.getBoundingClientRect(),layerRect=layer.getBoundingClientRect();
     if(!sourceRect.width||!layerRect.width){badge.hidden=true;return}
     const x=Math.max(2,Math.round(sourceRect.left-layerRect.left));
     const y=Math.round(sourceRect.top-layerRect.top);
     const name=source.textContent.trim();
     if(previous!==name){badge.textContent=name;previous=name;}
     if(left!==x){badge.style.left=x+'px';left=x;}
     if(top!==y){badge.style.top=y+'px';top=y;}
     badge.style.maxWidth=Math.max(75,Math.floor(layerRect.width-x-6))+'px';
     badge.hidden=false;
   }
   requestAnimationFrame(updateSpeakerLabel);
 }
})();
