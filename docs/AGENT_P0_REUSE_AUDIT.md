# Agent P0 reuse audit

Date: 2026-08-18
Baseline: `a5649b2b58f79e9dc4dfb3f98465f8d17435b893`
Branch: `codex/agent-features-next`

## Source-of-truth conclusion

The existing Rental Case model is the single source of truth. P0 must extend it; it must not create duplicate user, profile, role, Building, Unit, Rental Case, Recommendation, Application, contact, or Outbox models.

| Capability | Canonical existing model | Status | P0 action |
|---|---|---|---|
| Tenant account | Supabase Auth + `profiles` | Exists | Reuse protected profile bootstrap and safe auth return |
| Tenant request | `inquiries` + `create_rental_case_from_inquiry` | Exists | Reuse; add lease term/contact preference fields to the owned inquiry only if absent |
| Rental Case | `rental_cases` | Exists | Reuse; retain canonical `/cases/:id` URL and server-side transition RPC |
| Agent assignment | `rental_cases.assigned_agent_id` + `admin_assign_rental_case` | Exists | Reuse; RLS remains assigned-Agent only |
| Recommendations | `rental_case_recommendation_snapshots` + `agent_send_recommendation` | Exists | Reuse immutable snapshots; add explicit idempotency protection |
| Tenant selection | `rental_case_recommendation_feedback` | Exists | Reuse; one selected Recommendation drives the active Application |
| Applications | `applications` linked by `rental_case_id` and `building_id` | Partial | Reuse; add independent immutable status history and stricter transition RPC |
| Application history | none independent of Case history | Missing | Add `application_status_history` with default-deny RLS and append-only RPC writes |
| Agent inventory authorization | `agent_building_inventory_access` | Exists | Reuse; never substitute `property_building_access` |
| Internal inventory | `units`, `inventory_snapshots`, `building_sources` | Exists | Reuse through Agent-authorized RLS only; Public projection remains unchanged |
| Property organization/contact | `property_organizations`, `property_building_access`, `property_contacts` | Exists | Reuse reviewed contacts only |
| Property Outbox | `property_contact_outbox` | Partial | Reuse; replace simulated-send UI with manual `mailto:` and idempotent server `Mark as sent` |
| Audit log | `rental_case_audit_logs` | Exists | Reuse for Recommendation, Application, Outbox, and terminal lease events |
| Tenant progress | Case participant RLS + Case detail API | Partial | Add an explicit tenant-safe projection in the API; omit internal notes, contacts, commission, sources, drafts |

## Existing controls to preserve

- `current_account_role()` and protected Profile authorization fields.
- Tenant-owned Rental Case reads; assigned-Agent reads; Admin management; Property Building-scoped access.
- `agent_building_inventory_access` is independent from the complete Public Catalog.
- Public Views and `lib/public-buildings.ts` omit internal fields.
- Safe `next` validation rejects absolute, protocol-relative, and backslash redirects.
- Inquiry idempotency and canonical Case redirect already exist.
- Recommendation values are saved as sent-time snapshots.
- Rental Case transitions are performed by a protected RPC and recorded in immutable Case history.

## P0 gaps requiring additive reconciliation

1. Inquiry lacks explicit lease-term and contact-preference fields.
2. Recommendation lacks an explicit client idempotency key/unique constraint.
3. Application status changes overwrite the Application row without an independent immutable history table.
4. Application transitions currently accept arbitrary moves within a status list rather than an explicit transition graph.
5. Application is missing `lease_sent`, `lease_signed`, signed timestamp, and non-sensitive lease reference.
6. Outbox supports simulated delivery, but P0 requires `mailto:` plus server-confirmed, idempotent `Mark as sent`.
7. Tenant Case detail currently queries complete Application and Outbox rows; it needs a tenant-safe response projection.

These gaps can be handled by one additive, rollback-aware candidate migration. No destructive DDL, Production permission expansion, or second source of truth is required.

## Environment note

The local Docker database was not reachable from the restricted shell during the initial audit. No database was changed. Candidate SQL must be validated only against the approved isolated Supabase/local database before Preview creation.
