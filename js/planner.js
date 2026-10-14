/* Planner: one page per day, laid out in the time blocks of the working
   day from the Career notes. A day starts blank or from the routine;
   tasks can come from goals (the next steps in Necessity and Personal
   Leadership). The evening review can be carried into the Journal. Below
   the day: Covey's time quadrant (the picture from the 2018 site) and the
   training mega-cycle. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  const plans = {};           // 'YYYY-MM-DD' -> plan row (or a blank one)
  let day = WK.isoDate();
  let saveTimer = null;

  // Read by Today.
  WK.planFor = iso => plans[iso] || null;

  WK.section({ name: 'planner', label: 'Planner', load, render, reset(){ Object.keys(plans).forEach(k => delete plans[k]); day = WK.isoDate(); } });

  function load(){ return fetchWeek(WK.isoDate()); }

  // Monday of the week of `iso`.
  function weekStart(iso){
    const d = WK.parseDate(iso);
    return WK.addDays(iso, -((d.getDay() + 6) % 7));
  }
  async function fetchWeek(iso){
    const from = weekStart(iso), to = WK.addDays(from, 6);
    const { data, error } = await WK.db.from('day_plans').select('*').gte('plan_date', from).lte('plan_date', to);
    if (error) throw error;
    for (let d = from; d <= to; d = WK.addDays(d, 1)) if (!plans[d]) plans[d] = blank(d);
    (data || []).forEach(p => { plans[p.plan_date] = p; });
  }
  const blank = iso => ({ plan_date: iso, intention: '', items: [], review: '', _new: true });
  const newId = () => Math.random().toString(36).slice(2, 10);

  function saveSoon(p){
    clearTimeout(saveTimer);
    $('plan-status').textContent = 'Saving…';
    saveTimer = setTimeout(() => save(p), 600);
  }
  async function save(p){
    const row = { owner_id: WK.user.id, plan_date: p.plan_date, intention: p.intention, items: p.items, review: p.review, updated_at: new Date().toISOString() };
    const { data, error } = await WK.db.from('day_plans').upsert([row], { onConflict: 'owner_id,plan_date' }).select().single();
    if (error){ $('plan-status').textContent = 'Not saved: ' + error.message; return; }
    // Keep our own items: the rows on screen point at them, and edits made
    // while this save was out would be lost if the reply replaced them.
    p.id = data.id; p._new = false;
    if (day === p.plan_date) $('plan-status').textContent = countText(p) + (p.items.length ? ' · ' : '') + 'Saved';
    drawWeek();
  }

  function blocksOf(p){
    const names = F.ROUTINE.map(r => r.block);
    p.items.forEach(it => { if (!names.includes(it.block)) names.push(it.block); });
    if (!names.includes(F.OTHER_BLOCK)) names.push(F.OTHER_BLOCK);
    return names;
  }

  async function go(iso){
    day = iso;
    if (!plans[iso]){
      $('section-planner').classList.add('loading');
      try { await fetchWeek(iso); } catch (err){ WK.toast('Could not load: ' + err.message); }
      $('section-planner').classList.remove('loading');
    }
    render();
  }

  function render(){
    const el = $('section-planner');
    const p = plans[day] || (plans[day] = blank(day));
    const today = WK.isoDate();
    const label = day === today ? 'Today' : day === WK.addDays(today, 1) ? 'Tomorrow' : day === WK.addDays(today, -1) ? 'Yesterday' : '';
    el.innerHTML = `
      <div class="day-bar">
        <button type="button" class="btn ghost" id="plan-prev" aria-label="Previous day">‹</button>
        <div class="day-title">
          <h1>${label ? esc(label) + ' · ' : ''}${esc(WK.fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' }))}</h1>
          <span class="muted" id="plan-status">${countText(p)}</span>
        </div>
        <button type="button" class="btn ghost" id="plan-next" aria-label="Next day">›</button>
        <input type="date" id="plan-date" value="${day}" aria-label="Go to date">
        ${day !== today ? '<button type="button" class="btn small" id="plan-today">Today</button>' : ''}
      </div>
      <div class="week" id="plan-week"></div>

      <label class="intention">The one thing that would make this day a success
        <input id="plan-intention" value="${esc(p.intention)}" placeholder="e.g. Finish the sales deck">
      </label>

      <div class="planner-grid">
        <div class="plan-blocks" id="plan-blocks"></div>
        <aside class="plan-side">
          <div class="panel">
            <h2>From your goals</h2>
            <p class="muted small">Next steps from Necessity and Personal Leadership. Add one to the day.</p>
            <div id="plan-goals"></div>
          </div>
          <div class="panel">
            <h2>Review the day</h2>
            <p class="muted small">Leadership & Management: what went well, what to change, what's first tomorrow.</p>
            <textarea id="plan-review" rows="6" placeholder="Tonight's review">${esc(p.review)}</textarea>
            <button type="button" class="btn small" id="plan-to-journal">🌙 Evening review in the Journal →</button>
          </div>
        </aside>
      </div>

      <details class="panel training quadrant-img" open>
        <summary><h2>Stephen Covey's Time Quadrant</h2><span class="muted small">From the original wang'kalamagokbuk.org, 2018</span></summary>
        <a href="img/covey-quadrant.jpg" target="_blank" rel="noopener" title="Open full size">
          <img src="img/covey-quadrant.jpg" alt="Stephen Covey's Time Quadrant: Necessity (manage), Personal Leadership (focus), Deception/Distraction (avoid or delegate), Waste (delete)" loading="lazy">
        </a>
      </details>

      <details class="panel training">
        <summary><h2>Training mega-cycle</h2><span class="muted small">Periodisation: six weeks, then a deload week (6+1)</span></summary>
        <div class="table-wrap"><table>
          <thead><tr><th>Routine</th><th>Details</th><th>Where</th><th>Per week</th><th>Weeks</th></tr></thead>
          <tbody>${F.TRAINING.map(t => `<tr><td><b>${esc(t.routine)}</b></td><td>${esc(t.details)}</td><td>${esc(t.where)}</td><td>${esc(t.per)}</td><td>${esc(t.weeks || '—')}</td></tr>`).join('')}</tbody>
        </table></div>
      </details>`;

    $('plan-prev').onclick = () => go(WK.addDays(day, -1));
    $('plan-next').onclick = () => go(WK.addDays(day, 1));
    $('plan-date').onchange = e => { if (e.target.value) go(e.target.value); };
    if ($('plan-today')) $('plan-today').onclick = () => go(today);
    $('plan-intention').oninput = e => { p.intention = e.target.value; saveSoon(p); };
    $('plan-review').oninput = e => { p.review = e.target.value; saveSoon(p); };
    // Carry the day's notes into a Stoic evening review in the Journal.
    $('plan-to-journal').onclick = () => {
      const lead = [p.intention ? 'Intention: ' + p.intention : '', (p.review || '').trim()].filter(Boolean).join('\n\n');
      WK.startStoic && WK.startStoic('evening', day, lead);
    };
    drawWeek();
    drawBlocks(p);
    drawGoals(p);
  }

  // Mon–Sun strip: how much of each day's plan got done.
  function drawWeek(){
    const el = $('plan-week');
    if (!el) return;
    const from = weekStart(day), today = WK.isoDate();
    let html = '';
    for (let i = 0; i < 7; i++){
      const d = WK.addDays(from, i);
      const p = plans[d];
      const n = p ? p.items.length : 0, k = p ? p.items.filter(x => x.done).length : 0;
      html += `<button type="button" class="wk-day${d === day ? ' on' : ''}${d === today ? ' today' : ''}" data-d="${d}">
        <span>${esc(WK.fmtDate(d, { weekday: 'short' }))}</span><b>${WK.parseDate(d).getDate()}</b>
        <i style="--p:${n ? Math.round(k / n * 100) : 0}%" title="${n ? k + ' of ' + n + ' done' : 'Nothing planned'}"></i></button>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => go(b.dataset.d); });
  }

  function drawBlocks(p){
    const el = $('plan-blocks');
    if (!p.items.length){
      el.innerHTML = `
        <div class="panel empty-day">
          <p>Nothing planned yet.</p>
          <button type="button" class="btn primary" id="plan-routine">Start from my routine</button>
          <button type="button" class="btn ghost" id="plan-copy">Copy yesterday's unfinished</button>
        </div>`;
      $('plan-routine').onclick = () => {
        F.ROUTINE.forEach(r => r.items.forEach(text => p.items.push({ id: newId(), block: r.block, text, done: false })));
        saveSoon(p); render();
      };
      $('plan-copy').onclick = async () => {
        const prev = WK.addDays(day, -1);
        if (!plans[prev]) await fetchWeek(prev).catch(() => {});
        const left = (plans[prev] && plans[prev].items || []).filter(i => !i.done);
        if (!left.length){ WK.toast('Nothing left over from yesterday.'); return; }
        left.forEach(i => p.items.push(Object.assign({}, i, { id: newId(), done: false })));
        saveSoon(p); render();
      };
      return;
    }
    const goals = WK.goals ? WK.goals() : [];
    el.innerHTML = blocksOf(p).map(b => {
      const r = F.ROUTINE.find(x => x.block === b);
      const mine = p.items.filter(i => i.block === b);
      return `
        <div class="panel plan-block" data-block="${esc(b)}">
          <div class="plan-block-head"><h2>${esc(b)}</h2>${r ? `<span class="muted small">${esc(r.time)}</span>` : ''}
            <span class="count">${mine.filter(i => i.done).length}/${mine.length}</span></div>
          <ul class="tasks">${mine.map(i => {
            const g = i.goal_id && goals.find(x => x.id === i.goal_id);
            return `<li data-item="${i.id}" class="${i.done ? 'done' : ''}">
              <input type="checkbox" ${i.done ? 'checked' : ''} aria-label="Done">
              <input class="task-text" value="${esc(i.text)}" aria-label="Task">
              ${g ? `<span class="chip goal-chip" title="${esc(g.title)}">${F.catOf(g.category).icon}</span>` : ''}
              <button type="button" class="x" aria-label="Remove task">✕</button></li>`;
          }).join('')}</ul>
          <button type="button" class="btn ghost small add-task">+ Task</button>
        </div>`;
    }).join('');
    el.querySelectorAll('.plan-block').forEach(blockEl => {
      const b = blockEl.dataset.block;
      blockEl.querySelector('.add-task').onclick = () => {
        const it = { id: newId(), block: b, text: '', done: false };
        p.items.push(it);
        saveSoon(p); drawBlocks(p);
        const inp = $('plan-blocks').querySelector(`[data-item="${it.id}"] .task-text`);
        if (inp) inp.focus();
      };
      blockEl.querySelectorAll('[data-item]').forEach(li => {
        const it = p.items.find(x => x.id === li.dataset.item);
        li.querySelector('input[type=checkbox]').onchange = e => {
          it.done = e.target.checked; li.classList.toggle('done', it.done);
          saveSoon(p); updateCounts(p);
        };
        const txt = li.querySelector('.task-text');
        txt.oninput = () => { it.text = txt.value; saveSoon(p); };
        txt.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); blockEl.querySelector('.add-task').click(); } };
        li.querySelector('.x').onclick = () => { p.items = p.items.filter(x => x !== it); saveSoon(p); drawBlocks(p); updateCounts(p); };
      });
    });
  }
  const countText = p => p.items.length ? p.items.filter(i => i.done).length + ' of ' + p.items.length + ' done' : '';
  function updateCounts(p){
    $('plan-status').textContent = countText(p);
    document.querySelectorAll('.plan-block').forEach(el => {
      const mine = p.items.filter(i => i.block === el.dataset.block);
      el.querySelector('.count').textContent = mine.filter(i => i.done).length + '/' + mine.length;
    });
  }

  function drawGoals(p){
    const goals = (WK.goals ? WK.goals() : []).filter(g => !g.done && g.important);
    const el = $('plan-goals');
    if (!goals.length){ el.innerHTML = '<p class="empty">No open important goals yet. Add them in Vision.</p>'; return; }
    const order = g => (g.urgent ? 0 : 1);
    el.innerHTML = '<ul class="goal-picks">' + goals.slice().sort((a, b) => order(a) - order(b)).slice(0, 8).map(g => {
      const q = F.quadOf(g);
      const added = p.items.some(i => i.goal_id === g.id);
      return `<li><span class="dot q-${q.key}" title="${esc(q.name)}"></span>
        <span class="gp-text">${F.catOf(g.category).icon} ${esc(g.next_step || g.title)}${g.next_step ? `<small>${esc(g.title)}</small>` : ''}</span>
        <button type="button" class="btn small" data-goal="${g.id}"${added ? ' disabled' : ''}>${added ? 'Added' : '+ Add'}</button></li>`;
    }).join('') + '</ul>';
    el.querySelectorAll('[data-goal]').forEach(b => {
      b.onclick = () => {
        const g = goals.find(x => x.id === b.dataset.goal);
        p.items.push({ id: newId(), block: F.OTHER_BLOCK, text: g.next_step || g.title, done: false, goal_id: g.id });
        saveSoon(p); drawBlocks(p); drawGoals(p); updateCounts(p);
      };
    });
  }
})();
