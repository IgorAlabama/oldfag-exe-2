/* THE ИЛЬЮХА — ORIGINAL 3-TRACK PLAYLIST (USER-SUPPLIED AUDIO).
   Always 1 -> 2 -> 3 -> 1. Independent of existing synthesized SFX. */
(()=>{
  'use strict';
  const TRACKS = [
    {file:'../arcade/assets/zachem8bit.mp3',title:'Зачем (8-bit)'},
    {file:null,title:'Май горит (8-bit)'},
    {file:'../toffi-rage/music/plokhayamarzha8bit.mp3',title:'Плохая маржа (8-bit)'}
  ];
  const STORAGE='ilyuha-music-v1';
  const VOLUME='ilyuha-music-volume-v1';
  let enabled=true, vol=0.45, current=0, active=false, started=false, errorCount=0;
  try{enabled=localStorage.getItem(STORAGE)!=='0';const saved=Number(localStorage.getItem(VOLUME));if(Number.isFinite(saved)&&saved>=0&&saved<=1&&localStorage.getItem(VOLUME)!==null)vol=saved}catch(e){}
  const player=new Audio();
  player.preload='metadata';player.loop=false;player.volume=vol;
  const get=id=>document.getElementById(id);
  const hidden=id=>{const el=get(id);return el&&!el.hidden;};
  function gameActive(){
    if(hidden('mainMenu')||hidden('arcadePause')||hidden('storyCinematic')||document.hidden)return false;
    try{
      const state=window.POSMTEST?.getState?.();
      return !!(state && state.running && !state.paused && state.mode==='play');
    }catch(e){return false;}
  }
  let maygoritURL=null, maygoritPromise=null;
  const MAYGORIT_PARTS=Array.from({length:14},(_,i)=>'music-parts/m_'+String(i).padStart(3,'0')+'.txt');
  function prepareMaygorit(){
    if(maygoritURL)return Promise.resolve(maygoritURL);
    if(maygoritPromise)return maygoritPromise;
    maygoritPromise=Promise.all(MAYGORIT_PARTS.map(async path=>{
      const result=await fetch(path);if(!result.ok)throw Error(path+' HTTP '+result.status);
      return (await result.text()).trim();
    })).then(chunks=>{
      const base64=chunks.join('');
      if(base64.length!==4564328)throw Error('Audio data incomplete: '+base64.length);
      const raw=atob(base64),bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      maygoritURL=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
      return maygoritURL;
    }).catch(e=>{maygoritPromise=null;throw e});
    return maygoritPromise;
  }
  function loadTrack(n){
    current=(n+TRACKS.length)%TRACKS.length;
    if(current===1&&!maygoritURL){
      player.pause();player.removeAttribute('src');player.load();syncUI();
      prepareMaygorit().then(url=>{if(current===1){player.src=url;player.load();play();}})
        .catch(e=>{console.warn('[Ильюха музыка]',e);if(current===1)step();});
      return;
    }
    player.src=current===1?maygoritURL:TRACKS[current].file;
    player.load();syncUI();
  }
  function play(){if(!enabled||!active||!gameActive())return;
    if(!player.getAttribute('src')){
      if(current===1){prepareMaygorit().then(url=>{if(current===1){player.src=url;player.load();play();}}).catch(()=>{});}
      else loadTrack(current);
      return;
    }
    player.volume=vol;
    const promise=player.play();
    if(promise && typeof promise.catch==='function')promise.catch(()=>{/* Next user gesture resumes playback. */});
  }
  function pause(){player.pause();}
  function step(){errorCount=0;loadTrack(current+1);if(enabled&&active)play();}
  player.addEventListener('ended',step);
  player.addEventListener('error',()=>{
    // A missing/unreadable file never breaks the game or crashes the page.
    if(!active||!enabled)return;
    if(++errorCount>=TRACKS.length){pause();console.warn('[Ильюха музыка] Не найдены MP3, проверьте каталог music/');return;}
    loadTrack(current+1);play();
  });
  function syncUI(){
    const button=get('ilyuhaMusicToggle');
    if(button){button.textContent=enabled?'♫':'♫̸';button.title=enabled?'Музыка: включена':'Музыка: выключена';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(enabled));}
    for(const id of ['ilyuhaMusicCheck','ilyuhaPauseMusicCheck']){const inp=get(id);if(inp)inp.checked=enabled;}
    for(const id of ['ilyuhaMusicVolume','ilyuhaPauseMusicVolume']){const inp=get(id);if(inp)inp.value=Math.round(vol*100);}
    for(const id of ['ilyuhaMusicTrack','ilyuhaPauseMusicTrack']){const node=get(id);if(node)node.textContent='♫ '+(current+1)+'/3 · '+TRACKS[current].title;}
  }
  function setEnabled(value){enabled=!!value;
    try{localStorage.setItem(STORAGE,enabled?'1':'0')}catch(e){}
    if(enabled){if(gameActive())play()}else pause();syncUI();
  }
  function setVolume(value){vol=Math.max(0,Math.min(1,Number(value)/100||0));player.volume=vol;
    try{localStorage.setItem(VOLUME,String(vol))}catch(e){}
    syncUI();
  }
  function addSettings(containerId,checkId,volumeId,trackId,styleClass){
    const parent=get(containerId);if(!parent)return;
    const anchor=parent.querySelector('[data-mm-back], [data-pause-back]');
    const label=document.createElement('label');label.className=styleClass;
    const check=document.createElement('input');check.type='checkbox';check.id=checkId;check.checked=enabled;
    label.append(check,document.createTextNode(' МУЗЫКА'));
    parent.insertBefore(label,anchor||null);
    const info=document.createElement('div');info.id=trackId;info.className='ilyuhaMusicNow';info.textContent='♫ 1/3';parent.insertBefore(info,anchor||null);
    const sliderLabel=document.createElement('label');sliderLabel.className=styleClass;
    sliderLabel.textContent='ГРОМКОСТЬ МУЗЫКИ';sliderLabel.style.display='flex';sliderLabel.style.alignItems='center';sliderLabel.style.gap='8px';
    const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.value=Math.round(vol*100);slider.id=volumeId;slider.style.flex='1';slider.style.minWidth='0';sliderLabel.append(slider);parent.insertBefore(sliderLabel,anchor||null);
    check.addEventListener('change',()=>setEnabled(check.checked));slider.addEventListener('input',()=>setVolume(slider.value));
  }
  function init(){
    const bar=document.querySelector('#mainMenu .mmTools');
    if(bar&&!get('ilyuhaMusicToggle')){
      const btn=document.createElement('button');btn.type='button';btn.id='ilyuhaMusicToggle';btn.className='mmTool';btn.style.fontFamily='monospace';btn.style.fontSize='clamp(18px,2.4vw,30px)';
      btn.addEventListener('click',e=>{e.stopPropagation();setEnabled(!enabled)});
      bar.insertBefore(btn,bar.firstChild);
    }
    addSettings('mmSettingsPanel','ilyuhaMusicCheck','ilyuhaMusicVolume','ilyuhaMusicTrack','mmCheck');
    addSettings('pauseSettings','ilyuhaPauseMusicCheck','ilyuhaPauseMusicVolume','ilyuhaPauseMusicTrack','pauseSetting');
    const css=document.createElement('style');css.textContent='.ilyuhaMusicNow{font:clamp(9px,2vh,14px) monospace;color:#ffd66a;margin:5px 8px}.mmCheck input[type=range],.pauseSetting input[type=range]{accent-color:#ffd466;max-width:65%}';document.head.appendChild(css);
    const start=()=>{active=true;current=0;errorCount=0;loadTrack(0);prepareMaygorit().catch(e=>console.warn('[Ильюха музыка: предзагрузка]',e));const f=()=>play();setTimeout(f,100);};
    get('mmStart')?.addEventListener('click',start);
    get('mmEndless')?.addEventListener('click',start);
    get('mmExit')?.addEventListener('click',()=>{active=false;pause();});
    get('exitArcade')?.addEventListener('click',()=>{active=false;pause();});
    for(const evt of ['pointerdown','keydown'])document.addEventListener(evt,()=>{if(enabled&&active&&player.paused&&gameActive())play()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(enabled&&active)play();});
    loadTrack(0);syncUI();
    // Poll only for game-state visibility, not for track switching (handled by ended).
    setInterval(()=>{
      if(!enabled||!active||!gameActive()){if(!player.paused)pause();return;}
      if(player.paused && player.getAttribute('src') && !player.ended)play();
    },600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.IlyuhaMusic={play,pause,setEnabled,setVolume,get track(){return current+1},get enabled(){return enabled}};
})();