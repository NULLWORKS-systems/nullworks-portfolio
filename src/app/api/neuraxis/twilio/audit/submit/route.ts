import {
  auditReference,
  readTwilioForm,
  say,
  sendTwilioSms,
  twiml,
  validateTwilioRequest,
  writeHiveReceipt,
} from "@/lib/neuraxis-twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateTwilioRequest(request, params)) {
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${say("Access denied.")}<Hangup/></Response>`, 403);
  }

  const transcript = String(params.SpeechResult || "").trim();
  const caller = String(params.From || "").trim();
  const callSid = String(params.CallSid || crypto.randomUUID());
  if (!transcript) {
    const retry = new URL("/api/neuraxis/twilio/audit/start", request.url).toString();
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${say("I did not receive a usable intake. Returning you to the audit prompt.")}<Redirect method="POST">${retry}</Redirect></Response>`);
  }

  const reference = auditReference(callSid);
  const continueUrl = new URL(`/ai-audit/continue?ref=${encodeURIComponent(reference)}`, request.url).toString();
  const statusUrl = new URL(`/api/neuraxis/twilio/message-status?ref=${encodeURIComponent(reference)}`, request.url).toString();
  const smsBody = `NULLWORKS AI Audit Room: your intake ${reference} is open. Confirm your email or add context here: ${continueUrl} This is a transactional follow-up to your call. Reply STOP to opt out.`;

  const receiptPayload = {
    event_type: "AI_OPERATING_MODEL_PHONE_TRIAGE",
    truth_state: "PROPOSED",
    reference,
    call_sid: callSid,
    caller_number: caller,
    speech_confidence: params.Confidence || null,
    language: params.Language || null,
    raw_transcript: transcript,
    continuation_url: continueUrl,
    created_at: new Date().toISOString(),
    boundary: "One-pass phone intake only. Human review required before any diagnosis or consequential recommendation.",
  };

  const [sms, receipt] = await Promise.all([
    caller
      ? sendTwilioSms({ to: caller, body: smsBody, statusCallback: statusUrl })
      : Promise.resolve({ ok: false, error: "Twilio did not provide caller number" }),
    writeHiveReceipt({ reference, category: "ai_audit_phone_triage", payload: receiptPayload }),
  ]);

  await writeHiveReceipt({
    reference,
    category: "ai_audit_phone_dispatch",
    payload: {
      event_type: "AI_AUDIT_PHONE_DISPATCH",
      truth_state: "OBSERVED",
      reference,
      sms,
      receipt,
      recorded_at: new Date().toISOString(),
    },
  }).catch(() => undefined);

  let spoken: string;
  if (sms.ok && receipt.ok) {
    spoken = `Your provisional audit intake is stored as ${reference}. Twilio accepted the continuation text with status ${("status" in sms ? sms.status : undefined) || "queued"}. Open that link to confirm your email or add anything I missed. Human review remains required.`;
  } else if (sms.ok && !receipt.ok) {
    spoken = `Twilio accepted the continuation text for ${reference}, but I could not confirm that the spoken transcript was stored in the Hive. Open the text link and submit the continuation form so the handoff is preserved. The storage error was ${receipt.error || "unknown"}.`;
  } else if (!sms.ok && receipt.ok) {
    spoken = `Your spoken intake is stored as ${reference}, but I could not confirm the continuation text was queued. The text error was ${sms.error || "unknown"}. Keep the reference ${reference} and give it to Mason.`;
  } else {
    spoken = `I generated reference ${reference}, but neither the text nor the Hive receipt could be confirmed. Text error: ${sms.error || "unknown"}. Receipt error: ${receipt.error || "unknown"}. Please give Mason the reference ${reference}.`;
  }

  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${say(spoken)}<Hangup/></Response>`);
}
