import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Route, TrendingUp, Users } from "lucide-react";

const ManagerDashboard = () => {
  const { companyId, companyName } = useOutletContext<{ companyId: string; companyName: string }>();
  const [stats, setStats] = useState({ routes: 0, ticketsSold: 0, revenue: 0, reservations: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: routes } = await supabase.from("routes").select("id").eq("company_id", companyId);
      const routeIds = routes?.map((r) => r.id) || [];

      let ticketsSold = 0, revenue = 0, reservations = 0;
      if (routeIds.length > 0) {
        const { data: res } = await supabase.from("reservations").select("id, total_price, status").in("route_id", routeIds);
        reservations = res?.length || 0;
        const paid = res?.filter((r) => r.status === "paye") || [];
        ticketsSold = paid.length;
        revenue = paid.reduce((sum, r) => sum + (r.total_price || 0), 0);
      }

      setStats({ routes: routes?.length || 0, ticketsSold, revenue, reservations });
    };
    if (companyId) load();
  }, [companyId]);

  const cards = [
    { title: "Trajets actifs", value: stats.routes, icon: Route, color: "text-blue-600" },
    { title: "Tickets vendus", value: stats.ticketsSold, icon: Ticket, color: "text-primary" },
    { title: "Réservations", value: stats.reservations, icon: Users, color: "text-orange-600" },
    { title: "Revenus", value: `${stats.revenue.toLocaleString()} FCFA`, icon: TrendingUp, color: "text-green-600" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-6">Tableau de bord — {companyName}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;
