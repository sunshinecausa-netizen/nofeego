# DO NOT EXECUTE — seed and content migrations

These files contain real or sample building/listing seeds and content mutations. They are retained only for Git history and provenance.

They must never participate in schema reconstruction, empty-database schema validation, production migration push, `--include-all`, or migration-history repair. Any future data operation requires a separate reviewed runbook and explicit approval.

Coordinate-bearing seed rows are not authoritative. Do not use them to overwrite verified production coordinates.
