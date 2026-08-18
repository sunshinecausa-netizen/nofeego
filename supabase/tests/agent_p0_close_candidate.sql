-- Run only after applying 20260818120000_agent_p0_close_candidate.sql to the isolated database.
BEGIN;

DO $$
DECLARE rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE oid='public.application_status_history'::regclass;
  IF NOT rls_enabled THEN RAISE EXCEPTION 'application_history_rls_disabled'; END IF;
  IF has_table_privilege('anon','public.application_status_history','INSERT')
    OR has_table_privilege('authenticated','public.application_status_history','INSERT') THEN
    RAISE EXCEPTION 'application_history_insert_exposed';
  END IF;
  IF has_function_privilege('anon','public.transition_case_application(uuid,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'application_transition_exposed_to_anon';
  END IF;
  IF has_function_privilege('anon','public.mark_property_contact_sent(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'mark_sent_exposed_to_anon';
  END IF;
  IF has_function_privilege('anon','public.agent_send_verified_recommendation(uuid,uuid,uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'verified_recommendation_exposed_to_anon';
  END IF;
  IF has_function_privilege('anon','public.create_case_property_email_draft(uuid,text,text,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'property_email_draft_exposed_to_anon';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='rental_case_recommendation_idempotency_idx') THEN
    RAISE EXCEPTION 'recommendation_idempotency_missing';
  END IF;
END $$;

ROLLBACK;
