export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const CONFIGURED_REALTIME_MODEL = (process.env.OPENAI_REALTIME_MODEL || "").trim();
const HIVE_REPO = process.env.HIVE_REPO || "masoncalcolsol-creator/nullworks-corporate-wifi-hive";
const HIVE_BRANCH = process.env.HIVE_BRANCH || "main";
const HIVE_TOKEN = process.env.HIVE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
const DEREK_PROFILE = "derek_lenderflow";
const DEREK_WORKROOM_PATH = "hive/current/derek_lenderflow_phone_workroom.yaml";
const JASON_PROFILE = "jason_rains";
const JASON_WORKROOM_PATH = "hive/current/jason_rains_huddle_workroom.yaml";
const FULL_SPECTRUM_BUNDLE_PATH = "hive/current/full_spectrum_boot_bundle.yaml";

function safeLabel(value: string | null, fallback: string): string {
  const cleaned = (value || "").replace(/[^a-zA-Z0-9 _.-]/g, "").trim();
  return cleaned.slice(0, 48) || fallback;
}

function cookieValue(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return "";
}

function yamlValue(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*["']?([^\\n"']+)`, "m"));
  return match?.[1]?.trim();
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
        "User-Agent": "NULLWORKS-Huddle-Realtime",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return "";
  const data = (await response.json()) as { content?: string };
  if (!data.content) return "";
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function loadHiveBriefing(profile: string): Promise<string> {
  try {
    if (profile === JASON_PROFILE) {
      const bundle = await fetchHiveFile(FULL_SPECTRUM_BUNDLE_PATH);
      const workroom = await fetchHiveFile(JASON_WORKROOM_PATH);
      if (!bundle && !workroom) return "Hive briefing unavailable for this session.";
      return [
        bundle ? `FULL SPECTRUM BOOT BUNDLE:\n${bundle.slice(0, 7200)}` : "",
        workroom ? `ACTIVE WORKROOM PROFILE:\n${workroom.slice(0, 4400)}` : "",
      ].filter(Boolean).join("\n\n").slice(0, 11800);
    }

    const boot = await fetchHiveFile("HIVE_BOOT.yaml");
    if (!boot) return "Hive briefing unavailable for this session.";
    const floorPath = yamlValue(boot, "company_floor") || "hive/current/company_floor.yaml";
    const floor = await fetchHiveFile(floorPath);
    const profileBriefing = profile === DEREK_PROFILE
      ? await fetchHiveFile(DEREK_WORKROOM_PATH)
      : "";
    const briefing = [
      `HIVE BOOT:\n${boot.slice(0, 2200)}`,
      `CURRENT COMPANY FLOOR:\n${floor.slice(0, 3400)}`,
      profileBriefing ? `ACTIVE WORKROOM PROFILE:\n${profileBriefing.slice(0, 6200)}` : "",
    ].filter(Boolean).join("\n\n");
    return briefing.slice(0, 11800);
  } catch (error) {
    console.error("Huddle Hive briefing failed", error);
    return "Hive briefing unavailable for this session.";
  }
}

type OpenAIErrorShape = {
  error?: {
    message?: string;
    code?: string;
    param?: string;
    type?: string;
  };
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
  return Array.from(
    new Set(
      [CONFIGURED_REALTIME_MODEL, "gpt-realtime", "gpt-realtime-mini"]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function buildMultipartBody(
  offerSdp: string,
  session: Record<string, unknown>,
): { body: Uint8Array; contentType: string } {
  const boundary = `----nullworks-huddle-${crypto.randomUUID()}`;
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

function derekInstructions(): string {
  return `This room is the Derek Bullen LenderFlow workroom transported through NULLWORKS Huddle. In this profile, identify yourself as LENA, Derek's Organic Intelligence assistant inside LenderFlow. The locked doctrine is: AI answers. OI operates. LENA communicates. Derek decides.

Derek retains lending judgment, lender relationships, creative deal structure, exceptions, approvals, and final decisions. You may discuss LenderFlow behavior, translate Derek's expert corrections into a proposed structured lender rule, and read the exact proposal back for confirmation. This first Huddle profile is conversational and read-only: do not claim that any lender rule, deployment, email, receipt, database record, borrower profile, or external system was changed.

Do not quote live rates, recommend a lender for a real borrower, approve credit, claim qualification, make lender commitments, provide legal or financial advice, or imply Derek approved anything he did not explicitly approve. Do not request or accept SSNs, bank credentials, account numbers, sensitive documents, or unnecessary borrower PII. Use de-identified examples for testing. Unknown lender identities, ambiguous fields, borrower-specific exceptions disguised as lender rules, and unsupported matcher fields must fail closed and trigger one concise clarification question.`;
}

function jasonInstructions(): string {
  return `This room is the Jason Rains Infrastructure Huddle transported through NULLWORKS Huddle. Identify yourself as a NULLWORKS AI workroom participant and conversational systems facilitator, not a human employee, government representative, or legal authority. Mason Perry remains final Human Authority for NULLWORKS actions.

Mason supplied preliminary orientation that Jason works for USPS, previously worked as a mechanic, helped rebolt 48 bolt chutes, has long government infrastructure and information-technology experience, and later drove cattle trucks. Treat every one of those items as an unverified Mason-reported orientation fact until Jason confirms, corrects, or expands it. Jason's own account controls his biography and work history.

At the beginning, confirm both humans can hear the room, disclose that the browser may display an automated transcript that can be wrong, and ask whether both humans consent to using the live transcript for session notes. Then ask Jason to describe his government, infrastructure, IT, maintenance, networking, or systems background in his own words and what would make the session useful. Ask at most one concise follow-up question at a time.

Answer Jason's questions directly and naturally. Separate confirmed fact, participant claim, inference, proposal, and unknown. Do not request passwords, access tokens, credentials, protected network details, security procedures, nonpublic vulnerabilities, classified or law-enforcement-sensitive information, procurement-sensitive information, or protected personnel data. Do not represent Jason's statements as official USPS or government positions. Do not expose unrelated compartmentalized Hive material.

This session is conversational and ephemeral by default. Do not claim that any durable writeback, deployment, invitation, message, publication, access change, or verification occurred unless the session has direct evidence and Mason explicitly approved the exact action. Preserve corrections and useful operational lessons, but do not force every story into a product or project.`;
}

export async function POST(request: Request): Promise<Response> {
  if (!OPENAI_API_KEY) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY is not configured in the hosting environment." },
      { status: 503 },
    );
  }

  const offerSdp = await request.text();
  if (!offerSdp.startsWith("v=0")) {
    return Response.json({ ok: false, error: "Invalid WebRTC offer." }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const room = safeLabel(requestUrl.searchParams.get("room"), "private-room");
  const hostName = safeLabel(requestUrl.searchParams.get("host"), "Mason");
  const activeProfile = cookieValue(request, "nw_huddle_profile");
  const isDerekRoom = activeProfile === DEREK_PROFILE;
  const isJasonRoom = activeProfile === JASON_PROFILE;
  const guestName = isDerekRoom
    ? "Derek"
    : isJasonRoom
      ? "Jason"
      : safeLabel(requestUrl.searchParams.get("guest"), "Guest");
  const hiveBriefing = await loadHiveBriefing(activeProfile);
  const profileInstructions = isDerekRoom
    ? `\n\n${derekInstructions()}`
    : isJasonRoom
      ? `\n\n${jasonInstructions()}`
      : "";

  const instructions = `You are the NULLWORKS Huddle voice agent inside a private browser room. The human participants are ${hostName}, the room host and final Human Authority, and possibly ${guestName}, an invited guest. More than one human voice may arrive through the same mixed audio channel. Do not pretend you can identify a speaker with certainty from voice alone. Use names only when the speaker states or clarifies who is speaking.

Speak naturally, promptly, and in compact conversational turns. Let the humans finish. You may be interrupted. Answer the immediate question first, then ask at most one useful follow-up. Never call yourself a telephone bot. Do not expose credentials, private tokens, protected personal records, or unnecessary compartmentalized Hive material. Do not claim that a deployment, writeback, receipt, external action, or verification occurred unless the session has direct evidence. Mason remains final Human Authority. If the invited guest asks for restricted or personal information, explain that the room has a privacy boundary and answer only from approved context.${profileInstructions}

This is room ${room}. This session is live and ephemeral. The browser may display an automated transcript, which can contain transcription errors.

APPROVED HIVE BRIEFING:
${hiveBriefing}`;

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
                  prompt: `Private NULLWORKS Huddle with ${hostName} and ${guestName}.`,
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
          const namedProfile = isDerekRoom
            ? DEREK_PROFILE
            : isJasonRoom
              ? JASON_PROFILE
              : profile.name;
          const clearProfileCookie = isDerekRoom || isJasonRoom;
          return new Response(upstream.body, {
            status: 201,
            headers: {
              "Content-Type": "application/sdp",
              "Cache-Control": "no-store, max-age=0",
              "X-NULLWORKS-Realtime-Model": model,
              "X-NULLWORKS-Realtime-Profile": namedProfile,
              ...(clearProfileCookie
                ? { "Set-Cookie": "nw_huddle_profile=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax" }
                : {}),
            },
          });
        }

        const parsed = parseUpstreamError(upstream.body);
        lastFailure = {
          status: upstream.response.status,
          model,
          profile: profile.name,
          ...parsed,
        };
        console.error(
          "OpenAI Realtime call creation failed",
          JSON.stringify(lastFailure).slice(0, 1400),
        );

        if (![400, 404].includes(upstream.response.status)) break;
      }

      if (lastFailure && ![400, 404].includes(lastFailure.status)) break;
    }

    return Response.json(
      {
        ok: false,
        error: "Realtime session creation failed.",
        upstreamStatus: lastFailure?.status,
        upstreamMessage: lastFailure?.message,
        upstreamCode: lastFailure?.code,
        upstreamParam: lastFailure?.param,
        attemptedModel: lastFailure?.model,
        attemptedProfile: lastFailure?.profile,
      },
      { status: 502 },
    );
  } catch (error) {
    console.error("OpenAI Realtime network failure", error);
    return Response.json({ ok: false, error: "Realtime network failure." }, { status: 502 });
  }
}
