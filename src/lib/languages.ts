export interface Language {
  code: string;
  name: string;
  /** BCP-47 tag used to pick a speechSynthesis voice. */
  speech: string;
  /** FLORES-200 code used by the NLLB model. */
  flores: string;
  rtl?: boolean;
}

export const LANGUAGES: Record<string, Language> = {
  en: { code: 'en', name: 'English', speech: 'en-US', flores: 'eng_Latn' },
  fr: { code: 'fr', name: 'French', speech: 'fr-FR', flores: 'fra_Latn' },
  es: { code: 'es', name: 'Spanish', speech: 'es-ES', flores: 'spa_Latn' },
  de: { code: 'de', name: 'German', speech: 'de-DE', flores: 'deu_Latn' },
  it: { code: 'it', name: 'Italian', speech: 'it-IT', flores: 'ita_Latn' },
  ar: { code: 'ar', name: 'Arabic', speech: 'ar-SA', flores: 'arb_Arab', rtl: true },
  pt: { code: 'pt', name: 'Portuguese', speech: 'pt-PT', flores: 'por_Latn' },
  nl: { code: 'nl', name: 'Dutch', speech: 'nl-NL', flores: 'nld_Latn' },
  ru: { code: 'ru', name: 'Russian', speech: 'ru-RU', flores: 'rus_Cyrl' },
  tr: { code: 'tr', name: 'Turkish', speech: 'tr-TR', flores: 'tur_Latn' },
  hi: { code: 'hi', name: 'Hindi', speech: 'hi-IN', flores: 'hin_Deva' },
  zh: { code: 'zh', name: 'Chinese', speech: 'zh-CN', flores: 'zho_Hans' },
  ja: { code: 'ja', name: 'Japanese', speech: 'ja-JP', flores: 'jpn_Jpan' },
  ko: { code: 'ko', name: 'Korean', speech: 'ko-KR', flores: 'kor_Hang' },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES);

export interface LanguagePair {
  /** "src-tgt", e.g. "en-fr". */
  id: string;
  src: string;
  tgt: string;
}

/** Any two different languages make a pair; whether it can be translated depends on the engine. */
export function getPair(id: string): LanguagePair {
  const [src, tgt] = id.split('-');
  if (src in LANGUAGES && tgt in LANGUAGES && src !== tgt) return { id, src, tgt };
  return { id: 'en-fr', src: 'en', tgt: 'fr' };
}

export function pairId(src: string, tgt: string): string {
  return `${src}-${tgt}`;
}

// ---------- translation engines ----------

export type Engine = 'opus' | 'nllb';

// Model names stay untranslated; their descriptions live in src/messages/translate.ts.
export const ENGINES: Record<Engine, { name: string }> = {
  opus: { name: 'Opus-MT' },
  nllb: { name: 'NLLB-200' },
};

// opus-mt has one MarianMT model per direction. Only these are wired up.
const OPUS_LANGS = ['fr', 'es', 'de', 'it', 'ar'];

export const NLLB_MODEL = 'Xenova/nllb-200-distilled-600M';

export interface ModelChoice {
  model: string;
  /** FLORES-200 codes, only for NLLB. */
  srcLang?: string;
  tgtLang?: string;
}

export function opusModel(p: LanguagePair): string | null {
  if (p.src === 'en' && OPUS_LANGS.includes(p.tgt)) return `Xenova/opus-mt-en-${p.tgt}`;
  if (p.tgt === 'en' && OPUS_LANGS.includes(p.src)) return `Xenova/opus-mt-${p.src}-en`;
  return null;
}

/** The model to translate a pair with, or null if the engine can't do that pair. */
export function modelFor(p: LanguagePair, engine: Engine): ModelChoice | null {
  if (engine === 'nllb') {
    return { model: NLLB_MODEL, srcLang: LANGUAGES[p.src].flores, tgtLang: LANGUAGES[p.tgt].flores };
  }
  const model = opusModel(p);
  return model ? { model } : null;
}
