import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const url = process.env.PENUMBRA_SUPABASE_URL || "";
const anon = process.env.PENUMBRA_SUPABASE_ANON_KEY || "";
const secret = process.env.PENUMBRA_SUPABASE_SERVICE_ROLE_KEY || "";
const ownerEmail = (process.env.PENUMBRA_MASON_EMAIL || "").trim().toLowerCase();
const allowed = () => new Set((process.env.PENUMBRA_ALLOWED_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
async function db(path: string, init: RequestInit = {}) {
  return fetch(url + "/rest/v1/" + path, { ...init, cache: "no-store", headers: { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json", ...init.headers } });
}
async function identity(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) return null;
  const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + token }, cache: "no-store" });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id && typeof u.email === "string" && allowed().has(u.email.toLowerCase()) ? { id: u.id as string, email: u.email.toLowerCase() as string } : null;
}
async function roomFor(user: {id:string;email:string}) {
  let rooms = await db("penumbra_room_members?select=room_id,role&user_id=eq." + encodeURIComponent(user.id) + "&limit=1");
  if (!rooms.ok) throw Error("Membership lookup failed");
  let memberships = await rooms.json();
  if (memberships.length) return memberships[0].room_id as string;
  if (user.email !== ownerEmail || !ownerEmail) return null;
  const existing = await db("penumbra_rooms?select=id&owner_user_id=eq." + encodeURIComponent(user.id) + "&limit=1");
  if (!existing.ok) throw Error("Room lookup failed");
  const rows = await existing.json();
  let id = rows[0]?.id;
  if (!id) {
    const created = await db("penumbra_rooms", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: "NULLWORKS PENUMBRA", owner_user_id: user.id }) });
    if (!created.ok) throw Error("Room creation failed");
    id = (await created.json())[0].id;
  }
  const member = await db("penumbra_room_members", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ room_id: id, user_id: user.id, role: "owner", display_name: "Mason" }) });
  if (!member.ok) throw Error("Owner membership failed");
  return id as string;
}
export async function GET(req: NextRequest) {
  if (!url || !anon || !secret || !ownerEmail) return json({ error: "PENUMBRA configuration incomplete" }, 503);
  const user = await identity(req);
  if (!user) return json({ error: "Unauthorized" }, 401);
  try {
    const roomId = await roomFor(user);
    if (!roomId) return json({ error: "Account authenticated but room membership is not approved" }, 403);
    const r = await db("penumbra_room_events?select=id,actor_type,actor_label,content,provider,model,created_at&room_id=eq." + encodeURIComponent(roomId) + "&order=created_at.asc&limit=500");
    if (!r.ok) return json({ error: "Room read failed" }, 502);
    return json({ roomId, email: user.email, events: await r.json() });
  } catch { return json({ error: "Shared room unavailable" }, 500); }
}
export async function POST(req: NextRequest) {
  if (!url || !anon || !secret || !ownerEmail) return json({ error: "PENUMBRA configuration incomplete" }, 503);
  const user = await identity(req);
  if (!user) return json({ error: "Unauthorized" }, 401);
  try {
    const roomId = await roomFor(user);
    if (!roomId) return json({ error: "Room membership required" }, 403);
    const payload = await req.json();
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content || content.length > 12000) return json({ error: "Message must contain 1–12000 characters" }, 400);
    const r = await db("penumbra_room_events", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ room_id: roomId, author_user_id: user.id, actor_type: "human", actor_label: user.email === ownerEmail ? "Mason" : "Member", content }) });
    if (!r.ok) return json({ error: "Message write failed" }, 502);
    return json({ event: (await r.json())[0] }, 201);
  } catch { return json({ error: "Message could not be saved" }, 500); }
}
