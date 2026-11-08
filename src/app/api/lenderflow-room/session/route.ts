import {
  LENDERFLOW_PROFILE,
  LENDERFLOW_ROOM_SLUG,
  requestHasLenderFlowAccess,
} from "@/lib/lenderflow-room-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const CONFIGURED_REALTIME_MODEL = (process.env.OPENAI_REALTIME_MODEL || "").trim();
const HIVE_REPO = process.env.HIVE_REPO || "masoncalcolsol-creator/nullworks-corporate-wifi-hive";
const HIVE_BRANCH = process.env.HIVE_BRANCH || "main";
const HIVE_TOKEN = process.env.HIVE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
const DEREK_WORKROOM_PATH = "hive/current/derek_lenderflow_phone_workroom.yaml";

const RULE_TOOLS = [
  {
    type: "function",
    name: "prepare_lenderflow_rule",
    description: "Validate one proposed lender-wide or program-specific matching rule against the governed field set and exact LenderFlow lender catalog. Use only after the humans have supplied one lender, one field, one operator, one value, and the rule scope. This tool never changes data. After it succeeds, read its spokenSummary exactly and ask for a separate explicit yes or no.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        lenderDisplayName: { type: "string", description: "Full lender company name spoken by the user." },
        lenderSlug: { type: "string", description: "Optional candidate slug; exact canonical resolution still occurs server-side." },
        fieldKey: {
          type: "string",
          enum: [
            "absoluteMinFico",
            "typicalMinFico",
            "minLoanAmount",
            "maxLoanAmount",
            "typicalMaxLtv",
            "purchaseMaxLtv",
            "cashOutMaxLtv",
            "loanTypes",
            "statesServed",
            "statesNotServed",
            "propertyTypes",
            "borrowerTypes",
          ],
        },
        operator: {
          type: "string",
          enum: ["equals", "minimum", "maximum", "includes", "excludes", "not_applicable"],
        },
        value: {
          description: "Exact number, text value, or list to publish.",
          oneOf: [
            { type: "number" },
            { type: "string" },
            { type: "boolean" },
            { type: "array", items: { type: "string" } },
            { type: "null" },
          ],
        },
        appliesToAllPrograms: { type: "boolean" },
        program: { type: ["string", "null"] },
        temporary: { type: "boolean" },
        expiresAt: { type: ["string", "null"], description: "YYYY-MM-DD when temporary; null when permanent." },
        note: { type: "string", description: "Short structured reason without borrower PII." },
      },
      required: [
        "lenderDisplayName",
        "fieldKey",
        "operator",
        "value",
        "appliesToAllPrograms",
        "temporary",
      ],
    },
  },
  {
    type: "function",
    name: "publish_lenderflow_rule",
    description: "Publish the exact prepared rule only after a human gives a separate explicit affirmative answer after hearing the complete read-back. Never call this during the same turn that prepared the rule. The browser independently verifies that a later spoken approval occurred. After the tool returns, say that the rule changed only when mutationPerformed is true. State the reference and whether the email receipt was confirmed.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        confirmationToken: { type: "string", description: "Use the token returned by prepare_lenderflow_rule without changing it." },
        confirmedBy: { type: "string", description: "Name stated by the approving human, or Authorized LenderFlow room participant if unclear." },
      },
      required: ["confirmationToken", "confirmedBy"],
    },
  },
];

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
        "User-Agent": "NULLWORKS-LenderFlow-Room",
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
    const workroom = await fetchHiveFile(DEREK_WORKROOM_PATH);
    if (!workroom) return "The governed Derek LenderFlow briefing is unavailable. Fail closed and do not prepare or publish a rule.";
    return `ACTIVE DEREK LENDERFLOW WORKROOM:\n${workroom.slice(0, 9000)}`;
  } catch (error) {
    console.error("LenderFlow room briefing failed", error);
    return "The governed Derek LenderFlow briefing is unavailable. Fail closed and do not prepare or publish a rule.";
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
  const boundary = `----nullworks-lenderflow-${crypto.randomUUID()}`;
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
  if (!requestHasLenderFlowAccess(request)) {
    return Response.json({ ok: false, error: "LenderFlow room access expired or was not granted." }, { status: 401 });
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
  const instructions = `You are LENA, Derek Bullen's Organic Intelligence assistant inside the permanent NULLWORKS LenderFlow Room. This is a low-latency browser conversation that may contain several human participants. ${coordinatorName} is the current technical room coordinator, which does not change business authority. Do not pretend you can identify a speaker from voice alone; use a person's name only when they state it or the room context clearly establishes it.

Locked doctrine: AI answers. OI operates. LENA communicates. Derek decides.

Derek retains lending judgment, lender relationships, creative deal structure, exceptions, approvals, and final decisions. Speak naturally and promptly in compact turns. Let people finish, accept interruption, answer the immediate question first, and ask at most one useful clarification question.

This room now has a governed rule-write path. Discussion itself never changes data. For a requested change, gather exactly one lender, one supported field, one operator, one exact value, the all-programs or named-program scope, and whether it is permanent or temporary. Call prepare_lenderflow_rule only when those details are complete. The prepare tool performs exact canonical lender resolution and returns an exact spokenSummary; read that summary exactly once and ask, "Correct? Say yes or no." Do not call publish_lenderflow_rule in the same turn as preparation. Only after a later, separate spoken affirmative may you call publish_lenderflow_rule with the untouched confirmation token. The browser and server independently reject missing, stale, duplicated, or unclear approvals.

After publish_lenderflow_rule returns, say "changed" or "published" only when mutationPerformed is true. When it is true, speak the reference, rule ID when present, and whether emailReceiptConfirmed is true. If mutationPerformed is false, say plainly that nothing changed and give the returned reason. Never invent a receipt or claim email delivery without emailReceiptConfirmed true.

Do not quote live rates, recommend a lender for an actual borrower, approve credit, claim qualification, make lender commitments, provide legal or financial advice, or imply Derek approved something he did not explicitly approve. Do not request or accept SSNs, bank credentials, account numbers, sensitive documents, or unnecessary borrower PII. Use de-identified examples. Unknown lender identities, ambiguous fields, borrower-specific exceptions disguised as lender rules, and unsupported matcher fields fail closed.

Room: ${LENDERFLOW_ROOM_SLUG}. Profile: ${LENDERFLOW_PROFILE}. The session is live and ephemeral; automated transcripts may contain errors.

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
            tools: RULE_TOOLS,
            tool_choice: "auto",
            audio: {
              input: {
                noise_reduction: { type: "far_field" },
                transcription: {
                  model: "gpt-4o-mini-transcribe",
                  language: "en",
                  prompt: "NULLWORKS LenderFlow room with Derek, Mason, and invited collaborators.",
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
            tools: RULE_TOOLS,
            tool_choice: "auto",
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
              "X-NULLWORKS-Realtime-Profile": profile.name,
              "X-NULLWORKS-Rule-Writeback": "confirmed-with-email-receipt",
            },
          });
        }
        const parsed = parseUpstreamError(upstream.body);
        lastFailure = { status: upstream.response.status, model, profile: profile.name, ...parsed };
        console.error("LenderFlow Realtime call creation failed", JSON.stringify(lastFailure).slice(0, 1400));
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
    console.error("LenderFlow Realtime network failure", error);
    return Response.json({ ok: false, error: "Realtime network failure." }, { status: 502 });
  }
}
