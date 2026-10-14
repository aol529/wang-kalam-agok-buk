/* The life path: everything from the original sketch (life path table,
   Canfield notes, Eisenhower matrix, career day, training cycle) that the
   rest of the site is built on. Plain data, no page code. */
window.WK = window.WK || {};
WK.F = (function(){
  const AFFIRMATION = 'I am Whole, Perfect, Strong, Powerful, Harmonious, Happy, Loving';

  // The seven life areas, in the order of the life path table, top to
  // bottom: each one's place on the hierarchy of needs and its archetype.
  const CATEGORIES = [
    { name: 'Personal Development', icon: '🌱', level: 5, archetype: 'King' },
    { name: 'Career',               icon: '💼', level: 5, archetype: 'Warrior' },
    { name: 'Community & Charity',  icon: '🤝', level: 4, archetype: 'Magician' },
    { name: 'Love & Relationships', icon: '❤️', level: 3, archetype: 'Lover' },
    { name: 'Wealth & Finance',     icon: '💰', level: 2, archetype: '' },
    { name: 'Health & Appearance',  icon: '💪', level: 2, archetype: '' },
    { name: 'Recreation',           icon: '🏕️', level: 1, archetype: '' }
  ];
  const LEVELS = {
    5: { name: 'Self-actualisation', hint: 'Fulfilment: philanthropy & altruism', realm: 'Spirit' },
    4: { name: 'Esteem',             hint: 'Leadership',                          realm: 'Mind' },
    3: { name: 'Love & Belonging',   hint: 'Friends, wife, children',             realm: 'Mind' },
    2: { name: 'Safety',             hint: 'Shelter, strength, education, money', realm: 'Body' },
    1: { name: 'Physiological',      hint: 'Food, water, air, warmth, free time', realm: 'Body' }
  };
  // Spirit, Mind and Body, with Buddhism · Daoism · Stoicism for each.
  const REALMS = {
    Spirit: { label: 'Self-fulfilment', buddhism: 'Dharma', daoism: 'Humility',   stoicism: 'Logos · Prudentia',
              summary: 'Dharma · Humility · Logos & Prudentia' },
    Mind:   { label: 'Psychological',   buddhism: 'Buddha', daoism: 'Compassion', stoicism: 'Ethos · Justice & Fortitude',
              summary: 'Buddha · Compassion · Ethos, Justice & Fortitude' },
    Body:   { label: 'Physiological',   buddhism: 'Sangha', daoism: 'Frugality',  stoicism: 'Pathos · Temperance',
              summary: 'Sangha · Frugality · Pathos & Temperance' }
  };
  const REALM_ORDER = ['Spirit', 'Mind', 'Body'];

  // Covey's names for the four boxes, with the examples from the sketch
  // and the 2018 site's quadrant table.
  const QUADRANTS = [
    { key: 'do',       name: 'Necessity',           action: 'Manage',            urgent: true,  important: true,
      hint: 'Urgent & important',
      examples: ['Crises', 'Medical emergencies', 'Deadlines', 'Pressing problems', 'Last-minute preparation'] },
    { key: 'schedule', name: 'Personal Leadership', action: 'Focus',             urgent: false, important: true,
      hint: 'Important, not urgent',
      examples: ['Preparation and planning', 'Prevention', 'Values clarification', 'Exercise and training', 'Relationship building', 'True recreation and relaxation'] },
    { key: 'delegate', name: 'Deception',           action: 'Avoid or delegate', urgent: true,  important: false,
      hint: 'Urgent, not important',
      examples: ['Interruptions', 'Some mail and reports', 'Some meetings', 'Popular activities', 'Social media and internet surfing', 'Phone texts and emails', 'Indoor and outdoor games'] },
    { key: 'drop',     name: 'Waste',               action: 'Delete',            urgent: false, important: false,
      hint: 'Not urgent, not important',
      examples: ['Trivia and busy work', 'Junk mail', 'Escape activities', 'Time wasters and mindless TV', '"Pressing matters"'] }
  ];

  // The working day from the Career notes: blocks of time, each with its
  // usual tasks. A new day in the Planner can start from this.
  const ROUTINE = [
    { block: 'Self-Management', time: '2½ hrs', items: [
      'Gym, run or swim (45–90 min)',
      'Read at least a chapter (15–30 min)',
      'Email and social media (15 min max)',
      'Revise notes (15–30 min)' ] },
    { block: 'Planning & Research', time: '2 hrs', items: [
      'Product research & development; update social media (30–45 min)',
      'Sales & marketing material: catalogue, presentation (15–30 min)',
      'Follow-up emails (15–30 min)' ] },
    { block: 'Communication & Networking', time: '2 hrs', items: [
      'Customer research: update prospect list, check profiles for rapport (45–90 min)',
      'Contact prospects: cold emails & calls (45–60 min)' ] },
    { block: 'Interpersonal & Teamwork', time: '2 hrs', items: [
      'Set and go for appointments (45–60 min)' ] },
    { block: 'Leadership & Management', time: 'Evening', items: [
      'Review the day',
      'Back up files and drives',
      'Gym, run, swim, yoga or Pilates',
      'Journal or blog' ] }
  ];
  const OTHER_BLOCK = 'Other';

  // Training mega-cycle periodisation (6+1 = six weeks, then a deload week).
  const TRAINING = [
    { routine: 'Calisthenics', details: 'Squat, lunge, push, pull, twist, hinge, gait, carry', where: 'Home', per: 'Every other day', weeks: '6+1' },
    { routine: '5×5', details: 'Workout A: squat, bench press, barbell row. Workout B: squat, overhead press, deadlift', where: 'Gym', per: '3 days', weeks: '6+1' },
    { routine: '5/3/1', details: 'Squat, deadlift, bench press, overhead press', where: 'Gym', per: '4 days', weeks: '' },
    { routine: 'PHAT / Upper–Lower', details: 'Power, rest, hypertrophy', where: 'Gym', per: '5 days', weeks: '' },
    { routine: 'Powerlifting', details: 'Ed Coan / Doug Hepburn', where: 'Gym', per: 'Every other day', weeks: '' },
    { routine: 'Bodybuilding', details: 'Arnold Schwarzenegger', where: 'Gym', per: 'Double split, 6 days', weeks: '' }
  ];

  // From the Canfield notes: offered when the vision board is empty.
  const STARTERS = [
    ['Personal Development', 'Read 2 books a week', ''],
    ['Personal Development', 'Blog and journal', 'Read and write.'],
    ['Personal Development', 'Upgrade wardrobe and living situation with each salary', ''],
    ['Career', 'Daily work routine', 'Self-management 2½ hrs, planning & research 2 hrs, communication & networking 2 hrs, interpersonal & teamwork 2 hrs, then leadership & management: review the day. The Planner lays it out each day.'],
    ['Community & Charity', 'Join Lions, Rotary or a sports club', 'Mombasa / Nairobi Sports Club.'],
    ['Love & Relationships', 'Get 2 numbers, go on 2 dates', ''],
    ['Wealth & Finance', 'List debts and assets', ''],
    ['Wealth & Finance', 'Start investing', ''],
    ['Health & Appearance', 'Sharpen the look', 'Suits, nautical watch, paracord bracelet/watch, silver or copper ring and chain.'],
    ['Health & Appearance', 'Get a juicer and blender or food processor', ''],
    ['Recreation', 'Run 100 km a month', 'Walk to work. Bike later.'],
    ['Recreation', 'Swim 4 times a week', ''],
    ['Recreation', 'Learn a string, drum or wind instrument', '']
  ];

  // One a day in the Journal, in turn.
  const JOURNAL_PROMPTS = [
    'What did I do today for my body, my mind and my spirit?',
    'Review the day: what went well, and what would I do differently?',
    'Where did my time go: Necessity, Personal Leadership, Deception or Waste?',
    'Which words of my affirmation did I live today?',
    'Who did I show compassion to today?',
    'Where was I frugal today, and where was I wasteful?',
    'What did I read or learn this week that I want to keep?',
    'What about today would I want my children to know?',
    'Which did today need most: the King, the Warrior, the Magician or the Lover?',
    'What am I grateful for right now?',
    'What is the one thing that would make tomorrow a good day?',
    'Where did I lead today, and where did I follow?'
  ];

  // Ideas for letters to the children, by life area and by moment.
  const LETTER_PROMPTS = [
    ['Personal Development', 'The books that shaped me, and why'],
    ['Career', 'What work taught me about discipline and serving people'],
    ['Community & Charity', 'Why giving back matters, and how to start'],
    ['Love & Relationships', 'What I know about love, friendship and choosing a partner'],
    ['Wealth & Finance', 'Money: what I got right, and what I would do differently'],
    ['Health & Appearance', 'Looking after your body: training, food and rest'],
    ['Recreation', 'Play, rest and the things that made life fun'],
    ['', 'For the day you feel lost'],
    ['', 'On your 18th birthday'],
    ['', 'When you become a parent'],
    ['', 'Where you come from: our family and our name']
  ];

  const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

  const catOf = name => CATEGORIES.find(c => c.name === name) || CATEGORIES[0];
  const quadOf = g => QUADRANTS.find(q => q.urgent === !!g.urgent && q.important === !!g.important);

  return { AFFIRMATION, CATEGORIES, LEVELS, REALMS, REALM_ORDER, QUADRANTS, ROUTINE, OTHER_BLOCK, TRAINING,
           STARTERS, JOURNAL_PROMPTS, LETTER_PROMPTS, MOODS, catOf, quadOf };
})();
