import type { Metadata } from "next";
import Link from "next/link";
import styles from "../corporate.module.css";

export const metadata: Metadata = {
  title: { absolute: "PMARS — Scan the marker. The record follows." },
  description:
    "PMARS is a QR on the machine plus a phone scan. Maintenance, a supervisor, and a stranger do not get the same view.",
  alternates: { canonical: "https://nullworks.systems/pmar" },
  openGraph: {
    title: "PMARS — Scan the marker. The record follows.",
    description: "A QR code on the asset. A phone scan. Role decides what you are allowed to see.",
    url: "https://nullworks.systems/pmar",
    siteName: "PMARS",
  },
};

export default function PMARPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link className={styles.brand} href="/">
            NULLWORKS<span>FIELD EVIDENCE · PHYSICAL OPERATIONS</span>
          </Link>
          <div className={styles.mono}>PMARS</div>
        </nav>

        <section className={styles.compactHero}>
          <div className={styles.eyebrow}>PMARS LIVE</div>
          <h1 className={styles.title}>It is a QR code on the machine.</h1>
          <p className={styles.lead}>
            A phone scans it. The marker is only an address. The record behind that address
            is what changes — and who is holding the phone decides how much of that record
            they are allowed to see.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/pmar/overview">
              Open live overview
            </Link>
            <Link className={styles.secondary} href="/pmar/t/PM-000071">
              Example scan
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>FIELD RECEIPT</div>
            <h2 className={styles.h2}>Same sticker. Different phone. Different view.</h2>
            <p className={styles.body}>
              The label on the pallet jack is not the database. It is a pointer. Scan
              PM-000066 or PM-000071 and the phone opens the live record for that point.
              What happens next depends on identity, not on reprinting a different QR
              for every job title.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              marginTop: 24,
            }}
          >
            <figure style={{ margin: 0 }}>
              <img
                src="/pmar/field-qr.jpg"
                alt="PMARS QR label PM-000066 on a Toyota pallet jack next to the emergency disconnect warning"
                style={{ width: "100%", borderRadius: 18, display: "block" }}
              />
              <figcaption className={styles.body} style={{ marginTop: 10 }}>
                Physical marker on the asset. The code is the address, not the whole history.
              </figcaption>
            </figure>
            <figure style={{ margin: 0 }}>
              <img
                src="/pmar/field-scan.jpg"
                alt="Phone scan of PMARS Live for PM-000071 showing pallet jack PJ47 in service at 2247 hours"
                style={{ width: "100%", borderRadius: 18, display: "block" }}
              />
              <figcaption className={styles.body} style={{ marginTop: 10 }}>
                Phone view after scan: asset ID, type, service state, displayed hours.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>WHO IS HOLDING THE PHONE</div>
            <h2 className={styles.h2}>One marker. Three classes of view.</h2>
            <p className={styles.body}>
              The current field prototype shows the shared live record so the loop can
              be tested on real equipment. The operating design is not that every
              stranger gets a maintenance console. Role and authorization decide the
              payload after the scan.
            </p>
          </div>
          <div className={styles.list}>
            <div className={styles.item}>
              <strong>Random person / visitor</strong>
              <span>
                Minimum public facts only, if anything: this is an identified asset,
                it exists, maybe a status word. No hour history, no fault notes, no
                ability to take it out of service. A QR on a jack is not an open
                admin panel.
              </span>
            </div>
            <div className={styles.item}>
              <strong>Maintenance phone</strong>
              <span>
                The working record: what it is, current service state, displayed hours,
                last scan, and the actions a tech is authorized to take — including
                marking IN SERVICE / OUT OF SERVICE and attaching what they just saw.
              </span>
            </div>
            <div className={styles.item}>
              <strong>Supervisor phone</strong>
              <span>
                Fleet context around the same marker: who changed status, when, which
                units are down, hours across the set, and review — not just the one
                jack in front of them.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>THE OPERATING PROBLEM</div>
            <h2 className={styles.h2}>Physical systems lose context between people, shifts, paper, software, and time.</h2>
            <p className={styles.body}>
              A machine can have a serial number, a local nickname, handwritten service
              notes, meter hours, parts history, operator knowledge, and a database
              record that never quite agree. PMARS starts by giving the physical thing
              a stable point of reference. Scan the marker and the current record
              follows the asset instead of forcing the worker to hunt for the system
              that contains it.
            </p>
          </div>
          <div className={styles.list}>
            <div className={styles.item}>
              <strong>Persistent identity</strong>
              <span>The physical marker resolves to a durable record rather than encoding the entire changing record in the label.</span>
            </div>
            <div className={styles.item}>
              <strong>Operational state</strong>
              <span>Status, hours, last service, observations, maintenance needs, and supporting evidence can accumulate around the same identity.</span>
            </div>
            <div className={styles.item}>
              <strong>Field-first interaction</strong>
              <span>The worker begins with the thing in front of them: find the marker, scan it, see or update the relevant record.</span>
            </div>
            <div className={styles.item}>
              <strong>Authority after identity</strong>
              <span>The scan proves which asset. The signed-in role proves which slice of the record and which actions are legal.</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.statement}>
            <strong>FIELD EVIDENCE, NOT A PRODUCT CLAIM</strong>
            <p>
              PMARS has been exercised as a working field prototype around maintenance
              and physical equipment. These photographs are from that loop. They do
              not claim a certified production deployment, manufacturer integration,
              or that every scan already enforces a finished role-permission matrix.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.kicker}>WHY IT MATTERS TO JAPAN</div>
            <h2 className={styles.h2}>A small identity primitive can connect maintenance, robotics, inspection, and knowledge continuity.</h2>
            <p className={styles.body}>
              In a Japanese co-development setting, the useful experiment is
              deliberately bounded: choose one class of equipment or one physical
              workflow, establish persistent identity, capture the evidence people
              already use, then test whether maintenance personnel or machine
              systems can act with less ambiguity and better reconstructability.
            </p>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>NULLWORKS · PMARS · FIELD EVIDENCE</span>
          <Link className={styles.route} href="/pmar/overview">
            Live maintenance overview →
          </Link>
        </footer>
      </div>
    </main>
  );
}
