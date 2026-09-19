import poster0 from "./poster0";
import poster1 from "./poster1";
import poster2 from "./poster2";
import poster3 from "./poster3";
import { gunzipSync } from "node:zlib";

export const EXPECTED_BYTES = 335734;
export const EXPECTED_SHA256 = "cb2af5c9b58e7738eacf4d9cd40c565462dd47b5d4fa1078049e42b531418760";

export function loadAsset(): Buffer {
  const raw = gunzipSync(Buffer.from(poster0+poster1+poster2+poster3, "base64"));
  if (raw.length !== EXPECTED_BYTES) {
    throw new Error("smart-as-shit asset length mismatch: " + raw.length);
  }
  return raw;
}
