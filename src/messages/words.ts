import { defineMessages } from "@/lib/i18n";

// The ready-made lists page, where the learner picks lists to sort.
export const words = defineMessages({
  en: {
    title: "Ready-made lists",
    intro:
      "About 3,500 useful English words in 35 lists by theme: 20 everyday lists and 15 advanced ones. The words you choose to learn come a few at a time each day, each with a picture, a translation, audio and an example.",
    pickHint: "Tick the lists you want, then go through their words one by one: the ones you already know, and the ones to learn.",
    wordCount: { one: "{count} word", other: "{count} words" },
    leftToSort: { one: "{count} left to sort", other: "{count} left to sort" },
    allSorted: "All sorted — Already know: {known}, Should learn: {learn}",
    continueWith: { one: "Continue with {count} word", other: "Continue with {count} words" },
    advancedTitle: "Advanced lists",
    study: "Study now",
    stories: "Read stories with your words",
    why: "Why these words?",
    whyText:
      "A small number of very common words make up most of what people say and read. Knowing them first lets you understand much more, much sooner.",
    andMore: { one: "and {count} more", other: "and {count} more" },
  },
  fr: {
    title: "Listes toutes prêtes",
    intro:
      "Environ 3 500 mots anglais utiles, répartis en 35 listes par thème : 20 listes du quotidien et 15 listes avancées. Les mots que vous choisissez d’apprendre arrivent quelques-uns par jour, chacun avec une image, une traduction, l’audio et un exemple.",
    pickHint:
      "Cochez les listes qui vous intéressent, puis parcourez leurs mots un par un : ceux que vous connaissez déjà, et ceux à apprendre.",
    wordCount: { one: "{count} mot", other: "{count} mots" },
    leftToSort: { one: "{count} mot à trier", other: "{count} mots à trier" },
    allSorted: "Tout est trié — déjà connus : {known}, à apprendre : {learn}",
    continueWith: { one: "Continuer avec {count} mot", other: "Continuer avec {count} mots" },
    advancedTitle: "Listes avancées",
    study: "Réviser maintenant",
    stories: "Lire des histoires avec vos mots",
    why: "Pourquoi ces mots ?",
    whyText:
      "Un petit nombre de mots très courants représente l’essentiel de ce qu’on dit et lit. Les connaître d’abord permet de comprendre beaucoup plus, beaucoup plus vite.",
    andMore: { one: "et {count} autre", other: "et {count} autres" },
  },
  ar: {
    title: "قوائم جاهزة",
    intro:
      "نحو 3500 كلمة إنجليزية مفيدة، موزّعة على 35 قائمة حسب الموضوع: 20 قائمة للحياة اليومية و15 قائمة متقدّمة. تصلك الكلمات التي تختار تعلّمها بضعًا كل يوم، ومع كل كلمة صورة وترجمة ونطق ومثال.",
    pickHint: "اختر القوائم التي تريدها، ثم مرّ على كلماتها واحدة واحدة: ما تعرفه من قبل، وما ستتعلّمه.",
    wordCount: {
      zero: "لا كلمات",
      one: "كلمة واحدة",
      two: "كلمتان",
      few: "{count} كلمات",
      many: "{count} كلمة",
      other: "{count} كلمة",
    },
    leftToSort: {
      zero: "لم تبقَ كلمات للفرز",
      one: "بقيت كلمة واحدة للفرز",
      two: "بقيت كلمتان للفرز",
      few: "بقيت {count} كلمات للفرز",
      many: "بقيت {count} كلمة للفرز",
      other: "بقيت {count} كلمة للفرز",
    },
    allSorted: "فُرزت كلها — أعرفها: {known}، للتعلّم: {learn}",
    continueWith: {
      zero: "تابع",
      one: "افرز كلمة واحدة",
      two: "افرز كلمتين",
      few: "افرز {count} كلمات",
      many: "افرز {count} كلمة",
      other: "افرز {count} كلمة",
    },
    advancedTitle: "قوائم متقدّمة",
    study: "راجع الآن",
    stories: "اقرأ قصصًا بكلماتك",
    why: "لماذا هذه الكلمات؟",
    whyText: "عدد قليل من الكلمات الشائعة جدًا يشكّل معظم ما يقوله الناس ويقرؤونه. معرفتها أولًا تجعلك تفهم أكثر بكثير، وبسرعة أكبر.",
    andMore: { one: "وكلمة أخرى", two: "وكلمتان أخريان", few: "و{count} كلمات أخرى", many: "و{count} كلمة أخرى", other: "و{count} كلمة أخرى" },
  },
});
