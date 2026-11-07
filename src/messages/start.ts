import { defineMessages } from "@/lib/i18n";

// The setup page, shown once before the pages that need the learner's language.
export const start = defineMessages({
  en: {
    title: "Welcome to {app}",
    langQuestion: "Your language",
    langHint: "Translations will be in this language. You can change it later in Stats.",
    nameQuestion: "Your name",
    nameHint: "Optional. It stays in this browser and is shown in the word scenes.",
    namePlaceholder: "For example: Lina",
    continue: "Continue",
    skip: "Skip",
  },
  fr: {
    title: "Bienvenue sur {app}",
    langQuestion: "Votre langue",
    langHint: "Les traductions seront dans cette langue. Vous pourrez la changer plus tard dans Stats.",
    nameQuestion: "Votre prénom",
    nameHint: "Facultatif. Il reste dans ce navigateur et s’affiche dans les scènes des mots.",
    namePlaceholder: "Par exemple : Lina",
    continue: "Continuer",
    skip: "Passer",
  },
  ar: {
    title: "مرحبًا بك في {app}",
    langQuestion: "لغتك",
    langHint: "ستظهر الترجمات بهذه اللغة، ويمكنك تغييرها لاحقًا من صفحة الإحصاءات.",
    nameQuestion: "اسمك",
    nameHint: "اختياري. يبقى في هذا المتصفح ويظهر في مشاهد الكلمات.",
    namePlaceholder: "مثلًا: لينا",
    continue: "متابعة",
    skip: "تخطٍّ",
  },
});
