/* Core: Supabase, sign-in, the section menu and small helpers. Each
   section (Today, Vision, Planner, Journal, Bible, Blog, Gallery, Legacy) registers itself with
   WK.section(); once you are signed in, every section loads its data and
   the open one draws. */
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
  function store(key, val){
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  const sections = [];   // { name, label, load, render, reset, hide }
  let current = store('wk_section') || 'today';

  Object.assign(WK, {
    $, esc, isoDate, parseDate, addDays, fmtDate, toast, store,
    db: null, user: null,
    section(def){ sections.push(def); },
    show(name){
      if (!sections.some(s => s.name === name)) name = 'today';
      const leaving = name !== current && sections.find(s => s.name === current);
      if (leaving && leaving.hide) leaving.hide();
      current = name;
      store('wk_section', name);
      document.querySelectorAll('#nav [data-section]').forEach(b => b.setAttribute('aria-current', b.dataset.section === name ? 'page' : 'false'));
      sections.forEach(s => { $('section-' + s.name).hidden = s.name !== name; });
      const s = sections.find(x => x.name === name);
      if (s && s.render) s.render();
      window.scrollTo(0, 0);
    },
    // Redraw the open section (after data changes elsewhere).
    refresh(){ const s = sections.find(x => x.name === current); if (s && s.render) s.render(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    $('affirmation').textContent = WK.F.AFFIRMATION;
    $('nav').innerHTML = sections.map(s => `<button type="button" data-section="${s.name}">${esc(s.label)}</button>`).join('');
    $('nav').querySelectorAll('[data-section]').forEach(b => { b.onclick = () => WK.show(b.dataset.section); });

    const cfg = window.VB_CONFIG || {};
    if (!cfg.supabaseUrl || /YOUR-/.test(cfg.supabaseUrl + cfg.supabaseAnonKey)){
      $('setup').hidden = false;
      return;
    }
    WK.db = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    $('signin-form').onsubmit = async e => {
      e.preventDefault();
      const f = e.target;
      $('signin-error').textContent = '';
      const { error } = await WK.db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      if (error) $('signin-error').textContent = error.message;
      else f.reset();
    };
    $('sign-out').onclick = () => WK.db.auth.signOut();

    let ready = false;
    WK.db.auth.onAuthStateChange((_event, session) => {
      const next = session ? session.user : null;
      if (ready && (next && next.id) === (WK.user && WK.user.id)) return;
      ready = true;
      WK.user = next;
      $('signin').hidden = !!next;
      $('app').hidden = !next;
      if (next) loadAll();
      else sections.forEach(s => s.reset && s.reset());
    });
  });

  async function loadAll(){
    WK.show(current);
    const results = await Promise.allSettled(sections.map(s => s.load ? s.load() : null));
    results.forEach((r, i) => { if (r.status === 'rejected') toast('Could not load ' + sections[i].label + ': ' + (r.reason && r.reason.message || r.reason)); });
    WK.refresh();
  }
})();
