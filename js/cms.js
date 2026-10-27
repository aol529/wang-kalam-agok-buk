/* CMS: one place to change the site itself.
   Content: the built-in text and lists (content.js), each edited as plain
   text, saved over the original, and reset to it in one tap.
   Pages: your own pages (pages.js), new, in order, in or out of the menu.
   Menu: the order of the sections in Do, Reflect and Keep, which group
   each is in, and which are hidden.
   Public site: switch on public.html, give it a title, a tagline and an
   about, and choose the posts, pages and pictures it shows. */
(function(){
  const { $, esc } = WK;
  const C = WK.content;

  let tab = WK.store('wk_cms_tab') || 'content';
  let menuRow = null;         // the saved menu, or null for the original
  let site = null;            // the 'public_site' row's value
  let openPart = null;        // the content part being edited

  WK.section({ name: 'cms', label: 'CMS', icon: 'cms', group: 'Keep', render, load,
    reset(){ C.resetAll(); WK.pages.reset(); menuRow = null; site = null; WK.setMenu(null); } });

  async function load(){
    const [rows] = await Promise.all([C.load(), WK.pages.load()]);
    const m = rows.find(r => r.key === 'menu'), s = rows.find(r => r.key === 'public_site');
    menuRow = m ? m.value : null;
    site = s ? s.value : null;
    WK.setMenu(menuRow);
  }
  // From a page's editor: a page that changes group leaves its place in the saved menu.
  WK.cmsUnplace = async name => {
    if (!menuRow || !menuRow.groups) return;
    menuRow.groups.forEach(g => { g.items = g.items.filter(n => n !== name); });
    WK.setMenu(menuRow);
    try { await C.put('menu', menuRow); } catch (e) {}
  };

  const needsSql = () => C.missing() || WK.pages.missing();

  function render(){
    const el = $('section-cms');
    el.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Content management</span><h1>CMS</h1></div></div>
      ${needsSql() ? '<p class="panel empty">Run <code>sql/08-cms.sql</code> in Supabase to start. Until then the site uses its original content.</p>' : ''}
      <nav class="subtabs" id="cms-tabs">${[['content', 'Content'], ['pages', 'Pages'], ['menu', 'Menu'], ['public', 'Public site']].map(([k, l]) =>
        `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</nav>
      <div class="cms-pane">${needsSql() ? '' : tab === 'pages' ? pagesHtml() : tab === 'menu' ? menuHtml() : tab === 'public' ? publicHtml() : contentHtml()}</div>`;
    el.querySelectorAll('#cms-tabs [data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; WK.store('wk_cms_tab', tab); draft = null; render(); }; });
    if (needsSql()) return;
    ({ content: bindContent, pages: bindPages, menu: bindMenu, public: bindPublic })[tab](el);
  }

  // ------------------------------------------------------------- Content
  function contentHtml(){
    const parts = C.parts(), groups = [...new Set(parts.map(p => p.group))];
    return `
      <p class="lead">The words and lists the site is built on. Change any of them here; the original is kept, and “Reset” brings it back.</p>
      ${groups.map(g => `
        <h2 class="cms-group">${esc(g)}</h2>
        <div class="cms-parts">${parts.filter(p => p.group === g).map(p => `
          <details class="panel cms-part" data-part="${esc(p.key)}"${openPart === p.key ? ' open' : ''}>
            <summary><b>${esc(p.label)}</b>${C.edited(p.key) ? '<span class="chip status-pub">Edited</span>' : ''}<span class="muted small">${esc(p.where)}</span></summary>
            <p class="muted small">${esc(p.help)}</p>
            <textarea rows="${Math.min(24, Math.max(4, C.text(p.key).split('\n').length + 1))}" spellcheck="true">${esc(C.text(p.key))}</textarea>
            <p class="cms-error" role="alert"></p>
            <div class="toolbar">
              <button type="button" class="btn primary small" data-save>Save</button>
              <button type="button" class="btn ghost small" data-undo>Undo changes</button>
              ${C.edited(p.key) ? '<button type="button" class="btn ghost small" data-reset>Reset to the original</button>' : ''}
            </div>
          </details>`).join('')}
        </div>`).join('')}`;
  }
  function bindContent(el){
    el.querySelectorAll('.cms-part').forEach(d => {
      const key = d.dataset.part, ta = d.querySelector('textarea'), err = d.querySelector('.cms-error');
      d.ontoggle = () => { if (d.open) openPart = key; else if (openPart === key) openPart = null; };
      d.querySelector('[data-save]').onclick = async () => {
        err.textContent = '';
        try { await C.save(key, ta.value); WK.toast('Saved. The site uses it now.'); render(); }
        catch (e){ err.textContent = e.message; }
      };
      d.querySelector('[data-undo]').onclick = () => { ta.value = C.text(key); err.textContent = ''; };
      const r = d.querySelector('[data-reset]');
      if (r) r.onclick = async () => {
        if (!r.dataset.armed){ r.dataset.armed = '1'; r.textContent = 'Tap again to reset'; return; }
        try { await C.reset(key); WK.toast('Back to the original.'); render(); } catch (e){ err.textContent = e.message; }
      };
    });
  }

  // --------------------------------------------------------------- Pages
  function pagesHtml(){
    const list = WK.pages.list();
    return `
      <p class="lead">Pages you build from blocks: text, headings, pictures, checklists, quotes. Each can sit in the menu and on the public site.</p>
      <form class="toolbar cms-new" id="cms-new-page">
        <input name="title" placeholder="Title of a new page" aria-label="Title of a new page" required>
        <button class="btn primary">+ New page</button>
      </form>
      ${list.length ? `<div class="cms-rows">${list.map((p, i) => `
        <div class="panel cms-row" data-page="${p.id}">
          <span class="cms-row-icon">${WK.icon(p.icon)}</span>
          <span class="cms-row-main"><b>${esc(p.title || 'Untitled')}</b>
            <span class="muted small">${esc(p.grp)}${p.in_menu ? '' : ' · not in the menu'}${p.public ? ' · 🌍 public' : ''} · ${p.blocks.length} block${p.blocks.length === 1 ? '' : 's'}</span></span>
          <span class="toolbar">
            <button type="button" class="btn ghost small" data-move="-1" aria-label="Move up"${i ? '' : ' disabled'}>↑</button>
            <button type="button" class="btn ghost small" data-move="1" aria-label="Move down"${i < list.length - 1 ? '' : ' disabled'}>↓</button>
            <button type="button" class="btn small" data-open>Open</button>
          </span>
        </div>`).join('')}</div>` : '<p class="empty">No pages yet. Give one a title above.</p>'}`;
  }
  function bindPages(el){
    $('cms-new-page').onsubmit = async e => {
      e.preventDefault();
      try { await WK.pages.create({ title: e.target.title.value.trim() }); } catch (err){ WK.toast('Not made: ' + err.message); }
    };
    el.querySelectorAll('[data-page]').forEach(row => {
      const id = row.dataset.page;
      row.querySelector('[data-open]').onclick = () => WK.show(WK.pages.sectionOf({ id }));
      row.querySelectorAll('[data-move]').forEach(b => { b.onclick = async () => { await WK.pages.move(id, Number(b.dataset.move)); render(); }; });
    });
  }

  // ---------------------------------------------------------------- Menu
  let draft = null;           // the menu being arranged: [{ name, items: [names] }], hidden: Set
  function startDraft(){
    draft = { groups: WK.menuGroups(true).map(g => ({ name: g.name, items: g.items.map(s => s.name) })), hidden: new Set((menuRow && menuRow.hidden) || []) };
  }
  function menuHtml(){
    if (!draft) startDraft();
    const label = n => { const s = WK.sections().find(x => x.name === n); return s ? s : null; };
    return `
      <p class="lead">The order of the menu, which group each section sits in, and what's hidden. Today and the CMS always stay.</p>
      <div class="cms-menu">${draft.groups.map((g, gi) => `
        <section class="panel">
          <h2>${esc(g.name)}</h2>
          <ul class="cms-menu-list">${g.items.map((n, i) => { const s = label(n); if (!s) return ''; const fixed = n === 'today' || n === 'cms'; return `
            <li data-g="${gi}" data-i="${i}" class="${draft.hidden.has(n) && !fixed ? 'is-hidden' : ''}">
              <span class="cms-row-icon">${WK.icon(s.icon || s.name)}</span><span class="cms-menu-name">${esc(s.label)}</span>
              <button type="button" class="btn ghost small" data-mv="-1" aria-label="Move up"${i ? '' : ' disabled'}>↑</button>
              <button type="button" class="btn ghost small" data-mv="1" aria-label="Move down"${i < g.items.length - 1 ? '' : ' disabled'}>↓</button>
              <select data-grp aria-label="Group">${draft.groups.map((x, xi) => `<option value="${xi}"${xi === gi ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
              ${fixed ? '<span class="muted small">always</span>' : `<label class="check small"><input type="checkbox" data-show${draft.hidden.has(n) ? '' : ' checked'}> Show</label>`}
            </li>`; }).join('')}
          </ul>
        </section>`).join('')}
      </div>
      <div class="toolbar">
        <button type="button" class="btn primary" id="cms-menu-save">Save the menu</button>
        <button type="button" class="btn ghost" id="cms-menu-undo">Undo changes</button>
        ${menuRow ? '<button type="button" class="btn ghost" id="cms-menu-reset">Back to the original menu</button>' : ''}
      </div>`;
  }
  function bindMenu(el){
    el.querySelectorAll('.cms-menu-list li').forEach(li => {
      const gi = Number(li.dataset.g), i = Number(li.dataset.i), items = draft.groups[gi].items, n = items[i];
      li.querySelectorAll('[data-mv]').forEach(b => { b.onclick = () => { const j = i + Number(b.dataset.mv); [items[i], items[j]] = [items[j], items[i]]; render(); }; });
      li.querySelector('[data-grp]').onchange = e => { items.splice(i, 1); draft.groups[Number(e.target.value)].items.push(n); render(); };
      const show = li.querySelector('[data-show]');
      if (show) show.onchange = () => { if (show.checked) draft.hidden.delete(n); else draft.hidden.add(n); li.classList.toggle('is-hidden', !show.checked); };
    });
    $('cms-menu-save').onclick = async () => {
      const value = { groups: draft.groups, hidden: [...draft.hidden] };
      try {
        await C.put('menu', value);
        menuRow = value; WK.setMenu(menuRow);
        // A page moved to another group takes that group as its own.
        draft.groups.forEach(g => g.items.forEach(n => {
          const p = WK.pages.list().find(x => WK.pages.sectionOf(x) === n);
          if (p && p.grp !== g.name) WK.pages.update(p.id, { grp: g.name });
        }));
        WK.toast('Menu saved.');
      } catch (e){ WK.toast('Not saved: ' + e.message); }
    };
    $('cms-menu-undo').onclick = () => { startDraft(); render(); };
    if ($('cms-menu-reset')) $('cms-menu-reset').onclick = async () => {
      try { await C.drop('menu'); menuRow = null; WK.setMenu(null); startDraft(); render(); WK.toast('The original menu is back.'); }
      catch (e){ WK.toast('Not reset: ' + e.message); }
    };
  }

  // --------------------------------------------------------- Public site
  const publicUrl = () => location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + 'public.html';
  function publicHtml(){
    const s = site || {};
    const posts = (WK.posts ? WK.posts() : []).filter(p => p.status === 'published');
    const pages = WK.pages.list();
    const pics = WK.gallery ? WK.gallery() : [];
    return `
      <p class="lead">A public website made from what you choose to share. Nothing is public until you switch the site on and mark it.</p>
      <section class="panel cms-public">
        <label class="check cms-switch"><input type="checkbox" id="pub-on"${s.enabled ? ' checked' : ''}> <b>The public site is ${s.enabled ? 'on' : 'off'}</b></label>
        ${s.enabled ? `<p class="small">Its address: <a href="${esc(publicUrl())}" target="_blank" rel="noopener">${esc(publicUrl())}</a></p>` : ''}
        <div class="row2">
          <label>Title <input id="pub-title" value="${esc(s.title || "Wang' Kalam Agok Buk")}"></label>
          <label>Tagline <input id="pub-tagline" value="${esc(s.tagline || '')}" placeholder="One line under the title"></label>
        </div>
        <label>About <textarea id="pub-about" rows="5" placeholder="Who you are and what this site is. Markdown works.">${esc(s.about || '')}</textarea></label>
        <div class="toolbar"><button type="button" class="btn primary" id="pub-save">Save</button><span class="muted small" id="pub-status"></span></div>
      </section>

      <section class="panel">
        <h2>Blog posts <span class="muted small">published ones only</span></h2>
        ${posts.length ? `<ul class="cms-pick">${posts.map(p => `<li><label class="check"><input type="checkbox" data-pub-post="${p.id}"${p.public ? ' checked' : ''}> <span>${esc(p.title || 'Untitled')} <span class="muted small">${esc(p.published_on || '')}</span></span></label></li>`).join('')}</ul>`
          : '<p class="empty">Nothing published yet.</p>'}
      </section>

      <section class="panel">
        <h2>Pages</h2>
        ${pages.length ? `<ul class="cms-pick">${pages.map(p => `<li><label class="check"><input type="checkbox" data-pub-page="${p.id}"${p.public ? ' checked' : ''}> <span>${esc(p.title || 'Untitled')}</span></label></li>`).join('')}</ul>`
          : '<p class="empty">No pages yet.</p>'}
      </section>

      <section class="panel">
        <h2>Gallery <span class="muted small">pictures a public post or page uses are shown with it anyway</span></h2>
        ${pics.length ? `<div class="cms-pics">${pics.map(g => `
          <label class="cms-pic${g.public ? ' on' : ''}"><img src="${esc(WK.galleryUrl(g.id))}" alt="" loading="lazy"><input type="checkbox" data-pub-pic="${g.id}"${g.public ? ' checked' : ''} aria-label="Public: ${esc(g.caption || 'picture')}"></label>`).join('')}</div>`
          : '<p class="empty">No pictures yet.</p>'}
      </section>`;
  }
  function bindPublic(el){
    const value = () => ({ enabled: $('pub-on').checked, title: $('pub-title').value.trim(), tagline: $('pub-tagline').value.trim(), about: $('pub-about').value });
    const saveSite = async () => {
      try { const v = value(); await C.put('public_site', v); site = v; $('pub-status').textContent = 'Saved'; return true; }
      catch (e){ $('pub-status').textContent = 'Not saved: ' + e.message; return false; }
    };
    $('pub-save').onclick = saveSite;
    $('pub-on').onchange = async () => { if (await saveSite()) render(); else $('pub-on').checked = !$('pub-on').checked; };
    const flag = (sel, table, list) => el.querySelectorAll(sel).forEach(box => {
      box.onchange = async () => {
        const id = Object.values(box.dataset)[0];
        const { error } = await WK.db.from(table).update({ public: box.checked }).eq('id', id);
        if (error){ box.checked = !box.checked; WK.toast('Not saved: ' + error.message); return; }
        const row = list().find(x => x.id === id);
        if (row) row.public = box.checked;
        const pic = box.closest('.cms-pic');
        if (pic) pic.classList.toggle('on', box.checked);
      };
    });
    flag('[data-pub-post]', 'blog_posts', () => WK.posts());
    flag('[data-pub-page]', 'pages', () => WK.pages.list());
    flag('[data-pub-pic]', 'gallery_items', () => WK.gallery());
  }
})();
