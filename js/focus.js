/* Focus timer: the Pomodoro method from the burnout card. 25 minutes of
   focus, 5 of rest, 15 after every fourth round. Drawn as a panel on the
   Today page. It runs on an end time kept in this browser, so a reload
   or a tab switch doesn't lose it; the rounds are counted per day. While
   focusing it shows the day's frog (planner.js), or else its intention. */
(function(){
  const { esc } = WK;

  const MODES = {
    focus: { label: 'Focus', min: 25 },
    short: { label: 'Short break', min: 5 },
    long:  { label: 'Long break', min: 15 }
  };

  // { mode, ends (ms) while running, left (ms) while paused }
  let state = read('wk_focus') || { mode: 'focus', left: MODES.focus.min * 60000 };

  function read(key){ try { return JSON.parse(WK.store(key)); } catch (e){ return null; } }
  const keep = () => WK.store('wk_focus', JSON.stringify(state));
  function rounds(){
    const r = read('wk_focus_rounds');
    return r && r.date === WK.isoDate() ? r.n : 0;
  }
  const addRound = () => WK.store('wk_focus_rounds', JSON.stringify({ date: WK.isoDate(), n: rounds() + 1 }));

  const leftMs = () => state.ends ? Math.max(0, state.ends - Date.now()) : state.left;
  const pad = n => String(n).padStart(2, '0');
  const clock = ms => { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };

  function setMode(mode){
    state = { mode, left: MODES[mode].min * 60000 };
    keep();
  }

  // A focus round ends: count it, then rest (long after every fourth).
  function finish(){
    const was = state.mode;
    if (was === 'focus'){ addRound(); setMode(rounds() % 4 === 0 ? 'long' : 'short'); }
    else setMode('focus');
    chime();
    WK.toast(was === 'focus' ? 'Round done. Take a ' + MODES[state.mode].min + '-minute break.' : 'Break over. Back to one thing.');
    WK.refresh();
  }
  function chime(){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) {}
  }

  function panel(){
    const m = MODES[state.mode], n = rounds();
    const plan = WK.planFor ? WK.planFor(WK.isoDate()) : null;
    const frog = plan && plan.items.find(i => i.frog && !i.done);
    const on = frog ? '🐸 ' + frog.text : plan && plan.intention;
    return `
      <section class="panel focus mode-${state.mode}">
        <h2>Focus timer <span class="muted small">${n} round${n === 1 ? '' : 's'} today</span></h2>
        <div class="focus-modes" role="group" aria-label="Mode">${Object.keys(MODES).map(k => `
          <button type="button" data-focus-mode="${k}" aria-pressed="${k === state.mode}">${esc(MODES[k].label)}</button>`).join('')}
        </div>
        <div class="focus-clock" id="focus-clock" aria-live="off">${clock(leftMs())}</div>
        ${state.mode === 'focus' && on ? `<p class="focus-on muted small">On: <b>${esc(on)}</b></p>` : ''}
        <div class="focus-actions">
          <button type="button" class="btn primary" id="focus-go">${state.ends ? 'Pause' : leftMs() < m.min * 60000 ? 'Resume' : 'Start'}</button>
          <button type="button" class="btn ghost small" id="focus-reset">Reset</button>
          <button type="button" class="btn ghost small" id="focus-skip">Skip</button>
        </div>
        <p class="muted small">Round ${n % 4 + 1} of 4 · one thing at a time.</p>
      </section>`;
  }

  function bind(el){
    el.querySelectorAll('[data-focus-mode]').forEach(b => { b.onclick = () => { setMode(b.dataset.focusMode); WK.refresh(); }; });
    const go = el.querySelector('#focus-go');
    if (!go) return;
    go.onclick = () => {
      state = state.ends ? { mode: state.mode, left: leftMs() } : { mode: state.mode, ends: Date.now() + state.left };
      keep(); WK.refresh();
    };
    el.querySelector('#focus-reset').onclick = () => { setMode(state.mode); WK.refresh(); };
    el.querySelector('#focus-skip').onclick = () => { setMode(state.mode === 'focus' ? 'short' : 'focus'); WK.refresh(); };
  }

  // Ticks every second wherever you are in the site; the round ends on time
  // even when Today isn't open.
  setInterval(() => {
    if (!state.ends) return;
    if (leftMs() <= 0){ finish(); return; }
    const c = document.getElementById('focus-clock');
    if (c && c.offsetParent) c.textContent = clock(leftMs());
  }, 1000);

  WK.focus = { panel, bind };
})();
