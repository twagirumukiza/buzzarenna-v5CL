// BuzzArena v4 — Présentateur TV IA
// Bandeau de commentaires, voix off (Web Speech API), effets sonores
// synthétisés (tambour, suspense), confettis, feux d'artifice et mise en
// lumière de scène — aucun fichier externe requis.
// by twagirumukiza

const Presenter = (() => {
  const MODE_KEY = 'ba_presenter_mode_v1';   // 'tv' | 'sober' | 'off'
  const VOICE_KEY = 'ba_presenter_voice_v1'; // 'female' | 'male'
  let mode = localStorage.getItem(MODE_KEY) || 'tv';
  let voiceGender = localStorage.getItem(VOICE_KEY) || 'female';
  let soundOn = true; // synchronisé par app.js via setSoundEnabled()
  let hooks = { fanfare: null, victory: null };

  // ---------- Texte du présentateur (variantes) ----------
  const TPL = {
    welcome: [
      "🎙️ Bienvenue dans BuzzArena ! Aujourd'hui, {n} concurrents vont tenter de devenir champion !",
      "🎙️ Installez-vous confortablement, {n} candidats sont prêts à en découdre dans BuzzArena !",
      "🎙️ Mesdames et messieurs, {n} concurrents entrent en piste pour BuzzArena !"
    ],
    theme: [
      "Le thème du jour : {theme}. Que le meilleur gagne !",
      "Aujourd'hui, direction « {theme} ». Bonne chance à toutes et à tous !",
      "Cette partie sera consacrée à « {theme} ». Concentration maximale !"
    ],
    introNormal: [
      "Première question… attention, la partie commence !",
      "Question {i} sur {n}… concentration maximale !",
      "On enchaîne avec la question {i} sur {n}.",
      "Prêts ? Voici la question {i} !"
    ],
    introDouble: [
      "Attention… cette question vaut DOUBLE !",
      "Accrochez-vous, voici une question qui vaut DOUBLE !",
      "Ça se corse : cette question vaut le double des points !"
    ],
    introTriple: [
      "Roulement de tambour… cette question vaut TRIPLE !!!",
      "Moment décisif : une question TRIPLE arrive !",
      "Tout peut basculer : voici la question TRIPLE de la partie !"
    ],
    timerHalf: [
      "Le temps tourne…",
      "La moitié du temps est déjà passée !",
      "Qui va se décider en premier ?"
    ],
    timerLow: [
      "Plus que cinq secondes, dépêchez-vous !",
      "Vite, le temps est presque écoulé !",
      "Dernières secondes… vite !"
    ],
    fastReflex: [
      "Quel réflexe ! {name} répond en seulement {s} secondes !",
      "Éclair ! {name} a dégainé en {s} secondes à peine !",
      "Impressionnant, {name} a répondu en {s} secondes !"
    ],
    newLeader: [
      "Excellent ! {name} prend la tête du classement !",
      "Changement en tête : {name} passe devant tout le monde !",
      "{name} s'empare de la première place !"
    ],
    comeback: [
      "Quelle remontée spectaculaire de {name} !",
      "{name} réalise une remontée fulgurante !",
      "Retournement de situation : {name} grimpe au classement !"
    ],
    generic: [
      "Bonne pioche pour les plus rapides sur cette question.",
      "Une question qui a fait la différence !",
      "Ça se joue serré, la partie continue."
    ],
    allWrong: [
      "Question piège ! Personne n'a trouvé la bonne réponse.",
      "Personne n'est tombé juste, quelle question redoutable !",
      "Aïe, tout le monde s'est trompé sur ce coup-là !"
    ],
    closeFinish: [
      "Plus que {n} question(s)… tout peut encore basculer !",
      "Attention, il ne reste que {n} question(s) et tout reste possible !",
      "Rien n'est joué, {n} question(s) suffisent à tout changer !"
    ],
    badgeStreak: [
      "🔥 {name} enchaîne cinq bonnes réponses d'affilée !",
      "🔥 Série en cours pour {name}, cinq bonnes réponses de suite !"
    ],
    badgeLightning: [
      "⚡ Réponse éclair de {name}, en moins d'une seconde !",
      "⚡ {name} a dégainé plus vite que son ombre !"
    ],
    finalists: [
      "Et voici nos deux finalistes : {a} et {b} ! La grande finale va commencer.",
      "Place à la finale ! {a} affronte {b} pour le titre de champion."
    ],
    finalIntro: [
      "Bienvenue dans la grande finale de BuzzArena ! Six questions vont désigner le champion.",
      "La tension monte : six questions décisives pour couronner un champion."
    ],
    championIntro: [
      "Après une magnifique partie…",
      "Quelle partie incroyable, mesdames et messieurs…",
      "Ce fut une compétition acharnée…"
    ],
    championBuild: [
      "🥁 Le suspense est à son comble…",
      "🥁 Silence… l'heure de vérité a sonné.",
      "🥁 Plus une seconde à perdre, le verdict approche…"
    ],
    championReveal: [
      "Le champion de BuzzArena est…",
      "Le titre revient à…",
      "Après cette bataille, le grand vainqueur est…"
    ],
    finalAnalysis: [
      "{name} remporte cette partie avec {correct} bonnes réponses et un temps moyen de {avg} seconde. Une performance exceptionnelle !",
      "Avec {correct} bonnes réponses et {avg} seconde de réflexion en moyenne, {name} signe une performance remarquable !"
    ],
    farewell: [
      "Merci d'avoir joué à BuzzArena. À très bientôt pour une nouvelle émission !",
      "Merci à toutes et à tous d'avoir joué. Rendez-vous très vite pour une nouvelle compétition !"
    ]
  };

  function hashSeed(str) { let h = 0; str = String(str); for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; } return h; }
  function pick(key, seed) { const arr = TPL[key] || ['…']; return arr[hashSeed(seed) % arr.length]; }
  function fmt(str, map) { return str.replace(/\{(\w+)\}/g, (_, k) => (map && map[k] !== undefined) ? map[k] : ''); }
  function line(key, seed, map) { return fmt(pick(key, seed), map); }

  // ---------- Bandeau + voix ----------
  let bannerTimeout = null, voices = [];
  function loadVoices() { voices = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : []; }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

  function frenchVoices() { return voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr')); }
  function pickVoice() {
    const fr = frenchVoices(); if (!fr.length) return null;
    const genderRegex = voiceGender === 'male' ? /male|homme|thomas|guillaume|nicolas|paul/i : /female|femme|amelie|amélie|audrey|marie|julie|celine|céline/i;
    return fr.find(v => genderRegex.test(v.name)) || fr[voiceGender === 'male' ? fr.length - 1 : 0] || fr[0];
  }

  function els() { return { banner: document.getElementById('presenterBanner'), text: document.getElementById('presenterText') }; }

  function say(text, opts = {}) {
    if (mode === 'off' || !text) return;
    const { banner, text: textEl } = els();
    if (banner && textEl) {
      textEl.textContent = text;
      banner.classList.remove('hidden');
      requestAnimationFrame(() => banner.classList.add('show'));
      clearTimeout(bannerTimeout);
      const holdMs = opts.holdMs || Math.max(2600, text.length * 75);
      bannerTimeout = setTimeout(() => banner.classList.remove('show'), holdMs);
    }
    if (mode === 'tv' && soundOn && 'speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const clean = text.replace(/[🎙️🏆⚡🎉🥁🔥]/gu, '').trim();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = 'fr-FR'; const v = pickVoice(); if (v) u.voice = v;
        u.rate = opts.rate || 1.03; u.pitch = opts.pitch || (voiceGender === 'male' ? 0.82 : 1.18);
        speechSynthesis.speak(u);
      } catch { /* voix indisponible, le bandeau suffit */ }
    }
  }

  // ---------- Effets sonores synthétisés (aucun fichier externe requis) ----------
  let audioCtx = null;
  function ctx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); return audioCtx; }
  function noiseBuffer(c, duration) { const buf = c.createBuffer(1, Math.max(1, c.sampleRate * duration), c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return buf; }

  function drumHit(c, time, gainVal) {
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.07);
    const filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 170 + Math.random() * 50;
    const gain = c.createGain(); gain.gain.setValueAtTime(gainVal, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    src.connect(filter).connect(gain).connect(c.destination); src.start(time); src.stop(time + 0.1);
  }
  function crashHit(c, time) {
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.6);
    const filter = c.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 2600;
    const gain = c.createGain(); gain.gain.setValueAtTime(0.35, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);
    src.connect(filter).connect(gain).connect(c.destination); src.start(time); src.stop(time + 0.6);
  }
  function drumroll(totalMs = 1600) {
    if (mode !== 'tv' || !soundOn) return;
    try {
      const c = ctx(); let t = c.currentTime + 0.05; const end = t + totalMs / 1000; let interval = 0.1;
      while (t < end) { drumHit(c, t, 0.3); t += interval; interval = Math.max(0.028, interval * 0.93); }
      crashHit(c, end + 0.03);
    } catch { /* audio indisponible */ }
  }
  function suspense(durationMs = 2200) {
    if (mode !== 'tv' || !soundOn) return;
    try {
      const c = ctx(); const t0 = c.currentTime + 0.03; const dur = durationMs / 1000;
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(105, t0); osc.frequency.linearRampToValueAtTime(185, t0 + dur);
      const lfo = c.createOscillator(); lfo.frequency.value = 6.2; const lfoGain = c.createGain(); lfoGain.gain.value = 0.16;
      const gain = c.createGain(); gain.gain.setValueAtTime(0.0001, t0); gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.3);
      gain.gain.setValueAtTime(0.22, t0 + dur - 0.3); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      lfo.connect(lfoGain); lfoGain.connect(gain.gain); osc.connect(gain).connect(c.destination);
      lfo.start(t0); osc.start(t0); osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    } catch { /* audio indisponible */ }
  }

  // ---------- Confettis & feux d'artifice (canvas partagé) ----------
  function canvasCtx() {
    const canvas = document.getElementById('confettiCanvas'); if (!canvas) return null;
    canvas.classList.remove('hidden'); canvas.width = innerWidth; canvas.height = innerHeight;
    return { canvas, g: canvas.getContext('2d') };
  }
  function confettiBurst(durationMs = 2800) {
    if (mode !== 'tv') return;
    const c = canvasCtx(); if (!c) return; const { canvas, g } = c;
    const colors = ['#7c5cff', '#22d3ee', '#ff2d8d', '#ff9f1c', '#73d13d', '#ffd166'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.4,
      r: 4 + Math.random() * 5, c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3.2, vx: -1.6 + Math.random() * 3.2, rot: Math.random() * 360, vr: -7 + Math.random() * 14
    }));
    let start = null;
    function frame(ts) {
      if (!start) start = ts; const elapsed = ts - start;
      g.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot * Math.PI / 180);
        g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r * 0.8, p.r, p.r * 1.6);
        g.restore();
      });
      if (elapsed < durationMs) requestAnimationFrame(frame);
      else { g.clearRect(0, 0, canvas.width, canvas.height); canvas.classList.add('hidden'); }
    }
    requestAnimationFrame(frame);
  }
  function fireworks(durationMs = 2400) {
    if (mode !== 'tv') return;
    const c = canvasCtx(); if (!c) return; const { canvas, g } = c;
    const colors = ['#ffd166', '#ff6b6b', '#4dd4ff', '#a970ff', '#7cff9e', '#ff9f1c'];
    let bursts = [];
    function launch() {
      const x = 70 + Math.random() * (canvas.width - 140), y = canvas.height * (0.22 + Math.random() * 0.3);
      const n = 44 + Math.floor(Math.random() * 18), color = colors[Math.floor(Math.random() * colors.length)];
      bursts.push(Array.from({ length: n }, () => { const a = Math.random() * Math.PI * 2, sp = 1.6 + Math.random() * 3.6; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, color }; }));
    }
    let launches = 0; const maxLaunches = 5;
    const launchTimer = setInterval(() => { launch(); launches++; if (launches >= maxLaunches) clearInterval(launchTimer); }, Math.max(120, durationMs / maxLaunches * 0.7));
    let start = null;
    function frame(ts) {
      if (!start) start = ts; const elapsed = ts - start;
      g.clearRect(0, 0, canvas.width, canvas.height);
      bursts.forEach(particles => particles.forEach(p => {
        p.vy += 0.045; p.x += p.vx; p.y += p.vy; p.life += 1;
        g.globalAlpha = Math.max(0, 1 - p.life / 70); g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, 2.4, 0, Math.PI * 2); g.fill();
      }));
      g.globalAlpha = 1;
      if (elapsed < durationMs + 900) requestAnimationFrame(frame);
      else { clearInterval(launchTimer); g.clearRect(0, 0, canvas.width, canvas.height); canvas.classList.add('hidden'); }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Mise en lumière de scène (extinction / spot) ----------
  function stageEl() { return document.getElementById('stageOverlay'); }
  function stageDark() { if (mode !== 'tv') return; const el = stageEl(); if (!el) return; el.classList.remove('spot'); el.classList.add('on'); }
  function stageSpotlight() { if (mode !== 'tv') return; const el = stageEl(); if (!el) return; el.classList.add('spot'); }
  function stageClear() { const el = stageEl(); if (!el) return; el.classList.remove('on', 'spot'); }

  // ---------- Réglages ----------
  function setMode(v) { if (!['tv','sober','off'].includes(v)) return; mode = v; localStorage.setItem(MODE_KEY, mode); if (mode !== 'tv') { stageClear(); if ('speechSynthesis' in window) speechSynthesis.cancel(); } if (mode === 'off') { const { banner } = els(); banner && banner.classList.remove('show'); } }
  function getMode() { return mode; }
  function setVoiceGender(v) { voiceGender = (v === 'male') ? 'male' : 'female'; localStorage.setItem(VOICE_KEY, voiceGender); }
  function getVoiceGender() { return voiceGender; }
  function setSoundEnabled(v) { soundOn = !!v; if (!soundOn && 'speechSynthesis' in window) speechSynthesis.cancel(); }
  function setHooks(h) { hooks = Object.assign(hooks, h); }
  function fanfare() { if (mode === 'tv' && hooks.fanfare) hooks.fanfare(); }
  function victory() { if (mode === 'tv' && hooks.victory) hooks.victory(); }

  return { say, line, drumroll, suspense, confettiBurst, fireworks, stageDark, stageSpotlight, stageClear, setMode, getMode, setVoiceGender, getVoiceGender, setSoundEnabled, setHooks, fanfare, victory };
})();
