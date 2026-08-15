CREATE TABLE IF NOT EXISTS public.rental_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL UNIQUE REFERENCES public.inquiries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  selected_floor_plan text,
  displayed_starting_rent numeric(12,2) CHECK (displayed_starting_rent IS NULL OR displayed_starting_rent > 0),
  preferred_unit_type text,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','In Review','Options Ready','Closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_case_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  unit_number text,
  current_rent numeric(12,2) CHECK (current_rent IS NULL OR current_rent > 0),
  concession text,
  available_date date,
  floor_plan_url text,
  authorized_photo_urls text[] NOT NULL DEFAULT '{}',
  tour_method text,
  information_valid_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rental_cases_user_created_idx ON public.rental_cases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rental_case_options_case_idx ON public.rental_case_options(rental_case_id, created_at);
ALTER TABLE public.rental_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY rental_cases_select_own ON public.rental_cases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rental_cases_insert_own ON public.rental_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY rental_cases_admin_all ON public.rental_cases FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY rental_case_options_select_own ON public.rental_case_options FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.rental_cases WHERE id = rental_case_id AND user_id = auth.uid()));
CREATE POLICY rental_case_options_admin_all ON public.rental_case_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

CREATE TRIGGER rental_cases_updated_at BEFORE UPDATE ON public.rental_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER rental_case_options_updated_at BEFORE UPDATE ON public.rental_case_options FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
