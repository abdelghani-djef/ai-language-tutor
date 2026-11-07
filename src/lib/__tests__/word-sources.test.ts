import { afterEach, describe, expect, it, vi } from "vitest";
import { STARTER_WORDS } from "../../data/starter-words";
import { isCleanSentence, stripHtml } from "../word/clean";
import { fetchJson } from "../word/fetch";
import {
  fetchArticle,
  fetchDictionary,
  fetchPartners,
  fetchSentences,
  parseDatamuse,
  parseFreeDictionary,
  parseLanglink,
  parseMediaList,
  parseSummary,
  parseTatoeba,
  parseWiktionary,
} from "../word/sources";
import dictionaryBread from "./fixtures/word/dictionary-bread.json";
import wiktionaryBread from "./fixtures/word/wiktionary-bread.json";
import jjbBread from "./fixtures/word/datamuse-jjb-bread.json";
import trgBread from "./fixtures/word/datamuse-trg-bread.json";
import tatoebaBread from "./fixtures/word/tatoeba-bread-fra.json";
import summaryBread from "./fixtures/word/wiki-summary-bread.json";
import summaryFine from "./fixtures/word/wiki-summary-disambig-fine.json";
import langlinksBread from "./fixtures/word/wiki-langlinks-bread.json";
import mediaBread from "./fixtures/word/wiki-media-bread.json";

/** Successive answers for repeated requests to the same URL (the last one repeats). */
class Sequence {
  constructor(readonly answers: unknown[]) {}
}
const seq = (...answers: unknown[]) => new Sequence(answers);

