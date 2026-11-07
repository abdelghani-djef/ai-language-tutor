import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPackScenes, loadPlaces, SCENES_VERSION, validatePackScenes, wordScenes, type PackScenes, type Place, type Scene } from "../word/scenes";
import { STARTER_WORDS } from "../../data/starter-words";
import type { Picture } from "../word/sources";
import { failLoading, planSources, sectionOf, type WordData } from "../word/useWordData";

const tri = (en: string, fr = `${en} (fr)`, ar = `${en} (ar)`) => ({ en, fr, ar });

const PLACES: Record<string, Place> = {
  park: { emoji: "🌳", label: tri("At the park") },
  bakery: { emoji: "🥖", label: tri("At the bakery") },
  classroom: { emoji: "🏫", label: tri("In the classroom") },
  kitchen: { emoji: "🍳", label: tri("In the kitchen") },
};

const scene = (place: string, text = "Hello, Sam!"): Scene => ({
  place,
  lines: [
    { who: tri("Lina"), text: tri(text) },
    { who: tri("Sam"), text: tri("Hi, Lina!") },
  ],
});

/** A valid pack with one word, "hello", in four places. */
function pack(over: Partial<Scene>[] = []): PackScenes {
  const scenes = ["park", "bakery", "classroom", "kitchen"].map((p, i) => ({ ...scene(p), ...over[i] }));
  return { pack: "greetings", words: { hello: { scenes, pictures: [] } } };
}

describe("validatePackScenes", () => {
  it("accepts a valid pack", () => {
    expect(validatePackScenes(pack(), PLACES, STARTER_WORDS)).toEqual([]);
  });

  it("finds the word in any of its forms and ignores case", () => {
    const json: PackScenes = {
      pack: "verbs-daily",
      words: { "wake up": { scenes: ["park", "bakery", "classroom", "kitchen"].map((p) => scene(p, "I woke up at seven.")), pictures: [] } },
    };
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual([]);
  });

  it("matches words with a question mark or a curly apostrophe", () => {
    const json: PackScenes = {
      pack: "greetings",
      words: {
        "how are you?": { scenes: ["park", "bakery", "classroom", "kitchen"].map((p) => scene(p, "How are you today?")), pictures: [] },
        "you’re welcome": { scenes: ["park", "bakery", "classroom", "kitchen"].map((p) => scene(p, "You're welcome!")), pictures: [] },
      },
    };
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual([]);
  });

  it("reports a scene that does not use the word", () => {
    expect(validatePackScenes(pack([{}, scene("bakery", "Good morning!")]), PLACES, STARTER_WORDS)).toEqual([
      "hello: scene 2 does not use the word",
    ]);
  });

  it("reports an unknown place", () => {
    expect(validatePackScenes(pack([{ place: "moon" }]), PLACES, STARTER_WORDS)).toEqual(['hello: scene 1 has an unknown place "moon"']);
  });

  it("reports the same place twice in one word", () => {
    expect(validatePackScenes(pack([{}, { place: "park" }]), PLACES, STARTER_WORDS)).toEqual(['hello: place "park" is used twice']);
  });

  it("reports a word with 3 scenes", () => {
    const json = pack();
    json.words.hello.scenes.pop();
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual(["hello: has 3 scenes, needs 4"]);
  });

  it("reports scenes with too few or too many lines", () => {
    const one = { lines: scene("bakery").lines.slice(0, 1) };
    const five = { lines: [...scene("park").lines, ...scene("park").lines, scene("park").lines[0]] };
    expect(validatePackScenes(pack([five, one]), PLACES, STARTER_WORDS)).toEqual([
      "hello: scene 1 has 5 lines, needs 2 to 4",
      "hello: scene 2 has 1 line, needs 2 to 4",
    ]);
  });

  it("reports an empty translation", () => {
    const json = pack();
    json.words.hello.scenes[0].lines[1].text.ar = " ";
    json.words.hello.scenes[2].lines[0].who.fr = "";
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual([
      "hello: scene 1 line 2 has no text.ar",
      "hello: scene 3 line 1 has no who.fr",
    ]);
  });

  it("reports pictures without a thumbnail or a page", () => {
    const json = pack();
    json.words.hello.pictures = [{ thumb: "https://upload.wikimedia.org/a.jpg", page: "" }];
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual(["hello: picture 1 needs thumb and page"]);
  });

  it("reports a word that is not in the list, and an unknown list", () => {
    const json = pack();
    json.words.hullo = json.words.hello;
    expect(validatePackScenes(json, PLACES, STARTER_WORDS)).toEqual(["hullo: not a word of the greetings list"]);
    expect(validatePackScenes({ ...pack(), pack: "nope" }, PLACES, STARTER_WORDS)).toEqual(['"nope" is not a ready-made list']);
    expect(validatePackScenes(null, PLACES, STARTER_WORDS)).toEqual(["not a scenes file"]);
  });

  it("requires every word of the list only when the file says it is complete", () => {
    expect(validatePackScenes(pack(), PLACES, STARTER_WORDS)).toEqual([]);
    const problems = validatePackScenes({ ...pack(), complete: true }, PLACES, STARTER_WORDS);
    expect(problems).toContain("thank you: missing");
    expect(problems).toContain("good luck: missing");
    expect(problems).not.toContain("hello: missing");
  });
});

