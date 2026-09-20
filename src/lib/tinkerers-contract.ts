export const EXPERIMENT_ID = "NW-PHX-001";
export const CONTRACT_VERSION = "1.0.0";

export const MODELS = ["ChatGPT", "Claude", "Gemini", "Grok", "Copilot", "Other"] as const;
export type SelfReportedModel = (typeof MODELS)[number];

export const WORKER_PROMPT = `Return exactly five lines and nothing else:
BLOCK 1: ORBIT
BLOCK 2: 230
BLOCK 3: EVIDENCE BEFORE CLAIMS
BLOCK 4: HUMAN AUTHORITY
BLOCK 5: BLOCK_COUNT=5
Do not claim PASS or SUCCESS.`;

export const QC_PROMPT_PREFIX = `Quality-check the WORKER OUTPUT against these rules:
- exactly five blocks / lines
- block values must be ORBIT, 230, EVIDENCE BEFORE CLAIMS, HUMAN AUTHORITY, BLOCK_COUNT=5
- no PASS or SUCCESS self-certification
Return only PASS, FAIL, or UNCLEAR plus one short reason.

WORKER OUTPUT:
`;

export const EXPECTED_BLOCKS = [
  "BLOCK 1: ORBIT",
  "BLOCK 2: 230",
  "BLOCK 3: EVIDENCE BEFORE CLAIMS",
  "BLOCK 4: HUMAN AUTHORITY",
  "BLOCK 5: BLOCK_COUNT=5",
] as const;

export type Claim = "PASS" | "FAIL" | "UNCLEAR";
export type EvidenceVerdict = "PASS" | "FAIL" | "INDETERMINATE";
export type HumanDisposition = "ACCEPT" | "REJECT" | "CHALLENGE";

export type RequirementResult = {
  id: string;
  requirement: string;
  expected: string;
  observed: string;
  verdict: "PASS" | "FAIL";
};

export type ValidatorResult = {
  contract_version: string;
  experiment_id: string;
  engine: "typescript-deterministic";
  requirements: RequirementResult[];
  verdict: EvidenceVerdict;
};

function visibleLines(raw: string): string[] {
  return raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index, all) => {
      if (line.trim().length > 0) return true;
      return index > 0 && index < all.length - 1;
    })
    .map((line) => line.trim());
}

export function buildQcPrompt(workerOutput: string): string {
  return `${QC_PROMPT_PREFIX}${workerOutput}`;
}

export function validateWorkerArtifact(raw: string | null | undefined): ValidatorResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      contract_version: CONTRACT_VERSION,
      experiment_id: EXPERIMENT_ID,
      engine: "typescript-deterministic",
      requirements: [
        {
          id: "present",
          requirement: "Worker artifact present",
          expected: "non-empty raw output",
          observed: "empty",
          verdict: "FAIL",
        },
      ],
      verdict: "INDETERMINATE",
    };
  }

  const lines = visibleLines(raw);
  const joined = lines.join("\n");
  const requirements: RequirementResult[] = [
    {
      id: "count",
      requirement: "Exactly 5 logical lines",
      expected: "5",
      observed: String(lines.length),
      verdict: lines.length === 5 ? "PASS" : "FAIL",
    },
  ];

  EXPECTED_BLOCKS.forEach((expected, index) => {
    const observed = lines[index] ?? "(missing)";
    requirements.push({
      id: `block-${index + 1}`,
      requirement: `Block ${index + 1}`,
      expected,
      observed,
      verdict: observed === expected ? "PASS" : "FAIL",
    });
  });

  const extra = lines.slice(5);
  requirements.push({
    id: "no-sixth",
    requirement: "No sixth block",
    expected: "absent",
    observed: extra.length === 0 ? "absent" : extra.join(" | "),
    verdict: extra.length === 0 ? "PASS" : "FAIL",
  });

  const selfCert = /\b(PASS|SUCCESS)\b/i.test(joined);
  requirements.push({
    id: "no-self-cert",
    requirement: "No worker PASS/SUCCESS self-certification",
    expected: "absent",
    observed: selfCert ? "present" : "absent",
    verdict: selfCert ? "FAIL" : "PASS",
  });

  return {
    contract_version: CONTRACT_VERSION,
    experiment_id: EXPERIMENT_ID,
    engine: "typescript-deterministic",
    requirements,
    verdict: requirements.every((item) => item.verdict === "PASS") ? "PASS" : "FAIL",
  };
}

export function isClaim(value: unknown): value is Claim {
  return value === "PASS" || value === "FAIL" || value === "UNCLEAR";
}

export function isDisposition(value: unknown): value is HumanDisposition {
  return value === "ACCEPT" || value === "REJECT" || value === "CHALLENGE";
}

export function isModel(value: unknown): value is SelfReportedModel {
  return typeof value === "string" && (MODELS as readonly string[]).includes(value);
}

export function qcEvidenceRelation(qc: Claim | null, evidence: EvidenceVerdict | null): "AGREE" | "DISAGREE" | "INDETERMINATE" {
  if (!qc || !evidence || qc === "UNCLEAR" || evidence === "INDETERMINATE") return "INDETERMINATE";
  return qc === evidence ? "AGREE" : "DISAGREE";
}

export type LiveSnapshot = {
  experiment_id: string;
  contract_version: string;
  sessions: number;
  completed: number;
  worker_pass: number;
  worker_fail: number;
  worker_unclear: number;
  evidence_pass: number;
  evidence_fail: number;
  evidence_indeterminate: number;
  qc_agrees: number;
  qc_disagrees: number;
  qc_indeterminate: number;
  qc_pass: number;
  qc_fail: number;
  qc_unclear: number;
  human_accept: number;
  human_reject: number;
  human_challenge: number;
  worker_models: Record<string, number>;
  label: string;
};
