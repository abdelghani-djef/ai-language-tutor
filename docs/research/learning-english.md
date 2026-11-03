# How people learn English best: what the research says

*Evidence review for LinguaCards / AI Language Tutor. Prepared 2026-11-02. Scope: adult, teen and child learners of English as a second or foreign language, using an app that runs on English, French and Arabic interfaces.*

## Summary

The strongest evidence says that people remember language best when they **try to recall it** rather than reread it, ideally with corrective feedback (testing beats restudy, g = 0.50 [3]), and when they **spread practice over days and weeks** instead of cramming [9, 11]. Vocabulary grows fastest by **studying the most frequent words on purpose** [34] and then **meeting them again and again in lots of understandable reading and listening** [20, 22, 23]. Learners need to know about 95–98% of the words in a text to follow it comfortably, so material must be pitched to their level [28, 29]. Speaking improves with **two-way interaction and corrective feedback** [41, 42, 43], and pronunciation improves with **listening training that uses many different voices** [49, 50]. Motivation research supports **small, consistent daily habits**, personal goals and low-anxiety practice [53, 55, 61] over points and pressure. Several popular ideas are not supported or are overstated: learning styles [69], "it is too late after childhood" [71, 72], "input alone is enough" [27], and growth-mindset messaging as a learning booster [74]. Much of the evidence comes from vocabulary and memory studies with older learners, and very little of it tests apps or AI tutors directly.

## At a glance

| Principle | What it means in practice | Evidence strength | Key sources |
|---|---|---|---|
| Retrieval practice with feedback | Produce the answer, then see the correction | Strong | [1–5, 8] |
| Spaced review | Spread reviews over days and weeks; lengthen gaps | Strong (spacing); moderate (adaptive schedulers, sleep, schedule shape) | [9–19] |
| Lots of comprehensible input | Daily levelled reading, listening and captioned video | Strong (reading, captions); emerging (read-along) | [20–26] |
| High-frequency words first, studied on purpose | Frequency-ordered word study plus recycling | Strong (deliberate study, repetition); moderate (size targets) | [28–40] |
| Speaking with feedback | Two-way tasks, short explanations, prompts to self-correct | Strong (feedback, explicit teaching); moderate (interaction); contested (task-based superiority); emerging (fluency drills) | [27, 41–47] |
| Pronunciation through listening variety | Many voices, many words, instant feedback; aim for intelligibility | Strong (HVPT); moderate (intelligibility over accent); emerging (shadowing) | [48–52] |
| Short daily habits, motivation, low anxiety | Anchored routines, personal goals, forgiving streaks | Strong (feedback, anxiety link); moderate (habits, motivation, gamification); emerging (streaks) | [8, 53–62] |
| Pictures and stories for children | Picture + translation + audio; shared story reading | Moderate | [39, 40, 66–68] |

## 1. Retrieval practice with feedback

**What the research found.** Recalling an answer builds stronger memory than restudying it. A meta-analysis of 159 effect sizes from 61 studies found testing beat restudy with g = 0.50 (95% CI 0.42–0.58) [3]. The benefit was larger with feedback (g = 0.73 vs 0.39 without) and at delays of a day or more (g = 0.69 vs 0.41 under a day). Cued recall (g = 0.61) beat recognition (g = 0.29). Without feedback and with initial recall of 50% or less, the effect vanished (g = 0.03) [3]. A classroom meta-analysis of 222 studies and 48,478 students found g = 0.499 [4], and practice tests beat restudying and every other comparison condition in another synthesis [5]. With foreign-language vocabulary, more restudy of learned items did not help delayed recall, while repeated testing had a large positive effect [2]. Restudy looks better after 5 minutes, but testing wins after 2 days and 1 week [1]. A major review rated practice testing "high utility" [6], and performance during practice is a poor guide to long-term learning [7]. Feedback in general has a medium effect (d = 0.48), rising to d = 0.99 when it carries a lot of information about the task [8].

**Strength and limits.** Strong. Heterogeneity is high (I² = 84) and most testing-effect studies used college students [3]. The feedback meta-analysis is not language-specific [8].

**What this means for the app.**
- Every card makes the learner produce the answer (type, say, or recall before reveal). No "show and flip" as the default.
- Recalling silently counts: in three experiments, retrieving the answer in your head ("covert" retrieval) helped later recall as much as saying or typing it [75]. So "think of the answer, then tap to check" is valid retrieval practice, as long as the learner tries before revealing. *(Added 2026-11-03, when the app dropped typed answers to keep practice effortless.)*
- Prefer cued recall over multiple choice for partly known items; use recognition only as an easier fallback.
- Always show corrective feedback immediately, saying what was wrong and how to fix it, not just a score.
- Keep tasks effortful but winnable; when a learner's success rate on an item falls low, drop to an easier format.
- Judge success by delayed recall, not same-session accuracy.

## 2. Spaced review

