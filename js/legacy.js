/* Legacy: what is meant to be handed down. The Way (the life path table
   explained), Letters to the children, and the journal entries marked
   "for my children". "Print as a book" prints all three; "Download the
   archive" saves everything in the app as a ZIP to keep offline (export.js). */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  let tab = WK.store('wk_legacy_tab') || 'way';

  WK.section({ name: 'legacy', label: 'Legacy', render });
  // The archive's book opens with The Way.
  WK.legacyWay = () => wayHtml();

  function render(){
    const el = $('section-legacy');
    const entries = WK.entries ? WK.entries() : [];
    const letters = entries.filter(e => e.kind === 'letter')
      .sort((a, b) => (a.open_on || '9999').localeCompare(b.open_on || '9999') || (a.entry_date || '').localeCompare(b.entry_date || ''));
    const lessons = entries.filter(e => e.kind === 'journal' && e.for_children);
    el.innerHTML = `
      <div class="section-head legacy-head">
        <div>
          <span class="eyebrow">For my children</span>
          <h1>Wang' Kalam Agok Buk</h1>
        </div>
        <div class="legacy-actions">
          <button type="button" class="btn" id="legacy-print">Print as a book</button>
          <button type="button" class="btn primary" id="legacy-export">Download the archive</button>
        </div>
      </div>
      <p class="muted small legacy-export-note no-print" id="legacy-export-note">${exportNote()}</p>
      <nav class="subtabs" id="legacy-tabs">
        <button type="button" data-tab="way">The Way</button>
        <button type="button" data-tab="letters">Letters <span class="count">${letters.length}</span></button>
        <button type="button" data-tab="lessons">From the Journal <span class="count">${lessons.length}</span></button>
      </nav>
      <div class="legacy-pane" data-pane="way">${wayHtml()}</div>
      <div class="legacy-pane" data-pane="letters">${lettersHtml(letters)}</div>
      <div class="legacy-pane" data-pane="lessons">
        <h2 class="print-title">From the Journal</h2>
        <p class="lead">Journal entries marked “for my children”. Tick that box on any entry to add it here.</p>
        <div class="entries">${lessons.map(e => WK.entryCard(e)).join('') || '<p class="empty">None yet.</p>'}</div>
      </div>`;

    const showTab = t => {
      tab = t; WK.store('wk_legacy_tab', t);
      el.querySelectorAll('#legacy-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
      el.querySelectorAll('.legacy-pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
    };
    el.querySelectorAll('#legacy-tabs [data-tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
    showTab(tab);

    el.querySelectorAll('[data-prompt]').forEach(b => {
      b.onclick = () => WK.openEntry(null, { kind: 'letter', title: b.dataset.prompt, areas: b.dataset.area ? [b.dataset.area] : [] });
    });
    if ($('letter-new')) $('letter-new').onclick = () => WK.openEntry(null, { kind: 'letter' });
    WK.wireEntries(el);

    $('legacy-export').onclick = async () => {
      const b = $('legacy-export'), note = $('legacy-export-note');
      b.disabled = true;
      try {
        const r = await WK.exportArchive(t => { b.textContent = t; });
        WK.toast(`Saved: ${r.entries} entries and letters, ${r.photos} photos (${(r.size / 1048576).toFixed(1)} MB).`);
        note.textContent = exportNote() + (r.failed ? ` ${r.failed} photo${r.failed === 1 ? '' : 's'} could not be downloaded.` : '');
      } catch (err){ WK.toast('Not saved: ' + err.message); }
      b.disabled = false; b.textContent = 'Download the archive';
    };

    // Print every pane, open or not, then put the tabs back.
    $('legacy-print').onclick = () => {
      document.body.classList.add('printing-legacy');
      el.querySelectorAll('.legacy-pane').forEach(p => { p.hidden = false; });
      const done = () => { document.body.classList.remove('printing-legacy'); showTab(tab); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
    };
  }

  // Remembered on this device only.
  function exportNote(){
    const last = WK.store('wk_last_export');
    return 'The archive is everything here (the book, the letters, the journal, photos and a full data backup) in one ZIP that opens without the internet. ' +
      (last ? `Last downloaded on this device ${WK.fmtDate(last)}.` : 'Download it once a year and keep it on a drive.');
  }

  function lettersHtml(letters){
    const today = WK.isoDate();
    return `
      <h2 class="print-title">Letters</h2>
      <div class="section-head"><p class="lead">Letters to be read later: who each is for, and when to open it.</p>
        <button type="button" class="btn primary" id="letter-new">+ New letter</button></div>
      <div class="letters">${letters.map(l => `
        <article class="letter" data-entry="${l.id}" tabindex="0">
          <span class="seal">✉</span>
          <h3>${esc(l.title || 'Untitled letter')}</h3>
          <p class="muted">${l.to_whom ? 'To ' + esc(l.to_whom) : 'To my children'}${l.open_on ? ` · ${l.open_on > today ? 'Open on' : 'Opened'} ${esc(WK.fmtDate(l.open_on))}` : ''}</p>
          <p class="letter-body">${esc(l.body || '')}</p>
          <p class="muted small">Written ${esc(WK.fmtDate(l.entry_date))}</p>
        </article>`).join('') || '<p class="empty">No letters yet. Pick a starting point below.</p>'}</div>
      <div class="panel prompts no-print">
        <h2>Starting points</h2>
        <div class="prompt-chips">${F.LETTER_PROMPTS.map(([area, t]) =>
          `<button type="button" class="pill" data-prompt="${esc(t)}" data-area="${esc(area)}">${area ? F.catOf(area).icon + ' ' : ''}${esc(t)}</button>`).join('')}</div>
      </div>`;
  }

  // The life path, explained.
  function wayHtml(){
    const rows = [
      { realm: 'Spirit', levelText: 'Self-actualisation: philanthropy & altruism', areas: ['Personal Development', 'Career'] },
      { realm: 'Mind',   levelText: 'Esteem: leadership · Belonging: friends, wife, children', areas: ['Community & Charity', 'Love & Relationships'] },
      { realm: 'Body',   levelText: 'Safety: shelter, strength, education, money · Physiological: food, water, air, warmth', areas: ['Wealth & Finance', 'Health & Appearance', 'Recreation'] }
    ];
    const areaTag = a => { const c = F.catOf(a); return `<span class="area-tag">${c.icon} ${esc(a)}${c.archetype ? ` <em>${esc(c.archetype)}</em>` : ''}</span>`; };
    return `
      <h2 class="print-title">The Way</h2>
      <p class="lead way-lead">One table joins old wisdom with modern ideas. It sees a life in three parts (body, mind and spirit) and asks the same questions of each: what does it need, which virtue guards it, and which part of life does it show up in?</p>

      <div class="lifepath">
        <div class="lp-head"><span></span><span>Buddhism</span><span>Daoism</span><span>Stoicism</span><span>Hierarchy of needs</span><span>Life areas</span></div>
        ${rows.map(r => { const R = F.REALMS[r.realm]; return `
          <div class="lp-row lp-${r.realm.toLowerCase()}">
            <div class="lp-realm"><b>${esc(r.realm)}</b><span>${esc(R.label)}</span></div>
            <div data-k="Buddhism">${esc(R.buddhism)}</div>
            <div data-k="Daoism">${esc(R.daoism)}</div>
            <div data-k="Stoicism">${esc(R.stoicism)}</div>
            <div data-k="Hierarchy of needs">${esc(r.levelText)}</div>
            <div data-k="Life areas" class="lp-areas">${r.areas.map(areaTag).join('')}</div>
          </div>`; }).join('')}
        <p class="lp-affirm">${esc(F.AFFIRMATION)}</p>
      </div>

      <div class="way-grid">
        <section class="panel">
          <h2>Body, mind and spirit</h2>
          <p><b>Body:</b> food, water, air, warmth, shelter, strength and money. Everything else stands on it, so look after it first. It shows up in health, wealth and free time.</p>
          <p><b>Mind:</b> the people you belong to and the respect you earn by leading. It shows up in love and relationships, and in community and charity.</p>
          <p><b>Spirit:</b> becoming who you are meant to be, and giving beyond yourself. It shows up in personal development and in your life's work.</p>
        </section>

        <section class="panel">
          <h2>Buddhism: the Three Jewels</h2>
          <p>The <b>Buddha</b> is the example of an awakened mind. The <b>Dharma</b> is the teaching, the truth of how things are. The <b>Sangha</b> is the community that walks the path together.</p>
          <p>In the table, the Dharma guides the spirit, the Buddha's example guides the mind, and the Sangha (your people, your tribe) keeps the body's daily life steady.</p>
        </section>

        <section class="panel">
          <h2>Daoism: the Three Treasures</h2>
          <p>Laozi kept three treasures: <b>compassion</b>, <b>frugality</b> and <b>humility</b>. Compassion makes you brave. Frugality makes you able to give. Humility, not pushing to be first, is what makes people follow you.</p>
          <p>Humility for the spirit, compassion for the mind, frugality for the body.</p>
        </section>

        <section class="panel">
          <h2>Stoicism: the four virtues</h2>
          <p><b>Wisdom</b> (prudentia), <b>justice</b>, <b>courage</b> (fortitude) and <b>temperance</b> (self-control). The table pairs them with the three appeals: <b>logos</b> (reason), <b>ethos</b> (character) and <b>pathos</b> (feeling).</p>
          <p>Reason and wisdom lead the spirit. Justice and courage shape your character. Temperance keeps the body's appetites in check.</p>
        </section>

        <section class="panel wide">
          <h2>Stoicism: the daily review</h2>
          <div class="stoic-text">${WK.stoicText()}
          </div>
        </section>

        <section class="panel">
          <h2>The hierarchy of needs</h2>
          <p>Abraham Maslow saw needs as a pyramid: the body's needs, then safety, belonging, esteem and, at the top, becoming all you can be. The lower ones must be steady before the higher ones can hold your attention.</p>
          <p>Build from the base. Don't chase the top of the pyramid with the bottom falling away.</p>
        </section>

        <section class="panel">
          <h2>Seven areas, four archetypes</h2>
          <p>Jack Canfield's advice is to set goals in every area of life so that none is left behind: ${F.CATEGORIES.map(c => esc(c.name)).join(', ')}.</p>
          <p>Robert Moore and Douglas Gillette describe four mature energies. The <b>King</b> brings order and vision (personal development). The <b>Warrior</b> brings discipline and action (career). The <b>Magician</b> brings knowledge and skill (community). The <b>Lover</b> brings feeling and connection (love).</p>
        </section>

        <section class="panel wide">
          <h2>The four quadrants</h2>
          <p>Stephen Covey sorts everything you could do by two questions: is it urgent, and is it important? Live in <b>Personal Leadership</b>. The more time you give it, the smaller Necessity becomes.</p>
          <div class="quad-mini">${F.QUADRANTS.map(q => `
            <div class="q-${q.key}"><b>${esc(q.name)}</b> <span class="muted small">${esc(q.hint)} · ${esc(q.action)}</span>
              <span class="small">${esc(q.examples.join(', '))}</span></div>`).join('')}</div>
        </section>

        <section class="panel wide">
          <h2>In my own words, 2014</h2>
          <p class="muted small">From “All I Want”: my prayer, my affirmation and how I meant to keep a clear conscience.</p>
          ${F.DEVOTIONS.filter(d => d.mine).map(d => `
            <h3 class="mine-title">${esc(d.title)}</h3>
            <div class="mine-words">${WK.devotionHtml(d)}</div>`).join('')}
          <h3 class="mine-title">Have a clear conscience</h3>
          <ul class="mine-words mine-list">${F.CONSCIENCE.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        </section>
      </div>`;
  }
})();
