import type { Metadata } from "next";
import styles from "./corporate.module.css";

export const metadata: Metadata = {
  title: "NULLWORKS | Governed AI Systems Architecture",
  description:
    "NULLWORKS is a founder-led systems architecture company building governed human-AI operating systems with bounded workers, tool integration, evidence, recovery paths, and verifiable receipts.",
};

const capabilities = [
  ["Architecture", "Govern the operating loop", "Identity, authority, intent, policy, bounded execution, telemetry, verification, provenance, escalation, revocation, recovery, and receipts.", "/architecture"],
  ["Systems", "Build where the work breaks", "Working software and field systems across maintenance, assurance, evidence, intake, exception recovery, continuity, and human-AI operations.", "/products"],
  ["Proof", "Make claims earn their verbs", "Field receipts, reproducible tests, case studies, failure boundaries, retests, and explicit unknowns.", "/proof"],
];

const doors = [
  ["Japan / JETRO", "Partnership + infrastructure", "A relationship-first route for institutions, manufacturers, operators, researchers, and partners working on AI, robotics, infrastructure, and industrial systems.", "/japan"],
  ["Operational assurance", "Find the first material unknown", "Start with a consequential workflow and separate what is documented, observed, tested, assumed, or still unknown.", "/triage"],
  ["Research", "Inspect the doctrine underneath the software", "Continuity, operational relativity, architecture lineage, model-agnostic transfer, control coverage, and other working research.", "/research"],
];

export default function HomePage() {
  return <main className={styles.page}>
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <a className={styles.brand} href="/">NULLWORKS<span>FOUNDER-LED GOVERNED AI SYSTEMS ARCHITECTURE</span></a>
        <div className={styles.links}>
          <a href="/architecture">Architecture</a><a href="/products">Systems</a><a href="/proof">Proof</a><a href="/research">Research</a><a href="/japan">Japan</a><a href="/company">Company</a>
        </div>
      </nav>

      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>NULLWORKS · ONE HUMAN AUTHORITY · GOVERNED DIGITAL WORKFORCE</div>
          <h1 className={styles.title}>The intelligence is not the operating system.</h1>
          <p className={styles.lead}>NULLWORKS designs, builds, and tests the governed architecture through which humans, AI workers, applications, tools, and physical systems are permitted to interact with consequential work.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/architecture">See the architecture</a>
            <a className={styles.secondary} href="/products">See what has been built</a>
          </div>
        </div>
        <aside className={styles.side}>
          <strong>What NULLWORKS actually is.</strong><br/><br/>
          NULLWORKS is intentionally founder-led. Mason Perry is the sole human operator and final Human Authority. Digital workers can investigate, retrieve, draft, compare, code, test, and operate bounded tools, but they do not become independent authorities. Their scope, permissions, evidence, escalation paths, and actions are governed and receipted.
        </aside>
      </section>

      <div className={styles.band}>HUMAN AUTHORITY → BOUNDED AI WORKER → PERMITTED ACTION → VERIFIABLE RECEIPT</div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.kicker}>One architecture, many applications</div>
          <h2 className={styles.h2}>Start with reality. Do not begin by shopping for AI.</h2>
          <p className={styles.body}>The intervention may be software, AI, a workflow change, an authority boundary, a physical modification, or a new architecture around all of them. The tool is not the achievement. The changed operating outcome is.</p>
        </div>
        <div className={styles.grid}>{capabilities.map(([label,title,body,href]) => <a className={styles.card} href={href} key={title}><div className={styles.cardLabel}>{label}</div><h3>{title}</h3><p>{body}</p></a>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.statement}><strong>This is not a conventional software headcount model.</strong><p>NULLWORKS uses multiple AI systems as governed digital workers inside defined roles and workrooms. They connect to repositories, APIs, MCP servers, evidence, and tools through bounded execution paths. Human authority stays explicit; uncertainty, failures, and state changes are preserved instead of hidden.</p></div>
        <div className={styles.process}>{["OBSERVE","MAP","PROTOTYPE","BOUND","TEST","RECOVER","RECEIPT"].map(x=><div className={styles.step} key={x}>{x}</div>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.kicker}>What the work looks like</div>
          <h2 className={styles.h2}>Architecture that survives contact with tools, people, and failure.</h2>
          <p className={styles.body}>NULLWORKS builds agent workflows, MCP and API integrations, evaluation and adversarial testing, bounded read/write worker paths, execution receipts, recovery logic, prototype systems, and physical/autonomous-systems research. CIRIS is one public assurance proof point, not the entire body of work.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><div className={styles.kicker}>Enter through the problem</div><h2 className={styles.h2}>Different doors. Same source of truth.</h2><p className={styles.body}>Audience-specific pages change sequencing, not facts. Every route resolves back to the same architecture, systems, evidence, and company canon.</p></div>
        <div className={styles.grid}>{doors.map(([label,title,body,href]) => <a className={styles.card} href={href} key={title}><div className={styles.cardLabel}>{label}</div><h3>{title}</h3><p>{body}</p></a>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.two}>
          <div className={styles.panel}><h3>Have a consequential workflow?</h3><p>Bring the desired outcome, actors, constraints, authority, evidence, exceptions, failure cost, and current software. We map before prescribing.</p><a className={styles.route} href="/triage">Start with triage →</a></div>
          <div className={styles.panel}><h3>Trying to understand NULLWORKS?</h3><p>Start with the operating model, then inspect the architecture, systems, and proof. The research layer exists for people who want the full rabbit hole.</p><a className={styles.route} href="/company">How the company operates →</a></div>
        </div>
      </section>

      <footer className={styles.footer}><span>NULLWORKS · nullworks.systems</span><span>One human authority. Governed digital workers. Evidence before claims.</span></footer>
    </div>
  </main>;
}
