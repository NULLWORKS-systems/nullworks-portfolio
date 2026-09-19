import { loadAsset } from "../_bin/loadPoster";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  const body = loadAsset();
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
