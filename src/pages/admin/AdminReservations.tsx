import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { MoreHorizontal, CheckCircle, Clock, XCircle, Eye, Printer } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { QRCodeSVG } from "qrcode.react";

const AdminReservations = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState<any>(null);

  const fetchReservations = useCallback(async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*, route:routes(departure_time, price, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)), ticket:tickets(*)")
      .order("created_at", { ascending: false });
    if (data) setReservations(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);
  useRealtimeTable("reservations", fetchReservations);
  useRealtimeTable("tickets", fetchReservations);

  const updateStatus = async (id: string, status: "en_attente" | "paye" | "annule") => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour" });
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

  const printTicket = (res: any) => {
    if (!res.ticket) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const departureTime = res.route?.departure_time?.slice(0, 5) || "";
    w.document.write(`
      <html><head><title>Ticket ${res.ticket.ticket_number}</title>
      <style>
        body{font-family:sans-serif;padding:20px;text-align:center;margin:0;}
        .ticket{max-width:420px;margin:auto;border:2px solid #333;padding:24px;border-radius:12px;}
        .logo{font-size:24px;font-weight:bold;color:#2d6a4f;margin-bottom:8px;}
        .route{font-size:20px;font-weight:bold;margin:12px 0;}
        .info{margin:6px 0;font-size:14px;color:#555;}
        .info strong{color:#333;}
        .qr-section{margin:20px auto;padding:16px;background:#f8f8f8;border-radius:8px;display:inline-block;}
        .ticket-num{font-family:monospace;font-size:16px;font-weight:bold;margin-top:8px;color:#2d6a4f;}
        .divider{border:none;border-top:1px dashed #ccc;margin:16px 0;}
        .time-badge{display:inline-block;background:#2d6a4f;color:white;padding:4px 12px;border-radius:20px;font-size:14px;font-weight:bold;}
      </style>
      </head><body><div class="ticket">
        <div class="logo">🚌 FasoCar</div>
        <p class="route">${res.route?.departure_city?.name} → ${res.route?.arrival_city?.name}</p>
        <div class="time-badge">Départ: ${departureTime}</div>
        <hr class="divider"/>
        <p class="info"><strong>Compagnie:</strong> ${res.route?.company?.name}</p>
        <p class="info"><strong>Date:</strong> ${new Date(res.travel_date).toLocaleDateString("fr-FR")}</p>
        <p class="info"><strong>Passager:</strong> ${res.passenger_first_name} ${res.passenger_last_name}</p>
        <p class="info"><strong>Téléphone:</strong> ${res.passenger_phone}</p>
        <p class="info"><strong>Montant:</strong> ${res.total_price?.toLocaleString()} FCFA</p>
        <p class="info"><strong>Paiement:</strong> ${res.payment_method === "orange_money" ? "Orange Money" : "Moov Money"}</p>
        <hr class="divider"/>
        <div class="qr-section">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.ticket.qr_code)}" width="200" height="200"/>
          <div class="ticket-num">${res.ticket.ticket_number}</div>
        </div>
      </div>
      <script>setTimeout(()=>window.print(),500);</script></body></html>
    `);
    w.document.close();
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
              <TableHead>Heure</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
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
                <TableCell>{r.route?.departure_time?.slice(0, 5)}</TableCell>
                <TableCell className="font-medium">{r.total_price?.toLocaleString()} FCFA</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs font-mono">{r.ticket?.ticket_number || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.ticket && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir détails" onClick={() => setSelectedRes(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Imprimer" onClick={() => printTicket(r)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
                  </div>
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

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedRes} onOpenChange={() => setSelectedRes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails du Ticket</DialogTitle>
          </DialogHeader>
          {selectedRes && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">N° Ticket</span><span className="font-mono font-bold">{selectedRes.ticket?.ticket_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Passager</span><span>{selectedRes.passenger_first_name} {selectedRes.passenger_last_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{selectedRes.passenger_phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trajet</span><span>{selectedRes.route?.departure_city?.name} → {selectedRes.route?.arrival_city?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Compagnie</span><span>{selectedRes.route?.company?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(selectedRes.travel_date).toLocaleDateString("fr-FR")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Heure départ</span><span className="font-bold">{selectedRes.route?.departure_time?.slice(0, 5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{selectedRes.total_price?.toLocaleString()} FCFA</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paiement</span><span>{selectedRes.payment_method === "orange_money" ? "Orange Money" : "Moov Money"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Statut</span>{statusBadge(selectedRes.status)}</div>
              </div>
              {selectedRes.ticket && (
                <div className="flex flex-col items-center gap-3">
                  <QRCodeSVG value={selectedRes.ticket.qr_code} size={160} />
                  <p className="font-mono text-sm font-bold">{selectedRes.ticket.ticket_number}</p>
                  <Button onClick={() => printTicket(selectedRes)} className="w-full">
                    <Printer className="h-4 w-4 mr-2" /> Imprimer le ticket
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReservations;
