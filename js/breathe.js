/* Breathe: guided breathing for meditation. Six techniques, a circle that
   grows on the in-breath and shrinks on the out-breath, a count for each
   phase and a ring for the whole session. A soft tone and a buzz on phones
   mark each change, so it can be done with the eyes closed. A finished
   session can tick "Meditate" (and, after ten conscious breaths, that
   point too) on Today's clear conscience. Sessions are counted per day in
   this browser. Leaving the tab ends the session. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  // Phases: in, in2 (a second sip in), hold (stay full), rest (stay empty), out.
  // rounds: a fixed number of breaths; otherwise the length is picked in minutes.
  // The CMS can replace these in place (content.js).
  const TECHNIQUES = WK.BREATHE = [
    { key: 'box', name: 'Box breathing', pace: '4 · 4 · 4 · 4', for: 'Calm and focus under pressure',
      how: 'In for 4, hold for 4, out for 4, hold empty for 4. Steady, square, through the nose.',
      phases: [['in', 4], ['hold', 4], ['out', 4], ['rest', 4]], minutes: 3 },
    { key: '478', name: '4-7-8', pace: '4 · 7 · 8', for: 'Winding down, falling asleep',
      how: 'In through the nose for 4, hold for 7, out through the mouth with a soft whoosh for 8. Dr Andrew Weil’s “relaxing breath”: start with four rounds.',
      phases: [['in', 4], ['hold', 7], ['out', 8]], rounds: 4 },
    { key: 'coherent', name: 'Coherent breathing', pace: '5.5 · 5.5', for: 'Balance; a daily practice',
      how: 'In for 5.5, out for 5.5: about five and a half breaths a minute, the pace at which heart and breath fall into step. Soft and quiet, no holding.',
      phases: [['in', 5.5], ['out', 5.5]], minutes: 5 },
    { key: 'sigh', name: 'Physiological sigh', pace: '2 + 1 · 6', for: 'Stress, fast',
      how: 'A full breath in through the nose, then a short second sip on top, then a long, slow breath out through the mouth. A few rounds bring the body down quickly.',
      phases: [['in', 2], ['in2', 1], ['out', 6]], rounds: 5 },
    { key: 'ten', name: 'Ten conscious breaths', pace: '4 · 6 × 10', for: 'From my 2014 list',
      how: '“Remember to breathe 10 deep conscious breaths anytime I remember this page.” In for 4, out for 6, and give each one your full attention.',
      phases: [['in', 4], ['out', 6]], rounds: 10 },
    { key: 'anapana', name: 'Ānāpānasati', pace: 'count 1 to 10', for: 'Mindfulness of breathing',
      how: 'The Buddha’s meditation on the breath. Breathe naturally and count each out-breath, one to ten, then begin again. Lost count? Start at one, kindly. The guide keeps a slow, easy pace.',
      phases: [['in', 4], ['out', 6]], minutes: 10, count: true }
  ];
  const WORDS = { in: 'Breathe in', in2: 'Sip in more', hold: 'Hold', rest: 'Hold empty', out: 'Breathe out' };
  const SCALE = { in: 1, in2: 1, out: 0.5 };     // the circle's size at the end of a phase
  const SIGH_IN = 0.85;                         // the sigh's first breath fills most of it
  const LENGTHS = [1, 3, 5, 10, 15];

  let pick = TECHNIQUES.find(t => t.key === WK.store('wk_breathe')) || TECHNIQUES[0];
  let minutes = Number(WK.store('wk_breathe_min')) || pick.minutes || 3;
  let sound = WK.store('wk_breathe_sound') !== '0';
  // A session: { started, paused (ms of pause so far), pausedAt, total (ms) }
  let run = null, timer = null, lastPhase = -1, done = null;

  WK.section({ name: 'breathe', label: 'Breathe', render, hide(){ stop(); } });

  const cycleMs = t => t.phases.reduce((a, p) => a + p[1], 0) * 1000;
  const roundsOf = t => t.rounds || Math.max(1, Math.round(minutes * 60000 / cycleMs(t)));
  const totalMs = t => roundsOf(t) * cycleMs(t);
  const elapsed = () => !run ? 0 : (run.pausedAt || Date.now()) - run.started - run.paused;

  function read(key){ try { return JSON.parse(WK.store(key)); } catch (e){ return null; } }
  function today(){ const r = read('wk_breathe_day'); return r && r.date === WK.isoDate() ? r : { date: WK.isoDate(), n: 0, ms: 0 }; }
  function logSession(ms){ const r = today(); r.n++; r.ms += ms; WK.store('wk_breathe_day', JSON.stringify(r)); }

  // Where the session is: the round, the phase, and the time left in it.
  function where(ms){
    const c = cycleMs(pick), round = Math.floor(ms / c);
    let t = ms - round * c, i = 0;
    while (i < pick.phases.length - 1 && t >= pick.phases[i][1] * 1000){ t -= pick.phases[i][1] * 1000; i++; }
    return { round, i, kind: pick.phases[i][0], left: pick.phases[i][1] * 1000 - t };
  }
  // The circle's size when a phase starts and when it ends.
  function sizes(i){
    const kind = pick.phases[i][0];
    const target = pick.key === 'sigh' && kind === 'in' ? SIGH_IN : SCALE[kind];
    if (target != null) return target;
    // Holding: stay where the last breath left it.
    for (let j = i - 1; j >= 0; j--){ const k = pick.phases[j][0]; if (SCALE[k] != null) return pick.key === 'sigh' && k === 'in' ? SIGH_IN : SCALE[k]; }
    return SCALE.out;
  }

  function render(){
    const el = $('section-breathe');
    // The list may have been edited in the CMS since this one was picked.
    if (!run && !TECHNIQUES.includes(pick)) pick = TECHNIQUES.find(t => t.key === pick.key) || TECHNIQUES[0];
    const day = today();
    const conscience = F.CONSCIENCE;
    el.innerHTML = `
      <div class="section-head"><h1>Breathe</h1>
        <span class="muted small">${day.n ? `Today: ${day.n} session${day.n === 1 ? '' : 's'} · ${Math.round(day.ms / 60000)} min` : 'Nothing yet today'}</span></div>

      <div class="breathe-wrap${run ? ' running' : ''}">
        <div class="breathe-stage" aria-live="polite">
          <svg class="breathe-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56"/><circle id="br-ring" cx="60" cy="60" r="56" pathLength="100"/></svg>
          <div class="breathe-orb" id="br-orb"></div>
          <div class="breathe-text">
            <b id="br-word">${run ? '' : esc(pick.name)}</b>
            <span id="br-count">${run ? '' : esc(pick.pace)}</span>
          </div>
        </div>
        <p class="muted small breathe-round" id="br-round">${run ? '' : `${roundsOf(pick)} breath${roundsOf(pick) === 1 ? '' : 's'} · about ${Math.max(1, Math.round(totalMs(pick) / 60000))} min`}</p>
        <div class="focus-actions breathe-actions">
          <button type="button" class="btn primary" id="br-go">${!run ? 'Begin' : run.pausedAt ? 'Resume' : 'Pause'}</button>
          ${run ? '<button type="button" class="btn ghost" id="br-stop">End</button>' : ''}
          <label class="check small"><input type="checkbox" id="br-sound"${sound ? ' checked' : ''}> Tone</label>
        </div>
        ${done ? `
        <div class="panel breathe-done">
          <p><b>Well done.</b> ${done.rounds} breath${done.rounds === 1 ? '' : 's'}, ${Math.max(1, Math.round(done.ms / 60000))} min of ${esc(done.name)}.</p>
          <button type="button" class="btn small" id="br-tick">Tick “Meditate”${done.key === 'ten' ? ' and the ten breaths' : ''} on Today</button>
        </div>` : ''}
      </div>

      <div class="breathe-picks" role="radiogroup" aria-label="Technique">${TECHNIQUES.map(t => `
        <button type="button" class="breathe-pick" role="radio" aria-checked="${t === pick}" data-tech="${t.key}"${run ? ' disabled' : ''}>
          <b>${esc(t.name)}</b><span class="breathe-pace">${esc(t.pace)}</span><span class="muted small">${esc(t.for)}</span>
        </button>`).join('')}
      </div>

      <section class="panel breathe-about">
        <h2>${esc(pick.name)} <span class="muted small">${esc(pick.for)}</span></h2>
        <p>${esc(pick.how)}</p>
        ${pick.rounds ? '' : `<div class="focus-modes" role="group" aria-label="Length">${LENGTHS.map(m => `
          <button type="button" data-min="${m}" aria-pressed="${m === minutes}"${run ? ' disabled' : ''}>${m} min</button>`).join('')}</div>`}
        <p class="muted small">Sit tall, shoulders soft. Breathe through the nose unless it says otherwise. If you feel dizzy or light-headed, stop and breathe normally.</p>
      </section>`;

    $('br-go').onclick = () => run ? (run.pausedAt ? resume() : pause()) : start();
    if ($('br-stop')) $('br-stop').onclick = () => finish(false);
    $('br-sound').onchange = e => { sound = e.target.checked; WK.store('wk_breathe_sound', sound ? '1' : '0'); };
    el.querySelectorAll('[data-tech]').forEach(b => {
      b.onclick = () => {
        pick = TECHNIQUES.find(t => t.key === b.dataset.tech);
        WK.store('wk_breathe', pick.key);
        if (pick.minutes){ minutes = pick.minutes; WK.store('wk_breathe_min', minutes); }
        done = null; render();
      };
    });
    el.querySelectorAll('[data-min]').forEach(b => { b.onclick = () => { minutes = Number(b.dataset.min); WK.store('wk_breathe_min', minutes); render(); }; });
    if ($('br-tick')) $('br-tick').onclick = async () => {
      const iso = WK.isoDate(), plan = WK.planFor ? WK.planFor(iso) : null;
      const have = (plan && plan.habits) || [];
      const want = conscience.filter(c => /^meditate/i.test(c) || (done.key === 'ten' && /10 deep conscious breaths/i.test(c)));
      try {
        await WK.saveHabits(iso, conscience.filter(c => have.includes(c) || want.includes(c)));
        WK.toast('Ticked on Today.'); done = null; render();
      } catch (err){ WK.toast('Not saved: ' + err.message); }
    };

    if (run){ lastPhase = -1; tick(); }
    else $('br-orb').style.transform = `scale(${SCALE.out})`;
  }

  function start(){
    done = null;
    run = { started: Date.now(), paused: 0, pausedAt: 0, total: totalMs(pick) };
    keepAwake(true);
    render();
    timer = setInterval(tick, 100);
  }
  function pause(){ run.pausedAt = Date.now(); render(); }
  function resume(){
    run.paused += Date.now() - run.pausedAt; run.pausedAt = 0;
    render();
  }
  function stop(){
    clearInterval(timer); timer = null; run = null; lastPhase = -1;
    keepAwake(false);
  }
  function finish(complete){
    const ms = elapsed(), rounds = complete ? roundsOf(pick) : where(ms).round;
    stop();
    if (ms >= 30000){ logSession(ms); done = { key: pick.key, name: pick.name, rounds: Math.max(rounds, 1), ms }; cue('end'); }
    render();
  }

  function tick(){
    if (!run) return;
    const ms = elapsed();
    if (ms >= run.total){ finish(true); return; }
    const w = where(ms), id = w.round * 10 + w.i;
    const orb = $('br-orb');
    if (!orb) return;
    if (lastPhase === -1){
      // Freshly drawn: put the circle where the breath is now, without easing.
      const n = pick.phases.length, from = w.i ? sizes(w.i - 1) : w.round ? sizes(n - 1) : SCALE.out, to = sizes(w.i);
      const frac = 1 - w.left / (pick.phases[w.i][1] * 1000);
      orb.style.transition = 'none';
      orb.style.transform = `scale(${from + (to - from) * frac})`;
      void orb.offsetWidth;
    }
    if (id !== lastPhase && !run.pausedAt){
      // A new phase, or picking up mid-phase: ease the circle to this
      // phase's size over the time left in it.
      orb.style.transition = `transform ${w.left}ms ${w.kind === 'out' ? 'ease-in-out' : 'cubic-bezier(.4,0,.3,1)'}`;
      orb.style.transform = `scale(${sizes(w.i)})`;
      orb.dataset.phase = w.kind;
      if (lastPhase !== -1 || ms < 150) cue(w.kind);
      lastPhase = id;
    }
    $('br-word').textContent = run.pausedAt ? 'Paused' : WORDS[w.kind];
    $('br-count').textContent = pick.count ? (w.round % 10) + 1 : Math.ceil(w.left / 1000);
    $('br-round').textContent = pick.count ? `Count the out-breath · ${w.round + 1} of ${roundsOf(pick)}` : `Breath ${w.round + 1} of ${roundsOf(pick)}`;
    $('br-ring').style.strokeDashoffset = 100 - ms / run.total * 100;
  }

  // A soft tone: higher for breathing in, lower for out, a low hum to hold.
  let ctx = null;
  function cue(kind){
    if (navigator.vibrate) try { navigator.vibrate(kind === 'end' ? [60, 80, 60] : 25); } catch (e) {}
    if (!sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const f = { in: 528, in2: 594, hold: 396, rest: 396, out: 330, end: 528 }[kind] || 440;
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'end' ? 2.2 : 1.1));
      o.start(t); o.stop(t + 2.3);
    } catch (e) {}
  }

  // Keep the phone's screen on during a session, where the browser allows it.
  let lock = null;
  async function keepAwake(on){
    try {
      if (on && navigator.wakeLock && !lock) lock = await navigator.wakeLock.request('screen');
      if (!on && lock){ await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  }
})();
