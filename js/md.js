/* Shared by the site and the public site (public.html): escaping, a
   little Markdown, and the blocks a page is built from. */
window.WK = window.WK || {};
(function(){
  const esc = WK.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Markdown, the small part of it: paragraphs at blank lines, ## and ###
  // headings, "- " bullets, **bold**, *italics* and [links](https://...).
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^\w*])\*(\S(?:.*?\S)?)\*(?!\w)/g, '$1<i>$2</i>');
  WK.md = text => String(text || '').trim().split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    const h = /^(#{2,3})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) return `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`;
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');

  // A page's blocks. img(block) gives a picture's address; with `tick`,
  // checklist items are checkboxes (data-tick="block,item").
  WK.BLOCKS = {
    heading:   { label: 'Heading',   blank: () => ({ type: 'heading', text: '' }) },
    text:      { label: 'Text',      blank: () => ({ type: 'text', md: '' }) },
    image:     { label: 'Picture',   blank: () => ({ type: 'image', gallery_id: '', url: '', caption: '' }) },
    checklist: { label: 'Checklist', blank: () => ({ type: 'checklist', items: [] }) },
    quote:     { label: 'Quote',     blank: () => ({ type: 'quote', text: '', by: '' }) },
    divider:   { label: 'Divider',   blank: () => ({ type: 'divider' }) }
  };
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  WK.blocksHtml = (blocks, opts) => {
    const o = opts || {};
    return (blocks || []).map((b, bi) => {
      if (b.type === 'heading') return b.text ? `<h2 class="pg-h">${esc(b.text)}</h2>` : '';
      if (b.type === 'text') return `<div class="pg-text">${WK.md(b.md)}</div>`;
      if (b.type === 'image'){
        const src = (o.img && o.img(b)) || safeUrl(b.url);
        return src ? `<figure class="pg-img"><img src="${esc(src)}" alt="${esc(b.caption || '')}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>` : '';
      }
      if (b.type === 'checklist'){
        const items = b.items || [], n = items.filter(i => i.done).length;
        return items.length ? `<div class="pg-check">${items.length > 1 ? `<div class="progress"><i style="width:${Math.round(n / items.length * 100)}%"></i></div>` : ''}<ul>${items.map((it, ii) => `
          <li><label class="check"><input type="checkbox"${it.done ? ' checked' : ''}${o.tick ? ` data-tick="${bi},${ii}"` : ' disabled'}> <span>${esc(it.text)}</span></label></li>`).join('')}</ul></div>` : '';
      }
      if (b.type === 'quote') return b.text ? `<blockquote class="sys-quote">${esc(b.text)}${b.by ? `<cite>${esc(b.by)}</cite>` : ''}</blockquote>` : '';
      if (b.type === 'divider') return '<hr class="pg-hr">';
      return '';
    }).join('');
  };
})();
