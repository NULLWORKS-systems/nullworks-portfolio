import { fetchLiveSnapshot, tinkerersErrorResponse } from "@/lib/tinkerers-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await fetchLiveSnapshot();
    return Response.json(
      { ok: true, snapshot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return tinkerersErrorResponse(error);
  }
}
