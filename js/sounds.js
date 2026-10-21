/* Sounds: ambient sounds to mix for focus, rest and sleep: rain, storm,
   wind, waves, a stream, birds, a summer night, a train, a boat, the city,
   a coffee shop, a fireplace, and white, pink and brown noise. Turn on as
   many as you like, each with its own volume; start from a ready mix or
   save your own; a timer fades it all out. The sounds keep playing while
   you use the other tabs, with a small player at the corner to pause or
   come back. Recordings are in audio/ (made into seamless loops; see
   audio/CREDITS.txt); the three noises are made in the browser. Each file
   is downloaded the first time it is switched on. The mix, volumes and
   saved mixes stay in this browser. */
(function(){
  const { $, esc } = WK;

  const SOUNDS = [
    ['Rain', [
      ['light-rain', 'Rain'], ['heavy-rain', 'Heavy rain'], ['rain-on-window', 'Rain on the window'],
      ['rain-on-tent', 'Rain on a tent'], ['thunder', 'Storm']]],
    ['Nature', [
      ['wind', 'Wind'], ['wind-in-trees', 'Wind in the trees'], ['waves', 'Waves'], ['river', 'Stream'],
      ['waterfall', 'Waterfall'], ['droplets', 'Droplets'], ['campfire', 'Fireplace']]],
    ['Creatures', [
      ['birds', 'Birds'], ['crickets', 'Summer night'], ['frog', 'Frogs'], ['owl', 'Owl'], ['seagulls', 'Seagulls']]],
    ['Places', [
      ['cafe', 'Coffee shop'], ['busy-street', 'City'], ['traffic', 'Traffic'], ['night-village', 'Village at night'],
      ['library', 'Library'], ['underwater', 'Underwater']]],
    ['Travel', [
      ['train', 'Train'], ['inside-a-train', 'Inside a train'], ['sailboat', 'Boat'], ['rowing-boat', 'Rowing boat'],
      ['airplane', 'Aeroplane']]],
    ['Things', [
      ['clock', 'Clock'], ['ceiling-fan', 'Fan'], ['wind-chimes', 'Wind chimes'], ['singing-bowl', 'Singing bowl'],
      ['typewriter', 'Typewriter'], ['vinyl-effect', 'Vinyl crackle']]],
    ['Noise', [
      ['white', 'White noise', 'Even hiss across every pitch. Masks voices and sudden sounds.'],
      ['pink', 'Pink noise', 'Softer and deeper than white, like steady rain. Often used for sleep.'],
      ['brown', 'Brown noise', 'A low rumble, like a waterfall far off. Calming for focus.']]]
  ].map(([group, list]) => [group, list.map(([key, name, about]) => ({ key, name, about, noise: group === 'Noise' }))]);
  const ALL = SOUNDS.flatMap(([, list]) => list);
  const byKey = Object.fromEntries(ALL.map(s => [s.key, s]));

  const MIXES = [
    { name: 'Rainy café', mix: { 'light-rain': .6, cafe: .5 } },
    { name: 'Thunderstorm', mix: { 'heavy-rain': .7, thunder: .7, wind: .25 } },
    { name: 'Beach', mix: { waves: .8, seagulls: .2, wind: .2 } },
    { name: 'By the fire', mix: { campfire: .7, 'rain-on-window': .35 } },
    { name: 'Forest morning', mix: { birds: .6, 'wind-in-trees': .4, river: .3 } },
    { name: 'Summer night', mix: { crickets: .7, frog: .25, owl: .2 } },
    { name: 'Night train', mix: { 'inside-a-train': .7, 'light-rain': .3 } },
    { name: 'At sea', mix: { sailboat: .7, waves: .4, seagulls: .15 } },
    { name: 'Deep focus', mix: { brown: .5, 'rain-on-window': .3 } },
    { name: 'Sleep', mix: { pink: .35, waves: .35 } }
  ];
  const TIMERS = [0, 15, 30, 45, 60, 90];
  const FADE = 1.2;          // seconds to fade a sound in or out
  const END_FADE = 30;       // the timer fades everything out over this long

  const read = (key, fallback) => { try { return JSON.parse(WK.store(key)) || fallback; } catch (e){ return fallback; } };
  let mix = read('wk_sounds_mix', {});          // key -> volume (0 to 1) of the sounds switched on
  let master = Number(WK.store('wk_sounds_vol') || 0.8);
  let saved = read('wk_sounds_saved', []);      // [{ name, mix }]
  let playing = false;
  let timerMin = 0, endsAt = 0, ticker = null;

  // ---------------- Audio ----------------
  let ctx = null, out = null;
  const buffers = {}, loading = {}, voices = {};   // voices: key -> { src, gain }

  function audio(){
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = master;
      out.connect(ctx.destination);
    }
    return ctx;
  }

  // Noise made in the browser: 10 seconds, looped.
  function noiseBuffer(kind){
    const len = ctx.sampleRate * 10, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++){
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++){
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.25;
        else if (kind === 'pink'){   // Paul Kellet's filter
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.07;
          b6 = w * 0.115926;
        } else {                     // brown: a random walk
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 2.6;
        }
      }
    }
    return buf;
  }

  // An MP3 can carry a few silent samples at each end; cut them so the loop doesn't tick.
  function trimmed(buf){
    let start = buf.length, end = 0;
    for (let c = 0; c < buf.numberOfChannels; c++){
      const d = buf.getChannelData(c);
      let a = 0, b = d.length - 1;
      while (a < b && d[a] === 0) a++;
      while (b > a && d[b] === 0) b--;
      start = Math.min(start, a); end = Math.max(end, b + 1);
    }
    if (start === 0 && end === buf.length || end - start < ctx.sampleRate) return buf;
    const t = ctx.createBuffer(buf.numberOfChannels, end - start, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) t.copyToChannel(buf.getChannelData(c).subarray(start, end), c);
    return t;
  }

  function load(key){
    if (buffers[key]) return Promise.resolve(buffers[key]);
    if (!loading[key]){
      loading[key] = (byKey[key].noise ? Promise.resolve(noiseBuffer(key))
        : fetch('audio/' + key + '.mp3').then(r => { if (!r.ok) throw new Error('not found'); return r.arrayBuffer(); })
            .then(data => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail))).then(trimmed))
        .then(buf => (buffers[key] = buf))
        .finally(() => { delete loading[key]; });
    }
    return loading[key];
  }

  async function startVoice(key){
    if (voices[key]) return;
    voices[key] = { pending: true };
    drawTile(key);
    let buf;
    try { buf = await load(key); }
    catch (e){
      delete voices[key];
      delete mix[key]; saveMix();
      WK.toast(`${byKey[key].name} didn't load. Check the connection and try again.`);
      redraw();
      return;
    }
    // Switched off, or everything stopped, while it was loading.
    if (!voices[key] || !voices[key].pending || !(key in mix)){ delete voices[key]; redraw(); return; }
    const gain = ctx.createGain(), src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    gain.gain.value = 0;
    src.connect(gain); gain.connect(out);
    // Start each loop at a random point, so two sounds never line up the same way twice.
    src.start(0, Math.random() * buf.duration);
    gain.gain.setTargetAtTime(mix[key], ctx.currentTime, FADE / 3);
    voices[key] = { src, gain };
    redraw();
  }

  function stopVoice(key){
    const v = voices[key];
    delete voices[key];
    if (!v || v.pending) return;
    v.gain.gain.cancelScheduledValues(ctx.currentTime);
    v.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    v.src.stop(ctx.currentTime + FADE * 2);
  }

  const saveMix = () => WK.store('wk_sounds_mix', JSON.stringify(mix));

  // ---------------- Actions ----------------
  function toggle(key){
    audio();
    if (key in mix){
      delete mix[key];
      stopVoice(key);
      if (!Object.keys(mix).length) stopAll();
    } else {
      mix[key] = 0.5;
      play();
      startVoice(key);
    }
    saveMix();
    redraw();
  }

  function setLevel(key, v){
    mix[key] = v;
    saveMix();
    const voice = voices[key];
    if (voice && voice.gain) voice.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }

  function setMaster(v){
    master = v;
    WK.store('wk_sounds_vol', String(v));
    if (out) out.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }

  function play(){
    audio();
    if (ctx.state === 'suspended') ctx.resume();
    if (!playing){
      playing = true;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(master, ctx.currentTime, 0.1);
      Object.keys(mix).forEach(startVoice);
      if (timerMin && !endsAt) setTimer(timerMin);
    }
    session();
    redraw();
  }

  function pause(){
    if (!ctx || !playing) return;
    playing = false;
    out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => { if (!playing) ctx.suspend(); }, 800);
    clearTimer(true);
    session();
    redraw();
  }

  function stopAll(){
    Object.keys(voices).forEach(stopVoice);
    playing = false;
    clearTimer(false);
    session();
    redraw();
  }

  function useMix(m){
    audio();
    Object.keys(voices).filter(k => !(k in m.mix)).forEach(stopVoice);
    mix = Object.assign({}, m.mix);
    saveMix();
    Object.entries(mix).forEach(([k, v]) => { const voice = voices[k]; if (voice && voice.gain) voice.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.2); });
    if (playing) Object.keys(mix).forEach(startVoice); else play();
    redraw();
  }

  function mixName(m){
    const found = [...saved, ...MIXES].find(x => sameMix(x.mix, m));
    if (found) return found.name;
    const names = Object.keys(m).map(k => byKey[k] && byKey[k].name).filter(Boolean);
    return names.length > 2 ? names.slice(0, 2).join(', ') + ` +${names.length - 2}` : names.join(' & ');
  }
  const sameMix = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => k in b && Math.abs(a[k] - b[k]) < 0.02); };

  // ---------------- Timer ----------------
  function setTimer(min){
    timerMin = min;
    clearTimeout(ticker && ticker.end);
    endsAt = min && playing ? Date.now() + min * 60000 : 0;
    if (endsAt) ticker = { end: setTimeout(timerDone, min * 60000 - END_FADE * 1000) };
    tick();
    redraw();
  }
  function clearTimer(keepChoice){
    if (ticker) clearTimeout(ticker.end);
    ticker = null; endsAt = 0;
    if (!keepChoice) timerMin = 0;
  }
  function timerDone(){
    if (!ctx || !playing) return;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0, ctx.currentTime + END_FADE);
    setTimeout(() => { if (playing && endsAt && Date.now() >= endsAt - 500){ pause(); timerMin = 0; redraw(); } }, END_FADE * 1000);
  }
  const left = () => {
    const s = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  setInterval(tick, 1000);
  function tick(){
    if (!endsAt) return;
    const el = $('snd-left'), chip = $('snd-chip-left');
    if (el) el.textContent = left() + ' left';
    if (chip) chip.textContent = left();
  }

  // Lock-screen and headset controls, where the browser offers them.
  function session(){
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = Object.keys(mix).length ? new MediaMetadata({ title: mixName(mix), artist: 'Sounds', album: "Wang' Kalam Agok Buk" }) : null;
      navigator.mediaSession.playbackState = playing ? 'playing' : Object.keys(mix).length ? 'paused' : 'none';
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('stop', stopAll);
    } catch (e) {}
  }

  // ---------------- Drawing ----------------
  // Leaving the tab leaves the sounds playing and brings up the corner player.
  WK.section({ name: 'sounds', label: 'Sounds', render: draw, hide: () => setTimeout(drawChip, 0) });
  let shown = false;

  function draw(){
    shown = true;
    const el = $('section-sounds');
    const on = Object.keys(mix).length;
    el.innerHTML = `
      <div class="section-head"><h1>Sounds</h1>
        <p class="muted">Rain, wind, waves, a fire, a train, a busy café or plain noise: mix any of them for focus, rest or sleep. They keep playing while you use the other tabs.</p></div>

      <div class="snd-bar">
        <button type="button" class="btn snd-play" id="snd-play"${on ? '' : ' disabled'}>${playing ? 'Pause' : 'Play'}</button>
        <div class="snd-now"><b id="snd-now">${on ? esc(mixName(mix)) : 'Nothing on yet'}</b>
          <span class="muted small">${on ? `${on} sound${on > 1 ? 's' : ''}${endsAt ? ` · <span id="snd-left">${left()} left</span>` : ''}` : 'Tap a sound below, or start from a mix'}</span></div>
        <label class="snd-master" title="Volume">Volume <input type="range" id="snd-master" min="0" max="1" step="0.01" value="${master}"></label>
        <label class="snd-timer">Stop after <select id="snd-timer">${TIMERS.map(m => `<option value="${m}"${m === timerMin ? ' selected' : ''}>${m ? m + ' min' : 'Never'}</option>`).join('')}</select></label>
        ${on ? '<button type="button" class="btn ghost small" id="snd-clear">Clear</button>' : ''}
      </div>

      <h2 class="snd-h">Mixes</h2>
      <div class="snd-mixes">
        ${MIXES.map((m, i) => `<button type="button" class="chip-btn${sameMix(m.mix, mix) ? ' on' : ''}" data-mix="${i}">${esc(m.name)}</button>`).join('')}
        ${saved.map((m, i) => `<span class="chip-btn mine${sameMix(m.mix, mix) ? ' on' : ''}"><button type="button" data-saved="${i}">${esc(m.name)}</button><button type="button" class="chip-x" data-forget="${i}" aria-label="Forget ${esc(m.name)}">×</button></span>`).join('')}
        ${on ? '<button type="button" class="chip-btn add" id="snd-save">+ Save this mix</button>' : ''}
      </div>

      ${SOUNDS.map(([group, list]) => `
        <h2 class="snd-h">${esc(group)}</h2>
        <div class="snd-grid">${list.map(s => `<div class="snd-tile" id="snd-${s.key}"></div>`).join('')}</div>`).join('')}

      <p class="muted small snd-credit">Recordings from <a href="https://github.com/remvze/moodist" target="_blank" rel="noopener">Moodist</a> (Pixabay and CC0 sounds), made into seamless loops. Each one downloads the first time you turn it on (about 1 MB). Mixes and volumes are kept in this browser.</p>`;

    ALL.forEach(s => drawTile(s.key));
    $('snd-play').onclick = () => playing ? pause() : play();
    $('snd-master').oninput = e => setMaster(Number(e.target.value));
    $('snd-timer').onchange = e => setTimer(Number(e.target.value));
    if ($('snd-clear')) $('snd-clear').onclick = () => { mix = {}; saveMix(); stopAll(); };
    el.querySelectorAll('[data-mix]').forEach(b => b.onclick = () => useMix(MIXES[b.dataset.mix]));
    el.querySelectorAll('[data-saved]').forEach(b => b.onclick = () => useMix(saved[b.dataset.saved]));
    el.querySelectorAll('[data-forget]').forEach(b => b.onclick = () => {
      if (!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent = 'Forget?'; return; }
      saved.splice(Number(b.dataset.forget), 1);
      WK.store('wk_sounds_saved', JSON.stringify(saved));
      draw();
    });
    if ($('snd-save')) $('snd-save').onclick = saveForm;
    drawChip();
  }

  function drawTile(key){
    const el = $('snd-' + key);
    if (!el) return;
    const s = byKey[key], on = key in mix, v = voices[key];
    el.className = 'snd-tile' + (on ? ' on' : '') + (v && v.pending ? ' loading' : '') + (on && playing && v && !v.pending ? ' live' : '');
    el.innerHTML = `
      <button type="button" class="snd-toggle" aria-pressed="${on}"${s.about ? ` title="${esc(s.about)}"` : ''}>
        <span class="snd-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <b>${esc(s.name)}</b>${v && v.pending ? '<span class="muted small">Loading…</span>' : ''}
      </button>
      ${on ? `<input type="range" min="0.02" max="1" step="0.01" value="${mix[key]}" aria-label="${esc(s.name)} volume">` : ''}`;
    el.querySelector('.snd-toggle').onclick = () => toggle(key);
    const r = el.querySelector('input');
    if (r) r.oninput = () => setLevel(key, Number(r.value));
  }

  function saveForm(){
    const btn = $('snd-save');
    const form = document.createElement('form');
    form.className = 'snd-save-form';
    form.innerHTML = `<input name="name" maxlength="40" placeholder="Name this mix" required><button class="btn small">Save</button>`;
    btn.replaceWith(form);
    form.name.focus();
    form.onsubmit = e => {
      e.preventDefault();
      const name = form.name.value.trim();
      if (!name) return;
      saved = saved.filter(m => m.name !== name).concat({ name, mix: Object.assign({}, mix) });
      WK.store('wk_sounds_saved', JSON.stringify(saved));
      WK.toast(`Saved “${name}”`);
      draw();
    };
  }

  // Redraw what's on screen: the tab if it's open, and the corner player.
  function redraw(){
    if (shown && $('section-sounds') && !$('section-sounds').hidden && $('snd-play')){
      const active = document.activeElement;
      if (active && active.type === 'range' && active.closest('#section-sounds')){ drawChip(); return; }   // don't redraw under a slider being dragged
      draw();
    } else drawChip();
  }

  // The small player in the corner, shown on the other tabs while sounds are on.
  function drawChip(){
    let chip = $('snd-chip');
    const on = Object.keys(mix).length && (playing || Object.keys(voices).length);
    const here = $('section-sounds') && !$('section-sounds').hidden;
    if (!on || here){ if (chip) chip.hidden = true; return; }
    if (!chip){
      chip = document.createElement('div');
      chip.id = 'snd-chip';
      chip.className = 'snd-chip';
      document.body.appendChild(chip);
    }
    chip.hidden = false;
    chip.innerHTML = `
      <button type="button" class="snd-chip-play" aria-label="${playing ? 'Pause' : 'Play'}">${playing ? '❚❚' : '▶'}</button>
      <button type="button" class="snd-chip-open"><span class="snd-wave${playing ? ' live' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>${esc(mixName(mix))}</span>${endsAt ? ` <span class="muted" id="snd-chip-left">${left()}</span>` : ''}</button>
      <button type="button" class="snd-chip-x" aria-label="Stop the sounds">${WK.icon('close')}</button>`;
    chip.querySelector('.snd-chip-play').onclick = () => playing ? pause() : play();
    chip.querySelector('.snd-chip-open').onclick = () => WK.show('sounds');
    chip.querySelector('.snd-chip-x').onclick = () => { stopAll(); drawChip(); };
  }
})();
