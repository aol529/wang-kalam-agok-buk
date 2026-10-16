/* Bible: prayers and affirmations from "All I Want" (2014) on a shelf
   (open one to read it), then the Daily Bible Reading Plan (bible-plan.js,
   from aol529/bible-reading-plan). The plan is drawn the first time the
   tab opens and then stays, so switching tabs doesn't lose your place. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  let open = null;            // key of the prayer being read
  let plan = null;            // the reading plan, once drawn

  WK.section({ name: 'bible', label: 'Bible', render, hide: () => plan && plan.hide() });

  // Paragraphs at blank lines, line breaks kept. Legacy uses it too.
  WK.devotionHtml = d => String(d.text).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  function render(){
    const el = $('section-bible');
    if (!plan){
      el.innerHTML = `
        <div class="section-head bible-head"><h1>Bible</h1></div>
        <div id="devotions"></div>
        <div class="brp" id="bible-plan"></div>`;
      plan = WK.biblePlan.mount($('bible-plan'));
    }
    drawShelf();
    plan.refresh();
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
