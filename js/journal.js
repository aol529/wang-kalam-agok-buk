/* Journal: dated entries tagged by life area, with a mood and what you're
   grateful for. A prompt a day from the life path. Any entry can be marked
   "for my children": it then appears in Legacy too. Letters (Legacy) are
   entries of kind 'letter' and share the same editor. The Stoic review
   starts a morning or evening entry from its questions. "Blog it" saves
   an entry and starts a blog post from it. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;

  let entries = [];           // journal entries and letters, newest first
  let filter = { q: '', area: '', children: false, practice: '' };

  // Read by Today and Legacy.
  WK.entries = () => entries;

  WK.section({ name: 'journal', label: 'Journal', load, render, reset(){ entries = []; } });

  async function load(){
    const { data, error } = await WK.db.from('journal_entries').select('*')
      .order('entry_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    entries = data || [];
  }
  function sortEntries(){
    entries.sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // The day's prompt, the same all day, in turn through the list.
  WK.promptOfDay = (iso) => {
    const n = Math.floor(WK.parseDate(iso || WK.isoDate()).getTime() / 86400000);
    return F.JOURNAL_PROMPTS[((n % F.JOURNAL_PROMPTS.length) + F.JOURNAL_PROMPTS.length) % F.JOURNAL_PROMPTS.length];
  };

  // Start today's Stoic morning or evening entry, or reopen it if it's
  // already written. `lead` goes above the questions (the Planner's notes).
  WK.startStoic = (key, iso, lead) => {
    const t = F.STOIC[key];
    const day = iso || WK.isoDate();
    const had = entries.find(e => e.kind === 'journal' && e.entry_date === day && e.title === t.title);
    if (had) return openEntry(had);
    const body = F.STOIC.body(t, lead);
    openEntry(null, { kind: 'journal', entry_date: day, title: t.title, body, areas: ['Personal Development'] });
    // Put the cursor under the first question.
    const at = body.indexOf(t.headings[0]) + t.headings[0].length + 1;
    $('entry-form').body.setSelectionRange(at, at);
    $('entry-form').body.scrollTop = 0;
  };

  // The practice in full, word for word. The Way in Legacy shows it too.
  WK.stoicText = () => {
    const S = F.STOIC;
    return `
            <p>The Stoics didn't leave a formal "journaling method," but several of them describe a daily review practice in enough detail that we can reconstruct the criteria.</p>
            <p><b>Seneca's evening review</b> (<i>On Anger</i>, Book 3) is the most explicit. He says he learned it from the philosopher Sextius. Each night, once the lamp was out and the house was quiet, Seneca went back over his whole day, word by word and deed by deed. He asked himself three things:</p>
            <ul><li>What bad habit have I cured today?</li><li>What fault have I resisted?</li><li>In what way am I better?</li></ul>
            <p>He treated it as a trial in which he was both judge and defendant, but a fair judge, not a harsh one. If he found a fault, he named it, resolved to do better, and then forgave himself ("I'll pardon you this time"). The point was correction, not self-punishment.</p>
            <p><b>Epictetus</b> (<i>Discourses</i> 3.10) recommended the Pythagorean <i>Golden Verses</i>: don't let sleep come until you've gone over each act of the day. The three questions there are:</p>
            <ul><li>Where did I go wrong?</li><li>What did I do?</li><li>What duty did I leave undone?</li></ul>
            <p>He adds that you should rebuke yourself for what was wrong and take satisfaction in what was good. He also stressed sorting events by his central distinction: what was in my control (my judgments, choices, responses) and what wasn't. A good review asks whether you handled the things in your power well and stayed calm about the rest.</p>
            <p><b>Marcus Aurelius</b> shows the practice in action. The <i>Meditations</i> is literally his private notebook, titled roughly "To Himself." His entries suggest a <b>morning</b> counterpart to the evening review. In Book 2 he starts the day by expecting to meet difficult people, ungrateful, arrogant, or dishonest ones, and reminds himself that they act from ignorance, that they're his kin, and that nothing they do can harm his character. Much of his writing is him repeating principles to himself until they stick, rather than recording events.</p>
            <p><b>Putting it together, the criteria were roughly:</b></p>
            <ol>${S.criteria.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
            <p>The goal was moral progress (<i>prokopē</i>), measured by how you used your judgment, not by what happened to you.</p>`;
  };

  function stoicPanel(){
    const S = F.STOIC;
    return `
      <section class="stoic-card">
        <div class="stoic-head">
          <span class="prompt-label">The Stoic review</span>
          <button type="button" class="btn small" data-stoic="morning">${S.morning.icon} ${esc(S.morning.label)}</button>
          <button type="button" class="btn small" data-stoic="evening">${S.evening.icon} ${esc(S.evening.label)}</button>
        </div>
        <details>
          <summary>Where it comes from, and the six criteria</summary>
          <div class="stoic-text">${WK.stoicText()}
          </div>
        </details>
      </section>`;
  }

  function render(){
    const el = $('section-journal');
    const prompt = WK.promptOfDay();
    const journal = entries.filter(e => e.kind === 'journal');
    const q = filter.q.toLowerCase();
    const list = journal.filter(e =>
      (!filter.area || (e.areas || []).includes(filter.area)) &&
      (!filter.children || e.for_children) &&
      (!filter.practice || (F.STOIC.of(e) || {}).key === filter.practice) &&
      (!q || (e.title + ' ' + e.body + ' ' + e.gratitude).toLowerCase().includes(q)));
    el.innerHTML = `
      <div class="section-head">
        <h1>Journal</h1>
        <button type="button" class="btn primary" id="entry-new">+ New entry</button>
      </div>
      <div class="prompt-card">
        <span class="prompt-label">Today's prompt</span>
        <p>${esc(prompt)}</p>
        <button type="button" class="btn small" id="entry-prompt">Write about it</button>
      </div>
      ${stoicPanel()}
      <div class="filters">
        <input type="search" id="j-search" placeholder="Search entries" value="${esc(filter.q)}">
        <select id="j-area" aria-label="Life area">
          <option value="">All life areas</option>
          ${F.CATEGORIES.map(c => `<option value="${esc(c.name)}"${filter.area === c.name ? ' selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}
        </select>
        <select id="j-practice" aria-label="Kind of entry">
          <option value="">All entries</option>
          ${['evening', 'morning'].map(k => `<option value="${k}"${filter.practice === k ? ' selected' : ''}>${F.STOIC[k].icon} ${esc(F.STOIC[k].label)}s</option>`).join('')}
        </select>
        <label class="toggle"><input type="checkbox" id="j-children"${filter.children ? ' checked' : ''}> For my children</label>
      </div>
      <div id="j-list">${list.length ? groupByMonth(list) : `<p class="empty">${journal.length ? 'No entries match.' : 'No entries yet. Start with today’s prompt.'}</p>`}</div>`;

    $('entry-new').onclick = () => openEntry(null, { kind: 'journal' });
    $('entry-prompt').onclick = () => openEntry(null, { kind: 'journal', title: prompt });
    $('j-search').oninput = e => { filter.q = e.target.value; drawList(); };
    $('j-area').onchange = e => { filter.area = e.target.value; render(); };
    $('j-practice').onchange = e => { filter.practice = e.target.value; render(); };
    el.querySelectorAll('[data-stoic]').forEach(b => { b.onclick = () => WK.startStoic(b.dataset.stoic); });
    $('j-children').onchange = e => { filter.children = e.target.checked; render(); };
    wireList($('j-list'));
  }
  // Search redraws only the list, so typing keeps its focus.
  function drawList(){
    const caret = $('j-search').selectionStart;
    render();
    $('j-search').focus();
    $('j-search').setSelectionRange(caret, caret);
  }

  function groupByMonth(list){
    let html = '', month = '';
    list.forEach(e => {
      const m = (e.entry_date || '').slice(0, 7);
      if (m !== month){
        if (month) html += '</div>';
        month = m;
        html += `<h2 class="month">${esc(WK.fmtDate(m + '-01', { month: 'long', year: 'numeric' }))}</h2><div class="entries">`;
      }
      html += entryCard(e);
    });
    return html + '</div>';
  }
  function entryCard(e){
    const excerpt = (e.body || '').slice(0, 240) + ((e.body || '').length > 240 ? '…' : '');
    return `
      <article class="entry" data-entry="${e.id}" tabindex="0">
        <div class="entry-date"><b>${WK.parseDate(e.entry_date).getDate()}</b><span>${esc(WK.fmtDate(e.entry_date, { weekday: 'short' }))}</span></div>
        <div class="entry-body">
          <h3>${e.mood ? `<span class="mood">${F.MOODS[e.mood - 1]}</span>` : ''}${esc(e.title || 'Untitled')}
            ${e.kind === 'letter' ? `<span class="chip">Letter${e.to_whom ? ' to ' + esc(e.to_whom) : ''}</span>` : ''}
            ${e.for_children && e.kind !== 'letter' ? '<span class="chip legacy-chip" title="For my children">🌳 For my children</span>' : ''}</h3>
          ${excerpt ? `<p class="entry-excerpt">${esc(excerpt)}</p><p class="entry-full">${esc(e.body)}</p>` : ''}
          ${e.gratitude ? `<p class="entry-full"><b>Grateful for:</b> ${esc(e.gratitude)}</p>` : ''}
          ${(e.areas || []).length ? `<div class="entry-areas">${e.areas.map(a => `<span title="${esc(a)}">${F.catOf(a).icon} ${esc(a)}</span>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }
  WK.entryCard = entryCard;
  function wireList(root){
    root.querySelectorAll('[data-entry]').forEach(el => {
      const e = entries.find(x => x.id === el.dataset.entry);
      el.onclick = () => openEntry(e);
      el.onkeydown = ev => { if (ev.key === 'Enter') openEntry(e); };
    });
  }
  WK.wireEntries = wireList;

  /* ---------------------------- Entry dialog --------------------------- */
  let editing = null;
  let kind = 'journal';

  function openEntry(e, preset){
    const form = $('entry-form');
    editing = e || null;
    const v = e || Object.assign({ kind: 'journal', entry_date: WK.isoDate(), areas: [], for_children: false }, preset);
    kind = v.kind || 'journal';
    const letter = kind === 'letter';
    $('entry-dialog-title').textContent = (e ? 'Edit ' : 'New ') + (letter ? 'letter' : 'entry');
    form.entry_date.value = v.entry_date || WK.isoDate();
    form.title.value = v.title || '';
    form.body.value = v.body || '';
    form.body.placeholder = letter ? 'Dear …' : 'What happened, what you thought, what you learned';
    form.gratitude.value = v.gratitude || '';
    form.for_children.checked = letter || !!v.for_children;
    form.to_whom.value = v.to_whom || '';
    form.open_on.value = v.open_on || '';
    form.querySelectorAll('input[name="mood"]').forEach(r => { r.checked = Number(r.value) === (v.mood || 0); });
    form.querySelectorAll('input[name="areas"]').forEach(c => { c.checked = (v.areas || []).includes(c.value); });
    form.querySelectorAll('.journal-only').forEach(x => { x.hidden = letter; });
    form.querySelectorAll('.letter-only').forEach(x => { x.hidden = !letter; });
    $('entry-delete').hidden = !e;
    $('entry-blog').hidden = letter;
    $('entry-error').textContent = '';
    $('entry-dialog').showModal();
    (v.title ? form.body : form.title).focus();
  }
  WK.openEntry = openEntry;

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = $('entry-dialog');
    const form = $('entry-form');
    form.querySelector('.mood-pick').innerHTML = F.MOODS.map((m, i) =>
      `<label title="Mood ${i + 1}"><input type="radio" name="mood" value="${i + 1}"><span>${m}</span></label>`).join('');
    // Click the chosen mood again to clear it.
    form.querySelectorAll('input[name="mood"]').forEach(r => {
      r.onclick = () => { if (r.dataset.was === '1'){ r.checked = false; } form.querySelectorAll('input[name="mood"]').forEach(x => { x.dataset.was = x.checked ? '1' : ''; }); };
    });
    form.querySelector('.area-pick').innerHTML = F.CATEGORIES.map(c =>
      `<label><input type="checkbox" name="areas" value="${esc(c.name)}"><span>${c.icon} ${esc(c.name)}</span></label>`).join('');
    $('entry-cancel').onclick = () => dlg.close();

    // Save the open entry. Returns the saved row, or null if it wasn't saved.
    async function saveEntry(){
      const body = form.body.value.trim(), title = form.title.value.trim();
      if (!body && !title){ form.body.focus(); return null; }
      const btn = $('entry-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      $('entry-error').textContent = '';
      const mood = form.querySelector('input[name="mood"]:checked');
      const fields = {
        kind,
        entry_date: form.entry_date.value || WK.isoDate(),
        title, body,
        areas: [...form.querySelectorAll('input[name="areas"]:checked')].map(c => c.value),
        mood: kind === 'journal' && mood ? Number(mood.value) : null,
        gratitude: kind === 'journal' ? form.gratitude.value.trim() : '',
        for_children: kind === 'letter' || form.for_children.checked,
        to_whom: kind === 'letter' ? form.to_whom.value.trim() : '',
        open_on: kind === 'letter' && form.open_on.value ? form.open_on.value : null,
        updated_at: new Date().toISOString()
      };
      try {
        const q = editing ? WK.db.from('journal_entries').update(fields).eq('id', editing.id) : WK.db.from('journal_entries').insert([fields]);
        const { data, error } = await q.select().single();
        if (error) throw error;
        const i = entries.findIndex(x => x.id === data.id);
        if (i >= 0) entries[i] = data; else entries.push(data);
        sortEntries();
        return data;
      } catch (err){
        $('entry-error').textContent = 'Not saved: ' + err.message;
        return null;
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    }

    form.onsubmit = async ev => {
      ev.preventDefault();
      const wasNew = !editing;
      if (!await saveEntry()) return;
      dlg.close();
      WK.refresh();
      WK.toast(!wasNew ? 'Saved.' : (kind === 'letter' ? 'Letter kept.' : 'Entry saved.'));
    };

    // Save the entry, then carry it to the Blog as a draft post.
    $('entry-blog').onclick = async () => {
      const e = await saveEntry();
      if (!e) return;
      dlg.close();
      WK.blogIt({ title: e.title, body: e.body, category: (e.areas || [])[0] || 'Personal Development', source_entry_id: e.id });
    };

    $('entry-delete').onclick = async () => {
      if (!editing || !confirm('Delete "' + (editing.title || 'this entry') + '"?')) return;
      const { error } = await WK.db.from('journal_entries').delete().eq('id', editing.id);
      if (error){ $('entry-error').textContent = 'Not deleted: ' + error.message; return; }
      entries = entries.filter(x => x.id !== editing.id);
      dlg.close();
      WK.refresh();
      WK.toast('Deleted.');
    };
  });
})();
