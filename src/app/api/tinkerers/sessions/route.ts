import {
  CONTRACT_VERSION,
  EXPERIMENT_ID,
  isClaim,
  isDisposition,
  isModel,
  validateWorkerArtifact,
} from "@/lib/tinkerers-contract";
import {
  makeReceipt,
  persistTinkerersSession,
  tinkerersErrorResponse,
} from "@/lib/tinkerers-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT = 20_000;

function clean(value: unknown, max = MAX_OUTPUT) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const worker_output = clean(body.worker_output);
    const qc_output = clean(body.qc_output);
    const challenge_text = clean(body.challenge_text, 2000);
    const model_worker = isModel(body.model_worker) ? body.model_worker : null;
    const model_qc = isModel(body.model_qc) ? body.model_qc : model_worker;
    const worker_claim = isClaim(body.worker_claim) ? body.worker_claim : null;
    const qc_claim = isClaim(body.qc_claim) ? body.qc_claim : null;
    const human_disposition = isDisposition(body.human_disposition) ? body.human_disposition : null;
    const session = clean(body.session, 80);

    if (!model_worker || !model_qc || !worker_claim || !qc_claim || !human_disposition || !worker_output || !qc_output) {
      return Response.json(
        { ok: false, error: { code: "INCOMPLETE", message: "Session is missing required fields." } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const validator = validateWorkerArtifact(worker_output);
    const row = await persistTinkerersSession(
      {
        id: /^[0-9a-f-]{36}$/i.test(session) ? session : undefined,
        model_worker,
        model_qc,
        qc_same_model: model_worker === model_qc,
        worker_claim,
        qc_claim,
        worker_output,
        qc_output,
        human_disposition,
        challenge_text,
      },
      validator,
    );

    const receipt = makeReceipt({
      session: row.id,
      model_worker,
      model_qc,
      worker_claim,
      qc_claim,
      evidence: validator.verdict,
      human_disposition,
      worker_output,
      qc_output,
      ledger: "SERVER_DURABLE",
    });

    return Response.json(
      {
        ok: true,
        experiment_id: EXPERIMENT_ID,
        contract_version: CONTRACT_VERSION,
        validator,
        receipt,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return tinkerersErrorResponse(error);
  }
}
