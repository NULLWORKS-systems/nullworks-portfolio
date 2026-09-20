import { validateWorkerArtifact } from "@/lib/tinkerers-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let worker_output = "";
  try {
    const body = (await request.json()) as { worker_output?: string };
    worker_output = typeof body.worker_output === "string" ? body.worker_output : "";
  } catch {
    return Response.json(
      { ok: false, error: { code: "INVALID_JSON", message: "Validator expects JSON." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = validateWorkerArtifact(worker_output);
  return Response.json(
    { ok: true, result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
