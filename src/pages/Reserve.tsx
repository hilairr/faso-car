import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bus, MapPin, ArrowRight, Clock, Banknote } from "lucide-react";
import Layout from "@/components/Layout";

const Reserve = () => {
  const { routeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [numSeats, setNumSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"orange_money" | "moov_money">("orange_money");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!routeId) return;

    // Load route details
    supabase
      .from("routes")
      .select("*, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
      .eq("id", routeId)
      .single()
      .then(({ data }) => setRoute(data));

    // Pre-fill from profile
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone);
      }
    });
  }, [routeId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || !user) return;

    setLoading(true);
    const totalPrice = route.price * numSeats;

    const { data: reservation, error } = await supabase.from("reservations").insert({
      user_id: user.id,
      route_id: route.id,
      passenger_first_name: firstName,
      passenger_last_name: lastName,
      passenger_phone: phone,
      travel_date: travelDate,
      num_seats: numSeats,
      total_price: totalPrice,
      payment_method: paymentMethod,
      status: "en_attente",
    }).select().single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Navigate to payment page
    navigate(`/payment/${reservation.id}`);
  };

  if (!route) return <Layout><div className="container mx-auto px-4 py-12 text-center">Chargement...</div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-display font-bold mb-6">Réservation</h1>

        {/* Route info */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <Bus className="h-5 w-5 text-primary" />
            <span className="font-semibold">{route.company?.name}</span>
            <span className="flex items-center gap-1 text-sm">
              <MapPin className="h-3.5 w-3.5" /> {route.departure_city?.name}
              <ArrowRight className="h-3.5 w-3.5" /> {route.arrival_city?.name}
            </span>
            <span className="flex items-center gap-1 text-sm">
              <Clock className="h-3.5 w-3.5" /> {route.departure_time?.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1 font-bold">
              <Banknote className="h-4 w-4 text-secondary" /> {route.price?.toLocaleString()} FCFA
            </span>
          </CardContent>
        </Card>

        {/* Reservation form */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du passager</CardTitle>
            <CardDescription>Remplissez vos coordonnées pour la réservation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date de voyage</Label>
                <Input id="date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seats">Nombre de places</Label>
                <Input id="seats" type="number" min={1} max={route.available_seats} value={numSeats} onChange={(e) => setNumSeats(parseInt(e.target.value) || 1)} required />
              </div>
              <div className="space-y-2">
                <Label>Moyen de paiement</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="moov_money">Moov Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Total à payer</p>
                <p className="text-2xl font-bold">{(route.price * numSeats).toLocaleString()} FCFA</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Traitement..." : "Procéder au paiement"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reserve;
