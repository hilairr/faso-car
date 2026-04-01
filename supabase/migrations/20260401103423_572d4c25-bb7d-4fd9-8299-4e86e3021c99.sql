
-- Add 'manager' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Create company_managers table
CREATE TABLE public.company_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.company_managers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on company_managers
CREATE POLICY "Admins can view company_managers" ON public.company_managers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert company_managers" ON public.company_managers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete company_managers" ON public.company_managers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Managers can view their own assignment
CREATE POLICY "Managers can view own assignment" ON public.company_managers FOR SELECT USING (auth.uid() = user_id);

-- Update has_role function to also handle manager role (already works since it checks user_roles)

-- Allow managers to view routes for their company
CREATE POLICY "Managers can view their company routes" ON public.routes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_managers cm WHERE cm.user_id = auth.uid() AND cm.company_id = routes.company_id)
);

-- Allow managers to update routes for their company
CREATE POLICY "Managers can update their company routes" ON public.routes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.company_managers cm WHERE cm.user_id = auth.uid() AND cm.company_id = routes.company_id)
);

-- Allow managers to insert routes for their company
CREATE POLICY "Managers can insert their company routes" ON public.routes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.company_managers cm WHERE cm.user_id = auth.uid() AND cm.company_id = routes.company_id)
);

-- Allow managers to view reservations for their company routes
CREATE POLICY "Managers can view their company reservations" ON public.reservations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    JOIN public.company_managers cm ON cm.company_id = r.company_id
    WHERE r.id = reservations.route_id AND cm.user_id = auth.uid()
  )
);

-- Allow managers to view tickets for their company reservations
CREATE POLICY "Managers can view their company tickets" ON public.tickets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.reservations res
    JOIN public.routes r ON r.id = res.route_id
    JOIN public.company_managers cm ON cm.company_id = r.company_id
    WHERE res.id = tickets.reservation_id AND cm.user_id = auth.uid()
  )
);

-- Allow managers to view their own company
CREATE POLICY "Managers can view their company" ON public.companies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_managers cm WHERE cm.user_id = auth.uid() AND cm.company_id = companies.id)
);
