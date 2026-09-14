import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./release.module.css";

const COVER = "/anvil/crownrot/cover.png";
const AUDIO = "/anvil/crownrot/arachnid.mp3";
const SPOTIFY = "https://open.spotify.com/track/7nb7DGaqzCvPCUYfmsNyup";

export const metadata: Metadata = {
  title: "ARACHNID — CROWNROT | NULLWORKS ANVIL",
  description:
    "ARACHNID is an athlete-soundtrack proof of concept from NULLWORKS ANVIL, built around the competitive identity of Cooper Webb.",
  alternates: { canonical: "/anvil/crownrot/arachnid" },
  openGraph: {
    title: "ARACHNID — A Soundtrack for Cooper Webb",
    description:
      "ARACHNID is an athlete-soundtrack proof of concept from NULLWORKS ANVIL, built around the competitive identity of Cooper Webb.",
    url: "https://nullworks.systems/anvil/crownrot/arachnid",
    siteName: "NULLWORKS // ANVIL",
    type: "music.song",
    images: [{ url: COVER, width: 1400, height: 1400, alt: "ARACHNID — CROWNROT cover art" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARACHNID — A Soundtrack for Cooper Webb",
    description: "An athlete-soundtrack proof of concept from NULLWORKS ANVIL.",
    images: [COVER],
  },
};

const uses = [
  "Athlete social media",
  "Race edits",
  "Opening ceremonies / walkouts",
  "Team content",
  "Sponsor campaigns",
  "Documentary / profile video",
  "Series promotional material",
  "Event content",
  "Brand launches",
  "Licensed partner content",
];

const traits = [
  "Patience.",
  "Pressure.",
  "Repetition.",
  "Control.",
  "Finding different lines.",
  "Staying present when conditions get ugly.",
  "Striking when the opportunity finally appears.",
];

export default function ArachnidReleasePage() {
  return (
    <main className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/anvil">
          NULLWORKS <span>{"// ANVIL"}</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/anvil/artists">ARTISTS</Link>
          <span className={styles.releaseTag}>ATHLETE SOUNDTRACK / 001</span>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.artWrap}>
          <Image
            className={styles.art}
            src={COVER}
            alt="ARACHNID cover art: CROWNROT / Cooper Webb #2 under a giant spider, presented by NULLWORKS"
            width={1400}
            height={1400}
            priority
            sizes="(max-width: 820px) 92vw, 48vw"
          />
          <span className={styles.stamp}>NULLWORKS PRESENTS / 04:13</span>
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>NULLWORKS PRESENTS // CROWNROT</p>
          <h1>ARACH<wbr />NID</h1>
          <p className={styles.lede}>A soundtrack for Cooper Webb.</p>
          <p className={styles.thesis}>
            Most elements surrounding a professional athlete are custom: gear, helmet graphics, bike graphics,
            photography, video, sponsor creative. Music usually isn&apos;t.
          </p>
          <p className={styles.thesisStrong}>
            ARACHNID is an experiment in doing the opposite: build the music from the athlete.
          </p>

          <div className={styles.player}>
            <div className={styles.now}>
              <span className={styles.pulse} />
              <span>NOW PLAYING</span>
              <b>ARACHNID — CROWNROT</b>
            </div>
            <audio controls preload="metadata" aria-label="Play ARACHNID by CROWNROT">
              <source src={AUDIO} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <div className={styles.playerLinks}>
              <a href={AUDIO} download="ARACHNID-CROWNROT.mp3">
                DOWNLOAD MP3
              </a>
              <a href={SPOTIFY} target="_blank" rel="noreferrer">
                OPEN ON SPOTIFY ↗
              </a>
            </div>
            <p>Direct playback on this page. Spotify is optional.</p>
          </div>
          <a className={styles.jump} href="#thesis">
            WHY THE MUSIC SHOULD BE CUSTOM TOO ↓
          </a>
        </div>
      </section>

      <section className={styles.quote}>
        <p>
          Instead of finding music to fit the athlete,
          <br />
          build music FROM the athlete.
        </p>
      </section>

      <section className={styles.story} id="thesis">
        <div className={styles.sectionLabel}>THE CONTRACT</div>
        <div className={styles.storyGrid}>
          <h2>Built from competitive characteristics, not generic motocross imagery.</h2>
          <div>
            <p>
              ARACHNID was written around the traits associated with Cooper Webb rather than around stock race-day
              adjectives.
            </p>
            <ul className={styles.traits}>
              {traits.map((trait) => (
                <li key={trait}>{trait}</li>
              ))}
            </ul>
            <p>
              Those characteristics shaped the pacing, structure, aggression, lyrical imagery, and overall identity of
              the track.
            </p>
            <p>
              The goal is not simply to make a song “about” an athlete. The goal is to create original musical IP that
              becomes part of the athlete&apos;s own narrative and brand architecture.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.anvil}>
        <div className={styles.sectionLabel}>COMMERCIAL USE</div>
        <h2>If the helmet, bike, gear, graphics, video, and sponsor creative are all custom, why should the soundtrack still be borrowed?</h2>
        <p>
          An athlete-specific soundtrack can travel with the rest of the custom stack instead of being licensed in as an
          afterthought.
        </p>
        <div className={styles.cards}>
          {uses.map((item, i) => (
            <article key={item}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.disclaimer}>
        <div className={styles.sectionLabel}>POSITIONING</div>
        <p>
          Independent proof of concept. NULLWORKS presents CROWNROT — ARACHNID. This page does not imply endorsement,
          sponsorship, authorization, or official affiliation with Cooper Webb, Yamaha, Monster Energy, SuperMotocross,
          or any racing team or sponsor.
        </p>
        <Link className={styles.cta} href="/anvil/artists">
          BACK TO ANVIL ARTISTS →
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>CROWNROT // ARACHNID</span>
        <span>NULLWORKS // ANVIL // SOUNDTRACKS FOR EXTRAORDINARY HUMANS</span>
      </footer>
    </main>
  );
}
