import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Route, Ticket, CreditCard, TrendingUp, Users, Clock } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ companies: 0, cities: 0, routes: 0, reservations: 0, paid: 0, pending: 0, cancelled: 0, revenue: 0 });
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [topRoutes, setTopRoutes] = useState<any[]>([]);

  useEffect(() => {
    // Load stats
    Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("cities").select("id", { count: "exact", head: true }),
      supabase.from("routes").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "paye"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "annule"),
      supabase.from("reservations").select("total_price").eq("status", "paye"),
    ]).then(([c, ci, r, res, paid, pending, cancelled, revenueData]) => {
      const revenue = (revenueData.data || []).reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      setStats({
        companies: c.count || 0,
        cities: ci.count || 0,
        routes: r.count || 0,
        reservations: res.count || 0,
        paid: paid.count || 0,
        pending: pending.count || 0,
        cancelled: cancelled.count || 0,
        revenue,
      });
    });

    // Recent reservations
    supabase
      .from("reservations")
      .select("*, route:routes(departure_time, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name))")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentReservations(data); });

    // Top routes by reservation count
    supabase
      .from("reservations")
      .select("route_id, route:routes(company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name))")
      .eq("status", "paye")
      .then(({ data }) => {
        if (!data) return;
        const routeMap: Record<string, { count: number; route: any }> = {};
        data.forEach((r: any) => {
          if (!routeMap[r.route_id]) routeMap[r.route_id] = { count: 0, route: r.route };
          routeMap[r.route_id].count++;
        });
        const sorted = Object.values(routeMap).sort((a, b) => b.count - a.count).slice(0, 5);
        setTopRoutes(sorted);
      });
  }, []);

  const statusBadge = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary/10 text-primary border-primary/20">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const mainCards = [
    { label: "Revenus totaux", value: `${stats.revenue.toLocaleString()} FCFA`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Tickets payés", value: stats.paid, icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
    { label: "En attente", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Réservations", value: stats.reservations, icon: Ticket, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  const secondaryCards = [
    { label: "Sociétés", value: stats.companies, icon: Building2 },
    { label: "Villes", value: stats.cities, icon: MapPin },
    { label: "Trajets", value: stats.routes, icon: Route },
    { label: "Annulées", value: stats.cancelled, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de l'activité FasoCar</p>
      </div>

      {/* Main KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((c) => (
          <Card key={c.label} className="border-none shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`h-6 w-6 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {secondaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="py-4 flex items-center gap-3">
              <c.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent reservations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Réservations récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReservations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune réservation</p>
              )}
              {recentReservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{r.passenger_first_name} {r.passenger_last_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.route?.departure_city?.name} → {r.route?.arrival_city?.name}
                      <span className="ml-2">• {r.route?.company?.name}</span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-semibold">{r.total_price?.toLocaleString()} F</p>
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top routes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Trajets populaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRoutes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée disponible</p>
              )}
              {topRoutes.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {item.route?.departure_city?.name} → {item.route?.arrival_city?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.route?.company?.name}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{item.count} ventes</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
