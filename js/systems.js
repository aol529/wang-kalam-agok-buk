/* Systems: the six cheat sheets as action steps, each read through the
   Four Laws of Atomic Habits (systems-data.js). "+ Today" puts a step in
   today's plan; a step's arrow opens the part of the app that does it
   (the focus timer and home routine on Today, the 1-3-5 and frog in the
   Planner, the not-to-do list in Vision's Deception and Waste quadrants). */
(function(){
  const { $, esc } = WK;
  const F = WK.F, S = WK.SYS;

  let law = WK.store('wk_systems_law') || '';

  WK.section({ name: 'systems', label: 'Systems', render });

  const GO = {
    focus:   { label: 'Focus timer',  to: 'today' },
    routine: { label: 'Home routine', to: 'today' },
    planner: { label: 'Planner',      to: 'planner' },
    nottodo: { label: 'Not-to-do',    to: 'vision' }
  };
  const lawChip = k => `<span class="chip law law-${k}">${esc(S.lawOf(k).name)}</span>`;

  function render(){
    const el = $('section-systems');
    const today = WK.planFor ? WK.planFor(WK.isoDate()) : null;
    const planned = new Set(today ? today.items.map(i => i.text) : []);
    const cards = S.CARDS.filter(c => !law || c.laws.includes(law));
    const notToDo = (WK.goals ? WK.goals() : []).filter(g => !g.done && !g.important);

    el.innerHTML = `
      <div class="section-head"><h1>Systems</h1></div>
      <blockquote class="sys-quote">“${esc(S.QUOTE)}”<cite>James Clear, Atomic Habits</cite></blockquote>

      <div class="laws">${S.LAWS.map((l, i) => `
        <button type="button" class="law-card law-${l.key}" data-law="${l.key}" aria-pressed="${law === l.key}">
          <span class="law-n">${i + 1} · ${esc(l.stage)}</span>
          <b>${esc(l.name)}</b>
          <span class="small">${esc(l.how)}</span>
          <span class="muted small">Break a habit: ${esc(l.invert.toLowerCase())}</span>
        </button>`).join('')}
      </div>
      <p class="muted small">${law ? `Showing the cards that ${esc(S.lawOf(law).name.toLowerCase())}. <button type="button" class="link" data-law="">Show all</button>` : 'Tap a law to see the cards that use it.'}</p>

      <div class="sys-grid">${cards.map(c => `
        <article class="panel sys-card">
          <h2><span aria-hidden="true">${c.icon}</span> ${esc(c.title)}</h2>
          <div class="post-meta"><span class="chip">${F.catOf(c.area).icon} ${esc(c.area)}</span>${c.laws.map(lawChip).join('')}</div>
          <p class="sys-atomic">${esc(c.atomic)}</p>
          <ul class="sys-steps">${c.steps.map(s => `
            <li>
              <span>${esc(s.text)}</span>
              ${s.go ? `<button type="button" class="btn ghost small" data-go="${GO[s.go].to}">${esc(GO[s.go].label)} →</button>`
                : `<button type="button" class="btn small" data-plan="${esc(s.text)}"${planned.has(s.text) ? ' disabled' : ''}>${planned.has(s.text) ? 'In today' : '+ Today'}</button>`}
            </li>`).join('')}
          </ul>
          ${c.easier ? `<details class="sys-more"><summary>${c.key === 'grocery' ? 'Affordable foods that make life easier' : 'Things that make it easier'}</summary><p class="small">${c.easier.map(esc).join(' · ')}</p></details>` : ''}
          ${c.drains ? `<details class="sys-more"><summary>Silent money drains</summary><p class="small">${c.drains.map(esc).join(' · ')}</p></details>` : ''}
        </article>`).join('')}
      </div>

      <section class="panel not-to-do">
        <h2>Not-to-do list <span class="muted small">Deception and Waste on the Vision board</span></h2>
        <p class="muted small">Make it invisible, unattractive, difficult. Anything on the Vision board that isn’t important lands here.</p>
        ${notToDo.length ? `<ul class="mini-list">${notToDo.map(g => `<li><button type="button" class="link" data-goal="${g.id}">${esc(g.title)}</button><span class="muted small">${esc(F.quadOf(g).action)}</span></li>`).join('')}</ul>`
          : '<p class="empty">Nothing on it yet.</p>'}
        <button type="button" class="btn small" id="sys-not-to-do">+ Not to do</button>
      </section>

      <p class="muted small sys-credit">Cards by @Millionairecodess · ideas from James Clear, <i>Atomic Habits</i> (2018).</p>`;

    el.querySelectorAll('[data-law]').forEach(b => {
      b.onclick = () => { law = law === b.dataset.law ? '' : b.dataset.law; WK.store('wk_systems_law', law); render(); };
    });
    el.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => WK.show(b.dataset.go); });
    el.querySelectorAll('[data-plan]').forEach(b => {
      b.onclick = async () => {
        b.disabled = true;
        try { await WK.addToPlan(b.dataset.plan); b.textContent = 'In today'; WK.toast('Added to today’s plan.'); }
        catch (err){ b.disabled = false; WK.toast('Not added: ' + err.message); }
      };
    });
    el.querySelectorAll('[data-goal]').forEach(b => { b.onclick = () => WK.openGoal(WK.goals().find(g => g.id === b.dataset.goal)); });
    $('sys-not-to-do').onclick = () => WK.openGoal(null, { category: 'Personal Development', important: false, urgent: false });
  }
})();
