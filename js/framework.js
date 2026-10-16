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
      'Read or finish at least a chapter of a book (15–30 min)',
      'Check email and social media (15 min max)',
      'Revise notes (15–30 min)' ] },
    { block: 'Planning & Research', time: '2 hrs', items: [
      'Product research & development; update Facebook, Instagram, LinkedIn and Twitter (30–45 min)',
      'Sales & marketing campaign: desktop publish the catalogue and PowerPoint presentation (15–30 min)',
      'Follow-up emails (15–30 min)' ] },
    { block: 'Communication & Networking', time: '2 hrs', items: [
      'Customer research: update the prospect list, check their Facebook, Instagram and LinkedIn profiles for rapport (45–90 min)',
      'Contact prospects: cold emails & calls (45–60 min)' ] },
    { block: 'Interpersonal & Teamwork', time: '2 hrs', items: [
      'Set and go for appointments (45–60 min)' ] },
    { block: 'Leadership & Management', time: 'Evening', items: [
      'Review the day',
      'Defragment, check disk and back up the hard drive',
      'Gym, run, swim, yoga or Pilates',
      'Journal or blog' ] }
  ];

  // The Career notes themselves (Career.pdf, 5 October 2018), word for word.
  const CAREER = {
    title: 'Career', date: '2018-10-05',
    blocks: [
      { block: 'Self-Management', time: '2hrs 30min', lines: [
        'Gym/run/swim (45- 90mins)',
        'Read/Finish at least a chapter /book (15-30 min)',
        'Check email, social media (15 min max)',
        'Revise notes (15-30min)' ] },
      { block: 'Planning and Research', time: '2hrs', lines: [
        'Product research and development (update social media (Facebook, Instagram, LinkedIn, Twitter) (30-45 min)',
        'Sales & Marketing campaign Desktop publish - catalogue, PowerPoint presentation (15-30 min)',
        'Follow up emails (15-30 min)' ] },
      { block: 'Communication and Networking', time: '2hrs', lines: [
        'Customer research (updating Prospect list, checking out Facebook, Instagram and LinkedIn profile for rapport) (45-90 min)',
        'Contact prospects - cold emails & calls (45-60 min)' ] },
      { block: 'Interpersonal and Teamwork', time: '2hrs', lines: [
        'Setting and going for appointments (45-60 min)' ] },
      { block: 'Leadership and Management', time: '', lines: [
        'Review the day Defragment & Check Disk Back up hard drive',
        'Gym&/ (run/swim/yoga/Pilates)',
        'Journal&/blog' ] }
    ]
  };
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

  // The Stoic daily review: Seneca and Epictetus in the evening, Marcus
  // Aurelius in the morning. Each template starts a journal entry with its
  // questions as headings; the title is how the Journal tells them apart.
  const STOIC = {
    evening: { key: 'evening', icon: '🌙', title: '🌙 Evening review', label: 'Evening review', headings: [
      'What bad habit have I cured today?',
      'What fault have I resisted?',
      'In what way am I better?',
      'Where did I go wrong?',
      'What did I do?',
      'What duty did I leave undone?',
      'In my control',
      'Not in my control',
      'Done well',
      'Fell short',
      'Tomorrow I will…' ] },
    morning: { key: 'morning', icon: '🌅', title: '🌅 Morning preparation', label: 'Morning preparation', headings: [
      'What will today likely bring?',
      'Who might I meet, and how will I respond?',
      'What is in my control today?',
      'My intention for today' ] },
    criteria: [
      'Review every action and word of the day honestly.',
      'Judge them against virtue (wisdom, justice, courage, self-control), not against outcomes or what others thought.',
      'Separate what was up to you from what wasn’t.',
      'Note what you did well and where you fell short.',
      'Correct yourself without cruelty, and set an intention for tomorrow.',
      'In the morning, prepare for what the day will likely bring.' ]
  };
  // A template's body: each heading, then room to write under it.
  STOIC.body = (t, lead) => (lead ? lead + '\n\n' : '') + t.headings.map(h => h + '\n\n').join('\n').trimEnd() + '\n';
  STOIC.of = e => [STOIC.evening, STOIC.morning].find(t => (e.title || '') === t.title) || null;

  // From "All I Want" (2014), word for word. Paragraphs are split at blank
  // lines; single line breaks are kept. `mine` marks Kevin's own words.
  const DEVOTIONS = [
    { key: 'lords', title: "The Lord's Prayer", by: 'Matthew 6:9–13', text:
`Our Father in heaven,
hallowed be your name,
your kingdom come, your will be done on earth as it is in heaven.
Give us today our daily bread.
Forgive us our debts, as we also have forgiven our debtors.
And lead us not into temptation, but deliver us from the evil one,
for yours is the kingdom and the power and the glory for ever.
Amen.` },
    { key: 'spirit', title: 'Prayer to the Holy Spirit', by: '', text:
`Come Holy Spirit; fill my heart with thy Holy Gifts.
Let my weakness be penetrated with thy strength this very day, that I may fulfill all the duties of my state conscientiously,
That I may do what is right and just.
Let my charity be such as to offend no one and no one's feelings
So generous as to pardon sincerely any wrong done to me.
Assist me O Holy Spirit in all the trials of life,
Enlighten me in my ignorance,
Advice me in my doubts,
Strengthen me in my weakness,
Help me in all need and embarrassment,
Protect me in all temptations and
Console me in all afflictions.
Graciously hear me, O Holy Spirit and pour thy light into my heart, my soul and my mind.
Assist me to live a Holy Life and grow in godness and grace. Amen` },
    { key: 'serenity', title: 'The Serenity Prayer', by: 'Reinhold Niebuhr', text:
`God grant me the serenity
to accept the things I cannot change;
courage to change the things I can;
and wisdom to know the difference.

Living one day at a time;
enjoying one moment at a time;
accepting hardships as the pathway to peace;
taking, as He did, this sinful world
as it is, not as I would have it;
trusting that He will make all things right
if I surrender to His Will;
that I may be reasonably happy in this life
and supremely happy with Him
forever in the next.
Amen.` },
    { key: 'dearlord', title: 'Dear Lord', by: 'My prayer, 2014', mine: true, text:
`Dear Lord.

Praise be to YOU, please have mercy in me a sinner.

Thank you for all the blessings u have, do and will shower upon me especially your Love, Wisdom, Grace, My neighbors, patience, peace, joy and The Gift of Eternity.

Fill ME with your Love, patience, Grace, peace and joy that I may express it to my neighbor and environment as I do myself.

Your Wisdom to remember my lessons in life and exercise them as long as I exist, Understanding that I may be able to learn what I haven't and to remember the fear of the Lord is the beginning of wisdom.

Teach me your kind of industry to achieve goals in accordance to your will, charity to make others recognize your presence and love. Service for abundance in HEALTH AND WEALTH for all.

Please grant me the the courage to change the things I can, the serenity to accept the things I cannot change, and the wisdom and understanding to know the difference.

Teach me how to best exercise my love for you, my self, my neighbor, and my Environment.

Please give me the skill to always perform 101% and opportunity to use my skill.

I want to acquire the skills to code exceptionally in php, Java, c#.

I want to have an income of 1000$ per month, in the next two months

I believe that I receive through Jesus Christ your Son.

Amen` },
    { key: 'creed', title: 'The Optimist Creed', by: 'Christian D. Larson, 1912', text:
`I PROMISE MYSELF
To be so strong that nothing can disturb my peace of mind.
To talk health, happiness and prosperity to every person I meet.
To make all my friends feel that there is something in them.
To look at the sunny side of everything and make my optimism come true.
To think only of the best, to work only for the best, and to expect only the best.
To be just as enthusiastic about the success of others as I am about my own.
To forget the mistakes of the past and press on to the greater achievements of the future.
To wear a cheerful countenance at all times and give every living creature I meet a smile.
To give so much time to the improvement of myself that I have no time to criticize others.
To be too large for worry, too noble for anger, too strong for fear;
And too happy to permit the presence of trouble.
To think well of myself and to proclaim this fact to the world, not in loud words but in great deeds.
To live in the faith that the whole world is on my side so long as I am true to the best that is in me.` },
    { key: 'affirmation', title: 'Affirmation', by: 'My definite chief aim, 2014', mine: true, text:
`I know through the principle of auto-suggestions that any desire persistently held in mind nourished with Love, Joy, Persistence, Faith, courage, patience, cooperation and research will eventually seek expression through some practical means of attaining the object back of it.

I know that I have the ability to achieve the object of my definite chief aim (goal) that is to be SELF RELIANT, FINANCIALLY INDEPENDENT. Therefore I will devote twenty Seven minutes every day in silence that I consider communion with God (Prayer) expecting wisdom to build my SELF and my life for the greater good of all my neighbors and the environment.

In return for the achievement of my goals (Dreams with a date), I promise to express Love to my neighbors and the environment by being patient, training my thoughts, leashing my tongue, forgiving always the trespasses against me.
To love God with all my heart, mind, soul and strength.
To love my neighbor as myself.
To be aware of my thoughts, words, actions and emotions always.
To fill my position in all situations

Amen` }
  ];

  // "Have a clear conscience": a daily checklist on Today.
  const CONSCIENCE = [
    'Read the bible',
    'Pray positive self talk, be grateful always, and be sorry.',
    'Meditate',
    'Love your neighbor as God does.',
    'Trust and obey in God and His promises and decrees.',
    'Train your thoughts to have an ATTITUDE OF GRATITUDE if not LOVING',
    'Limit your speech to ABUNDANCE.',
    'Train your emotions to stay POSITIVE and HAPPY.',
    'Fill your position in all situations.',
    'Be THRIFTY – save when I can spend when I must and invest always in PEOPLE, TIME THEN MONEY',
    'Go to church and give tithe',
    'Get a helper',
    'Pick your poison',
    'Maintain your health (supplements), fitness and strength (gym, swim, and jog).',
    'Read positive self empowerment books',
    'Remember to breath 10 deep conscious breaths anytime I remember this page and always'
  ];

  // Napoleon Hill's "Desire to Riches" program, as on the 2014 page. The
  // Vision board turns the filled-in form into a Wealth & Finance goal.
  const RICHES = {
    title: 'My Desire to Riches Program',
    note: '(Affirmations) Say them aloud twice a day.',
    quote: '“All achievements, all earned riches, have their beginning in an idea.”',
    quoteBy: 'Napoleon Hill',
    // The five affirmations, filled in.
    lines: v => [
      `1. The exact amount of money I desire is ${v.amount || '____'} dollars per ${v.per || '____'}.`,
      `2. In return I will give/do ${v.give || '____'}.`,
      `3. I will receive this money on this date: ${v.date || '__/__/____'}`,
      `4. The plan I will implement immediately to achieve this is: ${v.plan || ''}`,
      '5. I see and feel myself receiving this money (achieving my Goals).' ]
  };

  const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

  const catOf = name => CATEGORIES.find(c => c.name === name) || CATEGORIES[0];
  const quadOf = g => QUADRANTS.find(q => q.urgent === !!g.urgent && q.important === !!g.important);

  return { AFFIRMATION, CATEGORIES, LEVELS, REALMS, REALM_ORDER, QUADRANTS, ROUTINE, CAREER, OTHER_BLOCK, TRAINING,
           STARTERS, JOURNAL_PROMPTS, LETTER_PROMPTS, STOIC, DEVOTIONS, CONSCIENCE, RICHES, MOODS, catOf, quadOf };
})();
