
-- Remove anon access to companies
DROP POLICY IF EXISTS "Public can view active companies" ON public.companies;

-- Fix reservation insert policy to authenticated role
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
CREATE POLICY "Users can create reservations" ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix reservation update policy to authenticated role
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
CREATE POLICY "Users can update their own reservations" ON public.reservations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Fix cities insert/update/delete to authenticated
DROP POLICY IF EXISTS "Admins can insert cities" ON public.cities;
CREATE POLICY "Admins can insert cities" ON public.cities
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update cities" ON public.cities;
CREATE POLICY "Admins can update cities" ON public.cities
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete cities" ON public.cities;
CREATE POLICY "Admins can delete cities" ON public.cities
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
