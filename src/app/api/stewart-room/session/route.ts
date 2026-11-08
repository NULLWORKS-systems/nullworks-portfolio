import {
  requestHasStewartAccess,
  STEWART_PROFILE,
  STEWART_ROOM_SLUG,
} from "@/lib/stewart-room-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const CONFIGURED_REALTIME_MODEL = (process.env.OPENAI_REALTIME_MODEL || "").trim();
const HIVE_REPO = process.env.HIVE_REPO || "masoncalcolsol-creator/nullworks-corporate-wifi-hive";
const HIVE_BRANCH = process.env.HIVE_BRANCH || "main";
const HIVE_TOKEN = process.env.HIVE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
const WORKROOM_PATH = "hive/current/stewart_brothers_huddle_workroom.yaml";
const FULL_SPECTRUM_PATH = "hive/current/full_spectrum_boot_bundle.yaml";

function safeLabel(value: string | null, fallback: string): string {
  const cleaned = (value || "").replace(/[^a-zA-Z0-9 _.-]/g, "").trim();
  return cleaned.slice(0, 48) || fallback;
}

async function fetchHiveFile(path: string): Promise<string> {
  if (!HIVE_TOKEN) return "";
  const encodedPath = encodeURIComponent(path).replaceAll("%2F", "/");
  const response = await fetch(
    `https://api.github.com/repos/${HIVE_REPO}/contents/${encodedPath}?ref=${encodeURIComponent(HIVE_BRANCH)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${HIVE_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "NULLWORKS-Stewart-Huddle",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) return "";
  const data = await response.json() as { content?: string };
  if (!data.content) return "";
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function loadBriefing(): Promise<string> {
  try {
    const [bundle, workroom] = await Promise.all([
      fetchHiveFile(FULL_SPECTRUM_PATH),
      fetchHiveFile(WORKROOM_PATH),
    ]);
    if (!workroom) {
      return "The governed Stewart workroom briefing is unavailable. Keep the conversation general and do not preserve or claim any durable record.";
    }
    return [
      bundle ? `FULL SPECTRUM BOOT BUNDLE:\n${bundle.slice(0, 6200)}` : "",
      `ACTIVE STEWART WORKROOM:\n${workroom.slice(0, 5600)}`,
    ].filter(Boolean).join("\n\n").slice(0, 11800);
  } catch (error) {
    console.error("Stewart Huddle briefing failed", error);
    return "The governed Stewart workroom briefing is unavailable. Keep the conversation general and do not preserve or claim any durable record.";
  }
}

type OpenAIErrorShape = {
  error?: { message?: string; code?: string; param?: string; type?: string };
};

function parseUpstreamError(body: string): { message: string; code?: string; param?: string } {
  try {
    const parsed = JSON.parse(body) as OpenAIErrorShape;
    return {
      message: parsed.error?.message || "OpenAI rejected the Realtime session request.",
      code: parsed.error?.code,
      param: parsed.error?.param,
    };
  } catch {
    return { message: body.slice(0, 500) || "OpenAI rejected the Realtime session request." };
  }
}

function modelCandidates(): string[] {
  return Array.from(new Set(
    [CONFIGURED_REALTIME_MODEL, "gpt-realtime", "gpt-realtime-mini"]
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

function buildMultipartBody(
  offerSdp: string,
  session: Record<string, unknown>,
): { body: Uint8Array; contentType: string } {
  const boundary = `----nullworks-stewart-${crypto.randomUUID()}`;
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="sdp"',
    "Content-Type: application/sdp",
    "",
    offerSdp,
    `--${boundary}`,
    'Content-Disposition: form-data; name="session"',
    "Content-Type: application/json",
    "",
    JSON.stringify(session),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return {
    body: new TextEncoder().encode(payload),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function createRealtimeCall(
  offerSdp: string,
  session: Record<string, unknown>,
): Promise<{ response: Response; body: string }> {
  const multipart = buildMultipartBody(offerSdp, session);
  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": multipart.contentType,
    },
    body: Uint8Array.from(multipart.body),
    cache: "no-store",
  });
  return { response, body: await response.text() };
}

export async function POST(request: Request): Promise<Response> {
  if (!requestHasStewartAccess(request)) {
    return Response.json({ ok: false, error: "Stewart room access expired or was not granted." }, { status: 401 });
  }
  if (!OPENAI_API_KEY) {
    return Response.json({ ok: false, error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const offerSdp = await request.text();
  if (!offerSdp.startsWith("v=0")) {
    return Response.json({ ok: false, error: "Invalid WebRTC offer." }, { status: 400 });
  }

  const url = new URL(request.url);
  const coordinatorName = safeLabel(url.searchParams.get("coordinator"), "Room coordinator");
  const briefing = await loadBriefing();
  const instructions = `You are the NULLWORKS AI participant inside the permanent Stewart Brothers Field Scope. This is a low-latency browser room that may contain Mason Perry, Jeff Stewart, Nathan Stewart, or other invited participants. ${coordinatorName} is only the current technical browser coordinator. Mason Perry remains final Human Authority for NULLWORKS actions.

Do not pretend you can identify a person from voice alone. Ask who is present, and use a person's name only after they state it or another human clearly identifies them. At the beginning of a fresh session, confirm the humans can hear you, explain that the browser transcript is automated and may be wrong, and ask before treating transcript content as durable notes.

Speak like a normal person. Avoid AI jargon unless the humans ask for it. Never condescend or mistake unfamiliarity with AI for lack of intelligence. Answer the immediate question first, use practical examples and physical analogies, let people finish, accept interruption, and ask at most one useful follow-up question at a time.

Mason supplied preliminary orientation that Nathan previously served in the Army; Jeff is a machinist and currently works for SpaceX; Jeff, Nathan, and Mason participated in land-speed racing; their father Mike Stewart served as a city engineer for Big Bear Lake; and the families grew up near one another. Treat all of that as unverified Mason-reported orientation until Jeff or Nathan confirms, corrects, or expands it. Their own account controls their biography and work history.

This room is for ordinary questions, technical conversation, racing and fabrication stories, systems thinking, troubleshooting, and useful project exploration. Do not force every story into a product. Separate confirmed fact, participant claim, inference, proposal, and unknown.

Strict boundaries: do not request or preserve classified, controlled-unclassified, export-controlled, ITAR-controlled, proprietary aerospace, or military-sensitive technical information. Do not solicit SpaceX drawings, dimensions, tolerances, tooling details, production methods, credentials, internal systems, security procedures, nonpublic program information, or vulnerabilities. Do not solicit sensitive military operational details, protected personnel information, credentials, access methods, or vulnerabilities. Do not represent Jeff's statements as official SpaceX positions or Nathan's statements as official Army or United States Government positions.

This session is live and ephemeral by default. Do not claim a durable writeback, deployment, invitation, message, publication, access change, or verification occurred unless direct evidence exists and Mason explicitly approved that exact action. Do not expose unrelated compartmentalized Hive material.

Room: ${STEWART_ROOM_SLUG}. Profile: ${STEWART_PROFILE}. Automated transcript text may contain errors.

${briefing}`;

  let lastFailure: {
    status: number;
    model: string;
    profile: string;
    message: string;
    code?: string;
    param?: string;
  } | null = null;

  try {
    for (const model of modelCandidates()) {
      const profiles: Array<{ name: string; session: Record<string, unknown> }> = [
        {
          name: "standard",
          session: {
            type: "realtime",
            model,
            instructions,
            output_modalities: ["audio"],
            max_output_tokens: 900,
            audio: {
              input: {
                noise_reduction: { type: "far_field" },
                transcription: {
                  model: "gpt-4o-mini-transcribe",
                  language: "en",
                  prompt: "Private NULLWORKS Stewart Brothers Huddle with Mason, Jeff, Nathan, and invited collaborators.",
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 650,
                  create_response: true,
                  interrupt_response: true,
                },
              },
              output: { voice: "marin" },
            },
          },
        },
        {
          name: "compatibility",
          session: {
            type: "realtime",
            model,
            instructions,
          },
        },
      ];

      for (const profile of profiles) {
        const upstream = await createRealtimeCall(offerSdp, profile.session);
        if (upstream.response.ok) {
          return new Response(upstream.body, {
            status: 201,
            headers: {
              "Content-Type": "application/sdp",
              "Cache-Control": "no-store, max-age=0",
              "X-NULLWORKS-Realtime-Model": model,
              "X-NULLWORKS-Realtime-Profile": STEWART_PROFILE,
            },
          });
        }
        const parsed = parseUpstreamError(upstream.body);
        lastFailure = { status: upstream.response.status, model, profile: profile.name, ...parsed };
        console.error("Stewart Realtime call creation failed", JSON.stringify(lastFailure).slice(0, 1400));
        if (![400, 404].includes(upstream.response.status)) break;
      }
      if (lastFailure && ![400, 404].includes(lastFailure.status)) break;
    }

    return Response.json({
      ok: false,
      error: "Realtime session creation failed.",
      upstreamStatus: lastFailure?.status,
      upstreamMessage: lastFailure?.message,
      upstreamCode: lastFailure?.code,
      upstreamParam: lastFailure?.param,
      attemptedModel: lastFailure?.model,
      attemptedProfile: lastFailure?.profile,
    }, { status: 502 });
  } catch (error) {
    console.error("Stewart Realtime network failure", error);
    return Response.json({ ok: false, error: "Realtime network failure." }, { status: 502 });
  }
}
