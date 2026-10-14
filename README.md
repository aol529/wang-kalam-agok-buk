# Wang' Kalam Agok Buk

A private personal site: journal, vision board, planner and, in time, an
inheritance of advice for my children. Static HTML/CSS/JS backed by Supabase.

- **Today**: the day's plan, Necessity, next steps, the journal prompt, on this day, balance across the seven life areas.
- **Vision**: goals as picture cards by life area, the hierarchy of needs, and the urgent/important quadrants.
- **Planner**: each day in the time blocks of the working routine, with an evening review and the training mega-cycle.
- **Journal**: dated entries with mood, gratitude and life areas; any entry can be kept "for my children".
- **Legacy**: The Way (the life path explained), letters to open later, and the journal entries kept for the children. Prints as a book.

The life path itself (areas, levels, virtues, quadrants, routine, prompts) lives in `js/framework.js`.

## Setup

1. Create a Supabase project.
2. In its SQL editor, run `sql/01-goals.sql`, then `sql/02-journal-planner.sql`.
3. Authentication → Users → **Add user** (your own login), then turn off **Allow new users to sign up**.
4. Put the project URL and anon key in `js/config.js` (Project Settings → API).
5. `npm start`, then open http://localhost:3001.
