export interface Language {
  code: string;
  name: string;
  /** BCP-47 tag used to pick a speechSynthesis voice. */
  speech: string;
  rtl?: boolean;
}

export const LANGUAGES: Record<string, Language> = {
  en: { code: 'en', name: 'English', speech: 'en-US' },
  fr: { code: 'fr', name: 'French', speech: 'fr-FR' },
  es: { code: 'es', name: 'Spanish', speech: 'es-ES' },
  de: { code: 'de', name: 'German', speech: 'de-DE' },
  it: { code: 'it', name: 'Italian', speech: 'it-IT' },
  ar: { code: 'ar', name: 'Arabic', speech: 'ar-SA', rtl: true },
};

export interface LanguagePair {
  id: string;
  src: string;
  tgt: string;
  model: string;
}

// One small MarianMT (opus-mt) model per direction, ~75 MB each when quantized.
export const PAIRS: LanguagePair[] = ['fr', 'es', 'de', 'it', 'ar'].flatMap((l) => [
  { id: `en-${l}`, src: 'en', tgt: l, model: `Xenova/opus-mt-en-${l}` },
  { id: `${l}-en`, src: l, tgt: 'en', model: `Xenova/opus-mt-${l}-en` },
]);

export function getPair(id: string): LanguagePair {
  return PAIRS.find((p) => p.id === id) ?? PAIRS[0];
}

export function pairLabel(p: { src: string; tgt: string }): string {
  return `${LANGUAGES[p.src].name} → ${LANGUAGES[p.tgt].name}`;
}
