/* OLDfag.exe — on-device progress and statistics, no accounts or server. */
'use strict';
(() => {
  const KEY='oldfag-progress-v1';
  window.OLDfagIsAndroidApp = new URLSearchParams(location.search).get('app')==='android';
  const blank=()=>({
    version:1, clubPass:false,
    gate:{attempts:0,passes:0},
    quizzes:{games:{plays:0,passes:0,correct:0,best:0},tv:{plays:0,passes:0,correct:0,best:0},music:{plays:0,passes:0,correct:0,best:0}},
    arcade:{timur:0,tea:0,toffi:0,toffiBonus:0}
  });
  const initial=blank();
  let state=initial;
  try{
    const d=JSON.parse(localStorage.getItem(KEY)||'null');
    if(d && typeof d==='object' && !Array.isArray(d)){
      state={...initial,...d,gate:{...initial.gate,...d.gate},
        arcade:{...initial.arcade,...d.arcade},quizzes:{
          games:{...initial.quizzes.games,...d.quizzes?.games},
          tv:{...initial.quizzes.tv,...d.quizzes?.tv},
          music:{...initial.quizzes.music,...d.quizzes?.music}
        }};
    }
  }catch(e){console.warn('Progress storage unavailable',e);}
  // Migrate a historic successful gate result saved by the existing website,
  // without resetting scores or question history.
  try{
    const old=JSON.parse(localStorage.getItem('oldfag-exe-v1')||'null');
    const thresholds=[9,8,7,6,5];
    if(old?.best && thresholds.some((n,i)=>Number(old.best[i+1])>=n))state.clubPass=true;
  }catch(e){}
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    window.dispatchEvent(new Event('oldfag-progress-updated'));
  }
  function increment(n){return Math.max(0,Number(n)||0)+1;}
  const api={
    hasClubPass:()=>state.clubPass===true,
    grantClubPass:()=>{state.clubPass=true;save();},
    recordGate:({score=0,passed=false}={})=>{
      state.gate.attempts=increment(state.gate.attempts);
      if(passed){state.gate.passes=increment(state.gate.passes);state.clubPass=true;}
      save();
    },
    recordQuiz:(name,score)=>{
      const item=state.quizzes[name];if(!item)return;
      item.plays=increment(item.plays);
      if(Number(score)>=7)item.passes=increment(item.passes);
      item.correct=(Number(item.correct)||0)+Math.max(0,Math.min(10,Number(score)||0));
      item.best=Math.max(Number(item.best)||0,Number(score)||0);
      save();
    },
    recordArcadeWin:(name)=>{
      if(!Object.hasOwn(state.arcade,name))return;
      state.arcade[name]=increment(state.arcade[name]);
      save();
    },
    snapshot:()=>JSON.parse(JSON.stringify(state))
  };
  window.OLDfagProgress=api;
  function renderStats(){
    const root=document.getElementById('progressStats');if(!root)return;
    const n=api.snapshot(),g=n.gate;
    const row=(name,st)=>'<tr><th>'+name+'</th><td>'+st.plays+'</td><td>'+st.passes+'</td><td>'+st.correct+'</td></tr>';
    root.innerHTML=
      '<p>ФЕЙСКОНТРОЛЬ: '+g.attempts+' попыток · '+g.passes+' успешных'+(n.clubPass?' · ПРОПУСК ПОЛУЧЕН':'')+'</p>'+
      '<h3>КВИЗЫ КЛУБА</h3>'+
      '<table><thead><tr><th>Категория</th><th>Раундов</th><th>7+/10</th><th>Верных ответов</th></tr></thead><tbody>'+
      row('Игры',n.quizzes.games)+row('Телевидение',n.quizzes.tv)+row('Музыка',n.quizzes.music)+
      '</tbody></table><h3>ПОБЕДЫ В АРКАДАХ</h3>'+
      '<p>Тимур: '+n.arcade.timur+' · Крымский чай: '+n.arcade.tea+
      ' · Toffi Rage: '+n.arcade.toffi+'</p>'+
      '<p class="progress-note">Toffi Rage — завершение трёх основных рейсов. Бонусный рейс: '+n.arcade.toffiBonus+
      '. Статистика хранится только на этом устройстве и может быть удалена вместе с данными приложения.</p>';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=document.getElementById('progressDialog');
    const open=document.getElementById('progressOpen');
    const close=document.getElementById('progressClose');
    if(open&&dialog)open.addEventListener('click',()=>{renderStats();dialog.showModal();});
    if(close&&dialog)close.addEventListener('click',()=>dialog.close());
    window.addEventListener('oldfag-progress-updated',renderStats);
    // Native Android Back: close dialog/return from game without quitting app.
    window.OLDfagAndroidBack=()=>{
      for(const d of Array.from(document.querySelectorAll('dialog[open]')).reverse()){
        d.close();return true;
      }
      const arcade=document.getElementById('screen-arcade');
      if(arcade&&!arcade.hidden){document.getElementById('arcadeExitBtn')?.click();return true;}
      const clubQuiz=document.getElementById('screen-club-quiz');
      const clubResult=document.getElementById('screen-club-result');
      if(clubQuiz&&!clubQuiz.hidden){document.getElementById('clubQuit')?.click();return true;}
      if(clubResult&&!clubResult.hidden){document.getElementById('clubToRoom')?.click();return true;}
      return false;
    };
  });
})();
