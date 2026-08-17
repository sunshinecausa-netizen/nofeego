# Four-Role Rental Case Checkpoint Validation

Validation date: 2026-08-17

Branch: `codex/four-role-rental-case`

Production state: **DEPLOYMENT PAUSED**

## Checkpoint evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Migration directory normalization | PASS | Formal reconstruction starts with `20260805130112_empty_project_schema_bootstrap.sql` and `20260814000000_reconcile_remote_schema.sql`; absorbed and prohibited-data migrations are outside the active chain |
| Seed isolation | PASS | Local project `nofeego-four-role-p0-validation`; `[db.seed] enabled = false`; reset used `--no-seed` |
| Active migration replay | PASS | `supabase db reset --local --no-seed` replayed all active migrations through `20260816210000_acquisition_property_outbox_candidate.sql` |
| Approved Preview exceptions | PASS | Property Outreach and Agent Case Progress candidates applied explicitly after reset; no `--include-all`, ledger repair or hosted DB write |
| Four-role RLS/RPC | PASS | `FOUR_ROLE_RENTAL_CASE_CANDIDATE=PASS` |
| Property Outreach RLS/RPC | PASS | `PROPERTY_OUTREACH_CANDIDATE=PASS` |
| Agent Case Progress RLS/RPC | PASS | `AGENT_CASE_PROGRESS_CANDIDATE=PASS` |
| TypeScript | PASS | `pnpm typecheck`, 0 errors |
| ESLint | PASS with baseline warnings | 0 errors, 35 existing warnings |
| Production Build | PASS | Non-secret placeholder public Supabase values; all routes generated, including Agent Inventory detail |
| `git diff --check` | PASS | No whitespace errors; Git line-ending notices only |
| Sensitive-content scan | PASS | No password, API key, JWT, service-role secret or private key in Checkpoint files |
| Production DB / deployment | NOT RUN | Explicitly prohibited; no Production environment or ledger mutation |

## Current protected Preview

- URL: `https://nofeego-3j30mpt53-sunshinecausa-6607s-projects.vercel.app`
- Deployment ID: `dpl_Mha2dnK7vyHqBwgw9UAc75LbQTRw`
- Vercel state: `READY`, target `preview`, team SSO protection enabled
- Supabase Preview Project ID: `ryggdqapmqgwqhtbwaka`
- Bundle isolation audit: only `ryggdqapmqgwqhtbwaka` is present; the Production Supabase project reference is absent
- Data: synthetic Preview fixtures only; no Production data and no real outbound email

## Validated authorization behavior

- Tenant reads only the Tenant-owned Rental Case path and cannot use Agent/Admin/Property APIs.
- Agent reads assigned Rental Cases; unauthorized Inventory Building requests return `403`.
- Property Registration reads require authorized Organization/Building relationships.
- Admin mutation remains RPC-controlled, including last-Admin and self-authorization protections.
- Recommendation snapshots are immutable; Property Outreach delivery remains simulated/manual only.
- Agent Inventory API returns only Buildings connected to the Agent's active assigned Cases; Tenant access returns `403`, and Tenant-visible internal Property Contacts remain zero.

## Build command

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='public-build-validation-placeholder'
pnpm build
```

These are non-secret build placeholders. The build does not connect to a Supabase project.

## Remaining gates

- Owner desktop/mobile acceptance of the current Agent Inventory Preview remains a business acceptance step.
- Production migration execution, real delivery provider configuration, Production deployment and rollback approval remain separately gated.
- Candidate migrations marked `DEPLOYMENT PAUSED` are not authorized for Production by this Checkpoint.
