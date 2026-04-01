import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Download, Bus, MapPin, ArrowRight, Calendar, Clock } from "lucide-react";
import Layout from "@/components/Layout";

const TicketCard = ({ res }: { res: any }) => {
  const downloadTicket = useCallback(() => {
    if (!res.ticket) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Ticket ${res.ticket.ticket_number}</title>
      <style>
        body{font-family:sans-serif;padding:20px;text-align:center;}
        .ticket{max-width:400px;margin:auto;border:2px solid #333;padding:20px;border-radius:8px;}
        .route{font-size:18px;font-weight:bold;margin:10px 0;}
        .info{margin:5px 0;font-size:14px;}
        svg{margin:15px auto;}
      </style>
      </head><body><div class="ticket">
        <h2>🚌 FasoCar</h2>
        <p class="route">${res.route?.departure_city?.name} → ${res.route?.arrival_city?.name}</p>
        <p class="info">Compagnie: ${res.route?.company?.name}</p>
        <p class="info">Date: ${new Date(res.travel_date).toLocaleDateString("fr-FR")}</p>
        <p class="info">Heure: ${res.route?.departure_time?.slice(0, 5)}</p>
        <p class="info">Passager: ${res.passenger_first_name} ${res.passenger_last_name}</p>
        <p class="info">Places: ${res.num_seats}</p>
        <p class="info"><strong>${res.total_price?.toLocaleString()} FCFA</strong></p>
        <p class="info">N° ${res.ticket.ticket_number}</p>
        <div id="qr"></div>
      </div>
      <script>window.print();</script></body></html>
    `);
    printWindow.document.close();
  }, [res]);

  const statusLabel = (s: string) => {
    switch (s) {
      case "paye": return <Badge className="bg-primary text-primary-foreground">Payé</Badge>;
      case "en_attente": return <Badge variant="secondary">En attente</Badge>;
      case "annule": return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Bus className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{res.route?.company?.name}</span>
              {statusLabel(res.status)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {res.route?.departure_city?.name}
              <ArrowRight className="h-4 w-4" />
              {res.route?.arrival_city?.name}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(res.travel_date).toLocaleDateString("fr-FR")}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {res.route?.departure_time?.slice(0, 5)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Passager: </span>
              {res.passenger_first_name} {res.passenger_last_name}
            </div>
            <div className="font-bold text-lg">{res.total_price?.toLocaleString()} FCFA</div>
            {res.ticket && (
              <p className="text-xs text-muted-foreground">N° {res.ticket.ticket_number}</p>
            )}
          </div>

          {res.ticket && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-card p-4 rounded-lg border">
                <QRCodeSVG value={res.ticket.qr_code} size={120} />
                <p className="text-xs text-center mt-2 font-mono">{res.ticket.ticket_number}</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTicket}>
                <Download className="h-4 w-4 mr-1" /> Télécharger
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MyTickets = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reservations")
      .select("*, route:routes(*, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)), ticket:tickets(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReservations(data);
      });
  }, [user]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-8">Mes Tickets</h1>

        {reservations.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Vous n'avez aucune réservation pour le moment.</p>
        )}

        <div className="space-y-6">
          {reservations.map((res) => (
            <TicketCard key={res.id} res={res} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default MyTickets;
