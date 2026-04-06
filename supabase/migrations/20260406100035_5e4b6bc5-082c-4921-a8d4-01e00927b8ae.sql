
-- Fix: Restrict companies SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active companies" ON public.companies;
CREATE POLICY "Authenticated can view active companies" ON public.companies
  FOR SELECT TO authenticated USING (is_active = true);

-- Fix: Restrict ticket INSERT to only paid reservations
DROP POLICY IF EXISTS "Users can create tickets for their reservations" ON public.tickets;
CREATE POLICY "Users can create tickets for paid reservations" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.id = tickets.reservation_id
        AND r.user_id = auth.uid()
        AND r.status = 'paye'
    )
  );

-- Fix: Also allow public (unauthenticated) to view active companies for search page
CREATE POLICY "Public can view active companies" ON public.companies
  FOR SELECT TO anon USING (is_active = true);
