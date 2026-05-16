import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Route, TrendingUp, Users, UserCheck, Calendar, Wallet, Activity } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const PERIODS = [
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "90", label: "90 jours" },
  { key: "all", label: "Tout" },
] as const;

const COLORS = ["hsl(var(--primary))", "#16a34a", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4"];

const ManagerDashboard = () => {
  const { companyId, companyName } = useOutletContext<{ companyId: string; companyName: string }>();
  const [period, setPeriod] = useState<string>("30");
  const [routes, setRoutes] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rts } = await supabase
        .from("routes")
        .select("id, price, departure_time, departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
        .eq("company_id", companyId);
      const routeIds = (rts || []).map((r) => r.id);
      setRoutes(rts || []);

      if (routeIds.length === 0) {
        setReservations([]); setTickets([]); setLoading(false); return;
      }

      const [{ data: res }, { data: tks }] = await Promise.all([
        supabase
          .from("reservations")
          .select("id, total_price, status, num_seats, route_id, user_id, passenger_first_name, passenger_last_name, passenger_phone, travel_date, created_at")
          .in("route_id", routeIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("tickets")
          .select("id, ticket_number, used_at, expires_at, issued_at, reservation_id")
          .in("reservation_id", []),
      ]);
      setReservations(res || []);

      // Fetch tickets for these reservations
      const reservationIds = (res || []).map((r) => r.id);
      if (reservationIds.length > 0) {
        const { data: tks2 } = await supabase
          .from("tickets")
          .select("id, ticket_number, used_at, expires_at, issued_at, reservation_id")
          .in("reservation_id", reservationIds);
        setTickets(tks2 || []);
      } else {
        setTickets([]);
      }
      setLoading(false);
    };
    if (companyId) load();
  }, [companyId]);

  const filtered = useMemo(() => {
    if (period === "all") return reservations;
    const days = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return reservations.filter((r) => new Date(r.created_at) >= cutoff);
  }, [reservations, period]);

  const stats = useMemo(() => {
    const paid = filtered.filter((r) => r.status === "paye");
    const ticketsSold = paid.reduce((s, r) => s + (r.num_seats || 1), 0);
    const revenue = paid.reduce((s, r) => s + (r.total_price || 0), 0);
    const uniqueCustomers = new Set(paid.map((r) => r.user_id)).size;
    const pending = filtered.filter((r) => r.status === "en_attente").length;
    const cancelled = filtered.filter((r) => r.status === "annule").length;
    const usedTickets = tickets.filter((t) => t.used_at).length;
    const avgBasket = paid.length > 0 ? Math.round(revenue / paid.length) : 0;
    return {
      routes: routes.length,
      ticketsSold, revenue, uniqueCustomers, pending, cancelled,
      usedTickets, totalTickets: tickets.length, avgBasket,
      reservations: filtered.length,
    };
  }, [filtered, routes, tickets]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const days = period === "all" ? 90 : parseInt(period);
    const map: Record<string, { date: string; tickets: number; revenue: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key.slice(5), tickets: 0, revenue: 0 };
    }
    filtered.filter((r) => r.status === "paye").forEach((r) => {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      if (map[key]) {
        map[key].tickets += r.num_seats || 1;
        map[key].revenue += r.total_price || 0;
      }
    });
    return Object.values(map);
  }, [filtered, period]);

  // By route
  const byRoute = useMemo(() => {
    const map: Record<string, { label: string; tickets: number; revenue: number }> = {};
    routes.forEach((rt: any) => {
      map[rt.id] = {
        label: `${rt.departure_city?.name || "?"} → ${rt.arrival_city?.name || "?"}`,
        tickets: 0, revenue: 0,
      };
    });
    filtered.filter((r) => r.status === "paye").forEach((r) => {
      if (map[r.route_id]) {
        map[r.route_id].tickets += r.num_seats || 1;
        map[r.route_id].revenue += r.total_price || 0;
      }
    });
    return Object.values(map).filter((r) => r.tickets > 0).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, routes]);

  // Status breakdown
  const statusData = useMemo(() => [
    { name: "Payé", value: filtered.filter((r) => r.status === "paye").length, color: "hsl(var(--primary))" },
    { name: "En attente", value: filtered.filter((r) => r.status === "en_attente").length, color: "#eab308" },
    { name: "Annulé", value: filtered.filter((r) => r.status === "annule").length, color: "#ef4444" },
  ].filter((s) => s.value > 0), [filtered]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; tickets: number; spent: number }> = {};
    filtered.filter((r) => r.status === "paye").forEach((r) => {
      const key = r.passenger_phone || r.user_id;
      if (!map[key]) {
        map[key] = { name: `${r.passenger_first_name} ${r.passenger_last_name}`, phone: r.passenger_phone, tickets: 0, spent: 0 };
      }
      map[key].tickets += r.num_seats || 1;
      map[key].spent += r.total_price || 0;
    });
    return Object.values(map).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [filtered]);

  const recent = useMemo(() => filtered.slice(0, 8), [filtered]);

  const statusBadge = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary text-primary-foreground">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const kpis = [
    { title: "Revenus", value: `${stats.revenue.toLocaleString()} F`, sub: `Panier moy. ${stats.avgBasket.toLocaleString()} F`, icon: Wallet, accent: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-600" },
    { title: "Tickets vendus", value: stats.ticketsSold, sub: `${stats.usedTickets}/${stats.totalTickets} utilisés`, icon: Ticket, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { title: "Clients uniques", value: stats.uniqueCustomers, sub: `${stats.reservations} réservations`, icon: UserCheck, accent: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-600" },
    { title: "Trajets", value: stats.routes, sub: `${stats.pending} en attente`, icon: Route, accent: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Activity className="h-4 w-4" /> {companyName}
          </p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <Card key={i} className={`bg-gradient-to-br ${k.accent} border-border/50 overflow-hidden relative`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.title}</span>
                <div className={`p-2 rounded-lg bg-background/80 ${k.iconColor}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des revenus</CardTitle>
            <CardDescription>Tickets vendus et revenus par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: string) => [name === "revenue" ? `${v.toLocaleString()} FCFA` : v, name === "revenue" ? "Revenus" : "Tickets"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statuts</CardTitle>
            <CardDescription>Répartition des réservations</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Aucune donnée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Routes performance bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance par trajet</CardTitle>
          <CardDescription>Revenus générés par ligne de transport</CardDescription>
        </CardHeader>
        <CardContent>
          {byRoute.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, byRoute.length * 40)}>
              <BarChart data={byRoute} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={140} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${v.toLocaleString()} FCFA`, "Revenus"]}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {byRoute.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Pas encore de tickets vendus</div>
          )}
        </CardContent>
      </Card>

      {/* Tables: top customers + recent */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Top clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passager</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.phone}</TableCell>
                    <TableCell className="text-right">{c.tickets}</TableCell>
                    <TableCell className="text-right font-semibold">{c.spent.toLocaleString()} F</TableCell>
                  </TableRow>
                ))}
                {topCustomers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun client</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Passager</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium text-sm">{r.passenger_first_name} {r.passenger_last_name}</TableCell>
                    <TableCell className="text-right text-sm">{r.total_price?.toLocaleString()} F</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
                {recent.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune activité</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground">Chargement...</p>}
    </div>
  );
};

export default ManagerDashboard;
