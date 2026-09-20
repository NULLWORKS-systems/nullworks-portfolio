"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  CONTRACT_VERSION,
  EXPERIMENT_ID,
  MODELS,
  WORKER_PROMPT,
  buildQcPrompt,
  qcEvidenceRelation,
  type Claim,
  type HumanDisposition,
  type SelfReportedModel,
  type ValidatorResult,
  validateWorkerArtifact,
} from "@/lib/tinkerers-contract";

const DISCLOSURE =
  "Anonymous live experiment. Do not paste private, confidential, or sensitive information. Experiment outputs may be retained for demo/research analysis.";

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function TinkerersRunPage() {
  const [step, setStep] = useState(0);
  const [session] = useState(newSessionId);
  const [modelWorker, setModelWorker] = useState<SelfReportedModel>("ChatGPT");
  const [modelQc, setModelQc] = useState<SelfReportedModel>("ChatGPT");
  const [sameQc, setSameQc] = useState(true);
  const [worker, setWorker] = useState("");
  const [qc, setQc] = useState("");
  const [workerClaim, setWorkerClaim] = useState<Claim>("UNCLEAR");
  const [qcClaim, setQcClaim] = useState<Claim>("UNCLEAR");
  const [human, setHuman] = useState<HumanDisposition | "">("");
  const [challenge, setChallenge] = useState("");
  const [copied, setCopied] = useState("");
  const [serverEvidence, setServerEvidence] = useState<ValidatorResult | null>(null);
  const [ledger, setLedger] = useState<"SERVER_DURABLE" | "LOCAL_ONLY" | "PENDING">("PENDING");
  const [receiptId, setReceiptId] = useState(session);
  const [hashes, setHashes] = useState<{ worker?: string; qc?: string }>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const localEvidence = useMemo(() => validateWorkerArtifact(worker), [worker]);
  const evidence = serverEvidence || localEvidence;
  const relation = qcEvidenceRelation(qcClaim, evidence.verdict);

  const markCopied = (label: string) => {
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  };

  const lockWorker = async () => {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/tinkerers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_output: worker }),
      });
      const body = await response.json();
      if (body?.ok && body.result) setServerEvidence(body.result);
      else setServerEvidence(null);
    } catch {
      setServerEvidence(null);
    } finally {
      setBusy(false);
      setStep(2);
    }
  };

  const issueReceipt = async () => {
    if (!human) return;
    setBusy(true);
    setNote("");
    const payload = {
      session,
      model_worker: modelWorker,
      model_qc: sameQc ? modelWorker : modelQc,
      worker_claim: workerClaim,
      qc_claim: qcClaim,
      worker_output: worker,
      qc_output: qc,
      human_disposition: human,
      challenge_text: human === "CHALLENGE" ? challenge : "",
    };
    try {
      const response = await fetch("/api/tinkerers/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (body?.ok && body.receipt) {
        setLedger("SERVER_DURABLE");
        setReceiptId(body.receipt.session);
        setHashes({
          worker: body.receipt.worker_output_sha256,
          qc: body.receipt.qc_output_sha256,
        });
        if (body.validator) setServerEvidence(body.validator);
      } else {
        setLedger("LOCAL_ONLY");
        setNote("Live ledger unavailable. Local receipt issued. The experiment still completed.");
      }
    } catch {
      setLedger("LOCAL_ONLY");
      setNote("Conference network missed the ledger. Local receipt issued.");
    } finally {
      setBusy(false);
      setStep(5);
    }
  };

  const btn = (active: boolean): CSSProperties => ({
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid #71807c",
    fontWeight: 800,
    fontSize: 16,
    margin: "6px 6px 6px 0",
    background: active ? "#eef2ef" : "#101b1a",
    color: active ? "#071311" : "#eef2ef",
  });

  return (
    <main style={{ minHeight: "100vh", background: "#06110f", color: "#eef2ef" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 18px 96px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ letterSpacing: 3, fontWeight: 900, fontSize: 12 }}>
          NULLWORKS // {EXPERIMENT_ID} // v{CONTRACT_VERSION}
        </div>
        <h1 style={{ fontSize: "clamp(40px,10vw,70px)", lineHeight: 0.94, margin: "12px 0 8px" }}>Run it yourself.</h1>
        <p style={{ fontSize: 18, color: "#c7d0cd", marginTop: 0 }}>
          Your AI. Same frozen contract. Deterministic evidence. Human authority.
        </p>
        <p style={{ fontSize: 13, color: "#9aa8a4", lineHeight: 1.55, borderLeft: "3px solid #3d524d", paddingLeft: 12 }}>
          {DISCLOSURE}
        </p>

        {step === 0 && (
          <section>
            <h2>Choose your AI</h2>
            <p style={{ color: "#9aa8a4" }}>Self-reported. No login. No API keys. This is not a model leaderboard.</p>
            {MODELS.map((model) => (
              <button key={model} style={btn(modelWorker === model)} onClick={() => setModelWorker(model)}>
                {model}
              </button>
            ))}
            <p>
              <button style={btn(true)} onClick={() => setStep(1)}>
                BEGIN LEVEL 1 →
              </button>
            </p>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2>Level 1 · Worker</h2>
            <p>Copy this frozen task into {modelWorker}. Paste the complete raw response before anyone evaluates it.</p>
            <button
              style={btn(false)}
              onClick={async () => {
                if (await copyText(WORKER_PROMPT)) markCopied("worker");
              }}
            >
              {copied === "worker" ? "COPIED" : "COPY WORKER TEST"}
            </button>
            <textarea
              value={worker}
              onChange={(event) => setWorker(event.target.value)}
              placeholder="Paste the complete raw worker output"
              style={areaStyle}
            />
            <p>What did the worker claim?</p>
            {(["PASS", "FAIL", "UNCLEAR"] as Claim[]).map((claim) => (
              <button key={claim} style={btn(workerClaim === claim)} onClick={() => setWorkerClaim(claim)}>
                {claim}
              </button>
            ))}
            <p>
              <button disabled={!worker.trim() || busy} style={btn(true)} onClick={lockWorker}>
                LOCK OUTPUT →
              </button>
            </p>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2>Level 2 · AI QC</h2>
            <p>Ask an AI to judge the exact frozen worker output. Same model or a different one.</p>
            <label style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0" }}>
              <input
                type="checkbox"
                checked={sameQc}
                onChange={(event) => setSameQc(event.target.checked)}
              />
              Use the same AI ({modelWorker})
            </label>
            {!sameQc &&
              MODELS.map((model) => (
                <button key={model} style={btn(modelQc === model)} onClick={() => setModelQc(model)}>
                  {model}
                </button>
              ))}
            <p>
              <button
                style={btn(false)}
                onClick={async () => {
                  if (await copyText(buildQcPrompt(worker))) markCopied("qc");
                }}
              >
                {copied === "qc" ? "COPIED" : "COPY QC TEST"}
              </button>
            </p>
            <textarea
              value={qc}
              onChange={(event) => setQc(event.target.value)}
              placeholder="Paste the complete raw QC output"
              style={areaStyle}
            />
            <p>QC verdict</p>
            {(["PASS", "FAIL", "UNCLEAR"] as Claim[]).map((claim) => (
              <button key={claim} style={btn(qcClaim === claim)} onClick={() => setQcClaim(claim)}>
                {claim}
              </button>
            ))}
            <p>
              <button disabled={!qc.trim()} style={btn(true)} onClick={() => setStep(3)}>
                MEASURE REALITY →
              </button>
            </p>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2>Level 3 · Evidence</h2>
            <p style={{ color: "#9aa8a4" }}>
              Deterministic TypeScript validator. Not an LLM. {serverEvidence ? "Server measurement used." : "Local measurement (server unreachable)."}
            </p>
            {evidence.requirements.map((item) => (
              <div key={item.id} style={rowStyle}>
                <div>
                  <div>{item.requirement}</div>
                  <div style={{ color: "#8b9894", fontSize: 13 }}>
                    expected {item.expected} · observed {item.observed}
                  </div>
                </div>
                <b>{item.verdict}</b>
              </div>
            ))}
            <h3>Worker claim: {workerClaim}</h3>
            <h3>AI QC verdict: {qcClaim}</h3>
            <h3>Deterministic evidence: {evidence.verdict}</h3>
            <p style={{ color: "#c7d0cd" }}>
              {relation === "AGREE" && "QC agrees with evidence."}
              {relation === "DISAGREE" && "QC contradicts deterministic evidence."}
              {relation === "INDETERMINATE" && "Agreement is indeterminate."}
            </p>
            <button style={btn(true)} onClick={() => setStep(4)}>
              HUMAN AUTHORITY →
            </button>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2>Level 4 · Human Authority</h2>
            <p>
              Worker: {workerClaim}
              <br />
              AI QC: {qcClaim}
              <br />
              Evidence: {evidence.verdict}
            </p>
            <p style={{ color: "#9aa8a4" }}>Authorization terminates at an identifiable human. That is not the same as infallibility.</p>
            {(["ACCEPT", "REJECT", "CHALLENGE"] as HumanDisposition[]).map((item) => (
              <button key={item} style={btn(human === item)} onClick={() => setHuman(item)}>
                {item}
              </button>
            ))}
            {human === "CHALLENGE" && (
              <textarea
                value={challenge}
                onChange={(event) => setChallenge(event.target.value)}
                placeholder="Optional challenge explanation"
                style={areaStyle}
              />
            )}
            <p>
              <button disabled={!human || busy} style={btn(true)} onClick={issueReceipt}>
                ISSUE RECEIPT →
              </button>
            </p>
          </section>
        )}

        {step === 5 && (
          <section>
            <h2>Level 5 · Receipt</h2>
            <div style={{ border: "1px solid #52625e", borderRadius: 18, padding: 22, lineHeight: 1.8 }}>
              NULLWORKS
              <br />
              {EXPERIMENT_ID}
              <br />
              contract {CONTRACT_VERSION}
              <br />
              <br />
              session: {receiptId}
              <br />
              <br />
              worker: {modelWorker}
              <br />
              worker claim: {workerClaim}
              <br />
              <br />
              QC: {sameQc ? modelWorker : modelQc}
              <br />
              QC verdict: {qcClaim}
              <br />
              <br />
              evidence: {evidence.verdict}
              <br />
              <br />
              human disposition: {human}
              <br />
              <br />
              raw worker preserved: YES
              <br />
              raw QC preserved: YES
              <br />
              ledger: {ledger}
              {hashes.worker ? (
                <>
                  <br />
                  worker sha256: {hashes.worker.slice(0, 16)}…
                </>
              ) : null}
            </div>
            {note && <p style={{ color: "#d7c27a" }}>{note}</p>}
            <h2 style={{ lineHeight: 1.15 }}>
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

const areaStyle: CSSProperties = {
  width: "100%",
  minHeight: 180,
  padding: 14,
  fontSize: 16,
  boxSizing: "border-box",
  marginTop: 10,
  background: "#0c1816",
  color: "#eef2ef",
  border: "1px solid #31403d",
  borderRadius: 12,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 0",
  borderBottom: "1px solid #31403d",
};
