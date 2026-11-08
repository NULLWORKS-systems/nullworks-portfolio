import { NextRequest } from "next/server";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import gzip0 from "./gzip0";
import gzip1 from "./gzip1";
import gzip2 from "./gzip2";
import gzip3 from "./gzip3";

const FILE_NAME = "Continuity_Calculus_3_1_Longitudinal_Continuity.pdf";
const EXPECTED_BYTES = 43587;
const EXPECTED_SHA256 = "31e5f084ff0cb488904add9e39da93e169367c63da22fe35fa770f4ac74de0fe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loadArtifact(): Buffer {
  const compressed = Buffer.from(gzip0 + gzip1 + gzip2 + gzip3, "base64");
  const pdf = gunzipSync(compressed);
  const sha256 = createHash("sha256").update(pdf).digest("hex");

  if (pdf.length !== EXPECTED_BYTES || sha256 !== EXPECTED_SHA256) {
    throw new Error(`CC3.1 integrity failure: bytes=${pdf.length} sha256=${sha256}`);
  }
  return pdf;
}

export async function GET(request: NextRequest) {
  try {
    const pdf = loadArtifact();
    const download = request.nextUrl.searchParams.get("download") === "1";

    return new Response(Uint8Array.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${FILE_NAME}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Artifact-SHA256": EXPECTED_SHA256,
      },
    });
  } catch (error) {
    console.error("CC3.1 artifact integrity failure", error);
    return new Response("Locked review artifact failed integrity verification.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }
}
