/* Review: the week looked back on, Monday to Sunday. What the other tabs
   recorded (the Planner's tasks and frogs, the clear conscience ticks,
   the home routine, the journal, the Days without timers, the budget)
   laid out in one place, with Clear's "never miss twice" flagged, the
   seven life areas the week touched, and the review itself: a journal
   entry "Weekly review · <Monday>" and next week's big rock, which goes
   on Monday's plan as the frog. Reads only; nothing new in Supabase. */
(function(){
  const { $, esc } = WK;
  const F = WK.F, S = WK.SYS;

  let week = monday(WK.isoDate());
  let data = null;            // { plans: { iso: row }, ticks: Set('period|item') } for `week`
  let loading = null;

  // Leaving drops the week, so coming back reads what changed elsewhere.
  WK.section({ name: 'review', label: 'Review', render,
    hide(){ data = null; loading = null; },
    reset(){ week = monday(WK.isoDate()); data = null; loading = null; } });

  function monday(iso){ return WK.addDays(iso, -((WK.parseDate(iso).getDay() + 6) % 7)); }
  const daysOf = from => Array.from({ length: 7 }, (_, i) => WK.addDays(from, i));
  const titleOf = from => 'Weekly review · ' + WK.fmtDate(from, { day: 'numeric', month: 'short', year: 'numeric' });

  async function fetchWeek(from){
    const to = WK.addDays(from, 6);
    const periods = daysOf(from).map(d => 'day:' + d).concat('week:' + from);
    const [p, t] = await Promise.all([
      WK.db.from('day_plans').select('plan_date,items,habits,intention').gte('plan_date', from).lte('plan_date', to),
      WK.db.from('routine_ticks').select('period,item').in('period', periods)
    ]);
    if (p.error) throw p.error;
    const plans = {};
    (p.data || []).forEach(r => { plans[r.plan_date] = r; });
    // Without sql/06-systems.sql there are just no routine ticks.
    const ticks = new Set((t.error ? [] : t.data || []).map(r => r.period + '|' + r.item));
    return { plans, ticks };
  }

  function go(from){
    week = from; data = null;
    const run = loading = fetchWeek(from)
      .then(d => { if (loading === run && week === from){ data = d; render(); } })
      .catch(err => { if (loading === run) $('section-review').innerHTML = `<p class="empty">Could not load the week: ${esc(err.message)}</p>`; });
    render();
  }

  function render(){
    const el = $('section-review');
    if (!data){
      el.innerHTML = '<p class="empty">Loading the week…</p>';
      if (!loading) go(week);
      return;
    }
    const today = WK.isoDate(), days = daysOf(week), end = days[6];
    const past = d => d < today;                     // a day that's over
    const { plans, ticks } = data;
    const planOf = d => plans[d] || { items: [], habits: [] };
    const entries = (WK.entries ? WK.entries() : []).filter(e => e.kind === 'journal' && e.entry_date >= week && e.entry_date <= end);
    const reviewTitle = titleOf(week);
    const written = (WK.entries ? WK.entries() : []).find(e => e.kind === 'journal' && e.title === reviewTitle);
    const thisWeek = week === monday(today);

    // Days: tasks done, the frog, the clear conscience, the daily routine, the journal.
    const dayRows = days.map(d => {
      const p = planOf(d), items = p.items || [];
      const frog = items.find(i => i.frog);
      const homeDone = S.HOME[0].items.filter(i => ticks.has('day:' + d + '|' + i)).length;
      const mood = entries.filter(e => e.entry_date === d && e.mood).map(e => F.MOODS[e.mood - 1]).join('');
      return { d, n: items.length, k: items.filter(i => i.done).length, frog, conscience: (p.habits || []).length, homeDone,
               wrote: entries.some(e => e.entry_date === d), mood };
    });
    const tasks = dayRows.reduce((a, r) => a + r.n, 0), tasksDone = dayRows.reduce((a, r) => a + r.k, 0);
    const frogs = dayRows.filter(r => r.frog), frogsEaten = frogs.filter(r => r.frog.done);

    // Never miss twice: every daily habit, a dot a day, flagged after two
    // missed days in a row. Today isn't a miss until it's over.
    const habits = F.CONSCIENCE.map(c => ({ name: c, kind: 'Clear conscience', hit: d => (planOf(d).habits || []).includes(c) }))
      .concat(S.HOME[0].items.map(i => ({ name: i, kind: 'Home routine', hit: d => ticks.has('day:' + d + '|' + i) })));
    habits.forEach(h => {
      h.marks = days.map(d => h.hit(d) ? 'hit' : past(d) ? 'miss' : 'open');
      h.twice = h.marks.some((m, i) => m === 'miss' && h.marks[i + 1] === 'miss');
      h.hits = h.marks.filter(m => m === 'hit').length;
    });
    const missedTwice = habits.filter(h => h.twice);
    const weekly = S.HOME[1].items.filter(i => ticks.has('week:' + week + '|' + i)).length;

    // Life areas: done tasks tied to a goal, and journal entries tagged with the area.
    const goals = WK.goals ? WK.goals() : [];
    const touch = {};
    F.CATEGORIES.forEach(c => { touch[c.name] = { tasks: 0, entries: 0 }; });
    days.forEach(d => (planOf(d).items || []).forEach(i => {
      const g = i.done && i.goal_id && goals.find(x => x.id === i.goal_id);
      if (g && touch[g.category]) touch[g.category].tasks++;
    }));
    entries.forEach(e => (e.areas || []).forEach(a => { if (touch[a]) touch[a].entries++; }));
    const total = c => touch[c.name].tasks + touch[c.name].entries;
    const maxTouch = Math.max(1, ...F.CATEGORIES.map(total));
    const neglected = F.CATEGORIES.filter(c => !total(c));

    // Days without: slips that fell in this week.
    const startMs = WK.parseDate(week).getTime(), endMs = WK.parseDate(WK.addDays(end, 1)).getTime();
    const timers = WK.timerList ? WK.timerList() : [];
    const slips = timers.map(t => ({ name: t.name, n: (t.history || []).filter(r => { const x = new Date(r.to).getTime(); return x >= startMs && x < endMs; }).length }));

    // Budget: the month this week ends in.
    const month = end.slice(0, 7);
    const bills = (WK.budgetItems ? WK.budgetItems() : []).filter(i => i.monthly);
    const paid = bills.filter(i => (i.paid || []).includes(month));
    const sum = list => list.reduce((a, i) => a + (Number(i.amount) || 0), 0);
    const kes = n => 'KES ' + Math.round(n).toLocaleString('en-KE');

    const moods = entries.filter(e => e.mood).map(e => e.mood);
    const gratitude = entries.map(e => (e.gratitude || '').trim()).filter(Boolean);
    const dayName = d => WK.fmtDate(d, { weekday: 'short' });

    el.innerHTML = `
      <div class="day-bar">
        <button type="button" class="btn ghost" id="rev-prev" aria-label="Previous week">‹</button>
        <div class="day-title">
          <h1>${thisWeek ? 'This week' : week === WK.addDays(monday(today), -7) ? 'Last week' : 'Week'} · ${esc(WK.fmtDate(week, { day: 'numeric', month: 'short' }))} – ${esc(WK.fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' }))}</h1>
          <span class="muted">${tasks ? `${tasksDone} of ${tasks} tasks done · ` : ''}${frogsEaten.length} of ${frogs.length} frogs eaten · ${entries.length} journal entr${entries.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <button type="button" class="btn ghost" id="rev-next" aria-label="Next week"${week >= monday(today) ? ' disabled' : ''}>›</button>
        ${thisWeek ? '' : '<button type="button" class="btn small" id="rev-now">This week</button>'}
      </div>
      <blockquote class="sys-quote">“Missing once is an accident. Missing twice is the start of a new habit.”<cite>James Clear, Atomic Habits</cite></blockquote>

      <div class="today-grid review-grid">
        <section class="panel review-days">
          <h2>The days</h2>
          <div class="table-wrap"><table class="review-table">
            <thead><tr><th></th><th>Tasks</th><th>🐸</th><th title="Clear conscience">Conscience</th><th title="Daily home routine">Home</th><th>Journal</th></tr></thead>
            <tbody>${dayRows.map(r => `
              <tr class="${r.d === today ? 'is-today' : ''}${r.d > today ? ' is-future' : ''}">
                <th><button type="button" class="link" data-day="${r.d}">${esc(dayName(r.d))} ${WK.parseDate(r.d).getDate()}</button></th>
                <td>${r.n ? `${r.k}/${r.n}` : '<span class="muted">—</span>'}</td>
                <td title="${r.frog ? esc(r.frog.text) : 'No frog'}">${r.frog ? (r.frog.done ? '✓' : past(r.d) ? '✗' : '·') : '<span class="muted">—</span>'}</td>
                <td>${r.conscience}/${F.CONSCIENCE.length}</td>
                <td>${r.homeDone}/${S.HOME[0].items.length}</td>
                <td>${r.wrote ? (r.mood || '✓') : '<span class="muted">—</span>'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
          <p class="muted small">Weekly home routine: ${weekly} of ${S.HOME[1].items.length} done. Tap a day to open it in the Planner.</p>
        </section>

        <section class="panel">
          <h2>Never miss twice <span class="muted small">${missedTwice.length ? `${missedTwice.length} slipped two days running` : 'no double misses'}</span></h2>
          <ul class="habit-grid">
            <li class="habit-head"><span></span>${days.map(d => `<b>${esc(dayName(d).slice(0, 2))}</b>`).join('')}</li>
            ${habits.map(h => `
            <li class="${h.twice ? 'twice' : ''}" title="${esc(h.kind)}: ${h.hits} of 7">
              <span>${esc(h.name)}</span>${h.marks.map(m => `<i class="mark ${m}"></i>`).join('')}
            </li>`).join('')}
          </ul>
          <p class="muted small">Filled: done. Hollow red: missed. Red line: missed two days in a row. Pick one of them for next week, and make it easy.</p>
        </section>

        <section class="panel balance">
          <h2>Life areas this week</h2>
          <p class="muted small">Done tasks tied to a goal, and journal entries tagged with the area.</p>
          <ul class="bars">${F.CATEGORIES.map(c => `
            <li class="${total(c) ? '' : 'none'}"><span>${c.icon} ${esc(c.name)}</span><i style="--w:${Math.round(total(c) / maxTouch * 100)}%"></i><b>${total(c)}</b></li>`).join('')}
          </ul>
          ${neglected.length ? `<p class="small">Nothing this week: ${neglected.map(c => esc(c.name)).join(', ')}.</p>` : '<p class="small">Every area got something this week.</p>'}
        </section>

        <section class="panel">
          <h2>The journal <span class="muted small">${moods.length ? `mood ${F.MOODS[Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) - 1]}` : ''}</span></h2>
          ${entries.length ? `<ul class="mini-list">${entries.slice().sort((a, b) => a.entry_date.localeCompare(b.entry_date)).map(e => `
            <li><button type="button" class="link" data-entry="${e.id}">${esc(e.title || 'Untitled')}</button><span class="muted small">${esc(dayName(e.entry_date))}${e.mood ? ' ' + F.MOODS[e.mood - 1] : ''}</span></li>`).join('')}</ul>`
            : '<p class="empty">No entries this week.</p>'}
          ${gratitude.length ? `<h3 class="review-sub">Grateful for</h3><ul class="review-grateful">${gratitude.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
        </section>

        ${timers.length ? `
        <section class="panel">
          <h2>Days without</h2>
          <ul class="mini-list">${slips.map(s => `<li><span>${esc(s.name)}</span><span class="${s.n ? 'review-bad' : 'muted'} small">${s.n ? `${s.n} slip${s.n === 1 ? '' : 's'} this week` : 'clean week'}</span></li>`).join('')}</ul>
        </section>` : ''}

        ${bills.length ? `
        <section class="panel">
          <h2>Budget <span class="muted small">${esc(new Date(month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</span></h2>
          <div class="progress"><i style="width:${Math.round(paid.length / bills.length * 100)}%"></i></div>
          <p class="small">${paid.length} of ${bills.length} monthly items paid · ${kes(sum(paid))} of ${kes(sum(bills))}</p>
          ${bills.length - paid.length ? `<p class="muted small">Still to pay: ${bills.filter(i => !paid.includes(i)).map(i => esc(i.name)).join(', ')}</p>` : ''}
          <button type="button" class="btn small" data-go="budget">Budget</button>
        </section>` : ''}

        <section class="panel review-write">
          <h2>The review</h2>
          ${written ? `<p class="small">Written. <button type="button" class="link" data-entry="${written.id}">${esc(written.title)}</button></p>`
            : '<p class="muted small">The numbers above go into a journal entry with the questions. Answer them there.</p>'}
          <button type="button" class="btn ${written ? 'small' : 'primary'}" id="rev-write">${written ? 'Open the review' : 'Write the weekly review'}</button>
          <h3 class="review-sub">Next week’s big rock</h3>
          <p class="muted small">The one thing that would make next week a success. It goes on Monday’s plan as the frog, sized big.</p>
          <div class="review-rock">
            <input id="rev-rock" placeholder="e.g. Send the proposal to the client" aria-label="Next week's big rock">
            <button type="button" class="btn small" id="rev-rock-add">On Monday</button>
          </div>
        </section>
      </div>`;

    $('rev-prev').onclick = () => go(WK.addDays(week, -7));
    $('rev-next').onclick = () => go(WK.addDays(week, 7));
    if ($('rev-now')) $('rev-now').onclick = () => go(monday(today));
    el.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => WK.show(b.dataset.go); });
    el.querySelectorAll('[data-entry]').forEach(b => { b.onclick = () => WK.openEntry(WK.entries().find(e => e.id === b.dataset.entry)); });
    el.querySelectorAll('[data-day]').forEach(b => { b.onclick = () => { WK.planGo(b.dataset.day); WK.show('planner'); }; });

    $('rev-write').onclick = () => {
      if (written) return WK.openEntry(written);
      const lines = [
        `Tasks: ${tasksDone} of ${tasks} done. Frogs: ${frogsEaten.length} of ${frogs.length} eaten.`,
        `Clear conscience: ${dayRows.reduce((a, r) => a + r.conscience, 0)} of ${F.CONSCIENCE.length * 7} ticks. Home routine: ${weekly} of ${S.HOME[1].items.length} weekly jobs.`,
        missedTwice.length ? `Missed twice: ${missedTwice.map(h => h.name).join('; ')}.` : 'Never missed twice.',
        neglected.length ? `Nothing this week for: ${neglected.map(c => c.name).join(', ')}.` : 'Every life area got something.',
        slips.some(s => s.n) ? `Slips: ${slips.filter(s => s.n).map(s => `${s.name} (${s.n})`).join(', ')}.` : '',
        bills.length ? `Budget: ${paid.length} of ${bills.length} monthly items paid.` : ''
      ].filter(Boolean);
      const body = 'The week in numbers\n' + lines.map(l => '- ' + l).join('\n') + '\n\n' +
        REVIEW_QUESTIONS.map(q => q + '\n\n').join('');
      WK.openEntry(null, { kind: 'journal', entry_date: end < today ? end : today, title: reviewTitle, body, areas: ['Personal Development'] });
      const form = $('entry-form'), at = body.indexOf(REVIEW_QUESTIONS[0]) + REVIEW_QUESTIONS[0].length + 1;
      form.body.setSelectionRange(at, at);
    };

    const nextMonday = WK.addDays(week, 7);
    $('rev-rock-add').onclick = async () => {
      const text = $('rev-rock').value.trim();
      if (!text){ $('rev-rock').focus(); return; }
      $('rev-rock-add').disabled = true;
      try {
        await WK.addToPlan(text, nextMonday, { frog: true, size: 'big' });
        $('rev-rock').value = '';
        WK.toast('On ' + WK.fmtDate(nextMonday, { weekday: 'long', day: 'numeric', month: 'short' }) + ' as the frog.');
      } catch (err){ WK.toast('Not added: ' + err.message); }
      $('rev-rock-add').disabled = false;
    };
  }

  // Covey's weekly review and Clear's habit check, in that order.
  const REVIEW_QUESTIONS = [
    'What went well this week, and why?',
    'Where did I miss twice? What will make it easier next week?',
    'Which life area did I neglect, and what is one small step for it?',
    'What should I stop doing (my not-to-do list)?',
    'What is next week’s big rock?'
  ];
})();
