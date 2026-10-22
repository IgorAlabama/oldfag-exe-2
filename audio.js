/* OLDfag.exe v0.6 — self-hosted music & 8-bit sound effects. */
'use strict';
(() => {
  const KEY = 'oldfag-exe-audio-v06';
  const defaults = {music:false, effects:true, volume:30};
  let settings = {...defaults};
  try {
    const obj = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      settings.music = obj.music === true;
      settings.effects = obj.effects !== false;
      settings.volume = Number.isFinite(Number(obj.volume)) ? Math.max(0,Math.min(100,Number(obj.volume))) : 30;
    }
  } catch { /* Local storage unavailable; keep defaults. */ }
  const $ = id => document.getElementById(id);
  const bgm = new Audio('assets/bgm-lo-loop-groove.mp3');
  bgm.loop = true;
  bgm.preload = 'none';
  const effects = {
    click:'assets/sfx-ui-click.wav',
    correct:'assets/sfx-correct.wav',
    wrong:'assets/sfx-wrong.wav',
    streak:'assets/sfx-streak.wav',
    unlock:'assets/sfx-door-unlock.wav',
    door:'assets/sfx-door-creak.wav'
  };
  const samples = Object.fromEntries(Object.entries(effects).map(([name,url]) => {
    const sound = new Audio(url); sound.preload='none';return [name,sound];
  }));
  const active = new Set();
  let musicAttempt = 0;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
  function updateUI(){
    const btn=$('musicToggle');
    btn.setAttribute('aria-pressed',String(settings.music));
    btn.setAttribute('aria-label',settings.music?'Выключить музыку':'Включить музыку');
    btn.textContent=settings.music?'♫ МУЗЫКА: ВКЛ':'♪ МУЗЫКА: ВЫКЛ';
    $('audioMusicEnabled').checked=settings.music;
    $('audioEffectsEnabled').checked=settings.effects;
    $('audioVolume').value=String(settings.volume);
    $('audioVolumeValue').textContent=`${settings.volume}%`;
    bgm.volume=(settings.volume/100)*0.60;
    for(const sound of active) sound.volume=(settings.volume/100)*0.8;
  }
  async function syncMusic(){
    ++musicAttempt;
    const attempt=musicAttempt;
    if(!settings.music || settings.volume===0){bgm.pause();return;}
    try {
      await bgm.play();
      if(attempt!==musicAttempt || !settings.music)bgm.pause();
    } catch(err) {
      // Autoplay is restricted until the visitor interacts; settings stay saved.
      if(err.name !== 'NotAllowedError') console.warn('Background audio unavailable:',err);
    }
  }
  function setMusic(value){settings.music=Boolean(value);persist();updateUI();syncMusic();}
  function setEffects(value){settings.effects=Boolean(value);persist();updateUI();}
  function setVolume(value){settings.volume=Math.max(0,Math.min(100,Number(value)||0));persist();updateUI();syncMusic();}
  function sfx(name){
    if(!settings.effects || settings.volume===0 || !samples[name])return;
    const src=samples[name];
    const clip=src.cloneNode(true);
    clip.volume=(settings.volume/100)*0.8;
    active.add(clip);
    const cleanup=()=>active.delete(clip);
    clip.addEventListener('ended',cleanup,{once:true});
    clip.addEventListener('error',cleanup,{once:true});
    clip.play().catch(()=>{active.delete(clip);});
  }
  // Only used for effects that naturally occur after the result is shown.
  let doorTimer=null;
  function successfulEntry(){
    if(doorTimer!==null)clearTimeout(doorTimer);
    if(!settings.effects)return;
    sfx('unlock');
    doorTimer=setTimeout(()=>{sfx('door');doorTimer=null;},430);
  }
  function cancelDoor(){if(doorTimer!==null){clearTimeout(doorTimer);doorTimer=null;}}
  $('musicToggle').addEventListener('click',()=>{sfx('click');setMusic(!settings.music);});
  $('audioSettingsBtn').addEventListener('click',()=>{sfx('click');$('audioDialog').showModal();});
  $('audioCloseBtn').addEventListener('click',()=>{sfx('click');$('audioDialog').close();});
  $('audioDoneBtn').addEventListener('click',()=>{sfx('click');$('audioDialog').close();});
  $('audioMusicEnabled').addEventListener('change',e=>setMusic(e.target.checked));
  $('audioEffectsEnabled').addEventListener('change',e=>setEffects(e.target.checked));
  $('audioVolume').addEventListener('input',e=>setVolume(e.target.value));
  $('audioTestBtn').addEventListener('click',()=>sfx('correct'));
  // A remembered ON setting can resume on the first click; never force autoplay on page load.
  document.addEventListener('pointerdown',()=>{if(settings.music && bgm.paused)syncMusic();},{capture:true});
  document.addEventListener('keydown',()=>{if(settings.music && bgm.paused)syncMusic();},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && settings.music && bgm.paused)syncMusic();});
  updateUI();
  window.OLDfagAudio={sfx,successfulEntry,cancelDoor};
})();
