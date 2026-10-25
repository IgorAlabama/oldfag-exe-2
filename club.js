/* OLDfag.exe 2.0 — single-page club engine. No servers or dependencies. */
'use strict';
(() => {
 const $ = id=>document.getElementById(id);
 const show=window.OLDfagShowScreen;
 const audio=window.OLDfagAudio || {sfx:()=>{}};
 const pool=window.OLDFAG_CLUB_QUESTIONS||[];
 const C={
  games:{name:'КОМПЬЮТЕРЩИК',caption:'СТАРЫЕ КОМПЬЮТЕРНЫЕ ИГРЫ',lead:'Ну что, олдфаг? Проверь, помнишь ли ты игры, в которые рубился вместо уроков.',
   idle:['Ну что, олдфаг? Вспомни, как выглядела графика до RTX.','Мне бы ещё ход в «Героях» сделать, но ладно. Спрашивай.','Только не трогай мой сейв. У меня здесь 300 вопросов.'],
   good:['Красиво сыграно. Видно, ты ещё помнишь настоящие игры.','Ну ладно, с такими знаниями тебе можно доверить дискету.','Ого. Не зря ты ночами сидел за монитором.'],
   bad:['Эх... даже ИИ в Heroes III принимает решения получше.','Не угадал. Тебе бы сначала драйвер видеокарты поставить.','Ты случайно не тот, кто сохраняется в один слот?']},
  tv:{name:'ОХРАННИК',caption:'ТЕЛЕВИДЕНИЕ И СЕРИАЛЫ',lead:'Я тут дремлю под телевизор. Разбуди меня знаниями про старые передачи.',
   idle:['Ну давай, олдфаг. Посмотрим, что ты ещё помнишь по ТВ.','Только тихо. Тут реклама кончилась, я почти заснул.','Телевизор смотрел? Или только кнопки на пульте жал?'],
   good:['Вот это нормально. Видно, не всё время ты просидел за компом.','Верно. Даже спать расхотелось на секунду.','О, помнишь. Молодец. Теперь дай досмотреть.'],
   bad:['Не угадал. Даже я это помню, а я тут уже полдня сплю.','Мимо. Переключи канал в голове.','Такое ощущение, что ты телевизор только выключал.']},
  music:{name:'ПЕВИЦА',caption:'МУЗЫКА 90-х И 00-х',lead:'Ну давай, олдфаг. Проверим, что осталось в голове после дискотек.',
   idle:['Ну давай, олдфаг. Проверим, помнишь ли ты, что слушал, когда у тебя ещё были волосы.','Мне бы закончить сет и уйти домой. Но сперва твои десять вопросов.','Только не пой. У меня и без тебя сегодня тяжёлый вечер.'],
   good:['Верно! Ну что, не всё у тебя потеряно.','Это ты помнишь. Даже я слегка впечатлена.','Хорошо. С таким вкусом ещё можно жить.'],
   bad:['Нет. Старая кассета зажевалась. Соберись, олдфаг.','Мимо ноты. И мимо правильного ответа.','Это было больно слышать. Хорошо, что я сегодня пою одна.']}
 };
 const picker=Object.create(null), usedLines=Object.create(null);
 function say(type,state){const arr=C[type][state];const key=type+'-'+state;if(!picker[key]||!picker[key].length){picker[key]=[...arr].sort(()=>Math.random()-.5); if(picker[key].at(-1)===usedLines[key]&&picker[key].length>1){const j=picker[key].length-1;[picker[key][j],picker[key][j-1]]=[picker[key][j-1],picker[key][j]];}}const line=picker[key].pop();usedLines[key]=line;return line;}
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const storeKey='oldfag-club-2-seen';
 let saved={};try{saved=JSON.parse(localStorage.getItem(storeKey)||'{}')||{};}catch{}
 const persist=()=>{try{localStorage.setItem(storeKey,JSON.stringify(saved));}catch{}};
 let theme='games',questions=[],index=0,score=0,answered=false,correctStreak=0,pending='games';
 const count=10;
 function room(){if(!window.OLDfagCanEnterClub?.())return;audio.sfx('click');show('screen-club');}
 function openHotspot(type){if(!window.OLDfagCanEnterClub?.())return;audio.sfx('click');if(type==='arcade'){$('clubArcadeDialog').showModal();return;}if(!C[type])return;pending=type;$('clubIntroTitle').textContent=C[type].name+' / '+C[type].caption;$('clubIntroText').textContent=C[type].lead;$('clubIntroPortrait').src='assets/'+(type==='tv'?'guard':type==='music'?'singer':'gamer')+'-idle.webp';$('clubIntroDialog').showModal();}
 function select(type){
   const arr=pool.filter(q=>q.theme===type);if(arr.length!==300){alert('В банке квиза ожидалось 300 вопросов, получено '+arr.length);return [];}
   const valid=new Set(arr.map(q=>q.id));let seen=(Array.isArray(saved[type])?saved[type]:[]).filter(id=>valid.has(id));
   let sorted=[...shuffle(arr.filter(q=>!seen.includes(q.id))),...shuffle(arr.filter(q=>seen.includes(q.id)))];
   const out=[],groups=new Set();for(const q of sorted){if(groups.has(q.group))continue;out.push(q);groups.add(q.group);if(out.length===count)break;}
   if(out.length<count)throw new Error('Недостаточно разных тем для раунда');
   const hadFresh=out.filter(q=>!seen.includes(q.id));
   if(hadFresh.length<count)seen=[];
   saved[type]=[...seen,...out.map(q=>q.id)];persist();return out;
 }
 function npcImage(state='idle') {const base=theme==='tv'?'guard':theme==='music'?'singer':'gamer';return 'assets/'+base+'-'+state+'.webp';}
 function react(state){$('npcStage').dataset.state=state;$('npcPortrait').src=npcImage(state);$('npcName').textContent=C[theme].name+' / '+(state==='idle'?'ЖДЁТ ОТВЕТ':state==='good'?'ОДОБРЯЕТ':'НЕДОВОЛЕН');$('npcLine').textContent=say(theme,state);}
 function begin(type){theme=type;questions=select(type);index=0;score=0;answered=false;correctStreak=0;$('clubQuizHeader').textContent='▣ КОМПЫ / '+C[type].caption;$('clubQuestionType').textContent='[ '+C[type].caption+' ]';show('screen-club-quiz');render();}
 function render(){answered=false;const q=questions[index];$('clubProgress').textContent='ВОПРОС '+String(index+1).padStart(2,'0')+' / 10';$('clubScore').textContent='ВЕРНО: '+score;$('clubProgressFill').style.width=(index/count*100)+'%';$('clubQuestionText').textContent=q.question;react('idle');$('clubAnswers').replaceChildren();const order=shuffle([0,1,2,3]);for(let i=0;i<4;i++){const pos=order[i];const b=document.createElement('button');b.className='answer-btn';b.type='button';b.dataset.pos=String(pos);const key=document.createElement('span');key.className='key';key.textContent=(i+1)+'.';const val=document.createElement('span');val.textContent=q.answers[pos];b.append(key,val);b.addEventListener('click',()=>choose(pos,b));$('clubAnswers').append(b);}$('clubFeedback').hidden=true;$('clubNext').textContent=index===count-1?'РЕЗУЛЬТАТ ▶':'ДАЛЬШЕ ▶';}
 function choose(pos,clicked){if(answered)return;answered=true;const q=questions[index],good=pos===q.correct;if(good){score++;correctStreak++;audio.sfx('correct');if(correctStreak===3)setTimeout(()=>audio.sfx('streak'),270);}else{correctStreak=0;audio.sfx('wrong');}react(good?'good':'bad');$('clubScore').textContent='ВЕРНО: '+score;Array.from($('clubAnswers').children).forEach(b=>{b.disabled=true;const win=Number(b.dataset.pos)===q.correct;b.classList.toggle('correct',win);b.classList.toggle('wrong',b===clicked&&!good);b.classList.toggle('dimmed',!win&&b!==clicked);});$('clubFeedbackTitle').textContent=good?'✓ ПРАВИЛЬНО':'✕ НЕПРАВИЛЬНО';$('clubExplanation').textContent=q.explanation;$('clubFeedback').classList.toggle('fail',!good);$('clubFeedback').hidden=false;$('clubNext').focus({preventScroll:true});requestAnimationFrame(()=>{const r=$('npcStage').getBoundingClientRect();if(r.top<5||r.bottom>window.innerHeight-20)$('npcStage').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});}
 function next(){if(!answered)return;audio.sfx('click');if(index===count-1){finish();return;}index++;render();}
 function finish(){window.OLDfagProgress?.recordQuiz(theme,score);show('screen-club-result');$('clubResultTitle').textContent=C[theme].caption;$('clubResultLabel').textContent=score>=7?'ACCESS GRANTED · КРАСАВЧИК':'QUIZ COMPLETE · ПОДТЯНИ ЗНАНИЯ';$('clubResultScore').textContent=score+'/10';$('clubResultPortrait').src=npcImage(score>=7?'good':'bad');$('clubResultQuote').textContent=C[theme].name+': «'+say(theme,score>=7?'good':'bad')+'»';let best=0;try{best=Number(localStorage.getItem('oldfag-club-best-'+theme)||0);if(score>best){best=score;localStorage.setItem('oldfag-club-best-'+theme,String(best));}}catch{}$('clubBest').textContent='ЛИЧНЫЙ РЕКОРД: '+best+'/10 · В БАНКЕ ЕЩЁ 300 ВОПРОСОВ';if(score===10)audio.sfx('streak');}
 for(const btn of document.querySelectorAll('[data-go]'))btn.addEventListener('click',()=>openHotspot(btn.dataset.go));
 $('enterClubBtn').addEventListener('click',room);$('clubExitBtn').addEventListener('click',()=>{audio.sfx('click');show('screen-home');});$('clubQuit').addEventListener('click',room);$('clubToRoom').addEventListener('click',room);$('clubAgain').addEventListener('click',()=>begin(theme));$('clubNext').addEventListener('click',next);
 $('clubIntroClose').addEventListener('click',()=>$('clubIntroDialog').close());$('clubIntroBack').addEventListener('click',()=>$('clubIntroDialog').close());$('clubIntroStart').addEventListener('click',()=>{$('clubIntroDialog').close();begin(pending);});
 $('arcadeClose').addEventListener('click',()=>$('clubArcadeDialog').close());
 $('arcadeBack').addEventListener('click',()=>$('clubArcadeDialog').close());
 // Toffi Rage owns its own sound and fullscreen controls.
 let toffiActive=false, toffiPseudoFullscreen=false;
 const arcadeFrame=$('arcadeIframe'), arcadeScreen=$('screen-arcade');
 function syncToffiFullscreen(){
   if(!toffiActive)return;
   try{
     const btn=arcadeFrame.contentDocument?.getElementById('fullscreenToggle');
     if(!btn)return;
     const active=toffiPseudoFullscreen || document.fullscreenElement===arcadeScreen;
     btn.textContent=active?'🗗 ОКНО':'⛶ ВО ВЕСЬ ЭКРАН';
     btn.title=active?'Выйти из полноэкранного режима':'Развернуть на весь экран';
   }catch(e){}
 }
 function setToffiPseudoFullscreen(active){
   toffiPseudoFullscreen=!!active;
   arcadeScreen.classList.toggle('toffi-pseudo-fullscreen',toffiPseudoFullscreen);
   document.body.classList.toggle('toffi-pseudo-fullscreen',toffiPseudoFullscreen);
   syncToffiFullscreen();
 }
 async function toggleToffiFullscreen(){
   if(!toffiActive)return;
   if(document.fullscreenElement===arcadeScreen){
     try{await document.exitFullscreen();}catch(e){setToffiPseudoFullscreen(false);}
   }else if(toffiPseudoFullscreen){
     setToffiPseudoFullscreen(false);
   }else{
     try{
       if(!arcadeScreen.requestFullscreen)throw Error('Fullscreen unavailable');
       await arcadeScreen.requestFullscreen();
     }catch(e){
       // iPhone Safari / embedded browsers may not support element fullscreen.
       setToffiPseudoFullscreen(true);
     }
   }
   syncToffiFullscreen();
 }
 function leaveArcade(){
   toffiActive=false;
   setToffiPseudoFullscreen(false);
   if(document.fullscreenElement===arcadeScreen)document.exitFullscreen().catch(()=>{});
   arcadeFrame.onload=null;
   arcadeFrame.src='about:blank';
   audio.setArcadeMode?.(false);
   room();
 }
 window.OLDfagToffiHost={toggleFullscreen:toggleToffiFullscreen,exit:leaveArcade};
 document.addEventListener('fullscreenchange',syncToffiFullscreen);
 function connectToffiControls(){
   if(!toffiActive)return;
   try{
     const doc=arcadeFrame.contentDocument, win=arcadeFrame.contentWindow;
     if(!doc?.getElementById('soundToggle') || !win?.__toffiUnified)return;
     const code=`(function(){
       if(window.__oldfagToffiBridge)return;
       window.__oldfagToffiBridge=true;
       // Toffi persists its progress on every stage victory; count the third
       // (main-campaign final) stage once per completion, including replays.
       const originalSetItem=Storage.prototype.setItem;
       Storage.prototype.setItem=function(key,value){
         const result=originalSetItem.call(this,key,value);
         if(key==='toffi-rage-unified-save-v1'){
           try{
             const level=window.__toffiUnified?.getLevel();
             const saved=JSON.parse(value);
             if(level===2 && saved.completed?.[2]){
               window.parent.OLDfagProgress?.recordArcadeWin('toffi');
             }else if(level===3 && saved.completed?.[3]){
               window.parent.OLDfagProgress?.recordArcadeWin('toffiBonus');
             }
           }catch(err){console.warn('Toffi victory tracking',err);}
         }
         return result;
       };
       const sound=document.getElementById('soundToggle');
       const full=document.getElementById('fullscreenToggle');
       const exit=document.getElementById('exitButton');
       // Autoplay where permitted; the first real tap unlocks audio on iOS.
       try{GameAudio.start();}catch(e){}
       document.addEventListener('pointerdown',function(){
         try{GameAudio.start();}catch(e){}
       },{capture:true,once:true});
       if(sound)sound.addEventListener('click',function(e){
         e.preventDefault();e.stopImmediatePropagation();
         try{
           const muted=GameAudio.setMute(!GameAudio.isMute());
           sound.textContent=muted?'♪ ЗВУК: ВЫКЛ':'♪ ЗВУК: ВКЛ';
           sound.setAttribute('aria-pressed',String(!muted));
           if(!muted){GameAudio.start();GameAudio.effect('click');}
         }catch(err){console.warn('Toffi audio error',err);}
       },true);
       if(full)full.addEventListener('click',function(e){
         e.preventDefault();e.stopImmediatePropagation();
         window.parent.OLDfagToffiHost.toggleFullscreen();
       },true);
       if(exit)exit.addEventListener('click',function(e){
         e.preventDefault();e.stopImmediatePropagation();
         window.parent.OLDfagToffiHost.exit();
       },true);
     })();`;
     const script=doc.createElement('script');
     script.textContent=code;
     doc.body.appendChild(script);
     syncToffiFullscreen();
   }catch(e){console.warn('Toffi arcade connection error',e);}
 }
 function launchArcade(path,title,description) {
   audio.sfx('click');$('clubArcadeDialog').close();
   $('arcadeScreenTitle').textContent=title;
   $('arcadeGameDescription').textContent=description;
   toffiActive=path==='toffi-rage/index.html';
   setToffiPseudoFullscreen(false);
   audio.setArcadeMode?.(true);
   arcadeFrame.title=title+' — аркада';
   arcadeFrame.setAttribute('allow','fullscreen; autoplay');
   arcadeFrame.onload=toffiActive?connectToffiControls:null;
   arcadeFrame.src=path;
   show('screen-arcade');
 }
 $('arcadeLaunch').addEventListener('click',()=>launchArcade(
   'arcade/index.html','The Adventures of Тимур!',
   '3 УРОВНЯ · 3 ЖИЗНИ · ТАП ДЛЯ УДАРА · ЗАЖМИ И ВЕДИ ПАЛЕЦ ДЛЯ ХОДЬБЫ'
 ));
 $('arcadeLaunchTea').addEventListener('click',()=>launchArcade(
   'krymskiy-chai/index.html','Крымский чай',
   '400 ОЧКОВ ДО ПОБЕДЫ · ЧАЙНЫЕ ПАКЕТИКИ · ЧАЙНИК И КОЛЯ'
 ));
 $('arcadeLaunchToffi').addEventListener('click',()=>launchArcade(
   'toffi-rage/index.html','Toffi Rage',
   'ARCADE EDITION v2.2 · 4 РЕЙСА · МУЗЫКА · ПОЛНЫЙ ЭКРАН'
 ));
 $('arcadeExitBtn').addEventListener('click',()=>{
   audio.sfx('click');
   leaveArcade();
 });
 document.addEventListener('keydown',e=>{if($('screen-club-quiz').hidden||$('clubIntroDialog').open||$('clubArcadeDialog').open)return;if(!answered&&e.key.length===1&&'1234'.includes(e.key)){const b=$('clubAnswers').children[Number(e.key)-1];if(b)b.click();}else if(answered&&e.key==='Enter'&&e.target!==$('clubNext')){e.preventDefault();next();}});
 // Locally testable telemetry, no network traffic and no personal information.
 window.OLDfagClubDebug={get count(){return pool.length},get theme(){return theme},get score(){return score},get questionIndex(){return index},get current(){return questions[index]}};
})();
