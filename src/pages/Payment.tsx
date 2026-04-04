import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Smartphone } from "lucide-react";
import Layout from "@/components/Layout";

const Payment = () => {
  const { reservationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  const reservationIds = reservationId?.split(",") || [];

  useEffect(() => {
    if (!user || reservationIds.length === 0) return;
    supabase
      .from("reservations")
      .select("*, route:routes(*, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name))")
      .in("id", reservationIds)
      .then(({ data }) => {
        if (data) setReservations(data);
      });
  }, [reservationId, user]);

  const totalPrice = reservations.reduce((sum, r) => sum + (r.total_price || 0), 0);
  const firstRes = reservations[0];

  const simulatePayment = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));

    // Update all reservations to paid and generate tickets
    for (const res of reservations) {
      await supabase.from("reservations").update({ status: "paye" }).eq("id", res.id);

      const ticketNumber = `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const qrCode = JSON.stringify({
        ticket: ticketNumber,
        reservation: res.id,
        passenger: `${res.passenger_first_name} ${res.passenger_last_name}`,
        route: `${res.route?.departure_city?.name} → ${res.route?.arrival_city?.name}`,
        date: res.travel_date,
        time: res.route?.departure_time?.slice(0, 5),
        company: res.route?.company?.name,
      });

      await supabase.from("tickets").insert({
        reservation_id: res.id,
        ticket_number: ticketNumber,
        qr_code: qrCode,
      });
    }

    setPaid(true);
    setProcessing(false);
    toast({ title: "Paiement réussi !", description: `${reservations.length} ticket(s) généré(s).` });
  };

  if (reservations.length === 0) return <Layout><div className="container mx-auto px-4 py-12 text-center">Chargement...</div></Layout>;

  const paymentLabel = firstRes?.payment_method === "orange_money" ? "Orange Money" : "Moov Money";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-md">
        {!paid ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>Paiement via {paymentLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trajet</span>
                  <span>{firstRes?.route?.departure_city?.name} → {firstRes?.route?.arrival_city?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compagnie</span>
                  <span>{firstRes?.route?.company?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(firstRes?.travel_date).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heure départ</span>
                  <span>{firstRes?.route?.departure_time?.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passagers</span>
                  <span>{reservations.length}</span>
                </div>
                {reservations.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground pl-2">
                    <span>• {r.passenger_first_name} {r.passenger_last_name}</span>
                    <span>{r.total_price?.toLocaleString()} FCFA</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>{totalPrice.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Simulation de paiement</p>
                <p className="text-xs">(En production, vous serez redirigé vers {paymentLabel})</p>
              </div>

              <Button className="w-full" size="lg" onClick={simulatePayment} disabled={processing}>
                {processing ? "Traitement en cours..." : `Payer ${totalPrice.toLocaleString()} FCFA`}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardContent className="py-10 space-y-6">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">Paiement confirmé !</h2>
                <p className="text-muted-foreground">{reservations.length} ticket(s) généré(s) avec succès.</p>
              </div>
              <Button size="lg" onClick={() => navigate("/my-tickets")}>
                Voir mes tickets
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Payment;
