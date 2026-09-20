import { createHash } from "node:crypto";
import {
  CONTRACT_VERSION,
  EXPERIMENT_ID,
  type Claim,
  type EvidenceVerdict,
  type HumanDisposition,
  type LiveSnapshot,
  type ValidatorResult,
} from "@/lib/tinkerers-contract";

export type { LiveSnapshot };

const SUPABASE_URL = (
  process.env.TINKERERS_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://foveyfclihpsnwhfchib.supabase.co"
).replace(/\/$/, "");

const SUPABASE_KEY =
  process.env.TINKERERS_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_dwKE-u6b2hjRhoC9f-P_jw_S_m__cmR";

export type TinkerersSessionInput = {
  id?: string;
  model_worker: string;
  model_qc: string;
  qc_same_model: boolean;
  worker_claim: Claim;
  qc_claim: Claim;
  worker_output: string;
  qc_output: string;
  human_disposition: HumanDisposition;
  challenge_text?: string;
};

export type TinkerersReceipt = {
  experiment_id: string;
  contract_version: string;
  session: string;
  worker: string;
  worker_claim: Claim;
  qc: string;
  qc_verdict: Claim;
  evidence: EvidenceVerdict;
  human_disposition: HumanDisposition;
  raw_worker_preserved: boolean;
  raw_qc_preserved: boolean;
  worker_output_sha256: string;
  qc_output_sha256: string;
  ledger: "SERVER_DURABLE" | "LOCAL_ONLY";
};

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function persistTinkerersSession(input: TinkerersSessionInput, validator: ValidatorResult) {
  const workerHash = sha256(input.worker_output);
  const qcHash = sha256(input.qc_output);
  const row = {
    id: input.id || undefined,
    experiment_id: EXPERIMENT_ID,
    contract_version: CONTRACT_VERSION,
    model_worker: input.model_worker,
    model_qc: input.model_qc,
    qc_same_model: input.qc_same_model,
    worker_claim: input.worker_claim,
    qc_claim: input.qc_claim,
    evidence_verdict: validator.verdict,
    human_disposition: input.human_disposition,
    challenge_text: input.challenge_text || null,
    worker_output: input.worker_output,
    qc_output: input.qc_output,
    validator_result: validator,
    worker_output_sha256: workerHash,
    qc_output_sha256: qcHash,
    completed_at: new Date().toISOString(),
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/tinkerers_sessions`, {
    method: "POST",
    cache: "no-store",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new TinkerersStoreError(
      "LEDGER_WRITE_FAILED",
      body?.message || body?.hint || `Ledger write failed with HTTP ${response.status}.`,
      response.status,
      body,
    );
  }
  return (Array.isArray(body) ? body[0] : body) as { id: string };
}

export async function fetchLiveSnapshot(): Promise<LiveSnapshot> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tinkerers_live_snapshot`, {
    method: "POST",
    cache: "no-store",
    headers: headers(),
    body: "{}",
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new TinkerersStoreError(
      "LIVE_UNAVAILABLE",
      body?.message || `Live snapshot failed with HTTP ${response.status}.`,
      response.status,
      body,
    );
  }
  return body as LiveSnapshot;
}

export function makeReceipt(input: {
  session: string;
  model_worker: string;
  model_qc: string;
  worker_claim: Claim;
  qc_claim: Claim;
  evidence: EvidenceVerdict;
  human_disposition: HumanDisposition;
  worker_output: string;
  qc_output: string;
  ledger: "SERVER_DURABLE" | "LOCAL_ONLY";
  worker_output_sha256?: string;
  qc_output_sha256?: string;
}): TinkerersReceipt {
  return {
    experiment_id: EXPERIMENT_ID,
    contract_version: CONTRACT_VERSION,
    session: input.session,
    worker: input.model_worker,
    worker_claim: input.worker_claim,
    qc: input.model_qc,
    qc_verdict: input.qc_claim,
    evidence: input.evidence,
    human_disposition: input.human_disposition,
    raw_worker_preserved: Boolean(input.worker_output),
    raw_qc_preserved: Boolean(input.qc_output),
    worker_output_sha256: input.worker_output_sha256 || sha256(input.worker_output),
    qc_output_sha256: input.qc_output_sha256 || sha256(input.qc_output),
    ledger: input.ledger,
  };
}

export class TinkerersStoreError extends Error {
  code: string;
  status: number;
  detail?: unknown;
  constructor(code: string, message: string, status = 500, detail?: unknown) {
    super(message);
    this.name = "TinkerersStoreError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export function tinkerersErrorResponse(error: unknown) {
  if (error instanceof TinkerersStoreError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Unhandled Tinkerers error", error);
  return Response.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "The experiment ledger could not complete this write." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
