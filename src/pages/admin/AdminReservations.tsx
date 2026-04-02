import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { MoreHorizontal, CheckCircle, Clock, XCircle } from "lucide-react";

const AdminReservations = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*, route:routes(departure_time, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)), ticket:tickets(ticket_number)")
      .order("created_at", { ascending: false });
    if (data) setReservations(data);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour", description: `Réservation marquée comme "${status === "paye" ? "Payée" : status === "annule" ? "Annulée" : "En attente"}"` });
      fetchReservations();
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary text-primary-foreground">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const filterReservations = (status?: string) =>
    status ? reservations.filter((r) => r.status === status) : reservations;

  const renderTable = (items: any[]) => (
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
              <TableHead>Ticket</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.passenger_first_name} {r.passenger_last_name}</TableCell>
                <TableCell>{r.passenger_phone}</TableCell>
                <TableCell className="text-sm">
                  {r.route?.departure_city?.name} → {r.route?.arrival_city?.name}
                  <br /><span className="text-muted-foreground">{r.route?.company?.name}</span>
                </TableCell>
                <TableCell>{new Date(r.travel_date).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{r.num_seats}</TableCell>
                <TableCell className="font-medium">{r.total_price?.toLocaleString()} FCFA</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs font-mono">{r.ticket?.ticket_number || "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status !== "paye" && (
                        <DropdownMenuItem onClick={() => updateStatus(r.id, "paye")} className="text-primary">
                          <CheckCircle className="mr-2 h-4 w-4" /> Marquer payé
                        </DropdownMenuItem>
                      )}
                      {r.status !== "en_attente" && (
                        <DropdownMenuItem onClick={() => updateStatus(r.id, "en_attente")}>
                          <Clock className="mr-2 h-4 w-4" /> Mettre en attente
                        </DropdownMenuItem>
                      )}
                      {r.status !== "annule" && (
                        <DropdownMenuItem onClick={() => updateStatus(r.id, "annule")} className="text-destructive">
                          <XCircle className="mr-2 h-4 w-4" /> Annuler
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucune réservation</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-6">Réservations</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes ({reservations.length})</TabsTrigger>
          <TabsTrigger value="paye">Payées ({filterReservations("paye").length})</TabsTrigger>
          <TabsTrigger value="en_attente">En attente ({filterReservations("en_attente").length})</TabsTrigger>
          <TabsTrigger value="annule">Annulées ({filterReservations("annule").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{renderTable(reservations)}</TabsContent>
        <TabsContent value="paye" className="mt-4">{renderTable(filterReservations("paye"))}</TabsContent>
        <TabsContent value="en_attente" className="mt-4">{renderTable(filterReservations("en_attente"))}</TabsContent>
        <TabsContent value="annule" className="mt-4">{renderTable(filterReservations("annule"))}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReservations;
