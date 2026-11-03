"use client";

import Link from "next/link";
import { ForgettingCurve } from "@/components/forgetting-curve";
import { buttonVariants } from "@/components/ui/button";
import { useT, type Translate } from "@/lib/i18n";
import { home } from "@/messages/home";

// The method and its evidence, from docs/research/learning-english.md.
const STUDY_URL = "https://github.com/abdelghani-djef/ai-language-tutor/blob/main/docs/research/learning-english.md";
const SOURCE_COUNT = 74;

type HomeKey = Parameters<Translate<keyof (typeof home)["en"]>>[0];
interface Source {
  label: string;
  url: string;
}

const src = (label: string, doi: string): Source => ({ label, url: `https://doi.org/${doi}` });

// `ready` marks principles the app already follows; the rest are planned.
const PRINCIPLES: { key: "p1" | "p2" | "p3" | "p4" | "p5" | "p6" | "p7"; ready: boolean; sources: Source[] }[] = [
  {
    key: "p1",
    ready: true,
    sources: [src("Rowland 2014", "10.1037/a0037559"), src("Yang et al. 2021", "10.1037/bul0000309")],
  },
  {
    key: "p2",
    ready: true,
    sources: [
      src("Kim & Webb 2022", "10.1111/lang.12479"),
      src("Cepeda et al. 2006", "10.1037/0033-2909.132.3.354"),
      src("Lindsey et al. 2014", "10.1177/0956797613504302"),
    ],
  },
  {
    key: "p3",
    ready: false,
    sources: [
      src("Jeon & Day 2016", "10.64152/10125/66901"),
      src("Webb et al. 2023", "10.1017/S0261444822000507"),
      src("Kurokawa et al. 2025", "10.1111/lang.12697"),
    ],
  },
  {
    key: "p4",
    ready: true,
    sources: [
      src("Nation 2006", "10.3138/cmlr.63.1.59"),
      src("Webb et al. 2020", "10.1111/modl.12671"),
      src("Zhang et al. 2025", "10.1016/j.edurev.2025.100681"),
    ],
  },
  {
    key: "p5",
    ready: false,
    sources: [
      src("Lyster & Saito 2010", "10.1017/S0272263109990520"),
      src("Li 2010", "10.1111/j.1467-9922.2010.00561.x"),
      src("Ziegler 2016", "10.1017/S027226311500025X"),
    ],
  },
  {
    key: "p6",
    ready: false,
    sources: [
      src("Thomson 2018", "10.1075/jslp.17038.tho"),
      src("Zhang et al. 2021", "10.1044/2021_JSLHR-21-00181"),
      src("Munro & Derwing 1995", "10.1111/j.1467-1770.1995.tb00963.x"),
    ],
  },
  {
    key: "p7",
    ready: true,
    sources: [
      src("Lally et al. 2010", "10.1002/ejsp.674"),
      src("Gollwitzer & Sheeran 2006", "10.1016/S0065-2601(06)38002-1"),
      src("Teimouri et al. 2019", "10.1017/S0272263118000311"),
    ],
  },
];

const MYTHS: { key: "myth1" | "myth2" | "myth3" | "myth4" | "myth5"; source: Source }[] = [
  { key: "myth1", source: src("Pashler et al. 2008", "10.1111/j.1539-6053.2009.01038.x") },
  { key: "myth2", source: src("van der Slik et al. 2022", "10.1111/lang.12470") },
  { key: "myth3", source: src("Norris & Ortega 2000", "10.1111/0023-8333.00136") },
  { key: "myth4", source: src("Sailer & Homner 2020", "10.1007/s10648-019-09498-w") },
  { key: "myth5", source: src("Munro & Derwing 1995", "10.1111/j.1467-1770.1995.tb00963.x") },
];

const CHART_SOURCES = [src("Cepeda et al. 2006", "10.1037/0033-2909.132.3.354"), src("Kim & Webb 2022", "10.1111/lang.12479")];
const KIDS_SOURCE = src("Fitton et al. 2018", "10.3102/0034654318790909");

