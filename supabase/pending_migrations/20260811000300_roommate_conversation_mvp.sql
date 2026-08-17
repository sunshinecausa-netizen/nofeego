-- Roommate conversation MVP. Additive migration; preserves legacy columns and data.
ALTER TABLE public.roommate_profiles
  ADD COLUMN IF NOT EXISTS display_name varchar(80),
  ADD COLUMN IF NOT EXISTS smoking_status text,
  ADD COLUMN IF NOT EXISTS pet_status text,
  ADD COLUMN IF NOT EXISTS pet_allergies varchar(120),
  ADD COLUMN IF NOT EXISTS work_pattern text,
  ADD COLUMN IF NOT EXISTS sleep_schedule varchar(120),
  ADD COLUMN IF NOT EXISTS noise_preference text,
  ADD COLUMN IF NOT EXISTS cleaning_habits text,
  ADD COLUMN IF NOT EXISTS guest_frequency text,
  ADD COLUMN IF NOT EXISTS temperature_preference text,
  ADD COLUMN IF NOT EXISTS identity_verification_willingness text,
  ADD COLUMN IF NOT EXISTS profile_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.roommate_interests
  ADD COLUMN IF NOT EXISTS roommate_profile_id uuid REFERENCES public.roommate_profiles(user_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS move_in_date date,
  ADD COLUMN IF NOT EXISTS flexibility_days_before integer NOT NULL DEFAULT 0 CHECK (flexibility_days_before BETWEEN 0 AND 90),
  ADD COLUMN IF NOT EXISTS flexibility_days_after integer NOT NULL DEFAULT 0 CHECK (flexibility_days_after BETWEEN 0 AND 90),
  ADD COLUMN IF NOT EXISTS lease_term text,
  ADD COLUMN IF NOT EXISTS personal_monthly_budget numeric(12,2) CHECK (personal_monthly_budget > 0),
  ADD COLUMN IF NOT EXISTS roommates_needed integer CHECK (roommates_needed BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS qualification_status text,
  ADD COLUMN IF NOT EXISTS credit_category text,
  ADD COLUMN IF NOT EXISTS guarantor_status text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL;

ALTER TABLE public.roommate_consents
  ADD COLUMN IF NOT EXISTS consent_type text,
  ADD COLUMN IF NOT EXISTS policy_version text,
  ADD COLUMN IF NOT EXISTS accepted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS roommate_interest_id uuid REFERENCES public.roommate_interests(id) ON DELETE SET NULL;

ALTER TABLE public.roommate_interests DROP CONSTRAINT IF EXISTS roommate_interests_user_home_key;
CREATE UNIQUE INDEX IF NOT EXISTS roommate_interests_one_active_home_plan_idx
  ON public.roommate_interests(user_id, building_id, floor_plan) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS roommate_interests_admin_filter_idx ON public.roommate_interests(status, move_in_date, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_one_roommate_lead_idx ON public.inquiries(user_id, roommate_interest_id)
  WHERE request_type = 'roommate' AND roommate_interest_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_current_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin OR account_role = 'admin'));
$$;
REVOKE ALL ON FUNCTION public.is_current_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_current_admin() TO authenticated;

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['roommate_profiles','roommate_preferences','roommate_interests','roommate_consents','roommate_events','roommate_matches'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_admin_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_current_admin())', table_name || '_admin_select', table_name);
  END LOOP;
END $$;
DROP POLICY IF EXISTS roommate_interests_admin_update ON public.roommate_interests;
CREATE POLICY roommate_interests_admin_update ON public.roommate_interests FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

CREATE OR REPLACE FUNCTION public.submit_roommate_interest_mvp(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); profile_uid uuid; v_interest_id uuid; existing_id uuid; bedroom_count integer; public_count integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF NOT COALESCE((payload->>'termsAccepted')::boolean, false) THEN RAISE EXCEPTION 'terms_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.buildings WHERE id = (payload->>'buildingId')::uuid AND is_active) THEN RAISE EXCEPTION 'invalid_building'; END IF;
  IF payload->>'unitId' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units WHERE id = (payload->>'unitId')::uuid AND building_id = (payload->>'buildingId')::uuid AND is_active
  ) THEN RAISE EXCEPTION 'invalid_unit'; END IF;
  SELECT bedrooms::integer INTO bedroom_count FROM public.units WHERE id = NULLIF(payload->>'unitId','')::uuid;
  IF bedroom_count IS NOT NULL AND (payload->>'roommatesNeeded')::integer >= bedroom_count THEN RAISE EXCEPTION 'floor_plan_capacity_exceeded'; END IF;
  IF (SELECT count(*) FROM public.roommate_events WHERE user_id = uid AND event_type = 'submitted' AND created_at > now() - interval '1 minute') >= 5 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || payload->>'buildingId' || payload->>'floorPlan', 0));

  INSERT INTO public.roommate_profiles (user_id, display_name, bio, contact_email, notification_method, smoking_status, pet_status, pet_allergies,
    work_pattern, sleep_schedule, noise_preference, cleaning_habits, guest_frequency, temperature_preference,
    identity_verification_willingness, profile_status, updated_at)
  VALUES (uid, payload->>'displayName', payload->>'bio', payload->>'contactEmail', 'email', payload->>'smokingStatus', payload->>'petStatus',
    payload->>'petAllergies', payload->>'workPattern', payload->>'sleepSchedule', payload->>'noisePreference', payload->>'cleaningHabits',
    payload->>'guestFrequency', payload->>'temperaturePreference', payload->>'identityVerificationWillingness', 'active', now())
  ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name, bio=EXCLUDED.bio, contact_email=EXCLUDED.contact_email,
    smoking_status=EXCLUDED.smoking_status, pet_status=EXCLUDED.pet_status, pet_allergies=EXCLUDED.pet_allergies, work_pattern=EXCLUDED.work_pattern,
    sleep_schedule=EXCLUDED.sleep_schedule, noise_preference=EXCLUDED.noise_preference, cleaning_habits=EXCLUDED.cleaning_habits,
    guest_frequency=EXCLUDED.guest_frequency, temperature_preference=EXCLUDED.temperature_preference,
    identity_verification_willingness=EXCLUDED.identity_verification_willingness, updated_at=now()
  RETURNING user_id INTO profile_uid;

  SELECT id INTO existing_id FROM public.roommate_interests WHERE user_id=uid AND building_id=(payload->>'buildingId')::uuid
    AND floor_plan=payload->>'floorPlan' AND status='active' FOR UPDATE;
  IF existing_id IS NULL THEN
    INSERT INTO public.roommate_interests (user_id, roommate_profile_id, building_id, unit_id, floor_plan, status, move_in_date,
      flexibility_days_before, flexibility_days_after, lease_term, personal_monthly_budget, roommates_needed, qualification_status,
      credit_category, guarantor_status, submitted_at, updated_at)
    VALUES (uid, profile_uid, (payload->>'buildingId')::uuid, NULLIF(payload->>'unitId','')::uuid, payload->>'floorPlan', 'active',
      (payload->>'moveInDate')::date, (payload->>'flexibilityDaysBefore')::integer, (payload->>'flexibilityDaysAfter')::integer,
      payload->>'leaseTerm', (payload->>'personalMonthlyBudget')::numeric, (payload->>'roommatesNeeded')::integer,
      payload->>'qualificationStatus', NULLIF(payload->>'creditCategory',''), payload->>'guarantorStatus', now(), now()) RETURNING id INTO v_interest_id;
  ELSE
    v_interest_id := existing_id;
    UPDATE public.roommate_interests SET unit_id=NULLIF(payload->>'unitId','')::uuid, move_in_date=(payload->>'moveInDate')::date,
      flexibility_days_before=(payload->>'flexibilityDaysBefore')::integer, flexibility_days_after=(payload->>'flexibilityDaysAfter')::integer,
      lease_term=payload->>'leaseTerm', personal_monthly_budget=(payload->>'personalMonthlyBudget')::numeric,
      roommates_needed=(payload->>'roommatesNeeded')::integer, qualification_status=payload->>'qualificationStatus',
      credit_category=NULLIF(payload->>'creditCategory',''), guarantor_status=payload->>'guarantorStatus', submitted_at=now(), updated_at=now()
    WHERE id=v_interest_id;
  END IF;
  DELETE FROM public.roommate_consents c WHERE c.interest_id=v_interest_id AND c.consent_type IN ('terms_privacy','match_notifications','marketing');
  INSERT INTO public.roommate_consents (user_id, interest_id, terms_version, privacy_accepted, safety_accepted, disclaimer_accepted,
    age_confirmed, community_guidelines_accepted, optional_matching_consent, consent_type, policy_version, accepted)
  VALUES
    (uid,v_interest_id,'2026-08-11-mvp',true,true,true,true,true,false,'terms_privacy','2026-08-11-mvp',true),
    (uid,v_interest_id,'2026-08-11-mvp',true,true,true,true,true,COALESCE((payload->>'matchNotifications')::boolean,false),'match_notifications','2026-08-11-mvp',COALESCE((payload->>'matchNotifications')::boolean,false)),
    (uid,v_interest_id,'2026-08-11-mvp',true,true,true,true,true,false,'marketing','2026-08-11-mvp',COALESCE((payload->>'marketingConsent')::boolean,false));
  INSERT INTO public.roommate_events(user_id,interest_id,event_type,metadata) VALUES(uid,v_interest_id,'submitted',jsonb_build_object('schema_version','mvp-v1','ai_provider','deterministic-fallback'));
  SELECT count(*) INTO public_count FROM public.roommate_interests WHERE building_id=(payload->>'buildingId')::uuid AND status='active' AND user_id<>uid;
  RETURN jsonb_build_object('id',v_interest_id,'hasPotentialMatches',public_count>0);
END $$;
REVOKE ALL ON FUNCTION public.submit_roommate_interest_mvp(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_roommate_interest_mvp(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_roommate_rental_lead(target_interest_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); result uuid; i public.roommate_interests%ROWTYPE; p public.roommate_profiles%ROWTYPE;
BEGIN
  SELECT * INTO i FROM public.roommate_interests WHERE id=target_interest_id AND user_id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'interest_not_found'; END IF;
  SELECT * INTO p FROM public.roommate_profiles WHERE user_id=uid;
  INSERT INTO public.inquiries(user_id,building_id,unit_id,request_type,message,move_in_date,monthly_budget,contact_name,contact_email,status,roommate_interest_id)
  VALUES(uid,i.building_id,i.unit_id,'roommate','Roommate interest follow-up',i.move_in_date,i.personal_monthly_budget,p.display_name,p.contact_email,'new',i.id)
  ON CONFLICT (user_id,roommate_interest_id) WHERE request_type='roommate' AND roommate_interest_id IS NOT NULL
  DO UPDATE SET updated_at=now() RETURNING id INTO result;
  UPDATE public.roommate_interests SET linked_inquiry_id=result WHERE id=i.id;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_roommate_rental_lead(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_roommate_rental_lead(uuid) TO authenticated;
