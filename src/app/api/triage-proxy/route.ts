const SOURCE = "https://nullworks-triage.nullworks-6346.chatgpt.site/";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await fetch(SOURCE, { cache: "no-store" });
  if (!response.ok) {
    return new Response("NULLWORKS triage source unavailable", { status: 502 });
  }

  let html = await response.text();

  html = html.replaceAll("assurance@nullworks.ai", "nullworks.neuraxis@gmail.com");

  html = html.replace(
    `<button class="btn" onclick="mailtoRoute('\${m.state}','\${m.score}')">I’M INTERESTED IN \${m.route.toUpperCase()} →</button>`,
    `<button class="btn" onclick="nextStepRoute('\${m.state}','\${m.score}','\${m.route}')">SEE WHAT NULLWORKS CAN DO NEXT →</button>`,
  );

  const start = html.indexOf("function mailtoRoute(state,score){");
  const end = html.indexOf("\nfunction restart(){", start);
  if (start >= 0 && end > start) {
    const replacement = `function nextStepRoute(state,score,route){const q=new URLSearchParams({state:String(state),score:String(score),route:String(route)});location.href='/ai-audit/next-step?'+q.toString()}`;
    html = html.slice(0, start) + replacement + html.slice(end);
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
