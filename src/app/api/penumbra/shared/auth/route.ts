import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const url = process.env.PENUMBRA_SUPABASE_URL || "";
  const anon = process.env.PENUMBRA_SUPABASE_ANON_KEY || "";
  const allowed = new Set((process.env.PENUMBRA_ALLOWED_EMAILS || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean));
  if (!url || !anon || !allowed.size) return NextResponse.json({error:"Authentication not configured"}, {status:503});
  let email = "";
  try { const data = await req.json(); email = typeof data.email === "string" ? data.email.trim().toLowerCase() : ""; } catch {}
  if (!email || email.length > 254 || !allowed.has(email)) return NextResponse.json({error:"Email is not authorized for this workroom"}, {status:403});
  const origin = new URL(req.url).origin;
  const r = await fetch(url + "/auth/v1/otp", {method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({email,create_user:true,gotrue:origin+"/penumbra-shared"})});
  if (!r.ok) return NextResponse.json({error:"Could not send magic link. Check Supabase email delivery and redirect URL settings."},{status:502});
  return NextResponse.json({ok:true});
}