export default function HomePage() {
  const t = useT(home);

  return (
    <div className="grid gap-20 pb-8 sm:gap-24">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1fr_1.1fr] md:gap-12">
        <div className="grid gap-6">
          <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-[46ch] text-lg text-muted-foreground">{t("intro", { count: SOURCE_COUNT })}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/words" className={buttonVariants({ size: "lg" })}>
              {t("start")}
            </Link>
            <a href={STUDY_URL} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("readStudy")}
            </a>
          </div>
        </div>
        <div className="grid gap-3 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <ForgettingCurve
            labels={{
              title: t("chartTitle"),
              withReview: t("withReview"),
              withoutReview: t("withoutReview"),
              review: t("review"),
              ticks: [t("tickToday"), t("tickWeek"), t("tickTwoWeeks"), t("tickMonth")],
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t.rich("chartNote", { sources: <SourceLinks sources={CHART_SOURCES} /> })}
          </p>
        </div>
      </section>

      <section aria-labelledby="method-title" className="grid gap-8">
        <div className="grid max-w-2xl gap-2">
          <h2 id="method-title" className="font-display text-3xl font-semibold tracking-tight">
            {t("methodTitle")}
          </h2>
          <p className="text-muted-foreground">{t("methodIntro")}</p>
        </div>
        <ul className="grid gap-x-12 md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p.key} className="grid content-start gap-2 border-t py-6">
              <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl font-semibold">
                {t(`${p.key}Name` as HomeKey)}
                {!p.ready && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                    {t("inDevelopment")}
                  </span>
                )}
              </h3>
              <p className="text-lg leading-relaxed">{t(`${p.key}Text` as HomeKey)}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`${p.key}Evidence` as HomeKey)}</p>
              <p className="text-sm text-muted-foreground">
                <span className="sr-only">{t("sources")}: </span>
                <SourceLinks sources={p.sources} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="myths-title" className="grid gap-6 rounded-3xl bg-muted/50 p-6 sm:p-10">
        <div className="grid gap-2">
          <h2 id="myths-title" className="font-display text-3xl font-semibold tracking-tight">
            {t("mythsTitle")}
          </h2>
          <p className="text-muted-foreground">{t("mythsIntro")}</p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MYTHS.map((m) => (
            <li key={m.key} className="grid content-start gap-1.5">
              <p className="font-display text-xl font-semibold text-muted-foreground line-through decoration-primary/60 decoration-2">
                {t(`${m.key}Name` as HomeKey)}
              </p>
              <p>{t(`${m.key}Text` as HomeKey)}</p>
              <p className="text-sm text-muted-foreground">
                <SourceLinks sources={[m.source]} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h2 className="font-display text-2xl font-semibold">{t("kidsTitle")}</h2>
          <p className="leading-relaxed">{t("kidsText")}</p>
          <p className="text-sm text-muted-foreground">
            <SourceLinks sources={[KIDS_SOURCE]} />
          </p>
        </div>
        <div className="grid content-start gap-2">
          <h2 className="font-display text-2xl font-semibold">{t("limitsTitle")}</h2>
          <p className="leading-relaxed text-muted-foreground">{t("limitsText")}</p>
        </div>
      </section>

      <section className="grid justify-items-start gap-4 border-t pt-12">
        <h2 className="font-display text-3xl font-semibold tracking-tight">{t("finalTitle")}</h2>
        <p className="max-w-[52ch] text-lg text-muted-foreground">{t("finalText")}</p>
        <Link href="/words" className={buttonVariants({ size: "lg" })}>
          {t("start")}
        </Link>
      </section>
    </div>
  );
}

/** Author-year links to the papers. Kept left to right, as the citations are in Latin script. */
function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1" dir="ltr">
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-current"
        >
          {s.label}
        </a>
      ))}
    </span>
  );
}
