/* Pages: your own pages, built from blocks (heading, text, picture,
   checklist, quote, divider). Each page is a section of its own, in the
   menu group you pick, with the icon you pick. "Edit" turns the page
   into its editor; changes save as you type. A checklist ticks in place.
   A page marked public also shows on the public site. The CMS lists
   them, makes new ones and sets their order. */
(function(){
  const { $, esc } = WK;

  let pages = [];             // in menu order
  let missing = false;        // the table isn't there yet (sql/08-cms.sql)
  const editing = new Set();  // ids of pages open in their editor
  const timers = {};

  const nameOf = p => 'pg-' + p.id;
  const slugOf = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
  const uniqueSlug = (t, id) => { let s = slugOf(t), n = 2; while (pages.some(p => p.slug === s && p.id !== id)) s = slugOf(t) + '-' + n++; return s; };
  const imgOf = b => b.gallery_id && WK.galleryUrl ? WK.galleryUrl(b.gallery_id) : '';

  async function load(){
    const { data, error } = await WK.db.from('pages').select('*').order('sort').order('created_at');
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return; throw error; }
    missing = false;
    pages.forEach(p => WK.removeSection(nameOf(p)));
    pages = data || [];
    pages.forEach(register);
  }
  function register(p){
    WK.addSection({ name: nameOf(p), label: p.title || 'Untitled', icon: p.icon, group: p.grp, offMenu: !p.in_menu,
      render: () => render(p.id), hide: () => flush(p.id) });
  }
  function reset(){ pages.forEach(p => WK.removeSection(nameOf(p))); pages = []; editing.clear(); }

  // ---- Saving ----
  async function save(p){
    clearTimeout(timers[p.id]); delete timers[p.id];
    const row = { title: p.title, slug: p.slug, icon: p.icon, grp: p.grp, blocks: p.blocks, in_menu: p.in_menu, public: p.public, sort: p.sort, updated_at: new Date().toISOString() };
    const { error } = await WK.db.from('pages').update(row).eq('id', p.id);
    const st = $('pg-status-' + p.id);
    if (error){ if (st) st.textContent = 'Not saved: ' + error.message; else WK.toast('Not saved: ' + error.message); return false; }
    if (st) st.textContent = 'Saved';
    return true;
  }
  function saveSoon(p){
    const st = $('pg-status-' + p.id);
    if (st) st.textContent = 'Saving…';
    clearTimeout(timers[p.id]);
    timers[p.id] = setTimeout(() => save(p), 700);
  }
  function flush(id){ const p = pages.find(x => x.id === id); if (p && timers[id]) save(p); }

  // ---- For the CMS ----
  async function create(fields){
    const n = pages.length;
    const title = (fields && fields.title) || 'New page';
    const row = Object.assign({ title, slug: uniqueSlug(title), icon: 'page', grp: 'Keep', in_menu: true, public: false, sort: n,
      blocks: [{ type: 'text', md: '' }] }, fields);
    const { data, error } = await WK.db.from('pages').insert([row]).select().single();
    if (error) throw error;
    pages.push(data);
    editing.add(data.id);
    register(data);
    WK.show(nameOf(data));
    return data;
  }
  async function update(id, fields){
    const p = pages.find(x => x.id === id);
    Object.assign(p, fields);
    if (fields.title != null) p.slug = uniqueSlug(p.title, p.id);
    const ok = await save(p);
    register(p);
    return ok;
  }
  async function move(id, dir){
    const i = pages.findIndex(x => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= pages.length) return;
    [pages[i], pages[j]] = [pages[j], pages[i]];
    pages.forEach((p, k) => { p.sort = k; });
    await Promise.all([pages[i], pages[j]].map(save));
    pages.forEach(p => WK.removeSection(nameOf(p)));
    pages.forEach(register);
  }
  async function remove(id){
    const { error } = await WK.db.from('pages').delete().eq('id', id);
    if (error) throw error;
    pages = pages.filter(x => x.id !== id);
    editing.delete(id);
    WK.removeSection('pg-' + id);
  }

  // ---- The page ----
  function render(id){
    const p = pages.find(x => x.id === id);
    const el = $('section-' + nameOf({ id }));
    if (!p || !el) return;
    if (editing.has(id)) return renderEditor(p, el);
    el.innerHTML = `
      <div class="section-head"><h1>${esc(p.title || 'Untitled')}</h1>
        <span class="toolbar">${p.public ? '<span class="chip">🌍 Public</span>' : ''}<button type="button" class="btn small" id="pg-edit">✎ Edit</button></span></div>
      <article class="pg">${WK.blocksHtml(p.blocks, { img: imgOf, tick: true }) || '<p class="empty">This page is empty. Tap Edit to add blocks.</p>'}</article>`;
    $('pg-edit').onclick = () => { editing.add(id); render(id); };
    el.querySelectorAll('[data-tick]').forEach(box => {
      box.onchange = () => {
        const [bi, ii] = box.dataset.tick.split(',').map(Number);
        p.blocks[bi].items[ii].done = box.checked;
        save(p).then(ok => { if (!ok){ box.checked = !box.checked; p.blocks[bi].items[ii].done = box.checked; } render(id); });
      };
    });
  }

  function renderEditor(p, el){
    const groups = WK.menuGroups(true).map(g => g.name);
    const gallery = WK.gallery ? WK.gallery() : [];
    el.innerHTML = `
      <div class="section-head"><h1>Editing: ${esc(p.title || 'Untitled')}</h1>
        <span class="toolbar"><span class="muted small" id="pg-status-${p.id}">Saved</span><button type="button" class="btn primary" id="pg-done">Done</button></span></div>

      <section class="panel pg-settings">
        <div class="row2">
          <label>Title <input id="pg-title" value="${esc(p.title)}"></label>
          <label>Menu group <select id="pg-grp">${groups.map(g => `<option${g === p.grp ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
        </div>
        <div class="pg-icons" role="radiogroup" aria-label="Icon">${WK.PAGE_ICONS.map(k => `
          <button type="button" role="radio" aria-checked="${k === p.icon}" data-icon="${k}" title="${esc(k)}">${WK.icon(k)}</button>`).join('')}</div>
        <div class="toolbar">
          <label class="check"><input type="checkbox" id="pg-menu"${p.in_menu ? ' checked' : ''}> In the menu</label>
          <label class="check"><input type="checkbox" id="pg-public"${p.public ? ' checked' : ''}> On the public site</label>
          <button type="button" class="btn ghost small danger-text" id="pg-delete">Delete page</button>
        </div>
      </section>

      <div class="pg-blocks">${p.blocks.map((b, i) => `
        <section class="panel pg-block" data-i="${i}">
          <div class="pg-block-head"><b>${esc(WK.BLOCKS[b.type] ? WK.BLOCKS[b.type].label : b.type)}</b>
            <span class="toolbar">
              <button type="button" class="btn ghost small" data-move="-1" aria-label="Move up"${i ? '' : ' disabled'}>↑</button>
              <button type="button" class="btn ghost small" data-move="1" aria-label="Move down"${i < p.blocks.length - 1 ? '' : ' disabled'}>↓</button>
              <button type="button" class="btn ghost small" data-remove aria-label="Remove block">✕</button>
            </span></div>
          ${fieldsOf(b, gallery)}
        </section>`).join('')}
      </div>

      <div class="pg-add">
        <span class="muted small">Add a block:</span>
        ${Object.keys(WK.BLOCKS).map(k => `<button type="button" class="btn small" data-add="${k}">+ ${esc(WK.BLOCKS[k].label)}</button>`).join('')}
      </div>
      <p class="muted small">Text uses Markdown: **bold**, *italics*, “- ” for bullets, [a link](https://…), a blank line between paragraphs.</p>`;

    const redraw = () => renderEditor(p, el);
    $('pg-done').onclick = async () => { await save(p); editing.delete(p.id); register(p); render(p.id); };
    $('pg-title').oninput = e => { p.title = e.target.value; p.slug = uniqueSlug(p.title, p.id); saveSoon(p); };
    $('pg-title').onchange = () => register(p);
    $('pg-grp').onchange = e => { p.grp = e.target.value; save(p).then(() => { if (WK.cmsUnplace) WK.cmsUnplace(nameOf(p)); register(p); }); };
    $('pg-menu').onchange = e => { p.in_menu = e.target.checked; save(p).then(() => register(p)); };
    $('pg-public').onchange = e => { p.public = e.target.checked; saveSoon(p); };
    el.querySelectorAll('[data-icon]').forEach(b => { b.onclick = () => { p.icon = b.dataset.icon; save(p).then(() => { register(p); }); redraw(); }; });
    $('pg-delete').onclick = async () => {
      const b = $('pg-delete');
      if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Tap again to delete'; return; }
      try { await remove(p.id); WK.toast('Page deleted.'); } catch (err){ WK.toast('Not deleted: ' + err.message); }
    };
    el.querySelectorAll('[data-add]').forEach(b => { b.onclick = () => { p.blocks.push(WK.BLOCKS[b.dataset.add].blank()); saveSoon(p); redraw(); }; });

    el.querySelectorAll('.pg-block').forEach(card => {
      const i = Number(card.dataset.i), b = p.blocks[i];
      card.querySelectorAll('[data-move]').forEach(m => {
        m.onclick = () => { const j = i + Number(m.dataset.move); [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]]; saveSoon(p); redraw(); };
      });
      card.querySelector('[data-remove]').onclick = () => { p.blocks.splice(i, 1); saveSoon(p); redraw(); };
      card.querySelectorAll('[data-f]').forEach(f => {
        f.oninput = f.onchange = () => {
          const k = f.dataset.f;
          if (k === 'items'){
            // Keep the ticks of the items that stay.
            const was = b.items || [];
            b.items = f.value.split('\n').map(t => t.trim()).filter(Boolean).map(text => ({ text, done: !!(was.find(x => x.text === text) || {}).done }));
          } else b[k] = f.value;
          if (k === 'gallery_id' && f.value) b.url = '';
          saveSoon(p);
          if (b.type === 'image' && (k === 'gallery_id' || f.type === 'file')) redraw();
        };
      });
      const up = card.querySelector('[data-upload]');
      if (up) up.onchange = async () => {
        if (!up.files.length) return;
        const added = await WK.uploadPhotos([...up.files], { caption: b.caption || p.title, category: '' });
        if (added.length){ b.gallery_id = added[0].id; b.url = ''; saveSoon(p); redraw(); }
      };
    });
  }

  function fieldsOf(b, gallery){
    if (b.type === 'heading') return `<input data-f="text" value="${esc(b.text)}" placeholder="Heading">`;
    if (b.type === 'text') return `<textarea data-f="md" rows="5" placeholder="Write…">${esc(b.md)}</textarea>`;
    if (b.type === 'quote') return `<textarea data-f="text" rows="2" placeholder="The words">${esc(b.text)}</textarea><input data-f="by" value="${esc(b.by)}" placeholder="Who said it">`;
    if (b.type === 'checklist') return `<textarea data-f="items" rows="4" placeholder="One item per line">${esc((b.items || []).map(x => x.text).join('\n'))}</textarea>
      <p class="muted small">${(b.items || []).filter(x => x.done).length} of ${(b.items || []).length} ticked. Tick them on the page.</p>`;
    if (b.type === 'image'){
      const src = imgOf(b) || (/^https?:\/\//.test(b.url || '') ? b.url : '');
      return `
        <div class="pg-img-edit">
          ${src ? `<img src="${esc(src)}" alt="">` : '<div class="pg-img-none">No picture yet</div>'}
          <div class="pg-img-fields">
            <label>From the Gallery <select data-f="gallery_id"><option value="">—</option>${gallery.map(g => `<option value="${g.id}"${g.id === b.gallery_id ? ' selected' : ''}>${esc(g.caption || g.taken_on || 'Picture')}</option>`).join('')}</select></label>
            <label>Or upload <input type="file" accept="image/*" data-upload></label>
            <label>Or a link <input data-f="url" value="${esc(b.url)}" placeholder="https://…"></label>
            <label>Caption <input data-f="caption" value="${esc(b.caption)}"></label>
          </div>
        </div>`;
    }
    return '';
  }

  WK.pages = { load, reset, list: () => pages, create, update, move, remove, missing: () => missing, sectionOf: p => nameOf(p) };
})();