**What the research found.** Across 839 assessments from 317 experiments, the best gap between reviews grew with how long the memory had to last [9]. In a study of more than 1,350 people, the best gap was about 20–40% of the retention period for a test one week away and about 5–10% for a test one year away [10]. For second-language learning specifically, a meta-analysis of 48 experiments (N = 3,411) found a medium-to-large effect of spacing; shorter gaps matched longer gaps on immediate tests but lost on delayed tests [11]. Equal and expanding schedules were statistically equivalent [11]; one experiment found only a "limited" advantage for expanding gaps, while the amount of spacing mattered more [12]. With flashcards, one large deck beat several small decks and beat cramming for 90% of participants, yet 72% believed massing had worked better [13].

Adaptive scheduling can help. In a semester-long middle-school foreign-language course, personalized review raised retention by 16.5% over massed study and 10.0% over one-size-fits-all spacing [14]. Models fit to large app datasets cut recall-prediction error by 45% or more [15], improved memorization in a natural experiment [16], and improved performance by 12.6% over prior methods using logs from 220 million students [17].

Sleep helps consolidation: a meta-analysis of 823 effect sizes found g = 0.44, falling to g = 0.28 after correcting for selective reporting [18]. In one experiment with 40 participants, relearning foreign vocabulary across a night of sleep took half the practice and was better retained at 1 week and 6 months [19].

**Strength and limits.** Spacing is strong. Adaptive schedulers are moderate: only the classroom trial is controlled [14], the app studies use observational data and proxy metrics [15–17], and comparisons of specific consumer algorithms (for example FSRS vs SM-2) are not peer-reviewed. The sleep experiment is small [19], and a later replication (not separately verified for this review) suggested the effect may depend on the relearning procedure. Spacing studies use mostly word lists and facts, not full language skills [9, 10].

**What this means for the app.**
- Spaced review is the core engine. Never let all practice on an item happen in one sitting.
- Use a per-learner, per-item memory model that schedules a review when predicted recall drops to a target (for example about 90%). Log every review with a timestamp.
- Push gaps longer for known words, even when short gaps feel easier.
- Interleave due and new cards from a larger pool; no default "cram" mode. The app, not the learner's intuition, decides spacing [13].
- Schedule the first review of new words for the next day. Never encourage trading sleep for study.
- Describe the scheduler as "research-informed," not "proven superior."

## 3. Lots of comprehensible input

**What the research found.** Extensive reading improves reading proficiency with small-to-medium effects (71 samples, N = 5,919), with the largest effects when it is part of the curriculum; effects were larger for adults than for children, and web-based stories outperformed paper books [20]. A second meta-analysis found d = 0.46 for group contrasts and d = 0.71 for pre-post contrasts [21]. Learners pick up words from input, but slowly: 9–18% of unknown target words on immediate tests and 6–17% on delayed tests (24 studies, N = 2,771). Reading (17%/15%), listening (15%/13%) and reading-while-listening (13%/17%) were similar; viewing video was lower (7%/5%) [22]. More encounters mean more learning (r = .34), moderated by spacing, visual support and engagement [23].

Captions help: watching with English captions beat uncaptioned viewing (g = 0.56, 49 studies) [24], and in one experiment captions beat native-language subtitles, with on-screen imagery linked to word learning [25]. Reading-while-listening is not a clear comprehension boost: 86 intermediate-to-advanced learners understood a novel less well when reading while listening than when reading silently, and listening alone was worst [26].

**Strength and limits.** Strong for extensive reading, incidental learning and captions; emerging for reading-while-listening (one study, one population [26]). Many reading studies are quasi-experimental and pre-post designs inflate effects [20, 21]. Incidental learning studies are short and test mostly form-meaning recognition [22]. The smaller effect for children may reflect study quality rather than age [20].

**What this means for the app.**
- A large library of levelled, self-chosen stories and articles is a core daily activity, tracked as part of the learning path.
- Default videos to English captions; allow native-language subtitles for beginners, then nudge toward captions. Make caption words tappable.
- Pair every input session with tap-to-save words that feed spaced review; input alone is too slow for vocabulary [22].
- Sequence content (series, recurring topics) so target words return many times across days; track encounters per word [23].
- Offer read-only, read-along and listen-only as choices. Do not claim read-along improves comprehension without in-app testing.

## 4. High-frequency words first, studied on purpose

**What the research found.** If 98% of words must be known, unassisted reading needs 8,000–9,000 word families and listening 6,000–7,000 [28]. A minimal threshold of 4,000–5,000 families gives 95% coverage [29]. Comprehension rises roughly linearly with coverage, with no sharp cliff (661 participants) [30], and the original 98% study did not fully replicate [31]. Non-native listeners showed relatively good comprehension at 95% coverage, about 2,000–3,000 families [32]. Programs need both deliberate study and broad exposure [33].

