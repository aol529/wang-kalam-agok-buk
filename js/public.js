/* The public site: what the owner chose to share from WKAB, read
   without signing in. The about, public pages, public blog posts and
   pictures. Row level security decides what can be read (sql/08-cms.sql);
   this page only lays it out. Routes: #/ (home), #/blog, #/post/<id>,
   #/page/<slug>, #/gallery. */
(function(){
  const { esc } = WK;
  const $ = id => document.getElementById(id);
  const cfg = window.VB_CONFIG || {};
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } });

  let site = null, owner = null, pages = [], posts = [], pics = [];
  const signed = {};          // gallery id -> signed URL

  const fmt = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const imgOf = b => (b.gallery_id && signed[b.gallery_id]) || '';
  const excerpt = t => { t = String(t || '').replace(/[*#>\[\]]/g, '').replace(/\(https?:[^)]*\)/g, '').replace(/\s+/g, ' ').trim(); return t.length > 200 ? t.slice(0, 200) + '…' : t; };

  async function load(){
    const s = await db.from('site_content').select('owner_id,value').eq('key', 'public_site').order('created_at').limit(1);
    if (s.error || !s.data || !s.data.length) return false;
    site = s.data[0].value; owner = s.data[0].owner_id;
    const [p, b, g] = await Promise.all([
      db.from('pages').select('id,title,slug,icon,blocks,sort').eq('owner_id', owner).order('sort'),
      db.from('blog_posts').select('id,title,body,category,published_on,cover_id').eq('owner_id', owner).order('published_on', { ascending: false }),
      db.from('gallery_items').select('id,path,caption,taken_on,public').eq('owner_id', owner).order('taken_on', { ascending: false })
    ]);
    pages = p.data || []; posts = b.data || [];
    const all = g.data || [];
    pics = all.filter(x => x.public);
    if (all.length){
      const r = await db.storage.from('gallery').createSignedUrls(all.map(x => x.path), 3600);
      (r.data || []).forEach((u, i) => { if (u.signedUrl) signed[all[i].id] = u.signedUrl; });
    }
    return true;
  }

  function nav(){
    const links = [['#/', 'Home'], ...(posts.length ? [['#/blog', 'Blog']] : []), ...pages.map(p => ['#/page/' + p.slug, p.title]), ...(pics.length ? [['#/gallery', 'Gallery']] : [])];
    const here = location.hash || '#/';
    $('pub-nav').innerHTML = links.map(([h, l]) => `<a href="${esc(h)}"${here === h || (h !== '#/' && here.startsWith(h)) ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('');
  }

  const postCard = p => `
    <a class="post-card" href="#/post/${p.id}">
      <div class="post-card-img"${signed[p.cover_id] ? ` style="background-image:url('${esc(signed[p.cover_id])}')"` : ''}>${signed[p.cover_id] ? '' : '<span>📝</span>'}</div>
      <div class="post-card-body">
        <div class="post-meta"><span class="chip">${esc(p.category)}</span><span class="muted small">${esc(fmt(p.published_on))}</span></div>
        <h3>${esc(p.title || 'Untitled')}</h3>
        <p class="muted small">${esc(excerpt(p.body))}</p>
      </div>
    </a>`;

  function route(){
    const main = $('pub-main'), h = location.hash.replace(/^#\/?/, '');
    const [kind, arg] = h.split('/');
    nav();
    window.scrollTo(0, 0);
    let title = site.title || "Wang' Kalam Agok Buk";
    if (kind === 'post'){
      const p = posts.find(x => x.id === arg);
      if (!p) return notFound();
      title = p.title + ' · ' + title;
      main.innerHTML = `
        <article class="post-read pub-narrow">
          ${signed[p.cover_id] ? `<img class="post-cover" src="${esc(signed[p.cover_id])}" alt="">` : ''}
          <div class="post-meta"><span class="chip">${esc(p.category)}</span><span class="muted small">${esc(fmt(p.published_on))}</span></div>
          <h1 class="post-title">${esc(p.title || 'Untitled')}</h1>
          <div class="post-body">${WK.md(p.body)}</div>
          <p><a href="#/blog">← All posts</a></p>
        </article>`;
    } else if (kind === 'page'){
      const p = pages.find(x => x.slug === arg);
      if (!p) return notFound();
      title = p.title + ' · ' + title;
      main.innerHTML = `<article class="pg pub-narrow"><h1>${esc(p.title)}</h1>${WK.blocksHtml(p.blocks, { img: imgOf })}</article>`;
    } else if (kind === 'blog'){
      main.innerHTML = `<h1>Blog</h1>${posts.length ? `<div class="post-grid">${posts.map(postCard).join('')}</div>` : '<p class="empty">Nothing here yet.</p>'}`;
    } else if (kind === 'gallery'){
      main.innerHTML = `<h1>Gallery</h1><div class="bk-photos pub-photos">${pics.map(g => `
        <figure><img src="${esc(signed[g.id] || '')}" alt="${esc(g.caption)}" loading="lazy"><figcaption>${esc(g.caption)}${g.taken_on ? ' · ' + esc(fmt(g.taken_on)) : ''}</figcaption></figure>`).join('')}</div>`;
    } else {
      main.innerHTML = `
        <section class="pub-hero">
          <h1>${esc(site.title || "Wang' Kalam Agok Buk")}</h1>
          ${site.tagline ? `<p class="pub-tagline">${esc(site.tagline)}</p>` : ''}
        </section>
        ${site.about ? `<section class="pub-narrow pub-about">${WK.md(site.about)}</section>` : ''}
        ${posts.length ? `<h2>Latest</h2><div class="post-grid">${posts.slice(0, 6).map(postCard).join('')}</div>` : ''}
        ${pages.length ? `<h2>Pages</h2><ul class="pub-pages">${pages.map(p => `<li><a href="#/page/${esc(p.slug)}">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}`;
    }
    document.title = title;
  }
  function notFound(){ $('pub-main').innerHTML = '<p class="empty">That isn’t here. <a href="#/">Home</a></p>'; }

  load().then(ok => {
    if (!ok){
      $('pub-nav').innerHTML = '';
      $('pub-main').innerHTML = '<section class="pub-hero"><h1>Nothing to see yet</h1><p class="pub-tagline">This site isn’t public.</p></section>';
      return;
    }
    $('pub-brand').textContent = site.title || "Wang' Kalam Agok Buk";
    $('pub-foot').textContent = '© ' + new Date().getFullYear() + ' ' + (site.title || "Wang' Kalam Agok Buk");
    window.addEventListener('hashchange', route);
    route();
  }).catch(e => { $('pub-main').innerHTML = `<p class="empty">Could not load: ${esc(e.message)}</p>`; });
})();
