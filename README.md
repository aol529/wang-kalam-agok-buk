# Wang' Kalam Agok Buk

A private personal site: journal, vision board, planner and, in time, an
inheritance of advice for my children. Static HTML/CSS/JS backed by Supabase.

- **Today**: the day's plan, Necessity, next steps, the journal prompt, on this day, the "Have a clear conscience" checklist, balance across the seven life areas, Days without: live timers for what you are giving up, with "I slipped" keeping the past streaks and the best one, a Pomodoro focus timer, and the Minimum Home Routine (daily, weekly and monthly ticks).
- **Vision**: goals as picture cards by life area, the hierarchy of needs, and the urgent/important quadrants. Career shows the 2018 Career notes (the working day); Wealth & Finance has the Desire to Riches form.
- **Planner**: each day in the time blocks of the working routine, with an evening review and the training mega-cycle. Tasks can be sized for the 1-3-5 rule, and one marked 🐸 as the frog to eat first.
- **Review**: the week, Monday to Sunday, from what the other tabs recorded: tasks and frogs per day, the clear conscience and home routine with "never miss twice" flagged, the life areas the week touched, journal moods and gratitude, Days without slips and the month's budget. "Write the weekly review" starts a journal entry with the numbers and five questions; next week's big rock goes on Monday as the frog. Today nudges to it on Sundays. No new SQL.
- **Budget**: the notebook page as four boxes: urgent + necessary, urgent − necessary, −urgent + necessary, −urgent − necessary (Covey's Necessity, Deception, Personal Leadership, Waste). Amounts in KES, monthly items ticked off month by month, one-offs once, with totals of what is paid and still to pay.
- **Journal**: dated entries with mood, gratitude and life areas; any entry can be kept "for my children". The Stoic review starts a morning or evening entry from its questions, and "Blog it" turns an entry into a blog post.
- **Bible**: prayers and affirmations from "All I Want" (2014), then the Daily Bible Reading Plan (from github.com/aol529/bible-reading-plan) built into the tab: five plans, verse search, ticks and read-aloud.
- **Systems**: six cheat sheets (burnout, memory, home, home routine, groceries, cooking) as action lists you tick off (ticks stay, so each card fills up as the system is set up), each read through the Four Laws of *Atomic Habits*; "+ Today" puts a step in today's plan, and "Things that make it easier" tick as you get them. The not-to-do list is Vision's Deception and Waste quadrants.
- **Blog**: posts in the seven life areas (or any category you add), draft or published. View reads them like a blog; Edit writes and manages them.
- **Gallery**: pictures with captions, categories and dates. View shows them as a wall; Edit adds, changes and deletes them. Blog covers come from here.
- **Legacy**: The Way (the life path explained), letters to open later, and the journal entries kept for the children. Prints as a book.

The life path itself (areas, levels, virtues, quadrants, routine, prompts) lives in `js/framework.js`.

## Setup

1. Create a Supabase project.
2. In its SQL editor, run `sql/01-goals.sql`, then `sql/02-journal-planner.sql`, then `sql/03-blog-gallery.sql`, then `sql/04-clear-conscience.sql`, then `sql/05-timers.sql`, then `sql/06-systems.sql` (it also adds the blog post "Systems, not motivation"), then `sql/07-budget.sql`.
3. Authentication → Sign In / Providers: leave **Allow new users to sign up** on so people can create accounts on the site (each account sees only its own data); turn it off to keep the site to existing accounts. Authentication → URL Configuration: set **Site URL** to the live site and add `http://localhost:3001/` to **Redirect URLs**, so confirm-email and reset-password links come back here.
4. Put the project URL and anon key in `js/config.js` (Project Settings → API).
5. `npm start`, then open http://localhost:3001.

Pushing to `main` publishes the site to https://aol529.github.io/wang-kalam-agok-buk/ (`.github/workflows/pages.yml`).
