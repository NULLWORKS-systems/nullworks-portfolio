import styles from "../corporate.module.css";
import TinkerersQr from "./TinkerersQr";

const RUN_URL = "https://nullworks.systems/tinkerers/run";

export default function TinkerersPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <a className={styles.brand} href="/">
            NULLWORKS
            <span>AI TINKERERS · LIVE FAILURE TEST</span>
          </a>
          <div className={styles.links}>
            <a href="/tinkerers/run">Run</a>
            <a href="/tinkerers/live">Live</a>
            <a href="/architecture">Architecture</a>
            <a href="/proof">Proof</a>
            <a href="/">Home</a>
          </div>
        </nav>

        <section className={styles.compactHero}>
          <div className={styles.eyebrow}>FIVE-MINUTE LIVE EXPERIMENT</div>
          <h1 className={styles.title}>
            The AI was wrong. Then the AI checking it was wrong.
          </h1>
          <p className={styles.lead}>
            Can AI reliably determine whether another AI actually followed its instructions?
            We run the test live. No slides. No canned result.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/tinkerers/run">Run the experiment</a>
            <a className={styles.secondary} href="#experiment">See the experiment</a>
          </div>
          <div style={{ marginTop: 28 }}>
            <TinkerersQr url={RUN_URL} />
          </div>
          <p className={styles.body} style={{ marginTop: 18, maxWidth: 720 }}>
            Anonymous live experiment. Do not paste private, confidential, or sensitive information.
            Experiment outputs may be retained for demo/research analysis.
          </p>
        </section>

        <div className={styles.band}>
          AI WORKER → AI QUALITY CHECKER → EVIDENCE → HUMAN AUTHORITY
        </div>

        <section className={styles.section} id="experiment">
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>The experiment</div>
            <h2 className={styles.h2}>One simple task. Two AI workers. One reality check.</h2>
            <p className={styles.body}>
              An AI worker receives a small specification and produces an artifact. A second AI
              independently checks it. Then we measure what actually happened. The point is not to
              make AI look bad. The point is to make failure visible and recoverable.
            </p>
          </div>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>1 · Generate</div>
              <h3>AI Worker</h3>
              <p>
                The worker follows an explicit contract and produces the artifact. It may look
                completely correct while still violating a measurable requirement.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>2 · Evaluate</div>
              <h3>AI Quality Checker</h3>
              <p>
                A separate AI grades the artifact against the same contract. It can catch the
                worker&apos;s mistake — and it can make a mistake of its own.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>3 · Verify</div>
              <h3>Evidence + Human</h3>
              <p>
                Deterministic measurements expose the observable facts. The system preserves the
                evidence. Final authority remains human.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.statement}>
            <strong>Output ≠ evidence. QC ≠ truth.</strong>
            <p>
              AI can generate. AI can check. Neither becomes the authority merely because it sounds
              certain. NULLWORKS separates generation, evaluation, evidence, and authorization so
              failures can be seen instead of silently promoted into success.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.two}>
            <div className={styles.panel}>
              <h3>What you will see live</h3>
              <p>
                A worker run, an independent QC verdict, the underlying structural measurements,
                and the exact point where human authority is required.
              </p>
            </div>
            <div className={styles.panel}>
              <h3>The takeaway</h3>
              <p>
                Do not design AI systems around the assumption that the model will always be right.
                Design them so wrong can be detected, preserved, challenged, and recovered from.
              </p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>NULLWORKS · nullworks.systems/tinkerers</span>
          <span>Architecture before automation. Evidence before claims. Human authority remains final.</span>
        </footer>
      </div>
    </main>
  );
}
