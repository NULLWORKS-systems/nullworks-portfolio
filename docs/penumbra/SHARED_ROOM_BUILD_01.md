# PENUMBRA — Shared Room Foundation / Build 01

**Status:** implementation foundation for review only. No production migration, deployment, or invitation authorized by this change.

## Mission
Mason Perry and Jason Rains can independently authenticate, enter one private workroom, read the same persistent chronological thread, and post human messages. An AI worker contributes as a separate, attributed participant once a server-side authorization bridge is added.

## Existing evidence
- PENUMBRA currently persists seats and thread in browser localStorage (`WorkroomClient.tsx`, STORAGE `nullworks.penumbra.v0.3`). This cannot deliver cross-device continuity.
- PENUMBRA's existing two-pass model exchange is request-local and can remain intact for research; do not silently attach a new private human room to its public run endpoint.
- Jason's browser Huddle was previously deployed, but verified end-to-end joint device participation is not evidenced in the Hive receipt.
- Supabase connection exposes several projects; none is positively assigned as the PENUMBRA datastore. Do not apply migration until the target is identified and owner-approved.

## Proposed vertical slice
1. Add database tables for rooms, members, append-only events (SQL companion in `sql/penumbra_shared_room_foundation.sql`).
2. Authenticate each human using verified Supabase Auth identity; authorize from `auth.uid()`, never a display name or user-editable metadata claim.
3. Owner creates a room; dedicated invitation endpoint verifies target account, checks owner permission, records a limited membership grant and consent. Do not publicly expose an invite token or join-by-guessing.
4. Members read and append human-authored messages. Use `client_event_id` to make retries idempotent, order by `created_at,id`, paginate before implementing long threads.
5. Add authenticated Realtime subscriber or polling fallback; resync after reconnect, rather than assuming delivery exactly once.
6. Add server-side AI bridge: only an authenticated member can request an AI turn; request includes canonical room ID and validated recent events; model identity and provenance recorded. AI writes use a server-held secret, never browser credentials.
7. Never expose full Hive content to Jason implicitly. Only explicitly scoped workroom context with redaction/permission controls may be read by the agent.
8. Both humans consent before Huddle voice transcripts become durable; text messages deliberately submitted to the workroom can be retained under disclosed room policy.
9. Keep Mason as final NULLWORKS authority. AI agreement cannot trigger outward actions.

## Verification gates (must pass before deployment/invitation)
- Mason posts on device A; Jason sees it on B without copy/paste or browser storage sharing.
- Jason posts on B; Mason sees it on A; both see the message after refresh and reconnect.
- Unauthenticated request returns denied; unrelated authenticated user cannot list, read, write, or subscribe to room.
- Jason cannot grant memberships, fabricate an AI actor, edit another person's post, or access unrelated Hive scopes.
- Two parallel retries with the same client_event_id produce exactly one event.
- AI answer quotes or directly addresses a persisted human message, is labeled with actual provider/model, and is visible to both users after refresh.
- Browser closed during a post: reopened session catches up from the server; no message loss.
- Voice transcription is opt-in; absent dual consent, no durable transcript writeback.
- Verify RLS using actual independent Mason/Jason/nonmember Auth sessions, not only service-role queries.
- Check database security advisors and explicit grants; inspect service-role credential placement.

## Deployment boundary
This branch is safe for inspection. SQL is **not applied**. Do not merge, deploy, send invites, or grant Jason access until Mason approves the exact target, security tests, and deployment.

## Engineering note
The SQL is a foundation, not a turnkey app. The human messaging endpoints, private room UI, invite ceremony, realtime subscription, and AI gateway remain to be implemented and tested. Do not mark the feature live from a migration receipt alone.
