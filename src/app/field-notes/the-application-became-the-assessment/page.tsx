import type { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GitBranch,
  Mail,
  Network,
  Radio,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The Application Became the Assessment | NULLWORKS",
  description:
    "While preparing a Toyota Automated Logistics Software Project Engineer application, two AI workrooms encountered related deployment failures. The recovery became a live field case in operational translation, coordination, testing, evidence, and human authority.",
};

const timeline = [
  {
    number: "01",
    title: "Two projects failed separately",
    body: "The Toyota role-fit page and Voice Foundry RUN-001 were being completed in different AI workrooms. Both reached the same production environment and both encountered missing routes, stale aliases, or unverifiable destinations.",
  },
  {
    number: "02",
    title: "The human recognized the shared pattern",
    body: "Instead of asking each workroom to keep debugging alone, Mason identified a likely common deployment constraint and directed both rooms into one durable GitHub coordination issue.",
  },
  {
    number: "03",
    title: "The workrooms accepted the team-up",
    body: "One workroom took ownership of Vercel deployment state, branch promotion, project identity, and alias mapping. The Toyota workroom preserved the application assets, rejected guessed URLs, and owned destination verification.",
  },
  {
    number: "04",
    title: "Gmail became a telemetry pipe",
    body: "Direct Gmail access surfaced repeated Vercel Preview and Production failure notices without requiring Mason to screenshot, copy, paste, or manually relay the deployment evidence.",
  },
  {
    number: "05",
    title: "The repair moved to the source",
    body: "Both projects were hardened as direct routes on main. Guessed branch hostnames were retired, the stale alias was treated as untrusted, and one production commit carried the coordinated repair.",
  },
  {
    number: "06",
    title: "The customer-side test closed the loop",
    body: "The final gate was not a green build. Mason opened the exact pages on his phone and verified that the intended experiences rendered from the actual production project domain.",
  },
];

const roleFit = [
  {
    title: "Customer operation",
    body: "The visible symptom was a broken application page. The actual work required tracing the complete operating path across chat workrooms, GitHub, Vercel, Gmail, aliases, routes, and the human browser.",
  },
  {
    title: "Software coordination",
    body: "The work was divided by ownership, translated into precise evidence requests, and coordinated through one shared issue rather than informal cross-thread copy-and-paste.",
  },
  {
    title: "Whole-system QA",
    body: "Source code, build status, deployment environment, domain mapping, route behavior, and the customer-visible result were treated as one production system.",
  },
  {
    title: "Turnover and support",
    body: "The final output included direct routes, failure receipts, a durable coordination record, a production commit, and a human-verification gate that another operator can inspect.",
  },
];

const receipts = [
  ["Shared coordination", "Hive issue #3 became the durable room for the joint repair."],
  ["Human authorization", "Mason explicitly authorized both workrooms to continue together and complete both projects."],
  ["Gmail evidence", "Vercel emails confirmed repeated failed Preview and Production deployments for mason-portfolio-main."],
  ["Production source", "Commit 08d5ebbe189d0d365c817bfaf912b2ad9d6c2a78 carried the hardened direct-route repair."],
  ["Toyota route", "/toyota-bridge plus the full /field-notes/software-project-engineer-bridge case."],
  ["Voice Foundry route", "/vf001 plus the compatibility route /voice-foundry/run-001."],
  ["Final authority", "The pages were not called complete until Mason opened and inspected the real destinations."],
  ["Truth boundary", "Toyota did not sponsor, participate in, endorse, or evaluate this independent application experiment."],
];

export default function ApplicationBecameAssessmentPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="/" className={styles.brand}>
            <span className={styles.monogram}>NW</span>
            <span>
              <strong>NULLWORKS</strong>
              <small>Operational Intelligence field receipt</small>
            </span>
          </a>
          <div className={styles.headerActions}>
            <a href="/field-notes/software-project-engineer-bridge" className={styles.headerLink}>
              Toyota role-fit case
            </a>
            <a href="mailto:masoncalcolsol@gmail.com?subject=The%20Application%20Became%20the%20Assessment" className={styles.headerPrimary}>
              <Mail size={15} /> Contact Mason
            </a>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}><Sparkles size={14} /> Field case // July 7, 2026 // NULLWORKS Day 16</div>
            <h1>The Application Became the Assessment.</h1>
            <p className={styles.deck}>
              While I was preparing an application for a Toyota Automated Logistics Software Project Engineer role, two independent AI workrooms encountered related deployment failures. I connected them, supplied a shared evidence room, divided ownership, piped in Vercel failure telemetry from Gmail, and used the repair to finish both projects.
            </p>
            <blockquote>
              I was trying to explain that I could bridge operations and software. Then the application system broke and made me demonstrate it.
            </blockquote>
            <div className={styles.heroActions}>
              <a href="#incident" className={styles.primaryAction}>Read the incident <ArrowRight size={16} /></a>
              <a href="https://mason-portfolio-main.vercel.app/toyota-bridge" target="_blank" rel="noreferrer" className={styles.secondaryAction}>Open the Toyota bridge <ArrowRight size={16} /></a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Two digital workrooms converging through one human-controlled coordination system">
            <div className={styles.visualGrid} aria-hidden="true" />
            <div className={styles.clockRingOne} aria-hidden="true" />
            <div className={styles.clockRingTwo} aria-hidden="true" />
            <div className={styles.clockRingThree} aria-hidden="true" />

            <article className={`${styles.workroom} ${styles.workroomLeft}`}>
              <div className={styles.workroomTop}><Radio size={14} /> WORKROOM A</div>
              <strong>Toyota application</strong>
              <span>404 · stale alias · route uncertainty</span>
            </article>

            <article className={`${styles.workroom} ${styles.workroomRight}`}>
              <div className={styles.workroomTop}><Radio size={14} /> WORKROOM B</div>
              <strong>Voice Foundry</strong>
              <span>404 · same project · same production path</span>
            </article>

            <div className={styles.operatorCore}>
              <div className={styles.operatorHalo} aria-hidden="true" />
              <ShieldCheck size={34} />
              <strong>HUMAN OPERATOR</strong>
              <span>Recognize pattern · connect rooms · authorize work · verify result</span>
            </div>

            <div className={styles.mergeBeamLeft} aria-hidden="true" />
            <div className={styles.mergeBeamRight} aria-hidden="true" />

            <div className={styles.outcomePanel}>
              <span>REMOTE JOINT WORKROOM COORDINATION</span>
              <strong>2 FAILURES → 1 SHARED CONSTRAINT → 2 COMPLETED ROUTES</strong>
            </div>

            <div className={styles.hspm}>
              <span>HSPM</span>
              <strong>CHRISTOPHER NOLAN PANIC ATTACK</strong>
            </div>
          </div>
        </section>

        <section id="incident" className={styles.section}>
          <div className={styles.sectionLabel}>What actually happened</div>
          <h2>Two digital employees were struggling separately. I turned the failure into a shared work cell.</h2>
          <p className={styles.sectionLead}>
            The breakthrough was not a smarter model. It was operating architecture: shared evidence, explicit ownership, a durable coordination room, bounded authority, source telemetry, and a real acceptance test.
          </p>

          <div className={styles.timeline}>
            {timeline.map((step) => (
              <article key={step.number} className={styles.timelineCard}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.darkSection}>
          <div className={styles.sectionLabel}>Why this matters to Toyota</div>
          <h2>The incident reproduced the exact bridge problem described by the role.</h2>
          <p className={styles.darkLead}>
            The role-fit page argued that a Software Project Engineer must move between customer reality, developers, installation, testing, troubleshooting, documentation, and support. The application incident forced those same responsibilities into one live sequence.
          </p>

          <div className={styles.roleGrid}>
            {roleFit.map((item, index) => (
              <article key={item.title} className={styles.roleCard}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>

          <blockquote className={styles.darkQuote}>
            The application did not merely describe the bridge. Its failure created a temporary customer environment in which the bridge had to operate.
          </blockquote>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>The operating architecture</div>
          <h2>Capability did not solve the problem. Coordination did.</h2>

          <div className={styles.architectureGrid}>
            <article><Workflow size={22} /><strong>Human pattern recognition</strong><p>Mason recognized that two apparently separate failures likely shared one deployment constraint.</p></article>
            <article><Network size={22} /><strong>Durable coordination</strong><p>GitHub issue #3 gave both workrooms one shared evidence room without relying on fragile conversational memory.</p></article>
            <article><Mail size={22} /><strong>Source telemetry</strong><p>Gmail supplied Vercel failure receipts directly, removing manual copy-and-paste from the critical path.</p></article>
            <article><GitBranch size={22} /><strong>Source-level repair</strong><p>The team hardened direct routes on main rather than continuing to infer hostnames or trust stale aliases.</p></article>
            <article><CheckCircle2 size={22} /><strong>Customer acceptance</strong><p>The final gate was a successful owner-browser render, not a green check or a persuasive status message.</p></article>
            <article><Clock3 size={22} /><strong>Reusable learning</strong><p>The work left commits, issue comments, emails, routes, screenshots, and a repeatable deployment-debug cell.</p></article>
          </div>
        </section>

        <section className={styles.receiptSection}>
          <div className={styles.receiptHeader}>
            <div>
              <div className={styles.sectionLabel}>Evidence ledger</div>
              <h2>No fake finish line.</h2>
            </div>
            <div className={styles.receiptBadge}><CircleAlert size={15} /> Receipt-gated</div>
          </div>

          <div className={styles.receiptGrid}>
            {receipts.map(([title, body]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.truthSection}>
          <div className={styles.truthIcon}><ShieldCheck size={25} /></div>
          <div>
            <strong>Application and affiliation boundary</strong>
            <p>
              This was an independent NULLWORKS application and deployment experiment conducted while preparing to apply for a Toyota Automated Logistics role. Toyota did not commission, participate in, approve, endorse, or evaluate the experiment. The case does not claim employment, affiliation, or production work for Toyota. It documents how Mason responded when the software-delivery system carrying his own application failed.
            </p>
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.sectionLabel}>The result</div>
          <h2>The best evidence for the application did not exist until the application broke.</h2>
          <p>
            Before the incident, I could claim that I understand operational translation, software coordination, whole-system testing, human authority, and evidence-backed handoffs. After the incident, I had a live receipt showing those behaviors under pressure.
          </p>
          <blockquote>
            The role asks for someone who can enter the ambiguity between software and operations and make the complete system work. That is what the application required before I could even submit it.
          </blockquote>
          <div className={styles.closingActions}>
            <a href="/field-notes/software-project-engineer-bridge" className={styles.primaryAction}>Return to the Toyota role-fit case <ArrowRight size={16} /></a>
            <a href="https://mason-portfolio-main.vercel.app/vf001" target="_blank" rel="noreferrer" className={styles.secondaryAction}>Open Voice Foundry RUN-001 <ArrowRight size={16} /></a>
          </div>
        </section>

        <footer className={styles.footer}>
          <div><strong>Mason Perry</strong><span>Founder, NULLWORKS · Human-Centered Operational Intelligence Systems Architect</span></div>
          <p>Human authority remains final.</p>
        </footer>
      </div>
    </main>
  );
}