/** Stubs `fetch`: each URL maps to a JSON body (status 200), a bare status code, or a `seq(...)`. Unknown URLs get 404. */
function stubFetch(routes: Record<string, unknown>) {
  const seen = new Map<string, number>();
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    const n = seen.get(url) ?? 0;
    seen.set(url, n + 1);
    const answer = route instanceof Sequence ? route.answers[Math.min(n, route.answers.length - 1)] : route;
    if (answer === undefined) return new Response("not found", { status: 404 });
    if (typeof answer === "number") return new Response("error", { status: answer });
    return new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const urls = (fn: ReturnType<typeof stubFetch>) => fn.mock.calls.map((c) => String(c[0]));

const DAY = 24 * 60 * 60 * 1000;

/** A minimal in-memory `caches`. */
function stubCaches() {
  const store = new Map<string, Response>();
  const key = (req: Request | string) => (typeof req === "string" ? req : req.url);
  const cache = {
    match: async (req: Request | string) => store.get(key(req))?.clone(),
    put: async (url: string, res: Response) => void store.set(url, res),
    keys: vi.fn(async () => [...store.keys()].map((url) => new Request(url))),
    delete: async (req: Request | string) => store.delete(key(req)),
  };
  const open = vi.fn(async () => cache);
  vi.stubGlobal("caches", { open });
  return { store, open, cache };
}

/** A cached answer stored `days` ago. */
const storedAgo = (days: number, body: unknown = { old: true }) =>
  new Response(JSON.stringify(body), { headers: { "x-linguacards-stored-at": String(Date.now() - days * DAY) } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseFreeDictionary", () => {
  const entry = parseFreeDictionary(dictionaryBread);

  it("reads the phonetic, the UK recording and the senses", () => {
    expect(["/bɹɛd/", "/bɹeːd/"]).toContain(entry?.phonetic);
    const uk = entry?.recordings.find((r) => r.accent === "uk");
    expect(uk?.url).toMatch(/bread-uk\.mp3$/);
    expect(uk?.licence).toBeTruthy();
    expect(entry?.recordings.find((r) => r.accent === "us")?.url).toMatch(/bread-us\.mp3$/);
    expect(entry?.senses[0].partOfSpeech).toBe("noun");
    expect(entry?.source).toBe("free-dictionary");
  });

  it("does not repeat recordings shared by several entries", () => {
    const urls = entry?.recordings.map((r) => r.url) ?? [];
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("is null for the 'no definitions' answer", () => {
    expect(parseFreeDictionary({ title: "No Definitions Found" })).toBeNull();
  });

  it("drops an example with a blocklisted word, keeping the sense", () => {
    const json = [{ meanings: [{ partOfSpeech: "noun", definitions: [
      { definition: "A loaf.", example: "He would kill for fresh bread." },
      { definition: "Money.", example: "She earns her bread." },
    ] }] }];
    const senses = parseFreeDictionary(json)?.senses ?? [];
    expect(senses).toHaveLength(2);
    expect(senses[0].example).toBeUndefined();
    expect(senses[1].example).toBe("She earns her bread.");
  });
});

describe("parseWiktionary", () => {
  it("strips the HTML from definitions and skips empty ones", () => {
    const entry = parseWiktionary(wiktionaryBread, "en");
    expect(entry?.senses[0].definition).not.toContain("<");
    expect(entry?.senses[0].definition).toBe("A foodstuff made by baking dough made from cereals.");
    expect(entry?.senses[0].partOfSpeech).toBe("noun");
    expect(entry?.senses[0].example).toBe("We made sandwiches with the bread we bought from the bakery.");
    expect(entry?.senses.every((s) => s.definition.length > 0)).toBe(true);
    expect(entry?.source).toBe("wiktionary");
  });

  it("does not repeat the same definition", () => {
    const defs = parseWiktionary(wiktionaryBread, "en")?.senses.map((s) => s.definition) ?? [];
    expect(new Set(defs).size).toBe(defs.length);
  });

  it("is null when there is nothing for that language", () => {
    expect(parseWiktionary(wiktionaryBread, "ar")).toBeNull();
    expect(parseWiktionary(wiktionaryBread, "__proto__")).toBeNull();
    expect(parseWiktionary(wiktionaryBread, "constructor")).toBeNull();
  });

  it("drops an example with a blocklisted word, keeping the sense", () => {
    const json = { en: [{ partOfSpeech: "Noun", definitions: [
      { definition: "A loaf.", parsedExamples: [{ example: "They will <b>kill</b> for bread." }] },
      { definition: "Money.", examples: ["<i>He earns his bread.</i>"] },
    ] }] };
    const senses = parseWiktionary(json, "en")?.senses ?? [];
    expect(senses).toHaveLength(2);
    expect(senses[0].example).toBeUndefined();
    expect(senses[1].example).toBe("He earns his bread.");
  });
});

describe("parseDatamuse", () => {
  it("lists the words in order", () => {
    expect(parseDatamuse(jjbBread)[0]).toBe("daily");
    expect(parseDatamuse(jjbBread, 3)).toHaveLength(3);
    expect(parseDatamuse({ nope: true })).toEqual([]);
  });
});

describe("parseTatoeba", () => {
  it("reads the sentence, its translation and its credits", () => {
    const first = parseTatoeba(tatoebaBread, "fr")[0];
    expect(first.text).toBeTruthy();
    expect(first.translation).toBeTruthy();
    expect(first.licence).toBe("CC BY 2.0 FR");
    expect(first.author).toBeTruthy();
    expect(first.source).toBe("tatoeba");
  });
});

describe("parseSummary", () => {
  it("rejects disambiguation pages", () => {
    expect(parseSummary(summaryFine, "fine")).toBeNull();
  });

  it("accepts a standard article whose title is the word, ignoring case", () => {
    const article = parseSummary(summaryBread, "Bread");
    expect(article?.title).toBe("Bread");
    expect(parseSummary(summaryBread, "bread")?.url).toBe("https://en.wikipedia.org/wiki/Bread");
    expect(article?.lang).toBe("en");
    expect(article?.extract).toMatch(/^Bread is/);
    expect(article?.image?.thumb).toMatch(/^https:\/\//);
  });

  it("rejects a title that is not the word", () => {
    expect(parseSummary(summaryBread, "toast")).toBeNull();
  });

  it("ignores a trailing qualifier in the title", () => {
    expect(parseSummary({ ...summaryBread, title: "Bread (food)", titles: { normalized: "Bread (food)" } }, "bread")).not.toBeNull();
  });
});

describe("parseLanglink", () => {
  it("reads the title in the other language", () => {
    expect(parseLanglink(langlinksBread)).toBe("خبز");
    expect(parseLanglink({ query: { pages: { "1": { title: "X" } } } })).toBeNull();
  });
});

describe("parseMediaList", () => {
  it("returns only images, with https thumbnails", () => {
    expect(mediaBread.items.some((i) => i.type !== "image")).toBe(true);
    const pictures = parseMediaList(mediaBread);
    expect(pictures).toHaveLength(mediaBread.items.filter((i) => i.type === "image").length);
    for (const p of pictures) {
      expect(p.thumb).toMatch(/^https:\/\//);
      expect(p.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
    expect(parseMediaList(mediaBread, 2)).toHaveLength(2);
  });
});

describe("isCleanSentence and stripHtml", () => {
  it("accepts ordinary sentences", () => {
    expect(isCleanSentence("I love bread.")).toBe(true);
  });

  it("rejects a blocklisted word, whatever its case", () => {
    expect(isCleanSentence("They wanted to KILL the king.")).toBe(false);
    expect(isCleanSentence("Il voulait tuer le roi.")).toBe(false);
  });

  it("only matches whole words", () => {
    expect(isCleanSentence("class")).toBe(true);
    expect(isCleanSentence("The skill of the baker.")).toBe(true);
  });

  it("strips tags and decodes entities", () => {
    expect(stripHtml('<p>Fish &amp; <a href="/x">chips</a>&nbsp; &#39;ok&#x27;</p>')).toBe("Fish & chips 'ok'");
  });
});

describe("fetchJson", () => {
  it("returns the JSON on success", async () => {
    stubFetch({ "https://example.org/a": { ok: 1 } });
    expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
  });

  it("returns null on a 404: the source has nothing for this word", async () => {
    stubFetch({});
    expect(await fetchJson("https://example.org/a")).toBeNull();
  });

  it("rejects on a 500 or a 502", async () => {
    stubFetch({ "https://example.org/a": 500, "https://example.org/b": 502 });
    await expect(fetchJson("https://example.org/a")).rejects.toThrow("HTTP 500");
    await expect(fetchJson("https://example.org/b")).rejects.toThrow("HTTP 502");
  });

  it("rejects when fetch rejects (offline)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchJson("https://example.org/a")).rejects.toThrow("Failed to fetch");
  });

  it("rejects on a timeout, and asks with a timeout signal", async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    vi.stubGlobal("fetch", fn);
    await expect(fetchJson("https://example.org/a")).rejects.toThrow("timed out");
    expect(fn.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("skips the browser's HTTP cache for other sites, but not for the app's own files", async () => {
    // Datamuse echoes the page's origin without Vary: Origin and allows a day of caching, so a reply
    // kept by the browser can carry another origin and fail CORS. The Cache API copy is the cache.
    const fn = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fn);
    await fetchJson("https://api.datamuse.com/words?rel_jjb=bread");
    await fetchJson("/scenes/food.json");
    expect((fn.mock.calls[0] as unknown[])[1]).toMatchObject({ cache: "no-store" });
    expect((fn.mock.calls[1] as unknown[])[1]).not.toHaveProperty("cache");
  });

  it("rejects when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    await expect(fetchJson("https://example.org/a")).rejects.toThrow(SyntaxError);
  });

  describe("with the Cache API", () => {
    it("stores answers in linguacards-words and reuses them without the network", async () => {
      const { open } = stubCaches();
      const fn = stubFetch({ "https://example.org/a": { ok: 1 } });
      expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
      expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("linguacards-words");
    });

    it("does not cache failures or 404s", async () => {
      const { store } = stubCaches();
      stubFetch({ "https://example.org/a": 502 });
      await expect(fetchJson("https://example.org/a")).rejects.toThrow();
      expect(await fetchJson("https://example.org/b")).toBeNull();
      expect(store.size).toBe(0);
    });

    it("returns a stale answer instead of rejecting when the source is down, offline or broken", async () => {
      stubCaches();
      stubFetch({ "https://example.org/a": { v: 1 } });
      await fetchJson("https://example.org/a", 1);
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 24 * 60 * 60 * 1000);
      try {
        stubFetch({ "https://example.org/a": 503 });
        expect(await fetchJson("https://example.org/a", 1)).toEqual({ v: 1 });
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        expect(await fetchJson("https://example.org/a", 1)).toEqual({ v: 1 });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
        expect(await fetchJson("https://example.org/a", 1)).toEqual({ v: 1 });
      } finally {
        vi.restoreAllMocks();
      }
    });

    it("refetches an answer older than maxAgeDays, and falls back to it when offline", async () => {
      stubCaches();
      stubFetch({ "https://example.org/a": { v: 1 } });
      await fetchJson("https://example.org/a");
      const later = Date.now() + 2 * 24 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(later);
      try {
        const fn = stubFetch({ "https://example.org/a": { v: 2 } });
        expect(await fetchJson("https://example.org/a", 1)).toEqual({ v: 2 });
        expect(fn).toHaveBeenCalledTimes(1);
        vi.mocked(Date.now).mockReturnValue(later + 2 * 24 * 60 * 60 * 1000);
        stubFetch({ "https://example.org/a": 502 });
        expect(await fetchJson("https://example.org/a", 1)).toEqual({ v: 2 });
      } finally {
        vi.restoreAllMocks();
      }
    });

    describe("pruning", () => {
      /** A fresh copy of fetch.ts: pruning runs once per page load, i.e. once per module instance. */
      async function freshFetchJson() {
        vi.resetModules();
        return (await import("../word/fetch")).fetchJson;
      }

      it("deletes entries older than 30 days after a network answer, once per page load", async () => {
        const fetchJson = await freshFetchJson();
        const { store, cache } = stubCaches();
        store.set("https://example.org/old", storedAgo(31));
        store.set("https://example.org/recent", storedAgo(29));
        store.set("https://example.org/no-date", new Response("{}"));
        stubFetch({ "https://example.org/a": { ok: 1 }, "https://example.org/b": { ok: 2 } });
        expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
        await vi.waitFor(() => expect(store.has("https://example.org/old")).toBe(false));
        expect(store.has("https://example.org/no-date")).toBe(false);
        expect(store.has("https://example.org/recent")).toBe(true);
        expect(store.has("https://example.org/a")).toBe(true);
        store.set("https://example.org/old", storedAgo(31));
        await fetchJson("https://example.org/b");
        await new Promise((r) => setTimeout(r, 0));
        expect(cache.keys).toHaveBeenCalledTimes(1);
        expect(store.has("https://example.org/old")).toBe(true);
      });

      it("does not prune on a cache hit or a failure", async () => {
        const fetchJson = await freshFetchJson();
        const { store, cache } = stubCaches();
        store.set("https://example.org/a", storedAgo(0, { ok: 1 }));
        stubFetch({ "https://example.org/b": 502 });
        expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
        await expect(fetchJson("https://example.org/b")).rejects.toThrow();
        expect(await fetchJson("https://example.org/c")).toBeNull();
        await new Promise((r) => setTimeout(r, 0));
        expect(cache.keys).not.toHaveBeenCalled();
      });

      it("never blocks or throws when pruning fails", async () => {
        const fetchJson = await freshFetchJson();
        const { cache } = stubCaches();
        cache.keys.mockRejectedValue(new DOMException("gone", "InvalidStateError"));
        stubFetch({ "https://example.org/a": { ok: 1 } });
        expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
        await new Promise((r) => setTimeout(r, 0));
        expect(cache.keys).toHaveBeenCalled();
      });
    });

    it("goes to the network when the cache cannot be opened", async () => {
      vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new DOMException("blocked", "SecurityError")) });
      stubFetch({ "https://example.org/a": { ok: 1 } });
      expect(await fetchJson("https://example.org/a")).toEqual({ ok: 1 });
    });
  });
});

const DICT = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const WIKT = "https://en.wiktionary.org/api/rest_v1/page/definition/";

describe("fetchDictionary", () => {
  it("encodes the word in the URL", async () => {
    const fn = stubFetch({});
    await fetchDictionary("thank you", "en");
    expect(urls(fn)[0]).toBe(`${DICT}thank%20you`);
    expect(urls(fn)).toContain(`${WIKT}thank%20you`);
  });

  it("retries Free Dictionary once after a 502", async () => {
    const fn = stubFetch({ [`${DICT}bread`]: seq(502, dictionaryBread) });
    const entry = await fetchDictionary("bread", "en");
    expect(urls(fn)).toEqual([`${DICT}bread`, `${DICT}bread`]);
    expect(entry?.source).toBe("free-dictionary");
  });

  it("falls back to Wiktionary when Free Dictionary keeps failing", async () => {
    const fn = stubFetch({ [`${DICT}bread`]: 502, [`${WIKT}bread`]: wiktionaryBread });
    const entry = await fetchDictionary("bread", "en");
    expect(urls(fn)).toEqual([`${DICT}bread`, `${DICT}bread`, `${WIKT}bread`]);
    expect(entry?.source).toBe("wiktionary");
    expect(entry?.senses[0].definition).toBe("A foodstuff made by baking dough made from cereals.");
  });

  it("goes straight to Wiktionary for other languages, reading that language's entries", async () => {
    const fn = stubFetch({ [`${WIKT}bread`]: wiktionaryBread });
    const entry = await fetchDictionary("bread", "es");
    expect(urls(fn)).toEqual([`${WIKT}bread`]);
    expect(entry?.source).toBe("wiktionary");
    expect(entry?.senses.length).toBeGreaterThan(0);
  });

  it("goes to Wiktionary without a retry when Free Dictionary has no entry (404)", async () => {
    const fn = stubFetch({ [`${WIKT}bread`]: wiktionaryBread });
    const entry = await fetchDictionary("bread", "en");
    expect(urls(fn)).toEqual([`${DICT}bread`, `${WIKT}bread`]);
    expect(entry?.source).toBe("wiktionary");
  });

  it("is null when no source knows the word (404 everywhere)", async () => {
    const fn = stubFetch({});
    expect(await fetchDictionary("bread", "en")).toBeNull();
    expect(urls(fn)).toEqual([`${DICT}bread`, `${WIKT}bread`]);
  });

  it("is null when Free Dictionary fails twice and Wiktionary has no entry", async () => {
    stubFetch({ [`${DICT}bread`]: 502 });
    expect(await fetchDictionary("bread", "en")).toBeNull();
  });

  it("rejects when Free Dictionary and Wiktionary both fail", async () => {
    const fn = stubFetch({ [`${DICT}bread`]: 502, [`${WIKT}bread`]: 503 });
    await expect(fetchDictionary("bread", "en")).rejects.toThrow();
    expect(urls(fn)).toEqual([`${DICT}bread`, `${DICT}bread`, `${WIKT}bread`]);
  });

  it("rejects when Wiktionary fails after Free Dictionary had no entry", async () => {
    stubFetch({ [`${WIKT}bread`]: 503 });
    await expect(fetchDictionary("bread", "en")).rejects.toThrow();
  });

  it("keeps dictionary answers for longer than a day", async () => {
    stubCaches();
    stubFetch({ [`${DICT}bread`]: dictionaryBread });
    await fetchDictionary("bread", "en");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * DAY);
    try {
      const fn = stubFetch({});
      expect((await fetchDictionary("bread", "en"))?.source).toBe("free-dictionary");
      expect(fn).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("asks nothing for a language code that is not one", async () => {
    const fn = stubFetch({ [`${WIKT}bread`]: wiktionaryBread });
    expect(await fetchDictionary("bread", "__proto__")).toBeNull();
    expect(await fetchDictionary("bread", "evil.example/x?")).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects when Wiktionary fails for another language", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchDictionary("pan", "es")).rejects.toThrow();
  });
});

const JJB = (w: string) => `https://api.datamuse.com/words?rel_jjb=${w}&max=8`;
const TRG = (w: string) => `https://api.datamuse.com/words?rel_trg=${w}&max=30`;
const words = (...ws: string[]) => ws.map((word, i) => ({ word, score: 1000 - i }));

describe("fetchPartners", () => {
  it("asks with a key for this site, so Datamuse's CDN never hands back another site's CORS answer", async () => {
    // Datamuse's CloudFront caches by URL and echoes the first asker's Origin (checked 2026-11-04).
    const keyFor = async (origin: string) => {
      vi.stubGlobal("location", { origin });
      const fn = stubFetch({});
      await fetchPartners("bread", "en", STARTER_WORDS);
      return urls(fn).map((u) => new URL(u).searchParams.get("md"));
    };
    const [a1, a2] = await keyFor("https://ai-language-tutor-alpha.vercel.app");
    const [b1] = await keyFor("http://localhost:3123");
    expect(a1).toMatch(/^[0-9]+$/); // digits: no metadata flag, same answer
    expect(a2).toBe(a1);
    expect(b1).not.toBe(a1);
  });

  it("puts adjectives before the word, then related words, without repeats", async () => {
    const fn = stubFetch({
      [JJB("bread")]: words("white", "unleavened", "fresh"),
      [TRG("bread")]: words("unleavened", "butter", "cheese", "Butter"),
    });
    const partners = await fetchPartners("bread", "en", STARTER_WORDS);
    expect(urls(fn)).toHaveLength(2);
    expect(partners).toEqual(["white bread", "unleavened bread", "fresh bread", "butter", "cheese"]);
  });

  it("keeps only the related words that are in the ready-made lists", async () => {
    // crumbs, sourdough, loaf…: not in a list.
    stubFetch({ [JJB("bread")]: words("fresh"), [TRG("bread")]: [...trgBread, ...words("egg", "milk")] });
    expect(await fetchPartners("bread", "en", STARTER_WORDS)).toEqual(["fresh bread", "egg", "milk"]);
    stubFetch({ [JJB("bread")]: jjbBread, [TRG("bread")]: words("egg") });
    expect(await fetchPartners("bread", "en", STARTER_WORDS)).toEqual(jjbBread.map((x) => `${x.word} bread`));
  });

  it("drops junk for 'hello': only ready-made related words, nothing crude, never the word itself", async () => {
    stubFetch({
      [JJB("hello")]: words("big", "warm"),
      [TRG("hello")]: words("dolly", "kitty", "goodbye", "cute", "nasty", "sailor", "gorgeous", "hello", "Hello", "egg", "welcome", "morning", "kiss"),
    });
    // "cute", "sailor" and "gorgeous" are ready-made words since the lists grew to 100; the cap then drops "morning".
    expect(await fetchPartners("hello", "en", STARTER_WORDS)).toEqual(["big hello", "warm hello", "goodbye", "cute", "sailor", "gorgeous", "egg", "welcome"]);
  });

  it("passes every partner through the blocklist", async () => {
    stubFetch({ [JJB("bread")]: words("fresh", "bloody", "sexy"), [TRG("bread")]: words("gun", "kill", "cheese") });
    expect(await fetchPartners("bread", "en", STARTER_WORDS)).toEqual(["fresh bread", "cheese"]);
  });

  it("gives at most 8", async () => {
    stubFetch({
      [JJB("bread")]: words("a1", "b1", "c1", "d1", "e1"),
      [TRG("bread")]: words("egg", "milk", "cheese", "butter", "water", "rice"),
    });
    const partners = await fetchPartners("bread", "en", STARTER_WORDS);
    expect(partners).toHaveLength(8);
    expect(partners.slice(0, 5)).toEqual(["a1 bread", "b1 bread", "c1 bread", "d1 bread", "e1 bread"]);
  });

  it("encodes the word", async () => {
    const fn = stubFetch({});
    await fetchPartners("ice cream", "en", STARTER_WORDS);
    expect(urls(fn)).toContain(JJB("ice%20cream"));
    expect(urls(fn)).toContain(TRG("ice%20cream"));
  });

  it("is empty when Datamuse knows nothing (404)", async () => {
    stubFetch({});
    expect(await fetchPartners("bread", "en", STARTER_WORDS)).toEqual([]);
  });

  it("keeps the other answer when one Datamuse call fails", async () => {
    stubFetch({ [JJB("bread")]: 502, [TRG("bread")]: words("crumbs", "butter") });
    expect(await fetchPartners("bread", "en", STARTER_WORDS)).toEqual(["butter"]);
  });

  it("keeps the related words of the lists it is given", async () => {
    stubFetch({ [JJB("bread")]: words(), [TRG("bread")]: words("egg", "cheese") });
    const only: typeof STARTER_WORDS = { food: [["cheese", "le fromage", "الجبن", "🧀", "I like cheese."]] };
    expect(await fetchPartners("bread", "en", only)).toEqual(["cheese"]);
    expect(await fetchPartners("bread", "en", {})).toEqual([]);
  });

  it("rejects when both Datamuse calls fail", async () => {
    stubFetch({ [JJB("bread")]: 502, [TRG("bread")]: 502 });
    await expect(fetchPartners("bread", "en", STARTER_WORDS)).rejects.toThrow();
  });

  it("is empty for other languages without fetching", async () => {
    const fn = stubFetch({});
    expect(await fetchPartners("pain", "fr", STARTER_WORDS)).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("fetchSentences", () => {
  const url = "https://api.tatoeba.org/unstable/sentences?lang=eng&q=bread&sort=relevance&limit=10&showtrans:lang=fra";

  it("asks Tatoeba with three-letter language codes", async () => {
    const fn = stubFetch({ [url]: tatoebaBread });
    const sentences = await fetchSentences("bread", "en", "fr");
    expect(urls(fn)).toEqual([url]);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0].translation).toBeTruthy();
  });

  it("skips sentences with a blocklisted word, in the text or the translation", async () => {
    const [a, b, ...rest] = tatoebaBread.data;
    const dirty = {
      ...tatoebaBread,
      data: [
        { ...a, text: "They will kill for bread." },
        { ...b, translations: [{ ...b.translations[0], text: "Ils vont tuer pour du pain." }] },
        ...rest,
      ],
    };
    stubFetch({ [url]: dirty });
    const sentences = await fetchSentences("bread", "en", "fr");
    expect(sentences).toHaveLength(rest.length);
    expect(sentences.every((s) => isCleanSentence(s.text) && isCleanSentence(s.translation ?? ""))).toBe(true);
  });

  it("keeps at most 6", async () => {
    const many = { ...tatoebaBread, data: [...tatoebaBread.data, ...tatoebaBread.data, ...tatoebaBread.data] };
    stubFetch({ [url]: many });
    expect(await fetchSentences("bread", "en", "fr")).toHaveLength(6);
  });

  it("rejects when Tatoeba is down", async () => {
    stubFetch({ [url]: 502 });
    await expect(fetchSentences("bread", "en", "fr")).rejects.toThrow();
  });

  it("encodes the word", async () => {
    const fn = stubFetch({});
    expect(await fetchSentences("thank you", "en", "fr")).toEqual([]);
    expect(urls(fn)[0]).toContain("&q=thank%20you&");
  });

  it("keeps sentences without a translation, after the ones that have one", async () => {
    const [a, b, ...rest] = tatoebaBread.data;
    const mixed = { ...tatoebaBread, data: [{ ...a, translations: [] }, b, { ...rest[0], translations: [] }, ...rest.slice(1)] };
    const arUrl = "https://api.tatoeba.org/unstable/sentences?lang=eng&q=bread&sort=relevance&limit=10&showtrans:lang=ara";
    stubFetch({ [url]: mixed, [arUrl]: { data: [{ ...a, translations: [] }] } });
    const sentences = await fetchSentences("bread", "en", "fr");
    expect(sentences).toHaveLength(mixed.data.length);
    const firstBare = sentences.findIndex((s) => !s.translation);
    expect(firstBare).toBe(mixed.data.length - 2);
    expect(sentences.slice(firstBare).every((s) => !s.translation)).toBe(true);
    expect(sentences.slice(firstBare).map((s) => s.text)).toEqual([a.text, rest[0].text]);
    const arabic = await fetchSentences("bread", "en", "ar");
    expect(arabic.map((s) => [s.text, s.translation])).toEqual([[a.text, undefined]]);
  });

  it("asks without translations for a language Tatoeba has no code for, and nothing for an unknown word language", async () => {
    const fn = stubFetch({});
    await fetchSentences("bread", "en", "constructor");
    expect(urls(fn)[0]).toBe("https://api.tatoeba.org/unstable/sentences?lang=eng&q=bread&sort=relevance&limit=10");
    expect(await fetchSentences("bread", "__proto__", "fr")).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

const SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const LANGLINKS = "https://en.wikipedia.org/w/api.php?action=query&titles=Bread&prop=langlinks&lllang=ar&format=json&origin=*";
const MEDIA = "https://en.wikipedia.org/api/rest_v1/page/media-list/Bread";
const AR_SUMMARY = "https://ar.wikipedia.org/api/rest_v1/page/summary/%D8%AE%D8%A8%D8%B2";

describe("fetchArticle", () => {
  it("shows nothing for a disambiguation page, and fetches nothing more", async () => {
    const fn = stubFetch({ [`${SUMMARY}fine`]: summaryFine });
    expect(await fetchArticle("fine", "en", "fr")).toEqual({ article: null, pictures: [] });
    expect(urls(fn)).toEqual([`${SUMMARY}fine`]);
  });

  it("shows nothing when there is no article (404)", async () => {
    stubFetch({});
    expect(await fetchArticle("bread", "en", "fr")).toEqual({ article: null, pictures: [] });
  });

  it("rejects when the summary fails", async () => {
    stubFetch({ [`${SUMMARY}bread`]: 502 });
    await expect(fetchArticle("bread", "en", "fr")).rejects.toThrow();
  });

  it("rejects when Wikipedia can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchArticle("bread", "en", "fr")).rejects.toThrow("Failed to fetch");
  });

  it("falls back to the word's language when the language links fail", async () => {
    stubFetch({ [`${SUMMARY}bread`]: summaryBread, [LANGLINKS]: 502, [MEDIA]: mediaBread });
    const { article } = await fetchArticle("bread", "en", "ar");
    expect(article?.lang).toBe("en");
  });

  it("encodes the word", async () => {
    const fn = stubFetch({});
    await fetchArticle("ice cream", "en", "fr");
    expect(urls(fn)).toEqual([`${SUMMARY}ice%20cream`]);
  });

  it("uses the article in the learner's language when there is one", async () => {
    const arabic = { ...summaryBread, title: "خبز", titles: { normalized: "خبز" }, lang: "ar", extract: "الخبز طعام.", content_urls: { desktop: { page: "https://ar.wikipedia.org/wiki/%D8%AE%D8%A8%D8%B2" } } };
    const fn = stubFetch({ [`${SUMMARY}bread`]: summaryBread, [LANGLINKS]: langlinksBread, [AR_SUMMARY]: arabic, [MEDIA]: mediaBread });
    const { article, pictures } = await fetchArticle("bread", "en", "ar");
    expect(urls(fn)).toEqual(expect.arrayContaining([`${SUMMARY}bread`, LANGLINKS, AR_SUMMARY, MEDIA]));
    expect(article?.lang).toBe("ar");
    expect(article?.title).toBe("خبز");
    expect(pictures.length).toBeGreaterThan(0);
  });

  it("falls back to the article in the word's language", async () => {
    stubFetch({ [`${SUMMARY}bread`]: summaryBread, [LANGLINKS]: langlinksBread, [AR_SUMMARY]: 502, [MEDIA]: mediaBread });
    const { article, pictures } = await fetchArticle("bread", "en", "ar");
    expect(article?.lang).toBe("en");
    expect(article?.title).toBe("Bread");
    expect(pictures).toEqual(parseMediaList(mediaBread));
  });

  it("refuses a language code that is not one, without fetching", async () => {
    const fn = stubFetch({});
    for (const lang of ["evil.example/x?", "EN", "e", "en.evil", "en/x", "__proto__", ""]) {
      expect(await fetchArticle("bread", lang, "fr")).toEqual({ article: null, pictures: [] });
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it("never builds a host from a bad learner's language", async () => {
    const fn = stubFetch({ [`${SUMMARY}bread`]: summaryBread, [MEDIA]: mediaBread });
    const { article } = await fetchArticle("bread", "en", "evil.example/x?");
    expect(article?.lang).toBe("en");
    expect(urls(fn).every((u) => u.startsWith("https://en.wikipedia.org/"))).toBe(true);
    expect(urls(fn)).toEqual([`${SUMMARY}bread`, MEDIA]);
  });

  it("accepts a code with a region or variant part", async () => {
    const fn = stubFetch({});
    await fetchArticle("bread", "zh-yue", "fr");
    expect(urls(fn)).toEqual(["https://zh-yue.wikipedia.org/api/rest_v1/page/summary/bread"]);
  });

  it("keeps Wikipedia answers for one day only", async () => {
    stubCaches();
    const routes = { [`${SUMMARY}bread`]: summaryBread, [LANGLINKS]: langlinksBread, [AR_SUMMARY]: summaryBread, [MEDIA]: mediaBread };
    stubFetch(routes);
    await fetchArticle("bread", "en", "ar");
    const later = Date.now() + 2 * DAY;
    vi.spyOn(Date, "now").mockReturnValue(later);
    try {
      const fn = stubFetch(routes);
      await fetchArticle("bread", "en", "ar");
      expect(urls(fn).sort()).toEqual([`${SUMMARY}bread`, LANGLINKS, AR_SUMMARY, MEDIA].sort());
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("keeps the article when its pictures fail", async () => {
    stubFetch({ [`${SUMMARY}bread`]: summaryBread, [MEDIA]: 500 });
    const { article, pictures } = await fetchArticle("bread", "en", "en");
    expect(article?.title).toBe("Bread");
    expect(pictures).toEqual([]);
  });
});
