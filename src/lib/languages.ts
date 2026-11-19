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
  pt: { code: 'pt', name: 'Portuguese', speech: 'pt-PT' },
  nl: { code: 'nl', name: 'Dutch', speech: 'nl-NL' },
  ru: { code: 'ru', name: 'Russian', speech: 'ru-RU' },
  tr: { code: 'tr', name: 'Turkish', speech: 'tr-TR' },
  hi: { code: 'hi', name: 'Hindi', speech: 'hi-IN' },
  zh: { code: 'zh', name: 'Chinese', speech: 'zh-CN' },
  ja: { code: 'ja', name: 'Japanese', speech: 'ja-JP' },
  ko: { code: 'ko', name: 'Korean', speech: 'ko-KR' },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES);

export interface LanguagePair {
  /** "src-tgt", e.g. "en-fr". */
  id: string;
  src: string;
  tgt: string;
}

/** Any two different languages make a pair. */
export function getPair(id: string): LanguagePair {
  const [src, tgt] = id.split('-');
  if (src in LANGUAGES && tgt in LANGUAGES && src !== tgt) return { id, src, tgt };
  return { id: 'en-fr', src: 'en', tgt: 'fr' };
}

export function pairId(src: string, tgt: string): string {
  return `${src}-${tgt}`;
}
