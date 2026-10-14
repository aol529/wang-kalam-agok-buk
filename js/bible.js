/* Bible: the Daily Bible Reading Plan (its own site, aol529/bible-reading-plan)
   shown in a frame. It loads the first time the tab opens and then stays,
   so switching tabs doesn't lose your place. On the live site both share
   aol529.github.io, so its reading progress is the same as on its own. */
(function(){
  const { $ } = WK;
  const SRC = 'https://aol529.github.io/bible-reading-plan/';

  WK.section({ name: 'bible', label: 'Bible', render });

  function render(){
    const el = $('section-bible');
    if (el.querySelector('iframe')) return;
    el.innerHTML = `
      <div class="section-head bible-head">
        <h1>Bible</h1>
        <a class="btn small" href="${SRC}" target="_blank" rel="noopener">Open on its own ↗</a>
      </div>
      <iframe class="bible-frame" src="${SRC}" title="Daily Bible Reading Plan"></iframe>`;
  }
})();
