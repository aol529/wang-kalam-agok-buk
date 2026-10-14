/* Today: the front page. The day's plan, what's in Necessity, the next
   steps in Personal Leadership, the journal prompt, entries from this day
   in past years, and how the seven life areas are covered. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  WK.section({ name: 'today', label: 'Today', render });

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
    const done = items.filter(i => i.done).length;
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
            <ul class="mini-list">${items.filter(i => !i.done).slice(0, 5).map(i => `<li>${esc(i.text || '(blank)')} <span class="muted small">${esc(i.block)}</span></li>`).join('') || '<li>All done. Time to review the day.</li>'}</ul>`
          : '<p class="empty">Nothing planned yet.</p>'}
          <button type="button" class="btn small" data-go="planner">${items.length ? 'Open the planner' : 'Plan the day'}</button>
        </section>

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

        ${onThisDay.length ? `
        <section class="panel">
          <h2>On this day</h2>
          <ul class="mini-list">${onThisDay.map(e => `<li><button type="button" class="link" data-entry="${e.id}">${esc(e.title || 'Untitled')}</button><span class="muted small">${esc(e.entry_date.slice(0, 4))}</span></li>`).join('')}</ul>
        </section>` : ''}

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
    el.querySelectorAll('[data-goal]').forEach(b => { b.onclick = () => WK.openGoal(WK.goals().find(g => g.id === b.dataset.goal)); });
    el.querySelectorAll('[data-entry]').forEach(b => { b.onclick = () => WK.openEntry(entries.find(e => e.id === b.dataset.entry)); });
    $('today-write').onclick = () => WK.openEntry(null, { kind: 'journal', title: prompt });
  }
})();
