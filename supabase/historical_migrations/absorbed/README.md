# DO NOT EXECUTE — absorbed migrations

Every SQL file in this directory is a historical provenance artifact.

- July schema files were absorbed into `20260805130112_empty_project_schema_bootstrap.sql`.
- Privacy-view, rent-summary, and coordinate-guard files were consolidated into the remote-final definition in `20260814000000_reconcile_remote_schema.sql`.

Do not place these files back in `supabase/migrations`, execute them against the bootstrapped project, pass them through `--include-all`, or mark them applied with `migration repair`.

Some historical files contain runtime writes or backfills even when their final structure was absorbed. Preservation here does not authorize execution.
