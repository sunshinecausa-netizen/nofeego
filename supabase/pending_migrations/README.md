# DEPLOYMENT PAUSED — pending migrations

Files in this directory are not part of the formal production reconstruction chain and are not represented in the remote fact baseline. Do not execute, push, include-all, or mark them applied.

They require redesign/review against the reconciled schema and must receive new ordering/version decisions before any future deployment proposal.

## Fixed roles

The only final application roles are:

- `tenant`
- `agent`
- `property`
- `admin`

Property users are not subdivided in phase one. `Leasing Team` is not a separate role, and no Leasing-Team-to-Property role mapping or extra role enum may be introduced.

Any pending migration that currently models fewer roles, different labels, subroles, or role mappings must be revised before approval. This README records the governing requirement; it does not authorize editing or executing the pending SQL.
