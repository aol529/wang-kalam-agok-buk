/* Minimum home routine: the daily, weekly and monthly lists from the
   Systems card, drawn as a panel on the Today page, which loads them.
   A tick is a row in routine_ticks for this day, week (its Monday) or
   month, so each list starts fresh on its own schedule. */
(function(){
  const { $, esc } = WK;
  const S = WK.SYS;

  let ticks = new Set();      // 'period|item'
  let missing = false;        // the table isn't there yet (sql/06-systems.sql)
  let open = WK.store('wk_routine_tab') || 'day';

  // 'day:2026-10-19', 'week:2026-10-19' (the Monday), 'month:2026-10'.
  function periodOf(key){
    const today = WK.isoDate();
    if (key === 'day') return 'day:' + today;
    if (key === 'month') return 'month:' + today.slice(0, 7);
    return 'week:' + WK.addDays(today, -((WK.parseDate(today).getDay() + 6) % 7));
  }

  async function load(){
    const periods = S.HOME.map(l => periodOf(l.key));
    const { data, error } = await WK.db.from('routine_ticks').select('period,item').in('period', periods);
    if (error){ missing = error.code === 'PGRST205' || error.code === '42P01'; if (missing) return; throw error; }
    missing = false;
    ticks = new Set((data || []).map(r => r.period + '|' + r.item));
  }

  const isTicked = (key, item) => ticks.has(periodOf(key) + '|' + item);
  const doneIn = l => l.items.filter(i => isTicked(l.key, i)).length;

  function panel(){
    const l = S.HOME.find(x => x.key === open) || S.HOME[0];
    const n = doneIn(l);
    return `
      <section class="panel routine">
        <h2>Minimum home routine <span class="muted small" id="routine-count">${n} of ${l.items.length}</span></h2>
        ${missing ? '<p class="empty">Run <code>sql/06-systems.sql</code> in Supabase to start ticking.</p>' : `
        <div class="routine-tabs" role="tablist">${S.HOME.map(x => `
          <button type="button" role="tab" data-routine-tab="${x.key}" aria-selected="${x.key === l.key}">${esc(x.name)} <span class="count">${doneIn(x)}/${x.items.length}</span></button>`).join('')}
        </div>
        <div class="progress"><i id="routine-bar" style="width:${Math.round(n / l.items.length * 100)}%"></i></div>
        <ul class="conscience-list">${l.items.map((it, i) => `
          <li><label class="check"><input type="checkbox" data-routine="${i}"${isTicked(l.key, it) ? ' checked' : ''}> <span>${esc(it)}</span></label></li>`).join('')}
        </ul>
        <p class="muted small routine-note">The floor, not the ceiling. Never miss twice.</p>`}
      </section>`;
  }

  function bind(el){
    el.querySelectorAll('[data-routine-tab]').forEach(b => {
      b.onclick = () => { open = b.dataset.routineTab; WK.store('wk_routine_tab', open); WK.refresh(); };
    });
    const l = S.HOME.find(x => x.key === open) || S.HOME[0];
    const counts = () => {
      const n = doneIn(l);
      $('routine-count').textContent = n + ' of ' + l.items.length;
      $('routine-bar').style.width = Math.round(n / l.items.length * 100) + '%';
      const tab = el.querySelector(`[data-routine-tab="${l.key}"] .count`);
      if (tab) tab.textContent = n + '/' + l.items.length;
    };
    el.querySelectorAll('[data-routine]').forEach(box => {
      box.onchange = async () => {
        const item = l.items[Number(box.dataset.routine)], period = periodOf(l.key), k = period + '|' + item;
        if (box.checked) ticks.add(k); else ticks.delete(k);
        counts();
        const { error } = box.checked
          ? await WK.db.from('routine_ticks').upsert([{ period, item }], { onConflict: 'owner_id,period,item' })
          : await WK.db.from('routine_ticks').delete().eq('period', period).eq('item', item);
        if (error){
          box.checked = !box.checked;
          if (box.checked) ticks.add(k); else ticks.delete(k);
          counts();
          WK.toast('Not saved: ' + error.message);
        }
      };
    });
  }

  WK.routine = { load, panel, bind, reset(){ ticks = new Set(); missing = false; } };
})();
