# NULLWORKS / PENUMBRA — Shared Room Build 02

**Status:** local staged implementation; **not deployed**. Built for integration into `NULLWORKS-systems/nullworks-portfolio` (Next.js 16 App Router). No existing PENUMBRA files are overwritten.

## What is included
- `/penumbra-workroom/shared`: mobile-first room screen, two-human authenticated posting, 3.5-second synchronization polling, manually invoked OpenAI response with explicit model attribution.
- `/api/penumbra-shared/[...parts]`: email OTP authentication, rotating HttpOnly session cookies, room creation and member-only reads, append-only messages, one-time targeted invitations, and server-side AI turn.
- `sql/penumbra_shared_room_mvp.sql`: rooms, memberships, events, invitations, RLS and least-privilege grants. **Not applied.**
- Pure validation guards and unit tests.

## Integration
Copy the `src/` tree into the Next.js repo without replacing existing files. Stage the SQL file for review, not automatic migration. Confirm routes do not conflict with other application routes. Run `npm run build` and the pure tests before deployment.

## Required server-only environment
```
PENUMBRA_SUPABASE_URL=https://<dedicated-project>.supabase.co
PENUMBRA_SUPABASE_ANON_KEY=(publishable/legacy anon key)
PENUMBRA_SUPABASE_SERVICE_ROLE_KEY=(server secret, never NEXT_PUBLIC_)
PENUMBRA_ALLOWED_EMAILS=(exact Mason and Jason email addresses, comma-separated)
PENUMBRA_MASON_EMAIL=(Mason approved email)
PENUMBRA_JASON_EMAIL=(Jason approved email)
AI_GATEWAY_API_KEY=(existing authorized gateway secret)
PENUMBRA_AI_MODEL=(a model verified as supported by the AI Gateway)
PENUMBRA_AI_ENABLED=false  # set true only after model-use budget approved
```
Do not paste keys into chat or commit them. Never expose service-role key in client code. Create a dedicated project only after confirming billing and owner approval.

## Operational constraints
- Auth/OTP start and invite creation can send email or produce a shareable URL only when a user deliberately invokes them in the deployed product. No email was sent by creating this package.
- The invite is **prepared, not sent**; only Mason decides recipient/channel, and the URL expires after 24 hours.
- The ChatGPT seat uses an OpenAI API model, not the live ChatGPT app session or its connected tools. The AI call is opt-in, model-usage-billed, and disabled by default until `PENUMBRA_AI_ENABLED=true` is approved. A partial unique database index prevents multiple AI replies per human message. No automated tool execution, Hive retrieval, or voice transcript persistence.
- Member event reads/writes use the user's JWT and RLS, not a server service-role bypass. Human event insert column grants force actor_label='Human'; speaker display names derive server-side from membership records. AI event insert and invite mutation use service role only after explicit server-side membership/owner checks.
- Current sync method is polling. No presence guarantees, typing indicators or push notifications. Do not mistake the UI's 'connected session' text for a proven peer-online status.
- The current 120-event window and 30-event AI context need pagination/context budgeting before scale.
- Strict simultaneous AI retry admission control and persistent rate limits are future improvements; the unique event ID deduplicates stored messages, not gateway charges.
- A claimed invite followed by transient database failure requires issuing a new invite; avoid representing it as successful without checking membership.
- No automatic membership grant occurs just from email whitelist; room owner generates an invite token.

## Acceptance test
1. Apply migration to the **approved dedicated** project; run security advisors and verify RLS as two real user identities + an unrelated authenticated user.
2. Configure server secrets and allowlist on a separately approved preview environment.
3. Mason signs in and creates a private room; Jason signs in separately and cannot read it yet.
4. Mason prepares invite for Jason's exact email, separately approves delivery, then Jason follows link and claims it.
5. Mason posts a unique marker; Jason sees it on second device. Jason replies; Mason sees it. Refresh both browsers.
6. Try unrelated user, fabricated actor_type='ai', wrong-email invite, expired/reused invite, cross-origin POST, and duplicate event IDs. All must fail safely or deduplicate.
7. Explicitly select Ask ChatGPT; verify exactly one attributed AI event persisted and visible to both. Check provider/model, request cost and rate limits.
8. Close both browsers, reopen hours later, and verify server-side history. Test authentication refresh and permissions again.
9. Only after evidence passes, propose final deployment URL and invite payload to Mason for exact approval.

## Evidence boundary
No live database has been changed. No preview or production route has been deployed. No invitations were sent. Unit tests cover guards, not end-to-end database authentication, RLS, persistence, or gateway integration.
