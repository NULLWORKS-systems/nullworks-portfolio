import { pdf } from "../../_media/pdf";

export function GET() {
  const body = Buffer.from(pdf, "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"Smart_as_Shit_Finding_Data_in_Unexpected_Places_Mason_Perry.pdf\"",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
