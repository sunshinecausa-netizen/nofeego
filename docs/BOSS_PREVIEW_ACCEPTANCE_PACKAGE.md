# Boss Preview acceptance package

Status: **LOCAL CHECKPOINT VALIDATED — CURRENT PREVIEW OWNER ACCEPTANCE PENDING**. The migration replay and RLS/RPC suites pass locally. The protected Preview contains the four-role Rental Case, Property Outreach, Agent workflow and Agent Inventory implementation; Production remains paused.

## Eight-step business acceptance

1. Sign in through Vercel team SSO and confirm the Preview URL exactly matches the one below.
2. On mobile, open the student landing page, start a request, and submit synthetic move-in, budget and unit-type details as Tenant.
3. Confirm the Tenant reaches a private Case with a stable Case ID and cannot open Admin pages.
4. As Admin, review the new Case and assign the supplied Preview Agent.
5. As Agent, add a current synthetic option; confirm an unassigned or Property-only route is denied.
6. As Tenant, select that recommendation and confirm the immutable option snapshot remains unchanged.
7. As Agent/Admin, create and approve the Property contact draft and use **simulated delivery only**; test retry after simulated failure.
8. As Property, acknowledge the authorized Registration; then finish the Case through tour, application and `lease_signed` (or explicitly `closed_lost`).

## Preview safety

- Preview is not Production.
- Access protection must remain enabled.
- Test credentials are provided separately and never stored in Git.
- Property Outbox uses `simulated_sent`; no real external email is sent.
- Production database, Vercel Production, DNS and production environment variables remain untouched.

## Preview deployment

- Preview URL: `https://nofeego-3j30mpt53-sunshinecausa-6607s-projects.vercel.app`
- Vercel deployment: `dpl_Mha2dnK7vyHqBwgw9UAc75LbQTRw` (`target=preview`, `READY`)
- Access method: Vercel Deployment Protection (team SSO), followed by the app-level private Preview gate when requested
- Supabase project: `nofeego-four-role-preview-test` (`ryggdqapmqgwqhtbwaka`, `us-west-2`)
- Tenant / Agent / Property / Admin credentials: provide through a private channel; never store them in Git or this document
- Automated acceptance Case ID: `85000000-0000-4000-8000-000000000002` (synthetic, terminal `lease_signed`)

## Final acceptance evidence

- PASS — Vercel SSO protection: unauthenticated HTTPS request redirects to the Vercel SSO endpoint.
- PASS — environment isolation: deployed Supabase URL and keys target only `ryggdqapmqgwqhtbwaka`; no Production Supabase configuration was supplied.
- PASS — Tenant, Agent, Property and Admin sign-in, sign-out and safe return routes on desktop and 390×844 mobile viewport.
- PASS — Tenant→Admin, Agent→Property and Property→Agent route denial; SQL RLS/RPC suite also passed against the Preview project.
- PASS — 13-status database contract and 11-status main path, including recommendation selection, Property acknowledgement and terminal `lease_signed`.
- PASS — immutable recommendation snapshot, assigned-Agent visibility, authorized-Building Property access and last-Admin protection.
- PASS — Outbox draft/approval, simulated failure, retry and `simulated_sent` with two attempts; no real email was sent.
- PASS — TypeScript, ESLint (zero errors), Production Build and `git diff --check`; final browser regression recorded zero console errors.

## Known limits before Production

- The Preview contains only synthetic fixtures and is not a production-volume or deliverability test.
- Real email delivery remains intentionally disabled; the Outbox validates simulation and manual fallback only.
- The repository has 35 pre-existing ESLint warnings outside this P0 acceptance gate; there are zero lint errors.
- Google Maps/Street View and Vercel protection assets are expected third-party browser dependencies; no unexpected email or analytics destination was observed during this acceptance run.
- Production migration execution, secrets, DNS, monitoring, mail-provider setup and deployment remain separately gated.

## Approved migration scope

1. `20260805130112_empty_project_schema_bootstrap.sql`
2. `20260814000000_reconcile_remote_schema.sql`
3. `pending_migrations/20260809000100_tenant_accounts_phase_1.sql`
4. `20260814000200_profile_privilege_escalation_hotfix.sql`
5. `20260815080000_rental_case_inquiry_contract_candidate.sql`
6. `20260815100000_create_rental_cases.sql`
7. `20260816160000_four_role_rental_case_candidate.sql`
8. `20260816190000_four_role_rental_case_p0_candidate.sql`
9. `20260816210000_acquisition_property_outbox_candidate.sql`
10. `pending_migrations/20260817110000_property_outreach_contact_contract_candidate.sql` (Preview exception; Production paused)
11. `pending_migrations/20260817130000_agent_case_progress_candidate.sql` (Preview exception; Production paused)

Seed, absorbed historical migrations, production data and production migration-ledger operations are excluded.

## Retention and safe deletion

- Recommended retention: seven days after business acceptance, no later than August 23, 2026 unless the owner extends it.
- Before deletion: export no customer data; confirm no real customer or employee account was used; record only PASS/FAIL evidence.
- Delete the Vercel Preview deployment by its deployment ID.
- Delete the isolated Supabase project by Project ID `ryggdqapmqgwqhtbwaka`.
- Remove local temporary credentials and verify the Production deployment, Production environment variables and canonical Supabase project are unchanged.
- Deletion is a separate destructive action and requires explicit owner confirmation at that time.
