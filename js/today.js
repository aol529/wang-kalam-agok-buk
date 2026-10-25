/* Today: the front page. The day's plan, what's in Necessity, the next
   steps in Personal Leadership, the journal prompt, today's Stoic exercise (practice.js), entries from this day
   in past years, how the seven life areas are covered, the "Have a
   clear conscience" checklist from 2014, the Days without timers
   (timers.js), the focus timer (focus.js), the Minimum Home Routine
   (routine.js), and on Sundays a nudge to the weekly review (review.js). */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  WK.section({ name: 'today', label: 'Today', render,
    load: () => Promise.all([WK.timers.load(), WK.routine.load()]),
    reset(){ WK.timers.reset(); WK.routine.reset(); } });

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

    el.innerHTML = `
      <div class="today-head">
        <h1>${greeting()}</h1>
        <p class="muted">${esc(WK.fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      </div>
      <div class="today-grid">
        <section class="panel today-plan">
          <h2>Today's plan</h2>
          ${plan && plan.intention ? `<p class="intention-text">“${esc(plan.intention)}”</p>` : ''}
          ${items.length ? `
            <div class="progress"><i style="width:${Math.round(done / items.length * 100)}%"></i></div>
            <p class="muted small">${done} of ${items.length} done</p>
            ${frog ? `<p class="today-frog${frog.done ? ' done' : ''}">🐸 <b>${frog.done ? 'Frog eaten:' : 'Eat the frog first:'}</b> ${esc(frog.text || '(blank)')}</p>` : ''}
            <ul class="mini-list">${items.filter(i => !i.done && !i.frog).slice(0, 5).map(i => `<li>${esc(i.text || '(blank)')} <span class="muted small">${esc(i.block)}</span></li>`).join('') || '<li>All done. Time to review the day.</li>'}</ul>`
          : '<p class="empty">Nothing planned yet.</p>'}
          <button type="button" class="btn small" data-go="planner">${items.length ? 'Open the planner' : 'Plan the day'}</button>
        </section>

        ${new Date().getDay() === 0 ? `
        <section class="panel">
          <h2>Weekly review <span class="muted small">Sunday</span></h2>
          <p class="small">Look back on the week, find what you missed twice, and set next week’s big rock.</p>
          <button type="button" class="btn small primary" data-go="review">Review the week</button>
        </section>` : ''}

        ${WK.focus.panel()}

        ${WK.timers.panel()}

        <section class="panel">
          <h2><span class="dot q-do"></span>Necessity <span class="muted small">Manage</span></h2>
          ${necessity.length ? `<ul class="mini-list">${necessity.map(g => `<li><button type="button" class="link" data-goal="${g.id}">${F.catOf(g.category).icon} ${esc(g.title)}</button>${g.next_step ? `<span class="muted small">→ ${esc(g.next_step)}</span>` : ''}</li>`).join('')}</ul>`
            : '<p class="empty">Nothing urgent. Spend the day in Personal Leadership.</p>'}
        </section>

        <section class="panel">
          <h2><span class="dot q-schedule"></span>Personal Leadership <span class="muted small">Focus</span></h2>
          ${leadership.length ? `<ul class="mini-list">${leadership.slice(0, 6).map(g => `<li><button type="button" class="link" data-goal="${g.id}">${F.catOf(g.category).icon} ${esc(g.next_step || g.title)}</button>${g.next_step ? `<span class="muted small">${esc(g.title)}</span>` : ''}</li>`).join('')}</ul>`
            : '<p class="empty">No goals here yet.</p>'}
          <button type="button" class="btn small" data-go="vision">Vision board</button>
        </section>

        <section class="panel prompt-panel">
          <h2>Journal</h2>
          <p class="prompt-text">${esc(prompt)}</p>
          <button type="button" class="btn small ${wroteToday ? '' : 'primary'}" id="today-write">${wroteToday ? 'Write another entry' : 'Write today’s entry'}</button>
        </section>

        ${WK.practicePanel ? WK.practicePanel() : ''}

        ${onThisDay.length ? `
        <section class="panel">
          <h2>On this day</h2>
          <ul class="mini-list">${onThisDay.map(e => `<li><button type="button" class="link" data-entry="${e.id}">${esc(e.title || 'Untitled')}</button><span class="muted small">${esc(e.entry_date.slice(0, 4))}</span></li>`).join('')}</ul>
        </section>` : ''}

        <section class="panel conscience">
          <h2>Have a clear conscience <span class="muted small" id="conscience-count">${habits.length} of ${F.CONSCIENCE.length}</span></h2>
          <div class="progress"><i id="conscience-bar" style="width:${Math.round(habits.length / F.CONSCIENCE.length * 100)}%"></i></div>
          <ul class="conscience-list">${F.CONSCIENCE.map((c, i) => `
            <li><label class="check"><input type="checkbox" data-habit="${i}"${habits.includes(c) ? ' checked' : ''}> <span>${esc(c)}</span></label></li>`).join('')}
          </ul>
        </section>

        ${WK.routine.panel()}

        <section class="panel balance">
          <h2>Balance</h2>
          <p class="muted small">Open goals in each life area.</p>
          <ul class="bars">${F.CATEGORIES.map(c => {
            const n = goals.filter(g => g.category === c.name).length;
            const max = Math.max(1, ...F.CATEGORIES.map(x => goals.filter(g => g.category === x.name).length));
            return `<li class="${n ? '' : 'none'}"><span>${c.icon} ${esc(c.name)}</span><i style="--w:${Math.round(n / max * 100)}%"></i><b>${n}</b></li>`;
          }).join('')}</ul>
        </section>
      </div>`;

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