Deliberate word study works but fades: learners recalled meaning for 60.1% and form for 58.5% of target words immediately, falling to 39.4% and 25.1% on delayed tests; activities ranged from 18.4% to 77.0% (22 studies) [34]. Deliberately learned words can become automatically processed, functional knowledge [35]. Tasks that create need, search and evaluation tend to aid retention [36], and an updated model predicts learning better than the original [37]. Blocking beat interleaving when the material was words (g = −0.39), although interleaving helped overall (g = 0.42), especially for similar categories [38]. Picture plus native-language translation beat translation only (g = 0.334) and picture only (g = 0.350) on immediate tests [39]; words with well-designed graphics beat words alone [40].

**Strength and limits.** Strong for deliberate study and repetition; moderate for vocabulary-size targets, which depend on contested coverage cut-offs and differing word-family definitions [29–32]. The listening estimate rests on one small study [32]. The picture advantage over picture-only was only marginal on delayed tests (g = 0.271, p = 0.067) [39].

**What this means for the app.**
- Order the curriculum by corpus frequency: first 2,000–3,000 families, then toward 4,000–5,000 and 8,000–9,000.
- Run a quick vocabulary-size test and recommend texts at roughly 95–98% known words, treating coverage as a sliding scale; gloss small gaps.
- Practise both directions (English to meaning, meaning to English); production fades faster [34].
- Prefer high-involvement tasks (choose the right word for a gap, write a sentence) over reading a gloss [36, 37].
- Introduce new words in themed blocks; interleave later for confusable contrasts (make/do, a/an/the, past simple vs present perfect) [38].
- Give every new word a clear picture, a native-language gloss (English, French or Arabic interface) and native-speaker audio, with no decorative clutter [39, 40].

## 5. Speaking with feedback

**What the research found.** Oral corrective feedback has significant, durable effects (15 classroom studies, N = 827); prompts that push self-correction beat recasts, and younger learners benefited more [41]. Another meta-analysis (33 studies) found a medium effect maintained over time, with implicit feedback better maintained than explicit [42]. Interaction with negotiation of meaning helped L2 development both in real-time text chat and face to face, with small, non-significant differences between modes (14 studies) [43]. Focused, explicit instruction produced large, durable gains and beat implicit instruction [27], including for simple and complex English grammar across 41 studies [44]. Task-based programs showed a strong positive effect (d = 0.93, 52 studies) [45], but a later re-examination concluded the field cannot yet meaningfully estimate their relative effectiveness [46]. In the 4/3/2 technique, only students who repeated their speeches kept fluency gains (24 students) [47].

**Strength and limits.** Strong for corrective feedback and explicit instruction; the two feedback meta-analyses disagree on prompts vs recasts [41, 42], and explicit-instruction outcomes are often controlled tests rather than free speech [44]. Interaction rests on 14 studies [43]. Task-based superiority is contested [46]. Fluency repetition is emerging [47]. None of these studies tested an AI tutor.

**What this means for the app.**
- Always give feedback on spoken and written output. Start with a prompt ("try again," a highlighted word); show the correct model only if the learner still misses it. Log errors so the structures return later.
- Build two-way chat and voice tasks where the tutor asks for clarification and makes the learner rephrase, not just listen-and-repeat.
- Inside tasks, add one- or two-sentence pattern explanations with examples, kept age-appropriate.
- Organise speaking around goal-based tasks (role-plays, information gaps) with brief focus on form: "task-supported," not claimed superior.
- Offer a timed 4-3-2 drill and repeat tasks across sessions.

## 6. Pronunciation through listening variety

**What the research found.** Pronunciation instruction has a generally large effect (86 reports; d = 0.89 within-group, 0.80 between-group), larger with feedback and longer interventions [48]. A synthesis of 32 studies concluded high-variability phonetic training (HVPT: many voices, many words, right/wrong feedback) is very effective with long-lasting gains [49]. A meta-analysis of 18 studies (549 participants) found the immediate training benefit disappeared after bias correction (g = −0.04), but effects were large for generalising to new talkers (g = 0.72) and for long-term retention (g = 1.09) [50]. A strong accent does not necessarily reduce comprehensibility or intelligibility [51]. Shadowing improved phoneme perception among 43 Japanese learners, with listening-test gains only for lower-proficiency learners [52].

**Strength and limits.** Strong for pronunciation instruction and HVPT, but most HVPT studies train perception of specific contrasts in adults, benefits for children are less clear, and confidence intervals are wide [50]. Intelligibility-over-accent is moderate (one verified study) [51]. Shadowing is emerging [52].

**What this means for the app.**
- Add short HVPT listening drills for contrasts that are hard for each first language, with many recorded voices and instant feedback, paired with production practice.
- Score speaking on being easy to understand, not on sounding native. Prioritise sounds, stress and rhythm that cause misunderstanding. Never shame accents.
- Offer shadowing as an optional warm-up, labelled "promising."

## 7. Short daily habits, motivation and low anxiety

