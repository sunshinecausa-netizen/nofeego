# Accepted Product Baseline

## Acceptance identity

- Acceptance date: 2026-08-18
- Accepted Product Commit: `03588762679ce55a44fedb517ebeb0b7abe48cdf`
- Accepted Deployment: `dpl_EuJQTCL365hk5eBJXiwUahB3x6jz`
- Accepted branch: `codex/public-home-safe-candidate`
- Deployment target: protected Vercel Preview
- Deployment created: 2026-08-18 09:15:39 EDT
- Preview root: https://nofeego-kxhlnf4et-sunshinecausa-6607s-projects.vercel.app
- Accepted Public Buildings entry: https://nofeego-kxhlnf4et-sunshinecausa-6607s-projects.vercel.app/buildings?publicSnapshot=production_public_snapshot
- Accepted Agent Home entry: https://nofeego-kxhlnf4et-sunshinecausa-6607s-projects.vercel.app/agent?publicSnapshot=production_public_snapshot
- Documentation/Baseline Commit: the commit containing this document and the evidence directory; the immutable SHA is recorded in the acceptance handoff because a Git commit cannot contain its own hash.
- Production release status: **not published**

`publicSnapshot=production_public_snapshot` is exclusively a protected-Preview acceptance mechanism. Production must not depend on this parameter or on the Preview snapshot fixture. Production continues to use the reviewed safe Public View/data projection.

## Acceptance evidence

All evidence files preserve the originally reviewed page captures. Their combined size is 820,895 bytes (approximately 0.783 MiB), so the originals were retained without conversion.

- [Candidate desktop](acceptance/2026-08-18-public-agent-catalog/candidate-desktop.jpg)
- [Candidate mobile](acceptance/2026-08-18-public-agent-catalog/candidate-mobile.png)
- [Production snapshot desktop](acceptance/2026-08-18-public-agent-catalog/production-snapshot-desktop.png)
- [Production snapshot map, clustered](acceptance/2026-08-18-public-agent-catalog/production-snapshot-map-cluster.png)
- [Production snapshot map, enlarged markers](acceptance/2026-08-18-public-agent-catalog/production-snapshot-map-zoom.png)
- [Production snapshot mobile](acceptance/2026-08-18-public-agent-catalog/production-snapshot-mobile.png)
- [Reference desktop](acceptance/2026-08-18-public-agent-catalog/reference-desktop.jpg)

## Accepted Public Buildings behavior

- Complete sanitized Production public catalog is available in the protected Preview acceptance mode.
- Public building names, addresses, images, amenities, aggregate rent/availability summaries, and valid public coordinates render through the public projection.
- Search and the Price, Beds, Bath, Move-in, Borough/Neighborhood, and Filters controls operate on public catalog data.
- Building cards, list/map split, responsive desktop/mobile presentation, map clusters, price markers, and map counts match the accepted Preview.
- One Building produces one map marker. Shared or very close coordinates are clustered safely.
- Public responses omit unit numbers, raw inventory snapshots, building sources, internal contacts, Agent-only fields, Rental Case data, Auth data, and audit data.

## Accepted Agent Home behavior

- Agent Home uses the same complete Public Building Catalog experience as Public Buildings.
- Rental Case reminders do not filter the Agent catalog.
- Unauthorised buildings expose public information only.
- Agent-only inventory and workflow information is an authorization-controlled overlay and is not part of the Public projection.
- Tenant, Agent, Property, and Admin role boundaries, Rental Case behavior, RLS/RPC protections, and Profile privilege protections remain part of the accepted security baseline.

## Protected Baseline

The following must not be replaced, regressed, or modified indirectly by subsequent Agent development:

1. Public Header and navigation.
2. AI Search.
3. Price, Beds, Bath, Move-in, Borough, and Filters controls.
4. Building Cards.
5. List/Map two-column layout.
6. Real public building address and coordinate display.
7. Map Marker, Cluster, and count contracts.
8. Public internal-field omission.
9. Agent Home and Public use the same Catalog experience.
10. Agent authorization information is an overlay only.
11. Rental Case must not filter the Agent Catalog.
12. Four-role login, RLS/RPC, and Profile security protections.

Future Agent work must be incremental. It must not replace the accepted `building-browser`, `building-result-card`, `building-map`, Public projection, CSS, or layout wholesale.

## Verification recorded at acceptance

- Production public snapshot integrity and safety tests: 7/7 passed.
- Public/Agent route isolation tests: 3/3 passed.
- Map marker, clustering, coordinate, and count contract tests: 6/6 passed.
- Public projection/internal-field omission tests: 3/3 passed.
- TypeScript: passed.
- ESLint: 0 errors; 35 pre-existing warnings.
- Production Build: passed using validation-only public placeholders; no Production database operation.
- `git diff --check`: passed.
- Production database writes, migrations, environment changes, Promote, and Production deployment: not performed.
