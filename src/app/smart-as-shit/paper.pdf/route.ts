import { loadAsset } from "../_bin/loadPaper";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  const body = loadAsset();
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"Smart_as_Shit_Finding_Data_in_Unexpected_Places_Mason_Perry.pdf\"",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