describe("wordScenes", () => {
  it("finds the list's word from the page's cleaned word", () => {
    const json = pack();
    json.words["how are you?"] = json.words.hello;
    json.words.Mr = json.words.hello;
    expect(wordScenes(json, "hello")).toBe(json.words.hello);
    expect(wordScenes(json, "how are you")).toBe(json.words["how are you?"]);
    expect(wordScenes(json, "mr")).toBe(json.words.Mr);
    expect(wordScenes(json, "bread")).toBeUndefined();
  });
});

describe("loaders", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(routes: Record<string, unknown>) {
    const fn = vi.fn(async (input: RequestInfo | URL) => {
      // The site serves a file whatever its query; the version only keeps caches apart.
      const body = routes[String(input).split("?")[0]];
      if (body === undefined) return new Response("not found", { status: 404 });
      if (typeof body === "number") return new Response("error", { status: body });
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("loads a list's scenes from the site itself", async () => {
    const fn = stubFetch({ "/scenes/greetings.json": pack() });
    expect(await loadPackScenes("greetings")).toEqual(pack());
    expect(fn.mock.calls.map((c) => String(c[0]))).toEqual([`/scenes/greetings.json?v=${SCENES_VERSION}`]);
  });

  it("asks for new scene files when the ready-made words change", () => {
    // Counted from the index, it is still the number of real rows.
    expect(SCENES_VERSION).toBe(Object.values(STARTER_WORDS).reduce((n, rows) => n + rows.length, 0));
    expect(SCENES_VERSION).toBeGreaterThan(0);
  });

  it("is null when the list has no scenes file or the file is not one", async () => {
    stubFetch({ "/scenes/food.json": { hello: 1 } });
    expect(await loadPackScenes("people")).toBeNull();
    expect(await loadPackScenes("food")).toBeNull();
  });

  it("rejects when the list's scenes file can't be loaded", async () => {
    stubFetch({ "/scenes/greetings.json": 500 });
    await expect(loadPackScenes("greetings")).rejects.toThrow();
  });

  it("loads the places, or none when there is no places file", async () => {
    stubFetch({ "/scenes/_places.json": PLACES });
    expect(await loadPlaces()).toEqual(PLACES);
    stubFetch({});
    expect(await loadPlaces()).toEqual({});
  });

  it("rejects when the places file can't be loaded", async () => {
    stubFetch({ "/scenes/_places.json": 503 });
    await expect(loadPlaces()).rejects.toThrow();
  });
});

describe("planSources", () => {
  it("ready-made word: scenes and the list's pictures, no Tatoeba sentences", () => {
    expect(planSources({ word: "hello", lang: "en", to: "fr", pack: "greetings" }, true)).toEqual({
      scenes: true,
      sentences: false,
      dictionary: true,
      partners: true,
      article: true,
      pictures: "pack",
    });
  });

  it("ready-made word whose scenes are not written yet: falls back to sentences and article pictures", () => {
    expect(planSources({ word: "bread", lang: "en", to: "ar", pack: "food" }, false)).toEqual({
      scenes: false,
      sentences: true,
      dictionary: true,
      partners: true,
      article: true,
      pictures: "article",
    });
  });

  it("own English word: sentences and pictures from the matching article", () => {
    expect(planSources({ word: "crumbs", lang: "en", to: "fr", cardId: "c1" }, false)).toEqual({
      scenes: false,
      sentences: true,
      dictionary: true,
      partners: true,
      article: true,
      pictures: "article",
    });
  });

  it("non-English word: no word partners, dictionary still on (Wiktionary)", () => {
    expect(planSources({ word: "pain", lang: "fr", to: "en", cardId: "c2" }, false)).toEqual({
      scenes: false,
      sentences: true,
      dictionary: true,
      partners: false,
      article: true,
      pictures: "article",
    });
  });

  it("word with no card and no list (a word partner like 'crumbs')", () => {
    expect(planSources({ word: "crumbs", lang: "en", to: "fr" }, false)).toEqual({
      scenes: false,
      sentences: true,
      dictionary: true,
      partners: true,
      article: true,
      pictures: "article",
    });
  });

  it("never plans scenes for a word outside the ready-made lists", () => {
    expect(planSources({ word: "crumbs", lang: "en", to: "fr" }, true)).toMatchObject({ scenes: false, sentences: true, pictures: "article" });
  });
});

describe("useWordData sections", () => {
  it("an answer, even an empty one, is ready; a failure is failed", async () => {
    expect(await sectionOf(Promise.resolve(["fresh bread"]))).toEqual({ status: "ready", data: ["fresh bread"] });
    expect(await sectionOf(Promise.resolve(null))).toEqual({ status: "ready", data: null });
    expect(await sectionOf(Promise.resolve([]))).toEqual({ status: "ready", data: [] });
    expect(await sectionOf(Promise.reject(new Error("HTTP 502")))).toEqual({ status: "failed" });
  });

  it("failLoading marks only the named sections that are still loading as failed", () => {
    const data: WordData = {
      scenes: { status: "ready", data: { scenes: [], places: {} } },
      sentences: { status: "loading" },
      dictionary: { status: "loading" },
      partners: { status: "ready", data: [] },
      article: { status: "failed" },
      pictures: { status: "loading" },
    };
    expect(failLoading(data, ["scenes", "pictures"])).toEqual({ pictures: { status: "failed" } });
    expect(failLoading(data, ["scenes", "sentences", "article"])).toEqual({ sentences: { status: "failed" } });
    expect(failLoading(data, [])).toEqual({});
  });
});

describe("shipped scenes files", () => {
  const dir = join(process.cwd(), "public", "scenes");
  const read = (file: string): unknown => JSON.parse(readFileSync(join(dir, file), "utf8"));
  const places = read("_places.json") as Record<string, Place>;
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_places.json");

  // Words added after part 2 (and the advanced lists) have no prepared scenes: the word page
  // loads sentences and pictures live for them. Every word that had scenes keeps them.
  it("keeps the scenes of every word that had them", () => {
    const heads: Record<string, [string, ...string[]][]> = JSON.parse(
      readFileSync(join(process.cwd(), "src", "lib", "__tests__", "fixtures", "pack-heads.json"), "utf8"),
    );
    for (const [id, rows] of Object.entries(heads)) {
      expect(files).toContain(`${id}.json`);
      const words = (read(`${id}.json`) as PackScenes).words;
      const missing = rows.map((row) => row[0]).filter((word) => !Object.hasOwn(words, word));
      expect(missing, id).toEqual([]);
    }
    const greetings = STARTER_WORDS.greetings;
    expect(greetings).toHaveLength(100);
    expect((read("greetings.json") as PackScenes).complete).toBe(true);
    const greetingWords = (read("greetings.json") as PackScenes).words;
    expect(greetings.map((row) => row[0]).filter((word) => !Object.hasOwn(greetingWords, word))).toEqual([]);
  });

  it.each(files)("%s passes the content checks", (file) => {
    const json = read(file) as PackScenes;
    expect(`${json.pack}.json`).toBe(file);
    expect(validatePackScenes(json, places, STARTER_WORDS)).toEqual([]);
  });

  /** Every picture shipped, word pictures and place pictures, with where it is. */
  const pictures: { at: string; picture: Picture }[] = [
    ...Object.entries(places).flatMap(([key, place]) => (place.picture ? [{ at: `_places.json:${key}`, picture: place.picture }] : [])),
    ...files.flatMap((file) =>
      Object.entries((read(file) as PackScenes).words).flatMap(([word, entry]) =>
        // A word without a pictures list is reported by the content checks above, not here.
        (Array.isArray(entry.pictures) ? entry.pictures : []).map((picture, i) => ({ at: `${file}:${word}:${i + 1}`, picture })),
      ),
    ),
  ];

  it("pictures are clean Wikimedia links", () => {
    const bad = pictures
      .filter(({ picture: { thumb, page } }) =>
        !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(thumb) ||
        !/^https:\/\/commons\.wikimedia\.org\//.test(page) ||
        thumb.includes("utm_") ||
        page.includes("utm_"),
      )
      .map(({ at }) => at);
    expect(bad).toEqual([]);
  });

  it("licences are free", () => {
    const free = ["CC0", "PD", "PUBLIC DOMAIN", "CC BY"];
    // CC BY and CC BY-SA only: the non-commercial and no-derivatives variants are not free.
    const isFree = (licence: string) =>
      free.some((start) => licence.startsWith(start)) && !/\b(NC|ND)\b/.test(licence);
    const bad = pictures
      .filter(({ picture }) => !isFree((picture.licence ?? "").toUpperCase()))
      .map(({ at, picture }) => `${at} ${JSON.stringify(picture.licence)}`);
    expect(bad).toEqual([]);
  });

  it.each([...files, "_places.json"])("scene files stay light: %s", (file) => {
    expect(gzipSync(readFileSync(join(dir, file))).length).toBeLessThanOrEqual(100 * 1024);
  });
});
