// Compatibility route for the retired external triage HTML host.
// The local /triage questionnaire is the maintained, tested destination.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const incoming = new URL(request.url);
  const destination = new URL("/triage", incoming.origin);
  // Preserve existing inbound campaign/attribution parameters, if supplied.
  destination.search = incoming.search;
  return new Response(null, {
    status: 307,
    headers: {
      location: destination.pathname + destination.search,
      "cache-control": "no-store, max-age=0",
      "x-nullworks-triage-compat": "local-redirect-v1",
    },
  });
}
