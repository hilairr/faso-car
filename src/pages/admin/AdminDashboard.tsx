import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Route, Ticket, CreditCard } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ companies: 0, cities: 0, routes: 0, reservations: 0, paid: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("cities").select("id", { count: "exact", head: true }),
      supabase.from("routes").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "paye"),
    ]).then(([c, ci, r, res, paid]) => {
      setStats({
        companies: c.count || 0,
        cities: ci.count || 0,
        routes: r.count || 0,
        reservations: res.count || 0,
        paid: paid.count || 0,
      });
    });
  }, []);

  const cards = [
    { label: "Sociétés", value: stats.companies, icon: Building2, color: "text-primary" },
    { label: "Villes", value: stats.cities, icon: MapPin, color: "text-secondary" },
    { label: "Trajets", value: stats.routes, icon: Route, color: "text-accent" },
    { label: "Réservations", value: stats.reservations, icon: Ticket, color: "text-primary" },
    { label: "Tickets payés", value: stats.paid, icon: CreditCard, color: "text-primary" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Tableau de bord</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <c.icon className={`h-8 w-8 ${c.color}`} />
                <div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
