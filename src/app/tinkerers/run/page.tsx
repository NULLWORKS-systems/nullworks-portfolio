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

function PromptCard({
  title,
  body,
  copied,
  copyLabel,
  onCopy,
}: {
  title: string;
  body: string;
  copied: boolean;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div style={promptCard}>
      <div style={kicker}>FROZEN PROMPT · INSPECT BEFORE COPY</div>
      <div style={{ fontWeight: 800, margin: "8px 0 10px" }}>{title}</div>
      <pre style={promptPre}>{body}</pre>
      <button style={primaryBtn} onClick={onCopy}>
        {copied ? "COPIED" : copyLabel}
      </button>
    </div>
  );
}

function Layer({
  kind,
  title,
  value,
}: {
  kind: "claim" | "observed" | "human";
  title: string;
  value: string;
}) {
  const tag = kind === "claim" ? "AI CLAIM" : kind === "observed" ? "OBSERVED" : "HUMAN CALL";
  return (
    <div style={layerCard}>
      <div style={kicker}>{tag}</div>
      <div style={{ color: "#9aa8a4", marginTop: 4 }}>{title}</div>
      <div style={boardValue}>{value}</div>
    </div>
  );
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
  const qcModel = sameQc ? modelWorker : modelQc;
  const qcPrompt = buildQcPrompt(worker);
  const countReq = evidence.requirements.find((item) => item.id === "count");
  const logicalLines = countReq ? Number(countReq.observed) : 0;
  const semanticBlocks = (worker.match(/BLOCK\s+[1-5]\s*:/gi) || []).length;
  const workerDisagrees =
    workerClaim !== "UNCLEAR" && evidence.verdict !== "INDETERMINATE" && workerClaim !== evidence.verdict;
  const humanDisagrees =
    !!human &&
    human !== "CHALLENGE" &&
    evidence.verdict !== "INDETERMINATE" &&
    ((human === "ACCEPT" && evidence.verdict === "FAIL") ||
      (human === "REJECT" && evidence.verdict === "PASS"));

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
      model_qc: qcModel,
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

  return (
    <main style={shell}>
      <div style={frame}>
        <div style={kicker}>NULLWORKS // {EXPERIMENT_ID} // v{CONTRACT_VERSION}</div>
        <h1 style={title}>Run it yourself.</h1>
        <p style={lead}>Your AI. Same frozen contract. Deterministic evidence. Human authority.</p>
        <p style={disclosure}>{DISCLOSURE}</p>
        <div style={legend}>
          <div><b>AI CLAIM</b> = what a model said. Not proof.</div>
          <div><b>OBSERVED</b> = what NULLWORKS measured against the frozen contract.</div>
          <div><b>HUMAN CALL</b> = your disposition. Final authority, not infallibility.</div>
        </div>

        {step === 0 && (
          <section>
            <h2 style={level}>CHOOSE YOUR AI</h2>
            <p style={muted}>Self-reported. No login. No API keys. This is not a model leaderboard.</p>
            <div style={chipRow}>
              {MODELS.map((model) => (
                <button key={model} style={chip(modelWorker === model)} onClick={() => setModelWorker(model)}>
                  {model}
                </button>
              ))}
            </div>
            <button style={primaryBtn} onClick={() => setStep(1)}>
              BEGIN LEVEL 1 →
            </button>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 style={level}>LEVEL 1 · AI WORKER</h2>
            <p>
              Inspect the frozen worker prompt first. Then paste it into {modelWorker}. Then paste the complete raw response back here. Do not evaluate yet.
            </p>
            <PromptCard
              title="Worker prompt"
              body={WORKER_PROMPT}
              copied={copied === "worker"}
              copyLabel="COPY WORKER TEST"
              onCopy={async () => {
                if (await copyText(WORKER_PROMPT)) markCopied("worker");
              }}
            />
            <p style={{ marginTop: 22 }}>Paste the complete raw worker output</p>
            <textarea
              value={worker}
              onChange={(event) => setWorker(event.target.value)}
              placeholder="Paste everything the worker AI returned"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              style={areaStyle}
            />
            <p style={{ marginTop: 18 }}>
              <span style={kicker}>AI CLAIM</span>
              <br />
              What did {modelWorker} claim? This is the model talking about itself. It is not the measurement.
            </p>
            <div style={chipRow}>
              {(["PASS", "FAIL", "UNCLEAR"] as Claim[]).map((claim) => (
                <button key={claim} style={chip(workerClaim === claim)} onClick={() => setWorkerClaim(claim)}>
                  AI CLAIMED {claim}
                </button>
              ))}
            </div>
            <button disabled={!worker.trim() || busy} style={primaryBtn} onClick={lockWorker}>
              LOCK OUTPUT →
            </button>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 style={level}>LEVEL 2 · AI QUALITY CHECKER</h2>
            <p>
              Inspect the frozen QC prompt, including the locked worker output. Then paste it into an AI. Then paste the complete raw QC response back here.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0 18px" }}>
              <input type="checkbox" checked={sameQc} onChange={(event) => setSameQc(event.target.checked)} />
              Use the same AI ({modelWorker})
            </label>
            {!sameQc && (
              <div style={chipRow}>
                {MODELS.map((model) => (
                  <button key={model} style={chip(modelQc === model)} onClick={() => setModelQc(model)}>
                    {model}
                  </button>
                ))}
              </div>
            )}
            <PromptCard
              title={`QC prompt for ${qcModel}`}
              body={qcPrompt}
              copied={copied === "qc"}
              copyLabel="COPY QC TEST"
              onCopy={async () => {
                if (await copyText(qcPrompt)) markCopied("qc");
              }}
            />
            <p style={{ marginTop: 22 }}>Paste the complete raw QC output</p>
            <textarea
              value={qc}
              onChange={(event) => setQc(event.target.value)}
              placeholder="Paste everything the checker AI returned"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              style={areaStyle}
            />
            <p style={{ marginTop: 18 }}>
              <span style={kicker}>AI CLAIM</span>
              <br />
              What did {qcModel} conclude? Another AI claim. Still not the measurement.
            </p>
            <div style={chipRow}>
              {(["PASS", "FAIL", "UNCLEAR"] as Claim[]).map((claim) => (
                <button key={claim} style={chip(qcClaim === claim)} onClick={() => setQcClaim(claim)}>
                  QC CLAIMED {claim}
                </button>
              ))}
            </div>
            <button disabled={!qc.trim()} style={primaryBtn} onClick={() => setStep(3)}>
              MEASURE REALITY →
            </button>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 style={level}>LEVEL 3 · EVIDENCE</h2>
            <p style={muted}>
              This block is not an AI. NULLWORKS compares the raw worker output to the frozen contract.
              {serverEvidence ? " Server measurement used." : " Local measurement (server unreachable)."}
            </p>
            <p style={muted}>CSS wrapping is not a newline. Semantic block labels and logical lines are independent observations.</p>
            <div style={measureGrid}>
              <div style={measureCard}>
                <div style={kicker}>SEMANTIC BLOCKS</div>
                <div style={measureValue}>{semanticBlocks}</div>
              </div>
              <div style={measureCard}>
                <div style={kicker}>LOGICAL LINES</div>
                <div style={measureValue}>{logicalLines}</div>
              </div>
              <div style={measureCard}>
                <div style={kicker}>REQUIRED LOGICAL LINES</div>
                <div style={measureValue}>5</div>
              </div>
              <div style={measureCard}>
                <div style={kicker}>RESULT</div>
                <div style={measureValue}>{evidence.verdict}</div>
              </div>
            </div>
            {evidence.requirements.map((item) => (
              <div key={item.id} style={rowStyle}>
                <div>
                  <div>{item.requirement}</div>
                  <div style={{ color: "#8b9894", fontSize: 13, overflowWrap: "anywhere" }}>
                    expected {item.expected}
                    <br />
                    observed {item.observed}
                  </div>
                </div>
                <b style={{ whiteSpace: "nowrap" }}>{item.verdict === "PASS" ? "OBSERVED PASS" : "OBSERVED FAIL"}</b>
              </div>
            ))}
            <div style={board}>
              <Layer kind="claim" title="AI worker claim" value={`${modelWorker} claimed ${workerClaim}`} />
              <Layer kind="claim" title="AI QC claim" value={`${qcModel} claimed ${qcClaim}`} />
              <Layer kind="observed" title="Observed evidence" value={`NULLWORKS observed ${evidence.verdict}`} />
            </div>
            <div style={calloutRow}>
              {workerDisagrees && <div style={callout}>WORKER ≠ EVIDENCE</div>}
              {relation === "DISAGREE" && <div style={callout}>AI QC ≠ EVIDENCE</div>}
            </div>
            <p style={{ color: "#c7d0cd" }}>
              {relation === "AGREE" && "The checker AI’s claim matches the observed measurement."}
              {relation === "DISAGREE" && "The checker AI’s claim contradicts the observed measurement."}
              {relation === "INDETERMINATE" && "Claim-versus-measurement agreement is indeterminate."}
            </p>
            <button style={primaryBtn} onClick={() => setStep(4)}>
              HUMAN AUTHORITY →
            </button>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2 style={level}>LEVEL 4 · HUMAN AUTHORITY</h2>
            <div style={board}>
              <Layer kind="claim" title="AI worker claim" value={`${modelWorker} claimed ${workerClaim}`} />
              <Layer kind="claim" title="AI QC claim" value={`${qcModel} claimed ${qcClaim}`} />
              <Layer kind="observed" title="Observed evidence" value={`NULLWORKS observed ${evidence.verdict}`} />
            </div>
            <div style={calloutRow}>
              {workerDisagrees && <div style={callout}>WORKER ≠ EVIDENCE</div>}
              {relation === "DISAGREE" && <div style={callout}>AI QC ≠ EVIDENCE</div>}
              {humanDisagrees && <div style={callout}>HUMAN ≠ EVIDENCE</div>}
            </div>
            <p style={muted}>Now you decide. ACCEPT / REJECT / CHALLENGE is your call, not another model score.</p>
            <div style={chipRow}>
              {(["ACCEPT", "REJECT", "CHALLENGE"] as HumanDisposition[]).map((item) => (
                <button key={item} style={chip(human === item)} onClick={() => setHuman(item)}>
                  HUMAN {item}
                </button>
              ))}
            </div>
            {human === "CHALLENGE" && (
              <textarea
                value={challenge}
                onChange={(event) => setChallenge(event.target.value)}
                placeholder="Optional challenge explanation"
                style={areaStyle}
              />
            )}
            <button disabled={!human || busy} style={primaryBtn} onClick={issueReceipt}>
              ISSUE RECEIPT →
            </button>
          </section>
        )}

        {step === 5 && (
          <section>
            <h2 style={level}>LEVEL 5 · RECEIPT</h2>
            <div style={receiptCard}>
              <div>NULLWORKS</div>
              <div>{EXPERIMENT_ID}</div>
              <div>contract {CONTRACT_VERSION}</div>

              <div style={receiptGroup}>
                <div style={kicker}>SESSION</div>
                <button
                  style={copyValue}
                  onClick={async () => {
                    if (await copyText(receiptId)) markCopied("session");
                  }}
                >
                  {receiptId}
                  <span style={copyHint}>{copied === "session" ? "COPIED" : "TAP TO COPY"}</span>
                </button>
              </div>

              <div style={receiptGroup}>
                <div style={kicker}>WORKER</div>
                <div>worker model: {modelWorker}</div>
                <div>AI worker claim: {workerClaim}</div>
              </div>

              <div style={receiptGroup}>
                <div style={kicker}>QC</div>
                <div>QC model: {qcModel}</div>
                <div>AI QC claim: {qcClaim}</div>
              </div>

              <div style={receiptGroup}>
                <div style={kicker}>EVIDENCE</div>
                <div>observed evidence: {evidence.verdict}</div>
              </div>

              <div style={receiptGroup}>
                <div style={kicker}>HUMAN</div>
                <div>human disposition: {human}</div>
              </div>

              <div style={calloutRow}>
                {workerDisagrees && <div style={callout}>WORKER ≠ EVIDENCE</div>}
                {relation === "DISAGREE" && <div style={callout}>AI QC ≠ EVIDENCE</div>}
                {humanDisagrees && <div style={callout}>HUMAN ≠ EVIDENCE</div>}
              </div>

              <div style={receiptGroup}>
                <div style={kicker}>PROVENANCE</div>
                <div>raw worker preserved: YES</div>
                <div>raw QC preserved: YES</div>
                <div>ledger: {ledger}</div>
                {hashes.worker ? (
                  <button
                    style={copyValue}
                    onClick={async () => {
                      if (await copyText(hashes.worker || "")) markCopied("whash");
                    }}
                  >
                    worker sha256:
                    <br />
                    {hashes.worker.slice(0, 16)}…
                    <span style={copyHint}>{copied === "whash" ? "COPIED" : "TAP TO COPY FULL HASH"}</span>
                  </button>
                ) : null}
                {hashes.qc ? (
                  <button
                    style={copyValue}
                    onClick={async () => {
                      if (await copyText(hashes.qc || "")) markCopied("qhash");
                    }}
                  >
                    QC sha256:
                    <br />
                    {hashes.qc.slice(0, 16)}…
                    <span style={copyHint}>{copied === "qhash" ? "COPIED" : "TAP TO COPY FULL HASH"}</span>
                  </button>
                ) : null}
              </div>
            </div>
            {note && <p style={{ color: "#d7c27a" }}>{note}</p>}
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
  overflowX: "hidden",
};

const frame: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "28px 16px calc(72px + env(safe-area-inset-bottom, 0px))",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
  width: "100%",
};

const title: CSSProperties = {
  fontSize: "clamp(36px, 10vw, 70px)",
  lineHeight: 0.94,
  margin: "12px 0 8px",
};

const lead: CSSProperties = { fontSize: 18, color: "#c7d0cd", marginTop: 0 };

const disclosure: CSSProperties = {
  fontSize: 13,
  color: "#8b9894",
  lineHeight: 1.55,
  borderLeft: "3px solid #3d524d",
  paddingLeft: 12,
};

const legend: CSSProperties = {
  margin: "18px 0 8px",
  padding: 14,
  border: "1px solid #31403d",
  borderRadius: 14,
  color: "#c7d0cd",
  lineHeight: 1.55,
  fontSize: 14,
};

const level: CSSProperties = {
  letterSpacing: "0.04em",
  fontSize: 22,
  margin: "22px 0 10px",
};

const muted: CSSProperties = { color: "#9aa8a4" };

const promptCard: CSSProperties = {
  marginTop: 14,
  padding: 14,
  border: "1px solid #52625e",
  borderRadius: 16,
  background: "#0c1816",
};

const promptPre: CSSProperties = {
  margin: "0 0 14px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
  lineHeight: 1.55,
  color: "#eef2ef",
};

const kicker: CSSProperties = {
  letterSpacing: "0.12em",
  fontSize: 11,
  fontWeight: 800,
  color: "#8b9894",
};

const chipRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "8px 0 16px",
};

function chip(active: boolean): CSSProperties {
  return {
    padding: "12px 14px",
    minHeight: 48,
    borderRadius: 999,
    border: "1px solid #71807c",
    fontWeight: 800,
    fontSize: 15,
    background: active ? "#eef2ef" : "#101b1a",
    color: active ? "#071311" : "#eef2ef",
  };
}

const primaryBtn: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 14,
  padding: "16px 18px",
  minHeight: 54,
  borderRadius: 16,
  border: "1px solid #eef2ef",
  background: "#eef2ef",
  color: "#071311",
  fontWeight: 800,
  fontSize: 16,
};

