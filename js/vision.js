/* Vision: goals in the seven life areas, seen three ways — a board of
   picture cards by area, the hierarchy of needs as a pyramid, and the
   urgent/important grid. A goal can be dragged between areas, levels or
   boxes; on a phone, open it and change the field instead. */
(function(){
  const { $, esc } = WK;
  const F = WK.F;
  const BUCKET = 'vision-images';

  let goals = [];
  let signed = {};            // image_path -> signed URL
  let view = WK.store('wk_vision_view') || 'board';

  // Read by Today and the Planner.
  WK.goals = () => goals;

  WK.section({ name: 'vision', label: 'Vision', load, render, reset(){ goals = []; signed = {}; } });

  async function load(){
    const { data, error } = await WK.db.from('goals').select('*')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    goals = data || [];
    await signImages();
  }
  // Private bucket: pictures are shown through links that last a day.
  async function signImages(){
    const paths = [...new Set(goals.map(g => g.image_path).filter(p => p && !signed[p]))];
    if (!paths.length) return;
    const { data } = await WK.db.storage.from(BUCKET).createSignedUrls(paths, 86400);
    (data || []).forEach(r => { if (r.signedUrl) signed[r.path] = r.signedUrl; });
  }
  const imageOf = g => (g.image_path && signed[g.image_path]) || g.image_url || '';

  async function saveGoal(id, fields){
    fields.updated_at = new Date().toISOString();
    const q = id ? WK.db.from('goals').update(fields).eq('id', id) : WK.db.from('goals').insert([fields]);
    const { data, error } = await q.select().single();
    if (error) throw error;
    const i = goals.findIndex(g => g.id === data.id);
    if (i >= 0) goals[i] = data; else goals.push(data);
    await signImages();
    return data;
  }
  // Drag-and-drop and quick changes: update in place, put it back if the
  // save fails.
  async function patchGoal(g, fields){
    const before = Object.assign({}, g);
    Object.assign(g, fields);
    render();
    try { await saveGoal(g.id, fields); }
    catch (err){ Object.assign(g, before); render(); WK.toast('Not saved: ' + err.message); }
  }
  WK.patchGoal = patchGoal;

  /* ------------------------------- Views ------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('vision-tabs').querySelectorAll('[data-view]').forEach(b => {
      b.onclick = () => { view = b.dataset.view; WK.store('wk_vision_view', view); render(); };
    });
    $('show-done').checked = WK.store('wk_show_done') === '1';
    $('show-done').onchange = () => { WK.store('wk_show_done', $('show-done').checked ? '1' : '0'); render(); };
    $('add-goal').onclick = () => openGoal(null, {});
  });

  const visible = () => goals.filter(g => $('show-done').checked || !g.done);

  function render(){
    $('vision-tabs').querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
    ['board', 'needs', 'priorities'].forEach(v => { $('view-' + v).hidden = v !== view; });
    if (view === 'board') renderBoard();
    if (view === 'needs') renderNeeds();
    if (view === 'priorities') renderPriorities();
  }

  const levelChip = g => '<span class="chip lvl lvl' + g.need_level + '" title="' + esc(F.LEVELS[g.need_level].hint) + '">' + esc(F.LEVELS[g.need_level].name) + '</span>';
  const quadChip = g => { const q = F.quadOf(g); return '<span class="chip q-' + q.key + '" title="' + esc(q.hint) + '">' + esc(q.name) + '</span>'; };
  const dateChip = g => g.target_date ? '<span class="chip date">' + esc(WK.fmtDate(g.target_date)) + '</span>' : '';

  // Board: one section per life area, picture cards inside.
  function renderBoard(){
    const list = visible();
    $('view-board').innerHTML = (goals.length ? '' : `
      <div class="starter">
        <p>Your board is empty. Start from the goals in your Canfield notes? You can edit or delete any of them.</p>
        <button type="button" class="btn primary" id="add-starters">Add ${F.STARTERS.length} starter goals</button>
      </div>`) + F.CATEGORIES.map(c => {
      const mine = list.filter(g => g.category === c.name);
      return `
        <div class="area drop" data-set-category="${esc(c.name)}">
          <div class="area-head">
            <h2><span class="area-icon">${c.icon}</span>${esc(c.name)}</h2>
            ${c.archetype ? `<span class="archetype">${esc(c.archetype)}</span>` : ''}
            <span class="count">${mine.length}</span>
            ${c.name === 'Career' ? '<button type="button" class="btn ghost small riches-btn" id="career-open">💼 Career day</button>' : ''}
            ${c.name === 'Wealth & Finance' ? '<button type="button" class="btn ghost small riches-btn" id="riches-open">💰 Desire to riches</button>' : ''}
            <button type="button" class="btn ghost small" data-add-category="${esc(c.name)}">+ Add</button>
          </div>
          <div class="cards">
            ${mine.length ? mine.map(card).join('') : '<p class="empty">No goals here yet.</p>'}
          </div>
        </div>`;
    }).join('');
    if ($('add-starters')) $('add-starters').onclick = addStarters;
    if ($('riches-open')) $('riches-open').onclick = openRiches;
    if ($('career-open')) $('career-open').onclick = () => $('career-dialog').showModal();
    $('view-board').querySelectorAll('[data-add-category]').forEach(b => {
      b.onclick = () => openGoal(null, { category: b.dataset.addCategory, need_level: F.catOf(b.dataset.addCategory).level });
    });
    wire($('view-board'));
  }
  function card(g){
    const img = imageOf(g);
    const c = F.catOf(g.category);
    return `
      <article class="card${g.done ? ' is-done' : ''}" draggable="true" data-id="${g.id}" tabindex="0">
        <div class="card-img"${img ? ` style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : `<span>${c.icon}</span>`}</div>
        <div class="card-body">
          <h3>${g.done ? '✓ ' : ''}${esc(g.title)}</h3>
          ${g.next_step ? `<p class="next">→ ${esc(g.next_step)}</p>` : ''}
          <div class="chips">${levelChip(g)}${quadChip(g)}${dateChip(g)}</div>
        </div>
      </article>`;
  }

  // Needs: the pyramid, Self-actualisation on top, each level with its
  // part of the self (Spirit, Mind, Body) and its life areas.
  function renderNeeds(){
    const list = visible();
    const total = list.length || 1;
    $('view-needs').innerHTML = '<p class="lead">Where your goals sit on the hierarchy of needs. Build from the base: thin levels near the bottom are worth a look first.</p>' +
      [5, 4, 3, 2, 1].map(l => {
        const mine = list.filter(g => g.need_level === l);
        const realm = F.LEVELS[l].realm;
        const width = 40 + (5 - l) * 15;
        return `
          <div class="tier drop" data-set-level="${l}">
            <div class="tier-band lvl${l}" style="--w:${width}%">
              <strong>${l}. ${esc(F.LEVELS[l].name)}</strong>
              <span>${mine.length} goal${mine.length === 1 ? '' : 's'} · ${Math.round(mine.length / total * 100)}%</span>
            </div>
            <p class="tier-hint">${esc(F.LEVELS[l].hint)}</p>
            ${realm !== (F.LEVELS[l + 1] || {}).realm ? `<p class="tier-realm"><b>${esc(realm)}</b> · ${esc(F.REALMS[realm].summary)}</p>` : ''}
            <p class="tier-areas">${F.CATEGORIES.filter(c => c.level === l).map(c => c.icon + ' ' + esc(c.name)).join(' · ')}</p>
            <div class="pills">${mine.map(pill).join('') || '<span class="empty">Nothing at this level yet.</span>'}</div>
          </div>`;
      }).join('');
    wire($('view-needs'));
  }
  function pill(g){
    return `<button type="button" class="pill${g.done ? ' is-done' : ''}" draggable="true" data-id="${g.id}" title="${esc(g.category)}">${F.catOf(g.category).icon} ${esc(g.title)}</button>`;
  }

  // Priorities: the urgent/important grid, in Covey's names.
  function renderPriorities(){
    const list = visible();
    $('view-priorities').innerHTML = `
      <p class="lead">Live in Personal Leadership. Drag goals between boxes, or open one and tick Urgent / Important.</p>
      <div class="matrix">
        <div class="axis axis-top"><span>Urgent</span><span>Not urgent</span></div>
        <div class="axis axis-side"><span>Important</span><span>Not important</span></div>
        <div class="quads">
          ${['do', 'schedule', 'delegate', 'drop'].map(k => {
            const q = F.QUADRANTS.find(x => x.key === k);
            const mine = list.filter(g => F.quadOf(g).key === k);
            return `
              <div class="quad q-${k} drop" data-set-urgent="${q.urgent}" data-set-important="${q.important}">
                <h2>${esc(q.name)} <span class="count">${mine.length}</span></h2>
                <p class="quad-hint"><b>${esc(q.action)}.</b> ${esc(q.examples.join(', '))}</p>
                <ul>${mine.map(g => `
                  <li>${pill(g)}
                  ${g.next_step ? `<span class="next">→ ${esc(g.next_step)}</span>` : ''}</li>`).join('') || '<li class="empty">Empty</li>'}
                </ul>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    wire($('view-priorities'));
  }

  // Click to edit; drag onto an area, level or box to move it there.
  function wire(root){
    root.querySelectorAll('[data-id]').forEach(el => {
      const g = goals.find(x => x.id === el.dataset.id);
      el.onclick = () => openGoal(g);
      el.onkeydown = e => { if (e.key === 'Enter' && el.tagName !== 'BUTTON') openGoal(g); };
      el.ondragstart = e => { e.dataTransfer.setData('text/plain', g.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); };
      el.ondragend = () => el.classList.remove('dragging');
    });
    root.querySelectorAll('.drop').forEach(zone => {
      zone.ondragover = e => { e.preventDefault(); zone.classList.add('over'); };
      zone.ondragleave = e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('over'); };
      zone.ondrop = e => {
        e.preventDefault();
        zone.classList.remove('over');
        const g = goals.find(x => x.id === e.dataTransfer.getData('text/plain'));
        if (!g) return;
        const d = zone.dataset, fields = {};
        if (d.setCategory && d.setCategory !== g.category) fields.category = d.setCategory;
        if (d.setLevel && Number(d.setLevel) !== g.need_level) fields.need_level = Number(d.setLevel);
        if (d.setUrgent && (d.setUrgent === 'true') !== g.urgent) fields.urgent = d.setUrgent === 'true';
        if (d.setImportant && (d.setImportant === 'true') !== g.important) fields.important = d.setImportant === 'true';
        if (Object.keys(fields).length) patchGoal(g, fields);
      };
    });
  }

  async function addStarters(){
    const btn = $('add-starters');
    btn.disabled = true; btn.textContent = 'Adding…';
    const rows = F.STARTERS.map(([category, title, notes], i) => ({
      category, title, notes, need_level: F.catOf(category).level, important: true, urgent: false, sort_order: i
    }));
    const { data, error } = await WK.db.from('goals').insert(rows).select();
    if (error){ btn.disabled = false; btn.textContent = 'Try again'; WK.toast('Not added: ' + error.message); return; }
    goals = goals.concat(data || []);
    render();
    WK.toast('Starter goals added.');
  }

  /* ---------------------------- Goal dialog ---------------------------- */
  let editing = null;         // the goal being edited, or null for a new one
  let levelTouched = false;   // a new goal's level follows its area until picked
  let pendingFile = null;     // a picture chosen but not yet uploaded
  let clearImage = false;

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = $('goal-dialog');
    const form = $('goal-form');
    form.category.innerHTML = F.CATEGORIES.map(c => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
    form.need_level.innerHTML = [1, 2, 3, 4, 5].map(l => `<option value="${l}">${l}. ${esc(F.LEVELS[l].name)}</option>`).join('');
    form.category.onchange = () => { if (!levelTouched) form.need_level.value = String(F.catOf(form.category.value).level); };
    form.need_level.onchange = () => { levelTouched = true; };

    $('image-file').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024){ $('goal-error').textContent = 'That picture is over 5 MB.'; e.target.value = ''; return; }
      pendingFile = f; clearImage = false; form.image_url.value = '';
      drawPreview();
    };
    form.image_url.oninput = () => { if (form.image_url.value.trim()){ pendingFile = null; clearImage = true; } drawPreview(); };
    $('image-clear').onclick = () => { pendingFile = null; clearImage = true; form.image_url.value = ''; $('image-file').value = ''; drawPreview(); };
    $('goal-cancel').onclick = () => dlg.close();

    form.onsubmit = async e => {
      e.preventDefault();
      const title = form.title.value.trim();
      if (!title){ form.title.focus(); return; }
      const btn = $('goal-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      $('goal-error').textContent = '';
      try {
        const fields = {
          title,
          category: form.category.value,
          need_level: Number(form.need_level.value),
          important: form.important.checked,
          urgent: form.urgent.checked,
          next_step: form.next_step.value.trim(),
          notes: form.notes.value.trim(),
          target_date: form.target_date.value || null,
          done: form.done.checked,
          image_url: form.image_url.value.trim()
        };
        const oldPath = editing ? editing.image_path : '';
        if (pendingFile){
          const ext = (pendingFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
          const path = WK.user.id + '/' + crypto.randomUUID() + '.' + ext;
          const { error } = await WK.db.storage.from(BUCKET).upload(path, pendingFile, { contentType: pendingFile.type });
          if (error) throw error;
          fields.image_path = path;
          fields.image_url = '';
        } else if (clearImage){
          fields.image_path = '';
        }
        if (!editing) fields.sort_order = goals.length;
        await saveGoal(editing && editing.id, fields);
        // The old upload isn't used any more.
        if (oldPath && 'image_path' in fields && fields.image_path !== oldPath){
          WK.db.storage.from(BUCKET).remove([oldPath]);
        }
        dlg.close();
        WK.refresh();
        WK.toast(editing ? 'Saved.' : 'Goal added.');
      } catch (err){
        $('goal-error').textContent = 'Not saved: ' + err.message;
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    };

    $('goal-delete').onclick = async () => {
      if (!editing || !confirm('Delete "' + editing.title + '"?')) return;
      const g = editing;
      const { error } = await WK.db.from('goals').delete().eq('id', g.id);
      if (error){ $('goal-error').textContent = 'Not deleted: ' + error.message; return; }
      if (g.image_path) WK.db.storage.from(BUCKET).remove([g.image_path]);
      goals = goals.filter(x => x.id !== g.id);
      dlg.close();
      WK.refresh();
      WK.toast('Deleted.');
    };
  });

  function drawPreview(){
    const form = $('goal-form');
    let src = '';
    if (pendingFile) src = URL.createObjectURL(pendingFile);
    else if (!clearImage && editing && editing.image_path) src = signed[editing.image_path] || '';
    if (!src) src = form.image_url.value.trim();
    $('image-preview').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '<span>No picture</span>';
  }

  function openGoal(g, preset){
    const form = $('goal-form');
    editing = g || null;
    const v = g || Object.assign({ category: F.CATEGORIES[0].name, need_level: F.CATEGORIES[0].level, important: true, urgent: false }, preset);
    $('goal-dialog-title').textContent = g ? 'Edit goal' : 'New goal';
    form.title.value = v.title || '';
    form.category.value = v.category;
    form.need_level.value = String(v.need_level || F.catOf(v.category).level);
    form.important.checked = !!v.important;
    form.urgent.checked = !!v.urgent;
    form.next_step.value = v.next_step || '';
    form.notes.value = v.notes || '';
    form.target_date.value = v.target_date || '';
    form.done.checked = !!v.done;
    form.image_url.value = v.image_url || '';
    $('goal-delete').hidden = !g;
    $('goal-error').textContent = '';
    levelTouched = !!g;
    pendingFile = null; clearImage = false;
    $('image-file').value = '';
    drawPreview();
    $('goal-dialog').showModal();
    form.title.focus();
  }
  WK.openGoal = openGoal;

  /* ------------- Career day: the 2018 Career notes ------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const C = F.CAREER;
    $('career-date').textContent = WK.fmtDate(C.date);
    $('career-blocks').innerHTML = C.blocks.map(b => `
      <section class="career-block">
        <h3>${esc(b.block)}${b.time ? ` <span class="muted small">(${esc(b.time)})</span>` : ''}</h3>
        <ul>${b.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      </section>`).join('');
    $('career-close').onclick = () => $('career-dialog').close();
    $('career-plan').onclick = () => { $('career-dialog').close(); WK.show('planner'); };
  });

  /* ------------- Desire to riches: Napoleon Hill's form, as a goal ------------- */
  function openRiches(){
    const form = $('riches-form');
    form.reset();
    $('riches-dialog').showModal();
    form.amount.focus();
  }
  document.addEventListener('DOMContentLoaded', () => {
    const R = F.RICHES;
    $('riches-quote').innerHTML = `${esc(R.quote)} <span>– ${esc(R.quoteBy)}</span>`;
    $('riches-cancel').onclick = () => $('riches-dialog').close();
    // The filled-in form becomes a Wealth & Finance goal: the amount as the
    // title, the plan as the next step, the five affirmations as the notes.
    $('riches-form').onsubmit = ev => {
      ev.preventDefault();
      const f = ev.target;
      const amount = f.amount.value.trim(), per = f.per.value;
      const n = Number(amount.replace(/[,$\s]/g, ''));
      const v = { amount: amount && isFinite(n) ? n.toLocaleString() : amount, per,
                  give: f.give.value.trim(), date: f.date.value ? WK.fmtDate(f.date.value) : '', plan: f.plan.value.trim() };
      $('riches-dialog').close();
      openGoal(null, {
        title: v.amount ? `Earn ${v.amount} dollars per ${per}` : 'My desire to riches',
        category: 'Wealth & Finance', need_level: F.catOf('Wealth & Finance').level,
        important: true, urgent: false,
        next_step: v.plan.split('\n')[0].slice(0, 200),
        target_date: f.date.value || '',
        notes: [R.title, R.note, ...R.lines(v), '', R.quote + ' – ' + R.quoteBy].join('\n')
      });
    };
  });
})();
