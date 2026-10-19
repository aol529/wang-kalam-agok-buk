/* Systems: the six cheat sheets (@Millionairecodess, 2026) read through
   James Clear's Atomic Habits. Plain data, no page code: the Systems tab
   (systems.js), the Minimum Home Routine on Today (routine.js) and the
   focus timer (focus.js) read it. A step's `go` names the part of the
   app that does it for you. */
window.WK = window.WK || {};
WK.SYS = (function(){
  const QUOTE = 'You do not rise to the level of your goals. You fall to the level of your systems.';

  // Clear's Four Laws of Behaviour Change, and their inversions for
  // breaking a bad habit.
  const LAWS = [
    { key: 'obvious',    name: 'Make it obvious',    stage: 'Cue',      invert: 'Make it invisible',
      how: 'Put the cue where you can’t miss it. Write it down, lay it out, schedule it: “I will [habit] at [time] in [place].”' },
    { key: 'attractive', name: 'Make it attractive', stage: 'Craving',  invert: 'Make it unattractive',
      how: 'Pair what you need to do with something you want to do, and keep company with people for whom the habit is normal.' },
    { key: 'easy',       name: 'Make it easy',       stage: 'Response', invert: 'Make it difficult',
      how: 'Cut the friction. Scale it down until starting takes two minutes. Prepare the space before you need it.' },
    { key: 'satisfying', name: 'Make it satisfying', stage: 'Reward',   invert: 'Make it unsatisfying',
      how: 'Tick it off and watch the streak grow. Never miss twice: one miss is an accident, two is the start of a new habit.' }
  ];

  // The Minimum Home Routine card. Each list starts fresh on its own
  // schedule (routine.js).
  const HOME = [
    { key: 'day',   name: 'Daily',   items: ['Make your bed', 'Open the windows', 'Wash the dishes', 'Wipe down counters and sinks', 'Put things back in their place', 'Take out the trash if full', 'Keep the kitchen tidy'] },
    { key: 'week',  name: 'Weekly',  items: ['Do the laundry', 'Change your bed sheets', 'Clean the bathroom', 'Mop or vacuum the floors', 'Organise surfaces', 'Clean the refrigerator', 'Check for expired food'] },
    { key: 'month', name: 'Monthly', items: ['Clean cabinets', 'Organise drawers', 'Deep clean the oven and stove', 'Wash the trash bin', 'Review stored items', 'Donate or discard unused things'] }
  ];

  // go: 'focus' (Today's focus timer), 'planner' (1-3-5 and the frog),
  // 'routine' (Today's home routine), 'nottodo' (Vision's Deception and
  // Waste quadrants).
  const CARDS = [
    { key: 'burnout', title: 'How to avoid burnout', icon: '⚡', area: 'Career', laws: ['easy', 'obvious'],
      atomic: 'A list of friction cutters. Clear’s own two-minute rule: scale a new habit down until it takes two minutes to start. The not-to-do list is his inversion: make the time-wasters invisible and difficult.',
      steps: [
        { text: 'The 2-minute rule: if it takes less than two minutes, do it now', law: 'easy' },
        { text: 'Pomodoro: 25 minutes of focus, 5 minutes of rest, a longer break after four', law: 'easy', go: 'focus' },
        { text: 'The 5-second rule: count 5-4-3-2-1 and move, don’t wait for motivation', law: 'easy' },
        { text: 'The 1-3-5 rule: 1 big task, 3 medium, 5 small', law: 'obvious', go: 'planner' },
        { text: 'Eat the frog: start with the hardest task', law: 'obvious', go: 'planner' },
        { text: 'Keep a not-to-do list: drop, delegate, protect your mental energy', law: 'obvious', go: 'nottodo' },
        { text: 'Stop multitasking: one thing at a time', law: 'easy' },
        { text: 'Break the big task into small steps and write down the first one', law: 'easy' }
      ] },
    { key: 'memory', title: 'How to stop forgetting everything', icon: '🧠', area: 'Personal Development', laws: ['obvious'],
      atomic: 'Environment design: the cue belongs in front of you, not in your head. “The fewer decisions you make, the less mental fatigue you feel.”',
      steps: [
        { text: 'Write things down the moment you think of them', law: 'obvious' },
        { text: 'Put appointments in the calendar right away', law: 'obvious' },
        { text: 'Keep important information in one place: a documents folder', law: 'obvious' },
        { text: 'Keep a permanent shopping list', law: 'obvious' },
        { text: 'Keep a simple to-do list and a basic weekly routine', law: 'obvious', go: 'planner' },
        { text: 'Keep important items in the same place every time', law: 'easy' },
        { text: 'Protect sleep and cut the overstimulation that hurts memory', law: 'easy' }
      ],
      easier: ['Checklists', 'Planners', 'Alarms', 'A consistent routine', 'Getting tasks out of your head and onto paper'] },
    { key: 'home', title: 'Systems that keep your home organised', icon: '🏠', area: 'Health & Appearance', laws: ['obvious', 'easy'],
      atomic: 'Cues placed in the right spot and friction taken away. Habit stacking: “After I cook, I wipe the counter.” “After I undress, the clothes go in the hamper.”',
      steps: [
        { text: 'Restock essential items before they run out', law: 'obvious' },
        { text: 'Clean as you cook', law: 'easy' },
        { text: 'Keep ready-to-eat meals in the freezer', law: 'easy' },
        { text: 'Check the fridge before grocery shopping', law: 'obvious' },
        { text: 'Wash clothes before they pile up; fold and put away the same day', law: 'easy' },
        { text: 'Keep a documents folder; organise bills, keep receipts, digitise what you need', law: 'obvious' },
        { text: 'Keep cleaning supplies within reach', law: 'easy' },
        { text: 'Clean small messes before they become big ones', law: 'easy' }
      ],
      easier: ['A laundry hamper', 'Basic cleaning supplies', 'Extra cleaning cloths', 'Spare trash bags', 'Storage bins', 'Food storage containers', 'Backup essential items', 'Frozen ready-to-eat meals', 'A running shopping list'] },
    { key: 'routine', title: 'Minimum home routine', icon: '🧹', area: 'Health & Appearance', laws: ['satisfying'],
      atomic: 'A checklist you tick is a habit tracker. Minimum means the floor, not the ceiling. Never miss twice.',
      steps: [
        { text: 'Tick the daily list on Today', law: 'satisfying', go: 'routine' },
        { text: 'Weekly: laundry, sheets, bathroom, floors, surfaces, fridge, expired food', law: 'satisfying', go: 'routine' },
        { text: 'Monthly: cabinets, drawers, oven, trash bin, stored items, donate the unused', law: 'satisfying', go: 'routine' }
      ] },
    { key: 'grocery', title: 'How to grocery shop without spending a fortune', icon: '🛒', area: 'Wealth & Finance', laws: ['obvious', 'easy'],
      atomic: 'Make the bad habit difficult: every point puts friction between you and the impulse buy. Wealth built from small votes.',
      steps: [
        { text: 'Check what you already have at home', law: 'obvious' },
        { text: 'Make a list and stick to it', law: 'obvious' },
        { text: 'Set a spending limit before you go', law: 'obvious' },
        { text: 'Never shop when hungry', law: 'easy' },
        { text: 'Plan meals, not random purchases; reuse ingredients across meals', law: 'easy' },
        { text: 'Start with essentials; compare prices by weight or size', law: 'obvious' },
        { text: 'Avoid the snack aisles when tired or stressed', law: 'easy' },
        { text: 'Don’t buy something just because it’s on sale', law: 'easy' }
      ],
      easier: ['Rice', 'Beans', 'Eggs', 'Pasta', 'Frozen vegetables', 'Easy-to-eat fruits', 'Whole grain bread', 'Frozen protein', 'Oatmeal', 'Yogurt', 'Tomato sauce', 'Basic seasonings'],
      drains: ['Ordering delivery too often', 'Shopping without a list', 'Wasting food', 'Expensive “health” foods you don’t need', 'Several store trips a week', 'Ingredients you never use'] },
    { key: 'cooking', title: 'How to cook five basic meals', icon: '🍳', area: 'Health & Appearance', laws: ['easy'],
      atomic: 'Prepare the space before you need it. When energy is low, eggs are the two-minute version of dinner. Repeating meals is fewer decisions.',
      steps: [
        { text: 'Rice: learn the water-to-rice ratio and cook enough for several meals', law: 'easy' },
        { text: 'Eggs: omelette, scrambled, boiled — the quick meal when energy is low', law: 'easy' },
        { text: 'Beans: cook a bigger batch and freeze single portions', law: 'easy' },
        { text: 'Pasta: one simple sauce, add vegetables or protein', law: 'easy' },
        { text: 'Chicken: learn one seasoning mix, prep or freeze it ahead', law: 'easy' },
        { text: 'Repeat meals without guilt', law: 'easy' }
      ],
      easier: ['Frozen garlic', 'Frozen vegetables', 'Simple seasonings', 'Freezer-friendly meals', 'An organised pantry'] }
  ];

  const lawOf = key => LAWS.find(l => l.key === key);
  return { QUOTE, LAWS, HOME, CARDS, lawOf };
})();
