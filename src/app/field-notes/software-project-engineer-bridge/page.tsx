import type { Metadata } from "next";
import { BulletGrid, FieldNoteShell, H2, Lead, P, Quote, TruthBox } from "../_components/FieldNoteShell";
import { edgeInterference } from "./edgeEvidence";

export const metadata: Metadata = {
  title: "Software Project Engineer Is the Bridge | Mason Perry",
  description:
    "A recruiter-facing field case connecting mission-critical USPS logistics, Toyota material-handling equipment, whole-system root-cause analysis, software implementation, and human-centered operational intelligence.",
};

function EvidencePhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure
      style={{
        margin: "2rem 0 2.5rem",
        overflow: "hidden",
        borderRadius: "24px",
        border: "1px solid rgba(163, 122, 46, 0.35)",
        background: "#101318",
        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "16 / 10",
          objectFit: "cover",
        }}
      />
      <figcaption
        style={{
          padding: "1rem 1.2rem 1.15rem",
          color: "#c9bfae",
          fontSize: ".92rem",
          lineHeight: 1.55,
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export default function SoftwareProjectEngineerBridgePage() {
  return (
    <FieldNoteShell
      number={7}
      standalone
      standaloneLabel="Toyota recruiter application field case"
      eyebrow="Mission-critical logistics // warehouse automation // software integration"
      title="Software Project Engineer Is the Bridge"
      deck="The strongest fit is the person who can understand the operation, translate it for developers, test the whole system, train the user, and remain accountable when physical equipment, controls, software, maintenance, and human work meet."
    >
      <Lead>
        A Toyota Automated Logistics Software Project Engineer posting stopped me because the title sounded like software, but the work sounded like the role I have been trying to name.
      </Lead>

      <P>
        The position is not primarily asking one person to sit alone and write application code. It asks someone to enter a customer environment, understand the operation, help shape the software design, participate in installation and testing, coordinate with developers, train users, troubleshoot the complete system, and support the customer after turnover.
      </P>

      <Quote>
        The bridge is the person who understands both what the software does and what the operation needs it to survive.
      </Quote>

      <H2>Why this role matters</H2>

      <P>
        Warehouse automation does not fail inside neat professional categories. A symptom that appears to be software may originate in a sensor, physical alignment, network path, control condition, installation decision, data assumption, operator workaround, maintenance practice, or the interface between several of those layers.
      </P>

      <P>
        Someone must be able to stand inside that ambiguity, understand how material and information are supposed to move, isolate the actual mechanism, communicate clearly with specialist developers and engineers, and preserve a usable receipt for the next handoff.
      </P>

      <BulletGrid
        items={[
          {
            title: "Customer operation",
            body: "Observe the real workflow, exceptions, constraints, safety boundaries, informal knowledge, and failure conditions before treating the software requirement as complete.",
          },
          {
            title: "Software coordination",
            body: "Translate field conditions into implementable requirements, reproducible defects, acceptance criteria, priorities, and developer-ready handoffs.",
          },
          {
            title: "Whole-system QA",
            body: "Test the interaction among equipment, controls, networks, applications, data, interfaces, maintenance, and human work rather than validating each layer in isolation.",
          },
          {
            title: "Turnover and support",
            body: "Train the user, preserve the rationale, expose unresolved risk, document the recovery path, and remain accountable after installation day.",
          },
        ]}
      />

      <H2>Field case: 48 chutes, one upstream cause</H2>

      <P>
        One recurring fault on a new mail-sorting system initially looked like a control or pneumatic-discharge problem. Programming changes were attempted on the air system that moved packages from the conveyors into the bulk chutes. The failures continued because the software was downstream of the actual mechanism.
      </P>

      <P>
        The bulk chutes did not consistently provide enough slope for the package mix. Individual parcels stalled, additional packages accumulated behind them, and the pile moved only after the growing stack overcame its angle of repose. In other locations, improperly installed chute material or a protruding transition edge created a physical catch point.
      </P>

      <P>
        A photoeye near the top of a chute interpreted one stalled package as a full chute. That single blocked sensor could fault an entire bulk-feed line—approximately one sixth of the machine’s bulk-supply capacity. The condition occurred multiple times per minute across multiple chutes and feed lines, converting small physical interruptions into repeated system-level downtime.
      </P>

      <EvidencePhoto
        src={edgeInterference}
        alt="Diagnostic diagram showing a package stalled at a protruding chute transition, blocking a photoeye and faulting the upstream bulk feed line"
        caption="Diagnostic mechanism diagram based on Mason Perry’s field observations and supplied photographs: the physical catch point was upstream of the software response."
      />

      <P>
        The permanent corrective action was physical and systematic: rebolt all 48 chutes so the surfaces lay flat and maintained usable slope, then grind roughly ten interfaces where chute material or an edge could impede mail flow. The goal was not to silence the fault. It was to eliminate the condition the fault was correctly reporting.
      </P>

      <Quote>
        We did not fix the problem by tuning the code. We fixed the physical truth the code was reporting.
      </Quote>

      <H2>Toyota equipment is already part of my operating floor</H2>

      <P>
        My current facility scope includes approximately 40 Toyota electric pallet jacks and 28 Toyota forklifts, in addition to the building’s conveyors, scanning systems, docks, controls, electrical infrastructure, mechanical systems, and supporting equipment. That gives me a view across logistics, operations, maintenance, vendor coordination, and management—not only one technical layer.
      </P>

      <P>
        During my first five weeks as a Building Equipment Mechanic, I encountered a recurring hydraulic-pump contactor failure on Toyota pallet jacks. The relay failed closed, so connecting the battery energized the hydraulic pump continuously. The key switch could not shut it down. The same failure pattern appeared repeatedly, and the failed French-made HPI 24-volt contactor—an approximately $300 component—was preserved in the maintenance cage so Toyota service and warranty personnel could observe the condition rather than receive only a verbal description.
      </P>

      <P>
        I have also diagnosed a failed Curtis controller—the electronic “brain” of another pallet jack—and identified hydraulic pickup hoses degrading or melting when fluid temperatures rise under sustained use. The work is not merely swapping components. It is preserving the failure state, separating symptom from mechanism, coordinating with the manufacturer, restoring service safely, and looking for recurrence across the fleet.
      </P>

      <BulletGrid
        items={[
          {
            title: "Toyota fleet exposure",
            body: "Approximately 68 Toyota material-handling units across pallet jacks and forklifts operating inside a live logistics facility.",
          },
          {
            title: "Warranty coordination",
            body: "Preserve failed components and operating conditions so Toyota technicians can inspect evidence, reproduce the fault, and support a durable warranty decision.",
          },
          {
            title: "Controls diagnosis",
            body: "Fault isolation across contactors, key circuits, hydraulic pumps, Curtis controllers, wiring, heat, hoses, and operator-observed symptoms.",
          },
          {
            title: "Whole-building visibility",
            body: "Material handling, conveyors, OCR and scanning, sensors, controls, docks, networking, electrical systems, mechanical systems, maintenance, and operations.",
          },
        ]}
      />

      <H2>Mission-critical changes the standard</H2>

      <P>
        USPS is a mission-critical national supply chain. Safety comes first. Immediately after safety, the operating priority is keeping the mail moving. Every craft, operation, maintenance action, escalation, and recovery decision exists inside that continuity requirement.
      </P>

      <P>
        In that environment, one stalled package can block one photoeye, stop one feed line, remove a significant share of machine capacity, and create consequences far beyond the original fault. A useful project engineer must understand both the local mechanism and the operational cascade: isolate quickly, recover safely, communicate clearly, and then remove the root cause rather than normalize repeated interruption.
      </P>

      <Quote>
        In mission-critical logistics, uptime is not an abstract dashboard metric. It is whether the work reaches the next person on time.
      </Quote>

      <H2>Why ORI TAC Ops came from the floor</H2>

      <P>
        ORI TAC Ops grew from this operating reality. It is a human-in-the-loop recovery concept for degraded logistics operations: make the condition visible, bring the correct experts and evidence together, preserve authority, coordinate recovery, and leave a usable receipt for the next shift or technical team.
      </P>

      <P>
        It is not a staffing-reduction argument and it is not a claim that software should replace the people who understand the operation. It is an attempt to give those people better continuity, source evidence, escalation paths, and recovery tools when the normal system is failing.
      </P>

      <H2>A small software example of the same method</H2>

      <P>
        A fresh NULLWORKS AI workroom originally required 94 seconds to recover the current company floor. We improved it to 11 instrumented seconds without changing the model.
      </P>

      <P>
        We redesigned the work: separated current state from history, created a known entry point, removed an unreliable live connector from the critical path, reduced the required source reads, defined readiness, and required a receipt.
      </P>

      <P>
        That is the same reasoning I bring to warehouse software implementation. Do not immediately add more capability. First make the actual flow visible. Identify the constraint. Clarify ownership. Preserve evidence. Improve the handoff. Then measure the result.
      </P>

      <H2>Then the application became the assessment</H2>

      <P>
        While this page and a separate Voice Foundry deployment were being completed, two independent AI workrooms encountered related failures inside the same GitHub-to-Vercel production path. Both had source work that appeared complete. Both lacked a defensible customer-visible destination.
      </P>

      <P>
        I recognized the shared pattern, connected the workrooms through one durable coordination issue, divided responsibility, piped Vercel failure notices directly from Gmail, rejected guessed hostnames, moved the repair to direct routes on main, and kept the finish line open until both pages rendered from the real production domain on my phone.
      </P>

      <div className="my-10 overflow-hidden rounded-[26px] border border-[#b7c73c]/45 bg-[#081014] p-6 text-[#f7f3e8] shadow-[0_24px_70px_rgba(8,16,20,.24)] sm:p-8">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d7ff3f]">Live application field receipt</div>
        <h3 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">The best evidence for the application did not exist until the application broke.</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#c2c8c2] sm:text-base">
          The incident reproduced the role&apos;s real bridge work: customer-visible failure, cross-system diagnosis, software coordination, acceptance testing, evidence preservation, and final human verification.
        </p>
        <a href="/field-notes/the-application-became-the-assessment" className="mt-6 inline-flex items-center rounded-full bg-[#d7ff3f] px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#0b0d08] no-underline">
          Read the complete deployment case study →
        </a>
      </div>

      <H2>What I would bring to the role</H2>

      <BulletGrid
        items={[
          {
            title: "Mission-critical industrial credibility",
            body: "Hands-on troubleshooting and recovery inside an uptime-sensitive national logistics network where safety and continuity govern the work.",
          },
          {
            title: "Toyota fleet and service coordination",
            body: "Direct maintenance exposure to Toyota pallet jacks and forklifts, recurring-failure preservation, warranty interaction, and manufacturer-facing evidence.",
          },
          {
            title: "Whole-system root cause",
            body: "The ability to move across physical flow, installation, sensors, controls, software, maintenance, and human workflow without stopping at the first plausible explanation.",
          },
          {
            title: "Software-speed fabrication",
            body: "Rapid AI-assisted prototyping, QA, debugging, documentation, telemetry, and implementation framing without pretending that prototypes are production systems.",
          },
          {
            title: "Human-centered operational architecture",
            body: "Visible authority, review gates, source receipts, escalation, training, recovery, and continuity designed around the expert doing the work.",
          },
        ]}
      />

      <H2>The honest gaps</H2>

      <P>
        I do not present myself as the deepest conventional software developer in the room. My degree is not in engineering, and I do not claim years of production SQL Server or Oracle administration.
      </P>

      <P>
        I bring the operation, systems reasoning, customer translation, field troubleshooting, implementation discipline, manufacturer coordination, and rapidly expanding software fluency. The best team would pair that bridge capability with strong production engineers who can harden, secure, scale, and maintain the final platform.
      </P>

      <TruthBox title="Application truth boundary">
        This is an independent recruiter-facing application field case. It does not claim employment by, endorsement from, affiliation with, or participation by Toyota Automated Logistics. Toyota equipment counts and maintenance examples describe Mason Perry’s current facility experience. The diagnostic visual is an original diagram based on Mason’s observations and supplied photographs; it is not presented as an unaltered site photograph. ORI TAC Ops is a developing human-in-the-loop operating concept, not a claim of USPS approval or production deployment. Prototype work is not represented as unverified production experience.
      </TruthBox>

      <H2>The bridge</H2>

      <P>
        Companies installing software into real operations often separate the people who understand the work from the people who build the technology. The project engineer exists because that separation creates risk.
      </P>

      <P>
        My strongest contribution is standing in that gap: understanding the physical operation well enough to protect reality, understanding the software process well enough to coordinate it, and designing the handoffs, evidence, telemetry, and human controls that keep the entire system recoverable.
      </P>

      <Quote>
        When physical operations and software meet, the bridge is not secondary architecture. The bridge is where the system becomes real.
      </Quote>
    </FieldNoteShell>
  );
}
