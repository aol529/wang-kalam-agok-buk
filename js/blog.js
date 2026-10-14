/* Blog: posts in the seven life areas, the starter categories, or any
   category you add. View reads the published posts like a blog; Edit
   lists drafts and published posts to write, change and delete. "Blog
   it" in a journal entry starts a post from it. Covers come from the
   Gallery. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  let posts = [];             // newest first
  let editMode = WK.store('wk_blog_edit') === '1';
  let filter = '';
  let reading = null;         // id of the post open in View

  WK.posts = () => posts;
  // A deleted gallery picture is no longer anyone's cover.
  WK.dropCover = id => posts.forEach(p => { if (p.cover_id === id) p.cover_id = null; });

  WK.section({ name: 'blog', label: 'Blog', load, render, reset(){ posts = []; reading = null; } });

  async function load(){
    const { data, error } = await WK.db.from('blog_posts').select('*')
      .order('published_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;
    posts = data || [];
  }
  function sortPosts(){
    posts.sort((a, b) => (b.published_on || '').localeCompare(a.published_on || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // The seven life areas first, then any category you've added.
  WK.blogCategories = () => {
    const starters = F.CATEGORIES.map(c => c.name);
    const extra = [...posts.map(p => p.category), ...(WK.gallery ? WK.gallery().map(i => i.category) : [])]
      .filter(c => c && !starters.includes(c));
    return [...starters, ...[...new Set(extra)].sort()];
  };

  // From the Journal: open the post already made from this entry, or start one.
  WK.blogIt = fields => {
    const had = fields.source_entry_id && posts.find(p => p.source_entry_id === fields.source_entry_id);
    editMode = true; WK.store('wk_blog_edit', '1');
    reading = null;
    WK.show('blog');
    openPost(had || null, had ? null : fields);
    if (had) WK.toast('This entry is already a post. Opening it.');
  };

  const coverOf = p => p.cover_id && WK.galleryUrl ? WK.galleryUrl(p.cover_id) : '';
  const paragraphs = text => String(text || '').trim().split(/\n{2,}/).map(t => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('');
  const excerpt = text => { const t = String(text || '').replace(/\s+/g, ' ').trim(); return t.length > 180 ? t.slice(0, 180) + '…' : t; };
  const catChip = c => `<span class="chip post-cat">${WK.catIcon ? WK.catIcon(c) : ''}${esc(c)}</span>`;

  function render(){
    const el = $('section-blog');
    el.innerHTML = `
      <div class="section-head">
        <h1>Blog</h1>
        <div class="toolbar">
          ${WK.modeToggle('blog-mode', editMode)}
          ${editMode ? '<button type="button" class="btn primary" id="post-new">+ New post</button>' : ''}
        </div>
      </div>
      ${editMode ? editHtml() : readHtml()}`;

    WK.wireMode(el, 'blog-mode', on => { editMode = on; WK.store('wk_blog_edit', on ? '1' : '0'); reading = null; render(); });
    if ($('post-new')) $('post-new').onclick = () => openPost(null, { category: filter || 'Personal Development' });
    el.querySelectorAll('[data-cat]').forEach(b => { b.onclick = () => { filter = b.dataset.cat; render(); }; });
    el.querySelectorAll('[data-post]').forEach(a => {
      const open = () => {
        const p = posts.find(x => x.id === a.dataset.post);
        if (editMode) openPost(p);
        else { reading = p.id; render(); window.scrollTo(0, 0); }
      };
      a.onclick = open;
      a.onkeydown = e => { if (e.key === 'Enter') open(); };
    });
    if ($('post-back')) $('post-back').onclick = () => { reading = null; render(); };
    if ($('post-edit')) $('post-edit').onclick = () => openPost(posts.find(x => x.id === reading));
  }

  // Category chips: the seven, then your own. Counts are of `list`.
  function catChips(list){
    const cats = WK.blogCategories();
    if (filter && !cats.includes(filter)) filter = '';
    return `<div class="cat-chips">
      <button type="button" data-cat="" aria-pressed="${!filter}">All <span class="count">${list.length}</span></button>
      ${cats.map(c => { const n = list.filter(p => p.category === c).length;
        return `<button type="button" data-cat="${esc(c)}" aria-pressed="${filter === c}"${n ? '' : ' class="none"'}>${WK.catIcon(c)}${esc(c)} <span class="count">${n}</span></button>`; }).join('')}
    </div>`;
  }

  function readHtml(){
    const published = posts.filter(p => p.status === 'published');
    const p = reading && published.find(x => x.id === reading);
    if (p){
      const cover = coverOf(p);
      return `
        <article class="post-read">
          <div class="post-read-bar">
            <button type="button" class="btn ghost small" id="post-back">← All posts</button>
            <button type="button" class="btn small" id="post-edit">✎ Edit</button>
          </div>
          ${cover ? `<img class="post-cover" src="${esc(cover)}" alt="">` : ''}
          <div class="post-meta">${catChip(p.category)}${p.published_on ? `<span class="muted small">${esc(WK.fmtDate(p.published_on, { day: 'numeric', month: 'long', year: 'numeric' }))}</span>` : ''}</div>
          <h2 class="post-title">${esc(p.title || 'Untitled')}</h2>
          <div class="post-body">${paragraphs(p.body)}</div>
        </article>`;
    }
    reading = null;
    const list = published.filter(x => !filter || x.category === filter);
    return `
      ${catChips(published)}
      ${list.length ? `<div class="post-grid">${list.map(x => {
        const cover = coverOf(x);
        return `
          <article class="post-card" data-post="${x.id}" tabindex="0">
            <div class="post-card-img"${cover ? ` style="background-image:url('${esc(cover)}')"` : ''}>${cover ? '' : `<span>${WK.catIcon(x.category) || '📝'}</span>`}</div>
            <div class="post-card-body">
              <div class="post-meta">${catChip(x.category)}${x.published_on ? `<span class="muted small">${esc(WK.fmtDate(x.published_on))}</span>` : ''}</div>
              <h3>${esc(x.title || 'Untitled')}</h3>
              <p class="muted small">${esc(excerpt(x.body))}</p>
            </div>
          </article>`; }).join('')}</div>`
        : `<p class="empty">${published.length ? 'Nothing published in this category yet.' : 'Nothing published yet. Switch to Edit to write a post, or use “Blog it” on a journal entry.'}</p>`}`;
  }

  function editHtml(){
    const list = posts.filter(p => !filter || p.category === filter);
    const drafts = posts.filter(p => p.status === 'draft').length;
    return `
      <p class="lead">${posts.length} ${posts.length === 1 ? 'post' : 'posts'}, ${drafts} ${drafts === 1 ? 'draft' : 'drafts'}. Drafts only show here; publish one to see it in View.</p>
      ${catChips(posts)}
      ${list.length ? `<div class="post-rows">${list.map(p => `
        <article class="post-row" data-post="${p.id}" tabindex="0">
          <span class="chip ${p.status === 'published' ? 'status-pub' : 'status-draft'}">${p.status === 'published' ? 'Published' : 'Draft'}</span>
          <div class="post-row-main">
            <b>${esc(p.title || 'Untitled')}</b>
            <span class="muted small">${WK.catIcon(p.category)}${esc(p.category)}${p.published_on ? ' · ' + esc(WK.fmtDate(p.published_on)) : ''}${p.source_entry_id ? ' · from the Journal' : ''}</span>
          </div>
          <span class="muted small">Edit →</span>
        </article>`).join('')}</div>`
        : `<p class="empty">${posts.length ? 'No posts in this category.' : 'No posts yet. Start one with “+ New post”, or use “Blog it” on a journal entry.'}</p>`}`;
  }

  /* ------------------------------ Post editor ------------------------------ */
  let editing = null;
  let coverId = null;

  function openPost(p, preset){
    const form = $('post-form');
    editing = p || null;
    const v = p || Object.assign({ title: '', body: '', category: 'Personal Development', status: 'draft', published_on: null, cover_id: null, source_entry_id: null }, preset);
    $('post-dialog-title').textContent = p ? 'Edit post' : 'New post';
    $('post-cats').innerHTML = WK.blogCategories().map(c => `<option value="${esc(c)}">`).join('');
    form.title.value = v.title || '';
    form.category.value = v.category || '';
    form.status.value = v.status || 'draft';
    form.published_on.value = v.published_on || '';
    form.body.value = v.body || '';
    form.dataset.source = v.source_entry_id || '';
    $('post-source').hidden = !v.source_entry_id;
    coverId = v.cover_id || null;
    $('cover-picker').hidden = true;
    drawCover();
    $('post-delete').hidden = !p;
    $('post-error').textContent = '';
    $('post-dialog').showModal();
    (v.title ? form.body : form.title).focus();
  }

  function drawCover(){
    const src = coverId && WK.galleryUrl ? WK.galleryUrl(coverId) : '';
    $('cover-preview').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '<span>No cover</span>';
    $('cover-clear').hidden = !coverId;
  }
  function drawPicker(){
    const pics = WK.gallery ? WK.gallery() : [];
    $('cover-grid').innerHTML = pics.length ? pics.map(i => {
      const src = WK.galleryUrl(i.id);
      return src ? `<button type="button" class="cover-pick${i.id === coverId ? ' on' : ''}" data-cover="${i.id}" title="${esc(i.caption)}"><img src="${esc(src)}" alt="${esc(i.caption)}" loading="lazy"></button>` : '';
    }).join('') : '<p class="empty">The Gallery is empty. Upload a picture here and it goes into the Gallery too.</p>';
    $('cover-grid').querySelectorAll('[data-cover]').forEach(b => {
      b.onclick = () => { coverId = b.dataset.cover; drawCover(); $('cover-picker').hidden = true; };
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = $('post-dialog');
    const form = $('post-form');
    $('post-cancel').onclick = () => dlg.close();
    $('cover-choose').onclick = () => { const p = $('cover-picker'); p.hidden = !p.hidden; if (!p.hidden) drawPicker(); };
    $('cover-clear').onclick = () => { coverId = null; drawCover(); };
    $('cover-file').onchange = async e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      $('cover-status').textContent = 'Uploading…';
      const cat = form.category.value.trim();
      const added = await WK.uploadPhotos(files, { caption: form.title.value.trim(), category: cat });
      $('cover-status').textContent = '';
      if (added.length){ coverId = added[0].id; drawCover(); $('cover-picker').hidden = true; }
    };
    // Publishing without a date publishes it today.
    form.status.onchange = () => { if (form.status.value === 'published' && !form.published_on.value) form.published_on.value = WK.isoDate(); };

    form.onsubmit = async ev => {
      ev.preventDefault();
      const title = form.title.value.trim(), body = form.body.value.trim();
      if (!title){ form.title.focus(); return; }
      const btn = $('post-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      $('post-error').textContent = '';
      const status = form.status.value;
      const fields = {
        title, body,
        category: form.category.value.trim() || 'Personal Development',
        status,
        published_on: form.published_on.value || (status === 'published' ? WK.isoDate() : null),
        cover_id: coverId,
        source_entry_id: form.dataset.source || null,
        updated_at: new Date().toISOString()
      };
      try {
        const q = editing ? WK.db.from('blog_posts').update(fields).eq('id', editing.id) : WK.db.from('blog_posts').insert([fields]);
        const { data, error } = await q.select().single();
        if (error) throw error;
        const i = posts.findIndex(x => x.id === data.id);
        if (i >= 0) posts[i] = data; else posts.push(data);
        sortPosts();
        dlg.close();
        WK.refresh();
        WK.toast(status === 'published' ? 'Published.' : 'Draft saved.');
      } catch (err){
        $('post-error').textContent = 'Not saved: ' + err.message;
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    };

    $('post-delete').onclick = async () => {
      if (!editing || !confirm('Delete the post "' + (editing.title || 'Untitled') + '"? The journal entry and the cover picture stay.')) return;
      const { error } = await WK.db.from('blog_posts').delete().eq('id', editing.id);
      if (error){ $('post-error').textContent = 'Not deleted: ' + error.message; return; }
      posts = posts.filter(x => x.id !== editing.id);
      if (reading === editing.id) reading = null;
      dlg.close();
      WK.refresh();
      WK.toast('Deleted.');
    };
  });
})();
