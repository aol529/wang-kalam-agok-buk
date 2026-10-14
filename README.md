# Wang' Kalam Agok Buk

A private personal site: journal, vision board, planner and, in time, an
inheritance of advice for my children. Static HTML/CSS/JS backed by Supabase.

- **Today**: the day's plan, Necessity, next steps, the journal prompt, on this day, the "Have a clear conscience" checklist, balance across the seven life areas.
- **Vision**: goals as picture cards by life area, the hierarchy of needs, and the urgent/important quadrants.
- **Planner**: each day in the time blocks of the working routine, with an evening review and the training mega-cycle.
- **Journal**: dated entries with mood, gratitude and life areas; any entry can be kept "for my children". The Stoic review starts a morning or evening entry from its questions, and "Blog it" turns an entry into a blog post.
- **Bible**: prayers and affirmations from "All I Want" (2014), then the Daily Bible Reading Plan (github.com/aol529/bible-reading-plan) in a frame.
- **Blog**: posts in the seven life areas (or any category you add), draft or published. View reads them like a blog; Edit writes and manages them.
- **Gallery**: pictures with captions, categories and dates. View shows them as a wall; Edit adds, changes and deletes them. Blog covers come from here.
- **Legacy**: The Way (the life path explained), letters to open later, and the journal entries kept for the children. Prints as a book.

The life path itself (areas, levels, virtues, quadrants, routine, prompts) lives in `js/framework.js`.

## Setup

1. Create a Supabase project.
2. In its SQL editor, run `sql/01-goals.sql`, then `sql/02-journal-planner.sql`, then `sql/03-blog-gallery.sql`, then `sql/04-clear-conscience.sql`.
3. Authentication → Users → **Add user** (your own login), then turn off **Allow new users to sign up**.
4. Put the project URL and anon key in `js/config.js` (Project Settings → API).
5. `npm start`, then open http://localhost:3001.

Pushing to `main` publishes the site to https://aol529.github.io/wang-kalam-agok-buk/ (`.github/workflows/pages.yml`).
