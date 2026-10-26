/* Core: Supabase, sign-in, the section menu and small helpers. Each
   section (Today, Vision, Planner, Review, Budget, Journal, Bible, Library, Practice, Breathe, Sounds, Systems, Blog, Gallery, Legacy, Wishlist) registers itself with
   WK.section(); once you are signed in, every section loads its data and
   the open one draws. The menu groups the sections into Plan, Reflect,
   Read, Calm and Keep: a bar with a sliding pill on wide screens, a dock
   along the bottom on phones with the rest in a "More" sheet. */
(function(){
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Local date as YYYY-MM-DD (not UTC, so late evenings stay "today").
  const isoDate = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const parseDate = iso => new Date(iso + 'T00:00:00');
  const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoDate(d); };
  function fmtDate(iso, opts){
    const d = parseDate(iso);
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }
  let toastTimer = null;
  function toast(msg){
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  // A script from a CDN, fetched the first time it's needed (the PDF and
  // ZIP libraries: only the Bible's PDF download and the archive use them).
  const scripts = {};
  function loadScript(src){
    if (!scripts[src]) scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = () => { delete scripts[src]; reject(new Error('Could not load a part of the page. Check the connection and try again.')); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }
  function store(key, val){
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  const sections = [];   // { name, label, icon, load, render, reset, hide }
  let current = store('wk_section') || 'today';
  const wanted = current;   // a page section may arrive after the first draw

  // The menu. A section not named here joins the last group.
  // Five spaces: what to do (Plan), inner work (Reflect), reading (Read),
  // calming down (Calm) and what's kept (Keep). The CMS can change it.
  const GROUPS = [
    { name: 'Plan',    items: ['today', 'planner', 'review', 'vision', 'budget', 'wishlist'] },
    { name: 'Reflect', items: ['journal', 'practice', 'systems', 'bible'] },
    { name: 'Read',    items: ['library', 'blog'] },
    { name: 'Calm',    items: ['breathe', 'sounds'] },
    { name: 'Keep',    items: ['legacy', 'gallery', 'cms'] }
  ];
  const DOCK = ['today', 'planner', 'breathe', 'journal'];   // on phones; the rest under More
  // Your own menu from the CMS: { groups: [{ name, items }], hidden: [names] }.
  let menu = null;
  const ALWAYS = ['today', 'cms'];   // never hidden, so you can't lock yourself out


  Object.assign(WK, {
    $, esc, isoDate, parseDate, addDays, fmtDate, toast, store, loadScript,
    db: null, user: null,
    section(def){ sections.push(def); },
    // Sections that come and go while the site runs (your pages).
    addSection(def){
      const at = sections.findIndex(s => s.name === def.name);
      if (at >= 0) sections[at] = def; else sections.push(def);
      if (!$('section-' + def.name)){
        const el = document.createElement('section');
        el.id = 'section-' + def.name; el.className = 'section'; el.hidden = true;
        document.querySelector('#app main').appendChild(el);
      }
      buildNav();
      if (def.name === current) def.render && def.render();
      else if (def.name === wanted && current === 'today') WK.show(wanted);
    },
    removeSection(name){
      const at = sections.findIndex(s => s.name === name);
      if (at < 0) return;
      sections.splice(at, 1);
      const el = $('section-' + name);
      if (el) el.remove();
      buildNav();
      if (current === name) WK.show('today');
    },
    sections: () => sections.slice(),
    // From the CMS: your own menu, or null for the original.
    setMenu(m){ menu = m; buildNav(); },
    menuGroups: () => groups(),
    isHidden: name => !!(menu && (menu.hidden || []).includes(name)) && !ALWAYS.includes(name),
    show(name){
      if (!sections.some(s => s.name === name)) name = 'today';
      if (!$('section-' + name)) return;
      const leaving = name !== current && sections.find(s => s.name === current);
      if (leaving && leaving.hide) leaving.hide();
      current = name;
      store('wk_section', name);
      markNav();
      sections.forEach(s => { $('section-' + s.name).hidden = s.name !== name; });
      const s = sections.find(x => x.name === name);
      if (s && s.render) s.render();
      window.scrollTo(0, 0);
    },
    // Redraw the open section (after data changes elsewhere).
    refresh(){ const s = sections.find(x => x.name === current); if (s && s.render) s.render(); }
  });

  // The menu as groups of sections: yours from the CMS, or the original.
  // A section that names its own group (a page) goes there; any other
  // section not placed joins the last group. Hidden ones are left out
  // unless `all`.
  function groups(all){
    const base = menu && menu.groups && menu.groups.length ? menu.groups : GROUPS;
    const list = base.map(g => ({ name: g.name, items: [] }));
    const placed = new Set();
    base.forEach((g, i) => g.items.forEach(n => {
      const s = sections.find(x => x.name === n);
      if (s && !placed.has(n)){ list[i].items.push(s); placed.add(n); }
    }));
    sections.filter(s => !placed.has(s.name)).forEach(s => {
      const g = (s.group && list.find(x => x.name === s.group)) || list[list.length - 1];
      g.items.push(s);
    });
    if (!all) list.forEach(g => { g.items = g.items.filter(s => !WK.isHidden(s.name) && !s.offMenu); });
    return list.filter(g => all || g.items.length);
  }
  const navBtn = (s, cls) => `<button type="button" class="${cls}" data-section="${s.name}" title="${esc(s.label)}">${WK.icon(s.icon || s.name)}<span class="nav-label">${esc(s.label)}</span></button>`;

  let navWired = false;
  function buildNav(){
    if (!$('nav')) return;
    const gs = groups();
    // A rebuilt menu puts its pill in place without sliding in from the corner.
    $('nav').classList.remove('pill-ready');
    $('nav').innerHTML = '<span class="nav-pill" aria-hidden="true"></span>' + gs.map(g => `
      <div class="nav-group" role="group" aria-label="${esc(g.name)}">${g.items.map(s => navBtn(s, 'nav-btn')).join('')}</div>`).join('');
    $('dock').innerHTML = DOCK.map(n => sections.find(s => s.name === n)).filter(s => s && !WK.isHidden(s.name)).map(s => navBtn(s, 'dock-btn')).join('') +
      `<button type="button" class="dock-btn" id="dock-more" aria-haspopup="dialog">${WK.icon('more')}<span class="nav-label">More</span></button>`;
    $('nav-sheet').innerHTML = `
      <div class="sheet-head"><b>Wang' Kalam Agok Buk</b><button type="button" class="sheet-close" aria-label="Close">${WK.icon('close')}</button></div>
      ${gs.map(g => `<p class="sheet-group">${esc(g.name)}</p><div class="sheet-grid">${g.items.map(s => navBtn(s, 'sheet-btn')).join('')}</div>`).join('')}
      <div class="sheet-foot"><button type="button" class="btn ghost small" data-click="account-open">Account</button><button type="button" class="btn ghost small" data-click="sign-out">Sign out</button></div>`;
    // On phones the header's Account and Sign out live here.
    $('nav-sheet').querySelectorAll('[data-click]').forEach(b => { b.onclick = () => { $('nav-sheet').close(); $(b.dataset.click).click(); }; });
    document.querySelectorAll('[data-section]').forEach(b => { if (b.closest('#nav, #dock, #nav-sheet')) b.onclick = () => WK.show(b.dataset.section); });
    const sheet = $('nav-sheet');
    $('dock-more').onclick = () => sheet.showModal();
    sheet.querySelector('.sheet-close').onclick = () => sheet.close();
    sheet.onclick = e => { if (e.target === sheet) sheet.close(); };   // the backdrop
    if (!navWired){
      navWired = true;
      window.addEventListener('resize', movePill);
      if (document.fonts) document.fonts.ready.then(movePill);
    }
    markNav();
  }

  // The current section in all three menus; the pill slides under it.
  function markNav(){
    document.querySelectorAll('#nav [data-section], #dock [data-section], #nav-sheet [data-section]')
      .forEach(b => b.setAttribute('aria-current', b.dataset.section === current ? 'page' : 'false'));
    const more = $('dock-more');
    if (more){
      const inDock = DOCK.includes(current), s = sections.find(x => x.name === current);
      more.setAttribute('aria-current', inDock ? 'false' : 'page');
      more.innerHTML = inDock || !s ? `${WK.icon('more')}<span class="nav-label">More</span>` : `${WK.icon(s.icon || s.name)}<span class="nav-label">${esc(s.label)}</span>`;
    }
    const sheet = $('nav-sheet');
    if (sheet && sheet.open) sheet.close();
    movePill();
  }
  function movePill(){
    const nav = $('nav'), pill = nav && nav.querySelector('.nav-pill');
    const b = pill && nav.querySelector('.nav-btn[aria-current="page"]');
    if (!b || !b.offsetWidth){ if (pill) pill.style.opacity = 0; return; }
    Object.assign(pill.style, { opacity: 1, width: b.offsetWidth + 'px', height: b.offsetHeight + 'px', transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)` });
    // Placed once without sliding in from the corner, then it slides.
    if (!nav.classList.contains('pill-ready')) requestAnimationFrame(() => nav.classList.add('pill-ready'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('affirmation').textContent = WK.F.AFFIRMATION;
    // The offline cache and "install as an app" (sw.js).
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
    buildNav();

    const cfg = window.VB_CONFIG || {};
    if (!cfg.supabaseUrl || /YOUR-/.test(cfg.supabaseUrl + cfg.supabaseAnonKey)){
      $('setup').hidden = false;
      return;
    }
    // Sign in, sign up, password reset and the Account dialog live in js/auth.js.
    WK.db = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { storage: WK.authStorage } });
    WK.startAuth();
  });

  // Show the site for this user, or the sign-in screen for null.
  let shown;
  WK.enter = user => {
    const id = user ? user.id : null;
    if (id === shown) return;
    shown = id;
    $('signin').hidden = !!user;
    $('app').hidden = !user;
    if (user) loadAll();
    else sections.forEach(s => s.reset && s.reset());
  };

  async function loadAll(){
    WK.show(current);
    const results = await Promise.allSettled(sections.map(s => s.load ? s.load() : null));
    results.forEach((r, i) => { if (r.status === 'rejected') toast('Could not load ' + sections[i].label + ': ' + (r.reason && r.reason.message || r.reason)); });
    WK.refresh();
  }
})();
