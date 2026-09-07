/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  FileSearch,
  Gauge,
  Mail,
  PackageCheck,
  Printer,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
  Wrench,
} from "lucide-react";
import { imageBase64 as portableImage } from "../api/ori-media/portable/data";
import { imageBase64 as deployedImage } from "../api/ori-media/deployed/data";
import { imageBase64 as damagedImage } from "../api/ori-media/damaged/data";
import styles from "./page.module.css";
import orbit from "./orbit.module.css";

export const metadata: Metadata = {
  title: "ORI TAC OPS | Human-Controlled Damaged-Label Recovery",
  description:
    "A portable, human-controlled work cell for damaged parcel-label recovery and a controlled OI SUITe field experiment.",
};

const portableSrc = `data:image/webp;base64,${portableImage}`;
const deployedSrc = `data:image/webp;base64,${deployedImage}`;
const damagedSrc = `data:image/webp;base64,${damagedImage}`;

const flow = [
  [ScanLine, "01", "Capture what survived", "Photograph the damaged label and preserve the readable evidence."],
  [FileSearch, "02", "Let OCR assist", "The system proposes readable fields and leaves uncertainty visible."],
  [UserRound, "03", "Employee verifies", "A trained employee corrects, rejects, or escalates the result."],
  [Printer, "04", "Print a helper label", "The output is clearly marked NOT POSTAGE and HUMAN VERIFIED."],
  [PackageCheck, "05", "Return to approved flow", "The parcel follows the locally approved recovery path."],
  [BadgeCheck, "06", "Leave a receipt", "The pilot records time, corrections, outcome, and unresolved risk."],
] as const;

const audiences = [
  [Wrench, "For the employee", "Less hunting. Less retyping. You still decide.", "ORI TAC OPS keeps the surviving evidence, machine suggestion, employee correction, printer output, and next handoff together."],
  [Gauge, "For Postal leadership", "Turn a recurring exception into a measurable process.", "A controlled pilot can measure recovery rate, employee minutes, false recovery, rework, training burden, and downstream handling."],
  [Workflow, "For Toyota and integrators", "The app is not the product. The complete work cell is.", "Operator, evidence, OCR, correction, hardware, authority boundaries, telemetry, and acceptance testing operate as one system."],
] as const;

const metrics = [
  "Recovery candidates presented",
  "Successfully recovered parcels",
  "False or unsafe recoveries",
  "Employee minutes per case",
  "Rework and repeat handling",
  "Downstream exception routing",
  "Training and cognitive burden",
  "Hardware, support, and privacy cost",
];

