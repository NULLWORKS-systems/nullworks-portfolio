import { loadAsset } from "../poster-data/load";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const body = loadAsset();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(body.length),
      "Content-Disposition": 'inline; filename="smart-as-shit-poster.png"',
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
