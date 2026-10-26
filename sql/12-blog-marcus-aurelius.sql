-- ============================================================
-- WANG' KALAM AGOK BUK — Blog post: Marcus Aurelius
-- Run after 03-blog-gallery.sql. Safe to re-run (adds it once).
--
-- The background to the Meditations in the Library: his life, his reign,
-- how a private notebook survived, and what's useful. Goes to the first
-- account, published, in Personal Development, like the Seneca and
-- Epictetus posts (sql/10, sql/11). Quotations are from George Chrystal's
-- rendering (1902) in the Library, public domain. Facts checked against
-- the Stanford Encyclopedia of Philosophy and the standard account from
-- Cassius Dio and the Historia Augusta; doubtful details are hedged.
-- ============================================================

insert into public.blog_posts (owner_id, title, category, status, published_on, body)
select u.id, 'Marcus Aurelius: the emperor who wrote to himself', 'Personal Development', 'published', date '2026-10-26',
$post$
Seneca was the adviser to an emperor. Epictetus was a slave who became a teacher. Marcus Aurelius was the emperor himself, the most powerful man in the world, and every night, in a tent on the Danube frontier, he wrote notes to himself on how to be a better man. Those notes are the *Meditations*, now in the Library. This is the man who wrote them.

**A boy the emperor noticed**

Marcus was born in Rome on 26 April AD 121 into a rich and well-connected family with roots in Spain. His father died when he was about three, and he was brought up by his mother, Domitia Lucilla, and his grandfather Verus. The first lines of the *Meditations* are about them: "I learned from my grandfather, Verus, to use good manners, and to put restraint on anger."

He was a serious child. The emperor Hadrian, a family friend, noticed him and played on his family name, Verus, "true", by calling him *Verissimus*, "truest of all". When Hadrian chose his successor in 138, he made it a condition: the new heir, Antoninus Pius, had to adopt the sixteen-year-old Marcus (and another boy, Lucius Verus), so that Marcus would rule one day. It was a life he hadn't asked for.

**Teachers, and the book that changed him**

Marcus had the best teachers in the empire. Fronto taught him rhetoric, and their affectionate letters still survive. But the young man drifted from speech-making towards philosophy. "To Rusticus I owe my first apprehensions that my nature needed reform and cure," he wrote. Junius Rusticus, a Stoic, also lent him his own copy of the notes of Epictetus's lectures, and Marcus never got over them. Other Stoic teachers, Apollonius, Sextus and Claudius Maximus, get their own thanks in Book I.

In 145 he married Antoninus's daughter Faustina. They had at least thirteen children, and many of them died young; of the sons, only Commodus outlived his father. The grief runs quietly through the *Meditations*.

**Emperor, in the worst of times**

Antoninus died in 161 and Marcus became emperor at thirty-nine, insisting on sharing power with Lucius Verus. What followed was almost twenty years of crisis:

- **War in the east** against Parthia (161–166).
- **The Antonine Plague**, brought back by the returning army around 165, probably smallpox. It killed millions across the empire, year after year.
- **War on the Danube** against the Marcomanni, the Quadi and other tribes, almost without a break from the late 160s until his death. Marcus, never a soldier and often unwell, spent most of the 170s with the army in the camps along the river.
- **Lucius Verus died** in 169, leaving him to rule alone.
- **A revolt** in 175: his best general in the east, Avidius Cassius, declared himself emperor on a false rumour that Marcus was dead. Cassius was killed by his own officers before it came to war. According to Cassius Dio, Marcus had the rebels' letters burned, so that he would never know which of his friends had been in on it.
- **Faustina died** that same year, while travelling with him in the east.

To pay for the war without raising taxes, the *Historia Augusta* says, he auctioned off treasures from the palace: gold cups, jewels, his wife's silk robes. Whether or not the detail is exact, it fits the man in the *Meditations*.

He died on campaign on 17 March 180, probably at Vindobona (Vienna) or Sirmium, aged fifty-eight. His son Commodus, who succeeded him, was everything his father wasn't. The historian Cassius Dio wrote that with Marcus's death the story of Rome "descends from a kingdom of gold to one of iron and rust".

He wasn't perfect, and the record shouldn't pretend he was. Christians were persecuted in parts of the empire during his reign, most famously at Lyon in 177, though how much he had to do with it is debated. And he left the empire to a son unfit to rule it. But later ages remembered him as the last of the "Five Good Emperors", and his bronze statue on horseback is the only one of its kind to survive from ancient Rome, probably because people in the Middle Ages took it for the Christian emperor Constantine.

**A notebook never meant for us**

The *Meditations* were written in Greek, the language of philosophy, mostly in the last ten years of his life, on campaign. The manuscripts keep two little notes of place: "among the Quadi, on the Granua" and "at Carnuntum", army camps on the Danube. He never gave the work a title; the Greek manuscripts call it simply *To Himself*. It isn't a book of advice for others. It's a man reminding himself, over and over, of what he already believed, because the day kept making him forget.

That it survived at all is a near-miracle. Almost nobody mentions it for eight hundred years. It turns up in Byzantium in the 10th century, and the first printed edition came out in Zurich in the 1550s, from a manuscript that was lost soon afterwards.

**What he kept telling himself**

He wrote in short entries, twelve books of them, and the same few ideas come back again and again:

- **Expect difficult people, and stay kind.** "Say this to yourself in the morning: Today I shall have to do with meddlers, with the ungrateful, with the insolent, with the crafty, with the envious and the selfish." They act from ignorance of what's good, he goes on, and they are still his kin.
- **Don't waste the time you have.** "Order not your life as though you had ten thousand years to live. Fate hangs over you. While you live, while yet you may, be good."
- **You can rest anywhere.** "Nowhere can a man find any retreat more quiet and more full of leisure than in his own soul."
- **See it from above.** "Asia and Europe are mere corners of the Universe: the whole sea is but a drop, Athos a clod. All the present is but an instant in eternity."
- **Use the obstacle.** Nothing can stop you being just, self-controlled and wise. If a plan is blocked, "by yielding to this impediment, and by turning with calmness to that which is in your power, you may happen on another course of action".
- **Don't hit back.** "The best revenge is not to copy him that wronged you."
- **Keep it simple.** "The happiness of life lies in very few things." And: "If a thing be not becoming, do it not; if not true, say it not."
- **Look inward.** "Within is the fountain of Good. Dig constantly and it will ever well forth."

**Why he matters here**

The Journal's evening review and morning preparation are Marcus's habit: a few honest lines to yourself at the start and end of the day. He shows it works even under the heaviest load a person can carry: war, plague, betrayal, grief, and a whole empire on his shoulders. If he could find time to write a few lines to himself in a tent on the Danube, the rest of us can manage it at the kitchen table.

He also shows that philosophy isn't about being finished. Two thousand years later we're reading his reminders to himself, written because he kept falling short of them.

*The Meditations are in the Library, twelve books of short entries. Open them anywhere.*
$post$
from (select id from auth.users order by created_at limit 1) u
where not exists (
  select 1 from public.blog_posts b
  where b.owner_id = u.id and b.title = 'Marcus Aurelius: the emperor who wrote to himself'
);
