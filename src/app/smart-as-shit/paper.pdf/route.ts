import { NextRequest } from "next/server";
import { loadAsset } from "../paper-data/load";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET(request: NextRequest) {
  const body = loadAsset();
  const download = request.nextUrl.searchParams.get("download") === "1";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(body.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Smart_as_Shit_Finding_Data_in_Unexpected_Places.pdf"`,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
