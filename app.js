'use strict';
(() => {
  const POOL = Array.isArray(window.OLDFAG_QUESTIONS) ? window.OLDFAG_QUESTIONS : [];
  const LEVELS = [
    { name:'НОВИЧОК', subtitle:'Пиксельный детский сад. Здесь ещё выдают сок.', flavor:'Мама разрешила поиграть?' },
    { name:'ЗНАТОК', subtitle:'Ты уже умеешь перематывать кассету карандашом.', flavor:'Подозрительно. Продолжим проверку.' },
    { name:'ВЕТЕРАН', subtitle:'Ты застал приставки, видеосалоны и первые модемы.', flavor:'Становится интересно...' },
    { name:'ОЛДФАГ', subtitle:'Исторический минимум для нашего фейсконтроля.', flavor:'Придётся позвать старшего.' },
    { name:'АРХИВАРИУС', subtitle:'Знаешь вещи, которые уже забыли их создатели.', flavor:'Ты вообще существовал до DOS?' }
  ];
  const ROUNDSIZE = 9;
  const audio = window.OLDfagAudio || {sfx:()=>{},successfulEntry:()=>{},cancelDoor:()=>{}};
  let winStreak = 0, wrongStreak = 0, wrongCount = 0;
  const arthur = window.OLDfagArthur || {lines:{},pick:()=>''};
  const reactionTypes = {
    correct: {tag:'ОДОБРЯЕТ · НЕМНОГО', mood:'good', image:'happy'},
    wrong: {tag:'ПОДОЗРИТЕЛЬНО', mood:'bad', image:'stern'},
    twoWrong: {tag:'ДВЕ ОШИБКИ', mood:'bad', image:'stern'},
    wrongStreak: {tag:'ПЛОХАЯ СЕРИЯ', mood:'bad', image:'stern'},
    streak: {tag:'3 ПОДРЯД! · УВАЖАЕТ', mood:'special', image:'happy'},
    hotStreak: {tag:'5 ПОДРЯД! · ШОК', mood:'special', image:'happy'},
    perfect: {tag:'ИДЕАЛЬНО', mood:'special', image:'happy'},
    pass: {tag:'ПРОПУСКАЕТ', mood:'good', image:'happy'},
    fail: {tag:'НЕ ПРОПУСКАЕТ', mood:'bad', image:'stern'}
  };
  function showArthur(category, target='scene') {
    const meta=reactionTypes[category] || reactionTypes.correct;
    const inLab=target==='lab';
    const root=$(inLab ? 'labSpeech' : 'sceneSpeech');
    root.dataset.mood=meta.mood;
    $(inLab ? 'labSpeechTag' : 'sceneSpeechTag').textContent=meta.tag;
    $(inLab ? 'labSpeechLine' : 'sceneSpeechLine').textContent=arthur.pick(category);
    root.hidden=false;
    if(inLab) $('labStage').dataset.reaction=meta.image==='happy'?'correct':'wrong';
    else $('quizScene').dataset.hasDialogue='true';
  }
  function revealSceneDialogue(){
    // When an answer is chosen at the bottom of a mobile screen, the scene is
    // above the viewport. Bring the speech into view; NEXT stays fixed.
    requestAnimationFrame(()=>{
      const scene=$('quizScene');
      const r=scene.getBoundingClientRect();
      const vh=window.visualViewport?.height || window.innerHeight;
      if(r.top < 8 || r.bottom > vh-8){
        scene.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
      }
    });
  }
  const PASS_BY_LEVEL = [9, 8, 7, 6, 5];
  let clubAccessGranted = false;
  const $ = id => document.getElementById(id);
  const screenIds = ['screen-home','screen-quiz','screen-result','screen-club','screen-club-quiz','screen-club-result','screen-arcade'];
  let selectedLevel = 4, round=[], index=0, score=0, answered=false, currentLevel=4;
  const storeKey = 'oldfag-exe-v1';
  const defaults = {plays:0,best:{},seen:{}};
  function load() {
    try {
      const data=JSON.parse(localStorage.getItem(storeKey)||'null');
      return data && typeof data==='object' && !Array.isArray(data) ? {...defaults,...data,best:data.best||{},seen:data.seen||{}} : structuredClone(defaults);
    } catch { return {plays:0,best:{},seen:{}}; }
  }
  let saved=load();
  function save() { try {localStorage.setItem(storeKey,JSON.stringify(saved));} catch {} }
  function shuffle(items) {const a=[...items];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function screen(id) {
    if(id.startsWith('screen-club') && !clubAccessGranted) return;
    screenIds.forEach(key=>{ $(key).hidden=key!==id; });
    if(id==='screen-home') $('screen-home').classList.add('active');
    window.scrollTo({top:0,behavior:'instant'});
  }
  window.OLDfagShowScreen=screen;
  window.OLDfagCanEnterClub=()=>clubAccessGranted;
  function setQuizScene(state='idle', title='IDLE LOOP / SECURITY SCAN', status='ЖДЁМ ОТВЕТ') {
    const scene=$('quizScene');
    if(!scene) return;
    scene.dataset.reaction=state;
    $('quizSceneLabel').textContent=title;
    $('quizSceneStatus').textContent=status;
  }

  function updateLevelButtons() {
    [...$('levelGrid').children].forEach(btn=>{btn.setAttribute('aria-pressed',String(Number(btn.dataset.level)===selectedLevel));});
    $('levelDescription').replaceChildren();
    const strong=document.createElement('strong'); strong.textContent=`LEVEL ${selectedLevel} — ${LEVELS[selectedLevel-1].name}`;
    const summary=document.createElement('span'); summary.textContent=LEVELS[selectedLevel-1].subtitle;
    const requirement=document.createElement('span'); requirement.className='club-entry-requirement'; requirement.textContent=`ПРОХОД В «КОМПЫ»: ${PASS_BY_LEVEL[selectedLevel-1]}/9 ПРАВИЛЬНЫХ`;
    $('levelDescription').append(strong,summary,requirement);
    $('levelCount').textContent=`${POOL.filter(q=>q.level===selectedLevel).length} В БАЗЕ`;
  }
  function initLevels(){
    $('levelGrid').replaceChildren();
    LEVELS.forEach((lv,i)=>{
      const btn=document.createElement('button');btn.type='button';btn.className='level-btn';
      btn.dataset.level=String(i+1);btn.textContent=String(i+1);btn.title=lv.name;
      btn.addEventListener('click',()=>{audio.sfx('click');selectedLevel=i+1;updateLevelButtons();});
      $('levelGrid').append(btn);
    });updateLevelButtons();
  }
  function pickQuestions(level) {
    const pool=POOL.filter(q=>q.level===level);
    if(pool.length<ROUNDSIZE) return [];
    let seen=Array.isArray(saved.seen[level])?saved.seen[level]:[];
    const idSet=new Set(pool.map(q=>q.id));
    seen=seen.filter(id=>idSet.has(id));
    const fresh=shuffle(pool.filter(q=>!seen.includes(q.id)));
    const old=shuffle(pool.filter(q=>seen.includes(q.id)));
    const chosen=[...fresh,...old].slice(0,ROUNDSIZE);
    // Exhausting a pool reopens it; prioritize unseen items on the next round.
    const selectedIds=new Set(chosen.map(q=>q.id));
    if(fresh.length<ROUNDSIZE) {
      saved.seen[level]=chosen.filter(q=>fresh.includes(q)).map(q=>q.id);
    } else {
      saved.seen[level]=[...seen,...chosen.map(q=>q.id)];
    }
    save();
    return shuffle(chosen);
  }
  function start(){
    round=pickQuestions(selectedLevel);
    if(round.length!==ROUNDSIZE){alert('Для этого уровня пока недостаточно вопросов.');return;}
    clubAccessGranted=false;currentLevel=selectedLevel;index=0;score=0;answered=false;winStreak=0;wrongStreak=0;wrongCount=0;audio.cancelDoor();audio.sfx('click');
    $('quizLevel').textContent=String(currentLevel);
    screen('screen-quiz');renderQuestion();
  }
  function renderQuestion(){
    answered=false;
    const q=round[index];
    $('questionCounter').textContent=`ВОПРОС ${String(index+1).padStart(2,'0')} / 09`;
    $('scoreCounter').textContent=`ВЕРНО: ${score}`;
    $('progressFill').style.width=`${(index/ROUNDSIZE)*100}%`;
    $('questionTitle').textContent=q.question;
    setQuizScene('idle','IDLE LOOP / SECURITY SCAN','ЖДЁМ ОТВЕТ');
    $('sceneSpeech').hidden=true; $('quizScene').dataset.hasDialogue='false';
    $('answers').replaceChildren();
    const orders=shuffle([0,1,2,3]);
    orders.forEach((originalPos,visiblePos)=>{
      const b=document.createElement('button');b.className='answer-btn';b.type='button';
      const k=document.createElement('span');k.className='key';k.textContent=`${visiblePos+1}.`;
      const label=document.createElement('span');label.textContent=q.answers[originalPos];
      b.append(k,label);
      b.addEventListener('click',()=>choose(originalPos,b));
      b.dataset.option=String(originalPos);
      $('answers').append(b);
    });
    $('feedback').hidden=true;$('feedback').classList.remove('fail');$('nextBtn').hidden=true;
  }
  function choose(option,clicked){
    if(answered) return;
    answered=true;
    const q=round[index];const correct=option===q.correct;
    if(correct){score++;winStreak++;wrongStreak=0;}
    else{winStreak=0;wrongStreak++;wrongCount++;}
    let reaction='correct';
    if(correct){reaction=winStreak===5?'hotStreak':winStreak===3?'streak':'correct';}
    else{reaction=wrongStreak===3?'wrongStreak':wrongCount===2?'twoWrong':'wrong';}
    audio.sfx(correct?'correct':'wrong');
    [...$('answers').children].forEach(b=>{
      const isCorrect=Number(b.dataset.option)===q.correct;
      b.disabled=true;b.classList.toggle('correct',isCorrect);b.classList.toggle('wrong',b===clicked&&!correct);
      b.classList.toggle('dimmed',!isCorrect&&b!==clicked);
    });
    $('scoreCounter').textContent=`ВЕРНО: ${score}`;
    $('feedbackTitle').textContent=correct?'✓ ПРОПУСКАЮ... ПОКА ЧТО.':'✕ НЕСОВПАДЕНИЕ В БАЗЕ ДАННЫХ';
    setQuizScene(correct?'correct':'wrong', correct?'GOOD VIBES / SECURITY NOD':'BAD VIBES / SECURITY BLOCK', correct?'ОХРАННИК ДОВОЛЕН':'ОХРАННИК ХМУРИТСЯ');
    $('feedbackText').textContent=q.explanation;
    showArthur(reaction);
    $('feedback').classList.toggle('fail',!correct);$('feedback').hidden=false;
    $('nextBtn').textContent=index===ROUNDSIZE-1?'РЕЗУЛЬТАТ ▶':'ДАЛЬШЕ ▶';
    $('nextBtn').hidden=false;
    if(correct && winStreak===3) setTimeout(()=>audio.sfx('streak'),290);
    revealSceneDialogue();
    $('nextBtn').focus({preventScroll:true});
  }
  function next(){if(!answered)return;audio.sfx('click');if(index===ROUNDSIZE-1){finish();return;}index++;renderQuestion();}
  function finish(){
    saved.plays=(Number(saved.plays)||0)+1;
    const previousBest=Number(saved.best[currentLevel]||0);
    const isNewRecord=score>previousBest;
    saved.best[currentLevel]=Math.max(previousBest,score);save();
    $('playCount').textContent=`ПРОХОЖДЕНИЙ: ${saved.plays}`;
    const required=PASS_BY_LEVEL[currentLevel-1];
    const passed=score>=required;
    clubAccessGranted=passed;
    $('enterClubBtn').hidden=!passed;
    $('scene-result').dataset.scene=passed?'success':'denied';
    $('scene-result').setAttribute('aria-label',passed?'Охранник пропускает игрока':'Охранник отказывает во входе');
    $('resultEmblem').textContent=passed?'★':'✕';
    $('resultTag').textContent=passed?'ACCESS GRANTED':`ACCESS DENIED · НУЖНО ${required}/9`;
    $('resultTitle').textContent=passed?'ПРОХОДИ, СТАРИЧОК!':'МОЛОДОЙ ЧЕЛОВЕК, НА ВЫХОД.';
    $('resultTitle').style.color=passed?'var(--green)':'var(--red)';
    $('resultScore').textContent=`${score}/9`;
    $('resultScore').style.color=passed?'var(--green)':'var(--red)';
    $('resultLevelName').textContent=`УРОВЕНЬ ${currentLevel}\n${LEVELS[currentLevel-1].name}`;
    $('resultLevelName').style.whiteSpace='pre-line';
    // Draw end-of-round remarks from the same non-repeating Arthur dialogue pool.
    const resultCategory=score===9?'perfect':passed?'pass':'fail';
    $('resultQuote').textContent='АРТУР: «'+arthur.pick(resultCategory)+'»';
    $('resultRecord').textContent=`ДЛЯ ВХОДА НУЖНО: ${required}/9 · ${isNewRecord?'★ НОВЫЙ РЕКОРД! · ':''}ЛИЧНЫЙ РЕКОРД: ${saved.best[currentLevel]}/9`;
    $('shareStatus').textContent='';
    $('progressFill').style.width='100%';screen('screen-result');
    if(passed)audio.successfulEntry();else audio.sfx('wrong');
  }
  async function share(){
    const message=`OLDfag.exe 🕹️\nПрошёл фейсконтроль: уровень ${currentLevel}/5, результат ${score}/9. ${score>=PASS_BY_LEVEL[currentLevel-1]?'Меня пропустили! 😎':'Громила не пустил! 😠'}\nПроверь себя: ${window.location.protocol.startsWith('http')?window.location.href: '(ссылка появится после публикации)'}`;
    try{
      if(navigator.share && window.location.protocol.startsWith('http')) {
        await navigator.share({title:'OLDfag.exe — Age Check',text:message});
        $('shareStatus').textContent='РЕЗУЛЬТАТ ПЕРЕДАН В МЕССЕНДЖЕР.';
      } else if(navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);$('shareStatus').textContent='РЕЗУЛЬТАТ СКОПИРОВАН.';
      } else {throw new Error('Copy unavailable');}
    }catch(err){if(err.name==='AbortError')return;
      // Local file:// pages may not offer clipboard APIs. Give the user copyable text.
      $('shareStatus').textContent=message;
    }
  }
  $('startBtn').addEventListener('click',start);
  $('nextBtn').addEventListener('click',next);
  $('rulesBtn').addEventListener('click',()=>{audio.sfx('click');$('rulesDialog').showModal();});
  $('closeRulesBtn').addEventListener('click',()=>$('rulesDialog').close());
  $('quitBtn').addEventListener('click',()=>{audio.sfx('click');if(window.confirm('Прервать проверку? Текущий результат не сохранится.'))screen('screen-home');});
  $('replayBtn').addEventListener('click',()=>{selectedLevel=currentLevel;updateLevelButtons();start();});
  $('menuBtn').addEventListener('click',()=>{audio.cancelDoor();audio.sfx('click');selectedLevel=currentLevel;updateLevelButtons();screen('screen-home');});

  document.addEventListener('keydown',event=>{
    if(!$('screen-quiz').hidden && !$('rulesDialog').open){
      if(!answered&&'1234'.includes(event.key)&&event.key.length===1){
        const button=$('answers').children[Number(event.key)-1];if(button)button.click();
      } else if(answered&&event.key==='Enter'&&event.target!==$('nextBtn')) {event.preventDefault();next();}
    }
  });
  initLevels();
  $('playCount').textContent=`ПРОХОЖДЕНИЙ: ${Number(saved.plays)||0}`;
})();
