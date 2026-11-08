import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SDK_VERSION = "2.18.3";
const SDK_URL = `https://raw.githubusercontent.com/twilio/twilio-voice.js/${SDK_VERSION}/dist/twilio.min.js`;
const EXPECTED_GIT_BLOB_SHA1 = "d88745027a72a66684ec761127684123f2ef7dc6";
let sdkPromise: Promise<Buffer> | undefined;

function gitBlobSha1(content: Buffer): string {
  const header = Buffer.from(`blob ${content.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(content).digest("hex");
}

async function loadSdk(): Promise<Buffer> {
  const response = await fetch(SDK_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Twilio Voice SDK fetch failed: ${response.status}`);
  const content = Buffer.from(await response.arrayBuffer());
  const digest = gitBlobSha1(content);
  if (digest !== EXPECTED_GIT_BLOB_SHA1) throw new Error(`Twilio Voice SDK integrity mismatch: ${digest}`);
  return content;
}

export async function GET(): Promise<Response> {
  try {
    sdkPromise ||= loadSdk().catch((error) => {
      sdkPromise = undefined;
      throw error;
    });
    const content = await sdkPromise;
    return new Response(Uint8Array.from(content), {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
        "x-nullworks-sdk-version": SDK_VERSION,
        "x-nullworks-sdk-git-blob-sha1": EXPECTED_GIT_BLOB_SHA1,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Twilio Voice SDK delivery failed", error);
    return new Response("Browser voice SDK unavailable.", { status: 503, headers: { "cache-control": "no-store" } });
  }
}
