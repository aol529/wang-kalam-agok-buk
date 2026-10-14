/* Bible: prayers and affirmations from "All I Want" (2014) on a shelf
   (open one to read it), then the Daily Bible Reading Plan (its own site,
   aol529/bible-reading-plan) in a frame. The frame loads the first time
   the tab opens and then stays, so switching tabs doesn't lose your place.
   On the live site both share aol529.github.io, so its reading progress is
   the same as on its own. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;
  const SRC = 'https://aol529.github.io/bible-reading-plan/';

  let open = null;            // key of the prayer being read

  WK.section({ name: 'bible', label: 'Bible', render });

  // Paragraphs at blank lines, line breaks kept. Legacy uses it too.
  WK.devotionHtml = d => String(d.text).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  function render(){
    const el = $('section-bible');
    if (!el.querySelector('iframe')){
      el.innerHTML = `
        <div class="section-head bible-head">
          <h1>Bible</h1>
          <a class="btn small" href="${SRC}" target="_blank" rel="noopener">Open the reading plan on its own ↗</a>
        </div>
        <div id="devotions"></div>
        <iframe class="bible-frame" src="${SRC}" title="Daily Bible Reading Plan"></iframe>`;
    }
    drawShelf();
  }

  function drawShelf(){
    const d = open && F.DEVOTIONS.find(x => x.key === open);
    $('devotions').innerHTML = `
      <div class="shelf" role="list" aria-label="Prayers and affirmations">
        ${F.DEVOTIONS.map(x => `
          <button type="button" class="shelf-card${x.mine ? ' mine' : ''}" data-devotion="${x.key}" aria-expanded="${open === x.key}" role="listitem">
            <b>${esc(x.title)}</b><span>${esc(x.by || ' ')}</span>
          </button>`).join('')}
      </div>
      ${d ? `
        <article class="devotion">
          <div class="devotion-head">
            <div><h2>${esc(d.title)}</h2>${d.by ? `<span class="muted small">${esc(d.by)}</span>` : ''}</div>
            <button type="button" class="btn ghost small" id="devotion-close">Close</button>
          </div>
          <div class="devotion-text">${WK.devotionHtml(d)}</div>
        </article>` : ''}`;
    $('devotions').querySelectorAll('[data-devotion]').forEach(b => {
      b.onclick = () => { open = open === b.dataset.devotion ? null : b.dataset.devotion; drawShelf(); };
    });
    if ($('devotion-close')) $('devotion-close').onclick = () => { open = null; drawShelf(); };
  }
})();