const areaStyle: CSSProperties = {
  width: "100%",
  minHeight: 200,
  padding: 14,
  fontSize: 16,
  lineHeight: 1.5,
  boxSizing: "border-box",
  marginTop: 10,
  background: "#0c1816",
  color: "#eef2ef",
  border: "1px solid #31403d",
  borderRadius: 12,
  resize: "vertical",
  overflowX: "hidden",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 0",
  borderBottom: "1px solid #31403d",
};

const board: CSSProperties = {
  display: "grid",
  gap: 12,
  margin: "18px 0",
};

const layerCard: CSSProperties = {
  border: "1px solid #31403d",
  borderRadius: 14,
  padding: 14,
  background: "#0c1816",
};

const boardValue: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  marginTop: 4,
  overflowWrap: "anywhere",
};

const measureGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  margin: "16px 0 8px",
};

const measureCard: CSSProperties = {
  border: "1px solid #31403d",
  borderRadius: 14,
  padding: 12,
  background: "#0c1816",
};

const measureValue: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginTop: 6,
};

const calloutRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "8px 0 12px",
};

const callout: CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #d7c27a",
  borderRadius: 999,
  fontWeight: 800,
  letterSpacing: "0.04em",
  fontSize: 13,
  color: "#d7c27a",
};

const receiptCard: CSSProperties = {
  border: "1px solid #52625e",
  borderRadius: 18,
  padding: 22,
  lineHeight: 1.7,
  overflowWrap: "anywhere",
};

const receiptGroup: CSSProperties = {
  marginTop: 22,
};

const copyValue: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  marginTop: 8,
  padding: 0,
  border: 0,
  background: "transparent",
  color: "#eef2ef",
  font: "inherit",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const copyHint: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 11,
  letterSpacing: "0.12em",
  color: "#8b9894",
  fontWeight: 800,
};

const thesis: CSSProperties = {
  lineHeight: 1.15,
  marginTop: 36,
  marginBottom: 12,
};
