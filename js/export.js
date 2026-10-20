/* The archive: everything in WKAB as one ZIP, made to outlive the app.
   book.html opens in any browser and prints to PDF (the site's own
   stylesheet is inside it); the .md files are the same writing as plain
   text; photos/ holds the gallery and vision pictures; data/ is every
   table as JSON, to restore from. Started from Legacy. */
(function(){
  const { esc } = WK;
  const F = WK.F;

  const TABLES = ['goals', 'journal_entries', 'day_plans', 'routine_ticks', 'quit_timers', 'gallery_items', 'blog_posts', 'budget_items', 'pages', 'site_content'];
  const PAGE = 1000;          // Supabase returns at most this many rows a request

  // Every row of a table, a page at a time. A table that isn't set up yet is empty.
  async function rowsOf(table){
    const all = [];
    for (let from = 0; ; from += PAGE){
      const { data, error } = await WK.db.from(table).select('*').range(from, from + PAGE - 1);
      if (error){ if (error.code === 'PGRST205' || error.code === '42P01') return all; throw error; }
      all.push(...(data || []));
      if (!data || data.length < PAGE) return all;
    }
  }

  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled';
  const byDate = k => (a, b) => (a[k] || '').localeCompare(b[k] || '') || (a.created_at || '').localeCompare(b.created_at || '');
  const fmt = iso => iso ? WK.fmtDate(iso, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  // The Blog's Markdown: paragraphs at blank lines, **bold**, *italics*, "- " bullets.
  const inline = t => esc(t).replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<b>$1</b>').replace(/\*(\S(?:.*?\S)?)\*/g, '<i>$1</i>');
  const prose = text => String(text || '').trim().split(/\n{2,}/)
    .map(t => `<p>${t.split('\n').map(l => inline(l.replace(/^\s*[-*]\s+/, '• '))).join('<br>')}</p>`).join('');

  function entryMeta(e){
    return [
      (e.areas || []).length ? e.areas.join(', ') : '',
      e.mood ? 'Mood ' + F.MOODS[e.mood - 1] : '',
      e.for_children ? 'For my children' : ''
    ].filter(Boolean).join(' · ');
  }

  // ---- Markdown ----
  function entryMd(e){
    const meta = entryMeta(e);
    return `## ${e.entry_date} · ${e.title || 'Untitled'}\n\n${meta ? `*${meta}*\n\n` : ''}${(e.body || '').trim()}\n\n${e.gratitude ? `Grateful for: ${e.gratitude.trim()}\n\n` : ''}`;
  }
  function letterMd(l){
    const to = l.to_whom ? 'To ' + l.to_whom : 'To my children';
    return `## ${l.title || 'Untitled letter'}\n\n*${to} · written ${l.entry_date}${l.open_on ? ' · to be opened on ' + l.open_on : ''}*\n\n${(l.body || '').trim()}\n\n`;
  }
  function goalMd(g){
    const q = F.quadOf(g);
    return `- **${g.title}**${g.done ? ' (done)' : ''} · ${q.name}${g.target_date ? ' · by ' + g.target_date : ''}` +
      (g.next_step ? `\n  Next step: ${g.next_step}` : '') + (g.notes ? `\n  ${g.notes.trim().replace(/\n/g, '\n  ')}` : '');
  }

  function pageMd(p){
    const out = (p.blocks || []).map(b =>
      b.type === 'heading' ? '### ' + b.text :
      b.type === 'text' ? (b.md || '').trim() :
      b.type === 'checklist' ? (b.items || []).map(i => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n') :
      b.type === 'quote' ? `> ${b.text}${b.by ? '\n> — ' + b.by : ''}` :
      b.type === 'image' ? `(picture${b.caption ? ': ' + b.caption : ''})` :
      b.type === 'divider' ? '---' : '').filter(Boolean);
    return `## ${p.title || 'Untitled'}\n\n${out.join('\n\n')}\n\n`;
  }

  // ---- The book ----
  function book(d, css, photos){
    const letters = d.journal_entries.filter(e => e.kind === 'letter').sort(byDate('entry_date'));
    const journal = d.journal_entries.filter(e => e.kind === 'journal').sort(byDate('entry_date'));
    const lessons = journal.filter(e => e.for_children);
    const posts = d.blog_posts.filter(p => p.status === 'published').sort(byDate('published_on'));
    const entryHtml = e => `
      <article class="bk-entry">
        <h3>${esc(e.title || 'Untitled')}</h3>
        <p class="muted small">${esc(fmt(e.entry_date))}${entryMeta(e) ? ' · ' + esc(entryMeta(e)) : ''}</p>
        ${prose(e.body)}
        ${e.gratitude ? `<p class="muted small"><b>Grateful for:</b> ${esc(e.gratitude)}</p>` : ''}
      </article>`;
    const today = WK.isoDate();
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wang' Kalam Agok Buk · ${esc(today)}</title>
<style>${css}
body{padding:24px 16px;}
.bk{max-width:860px;margin:0 auto;}
.bk-part{margin:48px 0 0;page-break-before:always;break-before:page;}
.bk-part:first-of-type{page-break-before:auto;break-before:auto;}
.bk-entry{margin:0 0 28px;padding:0 0 20px;border-bottom:1px solid var(--line);break-inside:avoid-page;}
.bk-entry h3{font-size:20px;margin:0 0 2px;}
.bk-entry p{white-space:normal;}
.bk-toc a{color:inherit;}
.bk-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.bk-photos figure{margin:0;break-inside:avoid;}
.bk-photos img{width:100%;border-radius:8px;display:block;}
.bk-photos figcaption{font-size:12.5px;color:var(--muted);margin-top:4px;}
.letter-body{display:block;-webkit-line-clamp:unset;}
@media print{body{padding:0;background:#fff;} .bk-toc{display:none;}}
</style></head>
<body><main class="bk">
  <header class="legacy-head"><div><span class="eyebrow">For my children</span><h1>Wang' Kalam Agok Buk</h1>
    <p class="muted">Kept until ${esc(fmt(today))}. Open this file in any web browser; print it to keep it on paper.</p></div></header>
  <nav class="bk-toc small"><a href="#way">The Way</a> · <a href="#letters">Letters</a> · <a href="#lessons">From the Journal</a> · <a href="#vision">Vision</a> · ${d.pages.length ? '<a href="#pages">Pages</a> · ' : ''}<a href="#journal">The whole journal</a> · <a href="#blog">Blog</a>${photos.length ? ' · <a href="#photos">Photos</a>' : ''}</nav>

  <section class="bk-part" id="way">${WK.legacyWay()}</section>

  <section class="bk-part" id="letters"><h2>Letters</h2>
    ${letters.map(l => `
      <article class="bk-entry">
        <h3>${esc(l.title || 'Untitled letter')}</h3>
        <p class="muted small">${l.to_whom ? 'To ' + esc(l.to_whom) : 'To my children'} · written ${esc(fmt(l.entry_date))}${l.open_on ? ' · to be opened on ' + esc(fmt(l.open_on)) : ''}</p>
        <div class="letter-body">${prose(l.body)}</div>
      </article>`).join('') || '<p class="empty">No letters yet.</p>'}
  </section>

  <section class="bk-part" id="lessons"><h2>From the Journal</h2>
    <p class="lead">Entries marked “for my children”.</p>
    ${lessons.map(entryHtml).join('') || '<p class="empty">None yet.</p>'}
  </section>

  <section class="bk-part" id="vision"><h2>Vision</h2>
    ${F.CATEGORIES.map(c => {
      const gs = d.goals.filter(g => g.category === c.name);
      return gs.length ? `<h3>${c.icon} ${esc(c.name)}</h3><ul>${gs.map(g => `<li><b>${esc(g.title)}</b>${g.done ? ' ✓' : ''} <span class="muted small">${esc(F.quadOf(g).name)}${g.target_date ? ' · by ' + esc(fmt(g.target_date)) : ''}</span>${g.next_step ? `<br><span class="small">Next step: ${esc(g.next_step)}</span>` : ''}${g.notes ? `<br><span class="small">${esc(g.notes)}</span>` : ''}</li>`).join('')}</ul>` : '';
    }).join('') || '<p class="empty">No goals yet.</p>'}
  </section>

  ${d.pages.length ? `<section class="bk-part" id="pages"><h2>Pages</h2>${d.pages.slice().sort((a, b) => a.sort - b.sort).map(p => `
    <article class="bk-entry pg"><h3>${esc(p.title || 'Untitled')}</h3>${WK.blocksHtml(p.blocks, { img: b => (photos.find(x => x.id === b.gallery_id) || {}).file || '' })}</article>`).join('')}</section>` : ''}

  <section class="bk-part" id="journal"><h2>The whole journal</h2>
    ${journal.map(entryHtml).join('') || '<p class="empty">No entries yet.</p>'}
  </section>

  <section class="bk-part" id="blog"><h2>Blog</h2>
    ${posts.map(p => `
      <article class="bk-entry">
        <h3>${esc(p.title || 'Untitled')}</h3>
        <p class="muted small">${esc(fmt(p.published_on))} · ${esc(p.category)}</p>
        ${prose(p.body)}
      </article>`).join('') || '<p class="empty">No published posts yet.</p>'}
  </section>

  ${photos.length ? `<section class="bk-part" id="photos"><h2>Photos</h2><div class="bk-photos">${photos.map(p => `
    <figure><img src="${esc(p.file)}" alt="${esc(p.caption)}" loading="lazy"><figcaption>${esc(p.caption)}${p.date ? ' · ' + esc(fmt(p.date)) : ''}</figcaption></figure>`).join('')}</div></section>` : ''}
</main></body></html>`;
  }

  const README = today => `Wang' Kalam Agok Buk: the archive, ${today}

book.html     The whole thing as a book. Open it in any web browser.
              To print it, or keep it as a PDF: File > Print > Save as PDF.
letters.md    The letters to my children, as plain text.
journal.md    Every journal entry, oldest first.
vision.md     The goals on the Vision board, by life area.
blog.md       The published blog posts.
pages.md      The pages built in the CMS.
photos/       The pictures from the Gallery and the Vision board.
data/         Every table as JSON, exactly as stored, to restore the
              site from if it is ever lost.

Keep a copy somewhere that isn't the internet: a drive, a USB stick, paper.
`;

  WK.exportArchive = async (progress) => {
    const say = progress || (() => {});
    if (!window.JSZip) throw new Error('The ZIP library did not load. Check the connection and reload.');
    const zip = new JSZip();
    const today = WK.isoDate();
    const root = zip.folder('wang-kalam-agok-buk-' + today);

    say('Reading your data…');
    const d = {};
    for (const t of TABLES){ d[t] = await rowsOf(t); root.file('data/' + t + '.json', JSON.stringify(d[t], null, 2)); }

    // Pictures: the gallery, then the vision board's own uploads.
    const photos = [];
    const pics = d.gallery_items.slice().sort(byDate('taken_on')).map(i => ({ id: i.id, bucket: 'gallery', path: i.path, caption: i.caption, date: i.taken_on }))
      .concat(d.goals.filter(g => g.image_path).map(g => ({ bucket: 'vision-images', path: g.image_path, caption: g.title, date: '' })));
    let n = 0, failed = 0;
    for (const p of pics){
      say(`Photos ${++n} of ${pics.length}…`);
      const { data, error } = await WK.db.storage.from(p.bucket).download(p.path);
      if (error || !data){ failed++; continue; }
      const ext = (p.path.split('.').pop() || 'jpg').toLowerCase();
      const file = `photos/${p.bucket === 'gallery' ? '' : 'vision/'}${(p.date || 'undated')}-${slug(p.caption)}-${n}.${ext}`;
      root.file(file, data);
      photos.push(Object.assign({ file }, p));
    }

    say('Writing the book…');
    const css = await fetch('css/site.css').then(r => r.ok ? r.text() : '').catch(() => '');
    root.file('book.html', book(d, css, photos.filter(p => p.bucket === 'gallery')));
    root.file('pages.md', '# Pages\n\n' + d.pages.slice().sort((a, b) => a.sort - b.sort).map(pageMd).join(''));
    const letters = d.journal_entries.filter(e => e.kind === 'letter').sort(byDate('entry_date'));
    const journal = d.journal_entries.filter(e => e.kind === 'journal').sort(byDate('entry_date'));
    root.file('letters.md', '# Letters to my children\n\n' + (letters.map(letterMd).join('') || '(none yet)\n'));
    root.file('journal.md', '# Journal\n\n' + (journal.map(entryMd).join('') || '(none yet)\n'));
    root.file('vision.md', '# Vision\n\n' + F.CATEGORIES.map(c => {
      const gs = d.goals.filter(g => g.category === c.name);
      return gs.length ? `## ${c.icon} ${c.name}\n\n${gs.map(goalMd).join('\n')}\n\n` : '';
    }).join(''));
    root.file('blog.md', '# Blog\n\n' + d.blog_posts.filter(p => p.status === 'published').sort(byDate('published_on'))
      .map(p => `## ${p.title || 'Untitled'}\n\n*${p.published_on || ''} · ${p.category}*\n\n${(p.body || '').trim()}\n\n`).join(''));
    root.file('README.txt', README(today));

    say('Zipping…');
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wang-kalam-agok-buk-' + today + '.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    WK.store('wk_last_export', today);
    return { entries: d.journal_entries.length, photos: photos.length, failed, size: blob.size };
  };
})();
