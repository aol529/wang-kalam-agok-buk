/* Practice: Stoic exercises to do, not just read. Each has what it is,
   how to do it in a few steps, and a line from Seneca, Epictetus or Marcus
   in the translations in the Library (public domain). "+ Today" puts it in
   today's plan, where it's ticked like any task; "Write it" starts a
   journal entry laid out for it (the morning and evening ones open the
   Stoic preparation and review in the Journal, the retreat opens Breathe).
   One exercise is picked for each day, on this page and on Today. Nothing
   else is tracked. The exercises are the old ones that modern guides
   (the Daily Stoic, NJlifehacks and others) gather up; the wording here
   is the site's own. */
(function(){
  const { $, esc } = WK;

  const WHEN = {
    morning:   'Morning',
    day:       'During the day',
    evening:   'Evening',
    sometimes: 'Now and then'
  };
  const SHORT = { morning: 'Morning', day: 'Day', evening: 'Evening', sometimes: 'Anytime' };   // the filter buttons
  const EN = 'Epictetus, Enchiridion', MA = 'Marcus Aurelius, Meditations', SE = "Seneca's Morals";

  // write: 'morning' / 'evening' (the Journal's Stoic entries), or a body
  // for a new entry. go: a section to open instead. quote + by: a line
  // from the Library; source: where it's from, when there's no line.
  const EXERCISES = [
    { key: 'morning', name: 'Prepare for the day', when: 'morning',
      what: 'Before the day starts, expect the difficult people and decide now how you will meet them.',
      how: ['Picture the day ahead and who you will deal with', 'Expect some rudeness, ingratitude and selfishness, so it doesn’t surprise you', 'Decide what you will do anyway: stay patient, do your work, wish them well'],
      plan: 'Stoic morning: prepare for the day', write: 'morning',
      quote: 'Say this to yourself in the morning: Today I shall have to do with meddlers, with the ungrateful, with the insolent, with the crafty, with the envious and the selfish.', by: MA + ', Book II' },
    { key: 'control', name: 'Sort it into two piles', when: 'morning',
      what: 'For each worry, ask: is this in my power or not? Act on the first pile, let go of the second.',
      how: ['Write down what’s on your mind today', 'Mark each one: in my power (my effort, choices, words) or not (other people, results, the past)', 'Pick one thing from the first pile and do it', 'Cross out the second pile: not yours to carry'],
      plan: 'Sort today’s worries: in my power or not', write: 'What’s on my mind today:\n\n\nIn my power:\n\n\nNot in my power (let go):\n\n\nThe one thing I’ll do:\n',
      quote: 'There are things which are within our power, and there are things which are beyond our power.', by: EN + ' I' },

    { key: 'impressions', name: 'Test the first impression', when: 'day',
      what: 'When something upsets you, stop and check the story you’re telling yourself before you react.',
      how: ['Notice the jolt: anger, fear, hurt', 'Say to it: “You’re just an impression, not the thing itself”', 'Ask what actually happened, without the story', 'Only then decide what to do'],
      plan: 'Pause before reacting: test the impression',
      quote: 'Seek at once, therefore, to be able to say to every unpleasing semblance, “You are but a semblance and by no means the real thing.”', by: EN + ' I' },
    { key: 'faculty', name: 'What does this call for?', when: 'day',
      what: 'Turn every problem into practice: ask which strength the moment is asking you to use.',
      how: ['When something hard happens, name it', 'Ask: patience, courage, honesty, self-control, kindness?', 'Use that one, right now'],
      plan: 'Meet one problem today with the strength it calls for',
      quote: 'Upon every accident, remember to turn toward yourself and inquire what faculty you have for its use. If you encounter a handsome person, you will find continence the faculty needed; if pain, then fortitude; if reviling, then patience.', by: EN + ' X' },
    { key: 'otherize', name: 'See it as if it happened to someone else', when: 'day',
      what: 'When your plan breaks, ask how you would see it if it were a friend’s. Then give yourself the same calm.',
      how: ['Picture the same thing happening to someone else', 'Notice how small and ordinary it looks from there', 'Take the same view of your own'],
      plan: 'Look at today’s setback as if it were someone else’s',
      quote: 'As when our neighbor’s boy has broken a cup, or the like, we are ready at once to say, “These are casualties that will happen”; be assured, then, that when your own cup is likewise broken, you ought to be affected just as when another’s cup was broken.', by: EN + ' XXVI' },
    { key: 'price', name: 'Pay the price of peace', when: 'day',
      what: 'For small losses and annoyances, tell yourself: this is what calm costs, and it’s cheap.',
      how: ['Spot the small thing: spilt drink, late bus, a small loss', 'Say: “This is the price of my peace of mind”', 'Pay it and move on'],
      plan: 'Let one small annoyance go: the price of peace',
      quote: 'This is the price paid for peace and tranquillity; and nothing is to be had for nothing.', by: EN + ' XII' },
    { key: 'silent', name: 'Speak little, listen more', when: 'day',
      what: 'For one conversation today, say only what’s needed and listen properly. No gossip.',
      how: ['Pick one conversation or meeting', 'Ask questions and listen to the answers', 'Say what’s needed, briefly', 'Don’t talk about people who aren’t there'],
      plan: 'One conversation today: listen more, speak little, no gossip',
      quote: 'Be mostly silent, or speak merely what is needful, and in few words.', by: EN + ' XXXIII' },
    { key: 'actor', name: 'Play your part well', when: 'day',
      what: 'You don’t choose your role, only how well you play it. Do today’s part as well as it can be done.',
      how: ['Name your roles today: worker, parent, friend, son or daughter', 'Pick one and ask what doing it well looks like today', 'Do that'],
      plan: 'Play one of my roles really well today',
      quote: 'Remember that you are an actor in a drama of such sort as the Author chooses—if short, then in a short one; if long, then in a long one.', by: EN + ' XVII' },
    { key: 'reserve', name: 'Add “if nothing gets in the way”', when: 'day',
      what: 'Aim hard, but hold the result lightly: plan with the quiet clause “if nothing prevents it”.',
      how: ['Write today’s main aim', 'Add “…if nothing gets in the way”', 'Give it full effort; if it’s blocked, you planned for that'],
      plan: 'Today’s aim, if nothing gets in the way: give it everything',
      source: 'Seneca, On Tranquillity of Mind' },
    { key: 'brother', name: 'Forgive: they don’t know better', when: 'day',
      what: 'When someone wrongs you, remember they think they’re right, and that they’re still your brother or sister.',
      how: ['Notice who has annoyed or hurt you', 'Remember they act from what they believe is good', 'Answer without anger, or let it pass'],
      plan: 'Forgive one person today, in my head at least',
      quote: 'I also understand the nature of the evil-doer, and know that he is my brother.', by: MA + ', Book II' },
    { key: 'kinship', name: 'Do one kindness for someone', when: 'day',
      what: 'We’re made to help each other. Do one small good thing for someone, stranger or not, and expect nothing back.',
      how: ['Look for one chance today: a hand, a word, a favour', 'Do it quietly', 'Don’t mention it or keep score'],
      plan: 'One kindness today, expecting nothing back',
      quote: 'We are made by nature for mutual assistance, like the feet, the hands, the eyelids, the upper and lower rows of teeth.', by: MA + ', Book II' },

    { key: 'review', name: 'Review the day', when: 'evening',
      what: 'Before sleep, go back over the day: what you did well, where you slipped, what you’ll do better. Fairly, not harshly.',
      how: ['Go through the day from morning to now', 'What did I do well? Where did I slip?', 'What will I do differently tomorrow?', 'Forgive yourself, and sleep'],
      plan: 'Stoic evening: review the day', write: 'evening',
      quote: 'We should every night call ourselves to account, “What infirmity have I mastered to-day? what passion opposed? what temptation resisted? what virtue acquired?”', by: SE + ', Of a Happy Life' },
    { key: 'gratitude', name: 'Thank the people who made you', when: 'evening',
      what: 'Marcus opened his Meditations by listing what he learned from each person in his life. Write your own.',
      how: ['Name people who shaped you: family, teachers, friends, even difficult ones', 'For each, write one thing you learned from them', 'Tell one of them'],
      plan: 'Write what I learned from three people, and tell one of them',
      write: 'What I learned from…\n\nFrom my mother:\n\nFrom my father:\n\nFrom a teacher:\n\nFrom a friend:\n\nFrom someone difficult:\n',
      quote: 'I learned from my grandfather, Verus, to use good manners, and to put restraint on anger.', by: MA + ', Book I' },
    { key: 'amor', name: 'Want what happened', when: 'evening',
      what: 'Look at today’s disappointments and practise accepting, even welcoming, them as part of your life.',
      how: ['Write down what didn’t go your way today', 'For each, ask what it makes possible or teaches', 'Say: this too is mine'],
      plan: 'Accept one thing that went wrong today',
      write: 'What didn’t go my way today:\n\n\nWhat it teaches me or makes possible:\n\n\nI accept it because:\n',
      quote: 'Demand not that events should happen as you wish; but wish them to happen as they do happen, and you will go on well.', by: EN + ' VIII' },

    { key: 'premeditatio', name: 'Rehearse the worst', when: 'sometimes',
      what: 'Picture losing what you value, calmly, so loss can’t ambush you and you value it more today.',
      how: ['Sit quietly for five minutes', 'Picture losing something: your job, your health, someone you love', 'Notice you could bear it, and how you would act', 'Open your eyes and appreciate what you have now'],
      plan: 'Five minutes: rehearse a loss, then appreciate what I have',
      write: 'What I pictured losing:\n\n\nHow I would bear it and what I would do:\n\n\nWhat I appreciate more now:\n',
      quote: 'In a state of security, a man may thus prepare himself against hazards, and in plenty fortify himself against want.', by: SE + ', Of a Happy Life' },
    { key: 'discomfort', name: 'Practise poverty', when: 'sometimes',
      what: 'Choose a little hardship on purpose: plain food, a cold shower, the floor for a bed. Then ask if this is what you feared.',
      how: ['Pick one: a cold shower, a day of plain food or fasting, a walk in the cold, a night on the floor, a day without your phone', 'Do it without complaint', 'Ask: “Is this the thing I was afraid of?”'],
      plan: 'Voluntary discomfort: cold shower, plain food or a day without comforts',
      quote: 'Let him mortify himself with fasting, coarse clothes, and hard lodging; and then say to himself, “Is this the thing now that I was afraid of?”', by: SE + ', Of a Happy Life' },
    { key: 'borrowed', name: 'It’s on loan', when: 'sometimes',
      what: 'Nothing you have is yours for ever. Enjoy it fully as a loan, and you won’t be crushed when it’s taken back.',
      how: ['Choose something or someone you love', 'Remind yourself it’s on loan, not owned', 'Treat it with more care and enjoyment today'],
      plan: 'Treat one thing I love as on loan: enjoy it fully today',
      quote: 'Never say of anything, “I have lost it,” but, “I have restored it.”', by: EN + ' XI' },
    { key: 'above', name: 'The view from above', when: 'sometimes',
      what: 'Zoom out until your troubles look their true size: the city, the country, the planet, the centuries.',
      how: ['Close your eyes and see yourself where you are', 'Rise up: the building, the city, the country, the whole earth', 'See millions of lives going on at once, over thousands of years', 'Come back down and look at today’s problem again'],
      plan: 'Five minutes: the view from above',
      quote: 'Look down, as from some eminence, upon the innumerable herds, the countless solemn festivals, the voyaging of every sort, in tempests and in calms.', by: MA + ', Book IX' },
    { key: 'mortality', name: 'Remember you will die', when: 'sometimes',
      what: 'Not to be gloomy but to wake up: you don’t have for ever, so stop putting off what matters.',
      how: ['Remind yourself: this could be the last time', 'Ask what you’d stop doing, and what you’d start, if time were short', 'Do one of those today'],
      plan: 'Memento mori: do the thing I keep putting off',
      quote: 'Order not your life as though you had ten thousand years to live. Fate hangs over you. While you live, while yet you may, be good.', by: MA + ', Book IV' },
    { key: 'retreat', name: 'Retreat into yourself', when: 'sometimes',
      what: 'You don’t need a holiday to rest: a few quiet minutes inside your own mind will do. Breathe and come back.',
      how: ['Find a few minutes and a quiet spot, even a bathroom', 'Breathe slowly; let thoughts pass', 'Remind yourself of one principle you live by', 'Go back to the day'],
      plan: 'A few minutes of inner retreat', go: 'breathe',
      quote: 'Nowhere can a man find any retreat more quiet and more full of leisure than in his own soul.', by: MA + ', Book IV' },
    { key: 'practise', name: 'Show it, don’t preach it', when: 'sometimes',
      what: 'Don’t lecture anyone about Stoicism today. Just live one principle so well that it shows.',
      how: ['Pick one principle (patience, honesty, moderation)', 'Live it in front of others without naming it', 'Notice the urge to explain, and skip it'],
      plan: 'Live one principle today without talking about it',
      quote: 'Never proclaim yourself a philosopher, nor make much talk among the ignorant about your principles, but show them by actions.', by: EN + ' XLVI' }
  ];

  // The exercise for a date: round the ones that suit any day.
  const DAILY = EXERCISES.filter(x => x.when === 'day' || x.when === 'sometimes');
  function ofTheDay(iso){
    const n = Math.floor(WK.parseDate(iso || WK.isoDate()).getTime() / 86400000);
    return DAILY[((n % DAILY.length) + DAILY.length) % DAILY.length];
  }

  let filter = WK.store('wk_practice_when') || '';

  // For search (quick.js): the exercises, and opening one.
  WK.practiceList = () => EXERCISES;
  WK.openPractice = key => {
    filter = ''; WK.show('practice');
    const card = document.getElementById('ex-' + key);
    if (card){ card.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 1600); }
  };

  WK.section({ name: 'practice', label: 'Practice', icon: 'compass', render });

  // For Today.
  WK.practicePanel = () => {
    const x = ofTheDay();
    return `
      <section class="panel practice-panel">
        <h2>🏛️ Today’s exercise</h2>
        <p class="small"><b>${esc(x.name)}.</b> ${esc(x.what)}</p>
        ${buttons(x, true)}
      </section>`;
  };

  function planned(text){
    const plan = WK.planFor ? WK.planFor(WK.isoDate()) : null;
    return !!(plan && plan.items.some(i => i.text === text));
  }
  function buttons(x, small){
    const inToday = planned(x.plan);
    return `<div class="practice-actions">
      <button type="button" class="btn small${inToday ? '' : ' primary'}" data-pplan="${x.key}"${inToday ? ' disabled' : ''}>${inToday ? 'In today' : '+ Today'}</button>
      ${x.write === 'morning' ? `<button type="button" class="btn small" data-pwrite="${x.key}">Morning preparation</button>`
        : x.write === 'evening' ? `<button type="button" class="btn small" data-pwrite="${x.key}">Evening review</button>`
        : x.write ? `<button type="button" class="btn small" data-pwrite="${x.key}">Write it</button>` : ''}
      ${x.go ? `<button type="button" class="btn small" data-pgo="${x.go}">Open ${x.go === 'breathe' ? 'Breathe' : x.go} →</button>` : ''}
      ${small ? `<button type="button" class="btn ghost small" data-go="practice">All exercises</button>` : ''}
    </div>`;
  }

  // Shared by this page and Today's panel.
  WK.bindPractice = el => {
    el.querySelectorAll('[data-pplan]').forEach(b => b.onclick = async () => {
      const x = EXERCISES.find(e => e.key === b.dataset.pplan);
      b.disabled = true;
      try { await WK.addToPlan(x.plan); b.textContent = 'In today'; b.classList.remove('primary'); WK.toast('Added to today’s plan.'); }
      catch (err){ b.disabled = false; WK.toast('Not added: ' + err.message); }
    });
    el.querySelectorAll('[data-pwrite]').forEach(b => b.onclick = () => {
      const x = EXERCISES.find(e => e.key === b.dataset.pwrite);
      if (x.write === 'morning' || x.write === 'evening'){ if (WK.startStoic) WK.startStoic(x.write); return; }
      if (WK.openNewEntry) WK.openNewEntry({ title: x.name, body: x.write, areas: ['Personal Development'] });
    });
    el.querySelectorAll('[data-pgo]').forEach(b => b.onclick = () => WK.show(b.dataset.pgo));
  };

  function card(x, featured){
    return `
      <article class="panel practice-card${featured ? ' featured' : ''}" id="ex-${x.key}">
        ${featured ? '<p class="practice-eyebrow">Today’s exercise</p>' : ''}
        <h2>${esc(x.name)} <span class="chip">${esc(WHEN[x.when])}</span></h2>
        <p>${esc(x.what)}</p>
        <ol class="practice-how">${x.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>
        ${x.quote ? `<blockquote class="practice-quote">${esc(x.quote)}<cite>${esc(x.by)}</cite></blockquote>` : `<p class="muted small">From ${esc(x.source)}.</p>`}
        ${buttons(x)}
      </article>`;
  }

  function render(){
    const el = $('section-practice');
    const today = ofTheDay();
    const list = EXERCISES.filter(x => !filter || x.when === filter);
    el.innerHTML = `
      <div class="section-head">
        <h1>Practice</h1>
        <div class="toolbar">
          <nav class="subtabs">
            <button type="button" data-when="" aria-current="${!filter}">All</button>
            ${Object.keys(WHEN).map(k => `<button type="button" data-when="${k}" aria-current="${filter === k}" title="${esc(WHEN[k])}">${esc(SHORT[k])}</button>`).join('')}
          </nav>
        </div>
      </div>
      <p class="muted practice-intro">Stoicism is something you do. Pick an exercise, put it in today’s plan, and tick it there when it’s done. Today’s is chosen for you; the rest are here whenever you want them.</p>
      ${filter ? '' : card(today, true)}
      <div class="practice-grid">${list.filter(x => filter || x !== today).map(x => card(x)).join('')}</div>
      <p class="muted small practice-credit">The exercises are the Stoics’ own, as gathered in modern guides like the Daily Stoic’s; the quotations are from the Library (Higginson’s Enchiridion, Chrystal’s Meditations, L’Estrange’s Seneca).</p>`;
    el.querySelectorAll('[data-when]').forEach(b => b.onclick = () => { filter = b.dataset.when; WK.store('wk_practice_when', filter); render(); });
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => WK.show(b.dataset.go));
    WK.bindPractice(el);
  }
})();
