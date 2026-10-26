/* Wishlist: the things I wish for, written on a notebook page like the
   Budget. Each line is the thing and roughly what it costs; 🔗 opens a
   line for where to find it and a note. Tick it when it's mine and it
   moves down to "Got", with the day. */
(function(){
  const { $, esc } = WK;

  let items = [];
  let missing = false;        // the table isn't there yet (sql/09-wishlist.sql)
  const open = new Set();     // lines showing their link and note
  const saveTimers = {};

  WK.section({ name: 'wishlist', label: 'Wishlist', load, render, reset(){ items = []; missing = false; open.clear(); } });

  async function load(){
    const { data, error } = await WK.db.from('wishlist_items').select('*').order('sort').order('created_at');
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return; throw error; }
    missing = false;
    items = data || [];
  }

  const kes = n => 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  const sum = l => l.reduce((t, i) => t + (Number(i.price) || 0), 0);
  // Only http(s) links become clickable.
  const href = s => { s = (s || '').trim(); if (!s) return ''; if (!/^[a-z]+:/i.test(s)) s = 'https://' + s; return /^https?:\/\//i.test(s) ? s : ''; };

  function render(){
    const el = $('section-wishlist');
    if (missing){
      el.innerHTML = '<div class="section-head"><h1>Wishlist</h1></div><p class="empty">Run <code>sql/09-wishlist.sql</code> in Supabase to start your wishlist.</p>';
      return;
    }
    const want = items.filter(i => !i.got), got = items.filter(i => i.got);
    const unpriced = want.filter(i => i.price == null).length;
    el.innerHTML = `
      <div class="section-head">
        <h1>Wishlist</h1>
        <div class="toolbar"><button type="button" class="btn primary" id="wish-add">+ Wish</button></div>
      </div>
      <div class="bud-sum">
        <div><span class="muted small">On the list</span><b>${want.length}</b></div>
        <div><span class="muted small">All of it would cost</span><b>${kes(sum(want))}</b>${unpriced ? `<span class="muted small">${unpriced} not priced yet</span>` : ''}</div>
        <div><span class="muted small">Got so far</span><b>${got.length}</b></div>
      </div>

      <div class="notebook">
        <section class="nb-box wish-box">
          <h2>My wishlist</h2>
          ${want.length ? `<ul class="nb-lines">${want.map(line).join('')}</ul>`
            : `<p class="nb-empty">${got.length ? 'Everything on the list is yours. Wish for more.' : 'An empty page. What do you wish for?'}</p>`}
          <div class="nb-foot">
            <button type="button" class="btn ghost small" data-add>+ Add</button>
            <span class="muted small">${want.length ? kes(sum(want)) : ''}</span>
          </div>
        </section>
        ${got.length ? `
        <section class="nb-box wish-box wish-got">
          <h2>Got <span class="muted small">${got.length}</span></h2>
          <ul class="nb-lines">${got.map(line).join('')}</ul>
        </section>` : ''}
      </div>
      <p class="muted small bud-key">Tick a wish when it's yours. 🔗 adds where to find it and a note. Enter starts the next line.</p>`;

    $('wish-add').onclick = add;
    el.querySelector('[data-add]').onclick = add;
    bind(el);
  }

  function line(i){
    const url = href(i.link), shown = open.has(i.id);
    return `
      <li data-item="${i.id}" class="${i.got ? 'paid' : ''}">
        <div class="wish-row">
          <input type="checkbox" ${i.got ? 'checked' : ''} aria-label="Got it">
          <input class="nb-name" value="${esc(i.name)}" placeholder="Something I wish for" aria-label="Wish">
          ${url ? `<a class="wish-go" href="${esc(url)}" target="_blank" rel="noopener" title="Open the link" aria-label="Open the link">↗</a>` : ''}
          <span class="nb-dash">—</span>
          <input class="nb-amt" inputmode="numeric" value="${i.price == null ? '' : esc(i.price)}" placeholder="…" aria-label="Price in KES">
          <button type="button" class="nb-kind${i.link || i.note ? ' on' : ''}" data-more aria-expanded="${shown}" title="Link and note">🔗</button>
          <button type="button" class="nb-x" aria-label="Remove">✕</button>
        </div>
        ${i.got && i.got_on ? `<span class="wish-when muted small">got ${esc(WK.fmtDate(i.got_on))}</span>` : ''}
        <div class="wish-more"${shown ? '' : ' hidden'}>
          <input class="wish-link" type="url" value="${esc(i.link)}" placeholder="Link: where to find it" aria-label="Link">
          <input class="wish-note" value="${esc(i.note)}" maxlength="300" placeholder="Note: why I want it, size, colour…" aria-label="Note">
        </div>
        ${i.note && !shown ? `<p class="wish-note-text">${esc(i.note)}</p>` : ''}
      </li>`;
  }

  function bind(el){
    el.querySelectorAll('[data-item]').forEach(li => {
      const it = items.find(x => x.id === li.dataset.item);
      li.querySelector('input[type=checkbox]').onchange = e => {
        it.got = e.target.checked;
        it.got_on = it.got ? WK.isoDate() : null;
        save(it, true);
        if (it.got) WK.toast('🎉 ' + (it.name || 'It') + ' is yours.');
      };
      const name = li.querySelector('.nb-name');
      name.oninput = () => { it.name = name.value; save(it); };
      name.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); add(); } };
      const amt = li.querySelector('.nb-amt');
      // Digits only (a text box: number boxes clip the last handwritten digit).
      amt.oninput = () => {
        const digits = amt.value.replace(/\D/g, '');
        if (digits !== amt.value) amt.value = digits;
        it.price = digits === '' ? null : Number(digits);
        save(it);
      };
      amt.onchange = () => render();
      const link = li.querySelector('.wish-link'), note = li.querySelector('.wish-note');
      link.oninput = () => { it.link = link.value.trim(); save(it); };
      note.oninput = () => { it.note = note.value; save(it); };
      li.querySelector('[data-more]').onclick = () => {
        if (open.has(it.id)) open.delete(it.id); else open.add(it.id);
        render();
        if (open.has(it.id)){ const l = $('section-wishlist').querySelector(`[data-item="${it.id}"] .wish-link`); if (l) l.focus(); }
      };
      li.querySelector('.nb-x').onclick = () => remove(it);
    });
  }

  // Typing saves after a pause; ticks save and redraw at once.
  function save(it, now){
    clearTimeout(saveTimers[it.id]);
    const run = async () => {
      const { error } = await WK.db.from('wishlist_items')
        .update({ name: it.name, price: it.price, link: it.link, note: it.note, got: it.got, got_on: it.got_on, updated_at: new Date().toISOString() }).eq('id', it.id);
      if (error) WK.toast('Not saved: ' + error.message);
    };
    if (now){ run(); render(); } else saveTimers[it.id] = setTimeout(run, 600);
  }

  // Quick add (quick.js): open the wishlist with a new line, named if given.
  WK.newWish = name => { WK.show('wishlist'); return add(name); };

  async function add(name){
    const sort = items.reduce((m, i) => Math.max(m, i.sort || 0), 0) + 1;
    const { data, error } = await WK.db.from('wishlist_items').insert([{ name: typeof name === 'string' ? name : '', sort }]).select().single();
    if (error){ WK.toast('Not added: ' + error.message); return; }
    items.push(data);
    render();
    const inp = $('section-wishlist').querySelector(`[data-item="${data.id}"] .nb-name`);
    if (inp) inp.focus();
  }

  async function remove(it){
    const { error } = await WK.db.from('wishlist_items').delete().eq('id', it.id);
    if (error){ WK.toast('Not removed: ' + error.message); return; }
    items = items.filter(x => x !== it);
    open.delete(it.id);
    render();
  }
})();
