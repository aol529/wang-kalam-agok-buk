/* Gallery: pictures with a caption, a category and a date. View shows
   them as a wall (click one to see it large); Edit adds, changes and
   deletes them. Blog posts take their covers from here. Files sit in the
   private "gallery" bucket and show through signed links. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;
  const BUCKET = 'gallery';
  const TYPES = /^image\/(jpeg|png|webp|gif)$/;

  let items = [];             // newest first
  let signed = {};            // path -> signed URL
  let editMode = WK.store('wk_gallery_edit') === '1';
  let filter = '';
  let shown = [];             // what the wall shows, for the viewer's arrows

  WK.gallery = () => items;
  WK.galleryUrl = id => { const it = items.find(i => i.id === id); return it ? signed[it.path] || '' : ''; };

  WK.section({ name: 'gallery', label: 'Gallery', load, render, reset(){ items = []; signed = {}; } });

  async function load(){
    const { data, error } = await WK.db.from('gallery_items').select('*')
      .order('taken_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;
    items = data || [];
    await signAll();
  }
  async function signAll(){
    const paths = items.map(i => i.path).filter(p => p && !signed[p]);
    if (!paths.length) return;
    const { data } = await WK.db.storage.from(BUCKET).createSignedUrls(paths, 86400);
    (data || []).forEach(r => { if (r.signedUrl) signed[r.path] = r.signedUrl; });
  }
  function sortItems(){
    items.sort((a, b) => (b.taken_on || '').localeCompare(a.taken_on || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // Upload pictures and add them to the gallery. Returns the new rows.
  // The Blog's cover picker uses this too.
  WK.uploadPhotos = async (files, fields) => {
    const added = [];
    for (const f of files){
      if (!TYPES.test(f.type)){ WK.toast(f.name + ' is not a JPEG, PNG, WebP or GIF.'); continue; }
      if (f.size > 10485760){ WK.toast(f.name + ' is over 10 MB.'); continue; }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = WK.user.id + '/' + crypto.randomUUID() + '.' + ext;
      const up = await WK.db.storage.from(BUCKET).upload(path, f, { contentType: f.type });
      if (up.error){ WK.toast('Not uploaded: ' + up.error.message); continue; }
      const row = Object.assign({ path, caption: '', category: '', taken_on: WK.isoDate(new Date(f.lastModified || Date.now())) }, fields);
      const { data, error } = await WK.db.from('gallery_items').insert([row]).select().single();
      if (error){ WK.db.storage.from(BUCKET).remove([path]); WK.toast('Not saved: ' + error.message); continue; }
      items.push(data);
      added.push(data);
    }
    sortItems();
    await signAll();
    return added;
  };

  function render(){
    const el = $('section-gallery');
    const used = [...new Set(items.map(i => i.category).filter(Boolean))];
    const cats = WK.blogCategories ? WK.blogCategories().filter(c => used.includes(c)) : used;
    if (filter && !used.includes(filter)) filter = '';
    shown = items.filter(i => !filter || i.category === filter);
    el.innerHTML = `
      <div class="section-head">
        <h1>Gallery</h1>
        <div class="toolbar">
          ${modeToggle('gallery-mode', editMode)}
          ${editMode ? `<label class="btn primary">+ Add pictures <input type="file" id="g-files" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label>` : ''}
        </div>
      </div>
      ${cats.length ? `<div class="cat-chips">
        <button type="button" data-cat="" aria-pressed="${!filter}">All <span class="count">${items.length}</span></button>
        ${cats.map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${filter === c}">${catIcon(c)}${esc(c)} <span class="count">${items.filter(i => i.category === c).length}</span></button>`).join('')}
      </div>` : ''}
      ${shown.length ? `<div class="photo-wall${editMode ? ' editing' : ''}">${shown.map(tile).join('')}</div>`
        : `<p class="empty">${items.length ? 'No pictures in this category.' : editMode ? 'No pictures yet. Add some with “+ Add pictures”.' : 'No pictures yet. Switch to Edit to add some.'}</p>`}`;

    wireMode(el, 'gallery-mode', on => { editMode = on; WK.store('wk_gallery_edit', on ? '1' : '0'); render(); });
    el.querySelectorAll('[data-cat]').forEach(b => { b.onclick = () => { filter = b.dataset.cat; render(); }; });
    el.querySelectorAll('[data-photo]').forEach(t => {
      const open = () => editMode ? openPhoto(items.find(i => i.id === t.dataset.photo)) : view(shown.findIndex(i => i.id === t.dataset.photo));
      t.onclick = open;
      t.onkeydown = e => { if (e.key === 'Enter') open(); };
    });
    if ($('g-files')) $('g-files').onchange = async e => {
      const files = [...e.target.files];
      if (!files.length) return;
      el.classList.add('loading');
      const added = await WK.uploadPhotos(files, filter ? { category: filter } : {});
      el.classList.remove('loading');
      if (added.length) WK.toast(added.length === 1 ? 'Picture added.' : added.length + ' pictures added.');
      render();
    };
  }
  function tile(i){
    const src = signed[i.path] || '';
    return `
      <figure class="photo" data-photo="${i.id}" tabindex="0">
        ${src ? `<img src="${esc(src)}" alt="${esc(i.caption)}" loading="lazy">` : '<div class="photo-missing">Picture unavailable</div>'}
        ${i.caption || i.category || editMode ? `<figcaption>${i.caption ? esc(i.caption) : ''}${i.category ? ` <span class="muted">${catIcon(i.category)}</span>` : ''}${editMode ? '<span class="photo-edit">✎ Edit</span>' : ''}</figcaption>` : ''}
      </figure>`;
  }
  const catIcon = c => { const k = F.CATEGORIES.find(x => x.name === c); return k ? k.icon + ' ' : ''; };
  WK.catIcon = catIcon;

  /* ------------------- View / Edit switch (Blog uses it too) ------------------- */
  function modeToggle(id, on){
    return `<nav class="subtabs mode-toggle" id="${id}" aria-label="Mode">
      <button type="button" data-mode="view" aria-selected="${!on}">View</button>
      <button type="button" data-mode="edit" aria-selected="${on}">✎ Edit</button>
    </nav>`;
  }
  function wireMode(root, id, set){
    root.querySelectorAll('#' + id + ' [data-mode]').forEach(b => { b.onclick = () => set(b.dataset.mode === 'edit'); });
  }
  WK.modeToggle = modeToggle;
  WK.wireMode = wireMode;

  /* --------------------------- Viewer (View mode) --------------------------- */
  let at = 0;
  function view(i){
    if (i < 0 || !shown.length) return;
    at = (i + shown.length) % shown.length;
    const it = shown[at];
    $('viewer-img').src = signed[it.path] || '';
    $('viewer-img').alt = it.caption || '';
    $('viewer-caption').innerHTML = [it.caption ? esc(it.caption) : '', it.category ? catIcon(it.category) + esc(it.category) : '',
      it.taken_on ? esc(WK.fmtDate(it.taken_on)) : ''].filter(Boolean).join(' · ');
    $('viewer-prev').hidden = $('viewer-next').hidden = shown.length < 2;
    if (!$('viewer').open) $('viewer').showModal();
  }

  /* ---------------------------- Edit a picture ---------------------------- */
  let editing = null;
  function openPhoto(it){
    if (!it) return;
    editing = it;
    const form = $('photo-form');
    $('photo-preview').innerHTML = signed[it.path] ? `<img src="${esc(signed[it.path])}" alt="">` : '<span>Picture unavailable</span>';
    $('post-cats').innerHTML = WK.blogCategories().map(c => `<option value="${esc(c)}">`).join('');
    form.caption.value = it.caption || '';
    form.category.value = it.category || '';
    form.taken_on.value = it.taken_on || '';
    $('photo-error').textContent = '';
    $('photo-dialog').showModal();
    form.caption.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('viewer-close').onclick = () => $('viewer').close();
    $('viewer-prev').onclick = () => view(at - 1);
    $('viewer-next').onclick = () => view(at + 1);
    $('viewer').onkeydown = e => { if (e.key === 'ArrowLeft') view(at - 1); if (e.key === 'ArrowRight') view(at + 1); };
    // Click outside the picture to close.
    $('viewer').onclick = e => { if (e.target === $('viewer')) $('viewer').close(); };

    const dlg = $('photo-dialog');
    const form = $('photo-form');
    $('photo-cancel').onclick = () => dlg.close();
    form.onsubmit = async ev => {
      ev.preventDefault();
      const btn = $('photo-save');
      btn.disabled = true;
      const fields = { caption: form.caption.value.trim(), category: form.category.value.trim(), taken_on: form.taken_on.value || null, updated_at: new Date().toISOString() };
      const { data, error } = await WK.db.from('gallery_items').update(fields).eq('id', editing.id).select().single();
      btn.disabled = false;
      if (error){ $('photo-error').textContent = 'Not saved: ' + error.message; return; }
      items[items.findIndex(i => i.id === data.id)] = data;
      sortItems();
      dlg.close();
      WK.refresh();
      WK.toast('Saved.');
    };
    $('photo-delete').onclick = async () => {
      const used = WK.posts ? WK.posts().filter(p => p.cover_id === editing.id).length : 0;
      if (!confirm('Delete this picture?' + (used ? ' It is the cover of ' + used + (used === 1 ? ' blog post.' : ' blog posts.') : ''))) return;
      const { error } = await WK.db.from('gallery_items').delete().eq('id', editing.id);
      if (error){ $('photo-error').textContent = 'Not deleted: ' + error.message; return; }
      WK.db.storage.from(BUCKET).remove([editing.path]);
      items = items.filter(i => i.id !== editing.id);
      if (WK.dropCover) WK.dropCover(editing.id);
      dlg.close();
      WK.refresh();
      WK.toast('Deleted.');
    };
  });
})();
