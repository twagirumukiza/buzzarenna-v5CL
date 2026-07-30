
// BuzzArena v4 — by twagirumukiza
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const views = ['homeView','lobbyView','gameView','resultsView','championView'];
  const SOUND_KEY='ba_sound_enabled_v1';
  const SESSION_KEY='ba_session_v1';
  const savedSound=localStorage.getItem(SOUND_KEY);
  const state = { db:null, uid:null, roomCode:null, playerId:null, playerName:null, isHost:false, room:null, currentTimer:null, sound:savedSound===null?true:savedSound==='1', localMode:false, timerFlags:{}, finalizing:false, lastBadgeKey:null };
  const els = Object.fromEntries(['homeView','lobbyView','gameView','resultsView','championView','createName','joinName','timerRange','timerValue','questionCountRange','questionCountValue','roomCodeInput','createRoomBtn','joinRoomBtn','roomCodeLabel','roomMeta','playersList','copyLinkBtn','startGameBtn','waitingText','roundLabel','questionCounter','myScore','multiplierBanner','timerRing','timerText','questionText','answersText','buzzers','answerStatus','correctAnswerLabel','questionRanking','nextProgress','soundToggle','presenterToggle','modal','modalCard','modalIcon','modalTitle','modalText','modalBtn','presenterSettingsModal','presenterSettingsClose','hostControls','endGameBtn','backToLobbyBtn','championTrophy','championEyebrow','championName','championStatsLine','finalRankingList','newGameBtn','waitingNewGame','quitGameBtn','statsBtn','statsModal','statsClose','statsTableBody','toast','audioBuzz','audioTick','audioAmbient','audioTimeEnd','audioVictory'].map(id=>[id,$('#'+id)]));

  Presenter.setSoundEnabled(state.sound);
  Presenter.setHooks({ fanfare:()=>play(els.audioTimeEnd), victory:()=>{stop(els.audioAmbient); play(els.audioVictory);} });

  function syncToggleIcons(){
    els.soundToggle.textContent=state.sound?'🔊':'🔇'; els.soundToggle.classList.toggle('off',!state.sound);
    const modeIcon={tv:'🎬',sober:'🎧',off:'🔇'}[Presenter.getMode()]||'🎬';
    els.presenterToggle.textContent=modeIcon; els.presenterToggle.classList.toggle('off',Presenter.getMode()==='off');
  }
  function syncSettingsUI(){
    $$('#modeSegmented .seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===Presenter.getMode()));
    $$('#voiceSegmented .seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.voice===Presenter.getVoiceGender()));
  }

  function showView(id){ views.forEach(v=>els[v].classList.toggle('active',v===id)); }
  function toast(msg){ els.toast.textContent=msg; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2200); }
  function randomCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
  function randomId(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function topicName(v){ return ({general:'Culture générale',contemporary:'Culture contemporaine',history:'Histoire',cinema:'7ᵉ Art (Films & Séries cultes)',sport:'Sport',animals:'Animaux',capitals:'Capitales des pays',flags:'Drapeaux des pays',literature:'Littérature',dance:'Danse',theatre:'Théâtre',judo:'Judo & Jiu-jitsu'})[v]||v; }
  function topicsLabel(arr){ return (arr&&arr.length? arr : ['general']).map(topicName).join(' + '); }
  function isFirebaseReady(){ return FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL; }
  function play(audio, restart=true){ if(!state.sound) return; try{ if(restart) audio.currentTime=0; audio.play().catch(()=>{}); }catch{} }
  function stop(audio){ try{audio.pause();audio.currentTime=0}catch{} }

  async function initBackend(){
    if(isFirebaseReady()){
      firebase.initializeApp(FIREBASE_CONFIG); state.db=firebase.database();
      try{
        const cred=await firebase.auth().signInAnonymously();
        state.uid=cred.user.uid;
      }catch(err){
        console.error('Connexion anonyme Firebase impossible :',err);
        state.localMode=true;
        toast('Connexion au serveur impossible (auth). Mode démo local activé.');
      }
    } else { state.localMode=true; console.warn('Mode démonstration local : configurez Firebase pour le multijoueur en ligne.'); }
  }

  function saveSession(){ if(state.localMode) return; localStorage.setItem(SESSION_KEY, JSON.stringify({roomCode:state.roomCode, playerId:state.playerId, playerName:state.playerName})); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  async function tryResume(){
    if(state.localMode || !state.uid) return false;
    let saved; try{ saved=JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch{ saved=null; }
    if(!saved || !saved.roomCode) return false;
    const pid=state.uid;
    try{
      const snap=await state.db.ref(`rooms/${saved.roomCode}`).once('value');
      if(!snap.exists()){ clearSession(); return false; }
      const room=snap.val();
      state.roomCode=saved.roomCode; state.playerId=pid; state.playerName=saved.playerName||room.players?.[pid]?.name||'Joueur';
      if(!room.players || !room.players[pid]){
        if(room.phase==='lobby'){ await state.db.ref(`rooms/${saved.roomCode}/players/${pid}`).set({name:state.playerName,score:0,connected:true}); }
        else { clearSession(); return false; }
      }
      state.isHost = room.hostId===pid;
      subscribeRoom();
      history.replaceState(null,'',`?room=${state.roomCode}`);
      toast('Reconnexion à la partie en cours…');
      return true;
    }catch{ return false; }
  }


  els.timerRange.addEventListener('input',()=>els.timerValue.textContent=`${els.timerRange.value} s`);
  els.questionCountRange.addEventListener('input',()=>els.questionCountValue.textContent=els.questionCountRange.value);
  els.soundToggle.addEventListener('click',()=>{ state.sound=!state.sound; localStorage.setItem(SOUND_KEY,state.sound?'1':'0'); Presenter.setSoundEnabled(state.sound); syncToggleIcons(); if(!state.sound) [els.audioTick,els.audioAmbient].forEach(stop); else if(state.room?.phase!=='lobby') play(els.audioAmbient,false); });
  els.presenterToggle.addEventListener('click',()=>{ syncSettingsUI(); els.presenterSettingsModal.classList.remove('hidden'); });
  els.presenterSettingsClose.addEventListener('click',()=>els.presenterSettingsModal.classList.add('hidden'));
  $$('#modeSegmented .seg-btn').forEach(b=>b.addEventListener('click',()=>{ Presenter.setMode(b.dataset.mode); syncSettingsUI(); syncToggleIcons(); }));
  $$('#voiceSegmented .seg-btn').forEach(b=>b.addEventListener('click',()=>{ Presenter.setVoiceGender(b.dataset.voice); syncSettingsUI(); }));
  els.copyLinkBtn.addEventListener('click',async()=>{ const link=`${location.origin}${location.pathname}?room=${state.roomCode}`; await navigator.clipboard.writeText(link); toast('Lien du salon copié'); });
  els.modalBtn.addEventListener('click',()=>{ els.modal.classList.add('hidden'); });

  els.createRoomBtn.addEventListener('click', async()=>{
    const name=els.createName.value.trim(); if(!name) return toast('Saisissez votre pseudo');
    const topics=$$('.topicCheck').filter(c=>c.checked).map(c=>c.value); if(!topics.length) return toast('Choisissez au moins un thème');
    if(!state.localMode && !state.uid) return toast('Connexion au serveur en cours, réessayez dans un instant…');
    state.playerName=name; state.playerId=state.localMode?randomId():state.uid; state.isHost=true; state.roomCode=randomCode();
    const room={code:state.roomCode,hostId:state.playerId,topics,duration:+els.timerRange.value,questionCount:+els.questionCountRange.value,phase:'lobby',round:0,questionIndex:-1,usedQuestions:[],players:{[state.playerId]:{name,score:0,connected:true}},createdAt:Date.now()};
    if(state.localMode){ state.room=room; renderLobby(); showView('lobbyView'); }
    else { await state.db.ref(`rooms/${state.roomCode}`).set(room); subscribeRoom(); saveSession(); }
    history.replaceState(null,'',`?room=${state.roomCode}`);
  });

  els.joinRoomBtn.addEventListener('click', async()=>{
    const name=els.joinName.value.trim(), code=els.roomCodeInput.value.trim().toUpperCase();
    if(!name||!code) return toast('Saisissez votre pseudo et le code');
    if(state.localMode) return toast('Configurez Firebase pour rejoindre un salon en ligne');
    if(!state.uid) return toast('Connexion au serveur en cours, réessayez dans un instant…');
    const snap=await state.db.ref(`rooms/${code}`).once('value'); if(!snap.exists()) return toast('Salon introuvable');
    const room=snap.val(); if(room.phase!=='lobby') return toast('La partie a déjà commencé');
    state.playerName=name; state.playerId=state.uid; state.roomCode=code; state.isHost=false;
    await state.db.ref(`rooms/${code}/players/${state.playerId}`).set({name,score:0,connected:true}); subscribeRoom(); saveSession();
    history.replaceState(null,'',`?room=${state.roomCode}`);
  });

  function subscribeRoom(){
    state.db.ref(`rooms/${state.roomCode}`).on('value',snap=>{
      if(!snap.exists()) return toast('Le salon a été fermé');
      const prev=state.room; state.room=snap.val(); state.isHost=state.room.hostId===state.playerId;
      routeRoom(prev,state.room);
    });
  }

  function syncHostControls(){
    const show = state.isHost && state.room && ['lobby','question','results','finalists'].includes(state.room.phase);
    els.hostControls.classList.toggle('hidden',!show);
  }

  function routeRoom(prev,room){
    syncHostControls();
    if(room.phase==='lobby'){ renderLobby(); showView('lobbyView'); return; }
    if(room.phase==='question'){
      const isFreshQuestion=!prev || prev.phase!=='question' || prev.questionIndex!==room.questionIndex || prev.round!==room.round;
      if(isFreshQuestion){
        if(prev && prev.phase==='lobby'){
          const names=Object.values(room.players||{}).map(p=>p.name);
          Presenter.say(Presenter.line('welcome',state.roomCode,{n:names.length}),{holdMs:3400});
          setTimeout(()=>Presenter.say(Presenter.line('theme',state.roomCode+'t',{theme:topicsLabel(room.topics)}),{holdMs:3200}),2600);
        }
        if(prev && prev.phase==='finalists'){
          Presenter.say(Presenter.line('finalIntro',state.roomCode+'fi'),{holdMs:3400});
        }
        renderQuestion();
      }
      updateScore();
      if(state.isHost && !state.localMode && !state.finalizing){
        const elig=eligiblePlayers(); const answered=Object.keys(room.answers||{}).length;
        if(elig.length>0 && answered>=elig.length){ state.finalizing=true; finalizeQuestion(); }
      }
      return;
    }
    if(room.phase==='results'){
      if(!prev || prev.phase!=='results' || prev.questionIndex!==room.questionIndex || prev.round!==room.round) renderResults();
      if(room.badgeEvent && room.badgeEvent.key!==state.lastBadgeKey){
        state.lastBadgeKey=room.badgeEvent.key;
        room.badgeEvent.events.forEach((ev,idx)=>{
          const pname=room.players[ev.id]?.name||''; const key= ev.type==='streak'?'badgeStreak':'badgeLightning';
          setTimeout(()=>Presenter.say(Presenter.line(key,room.badgeEvent.key+idx,{name:pname}),{holdMs:2400}), 5000+idx*2600);
        });
      }
      return;
    }
    if(room.phase==='stopped'){ if(!prev || prev.phase!=='stopped') showStoppedScreen(); return; }
    if(room.phase==='finalists' && (!prev || prev.phase!=='finalists')) announceFinalists();
    if(room.phase==='champion' && (!prev || prev.phase!=='champion')) announceChampion();
  }

  function renderLobby(){
    els.roomCodeLabel.textContent=state.roomCode; els.roomMeta.textContent=`${topicsLabel(state.room.topics)} · ${state.room.duration} s/question · ${state.room.questionCount||10} questions (Manche 1)`;
    els.playersList.innerHTML=''; Object.entries(state.room.players||{}).forEach(([id,p])=>{ els.playersList.insertAdjacentHTML('beforeend',`<div class="player-row"><span><span class="player-badge"></span> ${escapeHtml(p.name)} ${id===state.room.hostId?'👑':''}</span><strong>${p.score||0}</strong></div>`); });
    els.startGameBtn.classList.toggle('hidden',!state.isHost); els.waitingText.classList.toggle('hidden',state.isHost);
  }

  els.startGameBtn.addEventListener('click',async()=>{
    const players=Object.keys(state.room.players||{}); if(players.length<2 && !state.localMode) return toast('Il faut au moins deux joueurs');
    if(state.localMode && players.length<2){ state.room.players.bot={name:'Joueur démo',score:0,connected:true}; }
    const questions=buildQuestionSet(state.room.topics,state.room.questionCount||10,true,state.room.usedQuestions||[]);
    await patchRoom({questions,usedQuestions:questions.map(q=>q.text),round:1,questionIndex:0,phase:'question',finalists:null,champion:null,answers:null,resultRanking:null,badgeEvent:null,questionStartedAt:Date.now(),questionEndAt:Date.now()+state.room.duration*1000});
  });

  async function patchRoom(data){
    if(state.localMode){ Object.assign(state.room,data); routeRoom(null,state.room); }
    else await state.db.ref(`rooms/${state.roomCode}`).update(data);
  }

  function currentQuestion(){ return state.room.questions?.[state.room.questionIndex]; }
  function roundTotal(){
    if(state.room.questions && state.room.questions.length) return state.room.questions.length;
    return state.room.round===1 ? (state.room.questionCount||10) : state.room.round===2 ? 6 : 1;
  }
  function eligiblePlayers(){
    const ids=Object.keys(state.room.players||{});
    return state.room.round>=2 ? ids.filter(id=>(state.room.finalists||[]).includes(id)) : ids;
  }

  function renderQuestion(){
    showView('gameView'); const q=currentQuestion(); if(!q) return;
    state.finalizing=false;
    stop(els.audioTimeEnd); play(els.audioAmbient,false); stop(els.audioTick); play(els.audioTick,false);
    els.roundLabel.textContent=state.room.round===1?'MANCHE 1':state.room.round===2?'FINALE':'QUESTION DÉCISIVE';
    const total=roundTotal();
    els.questionCounter.textContent=`Question ${state.room.questionIndex+1} / ${total}`;
    els.questionText.textContent=q.text; els.answersText.innerHTML=q.choices.map((c,i)=>`<div class="answer-line"><strong>${'ABCD'[i]}</strong>${escapeHtml(c)}</div>`).join('');
    els.multiplierBanner.textContent=q.multiplier===3?'QUESTION TRIPLE ×3':q.multiplier===2?'QUESTION DOUBLE ×2':'BARÈME NORMAL ×1';
    els.multiplierBanner.className='multiplier-banner'+(q.multiplier===2?' double':q.multiplier===3?' triple':'');
    const already=state.room.answers?.[state.playerId]; const isEligible=eligiblePlayers().includes(state.playerId);
    $$('.buzzer-btn').forEach(b=>{ b.disabled=!!already || !isEligible; b.classList.toggle('selected', !!already && +b.dataset.choice===already.choice); });
    els.answerStatus.textContent= already?'Réponse enregistrée' : (isEligible?'Choisissez une réponse.':'Vous êtes spectateur de cette manche.');
    updateScore(); startTimer();
    state.timerFlags={half:false,low:false};
    const seed=q.id||(state.roomCode+state.room.round+state.room.questionIndex);
    const delay=(state.room.questionIndex===0 && state.room.round===1)?5200:200;
    setTimeout(()=>{
      if(q.multiplier===3){ els.multiplierBanner.classList.add('drumroll-shake'); Presenter.say(Presenter.line('introTriple',seed),{holdMs:2600}); Presenter.drumroll(1500); setTimeout(()=>els.multiplierBanner.classList.remove('drumroll-shake'),1500); }
      else if(q.multiplier===2){ Presenter.say(Presenter.line('introDouble',seed),{holdMs:2400}); }
      else { Presenter.say(Presenter.line('introNormal',seed,{i:state.room.questionIndex+1,n:total}),{holdMs:2200}); }
    },delay);
  }

  function startTimer(){
    clearInterval(state.currentTimer); const duration=state.room.duration; const seed=(currentQuestion()?.id)||(state.roomCode+state.room.round+state.room.questionIndex);
    const tick=()=>{
      const remaining=Math.max(0,(state.room.questionEndAt-Date.now())/1000); els.timerText.textContent=Math.ceil(remaining);
      const pct=Math.max(0,remaining/duration*100); els.timerRing.style.background=`conic-gradient(var(--accent2) ${pct}%,#26334d 0)`;
      if(!state.timerFlags.half && remaining<=duration/2 && remaining>duration/2-1 && duration>10){ state.timerFlags.half=true; Presenter.say(Presenter.line('timerHalf',seed+'h'),{holdMs:1800}); }
      if(!state.timerFlags.low && remaining<=5 && remaining>4.2){ state.timerFlags.low=true; Presenter.say(Presenter.line('timerLow',seed+'l'),{holdMs:1800}); }
      if(remaining<=0){clearInterval(state.currentTimer);stop(els.audioTick);play(els.audioTimeEnd); $$('.buzzer-btn').forEach(b=>b.disabled=true); if(state.isHost && !state.finalizing){state.finalizing=true; finalizeQuestion();}}
    };
    tick(); state.currentTimer=setInterval(tick,200);
  }

  els.buzzers.addEventListener('click',async e=>{
    const btn=e.target.closest('.buzzer-btn'); if(!btn||btn.disabled) return;
    if(!eligiblePlayers().includes(state.playerId)) return toast('Vous êtes spectateur de cette manche');
    const choice=+btn.dataset.choice; $$('.buzzer-btn').forEach(b=>b.disabled=true); btn.classList.add('selected'); els.answerStatus.textContent='Réponse enregistrée'; play(els.audioBuzz);
    const answer={choice,submittedAt:Date.now()};
    if(state.localMode){
      state.room.answers=state.room.answers||{}; state.room.answers[state.playerId]=answer;
      setTimeout(()=>{ state.room.answers.bot={choice:Math.floor(Math.random()*4),submittedAt:Date.now()+300}; if(state.isHost && !state.finalizing){state.finalizing=true; finalizeQuestion();} },600);
    } else await state.db.ref(`rooms/${state.roomCode}/answers/${state.playerId}`).set({...answer,submittedAt:firebase.database.ServerValue.TIMESTAMP});
  });

  async function finalizeQuestion(){
    if(state.room.phase!=='question'){ state.finalizing=false; return; }
    if(!state.localMode){ const snap=await state.db.ref(`rooms/${state.roomCode}`).once('value'); state.room=snap.val(); if(state.room.phase!=='question'){ state.finalizing=false; return; } }
    const q=currentQuestion(), answers=state.room.answers||{}, players=state.room.players||{}, started=state.room.questionStartedAt, duration=state.room.duration*1000;
    const ranking=eligiblePlayers().map(id=>{ const a=answers[id]; const correct=!!a&&a.choice===q.correct; const elapsed=a?Math.max(0,a.submittedAt-started):duration; const points=correct?Math.round((1000+500*Math.max(0,1-elapsed/duration))*q.multiplier):0; return {id,name:players[id].name,correct,elapsed,points}; }).sort((a,b)=>b.correct-a.correct || a.elapsed-b.elapsed);
    const updates={phase:'results',resultRanking:ranking}; const badgeEvents=[];
    ranking.forEach(r=>{
      updates[`players/${r.id}/score`]=(players[r.id].score||0)+r.points;
      const st=players[r.id].stats||{correct:0,answered:0,totalElapsedCorrect:0,streak:0,maxStreak:0,lightning:false};
      const answered=st.answered+1, correct=st.correct+(r.correct?1:0), totalElapsedCorrect=st.totalElapsedCorrect+(r.correct?r.elapsed:0);
      const streak=r.correct?st.streak+1:0, maxStreak=Math.max(st.maxStreak,streak), lightning=st.lightning||(r.correct&&r.elapsed<1000);
      updates[`players/${r.id}/stats`]={correct,answered,totalElapsedCorrect,streak,maxStreak,lightning};
      if(streak===5) badgeEvents.push({type:'streak',id:r.id});
      if(r.correct && r.elapsed<1000) badgeEvents.push({type:'lightning',id:r.id});
    });
    if(badgeEvents.length) updates.badgeEvent={key:`${state.room.round}-${state.room.questionIndex}-${Date.now()}`,events:badgeEvents};
    if(state.localMode){
      ranking.forEach(r=>{ state.room.players[r.id].score=updates[`players/${r.id}/score`]; state.room.players[r.id].stats=updates[`players/${r.id}/stats`]; });
      Object.assign(state.room,{phase:'results',resultRanking:ranking,badgeEvent:updates.badgeEvent||null}); routeRoom(null,state.room);
    } else await state.db.ref(`rooms/${state.roomCode}`).update(updates);
    state.finalizing=false;
  }

  function renderResults(){
    clearInterval(state.currentTimer); stop(els.audioTick); showView('resultsView'); const q=currentQuestion(); els.correctAnswerLabel.textContent=`Bonne réponse : ${'ABCD'[q.correct]} — ${q.choices[q.correct]}`;
    els.questionRanking.innerHTML=(state.room.resultRanking||[]).map((r,i)=>`<div class="rank-row ${r.correct?'correct':'wrong'}"><strong>${i+1}</strong><span>${escapeHtml(r.name)} ${r.correct?'✓':'✕'}</span><strong>+${r.points}</strong></div>`).join('');
    els.nextProgress.style.width='0'; requestAnimationFrame(()=>{els.nextProgress.style.transition='width 4s linear';els.nextProgress.style.width='100%'});
    presentAnalysis();
    if(state.isHost) setTimeout(advanceGame,4200);
  }

  function totalQuestionsRemaining(){ const total=roundTotal(); return total-(state.room.questionIndex+1); }

  function computeAnalysis(){
    const players=state.room.players||{}, ranking=state.room.resultRanking||[];
    const prevScores={};
    Object.keys(players).forEach(id=>{ const entry=ranking.find(r=>r.id===id); prevScores[id]=(players[id].score||0)-(entry?entry.points:0); });
    const prevOrder=Object.keys(players).sort((a,b)=>prevScores[b]-prevScores[a]);
    const newOrder=Object.keys(players).sort((a,b)=>(players[b].score||0)-(players[a].score||0));
    const prevLeader=prevOrder[0], newLeader=newOrder[0];
    let comebackId=null, bestJump=0;
    newOrder.forEach((id,i)=>{ const prevIdx=prevOrder.indexOf(id); const jump=prevIdx-i; if(jump>bestJump){bestJump=jump;comebackId=id;} });
    const fastestCorrect=[...ranking].filter(r=>r.correct).sort((a,b)=>a.elapsed-b.elapsed)[0];
    const top2=newOrder.slice(0,2); const gap=top2.length===2?Math.abs((players[top2[0]].score||0)-(players[top2[1]].score||0)):9999;
    const leaderChanged=prevLeader!==newLeader && (players[newLeader].score||0)>0 && newOrder.length>1;
    return {leaderChanged,newLeader,comebackId,bestJump,fastestCorrect,gapClose:gap<=500,ranking};
  }

  function presentAnalysis(){
    const a=computeAnalysis(), q=currentQuestion(), seed=(q.id||'')+'-a', lines=[];
    if(a.fastestCorrect && a.fastestCorrect.elapsed<3500){ lines.push(Presenter.line('fastReflex',seed+'r',{name:a.fastestCorrect.name,s:(a.fastestCorrect.elapsed/1000).toFixed(1)})); }
    if(a.leaderChanged){ lines.push(Presenter.line('newLeader',seed+'n',{name:state.room.players[a.newLeader].name})); }
    else if(a.comebackId && a.bestJump>=2){ lines.push(Presenter.line('comeback',seed+'c',{name:state.room.players[a.comebackId].name})); }
    else { const allWrong=!a.ranking.some(r=>r.correct); lines.push(allWrong?Presenter.line('allWrong',seed+'w'):Presenter.line('generic',seed+'g')); }
    const remaining=totalQuestionsRemaining();
    if(a.gapClose && remaining>0 && remaining<=2){ lines.push(Presenter.line('closeFinish',seed+'f',{n:remaining})); }
    lines.slice(0,2).forEach((t,i)=>setTimeout(()=>Presenter.say(t,{holdMs:2600}),i*2700));
  }

  async function advanceGame(){
    const r=state.room.round, i=state.room.questionIndex; const total=roundTotal();
    if(i<total-1) return patchRoom({questionIndex:i+1,phase:'question',answers:null,resultRanking:null,badgeEvent:null,questionStartedAt:Date.now(),questionEndAt:Date.now()+state.room.duration*1000});
    if(r===1){
      const sorted=Object.entries(state.room.players).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
      const finalists=sorted.slice(0,2).map(x=>x[0]);
      const resetScores={}; Object.keys(state.room.players).forEach(id=>resetScores[`players/${id}/score`]=0);
      await patchRoom({phase:'finalists',finalists,...resetScores});
      if(state.isHost) setTimeout(()=>startFinal(),3500);
      return;
    }
    const finalists=state.room.finalists; const p=state.room.players; const s1=p[finalists[0]].score||0, s2=p[finalists[1]].score||0;
    if(s1===s2 && r<7){
      const used=[...(state.room.usedQuestions||[]), ...state.room.questions.map(q=>q.text)];
      const questions=buildQuestionSet(state.room.topics,1,false,used);
      const reset={}; finalists.forEach(id=>reset[`players/${id}/score`]=0);
      return patchRoom({questions,usedQuestions:[...used,...questions.map(q=>q.text)],round:r+1,questionIndex:0,phase:'question',answers:null,resultRanking:null,badgeEvent:null,questionStartedAt:Date.now(),questionEndAt:Date.now()+state.room.duration*1000,...reset});
    }
    const champion = s1===s2 ? finalists[0] : (s1>s2?finalists[0]:finalists[1]);
    await patchRoom({phase:'champion',champion});
  }

  function announceFinalists(){
    const [a,b]=state.room.finalists.map(id=>state.room.players[id].name);
    Presenter.say(Presenter.line('finalists',state.roomCode+'fin',{a,b}),{holdMs:3600}); Presenter.fanfare();
    showModal('⚡','Les deux finalistes',`${a} affronte ${b} dans une finale de 6 questions.`);
  }
  async function startFinal(){
    const questions=buildQuestionSet(state.room.topics,6,false,state.room.usedQuestions||[]);
    await patchRoom({questions,usedQuestions:[...(state.room.usedQuestions||[]),...questions.map(q=>q.text)],round:2,questionIndex:0,phase:'question',answers:null,resultRanking:null,badgeEvent:null,questionStartedAt:Date.now(),questionEndAt:Date.now()+state.room.duration*1000});
  }

  function announceChampion(){
    const champ=state.room.champion, name=state.room.players[champ].name; stop(els.audioAmbient);
    Presenter.stageDark();
    setTimeout(()=>Presenter.say(Presenter.line('championIntro',state.roomCode+'ci'),{holdMs:2200}),650);
    setTimeout(()=>{ Presenter.drumroll(1800); Presenter.say(Presenter.line('championBuild',state.roomCode+'cb'),{holdMs:2000}); },2600);
    setTimeout(()=>{ Presenter.say(Presenter.line('championReveal',state.roomCode+'cr'),{holdMs:1700}); Presenter.suspense(1700); },4700);
    setTimeout(()=>{
      Presenter.stageSpotlight();
      Presenter.say(`🏆 …${name} !! Félicitations !`,{holdMs:3000});
      Presenter.fireworks(2400);
      setTimeout(()=>Presenter.confettiBurst(3000),500);
      Presenter.victory();
    },6700);
    setTimeout(()=>{ Presenter.stageClear(); presentFinalAnalysis(); showView('championView'); renderChampionView(); },9900);
  }

  function presentFinalAnalysis(){
    const champ=state.room.champion, p=state.room.players[champ], st=p.stats||{correct:0,totalElapsedCorrect:0};
    const avg = st.correct? (st.totalElapsedCorrect/st.correct/1000).toFixed(1) : '0.0';
    Presenter.say(Presenter.line('finalAnalysis',state.roomCode+'fa',{name:p.name,correct:st.correct,avg}),{holdMs:3800});
    setTimeout(()=>Presenter.say(Presenter.line('farewell',state.roomCode+'fw'),{holdMs:3600}),4000);
  }

  function renderStatsModal(){
    const champ=state.room.champion;
    const sorted=Object.entries(state.room.players||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
    els.statsTableBody.innerHTML=sorted.map(([id,pl])=>{
      const s=pl.stats||{correct:0,answered:0,totalElapsedCorrect:0,maxStreak:0};
      const accuracy = s.answered? Math.round(s.correct/s.answered*100) : 0;
      const avg = s.correct? (s.totalElapsedCorrect/s.correct/1000).toFixed(1)+' s' : '—';
      const isChamp = champ && id===champ;
      return `<div class="stats-row${isChamp?' is-champion':''}">
        <span data-label="Joueur">${escapeHtml(pl.name)}${isChamp?' 👑':''}</span>
        <span data-label="Score">${pl.score||0}</span>
        <span data-label="Bonnes réponses">${s.correct||0} / ${s.answered||0}</span>
        <span data-label="Précision">${accuracy}%</span>
        <span data-label="Temps moyen">${avg}</span>
        <span data-label="Meilleure série">${s.maxStreak||0}</span>
      </div>`;
    }).join('');
    els.statsModal.classList.remove('hidden');
  }
  els.statsBtn.addEventListener('click', renderStatsModal);
  els.statsClose.addEventListener('click', ()=>els.statsModal.classList.add('hidden'));

  function renderFinalRanking(){
    const champ=state.room.champion;
    const sorted=Object.entries(state.room.players).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
    els.finalRankingList.innerHTML=sorted.map(([id,pl],i)=>{
      const s=pl.stats||{}; let badges='';
      if(champ && id===champ) badges+='👑'; if(s.maxStreak>=5) badges+=' 🔥'; if(s.lightning) badges+=' ⚡'; if(s.correct>0 && s.correct===s.answered) badges+=' 🎯';
      return `<div class="rank-row"><strong>${i+1}</strong><span>${escapeHtml(pl.name)}<span class="badges">${badges}</span></span><strong>${pl.score||0}</strong></div>`;
    }).join('');
    els.newGameBtn.classList.toggle('hidden',!state.isHost); els.waitingNewGame.classList.toggle('hidden',state.isHost);
  }

  function renderChampionView(){
    const champ=state.room.champion, p=state.room.players[champ], st=p.stats||{correct:0,totalElapsedCorrect:0,answered:0};
    const avg = st.correct? (st.totalElapsedCorrect/st.correct/1000).toFixed(1) : '0.0';
    els.championTrophy.textContent='🏆'; els.championEyebrow.textContent='👑 CHAMPION DE BUZZARENA';
    els.championName.textContent=p.name;
    els.championStatsLine.textContent=`${st.correct} bonne(s) réponse(s) · temps moyen ${avg} s`;
    renderFinalRanking();
  }

  function showStoppedScreen(){
    clearInterval(state.currentTimer); stop(els.audioTick); stop(els.audioAmbient); Presenter.stageClear();
    const neverStarted = !state.room.round || state.room.round===0;
    els.championTrophy.textContent='⏸️'; els.championEyebrow.textContent = neverStarted?'SALON FERMÉ':'PARTIE INTERROMPUE';
    els.championName.textContent = neverStarted ? 'Le salon a été fermé par l’organisateur.' : 'La partie a été interrompue par l’organisateur.';
    els.championStatsLine.textContent = neverStarted ? 'Vous pouvez lancer une nouvelle partie.' : 'Les scores ont été conservés — une nouvelle partie peut être relancée.';
    Presenter.say(neverStarted?'⏸️ Le salon a été fermé par l’organisateur.':'⏸️ La partie a été interrompue par l’organisateur.',{holdMs:3000});
    renderFinalRanking();
    showView('championView');
  }

  async function resetToLobby(){
    const ids=Object.keys(state.room.players||{});
    if(state.localMode){
      ids.forEach(id=>{ state.room.players[id].score=0; state.room.players[id].stats=null; });
      Object.assign(state.room,{phase:'lobby',round:0,questionIndex:-1,questions:null,answers:null,resultRanking:null,finalists:null,champion:null,badgeEvent:null,usedQuestions:[]});
      routeRoom(null,state.room);
    } else {
      const reset={}; ids.forEach(id=>{ reset[`players/${id}/score`]=0; reset[`players/${id}/stats`]=null; });
      await state.db.ref(`rooms/${state.roomCode}`).update({phase:'lobby',round:0,questionIndex:-1,questions:null,answers:null,resultRanking:null,finalists:null,champion:null,badgeEvent:null,usedQuestions:[],...reset});
    }
  }

  els.newGameBtn.addEventListener('click', ()=>{ if(state.isHost) resetToLobby(); });
  els.quitGameBtn.addEventListener('click',()=>{
    if(!state.localMode && state.roomCode) state.db.ref(`rooms/${state.roomCode}`).off();
    clearSession(); state.room=null; state.roomCode=null; state.playerId=null; state.isHost=false;
    history.replaceState(null,'',location.pathname); showView('homeView');
  });

  els.endGameBtn.addEventListener('click', async()=>{
    if(!state.isHost) return;
    if(!confirm('Terminer la partie maintenant ? Les scores actuels seront conservés et affichés à tous les joueurs.')) return;
    await patchRoom({phase:'stopped'});
  });
  els.backToLobbyBtn.addEventListener('click', async()=>{
    if(!state.isHost) return;
    if(!confirm('Revenir au lobby ? Les scores, questions et la manche en cours seront réinitialisés pour tous les joueurs.')) return;
    await resetToLobby();
  });

  function showModal(icon,title,text){ els.modalIcon.textContent=icon; els.modalTitle.textContent=title; els.modalText.textContent=text; els.modal.classList.remove('hidden'); }
  function updateScore(){ els.myScore.textContent=state.room?.players?.[state.playerId]?.score||0; }
  function escapeHtml(s=''){ return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  (async()=>{
    await initBackend();
    syncToggleIcons();
    const resumed = await tryResume();
    if(!resumed){
      const incoming=new URLSearchParams(location.search).get('room'); if(incoming){els.roomCodeInput.value=incoming.toUpperCase();els.joinName.focus();}
    }
  })();
})();
