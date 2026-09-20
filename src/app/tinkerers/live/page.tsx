"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { LiveSnapshot } from "@/lib/tinkerers-contract";

const EMPTY: LiveSnapshot = {
  experiment_id: "NW-PHX-001",
  contract_version: "1.0.0",
  sessions: 0,
  completed: 0,
  worker_pass: 0,
  worker_fail: 0,
  worker_unclear: 0,
  evidence_pass: 0,
  evidence_fail: 0,
  evidence_indeterminate: 0,
  qc_agrees: 0,
  qc_disagrees: 0,
  qc_indeterminate: 0,
  qc_pass: 0,
  qc_fail: 0,
  qc_unclear: 0,
  human_accept: 0,
  human_reject: 0,
  human_challenge: 0,
  worker_models: {},
  label: "SELF-REPORTED",
};

function Cell({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={cell}>
      <div style={kicker}>{label}</div>
      <div style={cellValue}>{value}</div>
    </div>
  );
}

export default function TinkerersLivePage() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(EMPTY);
  const [status, setStatus] = useState("connecting");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const response = await fetch("/api/tinkerers/live", { cache: "no-store" });
        const body = await response.json();
        if (!alive) return;
        if (body?.ok && body.snapshot) {
          setSnapshot(body.snapshot);
          setStatus("live");
        } else {
          setStatus("degraded");
        }
      } catch {
        if (alive) setStatus("degraded");
      }
    };
    pull();
    const timer = window.setInterval(pull, 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const models = Object.entries(snapshot.worker_models || {});

  return (
    <main style={shell}>
      <div style={frame}>
        <div style={kicker}>
          NULLWORKS // ROOM TELEMETRY // {snapshot.experiment_id} // v{snapshot.contract_version}
        </div>
        <h1 style={title}>The room is the experiment.</h1>
        <p style={muted}>Anonymous aggregates only. No names. No emails. No raw prompts. Status: {status}.</p>

        <h2 style={level}>TOTAL / COMPLETED EXPERIMENTS</h2>
        <section style={grid}>
          <Cell label="SESSIONS" value={snapshot.sessions} />
          <Cell label="COMPLETED" value={snapshot.completed} />
        </section>

        <h2 style={level}>WORKER CLAIM</h2>
        <section style={grid}>
          <Cell label="PASS" value={snapshot.worker_pass} />
          <Cell label="FAIL" value={snapshot.worker_fail} />
          <Cell label="UNCLEAR" value={snapshot.worker_unclear} />
        </section>

        <h2 style={level}>AI QC CLAIM</h2>
        <section style={grid}>
          <Cell label="PASS" value={snapshot.qc_pass || 0} />
          <Cell label="FAIL" value={snapshot.qc_fail || 0} />
          <Cell label="UNCLEAR" value={snapshot.qc_unclear || 0} />
        </section>

        <h2 style={level}>OBSERVED EVIDENCE</h2>
        <section style={grid}>
          <Cell label="PASS" value={snapshot.evidence_pass} />
          <Cell label="FAIL" value={snapshot.evidence_fail} />
          <Cell label="INDETERMINATE" value={snapshot.evidence_indeterminate} />
        </section>

        <h2 style={level}>QC ↔ EVIDENCE</h2>
        <section style={grid}>
          <Cell label="AGREE" value={snapshot.qc_agrees} />
          <Cell label="DISAGREE" value={snapshot.qc_disagrees} />
          <Cell label="INDETERMINATE" value={snapshot.qc_indeterminate} />
        </section>

        <h2 style={level}>HUMAN DISPOSITION</h2>
        <section style={grid}>
          <Cell label="ACCEPT" value={snapshot.human_accept} />
          <Cell label="REJECT" value={snapshot.human_reject} />
          <Cell label="CHALLENGE" value={snapshot.human_challenge} />
        </section>

        <h2 style={level}>MODEL PARTICIPATION</h2>
        <p style={muted}>SELF-REPORTED. Not a benchmark. Do not rank models.</p>
        <section style={grid}>
          {["ChatGPT", "Claude", "Gemini", "Grok", "Copilot", "Other"].map((model) => (
            <Cell key={model} label={model.toUpperCase()} value={snapshot.worker_models?.[model] || 0} />
          ))}
          {models
            .filter(([name]) => !["ChatGPT", "Claude", "Gemini", "Grok", "Copilot", "Other"].includes(name))
            .map(([name, count]) => (
              <Cell key={name} label={name.toUpperCase()} value={count} />
            ))}
        </section>

        <button onClick={() => setReveal((value) => !value)} style={ghostBtn}>
          {reveal ? "HIDE LEVEL 5" : "REVEAL LEVEL 5"}
        </button>

        {reveal && (
          <section style={revealCard}>
            <h2 style={level}>The architecture applied to its own presentation</h2>
            <p>AI Tinkerers used an AI reviewer on a proposal about AI evaluating AI.</p>
            <p>
              <b>RECOMMENDATION 1</b>
              <br />
              HUMAN DISPOSITION: ACCEPTED
              <br />
              Reason: Improves technical transparency.
            </p>
            <p>
              <b>RECOMMENDATION 2</b>
              <br />
              HUMAN DISPOSITION: REJECTED
              <br />
              Reason: Conflicts with model-agnostic design requirement.
            </p>
            <h2 style={thesis}>
              THE WORKER CAN BE WRONG.
              <br />
              THE CHECKER CAN BE WRONG.
              <br />
              THE HUMAN CAN BE WRONG.
            </h2>
            <b>KEEP THE RECEIPTS.</b>
          </section>
        )}
      </div>
    </main>
  );
}

const shell: CSSProperties = {
  minHeight: "100vh",
  background: "#06110f",
  color: "#eef2ef",
  fontFamily: "system-ui, sans-serif",
  overflowX: "hidden",
};

const frame: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "28px 16px calc(72px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  width: "100%",
};

const title: CSSProperties = {
  fontSize: "clamp(36px, 7vw, 72px)",
  lineHeight: 0.94,
  margin: "12px 0 8px",
};

const muted: CSSProperties = { color: "#9aa8a4" };

const level: CSSProperties = {
  letterSpacing: "0.06em",
  fontSize: "clamp(16px, 3vw, 22px)",
  margin: "28px 0 12px",
};

const kicker: CSSProperties = {
  letterSpacing: "0.16em",
  fontSize: 12,
  fontWeight: 800,
  color: "#8b9894",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const cell: CSSProperties = {
  border: "1px solid #31403d",
  borderRadius: 18,
  padding: "18px 16px",
  background: "#0c1816",
};

const cellValue: CSSProperties = {
  fontSize: "clamp(32px, 6vw, 64px)",
  fontWeight: 900,
  lineHeight: 1.05,
  marginTop: 8,
};

const ghostBtn: CSSProperties = {
  marginTop: 36,
  padding: "14px 18px",
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #71807c",
  background: "#101b1a",
  color: "#eef2ef",
  fontWeight: 800,
};

const revealCard: CSSProperties = {
  marginTop: 24,
  border: "1px solid #52625e",
  borderRadius: 20,
  padding: 24,
};

const thesis: CSSProperties = {
  lineHeight: 1.15,
  marginTop: 28,
};
