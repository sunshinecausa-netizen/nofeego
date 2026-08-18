# Production public catalog snapshot (Preview only)

This directory contains a sanitized, read-only snapshot of the existing Production public Buildings API. It is used only for protected Preview visual and map acceptance.

- Refresh: `pnpm snapshot:public:refresh`
- Clean: `pnpm snapshot:public:clean`
- Source tag: `production_public_snapshot`
- Production runtime: forcibly disabled
- Production writes: none; the refresh script uses paginated anonymous `GET` requests only

The JSON is generated from an explicit public-display whitelist. It excludes units, raw inventory snapshots, building sources, contacts, Agent fields, Tenant/Rental Case/Application data, auth data, audit records, and credentials.

Current snapshot summary (2026-08-18):

- Buildings: 1,598
- Valid coordinate pairs: 1,598
- Missing coordinate pairs: 0
- Unique coordinate locations: 1,591
- Missing public addresses: 0

Seven coordinate locations are shared by two distinct public Building records. They remain separate Buildings and are handled by map clustering; they are not automatically merged.
