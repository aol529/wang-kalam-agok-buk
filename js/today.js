/* Today: the front page, as a "now" screen. The day's plan comes first,
   with the next task (the frog until it's eaten); then the panels in the
   order that suits the time of day: mornings lead with today's Stoic
   exercise (practice.js), the journal (with the morning preparation) and
   Necessity; afternoons with the focus timer (focus.js) and goals;
   evenings with the "Have a clear conscience" checklist, the journal
   (with the evening review) and the home routine (routine.js). The first
   four show in full and the rest fold into a row each with a short
   status; whatever you open or hide stays that way. Also: Personal
   Leadership, Days without (timers.js), entries from this day in past
   years, balance across the life areas, and on Sundays the weekly review
   (review.js). */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  WK.section({ name: 'today', label: 'Today', render,
    load: () => Promise.all([WK.timers.load(), WK.routine.load()]),
    reset(){ WK.timers.reset(); WK.routine.reset(); } });

  // Which panels you've opened or hidden: { key: 'open' | 'closed' }.
  function foldPrefs(){ try { return JSON.parse(WK.store('wk_today_folds') || '{}') || {}; } catch (e){ return {}; } }
  function saveFold(key, state){ const p = foldPrefs(); p[key] = state; WK.store('wk_today_folds', JSON.stringify(p)); }

  function greeting(){
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function render(){
    const el = $('section-today');
    const today = WK.isoDate();
    const goals = (WK.goals ? WK.goals() : []).filter(g => !g.done);
    const entries = WK.entries ? WK.entries() : [];
    const plan = WK.planFor ? WK.planFor(today) : null;
    const items = plan ? plan.items : [];
    const habits = (plan && plan.habits) || [];
    const done = items.filter(i => i.done).length;
    const frog = items.find(i => i.frog);
    const necessity = goals.filter(g => g.urgent && g.important);
    const leadership = goals.filter(g => !g.urgent && g.important);
    const wroteToday = entries.some(e => e.kind === 'journal' && e.entry_date === today);
    const md = today.slice(5);
    const onThisDay = entries.filter(e => e.entry_date && e.entry_date.slice(5) === md && e.entry_date < today);
    const prompt = WK.promptOfDay ? WK.promptOfDay() : '';

    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const next = frog && !frog.done ? frog : items.find(i => !i.done);

    // Every panel, by key. Each: its title for the folded row, a short
    // status for that row, and its html.
    const P = {
      plan: { title: "Today's plan", hint: items.length ? `${done} of ${items.length} done` : 'nothing planned', html: `
        <section class="panel today-plan">
          <h2>Today's plan</h2>
          ${plan && plan.intention ? `<p class="intention-text">“${esc(plan.intention)}”</p>` : ''}
          ${items.length ? `
            <div class="progress"><i style="width:${Math.round(done / items.length * 100)}%"></i></div>
            <p class="muted small">${done} of ${items.length} done</p>
            ${next ? `<p class="today-next${next.frog ? ' frog' : ''}">${next.frog ? '🐸 <b>Eat the frog first:</b>' : '<b>Next:</b>'} ${esc(next.text || '(blank)')}</p>`
              : `<p class="today-next done">✓ All done. ${part === 'evening' ? 'Time to review the day.' : 'Add something, or rest.'}</p>`}
            <ul class="mini-list">${items.filter(i => !i.done && i !== next).slice(0, 4).map(i => `<li>${esc(i.text || '(blank)')} <span class="muted small">${esc(i.block)}</span></li>`).join('')}</ul>`
          : '<p class="empty">Nothing planned yet.</p>'}
          <button type="button" class="btn small" data-go="planner">${items.length ? 'Open the planner' : 'Plan the day'}</button>
        </section>` },
      weekly: new Date().getDay() !== 0 ? null : { title: 'Weekly review', hint: 'Sunday', html: `
        <section class="panel">
          <h2>Weekly review <span class="muted small">Sunday</span></h2>
          <p class="small">Look back on the week, find what you missed twice, and set next week’s big rock.</p>
          <button type="button" class="btn small primary" data-go="review">Review the week</button>
        </section>` },
      focus: { title: 'Focus timer', hint: '25 minutes', html: WK.focus.panel() },
      timers: { title: 'Days without', hint: '', html: WK.timers.panel() },
      necessity: { title: 'Necessity', hint: necessity.length ? necessity.length + ' urgent' : 'nothing urgent', html: `
        <section class="panel">
          <h2><span class="dot q-do"></span>Necessity <span class="muted small">Manage</span></h2>
          ${necessity.length ? `<ul class="mini-list">${necessity.map(g => `<li><button type="button" class="link" data-goal="${g.id}">${F.catOf(g.category).icon} ${esc(g.title)}</button>${g.next_step ? `<span class="muted small">→ ${esc(g.next_step)}</span>` : ''}</li>`).join('')}</ul>`
            : '<p class="empty">Nothing urgent. Spend the day in Personal Leadership.</p>'}
        </section>` },
      leadership: { title: 'Personal Leadership', hint: leadership.length ? leadership.length + ' goals' : '', html: `
        <section class="panel">
          <h2><span class="dot q-schedule"></span>Personal Leadership <span class="muted small">Focus</span></h2>
          ${leadership.length ? `<ul class="mini-list">${leadership.slice(0, 6).map(g => `<li><button type="button" class="link" data-goal="${g.id}">${F.catOf(g.category).icon} ${esc(g.next_step || g.title)}</button>${g.next_step ? `<span class="muted small">${esc(g.title)}</span>` : ''}</li>`).join('')}</ul>`
            : '<p class="empty">No goals here yet.</p>'}
          <button type="button" class="btn small" data-go="vision">Vision board</button>
        </section>` },
      journal: { title: 'Journal', hint: wroteToday ? 'written ✓' : 'not yet today', html: `
        <section class="panel prompt-panel">
          <h2>Journal</h2>
          <p class="prompt-text">${esc(prompt)}</p>
          <div class="practice-actions">
            <button type="button" class="btn small ${wroteToday || part !== 'afternoon' ? '' : 'primary'}" id="today-write">${wroteToday ? 'Write another entry' : 'Write today’s entry'}</button>
            ${part === 'morning' ? '<button type="button" class="btn small primary" data-stoic="morning">🌅 Morning preparation</button>' : ''}
            ${part === 'evening' ? '<button type="button" class="btn small primary" data-stoic="evening">🌙 Evening review</button>' : ''}
          </div>
        </section>` },
      practice: WK.practicePanel ? { title: 'Today’s exercise', hint: '', html: WK.practicePanel() } : null,
      onthisday: !onThisDay.length ? null : { title: 'On this day', hint: onThisDay.length + (onThisDay.length === 1 ? ' entry' : ' entries'), html: `
        <section class="panel">
          <h2>On this day</h2>
          <ul class="mini-list">${onThisDay.map(e => `<li><button type="button" class="link" data-entry="${e.id}">${esc(e.title || 'Untitled')}</button><span class="muted small">${esc(e.entry_date.slice(0, 4))}</span></li>`).join('')}</ul>
        </section>` },
      conscience: { title: 'Have a clear conscience', hint: habits.length + ' of ' + F.CONSCIENCE.length, html: `
        <section class="panel conscience">
          <h2>Have a clear conscience <span class="muted small" id="conscience-count">${habits.length} of ${F.CONSCIENCE.length}</span></h2>
          <div class="progress"><i id="conscience-bar" style="width:${Math.round(habits.length / F.CONSCIENCE.length * 100)}%"></i></div>
          <ul class="conscience-list">${F.CONSCIENCE.map((c, i) => `
            <li><label class="check"><input type="checkbox" data-habit="${i}"${habits.includes(c) ? ' checked' : ''}> <span>${esc(c)}</span></label></li>`).join('')}
          </ul>
        </section>` },
      routine: { title: 'Minimum home routine', hint: '', html: WK.routine.panel() },
      balance: { title: 'Balance', hint: 'open goals by life area', html: `
        <section class="panel balance">
          <h2>Balance</h2>
          <p class="muted small">Open goals in each life area.</p>
          <ul class="bars">${F.CATEGORIES.map(c => {
            const n = goals.filter(g => g.category === c.name).length;
            const max = Math.max(1, ...F.CATEGORIES.map(x => goals.filter(g => g.category === x.name).length));
            return `<li class="${n ? '' : 'none'}"><span>${c.icon} ${esc(c.name)}</span><i style="--w:${Math.round(n / max * 100)}%"></i><b>${n}</b></li>`;
          }).join('')}</ul>
        </section>` }
    };

    // What comes first at this time of day. The first four show in full,
    // the rest fold into a row each; opening or hiding one is remembered
    // and wins over this order's default.
    const ORDER = {
      morning:   ['plan', 'weekly', 'practice', 'journal', 'necessity', 'focus', 'leadership', 'timers', 'routine', 'onthisday', 'conscience', 'balance'],
      afternoon: ['plan', 'weekly', 'focus', 'necessity', 'leadership', 'practice', 'timers', 'routine', 'journal', 'onthisday', 'conscience', 'balance'],
      evening:   ['plan', 'weekly', 'conscience', 'journal', 'routine', 'onthisday', 'practice', 'timers', 'necessity', 'leadership', 'focus', 'balance']
    };
    const keys = ORDER[part].filter(k => P[k]);
    const prefs = foldPrefs();
    const isOpen = (k, i) => k === 'plan' || (prefs[k] ? prefs[k] === 'open' : i < 4);

    el.innerHTML = `
      <div class="today-head">
        <h1>${greeting()}</h1>
        <p class="muted">${esc(WK.fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      </div>
      <div class="today-grid">${keys.map((k, i) => k === 'plan' ? P[k].html : `
        <details class="today-fold" data-fold="${k}"${isOpen(k, i) ? ' open' : ''}>
          <summary><b>${esc(P[k].title)}</b>${P[k].hint ? `<span class="muted small">${esc(P[k].hint)}</span>` : ''}</summary>
          ${P[k].html}
          <button type="button" class="link today-hide" data-hide="${k}">Hide</button>
        </details>`).join('')}
      </div>`;

    // Only your own taps are remembered (the browser also fires 'toggle'
    // when the page draws a panel open).
    el.querySelectorAll('[data-fold] > summary').forEach(sm => sm.addEventListener('click', () => {
      const d = sm.parentElement;
      setTimeout(() => saveFold(d.dataset.fold, d.open ? 'open' : 'closed'));
    }));
    el.querySelectorAll('[data-hide]').forEach(b => b.onclick = () => { b.closest('details').open = false; saveFold(b.dataset.hide, 'closed'); });
    el.querySelectorAll('[data-stoic]').forEach(b => b.onclick = () => WK.startStoic && WK.startStoic(b.dataset.stoic));
    el.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => WK.show(b.dataset.go); });
    if (WK.bindPractice) WK.bindPractice(el);
    el.querySelectorAll('[data-goal]').forEach(b => { b.onclick = () => WK.openGoal(WK.goals().find(g => g.id === b.dataset.goal)); });
    el.querySelectorAll('[data-entry]').forEach(b => { b.onclick = () => WK.openEntry(entries.find(e => e.id === b.dataset.entry)); });
    // Tick a point: save the day's ticks, and undo the tick if it fails.
    const ticked = () => {
      const done = F.CONSCIENCE.filter((c, i) => el.querySelector(`[data-habit="${i}"]`).checked);
      $('conscience-count').textContent = done.length + ' of ' + F.CONSCIENCE.length;
      $('conscience-bar').style.width = Math.round(done.length / F.CONSCIENCE.length * 100) + '%';
      return done;
    };
    el.querySelectorAll('[data-habit]').forEach(box => {
      box.onchange = async () => {
        try { await WK.saveHabits(today, ticked()); }
        catch (err){ box.checked = !box.checked; ticked(); WK.toast('Not saved: ' + err.message); }
      };
    });
    WK.timers.bind(el);
    WK.focus.bind(el);
    WK.routine.bind(el);
    $('today-write').onclick = () => WK.openEntry(null, { kind: 'journal', title: prompt });
  }
})();