**What the research found.** Intrinsic motivation and personal value are linked to success and persistence; motivation driven only by rewards or pressure was not linked to performance or persistence and was linked to lower well-being (344 samples, 223,209 participants) [53]. A vivid "ideal future English self" correlated r = .61 with intended effort but only r = .20 with measured achievement [54]. Habits took 18 to 254 days to reach near-peak automaticity, and missing one opportunity did not materially affect habit formation [55]. If-then plans improved goal attainment (d = .65, 94 tests) [56], and combining them with mental contrasting gave g = 0.336 [57]. Gamification had small positive effects (cognitive g = .49, motivational g = .36, behavioural g = .25), with story elements and competition combined with collaboration helping behaviour [58]. Highlighting streaks increased platform use among about 60,000 students and raised math achievement versus control [59], but broken streaks lowered later engagement, an effect softened when the streak could be repaired [60]. Language anxiety correlates r = −.36 with achievement (N = 19,933) [61], and enjoyment correlates positively with achievement and willingness to communicate [62].

**Strength and limits.** Feedback and anxiety findings are strong but correlational for anxiety [61]. Motivation, habits and gamification are moderate and mostly not language-specific [53, 55, 58]. Streak evidence is emerging: one working paper on math and consumer experiments [59, 60].

**What this means for the app.**
- At onboarding, ask learners to anchor a short daily session to an existing routine and write an if-then plan.
- Tell learners habits take weeks to months, and one missed day does not reset progress.
- Let learners pick goals and topics tied to their own reasons; show how each lesson serves them.
- Use streaks with freezes or repair, forgiving wording, and cumulative totals alongside the streak.
- Prefer co-op goals and light story themes over pure leaderboards; never show public failure counts.
- Provide private, low-stakes speaking practice before anything public.
- Measure real skill; high engagement or motivation is not proof of learning [54].

## 8. Pictures and stories for children

**What the research found.** Shared picture-book reading with young English learners had a significant positive effect across 54 US studies, robust to stricter inclusion criteria [66]. Of 60 intervention studies on songs (ages 2–18), most were not designed to support causal claims, so no firm conclusion is possible [67]. Picture plus translation beats either alone [39], and watching a meaningful gesture helped vocabulary about as much as performing it (7 studies, 309 participants) [68]. Younger learners benefited more from corrective feedback [41], while extensive reading effects were smaller for children [20].

**Strength and limits.** Moderate. Child-specific evidence is thinner than adult evidence, the shared-reading review gives no pooled effect size [66], and the gesture review compares two gesture conditions rather than gesture vs none [68].

**What this means for the app.**
- Build the children's track around narrated, illustrated stories with a "read together" mode in which a parent asks questions and target words are highlighted.
- Keep corrective feedback in kids' mode, gently worded.
- Use songs for fun, never as a proven teaching method.
- For concrete words, offer short gesture videos to watch.

## Myths and overclaims

- **"Find your learning style."** Matching instruction to visual, auditory or kinesthetic preferences has no adequate evidence base; the few properly designed studies contradicted it [69].
- **"It is too late after childhood."** A study of 669,498 speakers estimated grammar-learning ability holds until about 17.4 and then declines [70], but a reanalysis found a continuous decline fit most learner groups better [71], and the original first author has disputed that reanalysis (a 2024 rebuttal not separately verified here). In classroom settings, amount and quality of input strongly shape age effects [72].
- **"Just immerse yourself; input alone is enough."** Explicit, focused instruction produces large, durable gains [27, 44], and incidental vocabulary uptake from input is 6–18% of target words [22].
- **"Streaks and points equal learning."** Gamification effects are small [58]; reward-driven motivation is not linked to performance [53]; broken streaks can reduce engagement [60].
- **"A habit takes 21 days."** The best-known study found 18 to 254 days [55].
- **"Expanding intervals are the scientifically proven schedule."** Equal and expanding spacing were equivalent in L2 research [11, 12]; spacing itself is what matters.
- **"The keyword mnemonic is the scientific way to learn words."** It was rated low utility, helping only some materials over short intervals [6].
- **"Growth-mindset messages boost results."** Effects are weak on average [73]; d = 0.05 overall, non-significant after bias correction [74].
- **"You must sound native."** Intelligibility, not accent removal, is the evidence-based goal [51].
- **"Songs teach English."** Causal claims cannot yet be supported [67].
- **"Reading along with audio always improves comprehension."** One preregistered study found the opposite for intermediate-to-advanced learners [26].
- **"Apps alone make you fluent."** A company co-authored study of 225 adults found Intermediate Low reading and Novice High listening, with no control group and only receptive skills tested [63]; an independent case study had 9 learners [64]; app studies overall are low quality and rarely test delayed retention [65].

## The method

The LinguaCards method has seven principles. Each one is drawn from the evidence above.

**1. Recall, don't reread**
- *For learners:* You try to remember the answer before you see it, and then we show you exactly what to fix.
- *Evidence:* Recalling beats restudying (g = 0.50 across 61 studies), and the benefit is larger with corrective feedback (g = 0.73) [2, 3, 4].

