-- ============================================================
-- WANG' KALAM AGOK BUK — Systems (Atomic Habits)
-- Run after 05-timers.sql. Safe to re-run.
--
-- routine_ticks: one row per point of the Minimum Home Routine ticked
-- off in a period. period is 'day:2026-10-19', 'week:2026-10-19' (the
-- Monday) or 'month:2026-10', so each list starts fresh on its own
-- schedule and the old ticks stay as a record.
-- Private like the rest: every row belongs to the signed-in user.
--
-- Then the blog post "Systems, not motivation", published, for the
-- first account on this project (yours). Only added once.
-- ============================================================

create table if not exists public.routine_ticks (
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period     text not null,
  item       text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, period, item)
);

alter table public.routine_ticks enable row level security;
drop policy if exists "owner reads ticks" on public.routine_ticks;
create policy "owner reads ticks" on public.routine_ticks for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes ticks" on public.routine_ticks;
create policy "owner writes ticks" on public.routine_ticks for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.routine_ticks from anon;
grant select, insert, update, delete on public.routine_ticks to authenticated;

insert into public.blog_posts (owner_id, title, category, status, published_on, body)
select u.id, 'Systems, not motivation: six cheat sheets through Atomic Habits', 'Personal Development', 'published', date '2026-10-19',
$post$
Six small cards came across my feed this week: how to avoid burnout, how to stop forgetting everything, the systems that keep a home organised, a minimum home routine, how to grocery shop without spending a fortune, and how to cook five basic meals. None of them is deep. All of them say the same thing James Clear says in **Atomic Habits**:

**"You do not rise to the level of your goals. You fall to the level of your systems."**

One of the cards puts it in five words: *systems work better than motivation.* So instead of saving the pictures and forgetting them, I read each one through Clear's Four Laws of Behaviour Change and turned it into something I can do.

**The Four Laws, in one breath**

- **Make it obvious** — the cue. Put the good habit where you can't miss it.
- **Make it attractive** — the craving. Pair it with something you want.
- **Make it easy** — the response. Cut the friction until starting takes two minutes.
- **Make it satisfying** — the reward. Tick it off, see the streak, feel the win.

To break a bad habit, turn each law around: make it invisible, unattractive, difficult and unsatisfying.

**1. How to avoid burnout — Make it easy**

The burnout card is a list of friction cutters. The 2-minute rule (if it takes less than two minutes, do it now), the Pomodoro method (25 minutes of focus, 5 minutes of rest), the 5-second rule (count 5-4-3-2-1 and move), and breaking big tasks into small steps. Clear has his own two-minute rule: scale any new habit down until it takes two minutes to start. "Read thirty books" becomes "read one page".

The 1-3-5 rule (one big task, three medium, five small) and *eat the frog* (the hardest task first) protect the day from being overloaded. A *not-to-do* list is Clear's inversion: make the time-wasters invisible and difficult. Stop multitasking, because one thing at a time is the only way anything gets finished.

**2. How to stop forgetting everything — Make it obvious**

"Your brain wasn't designed to store everything." Write things down immediately. Put appointments in the calendar right away. Keep important information in one place: a documents folder, a permanent shopping list, a simple to-do list, a basic weekly routine. This is Clear's *environment design*: the cue should be in front of you, not in your head. What hurts memory (too much stimulation, poor sleep, multitasking, chronic stress) are the bad habits to make difficult.

And the last rule on the card is pure Clear: *the fewer decisions you make, the less mental fatigue you feel.*

**3. Systems that keep the home organised — Make it obvious and easy**

Restock essentials before they run out. Clean as you cook. Check the fridge before shopping. Wash clothes before they pile up. Keep cleaning supplies within reach. Clean small messes before they become big ones. Every point is a cue placed in the right spot, or friction taken out of the way. This is *habit stacking* too: "After I cook, I wipe the counter." "After I take off my clothes, they go in the hamper."

**4. Minimum home routine — Make it satisfying**

Daily: make the bed, open the windows, wash the dishes, wipe the counters and sinks, put things back, take out the trash, keep the kitchen tidy. Weekly: laundry, bed sheets, bathroom, floors, surfaces, fridge, expired food. Monthly: cabinets, drawers, oven and stove, trash bin, stored items, donate what you don't use.

The word that matters is *minimum*. It's the floor, not the ceiling. A checklist you tick is a habit tracker, and Clear's rule for a tracker is **never miss twice**. Miss one day and it's an accident. Miss two and it's the start of a new habit.

**5. Grocery shopping without spending a fortune — Make the bad habit difficult**

Before you go: check what you have, make a list and stick to it, set a spending limit, never shop hungry, plan meals rather than random purchases. At the store: essentials first, compare prices by weight, avoid the snack aisles when tired. The silent money drains are delivery, shopping without a list, wasted food and ingredients never used. Every point puts friction between you and the impulse buy. This is Wealth & Finance built from small votes.

**6. How to cook five basic meals — Make it easy**

Rice, eggs, beans, pasta, chicken. Cook more than you need, freeze portions, keep the seasoning simple, repeat meals without guilt. Frozen garlic and frozen vegetables are pure friction cutters, and an organised pantry is environment design. When energy is low, eggs are the two-minute version of dinner. Good food stops depending on willpower.

**Every action is a vote**

Clear says each habit is a vote for the person you want to become. Making the bed is a vote for "I am someone who keeps order." Cooking rice for three days is a vote for "I look after my body and my money." A frog eaten before ten is a vote for "I do the hard thing first." Getting 1% better every day is about 37 times better in a year. None of these cards will change a life in a day, but together they make a system, and the system does the work.

**Where they live in this app**

- **Systems** tab: all six cards as action steps, each linked to its law, with **+ Today** to put a step straight into today's plan.
- **Today**: the Minimum Home Routine (daily, weekly and monthly ticks that start fresh each period) and a Pomodoro focus timer.
- **Planner**: mark tasks 1, 3 or 5 for the 1-3-5 rule, and mark one 🐸 frog to eat first.
- **Vision**: the not-to-do list is the Deception and Waste quadrants.

*Cards by @Millionairecodess. Ideas from James Clear, Atomic Habits (2018).*
$post$
from (select id from auth.users order by created_at limit 1) u
where not exists (
  select 1 from public.blog_posts b
  where b.owner_id = u.id and b.title = 'Systems, not motivation: six cheat sheets through Atomic Habits'
);