const imageStyle = {
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

export default function OriTacOpsLandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="/" className={styles.brand} aria-label="NULLWORKS home">
            <span className={styles.mark}>NW</span>
            <span>
              <strong>NULLWORKS</strong>
              <small>Human-controlled Operational Intelligence</small>
            </span>
          </a>
          <nav className={styles.nav} aria-label="ORI TAC OPS links">
            <a href="#how-it-works">How it works</a>
            <a href="#pilot">Pilot</a>
            <a href="/field-notes/ori-tac-ops-oisa-beta-test">Full case study</a>
            <a className={styles.contact} href="mailto:masoncalcolsol@gmail.com?subject=ORI%20TAC%20OPS%20controlled%20pilot">
              <Mail size={15} /> Contact Mason
            </a>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><Sparkles size={14} /> Portable exception recovery // Human verified</div>
            <h1>When the label fails, the parcel should not disappear into the process.</h1>
            <p className={styles.deck}>
              ORI TAC OPS is a portable, human-controlled damaged-label recovery work cell. It helps an employee preserve what survived, use OCR as an assistant, correct the result, print a clearly marked helper label, and return the parcel to the approved recovery flow.
            </p>
            <p className={styles.plainLanguage}><strong>Plain English:</strong> take a picture, check the answer, print a helper label, keep the parcel moving.</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#how-it-works">See the 30-second flow <ArrowRight size={16} /></a>
              <a className={styles.secondary} href="/field-notes/ori-tac-ops-oisa-beta-test">Read the complete field case</a>
            </div>
            <div className={styles.statusLine}>
              <span><CheckCircle2 size={14} /> Working portable prototype</span>
              <span><ShieldCheck size={14} /> Controlled pilot requested</span>
              <span><Eye size={14} /> Not a USPS production deployment</span>
            </div>
          </div>

          <div className={`${styles.heroVisual} ${orbit.panel}`} aria-label="ORI TAC OPS work-cell diagram">
            <div className={styles.visualGrid} />
            <div className={orbit.orbit}>
              <article className={orbit.station}>
                <ScanLine size={18} aria-hidden="true" />
                <div>
                  <strong>01 Capture</strong>
                  <span>Photograph what survived. Preserve readable evidence.</span>
                </div>
              </article>
              <article className={orbit.station}>
                <FileSearch size={18} aria-hidden="true" />
                <div>
                  <strong>02 OCR assist</strong>
                  <span>Propose readable fields. Leave uncertainty visible.</span>
                </div>
              </article>
              <div className={orbit.orbitCoreWrap}>
                <span className={orbit.orbitRing} aria-hidden="true" />
                <span className={orbit.orbitRingInner} aria-hidden="true" />
                <div className={orbit.orbitCore}>
                  <ShieldCheck size={28} color="#728318" aria-hidden="true" />
                  <strong>HUMAN AUTHORITY</strong>
                  <small>final · employee verifies</small>
                </div>
                <div className={orbit.orbitHandoff}>03 Verify → 05 Approved handoff</div>
              </div>
              <article className={orbit.station}>
                <Printer size={18} aria-hidden="true" />
                <div>
                  <strong>04 Print output</strong>
                  <span>Helper label marked NOT POSTAGE and HUMAN VERIFIED.</span>
                </div>
              </article>
              <article className={orbit.station}>
                <Gauge size={18} aria-hidden="true" />
                <div>
                  <strong>06 Telemetry</strong>
                  <span>Time, corrections, outcome, and unresolved risk.</span>
                </div>
              </article>
              <p className={orbit.orbitCaption}>
                Operator + evidence + OCR + printer + approved handoff + telemetry
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.lightSection}>
          <div className={styles.sectionLabel}>The 30-second explanation</div>
          <h2>One exception. One visible work cell. Six simple steps.</h2>
          <p className={styles.sectionLead}>The employee never has to trust a mysterious answer. The evidence, suggestion, correction, output, and next approved action remain visible.</p>
          <div className={styles.flowGrid}>
            {flow.map(([Icon, number, title, body]) => (
              <article key={number} className={styles.flowCard}>
                <div className={styles.flowIcon}><Icon size={22} /></div><span>{number}</span><h3>{title}</h3><p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.audienceSection}>
          <div className={styles.sectionLabel}>One page, three audiences</div>
          <h2>The same system should make sense on the floor, in the boardroom, and in an engineering review.</h2>
          <div className={styles.audienceGrid}>
            {audiences.map(([Icon, label, title, body]) => (
              <article key={label} className={styles.audienceCard}><Icon size={25} /><span>{label}</span><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </section>

        <section id="pilot" className={styles.pilotSection}>
          <div className={styles.pilotCopy}>
            <div className={styles.sectionLabel}>The correct next step</div>
            <h2>Run a small controlled pilot. Measure the current state before claiming the future.</h2>
            <p>A valid test begins with a bounded site, approved operators, sanitized evidence, defined escalation, and a clear stop condition.</p>
            <div className={styles.hypothesisCard}><Gauge size={24} /><div><span>Small-volume hypothesis</span><strong>Could recovering roughly three additional parcels per day justify the complete cost of the work cell?</strong><p>That is a question for measured pilot data, not a published savings claim.</p></div></div>
          </div>
          <div className={styles.metricsPanel}><span className={styles.metricsLabel}>Pilot telemetry</span>{metrics.map((metric) => <div key={metric}><CheckCircle2 size={15} /> {metric}</div>)}</div>
        </section>

        <section className={styles.oiSection}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, alignSelf: "center" }}>
            <figure style={{ margin: 0, overflow: "hidden", borderRadius: 18, border: "1px solid rgba(216,255,63,.3)", background: "#091015" }}><div style={{ aspectRatio: "3 / 4" }}><img src={portableSrc} alt="Portable ORI TAC OPS kit in a hard case" style={imageStyle} /></div><figcaption style={{ padding: 12, color: "#cbd2ca", fontSize: 11 }}>Portable kit</figcaption></figure>
            <figure style={{ margin: 0, overflow: "hidden", borderRadius: 18, border: "1px solid rgba(112,232,255,.3)", background: "#091015" }}><div style={{ aspectRatio: "3 / 4" }}><img src={deployedSrc} alt="ORI TAC OPS printer, phone interface, and helper label" style={imageStyle} /></div><figcaption style={{ padding: 12, color: "#cbd2ca", fontSize: 11 }}>Deployed work cell</figcaption></figure>
            <figure style={{ margin: 0, overflow: "hidden", borderRadius: 18, border: "1px solid rgba(112,232,255,.3)", background: "#091015" }}><div style={{ aspectRatio: "4 / 3", background: "#f2ecdf", padding: 18 }}><img src="/ori-tac-ops/test-output.svg" alt="Human-verified repair helper-label illustration" style={{ ...imageStyle, objectFit: "contain" }} /></div><figcaption style={{ padding: 12, color: "#cbd2ca", fontSize: 11 }}>Helper-label output</figcaption></figure>
            <figure style={{ margin: 0, overflow: "hidden", borderRadius: 18, border: "1px solid rgba(216,255,63,.3)", background: "#091015" }}><div style={{ aspectRatio: "4 / 3" }}><img src={damagedSrc} alt="Sanitized damaged thermal shipping label that inspired ORI TAC OPS" style={{ ...imageStyle, objectPosition: "center 35%" }} /></div><figcaption style={{ padding: 12, color: "#cbd2ca", fontSize: 11 }}>The spark: a bad thermal print</figcaption></figure>
          </div>
          <div className={styles.oiCopy}>
            <div className={styles.sectionLabel}>Why Toyota should care</div>
            <h2>ORI TAC OPS is an OI SUITe experiment disguised as a damaged-label tool.</h2>
            <p>The useful product is not “AI reads a label.” The useful product is the operating architecture around the capability: employee role, source evidence, authority limits, correction path, hardware, training, exception routing, telemetry, and recovery receipt.</p>
            <p>The same method applies to warehouse automation, installation, software implementation, maintenance support, customer turnover, and any environment where physical operations and digital systems meet.</p>
            <a className={styles.darkLink} href="/toyota-bridge">See Mason's Toyota role-fit case <ArrowRight size={16} /></a>
          </div>
        </section>

        <section className={styles.photoSection}>
          <div className={styles.photoHeader}><div><div className={styles.sectionLabel}>Field evidence</div><h2>The prototype is real.</h2><p>The kit and work-cell photos are from the personal test article. The damaged-label image is from the package delivered to Mason's home that sparked the idea. Personal address and tracking data are removed from the public version.</p></div><BadgeCheck size={33} /></div>
        </section>

        <section className={styles.truthSection}><ShieldCheck size={28} /><div><strong>Public truth boundary</strong><p>ORI TAC OPS is an independent NULLWORKS human-centered logistics exception-recovery concept with a working portable prototype and a controlled-pilot request. It is not an approved, purchased, connected, or deployed USPS production system. No controlled pilot has validated exact savings or return on investment. USPS and Toyota do not sponsor or endorse this page. Human authority remains final.</p></div></section>

        <section className={styles.finalCta}><div><div className={styles.sectionLabel}>The simple pitch</div><h2>Do not replace the expert. Give the expert a better recovery work cell.</h2><p>The next conversation is not “Should AI run the mail?” It is “Can a small, controlled, employee-led test reduce avoidable exception handling without creating new risk?”</p></div><div className={styles.finalActions}><a className={styles.primary} href="mailto:masoncalcolsol@gmail.com?subject=ORI%20TAC%20OPS%20controlled%20pilot">Discuss a controlled pilot <ArrowRight size={16} /></a><a className={styles.secondary} href="/field-notes/ori-tac-ops-oisa-beta-test">Read the full OISA case study</a></div></section>

        <footer className={styles.footer}><div><strong>Mason Perry</strong><span>Founder, NULLWORKS · Operational Intelligence Systems Architect</span></div><p>Human authority remains final.</p></footer>
      </div>
    </main>
  );
}
