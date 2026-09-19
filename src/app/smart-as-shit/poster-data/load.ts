import c0 from "./c0";
import c1 from "./c1";
import c2 from "./c2";
import c3 from "./c3";
import c4 from "./c4";
import c5 from "./c5";
import c6 from "./c6";
import c7 from "./c7";
import c8 from "./c8";
import c9 from "./c9";
import c10 from "./c10";
import c11 from "./c11";
import c12 from "./c12";
import c13 from "./c13";
import c14 from "./c14";
import c15 from "./c15";
import c16 from "./c16";
import c17 from "./c17";
import c18 from "./c18";
import { gunzipSync } from "node:zlib";
const EXPECTED_BYTES = 335734;
const EXPECTED_SHA256 = "cb2af5c9b58e7738eacf4d9cd40c565462dd47b5d4fa1078049e42b531418760";
export function loadAsset(): Buffer {
  const compressed = Buffer.from(c0+c1+c2+c3+c4+c5+c6+c7+c8+c9+c10+c11+c12+c13+c14+c15+c16+c17+c18, "base64");
  const raw = gunzipSync(compressed);
  if (raw.length !== EXPECTED_BYTES) throw new Error(`${raw.length}`);
  return raw;
}
