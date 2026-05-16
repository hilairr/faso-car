import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ticket, Route, TrendingUp, Users, UserCheck } from "lucide-react";

const ManagerDashboard = () => {
  const { companyId, companyName } = useOutletContext<{ companyId: string; companyName: string }>();
  const [stats, setStats] = useState({
    routes: 0,
    ticketsSold: 0,
    revenue: 0,
    reservations: 0,
    uniqueCustomers: 0,
  });
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [byRoute, setByRoute] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: routes } = await supabase
        .from("routes")
        .select("id, departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
        .eq("company_id", companyId);
      const routeIds = routes?.map((r) => r.id) || [];

      if (routeIds.length === 0) {
        setStats({ routes: 0, ticketsSold: 0, revenue: 0, reservations: 0, uniqueCustomers: 0 });
        return;
      }

      const { data: res } = await supabase
        .from("reservations")
        .select("id, total_price, status, num_seats, route_id, user_id, passenger_first_name, passenger_last_name, passenger_phone, created_at")
        .in("route_id", routeIds)
        .order("created_at", { ascending: false });

      const reservations = res || [];
      const paid = reservations.filter((r) => r.status === "paye");
      const ticketsSold = paid.reduce((s, r) => s + (r.num_seats || 1), 0);
      const revenue = paid.reduce((s, r) => s + (r.total_price || 0), 0);
      const uniqueCustomers = new Set(paid.map((r) => r.user_id)).size;

      setStats({
        routes: routes?.length || 0,
        ticketsSold,
        revenue,
        reservations: reservations.length,
        uniqueCustomers,
      });

      // Top customers (by spend)
      const customerMap: Record<string, { name: string; phone: string; tickets: number; spent: number }> = {};
      paid.forEach((r) => {
        const key = r.passenger_phone || r.user_id;
        if (!customerMap[key]) {
          customerMap[key] = {
            name: `${r.passenger_first_name} ${r.passenger_last_name}`,
            phone: r.passenger_phone,
            tickets: 0,
            spent: 0,
          };
        }
        customerMap[key].tickets += r.num_seats || 1;
        customerMap[key].spent += r.total_price || 0;
      });
      setTopCustomers(
        Object.values(customerMap).sort((a, b) => b.spent - a.spent).slice(0, 5)
      );

      // Recent activity
      setRecent(reservations.slice(0, 6));

      // By route
      const routeMap: Record<string, { label: string; tickets: number; revenue: number }> = {};
      routes?.forEach((rt: any) => {
        routeMap[rt.id] = {
          label: `${rt.departure_city?.name || "?"} → ${rt.arrival_city?.name || "?"}`,
          tickets: 0,
          revenue: 0,
        };
      });
      paid.forEach((r) => {
        if (routeMap[r.route_id]) {
          routeMap[r.route_id].tickets += r.num_seats || 1;
          routeMap[r.route_id].revenue += r.total_price || 0;
        }
      });
      setByRoute(Object.values(routeMap).sort((a, b) => b.revenue - a.revenue));
    };
    if (companyId) load();
  }, [companyId]);

  const cards = [
    { title: "Trajets actifs", value: stats.routes, icon: Route, color: "text-blue-600" },
    { title: "Tickets vendus", value: stats.ticketsSold, icon: Ticket, color: "text-primary" },
    { title: "Réservations", value: stats.reservations, icon: Users, color: "text-orange-600" },
    { title: "Clients uniques", value: stats.uniqueCustomers, icon: UserCheck, color: "text-purple-600" },
    { title: "Revenus", value: `${stats.revenue.toLocaleString()} FCFA`, icon: TrendingUp, color: "text-green-600" },
  ];

  const statusBadge = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary text-primary-foreground">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Tableau de bord — {companyName}</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passager</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Dépensé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="text-right">{c.tickets}</TableCell>
                    <TableCell className="text-right font-medium">{c.spent.toLocaleString()} FCFA</TableCell>
                  </TableRow>
                ))}
                {topCustomers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun client encore</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance par trajet</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trajet</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Revenus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byRoute.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">{r.tickets}</TableCell>
                    <TableCell className="text-right font-medium">{r.revenue.toLocaleString()} FCFA</TableCell>
                  </TableRow>
                ))}
                {byRoute.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucun trajet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Passager</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Places</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{r.passenger_first_name} {r.passenger_last_name}</TableCell>
                  <TableCell className="text-sm">{r.passenger_phone}</TableCell>
                  <TableCell className="text-right">{r.num_seats}</TableCell>
                  <TableCell className="text-right">{r.total_price?.toLocaleString()} FCFA</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucune activité</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
