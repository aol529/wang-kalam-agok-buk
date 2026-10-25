-- ============================================================
-- WANG' KALAM AGOK BUK — Blog post: Seneca
-- Run after 03-blog-gallery.sql. Safe to re-run (adds it once).
--
-- The background to Seneca's Morals in the Library: who he was, his life, his books,
-- and what's useful from him. Goes to the first account, published, in
-- Personal Development, like the Systems post in 06-systems.sql.
-- Quotations are from the L'Estrange translation in the Library (public
-- domain).
-- ============================================================

insert into public.blog_posts (owner_id, title, category, status, published_on, body)
select u.id, 'Seneca: the man behind the morals', 'Personal Development', 'published', date '2026-10-26',
$post$
I've put *Seneca's Morals* in the Library to read, so it's worth knowing who wrote them. Seneca is the most quoted of the Roman Stoics and the most contradicted by his own life: a philosopher of simplicity who was one of the richest men in Rome, a teacher of virtue who spent eight years at the elbow of Nero. Both halves are worth knowing. The second makes the first more useful, not less.

**Who he was**

Lucius Annaeus Seneca, "the Younger", was born around 4 BC in Corduba (Córdoba, in southern Spain), then part of the Roman province of Hispania. His father, Seneca the Elder, was a wealthy equestrian and a writer on rhetoric. Seneca was taken to Rome as a small child. He had two brothers: Novatus, later called Gallio, who is the governor of Achaea in the Book of Acts (18:12–17) who refused to hear the case against the apostle Paul; and Mela, whose son was the poet Lucan.

In Rome Seneca was trained in rhetoric and philosophy. His teachers included the Stoic Attalus, and followers of the Sextian school (Sotion and Papirius Fabianus), which taught the nightly self-examination he made famous. He was ill for much of his youth with what seems to have been asthma or a lung disease, badly enough that he says he thought about suicide and held back only for his father's sake. He spent years recovering in Egypt, where his aunt's husband was the prefect, and came back to Rome around AD 31 to start a career in law and politics.

**Exile, power and wealth**

He made his name as a speaker, maybe too well. The historian Cassius Dio says the emperor Caligula, jealous of him, wanted him killed and was talked out of it only because Seneca was so sickly he would surely die soon anyway.

In AD 41 the new emperor Claudius exiled him to Corsica, on a charge of adultery with Julia Livilla, Caligula's sister, a charge usually seen as political. He spent eight years there and wrote two of his *Consolations*: one to his mother Helvia, comforting her for his own exile, and a flattering one to Polybius, Claudius's freedman, which was plainly a plea to come home.

In AD 49 Agrippina, Claudius's new wife, had him recalled to tutor her son, the twelve-year-old Nero. When Nero became emperor in 54, Seneca and Burrus, the commander of the guard, were his chief advisers. The first years of the reign were remembered as good government, and Seneca wrote *On Clemency* (*De Clementia*) for the young emperor, a mirror for a prince on ruling by mercy.

It was also a time of compromise. Seneca grew enormously rich: an accuser in Tacitus puts his fortune at 300 million sesterces, much of it lent out at interest. When Nero had his mother Agrippina murdered in 59, it was Seneca, by most accounts, who drafted the letter to the Senate explaining it away. After Burrus died in 62, Seneca asked to retire and offered Nero his wealth. Nero refused the money but let him withdraw, and Seneca spent his last years writing.

**His death**

In AD 65 a plot to kill Nero (the Pisonian conspiracy) was found out. There's no clear evidence Seneca took part, but Nero ordered him to die. Tacitus tells the story (*Annals* 15.60–64), and this book's opening "Life and Death" retells it: Seneca told his weeping friends that he left them the one thing he still had, "the image of his life". His wife Paulina chose to die with him and both opened their veins. Nero ordered her saved, and she lived on for some years. Seneca, old and thin, bled slowly. He dictated to his secretaries, took poison that didn't work, and was finally carried into a steam bath, where he died.

**His books**

- **The dialogues**: short essays on single questions. *On Anger* (three books), *On the Happy Life*, *On the Shortness of Life*, *On Tranquillity of Mind*, *On the Constancy of the Wise Man*, *On Leisure*, *On Providence*, and the three *Consolations* (to Marcia, to Helvia, to Polybius).
- **On Benefits** (*De Beneficiis*): seven books on giving, receiving and gratitude, the longest of his moral works.
- **On Clemency** (*De Clementia*): written for Nero.
- **Moral Letters to Lucilius**: 124 letters written in retirement to a younger friend. The best place to start if you read one thing: each letter is short, personal, and ends with a saying to keep.
- **Natural Questions**: on weather, earthquakes, comets and the Nile, always turning back to how to live.
- **Tragedies**: *Medea*, *Phaedra*, *Thyestes*, *Oedipus*, *Agamemnon* and others, the only Roman tragedies that survive. They shaped Elizabethan drama, Shakespeare's included.
- **The Apocolocyntosis**: a vicious satire on the dead Claudius, the "pumpkinification" of a god.

**This book**

*Seneca's Morals by Way of Abstract* (1678) isn't a straight translation. Sir Roger L'Estrange (1616–1704), a Royalist pamphleteer and the official licenser of the press under Charles II, took the moral teaching out of *On Benefits*, the dialogues and the letters and arranged it under headings, "without any additions of my own". The language is 17th century, but the arrangement makes it ideal for one short reading a day.

**Five things worth taking from him**

1. **Review the day.** Every night, he says, we should "call ourselves to account: What infirmity have I mastered to-day? what passion opposed? what temptation resisted? what virtue acquired?" Fair, not harsh, and then sleep. It's the evening review in the Journal.

2. **Count your time like money.** "It is with our lives as with our estates, a good husband makes a little go a great way." Life isn't short; we waste it, on other people's business, on hopes and fears, on nothing at all.

3. **Rehearse the worst.** Think through losses before they come (exile, poverty, illness, death) so that when they come they've lost their surprise. He even advised living for a few days a month on the plainest food and clothes, then asking: is this what I was afraid of?

4. **Delay anger.** "Whoever it was, that first called *anger a short madness*" was right, he says. The cure is time: don't act while it's hot, judge the other person as you'd want to be judged, and remember that "some things we are to pause upon, others to laugh at, and others again to pardon."

5. **Give well, receive well.** "He that does good to another man does good also to himself." A benefit lives in the intention, not the gift, and gratitude is a virtue you can always afford.

**The contradiction**

His enemies called him a hypocrite: a preacher of poverty with five hundred tables of citrus wood. He answered them in *On the Happy Life*: he never claimed to be wise, only to be trying each day to take away a little more of his faults. The philosophy is a standard to aim at, not a boast that he'd reached it. That's exactly why he's good company for anyone trying to live by a vision board and a planner while life keeps getting in the way.

Early Christians took to him; Tertullian called him "often one of ours", and a forged set of letters between Seneca and St Paul circulated for over a thousand years. Montaigne counted him, with Plutarch, among his favourite authors. Today he's back in fashion, in books like Ryan Holiday's *The Daily Stoic*. Two thousand years on, his advice still fits a day: look at the day honestly, don't waste it, and don't let anything that's outside your control decide how you feel.

*The book is in the Library, to read a chapter at a time.*
$post$
from (select id from auth.users order by created_at limit 1) u
where not exists (
  select 1 from public.blog_posts b
  where b.owner_id = u.id and b.title = 'Seneca: the man behind the morals'
);
