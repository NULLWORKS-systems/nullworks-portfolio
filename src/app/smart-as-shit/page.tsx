import type { Metadata } from "next";
import styles from "./smart.module.css";

const PAGE_URL = "https://nullworks.systems/smart-as-shit";
const POSTER_URL = "https://nullworks.systems/smart-as-shit/poster.png";
const PAPER_URL = "https://nullworks.systems/smart-as-shit/paper.pdf";

export const metadata: Metadata = {
  title: "Smart as Shit: Finding Data in Unexpected Places | Mason Perry · NULLWORKS",
  description:
    "Working paper. Wastewater can estimate transient population only after hydrologic infiltration and inflow are separated from human sanitary load. In spring the sewer was not counting tourists. It was counting the thaw.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    url: PAGE_URL,
    title: "Smart as Shit: Finding Data in Unexpected Places",
    description:
      "What wastewater, broken traffic counters, and systems thinking can teach us about measuring the real world.",
    images: [{ url: POSTER_URL, width: 1080, height: 1620, alt: "Smart as Shit research poster" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart as Shit: Finding Data in Unexpected Places",
    description:
      "In spring the sewer was not counting tourists. It was counting the thaw. In July it was counting people.",
    images: [POSTER_URL],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Smart as Shit: Finding Data in Unexpected Places",
  alternativeHeadline:
    "What wastewater, broken traffic counters, and systems thinking can teach us about measuring the real world",
  datePublished: "2026-09-01",
  author: {
    "@type": "Person",
    name: "Mason Perry",
    url: "https://nullworks.systems/mason",
  },
  publisher: {
    "@type": "Organization",
    name: "NULLWORKS LLC",
    url: "https://nullworks.systems",
  },
  url: PAGE_URL,
  image: POSTER_URL,
  encoding: {
    "@type": "MediaObject",
    contentUrl: PAPER_URL,
    encodingFormat: "application/pdf",
  },
};

export default function SmartAsShitPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <a className={styles.brand} href="/">
            NULLWORKS<span>WORKING PAPER</span>
          </a>
          <div className={styles.links}>
            <a href="/mason">Mason Perry</a>
            <a href="/research">Research</a>
            <a href="/company">Company</a>
          </div>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Working paper · September 2026 · Big Bear, California</p>
          <h1>Smart as Shit</h1>
          <p className={styles.sub}>Finding Data in Unexpected Places</p>
          <p className={styles.deck}>
            What wastewater, broken traffic counters, and systems thinking can teach us about measuring the real world.
          </p>
          <p className={styles.byline}>Mason Perry · NULLWORKS</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={PAPER_URL}>
              Read the paper
            </a>
            <a className={styles.secondary} href="#poster">
              See the poster
            </a>
          </div>
        </header>

        <blockquote className={styles.quote}>
          In spring the sewer was not counting tourists. It was counting the thaw. In July it was counting people.
        </blockquote>

        <section id="poster" className={styles.posterBlock}>
          <img
            className={styles.poster}
            src="/smart-as-shit/poster.png"
            alt="Smart as Shit research poster summarizing July control, March weather correlation, member-share stability, and the thaw-versus-people finding"
          />
          <p className={styles.caption}>
            Research poster. Same argument as the paper, compressed for a cold LinkedIn read.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.label}>The control</div>
            <h2>July stays almost flat</h2>
            <p>
              Peak-tourism July influent stayed inside 1.73–1.96 MGD across nine summers (mean 1.851 MGD, CV 4.7%). If
              spring spikes were mostly people, July should move. It does not.
            </p>
          </article>
          <article className={styles.card}>
            <div className={styles.label}>The weather year</div>
            <h2>March tracks winter water</h2>
            <p>
              March influent ranged from 1.87 MGD in dry 2018 to 5.13 MGD in 2023. October–March precipitation versus
              March flow: Pearson r = 0.94 (n = 9). The relationship survives removing 2019 or 2023.
            </p>
          </article>
          <article className={styles.card}>
            <div className={styles.label}>The system check</div>
            <h2>The spike is network-wide</h2>
            <p>
              Member shares stayed broadly stable in the monster years: about 53–62% Big Bear Lake, 35–44% CSD, 3–5%
              Fawnskin. That is a hydraulic story, not a single tourism corridor.
            </p>
          </article>
          <article className={styles.card}>
            <div className={styles.label}>The rule</div>
            <h2>A proxy has operating conditions</h2>
            <p>
              Wastewater can estimate transient population only after hydrologic infiltration and inflow are separated
              from sanitary load. The sensor is not broken. The measurement model is incomplete.
            </p>
          </article>
        </section>

        <section className={styles.abstract}>
          <h2>Abstract</h2>
          <p>
            Tourism-dependent communities often need population estimates at timescales that census counts cannot
            provide. This case study reconstructs an applied measurement approach developed in Big Bear, California,
            where conventional visitor-counting methods were unreliable. Wastewater influent was treated as an
            unavoidable physical trace of human presence, then tested against weather to determine when flow represented
            people and when it represented hydrology.
          </p>
          <p>
            Monthly Big Bear Area Regional Wastewater Agency influent from January 2018 through August 2026 was merged
            with NOAA GHCN-Daily observations for Big Bear Lake. July remained a comparatively stable sanitary/tourism
            control. March did not. The central result is methodological: wastewater can function as a population proxy
            only when the mechanisms that also move wastewater are explicitly modeled.
          </p>
        </section>

        <section className={styles.note}>
          <p>
            This is a working paper, not a peer-reviewed journal article. The shoulder-season tourism-marketing question
            is left open on purpose: the data support a hypothesis, not a causal claim. Full methods, robustness checks,
            limitations, and references are in the PDF.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href={PAPER_URL}>
              Download PDF
            </a>
            <a className={styles.secondary} href="/mason">
              Mason Perry
            </a>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>NULLWORKS · nullworks.systems/smart-as-shit</span>
          <span>Working paper · September 2026</span>
        </footer>
      </div>
    </main>
  );
}
