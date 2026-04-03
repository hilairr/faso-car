import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Route, Ticket, CreditCard, TrendingUp, Users, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ companies: 0, cities: 0, routes: 0, reservations: 0, paid: 0, pending: 0, cancelled: 0, revenue: 0 });
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [topRoutes, setTopRoutes] = useState<any[]>([]);
  const [revenueByCompany, setRevenueByCompany] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    const [c, ci, r, res, paid, pending, cancelled, revenueData] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("cities").select("id", { count: "exact", head: true }),
      supabase.from("routes").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "paye"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "annule"),
      supabase.from("reservations").select("total_price").eq("status", "paye"),
    ]);
    const revenue = (revenueData.data || []).reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    const paidCount = paid.count || 0;
    const pendingCount = pending.count || 0;
    const cancelledCount = cancelled.count || 0;
    setStats({
      companies: c.count || 0, cities: ci.count || 0, routes: r.count || 0,
      reservations: res.count || 0, paid: paidCount, pending: pendingCount, cancelled: cancelledCount, revenue,
    });
    setStatusDistribution([
      { name: "Payées", value: paidCount, color: "hsl(var(--primary))" },
      { name: "En attente", value: pendingCount, color: "#f59e0b" },
      { name: "Annulées", value: cancelledCount, color: "#ef4444" },
    ].filter(d => d.value > 0));

    // Recent reservations
    const { data: recent } = await supabase
      .from("reservations")
      .select("*, route:routes(departure_time, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name))")
      .order("created_at", { ascending: false })
      .limit(5);
    if (recent) setRecentReservations(recent);

    // Revenue analytics
    const { data: allRes } = await supabase
      .from("reservations")
      .select("route_id, total_price, status, created_at, route:routes(company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name))");
    if (allRes) {
      const companyMap: Record<string, number> = {};
      const monthMap: Record<string, number> = {};
      const routeMap: Record<string, { count: number; route: any }> = {};
      allRes.forEach((r: any) => {
        if (r.status === "paye") {
          const name = r.route?.company?.name || "Inconnu";
          companyMap[name] = (companyMap[name] || 0) + (r.total_price || 0);
          const month = new Date(r.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
          monthMap[month] = (monthMap[month] || 0) + (r.total_price || 0);
          if (!routeMap[r.route_id]) routeMap[r.route_id] = { count: 0, route: r.route };
          routeMap[r.route_id].count++;
        }
      });
      setRevenueByCompany(Object.entries(companyMap).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue));
      setMonthlyRevenue(Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })));
      setTopRoutes(Object.values(routeMap).sort((a, b) => b.count - a.count).slice(0, 5));
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useRealtimeTable("reservations", loadAll);
  useRealtimeTable("companies", loadAll);
  useRealtimeTable("routes", loadAll);

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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Revenus mensuels</CardTitle></CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée de revenu disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} FCFA`, "Revenus"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Répartition des réservations</CardTitle></CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune réservation</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusDistribution.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Réservations"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Revenus par société</CardTitle></CardHeader>
        <CardContent>
          {revenueByCompany.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByCompany} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} FCFA`, "Revenus"]} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {revenueByCompany.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Réservations récentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReservations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune réservation</p>}
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
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Trajets populaires</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRoutes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée disponible</p>}
              {topRoutes.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium">{item.route?.departure_city?.name} → {item.route?.arrival_city?.name}</p>
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
