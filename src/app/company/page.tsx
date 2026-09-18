import type { Metadata } from "next";
import styles from "../corporate.module.css";

export const metadata: Metadata = { title: "Company | NULLWORKS" };

export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <a className={styles.brand} href="/">
            NULLWORKS<span>COMPANY + OPERATING MODEL</span>
          </a>
          <div className={styles.links}>
            <a href="/architecture">Architecture</a>
            <a href="/products">Systems</a>
            <a href="/proof">Proof</a>
            <a href="/mason">Founder</a>
          </div>
        </nav>

        <section className={styles.compactHero}>
          <div className={styles.eyebrow}>Founder-led governed AI systems architecture</div>
          <h1 className={styles.title}>One human authority. A governed digital workforce around the work.</h1>
          <p className={styles.lead}>
            NULLWORKS is intentionally not organized like a conventional software company. Mason Perry is the sole human operator and final Human Authority. AI workers perform bounded roles across research, coding, testing, retrieval, orchestration, documentation, and operations through governed tool access, explicit authority boundaries, and verifiable receipts.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.two}>
            <div className={styles.panel}>
              <h3>Mason Perry</h3>
              <p>
                Founder, operational investigator, and systems architect. Mason works from the problem outward: learn the real work, find where intent and execution separated, then build or repair the operating system around it.
              </p>
              <p>
                <a className={styles.route} href="/mason">Public profile →</a>
                {"  "}
                <a className={styles.route} href="/executive-brief">Executive brief →</a>
              </p>
            </div>
            <div className={styles.panel}>
              <h3>Digital workers</h3>
              <p>
                NULLWORKS uses multiple AI systems as governed workers rather than treating a model as the company. Workers can investigate, retrieve, compare, draft, code, test, and invoke bounded tools. They are not humans, employees, legal officers, or independent authorities.
              </p>
              <p>
                Their identities, roles, permissions, evidence, escalation paths, state changes, and action receipts are part of the architecture.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>The operating pattern</div>
            <h2 className={styles.h2}>Human Authority → bounded AI worker → permitted action → verifiable receipt.</h2>
            <p className={styles.body}>
              The same pattern governs software work, agent orchestration, operational assurance, multi-model workflows, API and MCP integration, and physical/autonomous-systems research.
            </p>
          </div>
          <div className={styles.list}>
            <div className={styles.item}>
              <strong>Human authority</strong>
              <span>Consequential action remains accountable to a person. Digital workers do not silently acquire authority because they can perform an action.</span>
            </div>
            <div className={styles.item}>
              <strong>Bounded execution</strong>
              <span>Workers receive the minimum capabilities needed for the task, with approval, escalation, stop, revoke, and recovery paths where consequences justify them.</span>
            </div>
            <div className={styles.item}>
              <strong>Continuity</strong>
              <span>Disposable AI sessions rehydrate from governed shared state rather than pretending every conversation is a new organization.</span>
            </div>
            <div className={styles.item}>
              <strong>Evidence and receipts</strong>
              <span>Sources, decisions, tool actions, uncertainty, failures, corrections, and changed state remain reconstructable.</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>What NULLWORKS does</div>
            <h2 className={styles.h2}>Implementation, orchestration, testing, and systems architecture.</h2>
          </div>
          <div className={styles.list}>
            <div className={styles.item}>
              <strong>Agent systems + integrations</strong>
              <span>Multi-model workflows, MCP and API integration, tool use, read/write worker paths, and operational handoffs.</span>
            </div>
            <div className={styles.item}>
              <strong>Evals + adversarial testing</strong>
              <span>Ambiguous outcomes, failure modes, uncertainty, regression, changed-condition testing, and explicit abstention.</span>
            </div>
            <div className={styles.item}>
              <strong>Operational assurance</strong>
              <span>Separate documented claims from observed behavior, acquire evidence, pressure-test controls, and retest repairs.</span>
            </div>
            <div className={styles.item}>
              <strong>Physical AI + autonomous systems</strong>
              <span>Recovery-first robotics, infrastructure, degraded-mode operations, interface design, and field-system architecture research.</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.notice}>
            NULLWORKS is a founder-led company, not a claim of large human headcount. Breadth of output comes from governed AI-assisted execution, reusable architecture, and persistent organizational memory. Public proof is scoped to what has actually been built, tested, or observed.
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
