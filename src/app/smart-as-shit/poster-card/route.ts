import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const dir = join(process.cwd(), "src/app/smart-as-shit/_media");
  const parts = await Promise.all(
    [1, 2, 3, 4].map((i) => readFile(join(dir, `poster-${i}.b64`), "utf8")),
  );
  return new Response(Buffer.from(parts.join(""), "base64"), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
