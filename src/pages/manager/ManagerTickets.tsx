import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ManagerTickets = () => {
  const { companyId } = useOutletContext<{ companyId: string }>();
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // Get routes for this company
      const { data: routes } = await supabase.from("routes").select("id").eq("company_id", companyId);
      const routeIds = routes?.map((r) => r.id) || [];
      if (routeIds.length === 0) return;

      const { data } = await supabase
        .from("reservations")
        .select("*, route:routes(departure_time, departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)), ticket:tickets(ticket_number)")
        .in("route_id", routeIds)
        .order("created_at", { ascending: false });
      if (data) setReservations(data);
    };
    if (companyId) load();
  }, [companyId]);

  const statusBadge = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary text-primary-foreground">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const paidCount = reservations.filter((r) => r.status === "paye").length;
  const totalRevenue = reservations.filter((r) => r.status === "paye").reduce((s, r) => s + (r.total_price || 0), 0);

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Tickets vendus</h1>
      <p className="text-muted-foreground mb-6">
        {paidCount} ticket{paidCount > 1 ? "s" : ""} vendu{paidCount > 1 ? "s" : ""} — Revenus : {totalRevenue.toLocaleString()} FCFA
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passager</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Trajet</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Places</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>N° Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.passenger_first_name} {r.passenger_last_name}</TableCell>
                  <TableCell>{r.passenger_phone}</TableCell>
                  <TableCell>{r.route?.departure_city?.name} → {r.route?.arrival_city?.name}</TableCell>
                  <TableCell>{new Date(r.travel_date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{r.num_seats}</TableCell>
                  <TableCell className="font-medium">{r.total_price?.toLocaleString()} FCFA</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.ticket?.ticket_number || "—"}</TableCell>
                </TableRow>
              ))}
              {reservations.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun ticket</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerTickets;
