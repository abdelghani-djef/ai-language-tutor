// The ready-made word lists: 2,000 of the most frequent English words in 20 themed
// regular lists of 100 words, then 15 advanced lists of 100 harder, less common
// words (1,500 more; 3,500 in all). This file is the lists' small index (id, emoji,
// title, level and number of words), which any page may use. The words themselves
// are in starter-words.ts, loaded only by the pages that show them: see
// src/lib/starter-words.ts.
// Order matters: lists go from most to least useful, and the advanced lists come
// last so a word's regular sense is found first.

/** A word of a ready-made list: [English, French, Arabic, emoji or "", example sentence]. */
export type StarterRow = [string, string, string, string, string];

/** Every ready-made list's words, by list id, each list in its own order (see starter-words.ts). */
export type StarterWords = Readonly<Record<string, readonly StarterRow[]>>;

export interface StarterPack {
  id: string;
  emoji: string;
  title: { en: string; fr: string; ar: string };
  /** "advanced" for a list of harder, less common words; absent for a regular list. */
  level?: "advanced";
  /** How many words the list has (its rows in starter-words.ts). */
  size: number;
}

export const STARTER_LANGS = ["fr", "ar"] as const;
export type StarterLang = (typeof STARTER_LANGS)[number];

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "greetings",
    emoji: "👋",
    title: { en: "Greetings", fr: "Salutations", ar: "التحيات" },
    size: 100,
  },
  {
    id: "people",
    emoji: "👪",
    title: { en: "People and family", fr: "Les gens et la famille", ar: "الناس والعائلة" },
    size: 100,
  },
  {
    id: "numbers",
    emoji: "🔢",
    title: { en: "Numbers and amounts", fr: "Nombres et quantités", ar: "الأعداد والكميات" },
    size: 100,
  },
  {
    id: "time",
    emoji: "⏰",
    title: { en: "Time and days", fr: "L’heure et les jours", ar: "الوقت والأيام" },
    size: 100,
  },
  {
    id: "food",
    emoji: "🍽️",
    title: { en: "Food and drink", fr: "Nourriture et boissons", ar: "الطعام والشراب" },
    size: 100,
  },
  {
    id: "home",
    emoji: "🏠",
    title: { en: "Home and everyday things", fr: "La maison", ar: "البيت" },
    size: 100,
  },
  {
    id: "body",
    emoji: "🩺",
    title: { en: "Body and health", fr: "Le corps et la santé", ar: "الجسم والصحة" },
    size: 100,
  },
  {
    id: "describe",
    emoji: "🎨",
    title: { en: "Describing words", fr: "Les adjectifs", ar: "الصفات" },
    size: 100,
  },
  {
    id: "verbs-core",
    emoji: "⭐",
    title: { en: "Core verbs", fr: "Verbes essentiels", ar: "أفعال أساسية" },
    size: 100,
  },
  {
    id: "verbs-daily",
    emoji: "🌞",
    title: { en: "Daily actions", fr: "Actions du quotidien", ar: "أفعال يومية" },
    size: 100,
  },
  {
    id: "places",
    emoji: "🏙️",
    title: { en: "Places in town", fr: "Lieux en ville", ar: "أماكن في المدينة" },
    size: 100,
  },
  {
    id: "school",
    emoji: "📚",
    title: { en: "School and learning", fr: "École et apprentissage", ar: "المدرسة والتعلم" },
    size: 100,
  },
  {
    id: "work",
    emoji: "💼",
    title: { en: "Work and jobs", fr: "Travail et métiers", ar: "العمل والمهن" },
    size: 100,
  },
  {
    id: "travel",
    emoji: "✈️",
    title: { en: "Travel and transport", fr: "Voyages et transports", ar: "السفر والنقل" },
    size: 100,
  },
  {
    id: "feelings",
    emoji: "😊",
    title: { en: "Feelings", fr: "Les sentiments", ar: "المشاعر" },
    size: 100,
  },
  {
    id: "nature",
    emoji: "🌳",
    title: { en: "Nature and weather", fr: "Nature et météo", ar: "الطبيعة والطقس" },
    size: 100,
  },
  {
    id: "animals",
    emoji: "🐾",
    title: { en: "Animals", fr: "Les animaux", ar: "الحيوانات" },
    size: 100,
  },
  {
    id: "clothes",
    emoji: "👕",
    title: { en: "Clothes", fr: "Les vêtements", ar: "الملابس" },
    size: 100,
  },
  {
    id: "questions",
    emoji: "❓",
    title: { en: "Questions and linking words", fr: "Questions et mots de liaison", ar: "أدوات الاستفهام والربط" },
    size: 100,
  },
  {
    id: "position",
    emoji: "🧭",
    title: { en: "Place and direction", fr: "Lieu et direction", ar: "المكان والاتجاه" },
    size: 100,
  },
  {
    id: "adv-people",
    emoji: "👪",
    title: { en: "Advanced: People and family", fr: "Avancé : Les gens et la famille", ar: "متقدم: الناس والعائلة" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-time",
    emoji: "⏰",
    title: { en: "Advanced: Time and days", fr: "Avancé : L’heure et les jours", ar: "متقدم: الوقت والأيام" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-food",
    emoji: "🍽️",
    title: { en: "Advanced: Food and drink", fr: "Avancé : Nourriture et boissons", ar: "متقدم: الطعام والشراب" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-home",
    emoji: "🏠",
    title: { en: "Advanced: Home and everyday things", fr: "Avancé : La maison", ar: "متقدم: البيت" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-body",
    emoji: "🩺",
    title: { en: "Advanced: Body and health", fr: "Avancé : Le corps et la santé", ar: "متقدم: الجسم والصحة" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-describe",
    emoji: "🎨",
    title: { en: "Advanced: Describing words", fr: "Avancé : Les adjectifs", ar: "متقدم: الصفات" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-verbs",
    emoji: "⭐",
    title: { en: "Advanced: Verbs", fr: "Avancé : Verbes", ar: "متقدم: الأفعال" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-places",
    emoji: "🏙️",
    title: { en: "Advanced: Places in town", fr: "Avancé : Lieux en ville", ar: "متقدم: أماكن في المدينة" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-school",
    emoji: "📚",
    title: { en: "Advanced: School and learning", fr: "Avancé : École et apprentissage", ar: "متقدم: المدرسة والتعلم" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-work",
    emoji: "💼",
    title: { en: "Advanced: Work and jobs", fr: "Avancé : Travail et métiers", ar: "متقدم: العمل والمهن" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-travel",
    emoji: "✈️",
    title: { en: "Advanced: Travel and transport", fr: "Avancé : Voyages et transports", ar: "متقدم: السفر والنقل" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-feelings",
    emoji: "😊",
    title: { en: "Advanced: Feelings", fr: "Avancé : Les sentiments", ar: "متقدم: المشاعر" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-nature",
    emoji: "🌳",
    title: { en: "Advanced: Nature and weather", fr: "Avancé : Nature et météo", ar: "متقدم: الطبيعة والطقس" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-animals",
    emoji: "🐾",
    title: { en: "Advanced: Animals", fr: "Avancé : Les animaux", ar: "متقدم: الحيوانات" },
    level: "advanced",
    size: 100,
  },
  {
    id: "adv-clothes",
    emoji: "👕",
    title: { en: "Advanced: Clothes", fr: "Avancé : Les vêtements", ar: "متقدم: الملابس" },
    level: "advanced",
    size: 100,
  },
];

/** Whether a ready-made list is one of the advanced lists. Unknown or missing ids are regular. */
export function isAdvanced(packId: string | undefined): boolean {
  return !!packId && STARTER_PACKS.find((p) => p.id === packId)?.level === "advanced";
}

/**
 * A ready-made list's words, in order, from the loaded rows. Undefined for an unknown id, including
 * names an object has anyway ("constructor", "__proto__").
 */
export function packWords(words: StarterWords, packId: string): readonly StarterRow[] | undefined {
  return Object.hasOwn(words, packId) ? words[packId] : undefined;
}

/** The row for an English word, exactly as written in the list (e.g. "how are you?"). */
export function rowOf(words: StarterWords, packId: string, english: string): StarterRow | undefined {
  return packWords(words, packId)?.find((r) => r[0] === english);
}
