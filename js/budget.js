/* Budget: the notebook page of October 2026, kept as four boxes the way
   it was drawn: urgent + necessary, urgent − necessary, −urgent +
   necessary, −urgent − necessary (Covey's Necessity, Deception, Personal
   Leadership and Waste). Monthly items are ticked off month by month;
   one-offs once. An empty budget can start from the notebook. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  let items = [];
  let missing = false;        // the table isn't there yet (sql/07-budget.sql)
  let month = WK.isoDate().slice(0, 7);
  const saveTimers = {};

  WK.section({ name: 'budget', label: 'Budget', load, render, reset(){ items = []; missing = false; } });
  // Read by Review.
  WK.budgetItems = () => items;

  // The boxes in the notebook's order: top row urgent, bottom row not;
  // left column necessary, right column not.
  const BOXES = [
    { key: 'do',       title: 'Urgent + Necessary' },
    { key: 'delegate', title: 'Urgent − Necessary' },
    { key: 'schedule', title: '−Urgent + Necessary' },
    { key: 'drop',     title: '−Urgent − Necessary' }
  ];

  // The page as written (October 2026). Blank amounts were left blank.
  const NOTEBOOK = {
    do: [['Electricity', 3000], ['Water', 3500], ['Wifi', 3000], ['Gym', 3500], ['Food', 6000], ['Fare / fuel', 16000],
         ['Debt: Fuliza', null, false], ['Debt: NCBA', null, false], ['Debt: M-Shwari', null, false], ['Debt: Hustler Fund', null, false]],
    delegate: [['Solar', null, false], ['Generator', null, false], ['Perfume', 2900, false]],
    schedule: [['NHIF', null], ['J-Care (Jubilee insurance)', null], ['KRA', null, false], ['Bicycle', null, false], ['Motorbike', null, false],
               ['Headphones (JBL / Bose)', null, false], ['Computer (mini PC / laptop)', null, false]],
    drop: [['DStv + Showmax', null], ['Netflix', null], ['UPS', null, false], ['Water dispenser', null, false],
           ['Washing machine + dishwasher', null, false], ['Fan', null, false]]
  };

  async function load(){
    const { data, error } = await WK.db.from('budget_items').select('*').order('sort').order('created_at');
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return; throw error; }
    missing = false;
    items = data || [];
  }

  const kes = n => 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  const isPaid = it => (it.paid || []).includes(it.monthly ? month : 'once');
  const monthName = m => new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const shift = (m, n) => WK.isoDate(new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1)).slice(0, 7);

  function totals(list){
    const monthly = list.filter(i => i.monthly), once = list.filter(i => !i.monthly && !isPaid(i));
    const sum = l => l.reduce((t, i) => t + (Number(i.amount) || 0), 0);
    return { monthly: sum(monthly), paid: sum(monthly.filter(isPaid)), once: sum(once), unpriced: list.filter(i => i.amount == null && !isPaid(i)).length };
  }

  function render(){
    const el = $('section-budget');
    if (missing){
      el.innerHTML = '<div class="section-head"><h1>Budget</h1></div><p class="empty">Run <code>sql/07-budget.sql</code> in Supabase to start your budget.</p>';
      return;
    }
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    const bills = totals(items.filter(i => i.quadrant === 'do'));
    const all = totals(items);
    el.innerHTML = `
      <div class="section-head">
        <h1>Budget</h1>
        <div class="toolbar budget-month">
          <button type="button" class="btn ghost small" id="bud-prev" aria-label="Previous month">‹</button>
          <b>${esc(monthName(month))}</b>
          <button type="button" class="btn ghost small" id="bud-next" aria-label="Next month">›</button>
        </div>
      </div>
      <div class="bud-sum">
        <div><span class="muted small">Urgent + necessary, a month</span><b>${kes(bills.monthly)}</b></div>
        <div><span class="muted small">Paid in ${esc(monthName(month).split(' ')[0])}</span><b>${kes(bills.paid)}</b></div>
        <div><span class="muted small">Still to pay</span><b class="${bills.monthly - bills.paid > 0 ? 'owe' : ''}">${kes(bills.monthly - bills.paid)}</b></div>
        <div><span class="muted small">Every box, a month</span><b>${kes(all.monthly)}</b></div>
        <div><span class="muted small">One-offs still to buy</span><b>${kes(all.once)}</b>${all.unpriced ? `<span class="muted small">${all.unpriced} not priced yet</span>` : ''}</div>
      </div>

      <div class="notebook">
        <div class="nb-top">
          <span class="nb-days">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => `<span${i === dow ? ' class="on"' : ''}>${d}</span>`).join('')}</span>
          <span class="nb-memo">Memo No. <u>${esc(month.replace('-', '/'))}</u><br>Date <u>${esc(today.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' }))}</u></span>
        </div>
        ${items.length ? `<div class="nb-grid">${BOXES.map(box).join('')}</div>`
          : `<div class="nb-empty"><p>An empty page.</p>
              <button type="button" class="btn primary" id="bud-seed">Copy in my notebook page</button>
              <button type="button" class="btn ghost" id="bud-blank">Start blank</button></div>`}
      </div>
      <p class="muted small bud-key">Tick a monthly item when it is paid this month; it comes back unticked next month. Tap <b>monthly</b> / <b>once</b> to switch. A one-off stays ticked once bought.</p>`;

    $('bud-prev').onclick = () => { month = shift(month, -1); render(); };
    $('bud-next').onclick = () => { month = shift(month, 1); render(); };
    if ($('bud-seed')) $('bud-seed').onclick = () => seed(true);
    if ($('bud-blank')) $('bud-blank').onclick = () => seed(false);
    bind(el);
  }

  function box(b){
    const q = F.QUADRANTS.find(x => x.key === b.key);
    const mine = items.filter(i => i.quadrant === b.key);
    const t = totals(mine);
    return `
      <section class="nb-box q-${b.key}" data-box="${b.key}">
        <h2>${esc(b.title)} <span class="muted small">${esc(q.name)}</span></h2>
        <ul class="nb-lines">${mine.map(i => `
          <li data-item="${i.id}" class="${isPaid(i) ? 'paid' : ''}">
            <input type="checkbox" ${isPaid(i) ? 'checked' : ''} aria-label="${i.monthly ? 'Paid this month' : 'Bought'}">
            <input class="nb-name" value="${esc(i.name)}" placeholder="Item" aria-label="Item">
            <span class="nb-dash">—</span>
            <input class="nb-amt" inputmode="numeric" value="${i.amount == null ? '' : esc(i.amount)}" placeholder="…" aria-label="Amount in KES">
            <button type="button" class="nb-kind" data-kind title="Tap to switch">${i.monthly ? 'monthly' : 'once'}</button>
            <button type="button" class="nb-x" aria-label="Remove">✕</button>
          </li>`).join('')}
        </ul>
        <div class="nb-foot">
          <button type="button" class="btn ghost small" data-add>+ Add</button>
          <span class="muted small">${t.monthly ? kes(t.monthly) + ' a month' : ''}${t.monthly && t.once ? ' · ' : ''}${t.once ? kes(t.once) + ' once' : ''}</span>
        </div>
      </section>`;
  }

  function bind(el){
    el.querySelectorAll('[data-box]').forEach(boxEl => {
      boxEl.querySelector('[data-add]').onclick = () => add(boxEl.dataset.box);
    });
    el.querySelectorAll('[data-item]').forEach(li => {
      const it = items.find(x => x.id === li.dataset.item);
      li.querySelector('input[type=checkbox]').onchange = e => {
        const key = it.monthly ? month : 'once';
        it.paid = (it.paid || []).filter(k => k !== key).concat(e.target.checked ? [key] : []);
        save(it, true);
      };
      const name = li.querySelector('.nb-name');
      name.oninput = () => { it.name = name.value; save(it); };
      name.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); add(it.quadrant); } };
      const amt = li.querySelector('.nb-amt');
      // Digits only (a text box: number boxes clip the last handwritten digit).
      amt.oninput = () => {
        const digits = amt.value.replace(/\D/g, '');
        if (digits !== amt.value) amt.value = digits;
        it.amount = digits === '' ? null : Number(digits);
        save(it);
      };
      amt.onchange = () => render();
      li.querySelector('[data-kind]').onclick = () => { it.monthly = !it.monthly; save(it, true); };
      li.querySelector('.nb-x').onclick = () => remove(it);
    });
  }

  // Typing saves after a pause; ticks and switches save and redraw at once.
  function save(it, now){
    clearTimeout(saveTimers[it.id]);
    const run = async () => {
      const { error } = await WK.db.from('budget_items')
        .update({ name: it.name, amount: it.amount, monthly: it.monthly, paid: it.paid, updated_at: new Date().toISOString() }).eq('id', it.id);
      if (error) WK.toast('Not saved: ' + error.message);
    };
    if (now){ run(); render(); } else saveTimers[it.id] = setTimeout(run, 600);
  }

  async function add(quadrant){
    const sort = items.filter(i => i.quadrant === quadrant).length + 1;
    const { data, error } = await WK.db.from('budget_items').insert([{ quadrant, name: '', monthly: quadrant === 'do', sort }]).select().single();
    if (error){ WK.toast('Not added: ' + error.message); return; }
    items.push(data);
    render();
    const inp = $('section-budget').querySelector(`[data-item="${data.id}"] .nb-name`);
    if (inp) inp.focus();
  }

  async function remove(it){
    const { error } = await WK.db.from('budget_items').delete().eq('id', it.id);
    if (error){ WK.toast('Not removed: ' + error.message); return; }
    items = items.filter(x => x !== it);
    render();
  }

  async function seed(fromNotebook){
    const rows = fromNotebook ? BOXES.flatMap(b => NOTEBOOK[b.key].map(([name, amount, monthly], i) =>
      ({ quadrant: b.key, name, amount, monthly: monthly !== false, sort: i + 1 }))) : [{ quadrant: 'do', name: '', monthly: true, sort: 1 }];
    const { data, error } = await WK.db.from('budget_items').insert(rows).select();
    if (error){ WK.toast('Not saved: ' + error.message); return; }
    items = data || [];
    items.sort((a, b) => a.sort - b.sort);
    render();
    if (fromNotebook) WK.toast('Your notebook page is in. Fill in the amounts that were blank.');
  }
})();
