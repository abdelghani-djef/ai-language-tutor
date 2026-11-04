/**
 * Crude, sexual and violent words (English, then French). A Tatoeba sentence containing one is not shown.
 * Whole words only, so "class" or "skill" pass. Words that are harmless in the other language
 * (French "bite", "sang") are left out.
 */
const BLOCKLIST = new Set([
  // English
  "fuck", "fucks", "fucked", "fucker", "fucking", "motherfucker",
  "shit", "shitty", "bullshit", "crap",
  "bitch", "bitches", "bastard", "asshole", "ass", "arse", "dick", "dickhead", "cock", "cunt", "pussy", "twat", "wanker",
  "whore", "slut", "hooker", "prostitute",
  "sex", "sexy", "sexual", "porn", "porno", "pornography", "nude", "naked", "orgasm", "erection", "condom",
  "rape", "raped", "rapist",
  "kill", "kills", "killed", "killer", "killing",
  "murder", "murdered", "murderer", "stab", "stabbed", "behead", "beheaded", "torture", "tortured",
  "suicide", "gun", "guns", "corpse", "bloody",
  "cocaine", "heroin", "nazi",
  // French
  "putain", "merde", "connard", "connards", "connasse", "con", "conne", "salope", "salopes", "salaud", "pute", "putes",
  "enculé", "enculer", "couille", "couilles", "chier", "niquer", "nique", "bordel", "foutre",
  "sexe", "sexuel", "nu", "nue", "nus", "nues", "pornographie",
  "viol", "violer", "violé", "violée", "violeur",
  "tuer", "tue", "tué", "tuée", "tués", "meurtre", "meurtrier", "assassiner", "assassiné",
  "poignarder", "poignardé", "torturer", "torturé", "cadavre", "pistolet", "fusil", "drogue", "cocaïne", "héroïne",
]);

/** False if the text contains a blocklisted word (whole word, any case). */
export function isCleanSentence(text: string): boolean {
  const words = text.normalize("NFC").toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? [];
  return !words.some((w) => BLOCKLIST.has(w));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Plain text from an HTML fragment: tags dropped, common entities decoded, spaces collapsed. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/?(?:p|br|li|ol|ul|dl|dt|dd|div|tr|td|th|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}
