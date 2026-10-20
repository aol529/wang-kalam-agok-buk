/* Content: the built-in text and lists the CMS can edit. Each part is
   edited as plain text in a small format (one per line, "## " headings
   for groups), saved as JSON in site_content, and put in place of the
   original data, which the rest of the site reads as before. No row
   means the original; "Reset" deletes the row. The originals are kept
   here as they were when the page loaded. */
(function(){
  const F = WK.F, S = WK.SYS;

  const clone = v => JSON.parse(JSON.stringify(v));
  const fill = (arr, items) => { arr.splice(0, arr.length, ...items); };
  const lines = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean);
  const slug = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
  // "## Head" groups: [{ head, body }], with any text before the first.
  function groupsOf(text){
    const out = [], pre = [];
    let cur = null;
    String(text || '').split('\n').forEach(l => {
      const h = /^##\s+(.*)$/.exec(l.trim());
      if (h){ cur = { head: h[1].trim(), body: [] }; out.push(cur); }
      else (cur ? cur.body : pre).push(l);
    });
    out.forEach(g => { g.text = g.body.join('\n').trim(); });
    out.pre = pre.join('\n').trim();
    return out;
  }
  const fail = msg => { throw new Error(msg); };

  const PARTS = [];
  const part = def => { def.original = clone(def.get()); PARTS.push(def); };

  // ---------------------------------------------------------------- Today
  part({ key: 'affirmation', group: 'Today', label: 'Affirmation', where: 'Under the menu on every page, and on The Way.',
    help: 'One line.',
    get: () => F.AFFIRMATION,
    set: v => { F.AFFIRMATION = v; const el = document.getElementById('affirmation'); if (el) el.textContent = v; },
    toText: v => v, fromText: t => t.trim() || fail('The affirmation is empty.') });

  part({ key: 'conscience', group: 'Today', label: 'Have a clear conscience', where: 'The daily checklist on Today, and Review.',
    help: 'One point per line. A point you reword starts fresh: past ticks are kept under the old words.',
    get: () => F.CONSCIENCE, set: v => fill(F.CONSCIENCE, v),
    toText: v => v.join('\n'), fromText: t => lines(t).length ? lines(t) : fail('The list is empty.') });

  part({ key: 'home', group: 'Today', label: 'Minimum home routine', where: 'Today (daily, weekly, monthly ticks), Systems and Review.',
    help: 'Three groups, “## Daily”, “## Weekly” and “## Monthly”, one job per line.',
    get: () => S.HOME,
    set: v => v.forEach(l => { const h = S.HOME.find(x => x.key === l.key); if (h) fill(h.items, l.items); }),
    toText: v => v.map(l => `## ${l.name}\n${l.items.join('\n')}`).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t);
      return S.HOME.map(l => {
        const g = gs.find(x => x.head.toLowerCase() === l.name.toLowerCase()) || fail(`“## ${l.name}” is missing.`);
        return { key: l.key, name: l.name, items: lines(g.text) };
      });
    } });

  // ------------------------------------------------------------- Planner
  part({ key: 'routine', group: 'Planner', label: 'The working day', where: 'The Planner’s time blocks and “Start from my routine”.',
    help: 'A “## Block · time” heading for each block, then its tasks, one per line.',
    get: () => F.ROUTINE, set: v => fill(F.ROUTINE, v),
    toText: v => v.map(r => `## ${r.block}${r.time ? ' · ' + r.time : ''}\n${r.items.join('\n')}`).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t);
      if (!gs.length) fail('Add at least one “## Block” heading.');
      return gs.map(g => { const [block, ...time] = g.head.split(' · '); return { block: block.trim(), time: time.join(' · ').trim(), items: lines(g.text) }; });
    } });

  part({ key: 'quadrants', group: 'Planner', label: 'Quadrant examples', where: 'The Vision board’s quadrants, Budget and The Way.',
    help: 'Under each quadrant’s heading, one example per line. The four names stay.',
    get: () => F.QUADRANTS.map(q => ({ key: q.key, examples: q.examples })),
    set: v => v.forEach(x => { const q = F.QUADRANTS.find(y => y.key === x.key); if (q) q.examples = x.examples.slice(); }),
    toText: v => v.map(x => `## ${F.QUADRANTS.find(q => q.key === x.key).name}\n${x.examples.join('\n')}`).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t);
      return F.QUADRANTS.map(q => {
        const g = gs.find(x => x.head.toLowerCase() === q.name.toLowerCase()) || fail(`“## ${q.name}” is missing.`);
        return { key: q.key, examples: lines(g.text) };
      });
    } });

  // ------------------------------------------------------ Journal & Legacy
  part({ key: 'journal_prompts', group: 'Journal & Legacy', label: 'Journal prompts', where: 'One a day on Today and in the Journal, in turn.',
    help: 'One prompt per line.',
    get: () => F.JOURNAL_PROMPTS, set: v => fill(F.JOURNAL_PROMPTS, v),
    toText: v => v.join('\n'), fromText: t => lines(t).length ? lines(t) : fail('The list is empty.') });

  part({ key: 'letter_prompts', group: 'Journal & Legacy', label: 'Letter starting points', where: 'Legacy → Letters.',
    help: 'One per line. Start with a life area and a colon to file it there, e.g. “Career: What work taught me”.',
    get: () => F.LETTER_PROMPTS, set: v => fill(F.LETTER_PROMPTS, v),
    toText: v => v.map(([a, t]) => (a ? a + ': ' : '') + t).join('\n'),
    fromText: t => lines(t).map(l => {
      const c = F.CATEGORIES.find(x => l.toLowerCase().startsWith(x.name.toLowerCase() + ':'));
      return c ? [c.name, l.slice(c.name.length + 1).trim()] : ['', l];
    }) });

  part({ key: 'way', group: 'Journal & Legacy', label: 'The Way', where: 'Legacy → The Way, and the archive’s book.',
    help: 'The opening paragraph first, then a “## Title” for each panel with its text below. Markdown: **bold**, *italics*, “- ” bullets, blank lines between paragraphs.',
    get: () => WK.WAY,
    set: v => { WK.WAY.lead = v.lead; fill(WK.WAY.sections, v.sections); },
    toText: v => v.lead + '\n\n' + v.sections.map(s => `## ${s.title}\n${s.body}`).join('\n\n'),
    fromText: t => { const gs = groupsOf(t); return { lead: gs.pre, sections: gs.map(g => ({ title: g.head, body: g.text })) }; } });

  // --------------------------------------------------------------- Bible
  part({ key: 'devotions', group: 'Bible', label: 'Prayers and affirmations', where: 'The Bible tab’s shelf; yours also show in Legacy.',
    help: '“## Title | by whom” for each, then its words. Add “| mine” after the by-line to mark your own words, e.g. “## Dear Lord | My prayer, 2014 | mine”.',
    get: () => F.DEVOTIONS, set: v => fill(F.DEVOTIONS, v),
    toText: v => v.map(d => `## ${d.title}${d.by || d.mine ? ' | ' + (d.by || '') : ''}${d.mine ? ' | mine' : ''}\n${d.text}`).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t);
      if (!gs.length) fail('Add at least one “## Title”.');
      const old = PARTS.find(p => p.key === 'devotions').original;
      return gs.map(g => {
        const [title, by, mine] = g.head.split('|').map(x => x.trim());
        const had = F.DEVOTIONS.find(d => d.title === title) || old.find(d => d.title === title);
        return Object.assign({ key: had ? had.key : slug(title), title, by: by || '', text: g.text }, mine === 'mine' ? { mine: true } : {});
      });
    } });

  // ------------------------------------------------------------- Systems
  S.CARDS.forEach(card => part({ key: 'sys:' + card.key, group: 'Systems', label: card.icon + ' ' + card.title, where: 'Systems.',
    help: 'The action steps, one per line. Then “## Things that make it easier”' + (card.drains ? ' and “## Silent money drains”' : '') + ', one per line. A step you reword starts fresh: its old tick stays under the old words.',
    get: () => { const c = S.CARDS.find(x => x.key === card.key); return { steps: c.steps, easier: c.easier || null, drains: c.drains || null }; },
    set: v => { const c = S.CARDS.find(x => x.key === card.key); c.steps = clone(v.steps); if (v.easier) c.easier = v.easier.slice(); if (v.drains) c.drains = v.drains.slice(); },
    toText: v => [v.steps.map(s => s.text).join('\n'), v.easier ? '## Things that make it easier\n' + v.easier.join('\n') : '', v.drains ? '## Silent money drains\n' + v.drains.join('\n') : ''].filter(Boolean).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t), c = S.CARDS.find(x => x.key === card.key);
      const steps = lines(gs.pre).map((text, i) => {
        // Keep a step's law and its link when it stays, or stays in place.
        const same = c.steps.find(s => s.text === text) || c.steps[i];
        return Object.assign({ text, law: same ? same.law : c.laws[0] }, same && same.go ? { go: same.go } : {});
      });
      if (!steps.length) fail('Add at least one step.');
      const g = h => { const x = gs.find(y => y.head.toLowerCase().startsWith(h)); return x ? lines(x.text) : null; };
      return { steps, easier: c.easier ? (g('things') || []) : null, drains: c.drains ? (g('silent') || []) : null };
    } }));

  // ------------------------------------------------------------- Breathe
  const PHASE = { in: 'in', sip: 'in2', in2: 'in2', hold: 'hold', rest: 'rest', empty: 'rest', out: 'out' };
  const NAMES = { in: 'in', in2: 'sip', hold: 'hold', rest: 'rest', out: 'out' };
  part({ key: 'breathe', group: 'Breathe', label: 'Breathing techniques', where: 'The Breathe tab.',
    help: 'For each: “## Name”, then lines “pace:”, “for:”, “breath:” (in, sip, hold, out, rest with seconds, e.g. “in 4, hold 7, out 8”), “length:” (“3 min” or “4 breaths”), optionally “count: yes” to count breaths 1 to 10, then how to do it.',
    get: () => WK.BREATHE, set: v => fill(WK.BREATHE, v),
    toText: v => v.map(t => [
      `## ${t.name}`, `pace: ${t.pace}`, `for: ${t.for}`,
      `breath: ${t.phases.map(([k, s]) => NAMES[k] + ' ' + s).join(', ')}`,
      `length: ${t.rounds ? t.rounds + ' breaths' : t.minutes + ' min'}`,
      t.count ? 'count: yes' : '', t.how
    ].filter(Boolean).join('\n')).join('\n\n'),
    fromText: t => {
      const gs = groupsOf(t);
      if (!gs.length) fail('Add at least one “## Name”.');
      return gs.map(g => {
        const field = {}, how = [];
        g.body.forEach(l => { const m = /^(pace|for|breath|length|count):\s*(.*)$/i.exec(l.trim()); if (m) field[m[1].toLowerCase()] = m[2].trim(); else how.push(l); });
        const phases = (field.breath || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
          const m = /^([a-z0-9]+)\s+(\d+(?:\.\d+)?)$/i.exec(x);
          if (!m || !PHASE[m[1].toLowerCase()]) fail(`${g.head}: “${x}” isn’t a breath. Use in, sip, hold, out or rest with seconds.`);
          return [PHASE[m[1].toLowerCase()], Number(m[2])];
        });
        if (!phases.length) fail(`${g.head}: add a “breath:” line, e.g. “breath: in 4, out 6”.`);
        const len = /^(\d+(?:\.\d+)?)\s*(min|minutes?|breaths?|rounds?)$/i.exec(field.length || '');
        const had = WK.BREATHE.find(x => x.name === g.head);
        const out = { key: had ? had.key : slug(g.head), name: g.head, pace: field.pace || phases.map(p => p[1]).join(' · '), for: field.for || '',
          how: how.join('\n').trim(), phases };
        if (len && /^b|^r/i.test(len[2])) out.rounds = Math.max(1, Math.round(Number(len[1])));
        else out.minutes = len ? Number(len[1]) : 3;
        if (/^y/i.test(field.count || '')) out.count = true;
        return out;
      });
    } });

  // -------------------------------------------------------------- Storage
  const saved = new Set();    // keys with a row in site_content
  let missing = false;        // the table isn't there yet (sql/08-cms.sql)

  async function load(){
    const { data, error } = await WK.db.from('site_content').select('key,value');
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return []; throw error; }
    missing = false;
    saved.clear();
    (data || []).forEach(r => {
      const p = PARTS.find(x => x.key === r.key);
      if (!p) return;
      try { p.set(clone(r.value)); saved.add(r.key); } catch (e) { console.warn('Content ' + r.key + ' not applied', e); }
    });
    return data || [];   // the CMS also reads 'menu' and 'public_site' from here
  }

  async function save(key, text){
    const p = PARTS.find(x => x.key === key);
    const value = p.fromText(text);
    const { error } = await WK.db.from('site_content').upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'owner_id,key' });
    if (error) throw error;
    p.set(clone(value)); saved.add(key);
  }
  async function reset(key){
    const p = PARTS.find(x => x.key === key);
    const { error } = await WK.db.from('site_content').delete().eq('key', key);
    if (error) throw error;
    p.set(clone(p.original)); saved.delete(key);
  }
  // Signed out: everything back to the original.
  function resetAll(){ PARTS.forEach(p => { if (saved.has(p.key)) p.set(clone(p.original)); }); saved.clear(); }

  // Any other row (the menu, the public site): write it as it is.
  async function put(key, value){
    const { error } = await WK.db.from('site_content').upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'owner_id,key' });
    if (error) throw error;
  }
  async function drop(key){
    const { error } = await WK.db.from('site_content').delete().eq('key', key);
    if (error) throw error;
  }

  WK.content = {
    parts: () => PARTS, load, save, reset, resetAll, put, drop,
    text: key => { const p = PARTS.find(x => x.key === key); return p.toText(p.get()); },
    originalText: key => { const p = PARTS.find(x => x.key === key); return p.toText(p.original); },
    edited: key => saved.has(key),
    missing: () => missing
  };
})();
