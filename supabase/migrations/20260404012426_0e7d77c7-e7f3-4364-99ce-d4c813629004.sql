
-- Add used_at and expires_at columns to tickets
ALTER TABLE public.tickets ADD COLUMN used_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.tickets ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Allow admins to update tickets (mark as used)
CREATE POLICY "Admins can update tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow managers to update their company tickets (mark as used)
CREATE POLICY "Managers can update their company tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM reservations res
  JOIN routes r ON r.id = res.route_id
  JOIN company_managers cm ON cm.company_id = r.company_id
  WHERE res.id = tickets.reservation_id AND cm.user_id = auth.uid()
));