**2. Space it out**
- *For learners:* We bring each word back just before you are likely to forget it, over days and weeks instead of all at once.
- *Evidence:* Spaced practice has a medium-to-large effect on second-language learning, and longer gaps win on delayed tests [9, 11, 14].

**3. Read and listen a lot**
- *For learners:* Every day you read, listen to and watch stories at your level, with English captions, and save the words you want to keep.
- *Evidence:* Extensive reading improves reading proficiency and captions boost word learning (g = 0.56), but input alone teaches only 9–18% of new words, so it is paired with review [20, 22, 24].

**4. Common words first**
- *For learners:* You learn the most useful English words first, each with a picture, a translation and real audio.
- *Evidence:* Knowing 95–98% of the words in a text is what makes it understandable, and deliberate study with pictures and translations speeds up learning [28, 34, 39].

**5. Speak and get feedback**
- *For learners:* You talk and write with a tutor that asks you questions, helps you correct yourself and explains patterns in a sentence or two.
- *Evidence:* Corrective feedback has durable effects, prompts to self-correct work well, and two-way interaction helps both by chat and by voice [41, 42, 43].

**6. Train your ear**
- *For learners:* You hear tricky sounds from many different voices so you can understand people and be understood, accent and all.
- *Evidence:* Training with many voices carries over to new speakers (g = 0.72) and lasts (g = 1.09), and a strong accent does not necessarily make speech harder to understand [49, 50, 51].

**7. Little and often**
- *For learners:* A few relaxed minutes every day, tied to a routine you already have, and a missed day never wipes out your progress.
- *Evidence:* Habits form by repetition in a fixed context (18–254 days), if-then plans improve follow-through (d = .65), and lower anxiety goes with higher achievement (r = −.36) [55, 56, 61].

*For children,* the same principles apply through illustrated, narrated stories read together with a parent, which have solid support [66].

## Open questions and limits of this review

- **Most evidence is about vocabulary and memory.** Spacing and testing studies mostly use word lists and facts with college students [3, 9]. Their effect on fluent speaking and writing is less tested.
- **AI tutors are untested here.** The feedback and interaction studies involve teachers, peers or chat partners [41–43]. Whether an AI tutor gives the same benefit is unknown and should be measured in the app.
- **Children are under-studied.** Several findings are from adults or show smaller effects for children [20, 50]; the shared-reading meta-analysis covers US studies only [66].
- **App evidence is weak.** App studies are low quality, high risk of bias and rarely test delayed retention [65]; the largest app outcome study had no control group [63]. Adaptive-scheduler gains come mainly from observational app data [15–17].
- **Learners' first language.** None of the reviewed findings focus on French- or Arabic-speaking learners of English; contrast lists for pronunciation drills need separate work.
- **General-education findings.** Motivation, habits, gamification, feedback and growth-mindset findings are mostly not language-specific [8, 53, 55, 58, 73].
- **Verification depth.** Many figures were checked against abstracts rather than full texts; for example, the L2 spacing meta-analysis's pooled effect size was not available [11]. Correlational findings (motivation, anxiety, repetition) do not establish cause [23, 54, 61].
- **Recommended next step.** Build delayed retention checks (1 week, 1 month) into the app so it can measure its own long-term learning [65].

## References

1. Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249–255. https://pubmed.ncbi.nlm.nih.gov/16507066/
2. Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science, 319*(5865), 966–968. https://pubmed.ncbi.nlm.nih.gov/18276894/
3. Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. *Psychological Bulletin, 140*(6), 1432–1463. https://doi.org/10.1037/a0037559
4. Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review. *Psychological Bulletin, 147*(4), 399–435. https://doi.org/10.1037/bul0000309
5. Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research, 87*(3), 659–701. https://doi.org/10.3102/0034654316689306
6. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology. *Psychological Science in the Public Interest, 14*(1), 4–58. https://doi.org/10.1177/1529100612453266
7. Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance: An integrative review. *Perspectives on Psychological Science, 10*(2), 176–199. https://doi.org/10.1177/1745691615569000
8. Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis of educational feedback research. *Frontiers in Psychology, 10*, 3087. https://doi.org/10.3389/fpsyg.2019.03087
9. Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
10. Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science, 19*(11), 1095–1102. https://pubmed.ncbi.nlm.nih.gov/19076480/
11. Kim, S. K., & Webb, S. (2022). The effects of spaced practice on second language learning: A meta-analysis. *Language Learning, 72*(1), 269–319. https://doi.org/10.1111/lang.12479
12. Nakata, T. (2015). Effects of expanding and equal spacing on second language vocabulary learning: Does gradually increasing spacing increase vocabulary learning? *Studies in Second Language Acquisition, 37*(4), 677–711. https://doi.org/10.1017/S0272263114000825
13. Kornell, N. (2009). Optimising learning using flashcards: Spacing is more effective than cramming. *Applied Cognitive Psychology, 23*(9), 1297–1317. https://doi.org/10.1002/acp.1537
14. Lindsey, R. V., Shroyer, J. D., Pashler, H., & Mozer, M. C. (2014). Improving students' long-term knowledge retention through personalized review. *Psychological Science, 25*(3), 639–647. https://doi.org/10.1177/0956797613504302
15. Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers)*, 1848–1858. https://doi.org/10.18653/v1/P16-1174
16. Tabibian, B., Upadhyay, U., De, A., Zarezade, A., Schölkopf, B., & Gomez-Rodriguez, M. (2019). Enhancing human learning via spaced repetition optimization. *Proceedings of the National Academy of Sciences, 116*(10), 3988–3993. https://doi.org/10.1073/pnas.1815156116
17. Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling. *Proceedings of the 28th ACM SIGKDD Conference on Knowledge Discovery and Data Mining*, 4381–4390. https://doi.org/10.1145/3534678.3539081
18. Berres, S., & Erdfelder, E. (2021). The sleep benefit in episodic memory: An integrative review and a meta-analysis. *Psychological Bulletin, 147*(12), 1309–1353. https://doi.org/10.1037/bul0000350
19. Mazza, S., Gerbier, E., Gustin, M.-P., Kasikci, Z., Koenig, O., Toppino, T. C., & Magnin, M. (2016). Relearn faster and retain longer: Along with practice, sleep makes perfect. *Psychological Science, 27*(10), 1321–1330. https://pubmed.ncbi.nlm.nih.gov/27530500/
20. Jeon, E.-Y., & Day, R. R. (2016). The effectiveness of ER on reading proficiency: A meta-analysis. *Reading in a Foreign Language, 28*(2), 246–265. https://doi.org/10.64152/10125/66901
21. Nakanishi, T. (2015). A meta-analysis of extensive reading research. *TESOL Quarterly, 49*(1), 6–37. https://doi.org/10.1002/tesq.157
22. Webb, S., Uchihara, T., & Yanagisawa, A. (2023). How effective is second language incidental vocabulary learning? A meta-analysis. *Language Teaching, 56*(2), 161–180. https://doi.org/10.1017/S0261444822000507
23. Uchihara, T., Webb, S., & Yanagisawa, A. (2019). The effects of repetition on incidental vocabulary learning: A meta-analysis of correlational studies. *Language Learning, 69*(3), 559–599. https://doi.org/10.1111/lang.12343
24. Kurokawa, S., Hein, A. M., & Uchihara, T. (2025). Incidental vocabulary acquisition through captioned viewing: A meta-analysis. *Language Learning, 75*(4), 939–987. https://doi.org/10.1111/lang.12697
25. Peters, E. (2019). The effect of imagery and on-screen text on foreign language vocabulary learning from audiovisual input. *TESOL Quarterly, 53*(4), 1008–1032. https://doi.org/10.1002/tesq.531
26. Hui, B., & Godfroid, A. (2025). Listening, reading, or both? Rethinking the comprehension benefits of reading-while-listening. *Language Learning, 76*(1), 311–351. https://doi.org/10.1111/lang.12721
27. Norris, J. M., & Ortega, L. (2000). Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis. *Language Learning, 50*(3), 417–528. https://doi.org/10.1111/0023-8333.00136
28. Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *The Canadian Modern Language Review, 63*(1), 59–82. https://doi.org/10.3138/cmlr.63.1.59
29. Laufer, B., & Ravenhorst-Kalovski, G. C. (2010). Lexical threshold revisited: Lexical text coverage, learners' vocabulary size and reading comprehension. *Reading in a Foreign Language, 22*(1), 15–30. https://doi.org/10.64152/10125/66648
30. Schmitt, N., Jiang, X., & Grabe, W. (2011). The percentage of words known in a text and reading comprehension. *The Modern Language Journal, 95*(1), 26–43. https://doi.org/10.1111/j.1540-4781.2011.01146.x
31. Kremmel, B., Indrarathne, B., Kormos, J., & Suzuki, S. (2023). Unknown vocabulary density and reading comprehension: Replicating Hu and Nation (2000). *Language Learning, 73*(4), 1127–1163. https://doi.org/10.1111/lang.12622
32. van Zeeland, H., & Schmitt, N. (2013). Lexical coverage in L1 and L2 listening comprehension: The same or different from reading comprehension? *Applied Linguistics, 34*(4), 457–479. https://doi.org/10.1093/applin/ams074
33. Schmitt, N. (2008). Review article: Instructed second language vocabulary learning. *Language Teaching Research, 12*(3), 329–363. https://doi.org/10.1177/1362168808089921
34. Webb, S., Yanagisawa, A., & Uchihara, T. (2020). How effective are intentional vocabulary-learning activities? A meta-analysis. *The Modern Language Journal, 104*(4), 715–738. https://doi.org/10.1111/modl.12671
35. Elgort, I. (2011). Deliberate learning and vocabulary acquisition in a second language. *Language Learning, 61*(2), 367–413. https://doi.org/10.1111/j.1467-9922.2010.00613.x
36. Laufer, B., & Hulstijn, J. (2001). Incidental vocabulary acquisition in a second language: The construct of task-induced involvement. *Applied Linguistics, 22*(1), 1–26. https://doi.org/10.1093/applin/22.1.1
37. Yanagisawa, A., & Webb, S. (2022). Involvement Load Hypothesis Plus: Creating an improved predictive model of incidental vocabulary learning. *Studies in Second Language Acquisition, 44*(5), 1279–1308. https://doi.org/10.1017/S0272263121000577
38. Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin, 145*(11), 1029–1052. https://doi.org/10.1037/bul0000209
39. Zhang, C., Sala, G., & Gobet, F. (2025). Effectiveness of L1 and pictures in multimedia conditions on learning second-language vocabulary: A meta-analysis. *Educational Research Review, 47*, 100681. https://doi.org/10.1016/j.edurev.2025.100681
40. Mayer, R. E. (2008). Applying the science of learning: Evidence-based principles for the design of multimedia instruction. *American Psychologist, 63*(8), 760–769. https://doi.org/10.1037/0003-066X.63.8.760
41. Lyster, R., & Saito, K. (2010). Oral feedback in classroom SLA: A meta-analysis. *Studies in Second Language Acquisition, 32*(2), 265–302. doi:10.1017/S0272263109990520. https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/oral-feedback-in-classroom-sla/4999EE1C8379B2BF026B148EAF373CA1
42. Li, S. (2010). The effectiveness of corrective feedback in SLA: A meta-analysis. *Language Learning, 60*(2), 309–365. doi:10.1111/j.1467-9922.2010.00561.x. https://eric.ed.gov/?id=EJ883422
43. Ziegler, N. (2016). Synchronous computer-mediated communication and interaction: A meta-analysis. *Studies in Second Language Acquisition, 38*(3), 553–586. doi:10.1017/S027226311500025X. https://eric.ed.gov/?id=EJ1113916
44. Spada, N., & Tomita, Y. (2010). Interactions between type of instruction and type of language feature: A meta-analysis. *Language Learning, 60*(2), 263–308. doi:10.1111/j.1467-9922.2010.00562.x. https://eric.ed.gov/?id=EJ883419
45. Bryfonski, L., & McKay, T. H. (2019). TBLT implementation and evaluation: A meta-analysis. *Language Teaching Research, 23*(5), 603–632. doi:10.1177/1362168817744389. https://eric.ed.gov/?id=EJ1225836
46. Boers, F., & Faez, F. (2026). Meta-analysis to estimate the relative effectiveness of TBLT programs: Are we there yet? *Language Teaching Research, 30*(3), 1525–1543. doi:10.1177/13621688231167573. https://eric.ed.gov/?id=EJ1500344
47. de Jong, N., & Perfetti, C. A. (2011). Fluency training in the ESL classroom: An experimental study of fluency development and proceduralization. *Language Learning, 61*(2), 533–568. doi:10.1111/j.1467-9922.2010.00620.x. https://eric.ed.gov/?id=EJ928532
48. Lee, J., Jang, J., & Plonsky, L. (2015). The effectiveness of second language pronunciation instruction: A meta-analysis. *Applied Linguistics, 36*(3), 345–366. doi:10.1093/applin/amu040. https://eric.ed.gov/?id=EJ1067987
49. Thomson, R. I. (2018). High Variability [Pronunciation] Training (HVPT): A proven technique about which every language teacher and learner ought to know. *Journal of Second Language Pronunciation, 4*(2), 208–231. doi:10.1075/jslp.17038.tho. Abstract read via https://languagelog.ldc.upenn.edu/nll/?p=44382
50. Zhang, X., Cheng, B., & Zhang, Y. (2021). The role of talker variability in nonnative phonetic learning: A systematic review and meta-analysis. *Journal of Speech, Language, and Hearing Research, 64*(12), 4802–4825. doi:10.1044/2021_JSLHR-21-00181. https://eric.ed.gov/?id=EJ1325371
51. Munro, M. J., & Derwing, T. M. (1995). Foreign accent, comprehensibility, and intelligibility in the speech of second language learners. *Language Learning, 45*(1), 73–97. https://eric.ed.gov/?id=EJ519945
52. Hamada, Y. (2016). Shadowing: Who benefits and how? Uncovering a booming EFL teaching technique for listening comprehension. *Language Teaching Research, 20*(1), 35–52. doi:10.1177/1362168815597504. https://eric.ed.gov/?id=EJ1084744
53. Howard, J. L., Bureau, J., Guay, F., Chong, J. X. Y., & Ryan, R. M. (2021). Student motivation and associated outcomes: A meta-analysis from self-determination theory. *Perspectives on Psychological Science, 16*(6), 1300–1323. https://pubmed.ncbi.nlm.nih.gov/33593153/
54. Al-Hoorie, A. H. (2018). The L2 motivational self system: A meta-analysis. *Studies in Second Language Learning and Teaching, 8*(4), 721–754. https://doi.org/10.14746/ssllt.2018.8.4.2
55. Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. *European Journal of Social Psychology, 40*(6), 998–1009. https://doi.org/10.1002/ejsp.674
56. Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. *Advances in Experimental Social Psychology, 38*, 69–119. https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f
57. Wang, G., Wang, Y., & Gai, X. (2021). A meta-analysis of the effects of mental contrasting with implementation intentions on goal attainment. *Frontiers in Psychology, 12*, 565202. https://doi.org/10.3389/fpsyg.2021.565202
58. Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. https://doi.org/10.1007/s10648-019-09498-w
59. Aulagnon, R., Cristia, J., Cueto, S., & Malamud, O. (2025). Streaks to success? The effects of highlighting streaks on student effort and learning. *NBER Working Paper 34173*. https://doi.org/10.3386/w34173
60. Silverman, J., & Barasch, A. (2023). On or off track: How (broken) streaks affect consumer decisions. *Journal of Consumer Research, 49*(6), 1095–1117. https://doi.org/10.1093/jcr/ucac029
61. Teimouri, Y., Goetze, J., & Plonsky, L. (2019). Second language anxiety and achievement: A meta-analysis. *Studies in Second Language Acquisition, 41*(2), 363–387. https://doi.org/10.1017/S0272263118000311
62. Botes, E., Dewaele, J.-M., & Greiff, S. (2022). Taking stock: A meta-analysis of the effects of foreign language enjoyment. *Studies in Second Language Learning and Teaching, 12*(2), 205–232. https://doi.org/10.14746/ssllt.2022.12.2.3
63. Jiang, X., Rollinson, J., Plonsky, L., Gustafson, E., & Pajak, B. (2021). Evaluating the reading and listening outcomes of beginning-level Duolingo courses. *Foreign Language Annals, 54*(4), 974–1002. https://doi.org/10.1111/flan.12600
64. Loewen, S., Crowther, D., Isbell, D. R., Kim, K. M., Maloney, J., Miller, Z. F., & Rawal, H. (2019). Mobile-assisted language learning: A Duolingo case study. *ReCALL, 31*(3), 293–311. https://doi.org/10.1017/S0958344019000065
65. Mihaylova, M., Gorin, S., Reber, T. P., & Rothen, N. (2022). A meta-analysis on mobile-assisted language learning applications: Benefits and risks. *Psychologica Belgica, 62*(1), 252–271. https://doi.org/10.5334/pb.1146
66. Fitton, L., McIlraith, A. L., & Wood, C. L. (2018). Shared book reading interventions with English learners: A meta-analysis. *Review of Educational Research, 88*(5), 712–751. https://doi.org/10.3102/0034654318790909
67. Hamilton, C., Schulz, J., Chalmers, H., & Murphy, V. (2024). Investigating the substantive linguistic effects of using songs for teaching second or foreign languages to preschool, primary and secondary school learners: A systematic review of intervention research. *System, 124*, 103350. https://doi.org/10.1016/j.system.2024.103350
68. Oppici, L., Mathias, B., Narciss, S., & Proske, A. (2023). Benefits of enacting and observing gestures on foreign language vocabulary learning: A systematic review and meta-analysis. *Behavioral Sciences, 13*(11), 920. https://doi.org/10.3390/bs13110920
69. Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psychological Science in the Public Interest, 9*(3), 105–119. https://doi.org/10.1111/j.1539-6053.2009.01038.x
70. Hartshorne, J. K., Tenenbaum, J. B., & Pinker, S. (2018). A critical period for second language acquisition: Evidence from 2/3 million English speakers. *Cognition, 177*, 263–277. https://doi.org/10.1016/j.cognition.2018.04.007
71. van der Slik, F., Schepens, J., Bongaerts, T., & van Hout, R. (2022). Critical period claim revisited: Reanalysis of Hartshorne, Tenenbaum, and Pinker (2018) suggests steady decline and learner-type differences. *Language Learning, 72*(1), 87–112. https://doi.org/10.1111/lang.12470
72. Muñoz, C. (2008). Symmetries and asymmetries of age effects in naturalistic and instructed L2 learning. *Applied Linguistics, 29*(4), 578–596. https://doi.org/10.1093/applin/amm056
73. Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mind-sets important to academic achievement? Two meta-analyses. *Psychological Science, 29*(4), 549–571. https://doi.org/10.1177/0956797617739704
74. Macnamara, B. N., & Burgoyne, A. P. (2023). Do growth mindset interventions impact students' academic achievement? A systematic review and meta-analysis with recommendations for best practices. *Psychological Bulletin, 149*(3–4), 133–173. https://doi.org/10.1037/bul0000352
75. Smith, M. A., Roediger, H. L., & Karpicke, J. D. (2013). Covert retrieval practice benefits retention as much as overt retrieval practice. *Journal of Experimental Psychology: Learning, Memory, and Cognition, 39*(6), 1712–1725. https://doi.org/10.1037/a0033569
