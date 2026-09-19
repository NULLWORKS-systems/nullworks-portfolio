import paper0 from "./paper0";
import paper1 from "./paper1";
import paper2 from "./paper2";
import paper3 from "./paper3";
import paper4 from "./paper4";
import paper5 from "./paper5";
import paper6 from "./paper6";
import paper7 from "./paper7";
import { gunzipSync } from "node:zlib";

export const EXPECTED_BYTES = 860056;
export const EXPECTED_SHA256 = "e9d58c56d6a6302f4c524014a1e5fe8a16b9f65241de1929f9083031854f8409";

export function loadAsset(): Buffer {
  const raw = gunzipSync(Buffer.from(paper0+paper1+paper2+paper3+paper4+paper5+paper6+paper7, "base64"));
  if (raw.length !== EXPECTED_BYTES) {
    throw new Error("smart-as-shit asset length mismatch: " + raw.length);
  }
  return raw;
}
