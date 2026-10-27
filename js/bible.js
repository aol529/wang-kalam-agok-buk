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
        <div id="plan-charts"></div>
        <div class="brp" id="bible-plan"></div>`;
      plan = WK.biblePlan.mount($('bible-plan'));
      drawCharts();
    }
    drawShelf();
    plan.refresh();
  }

  /* The plans as they were printed, to show someone at a glance how a
     plan works. Tap a card to open it full screen; tap the chart to zoom. */
  const CHARTS = [
    { src: 'daily.jpg',              plan: 'Daily Plan',       note: 'A Man After God\'s Own Heart: a passage for every date of the year' },
    { src: '52week.jpg',             plan: '52-Week Plan',     note: 'A different kind of book each weekday, one row per week' },
    { src: 'nt90.jpg',               plan: 'NT in 90 Days',    note: 'About three chapters a day, Matthew to Revelation' },
    { src: 'ot60-biblical.jpg',      plan: 'OT in 60 Days',    note: 'Biblical order, Genesis to Malachi' },
    { src: 'ot60-chronological.jpg', plan: 'OT in 60 Days',    note: 'Chronological order, as the events happened' },
    { src: 'ot60-cover.jpg',         plan: 'OT in 60 Days',    note: 'The cover' }
  ];
  const chartSrc = c => 'img/bible-plans/' + c.src;
  let chartAt = 0;

  function drawCharts(){
    $('plan-charts').innerHTML = `
      <details class="charts" open>
        <summary><h2>The plans on paper</h2><span class="muted small">Tap one to show someone how it works</span></summary>
        <div class="chart-row">
          ${CHARTS.map((c, i) => `
            <button type="button" class="chart-card" data-chart="${i}">
              <img src="${chartSrc(c)}" alt="" loading="lazy">
              <b>${esc(c.plan)}</b><span>${esc(c.note)}</span>
            </button>`).join('')}
        </div>
      </details>`;
    $('plan-charts').querySelectorAll('[data-chart]').forEach(b => b.onclick = () => showChart(+b.dataset.chart));

    if ($('chart-viewer')) return;
    const dlg = document.createElement('dialog');
    dlg.id = 'chart-viewer';
    dlg.className = 'chart-viewer';
    dlg.setAttribute('aria-label', 'Reading plan chart');
    dlg.innerHTML = `
      <div class="viewer-bar">
        <button type="button" class="btn small" id="chart-prev" aria-label="Previous chart">←</button>
        <span id="chart-caption"></span>
        <button type="button" class="btn small" id="chart-next" aria-label="Next chart">→</button>
        <button type="button" class="btn small" id="chart-close">Close</button>
      </div>
      <div class="chart-scroll" id="chart-scroll"><img id="chart-img" alt=""></div>`;
    document.body.appendChild(dlg);
    $('chart-prev').onclick = () => showChart(chartAt - 1);
    $('chart-next').onclick = () => showChart(chartAt + 1);
    $('chart-close').onclick = () => dlg.close();
    $('chart-img').onclick = () => dlg.classList.toggle('zoomed');
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') showChart(chartAt - 1);
      if (e.key === 'ArrowRight') showChart(chartAt + 1);
    });
    let x0 = null;
    $('chart-scroll').addEventListener('touchstart', e => { x0 = e.touches.length === 1 && !dlg.classList.contains('zoomed') ? e.touches[0].clientX : null; }, { passive: true });
    $('chart-scroll').addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 60) showChart(chartAt + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  function showChart(i){
    chartAt = (i + CHARTS.length) % CHARTS.length;
    const c = CHARTS[chartAt], dlg = $('chart-viewer');
    dlg.classList.remove('zoomed');
    $('chart-img').src = chartSrc(c);
    $('chart-img').alt = c.plan + ' chart';
    $('chart-caption').innerHTML = `<b>${esc(c.plan)}</b> · ${esc(c.note)} <span class="muted">(${chartAt + 1}/${CHARTS.length})</span>`;
    $('chart-scroll').scrollTop = 0;
    if (!dlg.open) dlg.showModal();
  }

  function drawShelf(){
    const d = open && F.DEVOTIONS.find(x => x.key === open);
    $('devotions').innerHTML = `
      <div class="shelf" role="group" aria-label="Prayers and affirmations">
        ${F.DEVOTIONS.map(x => `
          <button type="button" class="shelf-card${x.mine ? ' mine' : ''}" data-devotion="${x.key}" aria-expanded="${open === x.key}">
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
