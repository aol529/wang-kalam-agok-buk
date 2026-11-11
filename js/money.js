/* Money: what came in, what went out and where it sits (sql/13-money.sql).
   - Overview: the month in numbers, every account's balance, what was
     owed, spending by category against its limit, twelve months of
     spent vs received, the Budget's plan against what was really paid,
     and who got the most.
   - Transactions: the month's lines by day, filtered, or a search over
     every month. Tap one to change it. CSV of what's shown.
   - Accounts: M-Pesa, cash, bank, savings and loans. Correcting a
     balance writes an adjustment line (left out of the totals).
   - Categories: what money goes on and comes from, with monthly limits.
   A line can say which Budget item it pays (that item is ticked paid for
   the month) and which wish it bought (the wish moves to Got). The phone
   app suggests lines from M-Pesa messages; their codes keep a payment
   from being logged twice. */
(function(){
  const { $, esc } = WK;
  const BUCKET = 'receipts';

  let accounts = [], cats = [], balances = {}, monthly = [], txs = [], payees = new Map();
  let missing = false;
  let month = WK.isoDate().slice(0, 7);
  let view = WK.store('wk_money_view') || 'overview';
  const filt = { q: '', account: '', category: '', kind: '' };
  let found = null;          // a search over every month, or null
  let searchTimer;
  let showHidden = false;

  WK.section({ name: 'money', label: 'Money', icon: 'money', load, render,
    reset(){ accounts = []; cats = []; balances = {}; monthly = []; txs = []; payees = new Map(); missing = false; found = null; } });

  const VIEWS = [['overview', 'Overview'], ['list', 'Transactions'], ['accounts', 'Accounts'], ['categories', 'Categories']];
  const KINDS = { mpesa: 'M-Pesa', cash: 'Cash', bank: 'Bank', card: 'Card', savings: 'Savings', loan: 'Loan' };
  const isMissing = e => e && (e.code === 'PGRST205' || e.code === '42P01');

  // ---------------- Numbers and dates ----------------
  const num = n => Number(n) || 0;
  const kes = n => 'KES ' + Math.round(num(n)).toLocaleString('en-KE');
  const kesShort = n => { n = Math.round(num(n)); const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e4 ? Math.round(n / 1e3) + 'k' : a >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n); };
  const shift = (m, n) => WK.isoDate(new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1)).slice(0, 7);
  const monthName = (m, opt) => new Date(m + '-01T00:00:00').toLocaleDateString(undefined, opt || { month: 'long', year: 'numeric' });
  // Months run on Nairobi time (UTC+3, no summer time), like the money_monthly view.
  const monthStart = m => new Date(m + '-01T00:00:00+03:00').toISOString();
  const localDay = iso => WK.isoDate(new Date(iso));
  const localInput = d => { const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const daysIn = m => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
  // Amounts: digits and one decimal point (a text box: number boxes clip handwriting).
  const cleanAmount = s => { s = String(s).replace(/[^\d.]/g, ''); const i = s.indexOf('.'); return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2); };

  const acc = id => accounts.find(a => a.id === id);
  const cat = id => cats.find(c => c.id === id);
  const accName = id => { const a = acc(id); return a ? a.name : '—'; };
  const catLabel = c => c ? `${c.icon ? c.icon + ' ' : ''}${c.name}` : 'Uncategorised';
  const liveAccounts = () => accounts.filter(a => !a.archived);

  // ---------------- Loading ----------------
  async function load(){
    const [a, c] = await Promise.all([
      WK.db.from('money_accounts').select('*').order('sort').order('created_at'),
      WK.db.from('money_categories').select('*').order('sort').order('created_at')
    ]);
    if (a.error){ missing = isMissing(a.error); if (missing) return; throw a.error; }
    if (c.error) throw c.error;
    missing = false;
    accounts = a.data || []; cats = c.data || [];
    if (!accounts.length) return;
    await Promise.all([loadBalances(), loadMonthly(), loadMonth(), loadPayees()]);
  }
  async function loadBalances(){
    const { data, error } = await WK.db.from('money_balances').select('*');
    if (error) throw error;
    balances = {};
    (data || []).forEach(b => { balances[b.account_id] = b; });
  }
  async function loadMonthly(){
    const all = [];
    for (let from = 0; ; from += 1000){
      const { data, error } = await WK.db.from('money_monthly').select('*').range(from, from + 999);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    monthly = all;
  }
  async function loadMonth(){
    const all = [];
    for (let from = 0; ; from += 1000){
      const { data, error } = await WK.db.from('money_tx').select('*')
        .gte('occurred_at', monthStart(month)).lt('occurred_at', monthStart(shift(month, 1)))
        .order('occurred_at', { ascending: false }).range(from, from + 999);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    txs = all;
  }
  // Who was paid before, and on what: fills the payee list and guesses
  // the category when the same payee comes again.
  async function loadPayees(){
    const { data } = await WK.db.from('money_tx').select('payee, category_id, account_id, kind').neq('payee', '').order('occurred_at', { ascending: false }).limit(800);
    payees = new Map();
    (data || []).forEach(t => { const k = t.payee.trim().toLowerCase(); if (!payees.has(k)) payees.set(k, t); });
  }
  async function reloadAll(){
    try { await Promise.all([loadBalances(), loadMonthly(), loadMonth()]); } catch (e){ WK.toast('Could not load: ' + e.message); }
    if (found) await search();
    render();
    if (WK.budgetMoneyChanged) WK.budgetMoneyChanged();
  }

  // ---------------- Totals ----------------
  // A month from the money_monthly view: received, spent (with every
  // transaction cost) and spending per category. Adjustments are left out.
  function stats(m){
    const rows = monthly.filter(r => r.month === m && r.source !== 'adjust');
    const s = { inn: 0, out: 0, fees: 0, byCat: new Map(), inByCat: new Map(), n: 0 };
    rows.forEach(r => {
      s.n += Number(r.n);
      s.fees += num(r.fees);
      if (r.kind === 'income'){ s.inn += num(r.total); s.inByCat.set(r.category_id, (s.inByCat.get(r.category_id) || 0) + num(r.total)); }
      if (r.kind === 'expense'){ s.out += num(r.total); s.byCat.set(r.category_id, (s.byCat.get(r.category_id) || 0) + num(r.total)); }
    });
    s.spent = s.out + s.fees;
    return s;
  }
  const balanceOf = a => num((balances[a.id] || {}).balance ?? a.opening);
  function worth(){
    let has = 0, owed = 0;
    liveAccounts().forEach(a => { const b = balanceOf(a); if (b < 0) owed -= b; else has += b; });
    return { has, owed, net: has - owed };
  }

  // ---------------- Drawing ----------------
  function render(){
    const el = $('section-money');
    if (!el) return;
    if (missing){
      el.innerHTML = '<div class="section-head"><h1>Money</h1></div><p class="empty">Run <code>sql/13-money.sql</code> in Supabase to start tracking money.</p>';
      return;
    }
    if (!accounts.length){ el.innerHTML = setupHtml(); bindSetup(); return; }
    el.innerHTML = `
      <div class="section-head">
        <h1>Money</h1>
        <div class="toolbar budget-month">
          <button type="button" class="btn ghost small" id="mon-prev" aria-label="Previous month">‹</button>
          <b>${esc(monthName(month))}</b>
          <button type="button" class="btn ghost small" id="mon-next" aria-label="Next month">›</button>
          <button type="button" class="btn primary" id="mon-add">+ Add</button>
        </div>
      </div>
      <div class="subtabs money-tabs" role="tablist">${VIEWS.map(([k, l]) => `<button type="button" role="tab" data-view="${k}" aria-selected="${k === view}" aria-current="${k === view}">${l}</button>`).join('')}</div>
      <div id="money-body">${view === 'list' ? listHtml() : view === 'accounts' ? accountsHtml() : view === 'categories' ? categoriesHtml() : overviewHtml()}</div>`;
    $('mon-prev').onclick = () => goMonth(-1);
    $('mon-next').onclick = () => goMonth(1);
    $('mon-add').onclick = () => openTx(null);
    el.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => { view = b.dataset.view; WK.store('wk_money_view', view); render(); }; });
    bindBody(el);
  }

  async function goMonth(n){
    month = shift(month, n);
    found = null; filt.q = '';
    try { await loadMonth(); } catch (e){ WK.toast('Could not load: ' + e.message); }
    render();
  }

  // ---- Overview ----
  function overviewHtml(){
    const s = stats(month), prev = stats(shift(month, -1));
    const w = worth();
    const now = WK.isoDate().slice(0, 7);
    const day = month === now ? new Date().getDate() : daysIn(month);
    const pace = month === now && day < daysIn(month) ? s.spent / day * daysIn(month) : null;
    const change = prev.spent ? Math.round((s.spent - prev.spent) / prev.spent * 100) : null;
    const left = s.inn - s.spent;
    return `
      <div class="bud-sum money-sum">
        <div><span class="muted small">Received</span><b class="m-in">${kes(s.inn)}</b></div>
        <div><span class="muted small">Spent</span><b>${kes(s.spent)}</b>${change != null ? `<span class="muted small">${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change)}% on ${esc(monthName(shift(month, -1), { month: 'long' }))}</span>` : ''}</div>
        <div><span class="muted small">${left >= 0 ? 'Left over' : 'Overspent'}</span><b class="${left < 0 ? 'owe' : ''}">${kes(Math.abs(left))}</b>${s.inn ? `<span class="muted small">${Math.round(left / s.inn * 100)}% of what came in</span>` : ''}</div>
        <div><span class="muted small">Transaction costs</span><b>${kes(s.fees)}</b></div>
        ${pace != null ? `<div><span class="muted small">At this pace, by month end</span><b>${kes(pace)}</b><span class="muted small">${kes(s.spent / day)} a day</span></div>` : ''}
        <div><span class="muted small">Net worth</span><b class="${w.net < 0 ? 'owe' : ''}">${kes(w.net)}</b>${w.owed ? `<span class="muted small">${kes(w.has)} held · ${kes(w.owed)} owed</span>` : ''}</div>
      </div>

      <div class="money-grid">
        <section class="panel">
          <h2>Accounts <button type="button" class="link small" data-view-go="accounts">All</button></h2>
          <ul class="money-accounts">${liveAccounts().map(a => accountLine(a)).join('')}</ul>
        </section>

        <section class="panel money-wide">
          <h2>Spending by category</h2>
          ${categoryBars(s)}
        </section>

        <section class="panel money-wide">
          <h2>Twelve months</h2>
          ${trendChart()}
        </section>

        ${budgetPanel()}
        ${payeesPanel()}
        ${biggestPanel()}
      </div>`;
  }

  function accountLine(a, extra){
    const b = balanceOf(a), loan = a.kind === 'loan';
    return `<li><button type="button" class="money-acc" data-acc="${a.id}">
      <span><b>${esc(a.name)}</b><span class="muted small">${esc([KINDS[a.kind] !== a.name ? KINDS[a.kind] : '', loan && a.credit_limit ? 'limit ' + kes(a.credit_limit) : ''].concat(extra || []).filter(Boolean).join(' · '))}</span></span>
      <b class="${b < 0 ? 'owe' : ''}">${loan ? (b < 0 ? 'owes ' + kes(-b) : b > 0 ? kes(b) : 'clear') : kes(b)}</b>
    </button></li>`;
  }

  // One bar per category: what was spent, against the limit if it has one.
  function categoryBars(s){
    const lines = cats.filter(c => c.kind === 'expense')
      .map(c => ({ c, v: s.byCat.get(c.id) || 0, lim: c.monthly_limit == null ? null : num(c.monthly_limit) }))
      .filter(x => x.v || (x.lim && !x.c.archived));
    if (s.byCat.get(null)) lines.push({ c: null, v: s.byCat.get(null), lim: null });
    if (s.fees) lines.push({ c: { name: 'Transaction costs', icon: '🧾' }, v: s.fees, lim: null, fees: true });
    if (!lines.length) return '<p class="empty">Nothing spent this month yet.</p>';
    lines.sort((a, b) => b.v - a.v);
    const max = Math.max(...lines.map(x => Math.max(x.v, x.lim || 0)), 1);
    return `<ul class="m-bars">${lines.map(x => {
      const over = x.lim != null && x.v > x.lim;
      const tip = `${catLabel(x.c)}: ${kes(x.v)}${x.lim != null ? ` of ${kes(x.lim)} (${Math.round(x.v / (x.lim || 1) * 100)}%)` : ''}`;
      return `<li${over ? ' class="over"' : ''} title="${esc(tip)}"${x.c && x.c.id ? ` data-cat="${x.c.id}"` : x.c === null ? ' data-cat="none"' : ''}>
        <span class="m-bar-name">${esc(catLabel(x.c))}</span>
        <span class="m-bar-track"><i style="width:${(x.v / max * 100).toFixed(1)}%"></i>${x.lim != null ? `<em style="left:${(x.lim / max * 100).toFixed(1)}%" aria-hidden="true"></em>` : ''}</span>
        <span class="m-bar-val">${kes(x.v)}${x.lim != null ? `<span class="muted small"> / ${kesShort(x.lim)}</span>` : ''}${over ? ' <span class="m-over">over</span>' : ''}</span>
      </li>`;
    }).join('')}</ul>`;
  }

  // Spent and received side by side, one pair of columns a month.
  function trendChart(){
    const ms = Array.from({ length: 12 }, (_, i) => shift(month, i - 11));
    const data = ms.map(m => { const s = stats(m); return { m, inn: s.inn, out: s.spent }; });
    const max = Math.max(...data.map(d => Math.max(d.inn, d.out)), 1);
    if (!data.some(d => d.inn || d.out)) return '<p class="empty">The chart fills in as months are logged.</p>';
    const W = 640, H = 200, pad = { l: 44, r: 8, t: 10, b: 24 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, step = iw / 12, bw = Math.min(14, step / 2 - 3);
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; })();
    const y = v => pad.t + ih - v / nice * ih;
    const ticks = [0, nice / 2, nice];
    // A column with a rounded top, square on the baseline.
    const col = (x, v, cls) => { if (!v) return ''; const top = y(v), h = pad.t + ih - top, r = Math.min(3, h, bw / 2);
      return `<path class="${cls}" d="M${x},${pad.t + ih}V${top + r}q0,-${r} ${r},-${r}h${bw - 2 * r}q${r},0 ${r},${r}V${pad.t + ih}Z"/>`; };
    return `
      <div class="m-legend"><span><i class="sw m-sw-out"></i>Spent</span><span><i class="sw m-sw-in"></i>Received</span></div>
      <svg class="m-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spent and received, the last twelve months">
        ${ticks.map(t => `<line class="m-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="m-axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${kesShort(t)}</text>`).join('')}
        ${data.map((d, i) => { const x0 = pad.l + i * step + step / 2;
          return `<g class="m-col${d.m === month ? ' is-now' : ''}" data-month="${d.m}">
            <rect class="m-hit" x="${pad.l + i * step}" y="${pad.t}" width="${step}" height="${ih + pad.b}"/>
            ${col(x0 - bw - 1, d.out, 'm-out')}${col(x0 + 1, d.inn, 'm-in')}
            <text class="m-axis${d.m === month ? ' on' : ''}" x="${x0}" y="${H - 6}" text-anchor="middle">${esc(monthName(d.m, { month: 'short' }))}</text>
            <title>${esc(monthName(d.m))}: spent ${kes(d.out)}, received ${kes(d.inn)}</title>
          </g>`; }).join('')}
      </svg>
      <details class="m-table"><summary class="muted small">As a table</summary>
        <table><thead><tr><th>Month</th><th>Spent</th><th>Received</th><th>Left</th></tr></thead>
        <tbody>${data.slice().reverse().map(d => `<tr><td>${esc(monthName(d.m))}</td><td>${kes(d.out)}</td><td>${kes(d.inn)}</td><td>${kes(d.inn - d.out)}</td></tr>`).join('')}</tbody></table>
      </details>`;
  }

  // The Budget's plan against what was really paid this month.
  function budgetPanel(){
    const items = WK.budgetItems ? WK.budgetItems() : [];
    const spentOn = new Map();
    txs.forEach(t => { if (t.budget_item_id && t.kind !== 'income') spentOn.set(t.budget_item_id, (spentOn.get(t.budget_item_id) || 0) + num(t.amount) + num(t.fee)); });
    const lines = items.filter(i => i.monthly && i.quadrant === 'do' || spentOn.has(i.id));
    if (!lines.length) return '';
    const plan = lines.reduce((a, i) => a + (i.monthly ? num(i.amount) : 0), 0);
    const real = [...spentOn.values()].reduce((a, v) => a + v, 0);
    return `<section class="panel">
      <h2>Budget vs real <button type="button" class="link small" data-go="budget">Budget</button></h2>
      <ul class="mini-list m-plan">${lines.map(i => { const v = spentOn.get(i.id) || 0, p = num(i.amount), paid = (i.paid || []).includes(i.monthly ? month : 'once');
        return `<li><span>${paid ? '✓ ' : ''}${esc(i.name || 'Item')}</span><span class="small ${p && v > p ? 'review-bad' : v ? '' : 'muted'}">${v ? kes(v) : '—'}${p ? ` / ${kesShort(p)}` : ''}</span></li>`; }).join('')}</ul>
      <p class="muted small">Planned ${kes(plan)} a month · paid through Money ${kes(real)}. Pick the budget item when adding a line.</p>
    </section>`;
  }

  function payeesPanel(){
    const by = new Map();
    txs.filter(t => t.kind === 'expense' && t.source !== 'adjust').forEach(t => { const k = (t.payee || '').trim() || '(no payee)'; by.set(k, (by.get(k) || 0) + num(t.amount)); });
    const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!top.length) return '';
    return `<section class="panel"><h2>Paid the most</h2>
      <ul class="mini-list">${top.map(([p, v]) => `<li><button type="button" class="link" data-payee="${esc(p)}">${esc(p)}</button><span class="small">${kes(v)}</span></li>`).join('')}</ul></section>`;
  }

  function biggestPanel(){
    const big = txs.filter(t => t.kind === 'expense' && t.source !== 'adjust').sort((a, b) => num(b.amount) - num(a.amount)).slice(0, 5);
    if (!big.length) return '';
    return `<section class="panel"><h2>Biggest this month</h2><ul class="m-list m-list-plain">${big.map(txLine).join('')}</ul></section>`;
  }

  // ---- Transactions ----
  function shownTx(){
    const list = found || txs;
    return list.filter(t =>
      (!filt.account || t.account_id === filt.account || t.to_account_id === filt.account) &&
      (!filt.category || (filt.category === 'none' ? !t.category_id && t.kind !== 'transfer' : t.category_id === filt.category)) &&
      (!filt.kind || t.kind === filt.kind));
  }
  function listHtml(){
    const list = shownTx();
    const days = [];
    list.forEach(t => { const d = localDay(t.occurred_at); let g = days[days.length - 1]; if (!g || g.d !== d){ g = { d, items: [] }; days.push(g); } g.items.push(t); });
    const out = list.filter(t => t.kind === 'expense' && t.source !== 'adjust').reduce((a, t) => a + num(t.amount), 0) + list.filter(t => t.source !== 'adjust').reduce((a, t) => a + num(t.fee), 0);
    const inn = list.filter(t => t.kind === 'income' && t.source !== 'adjust').reduce((a, t) => a + num(t.amount) - num(t.fee), 0);
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
    return `
      <div class="m-filters">
        <input type="search" id="mf-q" value="${esc(filt.q)}" placeholder="Search every month: payee, note, M-Pesa code" aria-label="Search">
        <select id="mf-account" aria-label="Account">${opt('', 'All accounts', filt.account)}${accounts.map(a => opt(a.id, a.name, filt.account)).join('')}</select>
        <select id="mf-category" aria-label="Category">${opt('', 'All categories', filt.category)}${cats.map(c => opt(c.id, catLabel(c), filt.category)).join('')}${opt('none', 'Uncategorised', filt.category)}</select>
        <select id="mf-kind" aria-label="Kind">${opt('', 'Everything', filt.kind)}${opt('expense', 'Spent', filt.kind)}${opt('income', 'Received', filt.kind)}${opt('transfer', 'Moved', filt.kind)}</select>
        <button type="button" class="btn ghost small" id="mf-csv">CSV</button>
      </div>
      <p class="muted small">${found ? `${list.length} found in every month${found.length >= 300 ? ' (the newest 300)' : ''}` : `${list.length} line${list.length === 1 ? '' : 's'} in ${esc(monthName(month, { month: 'long' }))}`} · out ${kes(out)} · in ${kes(inn)}</p>
      ${days.length ? days.map(g => {
        const dayOut = g.items.filter(t => t.kind === 'expense').reduce((a, t) => a + num(t.amount) + num(t.fee), 0);
        return `<div class="m-day"><h3><span>${esc(WK.fmtDate(g.d, { weekday: 'short', day: 'numeric', month: 'short', year: found ? 'numeric' : undefined }))}</span>${dayOut ? `<span class="muted small">${kes(dayOut)} out</span>` : ''}</h3>
          <ul class="m-list">${g.items.map(txLine).join('')}</ul></div>`; }).join('')
      : `<p class="empty">${found || filt.account || filt.category || filt.kind ? 'Nothing matches.' : 'Nothing logged this month yet. “+ Add” logs the first line.'}</p>`}`;
  }

  function txLine(t){
    const c = cat(t.category_id);
    const time = new Date(t.occurred_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const title = t.kind === 'transfer' ? `${accName(t.account_id)} → ${accName(t.to_account_id)}` : (t.payee || catLabel(c));
    const sub = [t.kind === 'transfer' ? (t.payee || 'Moved') : t.payee ? catLabel(c) : '', t.kind !== 'transfer' ? accName(t.account_id) : '', time, t.note].filter(Boolean).join(' · ');
    const sign = t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : '';
    return `<li><button type="button" class="m-tx k-${t.kind}${t.source === 'adjust' ? ' is-adjust' : ''}" data-tx="${t.id}">
      <span class="m-ico" aria-hidden="true">${t.kind === 'transfer' ? '⇄' : c && c.icon ? esc(c.icon) : t.kind === 'income' ? '＋' : '•'}</span>
      <span class="m-what"><b>${esc(title)}</b><span class="muted small">${esc(sub)}</span></span>
      <span class="m-amt"><b>${sign}${kes(t.amount)}</b>${num(t.fee) ? `<span class="muted small">+${kes(t.fee)} cost</span>` : ''}
        ${t.source === 'sms' ? '<span class="m-tag" title="From an M-Pesa message">M-Pesa</span>' : ''}${t.receipt_path ? '<span class="m-tag" title="Has a receipt">📎</span>' : ''}${t.source === 'adjust' ? '<span class="m-tag">adjustment</span>' : ''}</span>
    </button></li>`;
  }

  async function search(){
    const q = filt.q.trim().replace(/[,()*%\\]/g, ' ').trim();
    if (!q){ found = null; return; }
    const like = `%${q}%`;
    const { data, error } = await WK.db.from('money_tx').select('*')
      .or(`payee.ilike.${like},note.ilike.${like},ref.ilike.${like}`)
      .order('occurred_at', { ascending: false }).limit(300);
    if (error){ WK.toast('Search failed: ' + error.message); return; }
    found = data || [];
  }

  function csv(){
    const rows = shownTx();
    const cell = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
    const head = ['date', 'time', 'kind', 'amount', 'cost', 'account', 'to account', 'category', 'payee', 'note', 'm-pesa code', 'source'];
    const lines = rows.map(t => { const d = new Date(t.occurred_at);
      return [localDay(t.occurred_at), d.toTimeString().slice(0, 5), t.kind, t.amount, t.fee, accName(t.account_id), t.to_account_id ? accName(t.to_account_id) : '', t.kind === 'transfer' ? '' : catLabel(cat(t.category_id)), t.payee, t.note, t.ref, t.source].map(cell).join(','); });
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `money-${found ? 'search' : month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---- Accounts ----
  function accountsHtml(){
    const w = worth();
    const shown = accounts.filter(a => showHidden || !a.archived);
    const hidden = accounts.filter(a => a.archived).length;
    return `
      <div class="bud-sum">
        <div><span class="muted small">Held</span><b>${kes(w.has)}</b></div>
        <div><span class="muted small">Owed</span><b class="${w.owed ? 'owe' : ''}">${kes(w.owed)}</b></div>
        <div><span class="muted small">Net worth</span><b class="${w.net < 0 ? 'owe' : ''}">${kes(w.net)}</b></div>
      </div>
      <ul class="money-accounts money-accounts-big">${shown.map(a => {
        const last = (balances[a.id] || {}).last_at;
        return accountLine(a, [a.archived ? 'hidden' : '', last ? 'last ' + WK.fmtDate(localDay(last), { day: 'numeric', month: 'short' }) : '']);
      }).join('')}</ul>
      <div class="toolbar"><button type="button" class="btn" id="acc-add">+ Account</button>
        ${hidden ? `<button type="button" class="btn ghost small" id="acc-hidden">${showHidden ? 'Hide' : 'Show'} ${hidden} hidden</button>` : ''}</div>
      <p class="muted small bud-key">A loan (Fuliza, M-Shwari, Hustler Fund) shows what is owed. Borrowing is money moved from the loan into M-Pesa; paying it back is money moved from M-Pesa into the loan. Tap an account to change it or correct its balance.</p>`;
  }

  // ---- Categories ----
  function categoriesHtml(){
    const s = stats(month);
    const box = kind => {
      const list = cats.filter(c => c.kind === kind && (showHidden || !c.archived));
      return `<section class="panel${kind === 'expense' ? ' money-wide' : ''}">
        <h2>${kind === 'expense' ? 'Spending' : 'Income'}</h2>
        <ul class="m-cats">${list.map(c => `
          <li data-catrow="${c.id}" class="${c.archived ? 'is-hidden' : ''}">
            <input class="m-cat-icon" value="${esc(c.icon)}" maxlength="4" aria-label="Icon" placeholder="•">
            <input class="m-cat-name" value="${esc(c.name)}" placeholder="Category" aria-label="Name">
            ${kind === 'expense' ? `<input class="m-cat-limit" inputmode="numeric" value="${c.monthly_limit == null ? '' : esc(c.monthly_limit)}" placeholder="no limit" aria-label="Monthly limit in KES" title="Monthly limit (KES)">` : ''}
            <span class="muted small m-cat-sum">${kes((kind === 'expense' ? s.byCat : s.inByCat).get(c.id) || 0)}</span>
            <button type="button" class="nb-x" data-cat-hide title="${c.archived ? 'Show again' : 'Hide (old lines keep it)'}" aria-label="${c.archived ? 'Show again' : 'Hide'}">${c.archived ? '↺' : '✕'}</button>
          </li>`).join('')}</ul>
        <button type="button" class="btn ghost small" data-cat-add="${kind}">+ Category</button>
      </section>`;
    };
    const hidden = cats.filter(c => c.archived).length;
    return `<div class="money-grid">${box('expense')}${box('income')}</div>
      <p class="muted small bud-key">The limit is KES a month; Overview marks a category that goes over. The total beside each is ${esc(monthName(month, { month: 'long' }))}.
      ${hidden ? `<button type="button" class="link small" id="cat-hidden">${showHidden ? 'Hide' : 'Show'} ${hidden} hidden</button>` : ''}</p>`;
  }

  function bindBody(el){
    el.querySelectorAll('[data-tx]').forEach(b => { b.onclick = () => openTx((found || []).concat(txs).find(t => t.id === b.dataset.tx)); });
    el.querySelectorAll('[data-acc]').forEach(b => { b.onclick = () => openAccount(acc(b.dataset.acc)); });
    el.querySelectorAll('[data-view-go]').forEach(b => { b.onclick = () => { view = b.dataset.viewGo; WK.store('wk_money_view', view); render(); }; });
    el.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => WK.show(b.dataset.go); });
    el.querySelectorAll('[data-cat]').forEach(li => { li.style.cursor = 'pointer'; li.onclick = () => { filt.category = li.dataset.cat; view = 'list'; render(); }; });
    el.querySelectorAll('[data-payee]').forEach(b => { b.onclick = async () => { filt.q = b.dataset.payee; view = 'list'; await search(); render(); }; });
    el.querySelectorAll('[data-month]').forEach(g => { g.onclick = async () => { if (g.dataset.month === month) return; month = g.dataset.month; await loadMonth(); render(); }; });
    if ($('mf-q')){
      $('mf-q').oninput = () => { filt.q = $('mf-q').value; clearTimeout(searchTimer); searchTimer = setTimeout(async () => { await search(); render(); const q = $('mf-q'); if (q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350); };
      ['account', 'category', 'kind'].forEach(k => { $('mf-' + k).onchange = e => { filt[k] = e.target.value; render(); }; });
      $('mf-csv').onclick = csv;
    }
    if ($('acc-add')) $('acc-add').onclick = () => openAccount(null);
    if ($('acc-hidden')) $('acc-hidden').onclick = () => { showHidden = !showHidden; render(); };
    if ($('cat-hidden')) $('cat-hidden').onclick = () => { showHidden = !showHidden; render(); };
    bindCategories(el);
  }

  // Categories save as they're typed, like the Budget page.
  const catTimers = {};
  function bindCategories(el){
    el.querySelectorAll('[data-catrow]').forEach(li => {
      const c = cat(li.dataset.catrow);
      const save = (now) => {
        clearTimeout(catTimers[c.id]);
        const run = async () => {
          const { error } = await WK.db.from('money_categories').update({ name: c.name, icon: c.icon, monthly_limit: c.monthly_limit, archived: c.archived, updated_at: new Date().toISOString() }).eq('id', c.id);
          if (error) WK.toast('Not saved: ' + error.message);
        };
        if (now){ run(); render(); } else catTimers[c.id] = setTimeout(run, 600);
      };
      li.querySelector('.m-cat-icon').oninput = e => { c.icon = e.target.value.trim(); save(); };
      li.querySelector('.m-cat-name').oninput = e => { c.name = e.target.value; save(); };
      const lim = li.querySelector('.m-cat-limit');
      if (lim){ lim.oninput = () => { const d = lim.value.replace(/\D/g, ''); if (d !== lim.value) lim.value = d; c.monthly_limit = d === '' ? null : Number(d); save(); }; }
      li.querySelector('[data-cat-hide]').onclick = () => { c.archived = !c.archived; save(true); };
    });
    el.querySelectorAll('[data-cat-add]').forEach(b => { b.onclick = async () => {
      const kind = b.dataset.catAdd;
      const sort = cats.filter(c => c.kind === kind).reduce((m, c) => Math.max(m, c.sort || 0), 0) + 1;
      const { data, error } = await WK.db.from('money_categories').insert([{ kind, name: '', sort }]).select().single();
      if (error){ WK.toast('Not added: ' + error.message); return; }
      cats.push(data); render();
      const inp = $('section-money').querySelector(`[data-catrow="${data.id}"] .m-cat-name`);
      if (inp) inp.focus();
    }; });
  }

  // ---------------- First time ----------------
  const START_ACCOUNTS = [
    ['M-Pesa', 'mpesa'], ['Cash', 'cash'], ['M-Shwari savings', 'savings'],
    ['Fuliza', 'loan'], ['M-Shwari loan', 'loan'], ['NCBA loan', 'loan'], ['Hustler Fund', 'loan']
  ];
  const START_CATS = {
    expense: [['🍲', 'Food & groceries'], ['☕', 'Eating out'], ['⛽', 'Fare & fuel'], ['💡', 'Bills: power, water, wifi'], ['🏠', 'Rent & home'],
      ['📱', 'Airtime & data'], ['🏋️', 'Gym & health'], ['🛡️', 'Insurance, NHIF & KRA'], ['🛍️', 'Shopping'], ['🎬', 'Subscriptions & fun'],
      ['👪', 'Family & gifts'], ['🙏', 'Giving & church'], ['🎓', 'Books & learning'], ['🧴', 'Personal care'], ['🔧', 'Repairs'],
      ['💳', 'Loan interest & charges'], ['📦', 'Other']],
    income: [['💼', 'Salary'], ['🧰', 'Business & side work'], ['🎁', 'Gifts received'], ['↩️', 'Refunds'], ['➕', 'Other income']]
  };
  function setupHtml(){
    return `<div class="section-head"><h1>Money</h1></div>
      <div class="panel money-setup">
        <h2>Where does the money go?</h2>
        <p>Log what comes in and what goes out, see it by category and month, and keep the Budget honest. The phone app can read M-Pesa messages and suggest each line for you to confirm.</p>
        <p class="muted small">To start: M-Pesa, Cash, M-Shwari savings, and the loans from your Budget page (Fuliza, M-Shwari, NCBA, Hustler Fund), with everyday categories. All of it can be renamed, hidden or added to.</p>
        <div class="toolbar"><button type="button" class="btn primary" id="money-seed">Set it up</button>
        <button type="button" class="btn ghost" id="money-blank">Just M-Pesa and Cash</button></div>
      </div>`;
  }
  function bindSetup(){
    $('money-seed').onclick = () => seed(true);
    $('money-blank').onclick = () => seed(false);
  }
  async function seed(full){
    const accs = (full ? START_ACCOUNTS : START_ACCOUNTS.slice(0, 2)).map(([name, kind], i) => ({ name, kind, sort: i + 1 }));
    const cs = Object.entries(START_CATS).flatMap(([kind, list]) => list.map(([icon, name], i) => ({ kind, icon, name, sort: i + 1 })));
    const a = await WK.db.from('money_accounts').insert(accs).select();
    if (a.error){ WK.toast('Not set up: ' + a.error.message); return; }
    const c = cats.length ? { data: [] } : await WK.db.from('money_categories').insert(cs).select();
    if (c.error){ WK.toast('Categories not added: ' + c.error.message); }
    accounts = a.data || []; cats = cats.concat(c.data || []);
    accounts.sort((x, y) => x.sort - y.sort); cats.sort((x, y) => x.sort - y.sort);
    await reloadAll();
    view = 'accounts';
    render();
    WK.toast('Set up. Tap each account to put in its balance today.');
  }

  // ---------------- The line editor ----------------
  const dlg = document.createElement('dialog');
  dlg.className = 'wide-dialog money-dialog';
  dlg.innerHTML = `<form method="dialog" id="tx-form" class="money-form">
    <h2 id="tx-title">Add a line</h2>
    <div class="seg" role="radiogroup" aria-label="Kind">
      <label><input type="radio" name="tx-kind" value="expense" checked><span>Spent</span></label>
      <label><input type="radio" name="tx-kind" value="income"><span>Received</span></label>
      <label><input type="radio" name="tx-kind" value="transfer"><span>Moved</span></label>
    </div>
    <div class="row2">
      <label>Amount (KES)<input id="tx-amount" inputmode="decimal" autocomplete="off" required placeholder="0"></label>
      <label>Transaction cost<input id="tx-fee" inputmode="decimal" autocomplete="off" placeholder="0"></label>
    </div>
    <div class="row2">
      <label><span id="tx-acc-label">From</span><select id="tx-account"></select></label>
      <label data-only="transfer">To<select id="tx-to"></select></label>
      <label data-not="transfer">Category<select id="tx-category"></select></label>
    </div>
    <div class="row2">
      <label><span id="tx-payee-label">Paid to</span><input id="tx-payee" list="tx-payees" autocomplete="off" placeholder="Shop, person, paybill…"></label>
      <label>When<input id="tx-when" type="datetime-local" required></label>
    </div>
    <datalist id="tx-payees"></datalist>
    <label>Note<input id="tx-note" maxlength="300" placeholder="What it was for"></label>
    <div class="row2" data-only="expense">
      <label>Pays a budget item<select id="tx-budget"></select></label>
      <label>Buys a wish<select id="tx-wish"></select></label>
    </div>
    <div class="row2">
      <label>M-Pesa code<input id="tx-ref" maxlength="20" autocomplete="off" placeholder="e.g. TKB12AB3CD"></label>
      <label>Receipt<span class="tx-receipt"><input id="tx-file" type="file" accept="image/*,application/pdf"><a id="tx-receipt-link" target="_blank" rel="noopener" hidden>Open</a><button type="button" class="link small" id="tx-receipt-rm" hidden>Remove</button></span></label>
    </div>
    <p class="error" id="tx-error"></p>
    <div class="dialog-actions">
      <button type="button" class="btn ghost danger" id="tx-delete" hidden>Delete</button>
      <span class="spacer"></span>
      <button type="button" class="btn ghost" id="tx-cancel">Cancel</button>
      <button type="submit" class="btn primary" id="tx-save">Save</button>
    </div>
  </form>`;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(dlg));

  let editing = null, receiptGone = false;
  const kindNow = () => dlg.querySelector('input[name=tx-kind]:checked').value;
  const opts = (list, cur, empty) => (empty != null ? `<option value="">${esc(empty)}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');

  function fillPickers(t){
    const k = kindNow();
    const live = accounts.filter(a => !a.archived || a.id === t.account_id || a.id === t.to_account_id);
    $('tx-account').innerHTML = opts(live.map(a => [a.id, a.name]), t.account_id || (liveAccounts()[0] || {}).id);
    $('tx-to').innerHTML = opts(live.map(a => [a.id, a.name]), t.to_account_id || (live.find(a => a.id !== $('tx-account').value) || {}).id);
    const cs = cats.filter(c => c.kind === (k === 'income' ? 'income' : 'expense') && (!c.archived || c.id === t.category_id));
    $('tx-category').innerHTML = opts(cs.map(c => [c.id, catLabel(c)]), t.category_id, 'Uncategorised');
    const items = (WK.budgetItems ? WK.budgetItems() : []).filter(i => i.monthly || !(i.paid || []).includes('once') || i.id === t.budget_item_id);
    $('tx-budget').innerHTML = opts(items.map(i => [i.id, `${i.name || 'Item'}${i.amount != null ? ' — ' + kesShort(i.amount) : ''}`]), t.budget_item_id, '—');
    const wishes = (WK.wishItems ? WK.wishItems() : []).filter(w => !w.got || w.id === t.wishlist_item_id);
    $('tx-wish').innerHTML = opts(wishes.map(w => [w.id, `${w.name || 'Wish'}${w.price != null ? ' — ' + kesShort(w.price) : ''}`]), t.wishlist_item_id, '—');
    $('tx-payees').innerHTML = [...payees.values()].slice(0, 300).map(p => `<option value="${esc(p.payee)}">`).join('');
  }
  function showKind(){
    const k = kindNow();
    dlg.querySelectorAll('[data-only]').forEach(x => { x.hidden = x.dataset.only !== k; });
    dlg.querySelectorAll('[data-not]').forEach(x => { x.hidden = x.dataset.not === k; });
    $('tx-acc-label').textContent = k === 'income' ? 'Into' : 'From';
    $('tx-payee-label').textContent = k === 'income' ? 'From whom' : k === 'transfer' ? 'Label' : 'Paid to';
    $('tx-payee').placeholder = k === 'income' ? 'Employer, client, person…' : k === 'transfer' ? 'Cash withdrawal, Fuliza repayment…' : 'Shop, person, paybill…';
  }

  // t: an existing line, null for a new one, or { new: true, ...prefill }.
  function openTx(t){
    if (!accounts.length){ WK.show('money'); return; }
    const fresh = !t || t.new;
    editing = fresh ? null : t;
    const v = t || {};
    receiptGone = false;
    $('tx-title').textContent = fresh ? 'Add a line' : 'Change the line';
    dlg.querySelector(`input[name=tx-kind][value="${v.kind || 'expense'}"]`).checked = true;
    $('tx-amount').value = v.amount != null ? v.amount : '';
    $('tx-fee').value = num(v.fee) ? v.fee : '';
    $('tx-payee').value = v.payee || '';
    $('tx-note').value = v.note || '';
    $('tx-ref').value = v.ref || '';
    $('tx-when').value = localInput(v.occurred_at ? new Date(v.occurred_at) : new Date());
    $('tx-file').value = '';
    $('tx-error').textContent = '';
    $('tx-delete').hidden = fresh;
    fillPickers(v);
    showKind();
    receiptLink(v.receipt_path);
    dlg.showModal();
    setTimeout(() => (v.amount != null ? $('tx-payee') : $('tx-amount')).focus(), 30);
  }
  async function receiptLink(path){
    const a = $('tx-receipt-link');
    a.hidden = true; $('tx-receipt-rm').hidden = !path;
    if (!path) return;
    const { data } = await WK.db.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (data && data.signedUrl){ a.href = data.signedUrl; a.hidden = false; }
  }

  dlg.querySelectorAll('input[name=tx-kind]').forEach(r => { r.onchange = () => { fillPickers({ account_id: $('tx-account').value, to_account_id: $('tx-to').value }); showKind(); }; });
  ['tx-amount', 'tx-fee'].forEach(id => { dlg.querySelector('#' + id).oninput = e => { const v = cleanAmount(e.target.value); if (v !== e.target.value) e.target.value = v; }; });
  dlg.querySelector('#tx-payee').onchange = () => {
    // The same payee as before: the same category (and account), unless one is picked.
    const p = payees.get($('tx-payee').value.trim().toLowerCase());
    if (!p || editing) return;
    if (p.category_id && !$('tx-category').value && [...$('tx-category').options].some(o => o.value === p.category_id)) $('tx-category').value = p.category_id;
  };
  dlg.querySelector('#tx-budget').onchange = () => {
    const i = (WK.budgetItems ? WK.budgetItems() : []).find(x => x.id === $('tx-budget').value);
    if (i && !$('tx-amount').value && i.amount != null) $('tx-amount').value = i.amount;
    if (i && !$('tx-payee').value) $('tx-payee').value = i.name;
  };
  dlg.querySelector('#tx-wish').onchange = () => {
    const w = (WK.wishItems ? WK.wishItems() : []).find(x => x.id === $('tx-wish').value);
    if (w && !$('tx-amount').value && w.price != null) $('tx-amount').value = w.price;
    if (w && !$('tx-note').value) $('tx-note').value = w.name;
  };
  dlg.querySelector('#tx-receipt-rm').onclick = () => { receiptGone = true; $('tx-receipt-link').hidden = true; $('tx-receipt-rm').hidden = true; };
  dlg.querySelector('#tx-cancel').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  // A photo goes up at most 1600 px wide, as JPEG; a PDF as it is.
  async function shrink(file){
    if (!/^image\//.test(file.type) || file.type === 'image/gif') return file;
    try {
      const img = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.85));
    } catch (e){ return file; }
  }

  dlg.querySelector('#tx-form').onsubmit = async e => {
    e.preventDefault();
    const k = kindNow();
    const amount = Number($('tx-amount').value);
    if (!(amount > 0)){ $('tx-error').textContent = 'Put in the amount.'; $('tx-amount').focus(); return; }
    if (k === 'transfer' && $('tx-account').value === $('tx-to').value){ $('tx-error').textContent = 'Moving money needs two different accounts.'; return; }
    const when = new Date($('tx-when').value);
    if (isNaN(when)){ $('tx-error').textContent = 'Pick when it happened.'; return; }
    const id = editing ? editing.id : (crypto.randomUUID ? crypto.randomUUID() : undefined);
    const row = {
      kind: k, amount, fee: Number($('tx-fee').value) || 0, occurred_at: when.toISOString(),
      account_id: $('tx-account').value || null,
      to_account_id: k === 'transfer' ? $('tx-to').value || null : null,
      category_id: k === 'transfer' ? null : $('tx-category').value || null,
      budget_item_id: k === 'expense' ? $('tx-budget').value || null : null,
      wishlist_item_id: k === 'expense' ? $('tx-wish').value || null : null,
      payee: $('tx-payee').value.trim(), note: $('tx-note').value.trim(),
      ref: $('tx-ref').value.trim().toUpperCase(),
      updated_at: new Date().toISOString()
    };
    $('tx-save').disabled = true;
    try {
      const file = $('tx-file').files[0];
      const old = editing ? editing.receipt_path : '';
      if (file){
        const body = await shrink(file);
        const ext = body.type === 'application/pdf' ? 'pdf' : 'jpg';
        const path = `${WK.user.id}/${id || Date.now()}-${Date.now()}.${ext}`;
        const up = await WK.db.storage.from(BUCKET).upload(path, body, { contentType: body.type || file.type });
        if (up.error) throw up.error;
        row.receipt_path = path;
      } else if (receiptGone) row.receipt_path = '';
      const q = editing ? WK.db.from('money_tx').update(row).eq('id', editing.id)
                        : WK.db.from('money_tx').insert([Object.assign(id ? { id } : {}, row, { source: 'manual' })]);
      const { error } = await q;
      if (error){
        if (error.code === '23505') throw new Error('That M-Pesa code is already logged.');
        throw error;
      }
      if (old && row.receipt_path !== undefined && row.receipt_path !== old) WK.db.storage.from(BUCKET).remove([old]);
      await afterSave(row, when);
      const p = row.payee.toLowerCase();
      if (p) payees.set(p, { payee: row.payee, category_id: row.category_id, account_id: row.account_id, kind: k });
      dlg.close();
      // Show the month the line is in.
      const m = WK.isoDate(when).slice(0, 7);
      if (m !== month && WK.isoDate().slice(0, 7) === month && !editing){ /* stay; it's in another month */ WK.toast('Saved in ' + monthName(m) + '.'); }
      await reloadAll();
    } catch (err){ $('tx-error').textContent = 'Not saved: ' + err.message; }
    finally { $('tx-save').disabled = false; }
  };

  // A line that pays a budget item ticks it paid for its month; one that
  // buys a wish moves the wish to Got.
  async function afterSave(row, when){
    const m = WK.isoDate(when).slice(0, 7);
    const item = row.budget_item_id && (WK.budgetItems ? WK.budgetItems() : []).find(i => i.id === row.budget_item_id);
    if (item){
      const key = item.monthly ? m : 'once';
      if (!(item.paid || []).includes(key)){
        item.paid = (item.paid || []).concat([key]);
        await WK.db.from('budget_items').update({ paid: item.paid, updated_at: new Date().toISOString() }).eq('id', item.id);
      }
    }
    const wish = row.wishlist_item_id && (WK.wishItems ? WK.wishItems() : []).find(w => w.id === row.wishlist_item_id);
    if (wish && !wish.got){
      wish.got = true; wish.got_on = WK.isoDate(when);
      if (wish.price == null) wish.price = row.amount;
      await WK.db.from('wishlist_items').update({ got: true, got_on: wish.got_on, price: wish.price, updated_at: new Date().toISOString() }).eq('id', wish.id);
      WK.toast('🎉 ' + (wish.name || 'It') + ' is yours.');
    }
  }

  dlg.querySelector('#tx-delete').onclick = async () => {
    if (!editing) return;
    const b = $('tx-delete');
    if (b.dataset.sure !== '1'){ b.dataset.sure = '1'; b.textContent = 'Sure? Delete'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Delete'; }, 3000); return; }
    b.dataset.sure = ''; b.textContent = 'Delete';
    const { error } = await WK.db.from('money_tx').delete().eq('id', editing.id);
    if (error){ $('tx-error').textContent = 'Not deleted: ' + error.message; return; }
    if (editing.receipt_path) WK.db.storage.from(BUCKET).remove([editing.receipt_path]);
    if (found) found = found.filter(t => t.id !== editing.id);
    dlg.close();
    await reloadAll();
  };

  // ---------------- The account editor ----------------
  const adlg = document.createElement('dialog');
  adlg.className = 'money-dialog';
  adlg.innerHTML = `<form method="dialog" id="acc-form" class="money-form">
    <h2 id="acc-title">Account</h2>
    <label>Name<input id="acc-name" required maxlength="60"></label>
    <div class="row2">
      <label>Kind<select id="acc-kind">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label data-loan>Limit (KES)<input id="acc-limit" inputmode="numeric" placeholder="none"></label>
    </div>
    <label id="acc-opening-label"><span id="acc-opening-text">Balance when added (KES)</span><input id="acc-opening" inputmode="decimal" placeholder="0"></label>
    <div id="acc-fix" class="acc-fix">
      <p class="small"><span id="acc-now"></span></p>
      <label><span id="acc-fix-text">Correct it to</span><input id="acc-fix-to" inputmode="decimal" placeholder="what it really is now"></label>
      <p class="muted small">Writes one adjustment line for the difference; it isn't counted as spending or income.</p>
    </div>
    <label class="check"><input type="checkbox" id="acc-archived"> Hidden (closed, or no longer used)</label>
    <p class="error" id="acc-error"></p>
    <div class="dialog-actions">
      <button type="button" class="btn ghost danger" id="acc-delete" hidden>Delete</button>
      <span class="spacer"></span>
      <button type="button" class="btn ghost" id="acc-cancel">Cancel</button>
      <button type="submit" class="btn primary">Save</button>
    </div>
  </form>`;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(adlg));
  let accEditing = null;
  const loanUi = () => {
    const loan = $('acc-kind').value === 'loan';
    adlg.querySelector('[data-loan]').hidden = !loan;
    $('acc-opening-text').textContent = loan ? 'Owed when added (KES)' : 'Balance when added (KES)';
    $('acc-fix-text').textContent = loan ? 'Correct what is owed to' : 'Correct it to';
  };
  function openAccount(a){
    accEditing = a;
    $('acc-title').textContent = a ? a.name : 'New account';
    $('acc-name').value = a ? a.name : '';
    $('acc-kind').value = a ? a.kind : 'mpesa';
    $('acc-limit').value = a && a.credit_limit != null ? a.credit_limit : '';
    const loan = a && a.kind === 'loan';
    $('acc-opening').value = a ? (loan ? -num(a.opening) : num(a.opening)) || '' : '';
    $('acc-archived').checked = !!(a && a.archived);
    $('acc-fix').hidden = !a;
    $('acc-fix-to').value = '';
    $('acc-error').textContent = '';
    $('acc-delete').hidden = !a;
    if (a){ const b = balanceOf(a); $('acc-now').textContent = loan ? `Owed now: ${kes(Math.max(0, -b))}${b > 0 ? ` (in credit ${kes(b)})` : ''}` : `Balance now: ${kes(b)}`; }
    loanUi();
    adlg.showModal();
  }
  adlg.querySelector('#acc-kind').onchange = loanUi;
  ['acc-opening', 'acc-fix-to'].forEach(id => { adlg.querySelector('#' + id).oninput = e => { const v = cleanAmount(e.target.value); if (v !== e.target.value) e.target.value = v; }; });
  adlg.querySelector('#acc-limit').oninput = e => { e.target.value = e.target.value.replace(/\D/g, ''); };
  adlg.querySelector('#acc-cancel').onclick = () => adlg.close();
  adlg.addEventListener('click', e => { if (e.target === adlg) adlg.close(); });
  adlg.querySelector('#acc-form').onsubmit = async e => {
    e.preventDefault();
    const kind = $('acc-kind').value, loan = kind === 'loan';
    const opening = (Number($('acc-opening').value) || 0) * (loan ? -1 : 1);
    const row = { name: $('acc-name').value.trim() || 'Account', kind, opening,
      credit_limit: loan && $('acc-limit').value ? Number($('acc-limit').value) : null,
      archived: $('acc-archived').checked, updated_at: new Date().toISOString() };
    let res;
    if (accEditing) res = await WK.db.from('money_accounts').update(row).eq('id', accEditing.id).select().single();
    else res = await WK.db.from('money_accounts').insert([Object.assign(row, { sort: accounts.reduce((m, a) => Math.max(m, a.sort || 0), 0) + 1 })]).select().single();
    if (res.error){ $('acc-error').textContent = 'Not saved: ' + res.error.message; return; }
    if (accEditing) Object.assign(accEditing, res.data); else accounts.push(res.data);
    // Correcting the balance: one adjustment line for the difference.
    const fix = $('acc-fix-to').value;
    if (accEditing && fix !== ''){
      await loadBalances();
      const target = Number(fix) * (loan ? -1 : 1);
      const diff = Math.round((target - balanceOf(accEditing)) * 100) / 100;
      if (diff){
        const { error } = await WK.db.from('money_tx').insert([{ kind: diff > 0 ? 'income' : 'expense', amount: Math.abs(diff), account_id: accEditing.id, source: 'adjust', note: 'Balance corrected', occurred_at: new Date().toISOString() }]);
        if (error){ $('acc-error').textContent = 'Balance not corrected: ' + error.message; return; }
      }
    }
    adlg.close();
    await reloadAll();
  };
  adlg.querySelector('#acc-delete').onclick = async () => {
    if (!accEditing) return;
    const { count } = await WK.db.from('money_tx').select('id', { count: 'exact', head: true }).or(`account_id.eq.${accEditing.id},to_account_id.eq.${accEditing.id}`);
    if (count){ $('acc-error').textContent = `It has ${count} line${count === 1 ? '' : 's'}: tick Hidden instead, so they keep their account.`; return; }
    const { error } = await WK.db.from('money_accounts').delete().eq('id', accEditing.id);
    if (error){ $('acc-error').textContent = 'Not deleted: ' + error.message; return; }
    accounts = accounts.filter(a => a !== accEditing);
    adlg.close();
    render();
  };

  // ---------------- For the other sections ----------------
  // Quick add: "250 lunch" → a Spent line for KES 250 to "lunch".
  WK.openSpend = text => {
    WK.show('money');
    const m = String(text || '').trim().match(/^(?:ksh|kes)?\s*([\d,]+(?:\.\d+)?)\s*(.*)$/i) || String(text || '').trim().match(/^(.*?)\s+(?:ksh|kes)?\s*([\d,]+(?:\.\d+)?)$/i);
    let amount = null, payee = String(text || '').trim();
    if (m){ const a = /^[\d,]/.test(m[1]) ? m[1] : m[2]; amount = Number(a.replace(/,/g, '')); payee = (/^[\d,]/.test(m[1]) ? m[2] : m[1]).trim(); }
    const p = payees.get(payee.toLowerCase());
    setTimeout(() => openTx({ new: true, kind: 'expense', amount, payee, category_id: p ? p.category_id : null, account_id: p ? p.account_id : null }), 0);
  };
  // Review: the money of a week.
  WK.moneyBetween = async (fromIso, toIso) => {
    const { data, error } = await WK.db.from('money_tx').select('kind, amount, fee, source, category_id').gte('occurred_at', fromIso).lt('occurred_at', toIso);
    if (error) return null;
    const rows = (data || []).filter(t => t.source !== 'adjust');
    const out = rows.filter(t => t.kind === 'expense').reduce((a, t) => a + num(t.amount), 0) + rows.reduce((a, t) => a + num(t.fee), 0);
    const inn = rows.filter(t => t.kind === 'income').reduce((a, t) => a + num(t.amount), 0);
    const by = new Map();
    rows.filter(t => t.kind === 'expense').forEach(t => by.set(t.category_id, (by.get(t.category_id) || 0) + num(t.amount)));
    const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, v]) => ({ name: catLabel(cat(id)), v }));
    return { out, inn, n: rows.length, top };
  };
})();
