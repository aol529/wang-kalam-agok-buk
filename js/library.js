/* Library: books to read, nothing more. A shelf; open a book for its
   contents by part and chapter; read a chapter and go on to the next.
   Nothing is ticked or tracked. Each book's text is its own file in
   js/library/, loaded the first time the book is opened. To add a book,
   put its text in js/library/<id>.js (WK.BOOKS[id] = { chapters: [[part,
   number, title, paragraphs], …] }: part as it's shown, or '' for a book
   without parts; paragraphs in WK.md's Markdown) and list it in SHELF
   below. */
(function(){
  const { $, esc } = WK;

  const SHELF = [
    { id: 'seneca', title: "Seneca's Morals", sub: 'Of a Happy Life, Benefits, Anger and Clemency',
      by: "Lucius Annaeus Seneca · translated by Sir Roger L'Estrange", year: '1678',
      blurb: "Seneca's moral teaching gathered under headings: how to give and receive, what makes a happy life, how to master anger, and why a ruler should be merciful. With the translator's introduction and the story of Seneca's life and death. The Blog has a post on who Seneca was.",
      credit: "L'Estrange's translation (1678), Belford, Clarke & Co. edition, Chicago, 1882. Public domain; text from Project Gutenberg #56075.",
      color: '#5b2a1f' },
    { id: 'epictetus-enchiridion', title: 'The Enchiridion', sub: 'The Handbook',
      by: 'Epictetus · translated by Thomas Wentworth Higginson', year: '1865',
      blurb: "Epictetus's teaching boiled down to 51 short sections by his student Arrian: what is in your power and what isn't, and how to live by that difference. About forty minutes, and the place to start with Epictetus. The Blog has a post on his life.",
      credit: "Higginson's translation (1865), from Project Gutenberg #45109; the 1948 edition's introduction and notes are left out. Public domain.",
      color: '#1f4a5b' },
    { id: 'epictetus-discourses', title: 'The Discourses', sub: 'Of Epictetus, as written down by Arrian',
      by: 'Epictetus · translated by George Long', year: '1877',
      blurb: "Epictetus in his classroom, taken down by Arrian: four books of talks on freedom, judgment, what we control, and how a philosopher should face exile, illness, and the powerful. The long version of the Enchiridion.",
      credit: "George Long's translation (1877), from the eBooks@Adelaide edition. Public domain.",
      color: '#2d3f2a' },
    { id: 'epictetus-golden-sayings', title: 'The Golden Sayings', sub: 'Of Epictetus, with the Hymn of Cleanthes',
      by: 'Epictetus · translated by Hastings Crossley', year: '1903',
      blurb: "189 of Epictetus's best passages, chosen and arranged by Crossley, then fragments from lost works and the Stoic Hymn of Cleanthes. Good for a few lines at a time.",
      credit: "Hastings Crossley's translation (1903), from Project Gutenberg #871. Public domain.",
      color: '#5b4a1f' }
  ];

  let bookId = null;        // the open book, or null for the shelf
  let chapter = null;       // the open chapter (index), or null for its contents
  const loading = {};

  WK.section({ name: 'library', label: 'Library', render, reset(){ bookId = null; chapter = null; } });

  // A book's text, fetched once with the same cache-busting stamp as this
  // file (the pages' ?v=__BUILD__ becomes the commit id on deploy).
  function loadBook(id){
    if (WK.BOOKS && WK.BOOKS[id]) return Promise.resolve();
    if (!loading[id]) loading[id] = new Promise((resolve, reject) => {
      const me = document.querySelector('script[src*="js/library.js"]');
      const v = me && me.src.includes('?v=') ? me.src.split('?v=')[1] : '';
      const s = document.createElement('script');
      s.src = 'js/library/' + id + '.js' + (v ? '?v=' + v : '');
      s.onload = resolve;
      s.onerror = () => { delete loading[id]; reject(new Error('Could not load the book. Check your connection.')); };
      document.head.appendChild(s);
    });
    return loading[id];
  }

  const chapters = () => WK.BOOKS[bookId].chapters;
  const minutes = ch => Math.max(1, Math.round(ch[3].join(' ').split(/\s+/).length / 200));
  const chapterLabel = ch => (ch[1] ? 'Chapter ' + ch[1] + ': ' : '') + ch[2];

  async function render(){
    const el = $('section-library');
    const book = SHELF.find(b => b.id === bookId);
    if (!book){ el.innerHTML = shelfHtml(); bindShelf(el); return; }
    if (!WK.BOOKS || !WK.BOOKS[book.id]){
      el.innerHTML = `<div class="section-head"><h1>${esc(book.title)}</h1></div><p class="empty">Opening the book…</p>`;
      try { await loadBook(book.id); }
      catch (e){ el.innerHTML = `<div class="section-head"><h1>${esc(book.title)}</h1></div><p class="empty">${esc(e.message)}</p>`; return; }
    }
    el.innerHTML = chapter == null ? contentsHtml(book) : readerHtml(book, chapter);
    bindBook(el);
  }

  function shelfHtml(){
    return `
      <div class="section-head"><h1>Library</h1></div>
      <div class="lib-shelf">${SHELF.map(b => `
        <button type="button" class="lib-book" data-book="${b.id}">
          <span class="lib-cover" style="background-color:${b.color}"><b>${esc(b.title)}</b><span>${esc(b.sub)}</span></span>
          <span class="lib-info">
            <span class="lib-by">${esc(b.by)} · ${esc(b.year)}</span>
            <span class="lib-blurb">${esc(b.blurb)}</span>
            <span class="lib-open">Open the book ›</span>
          </span>
        </button>`).join('')}
      </div>`;
  }
  function bindShelf(el){
    el.querySelectorAll('[data-book]').forEach(b => b.onclick = () => { bookId = b.dataset.book; chapter = null; render(); top(); });
  }

  function contentsHtml(book){
    const all = chapters();
    const total = all.reduce((t, ch) => t + minutes(ch), 0);
    let last = null, html = '';
    all.forEach((ch, i) => {
      if (ch[0] !== last || i === 0){ html += `${i ? '</ol>' : ''}${ch[0] ? `<h3 class="lib-part">${esc(ch[0])}</h3>` : ''}<ol class="lib-toc">`; last = ch[0]; }
      html += `<li><button type="button" data-ch="${i}"><span class="lib-toc-n">${esc(ch[1] || '·')}</span><span>${esc(ch[2])}</span><span class="muted small">${minutes(ch)} min</span></button></li>`;
    });
    return `
      <div class="section-head">
        <h1>${esc(book.title)}</h1>
        <div class="toolbar"><button type="button" class="btn ghost small" id="lib-shelf">‹ Library</button></div>
      </div>
      <p class="muted lib-sub">${esc(book.sub)} · ${esc(book.by)} · ${all.length} chapters, about ${total < 90 ? total + ' minutes' : Math.round(total / 60) + ' hours'}</p>
      <div class="lib-contents">${html}</ol></div>
      <p class="muted small lib-credit">${esc(book.credit)}</p>`;
  }

  function readerHtml(book, i){
    const all = chapters(), ch = all[i];
    const size = Number(WK.store('wk_library_size')) || 0;
    const prev = all[i - 1], next = all[i + 1];
    return `
      <div class="section-head">
        <h1>${esc(book.title)}</h1>
        <div class="toolbar"><button type="button" class="btn ghost small" id="lib-contents">‹ Contents</button></div>
      </div>
      <article class="lib-reader lib-size-${size}" id="lib-reader">
        <p class="lib-reader-part">${ch[0] ? esc(ch[0]) + ' · ' : ''}${minutes(ch)} min</p>
        <h2 class="lib-title">${ch[1] ? `<span>Chapter ${esc(ch[1])}</span>` : ''}${esc(ch[2])}</h2>
        <div class="lib-text">${ch[3].map(t => WK.md(t)).join('')}</div>
        <div class="lib-foot">
          ${prev ? `<button type="button" class="btn ghost" data-ch="${i - 1}" title="${esc(chapterLabel(prev))}">‹ Previous</button>` : '<span></span>'}
          <span class="lib-size"><button type="button" class="btn ghost small" data-size="-1" aria-label="Smaller text">A−</button><button type="button" class="btn ghost small" data-size="1" aria-label="Larger text">A+</button></span>
          ${next ? `<button type="button" class="btn" data-ch="${i + 1}" title="${esc(chapterLabel(next))}">Next ›</button>` : '<span class="muted small">The end</span>'}
        </div>
        ${next ? `<p class="muted small lib-next">Next: ${esc(next[0] !== ch[0] && next[0] ? next[0] + ', ' : '')}${esc(chapterLabel(next))}</p>` : ''}
      </article>`;
  }

  function top(){ const s = $('section-library'); if (s) window.scrollTo(0, Math.max(0, s.offsetTop - 70)); }
  function bindBook(el){
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('lib-shelf', () => { bookId = null; chapter = null; render(); top(); });
    on('lib-contents', () => { chapter = null; render(); top(); });
    el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { chapter = Number(b.dataset.ch); render(); top(); });
    el.querySelectorAll('[data-size]').forEach(b => b.onclick = () => {
      const s = Math.max(-1, Math.min(3, (Number(WK.store('wk_library_size')) || 0) + Number(b.dataset.size)));
      WK.store('wk_library_size', String(s));
      $('lib-reader').className = 'lib-reader lib-size-' + s;
    });
  }
})();
