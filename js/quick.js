/* Quick: one place to add and find. The round "+" (bottom right, above
   the dock on phones), Ctrl/⌘-K, or "/" opens it.
   - Type, then add what you typed: to today's plan, as a journal entry,
     a goal, or a wish.
   - Or find it: journal entries, goals, blog posts, Library books (and
     the chapters of books already opened), Practice exercises and the
     sections themselves, from what's already loaded; nothing extra is
     fetched.
   Also here: a notice while the device is offline, since nothing can be
   saved until it's back. */
(function(){
  const { $, esc } = WK;

  const dlg = document.createElement('dialog');
  dlg.className = 'sheet quick';
  dlg.setAttribute('aria-label', 'Add or find');
  dlg.innerHTML = `
    <div class="quick-head">
      <input type="search" id="quick-q" placeholder="Type to add or find…" autocomplete="off" enterkeyhint="go" aria-label="Add or find">
      <button type="button" class="sheet-close" aria-label="Close">${WK.icon('close')}</button>
    </div>
    <div id="quick-add" class="quick-add"></div>
    <div id="quick-results" class="quick-results" aria-live="polite"></div>`;
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'quick-fab'; fab.setAttribute('aria-label', 'Add or find (Ctrl-K)'); fab.title = 'Add or find (Ctrl-K)';
  fab.innerHTML = '<span aria-hidden="true">+</span>';
  const offline = document.createElement('div');
  offline.className = 'offline-note'; offline.setAttribute('role', 'status');
  offline.textContent = 'Offline: you can read, but changes won’t save until you’re back online.';

  document.addEventListener('DOMContentLoaded', () => {
    document.body.append(dlg, fab, offline);
    const app = $('app');
    // Only while signed in.
    const sync = () => { fab.hidden = !app || app.hidden; };
    sync();
    if (app) new MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ['hidden'] });
    fab.onclick = open;
    dlg.querySelector('.sheet-close').onclick = () => dlg.close();
    dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
    $('quick-q').oninput = draw;
    $('quick-q').onkeydown = e => {
      if (e.key === 'Enter'){ const first = dlg.querySelector('#quick-results [data-r], #quick-add [data-a]'); if (first){ e.preventDefault(); first.click(); } }
    };
    const onLine = () => document.body.classList.toggle('is-offline', !navigator.onLine);
    window.addEventListener('online', () => { onLine(); WK.toast('Back online.'); });
    window.addEventListener('offline', onLine);
    onLine();
  });

  document.addEventListener('keydown', e => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)){ e.preventDefault(); open(); }
    else if (e.key === '/' && !typing && !document.querySelector('dialog[open]')){ e.preventDefault(); open(); }
  });

  function open(){
    if (!WK.user || ($('app') && $('app').hidden)) return;
    $('quick-q').value = '';
    draw();
    dlg.showModal();
    setTimeout(() => $('quick-q').focus(), 30);
  }
  const close = () => dlg.close();

  // ---- Add ----
  function addActions(text){
    const t = text.trim(), q = t ? `“${esc(t)}”` : '';
    return [
      { key: 'task', label: t ? `Add ${q} to today’s plan` : 'A task for today', icon: '✅' },
      { key: 'entry', label: t ? `Journal entry: ${q}` : 'Journal entry', icon: '📓' },
      { key: 'goal', label: t ? `Goal: ${q}` : 'Goal', icon: '🎯' },
      { key: 'wish', label: t ? `Wish: ${q}` : 'Wish', icon: '🎁' }
    ];
  }
  async function doAdd(key){
    const t = $('quick-q').value.trim();
    if (key === 'task'){
      if (!t){ $('quick-q').focus(); $('quick-q').placeholder = 'Type the task, then choose “Add to today’s plan”'; return; }
      try { await WK.addToPlan(t); WK.toast('Added to today’s plan.'); close(); if (WK.refresh) WK.refresh(); }
      catch (err){ WK.toast('Not added: ' + err.message); }
      return;
    }
    close();
    if (key === 'entry') WK.openNewEntry ? WK.openNewEntry({ title: t }) : WK.openEntry(null, { kind: 'journal', title: t });
    else if (key === 'goal') WK.openGoal(null, { title: t });
    else if (key === 'wish' && WK.newWish) WK.newWish(t);
  }

  // ---- Find ----
  function snippet(text, q){
    const s = String(text || '').replace(/\s+/g, ' ').replace(/\*+/g, '');
    const i = s.toLowerCase().indexOf(q);
    if (i < 0) return '';
    const a = Math.max(0, i - 40), b = Math.min(s.length, i + q.length + 60);
    return (a ? '…' : '') + esc(s.slice(a, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length, b)) + (b < s.length ? '…' : '');
  }
  function find(q){
    const out = [], has = s => String(s || '').toLowerCase().includes(q);
    const push = (kind, title, text, go) => { if (out.length < 40) out.push({ kind, title, text, go }); };
    (WK.sections ? WK.sections() : []).forEach(s => { if (has(s.label) && !s.offMenu) push('Section', s.label, '', () => WK.show(s.name)); });
    (WK.entries ? WK.entries() : []).forEach(e => {
      if (has(e.title) || has(e.body) || has(e.gratitude)) push(e.kind === 'letter' ? 'Letter' : 'Journal', (e.title || 'Untitled') + (e.entry_date ? ' · ' + WK.fmtDate(e.entry_date) : ''), snippet(e.body, q) || snippet(e.gratitude, q), () => WK.openEntry(e));
    });
    (WK.goals ? WK.goals() : []).forEach(g => {
      if (has(g.title) || has(g.notes) || has(g.next_step)) push('Goal', g.title + (g.done ? ' ✓' : ''), snippet(g.notes, q) || snippet(g.next_step, q), () => WK.openGoal(g));
    });
    (WK.posts ? WK.posts() : []).forEach(p => {
      if (has(p.title) || has(p.body)) push('Blog', p.title, snippet(p.body, q), () => WK.show('blog'));
    });
    (WK.practiceList ? WK.practiceList() : []).forEach(x => {
      if (has(x.name) || has(x.what) || has(x.quote)) push('Practice', x.name, snippet(x.what, q) || snippet(x.quote, q), () => WK.openPractice(x.key));
    });
    (WK.libraryShelf ? WK.libraryShelf() : []).forEach(b => {
      if (has(b.title) || has(b.by) || has(b.sub)) push('Library', b.title, esc(b.by), () => WK.openBook(b.id));
      const book = WK.BOOKS && WK.BOOKS[b.id];
      if (book) book.chapters.forEach((ch, i) => {
        const hit = has(ch[2]) ? '' : ch[3].find(p => has(p));
        if (has(ch[2]) || hit) push('Library', b.title + ' · ' + ch[2], hit ? snippet(hit, q) : '', () => WK.openBook(b.id, i));
      });
    });
    return out;
  }

  function draw(){
    const text = $('quick-q').value, q = text.trim().toLowerCase();
    $('quick-add').innerHTML = `<p class="quick-label">Add</p>` + addActions(text).map(a =>
      `<button type="button" class="quick-row" data-a="${a.key}"><span aria-hidden="true">${a.icon}</span> ${a.label}</button>`).join('');
    if (q.length < 2){ $('quick-results').innerHTML = q ? '' : '<p class="muted small quick-tip">Search your journal, goals, blog, the Library and Practice. Ctrl-K or / opens this from anywhere.</p>'; bind(); return; }
    const res = find(q);
    $('quick-results').innerHTML = `<p class="quick-label">Found</p>` + (res.length ? res.map((r, i) =>
      `<button type="button" class="quick-row" data-r="${i}"><span class="chip">${esc(r.kind)}</span> <b>${esc(r.title)}</b>${r.text ? `<span class="quick-snip">${r.text}</span>` : ''}</button>`).join('')
      : '<p class="muted small">Nothing found. Books not opened yet are searched by title only.</p>');
    bind(res);
  }
  function bind(res){
    dlg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => doAdd(b.dataset.a));
    dlg.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const r = res[Number(b.dataset.r)]; close(); r.go(); });
  }
})();
