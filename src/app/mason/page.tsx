import type { Metadata } from "next";
import { MASON_PORTRAIT } from "./portrait";
import styles from "./mason.module.css";

export const metadata: Metadata = {
  title: "Mason Perry — Founder",
  description:
    "Mason Perry is the founder of NULLWORKS LLC and an Operational Intelligence Systems Architect building governed operating structures around human + AI work.",
  alternates: { canonical: "/mason" },
  openGraph: {
    title: "Mason Perry — Founder, NULLWORKS",
    description:
      "Identity. Authority. Policy. Execution. Telemetry. Verification. Receipts. Human authority remains final.",
    type: "profile",
    url: "https://nullworks.systems/mason",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Mason Perry",
  url: "https://nullworks.systems/mason",
  jobTitle: "Founder / Operational Intelligence Systems Architect",
  worksFor: {
    "@type": "Organization",
    name: "NULLWORKS",
    legalName: "NULLWORKS LLC",
    url: "https://nullworks.systems",
    foundingDate: "2026-08-28",
    identifier: "Arizona Business ID 25114608",
  },
  knowsAbout: [
    "Operational Intelligence systems architecture",
    "AI governance",
    "Human authority",
    "AI orchestration",
    "Operational telemetry",
    "Evidence and provenance",
    "Model-agnostic continuity",
    "Lunar robotics",
  ],
};

export default function MasonProfilePage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.wrap}>
        <header className={styles.bar}>
          <a className={styles.brand} href="/">
            NULLWORKS // HUMAN PROFILE
          </a>
          <nav className={styles.nav}>
            <a href="#about">About</a>
            <a href="#work">Work</a>
            <a href="#systems">Systems</a>
            <a href="#evidence">Evidence</a>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.cover}>
            <div className={styles.covercopy}>
              <div className={styles.eyebrow}>Human authority // systems architecture</div>
              <h1>Build the operating structure around the intelligence.</h1>
              <p>
                Identity, authority, policy, bounded execution, telemetry, verification, and receipts — with the human
                remaining responsible for consequential decisions.
              </p>
            </div>
          </div>
          <div className={styles.profile}>
            <div className={styles.identity}>
              <div className={styles.avatar}>
                <img src={MASON_PORTRAIT} alt="Mason Perry, founder of NULLWORKS" />
              </div>
              <div className={styles.copy}>
                <h1 className={styles.name}>Mason Perry</h1>
                <div className={styles.headline}>Founder, NULLWORKS · Operational Intelligence Systems Architect</div>
                <div className={styles.sub}>Human-centered operational architecture for AI workers and consequential systems</div>
              </div>
            </div>
            <div className={styles.actions}>
              <a className={`${styles.btn} ${styles.primary}`} href="/">
                NULLWORKS
              </a>
              <a className={styles.btn} href="#evidence">
                See the receipts
              </a>
            </div>
          </div>
        </section>

        <div className={styles.grid}>
          <div>
            <section className={styles.card} id="about">
              <h2>About</h2>
              <p className={styles.big}>I build governed operating structures around AI workers so capability does not quietly become authority.</p>
              <p>
                I am the founder of NULLWORKS and a pioneering Operational Intelligence Systems Architect (OISA). My work
                sits between operations, systems architecture, AI governance, human factors, evidence, and implementation.
              </p>
              <p>
                The operating idea is simple: <strong>the model is not the operating system.</strong> Organizations need
                identity, authority, intent, policy, bounded execution, telemetry, verification, continuity, and records of
                what actually happened.
              </p>
              <div className={styles.origin}>
                <h3>The accidental origin story</h3>
                <p className={styles.muted} style={{ marginTop: 8 }}>
                  I started using modern generative AI on February 6, 2026. I did not begin with an AI-governance theory. I
                  treated the system like a digital employee and kept solving the operating problems that appeared: memory,
                  handoffs, authority, correction, evidence, failure recovery, and continuity.
                </p>
                <p className={styles.muted}>
                  Only later did it become obvious that NULLWORKS itself had become an experimental organization for the
                  question we were asking: what happens when AI stops being software an organization uses and starts becoming
                  labor that an organization must organize?
                </p>
              </div>
            </section>

            <section className={styles.card} id="work">
              <h2>Current work</h2>
              <div className={styles.timeline}>
                <div className={styles.role}>
                  <div className={styles.icon}>NW</div>
                  <div>
                    <h3>NULLWORKS</h3>
                    <div className={styles.meta}>Founder · Operational Intelligence Systems Architect · Current</div>
                    <p className={styles.muted} style={{ marginTop: 8 }}>
                      Designing the factory around AI workers: work cells, authority boundaries, continuity, quality gates,
                      telemetry, provenance, and human control.
                    </p>
                    <div className={styles.tags}>
                      <span className={styles.tag}>AI governance</span>
                      <span className={styles.tag}>Systems architecture</span>
                      <span className={styles.tag}>Operational design</span>
                      <span className={styles.tag}>Evidence & receipts</span>
                    </div>
                  </div>
                </div>
                <div className={styles.role}>
                  <div className={styles.icon}>OPS</div>
                  <div>
                    <h3>U.S. Postal Service</h3>
                    <div className={styles.meta}>Operations experience · Current</div>
                    <p className={styles.muted} style={{ marginTop: 8 }}>
                      Front-line exposure to exception handling, logistics, operational friction, field systems, and the gap
                      between how a process looks on paper and how work actually moves.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card} id="systems">
              <h2>Selected systems</h2>
              <div className={styles.systems}>
                <article className={styles.sys}>
                  <div className={styles.status}>
                    <span className={styles.dot} />
                    Active internal framework
                  </div>
                  <h3 style={{ marginTop: 9 }}>OI SUITe</h3>
                  <p>Human-centered operating and augmentation layer for AI workers: workrooms, authority, memory, telemetry, evidence, review, and continuity.</p>
                </article>
                <article className={styles.sys}>
                  <div className={styles.status}>
                    <span className={styles.dot} style={{ background: "var(--blue)" }} />
                    Operational infrastructure
                  </div>
                  <h3 style={{ marginTop: 9 }}>NEURAXIS</h3>
                  <p>Vendor-neutral authenticated ingress into governed NULLWORKS context. The current public-facing ingress is deliberately bounded and read-only.</p>
                </article>
                <article className={styles.sys}>
                  <div className={styles.status}>
                    <span className={styles.dot} style={{ background: "var(--amber)" }} />
                    Active research
                  </div>
                  <h3 style={{ marginTop: 9 }}>PORTUS LUNARIS</h3>
                  <p>Lunar infrastructure R&D: power, mobility, surface preparation, specialized robotics, interfaces, recovery, and logistics-first port architecture.</p>
                </article>
                <article className={styles.sys}>
                  <div className={styles.status}>
                    <span className={styles.dot} />
                    Published exercise
                  </div>
                  <h3 style={{ marginTop: 9 }}>Operational assurance work</h3>
                  <p>Technical pressure-testing and evidence-preserving assurance exercises. Published artifacts are explicitly not represented as certification or independent assurance.</p>
                </article>
              </div>
            </section>

            <section className={styles.card} id="evidence">
              <h2>Evidence, not vibes</h2>
              <p>
                NULLWORKS distinguishes between what exists, what has been tested, what has been deployed, and what remains
                research. The goal of this page is to do the same for the person behind the systems.
              </p>
              <div className={styles.item}>
                <h3>Model-agnostic continuity</h3>
                <p className={styles.muted} style={{ marginTop: 6 }}>
                  Testing whether identity, doctrine, evidence, authority, correction history, and mission context can
                  survive migration across model vendors while the reasoning engine changes.
                </p>
              </div>
              <div className={styles.item}>
                <h3>Machine-verifiable governance</h3>
                <p className={styles.muted} style={{ marginTop: 6 }}>
                  Current experiment direction: can an unfamiliar model reconstruct authority, a blocked action, revocation,
                  recovery, and final state from raw operational receipts without being given the narrative first?
                </p>
              </div>
              <div className={styles.item}>
                <h3>Continuity Calculus</h3>
                <p className={styles.muted} style={{ marginTop: 6 }}>
                  A developing framework for preserving operational intelligence across threads, workers, models,
                  interruptions, and correction cycles.
                </p>
              </div>
            </section>
          </div>

          <aside>
            <section className={styles.card}>
              <h2>Status legend</h2>
              <div className={styles.legend}>
                <div className={styles.legendrow}>
                  <i style={{ background: "var(--green)" }} />
                  <div>
                    <strong>Published / demonstrated</strong>
                    <br />
                    <span className={styles.muted}>Artifact or exercise exists; the claim stays bounded to what it proves.</span>
                  </div>
                </div>
                <div className={styles.legendrow}>
                  <i style={{ background: "var(--blue)" }} />
                  <div>
                    <strong>Operational / internal</strong>
                    <br />
                    <span className={styles.muted}>Used as working infrastructure; not automatically external validation.</span>
                  </div>
                </div>
                <div className={styles.legendrow}>
                  <i style={{ background: "var(--amber)" }} />
                  <div>
                    <strong>Research</strong>
                    <br />
                    <span className={styles.muted}>Active investigation or design work; not claimed as field-proven deployment.</span>
                  </div>
                </div>
                <div className={styles.legendrow}>
                  <i style={{ background: "#a2a6ad" }} />
                  <div>
                    <strong>Concept</strong>
                    <br />
                    <span className={styles.muted}>Exploratory work awaiting stronger evidence.</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h2>Operating principles</h2>
              <div className={styles.principle}>Capability is not authority.</div>
              <div className={styles.principle}>Human Authority remains final.</div>
              <div className={styles.principle}>Telemetry beats assumptions.</div>
              <div className={styles.principle}>Preserve failure receipts.</div>
              <div className={styles.principle}>Self-audit is not independent assurance.</div>
              <div className={styles.principle}>The thread is disposable. The operating intelligence is portable.</div>
            </section>

            <section className={styles.card}>
              <h2>Machine-readable identity</h2>
              <p className={styles.muted}>
                This page includes structured Person metadata so humans and automated systems can recover the same basic
                identity and role. The organization record is NULLWORKS LLC, Arizona Business ID 25114608.
              </p>
              <p className={styles.muted}>
                Verified legal identity lives on the <a href="/company">company page</a>.
              </p>
              <div className={styles.note}>
                Public identity ≠ operational authority. This profile describes the human operator; it does not grant an AI,
                agent, or application permission to act on Mason Perry's behalf.
              </div>
            </section>
          </aside>
        </div>

        <footer className={styles.footer}>
          <div>NULLWORKS LLC · Arizona · Business ID 25114608 · Human-centered Operational Intelligence systems architecture</div>
          <div>Canonical profile · nullworks.systems/mason</div>
        </footer>
      </div>
    </main>
  );
}
