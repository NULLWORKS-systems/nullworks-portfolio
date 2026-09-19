import { png } from "../../_media/png";

export function GET() {
  const body = Buffer.from(png, "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
