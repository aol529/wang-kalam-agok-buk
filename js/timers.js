/* Days without: timers for things being given up (a drink, cigarettes...).
   Each counts up live from the last time. "I slipped" closes the streak
   into its history and starts again, so the best run and the number of
   slips are kept. Drawn as a panel on the Today page, which loads them;
   the add / edit dialog is #timer-dialog. */
(function(){
  const { $, esc } = WK;

  let timers = [];            // oldest first
  let missing = false;        // the table isn't there yet (sql/05-timers.sql)
  let editing = null;         // the timer in the dialog, or null for a new one
  let armed = null;           // id of the timer whose "I slipped" awaits a second tap
  let armedTimer = null;

  async function load(){
    const { data, error } = await WK.db.from('quit_timers').select('*').order('created_at');
    // Before the SQL has been run, show how to set it up instead of failing Today.
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return; throw error; }
    missing = false;
    timers = data || [];
  }

  // 3 days 4 h 05 m 09 s; under a day, just the clock.
  function parts(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }
  const pad = n => String(n).padStart(2, '0');
  function clock(ms){
    const p = parts(ms);
    return `${p.d ? `<b>${p.d}</b> day${p.d === 1 ? '' : 's'} ` : ''}<b>${p.h}</b> h <b>${pad(p.m)}</b> m <b>${pad(p.s)}</b> s`;
  }
  function span(ms){
    const p = parts(ms);
    if (p.d) return p.d + ' day' + (p.d === 1 ? '' : 's') + (p.h ? ' ' + p.h + ' h' : '');
    if (p.h) return p.h + ' h ' + p.m + ' m';
    return p.m + ' m';
  }
  const since = t => new Date(t.since).getTime();
  const best = t => Math.max(Date.now() - since(t), ...(t.history || []).map(r => new Date(r.to) - new Date(r.from)));

  function panel(){
    return `
      <section class="panel timers">
        <h2>Days without <button type="button" class="btn ghost small timer-add" id="timer-add">+ Add</button></h2>
        ${missing ? '<p class="empty">Run <code>sql/05-timers.sql</code> in Supabase to start tracking.</p>'
          : timers.length ? `<ul class="timer-list">${timers.map(t => {
            const slips = (t.history || []).length;
            const current = Date.now() - since(t);
            return `
            <li class="timer">
              <div class="timer-head">
                <button type="button" class="link timer-name" data-timer-edit="${t.id}">${esc(t.name || 'Untitled')}</button>
                <button type="button" class="btn small timer-slip${armed === t.id ? ' confirm' : ''}" data-timer-slip="${t.id}">${armed === t.id ? 'Tap again to reset' : 'I slipped'}</button>
              </div>
              <div class="timer-clock" data-since="${since(t)}">${clock(current)}</div>
              <p class="muted small">Since ${esc(new Date(t.since).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}
                · best ${esc(span(best(t)))}${slips ? ` · ${slips} slip${slips === 1 ? '' : 's'}` : ''}</p>
              ${t.note ? `<p class="timer-note">${esc(t.note)}</p>` : ''}
            </li>`; }).join('')}</ul>`
          : '<p class="empty">Nothing tracked yet. Add what you are giving up and when you last had it.</p>'}
      </section>`;
  }

  function bind(el){
    if ($('timer-add')) $('timer-add').onclick = () => open(null);
    el.querySelectorAll('[data-timer-edit]').forEach(b => { b.onclick = () => open(timers.find(t => t.id === b.dataset.timerEdit)); });
    el.querySelectorAll('[data-timer-slip]').forEach(b => { b.onclick = () => slip(b.dataset.timerSlip); });
  }

  // The clocks tick once a second while they're on screen.
  setInterval(() => {
    document.querySelectorAll('.timer-clock[data-since]').forEach(c => {
      if (c.offsetParent) c.innerHTML = clock(Date.now() - Number(c.dataset.since));
    });
  }, 1000);

  // Two taps, so one stray tap can't wipe a streak.
  async function slip(id){
    if (armed !== id){
      armed = id;
      clearTimeout(armedTimer);
      armedTimer = setTimeout(() => { armed = null; WK.refresh(); }, 4000);
      WK.refresh();
      return;
    }
    clearTimeout(armedTimer);
    armed = null;
    const t = timers.find(x => x.id === id);
    const now = new Date().toISOString();
    const history = (t.history || []).concat([{ from: t.since, to: now }]);
    const { data, error } = await WK.db.from('quit_timers').update({ since: now, history, updated_at: now }).eq('id', id).select().single();
    if (error){ WK.toast('Not saved: ' + error.message); WK.refresh(); return; }
    Object.assign(t, data);
    WK.toast(`Streak of ${span(new Date(now) - new Date(history[history.length - 1].from))} saved. The clock starts again now.`);
    WK.refresh();
  }

  // datetime-local wants local time without a zone.
  function localInput(d){
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function open(t){
    editing = t || null;
    const f = $('timer-form');
    f.reset();
    $('timer-title').textContent = t ? 'Edit timer' : 'New timer';
    f.name.value = t ? t.name : '';
    f.since.value = localInput(t ? new Date(t.since) : new Date());
    f.since.max = localInput(new Date());
    f.note.value = t ? t.note : '';
    $('timer-delete').hidden = !t;
    $('timer-delete').textContent = 'Delete';
    $('timer-delete').classList.remove('confirm');
    $('timer-history').innerHTML = t && (t.history || []).length ? `
      <span class="field-label">Past streaks</span>
      <ul class="mini-list">${t.history.slice().reverse().map(r => `
        <li>${esc(span(new Date(r.to) - new Date(r.from)))} <span class="muted small">${esc(WK.fmtDate(WK.isoDate(new Date(r.from))))} – ${esc(WK.fmtDate(WK.isoDate(new Date(r.to))))}</span></li>`).join('')}</ul>` : '';
    $('timer-error').textContent = '';
    $('timer-dialog').showModal();
    f.name.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const f = $('timer-form');
    f.onsubmit = async e => {
      e.preventDefault();
      const when = new Date(f.since.value);
      if (isNaN(when)){ $('timer-error').textContent = 'Pick when you last had it.'; return; }
      if (when > new Date()){ $('timer-error').textContent = 'That time is still to come.'; return; }
      // The current streak can't start before the slip that ended the last one.
      const last = editing && (editing.history || []).slice(-1)[0];
      if (last && when < new Date(last.to)){
        $('timer-error').textContent = 'That is before your last slip (' + new Date(last.to).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ').';
        return;
      }
      const row = { name: f.name.value.trim(), since: when.toISOString(), note: f.note.value.trim(), updated_at: new Date().toISOString() };
      $('timer-save').disabled = true;
      const q = editing
        ? WK.db.from('quit_timers').update(row).eq('id', editing.id).select().single()
        : WK.db.from('quit_timers').insert([row]).select().single();
      const { data, error } = await q;
      $('timer-save').disabled = false;
      if (error){ $('timer-error').textContent = error.message; return; }
      if (editing) Object.assign(editing, data); else timers.push(data);
      $('timer-dialog').close();
      WK.refresh();
    };
    $('timer-cancel').onclick = () => $('timer-dialog').close();
    // Two taps here too: the first asks, the second deletes.
    $('timer-delete').onclick = async () => {
      const b = $('timer-delete');
      if (!b.classList.contains('confirm')){ b.classList.add('confirm'); b.textContent = 'Tap again to delete'; return; }
      const { error } = await WK.db.from('quit_timers').delete().eq('id', editing.id);
      if (error){ $('timer-error').textContent = error.message; return; }
      timers = timers.filter(t => t !== editing);
      $('timer-dialog').close();
      WK.refresh();
    };
  });

  WK.timers = { load, panel, bind, reset(){ timers = []; missing = false; } };
  // Read by Review.
  WK.timerList = () => timers;
})();
