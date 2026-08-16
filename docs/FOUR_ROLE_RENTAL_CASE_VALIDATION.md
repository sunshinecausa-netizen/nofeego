# Four-Role Rental Case Candidate Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Base commit | PASS | Worktree created from `80f9adf` |
| Selective migration | PASS | No cherry-pick; audit lists retained/reimplemented/rejected files |
| TypeScript | PASS | `pnpm typecheck`, 0 errors |
| ESLint | PASS with baseline warnings | 0 errors, 35 existing warnings; first candidate error in `/auth/callback` was fixed |
| Production Build | PASS | Placeholder public Supabase values; Google Fonts network allowed; 46/46 pages generated |
| `git diff --check` | PASS | Only Git line-ending notices |
| Destructive SQL scan | PASS | Candidate contains no `DROP TABLE`, `DROP COLUMN` or `TRUNCATE` |
| Supabase Bootstrap | NOT RUN | Supabase CLI unavailable |
| Reconciliation replay | NOT RUN | Explicitly prohibited from production; disposable local runner unavailable |
| Profile Hotfix SQL execution | NOT RUN | Docker Desktop local engine unavailable |
| Rental Case SQL authorization test | NOT RUN | Test script supplied, but no disposable Postgres/Supabase runtime |
| Production DB / deployment | NOT RUN | Prohibited; candidate remains `DEPLOYMENT PAUSED` |

## Build command

The successful build used non-secret placeholders only:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='public-build-validation-placeholder'
pnpm build
```

No request was made to a real Supabase project. The initial sandboxed build failed at Google Fonts network access; the next attempt without public Supabase placeholders passed compilation and TypeScript but stopped at the existing sitemap environment requirement. The final command passed completely.

## Database test handoff

When a disposable seed-disabled Supabase runtime is available:

1. Replay the approved local baseline through `20260815100000_create_rental_cases.sql`.
2. Apply `20260816160000_four_role_rental_case_candidate.sql`.
3. Execute `supabase/tests/four_role_rental_case_candidate.sql` with `ON_ERROR_STOP`.
4. Confirm the transaction rolls back and prints `FOUR_ROLE_RENTAL_CASE_CANDIDATE=PASS`.
5. Separately add negative assertions for direct profile mutation, invitation reuse/expiry, unauthorized Agent access and recommendation snapshot UPDATE/DELETE before any deployment approval.

Until those steps pass, database/RLS behavior is a reviewed candidate contract, not a runtime-verified fact.
