import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkerArtifact } from "./tinkerers-contract.ts";

const VALID = [
  "BLOCK 1: ORBIT",
  "BLOCK 2: 230",
  "BLOCK 3: EVIDENCE BEFORE CLAIMS",
  "BLOCK 4: HUMAN AUTHORITY",
  "BLOCK 5: BLOCK_COUNT=5",
].join("\n");

const INVALID_SINGLE_LINE =
  "BLOCK 1: ORBIT BLOCK 2: 230 BLOCK 3: EVIDENCE BEFORE CLAIMS BLOCK 4: HUMAN AUTHORITY BLOCK 5: BLOCK_COUNT=5";

test("NW-PHX-001 canonical valid fixture passes", () => {
  const result = validateWorkerArtifact(VALID);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.requirements.find((item) => item.id === "count")?.observed, "5");
});

test("NW-PHX-001 canonical single-line fixture fails despite five semantic labels", () => {
  const result = validateWorkerArtifact(INVALID_SINGLE_LINE);
  assert.equal((INVALID_SINGLE_LINE.match(/BLOCK\s+[1-5]:/g) || []).length, 5);
  assert.equal(result.requirements.find((item) => item.id === "count")?.observed, "1");
  assert.equal(result.verdict, "FAIL");
});
