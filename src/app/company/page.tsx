import type { Metadata } from "next";
import styles from "../corporate.module.css";

export const metadata: Metadata = { title: "Company | NULLWORKS" };

export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <a className={styles.brand} href="/">
            NULLWORKS<span>COMPANY</span>
          </a>
          <div className={styles.links}>
            <a href="/architecture">Architecture</a>
            <a href="/products">Systems</a>
            <a href="/proof">Proof</a>
            <a href="/mason">Founder</a>
          </div>
        </nav>
        <section className={styles.compactHero}>
          <div className={styles.eyebrow}>Software + systems architecture</div>
          <h1 className={styles.title}>Built around the work, not the hype cycle.</h1>
          <p className={styles.lead}>
            NULLWORKS is an incorporated software and systems architecture company focused on consequential human-AI operations. We investigate real workflows, map authority and evidence, prototype the smallest defensible intervention, test it with the people closest to the outcome, and preserve what happened.
          </p>
        </section>
        <section className={styles.section}>
          <div className={styles.panel}>
            <h3>Mason Perry</h3>
            <p>
              Founder. Operational investigator and systems architect. Mason works from the problem outward: learn the real work, find where intent and execution separated, then build or repair the operating system around it.
            </p>
            <p>
              <a className={styles.route} href="/mason">Public profile →</a>
              {"  "}
              <a className={styles.route} href="/executive-brief">Executive brief →</a>
            </p>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>Operating principles</div>
            <h2 className={styles.h2}>The company behaves like the systems it builds.</h2>
          </div>
          <div className={styles.list}>
            <div className={styles.item}>
              <strong>Human authority</strong>
              <span>Consequential action remains accountable to a person.</span>
            </div>
            <div className={styles.item}>
              <strong>Minimum necessary intervention</strong>
              <span>More software and more AI are not default answers.</span>
            </div>
            <div className={styles.item}>
              <strong>Provenance</strong>
              <span>Sources, derivatives, decisions, uncertainty, and receipts remain connected.</span>
            </div>
            <div className={styles.item}>
              <strong>Transfer</strong>
              <span>The system should leave the people who own the work more capable, not permanently dependent.</span>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.notice}>
            Canonical public identity: <strong>nullworks.systems</strong>. Exact legal jurisdiction, registration numbers, addresses, and ownership details remain publication-gated until verified against corporate records.
          </div>
        </section>
        <footer className={styles.footer}>
          <a className={styles.route} href="/">← NULLWORKS</a>
          <a className={styles.route} href="mailto:nullworks.neuraxis@gmail.com?subject=NULLWORKS%20conversation">
            Contact →
          </a>
        </footer>
      </div>
    </main>
  );
}
