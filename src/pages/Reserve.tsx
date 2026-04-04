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
import { Bus, MapPin, ArrowRight, Clock, Banknote, UserPlus, Users } from "lucide-react";
import Layout from "@/components/Layout";

interface PassengerInfo {
  firstName: string;
  lastName: string;
  phone: string;
}

const Reserve = () => {
  const { routeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [travelDate, setTravelDate] = useState("");
  const [numSeats, setNumSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"orange_money" | "moov_money">("orange_money");
  const [passengers, setPassengers] = useState<PassengerInfo[]>([{ firstName: "", lastName: "", phone: "" }]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!routeId) return;

    supabase
      .from("routes")
      .select("*, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
      .eq("id", routeId)
      .single()
      .then(({ data }) => setRoute(data));

    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setPassengers([{ firstName: data.first_name, lastName: data.last_name, phone: data.phone }]);
      }
    });
  }, [routeId, user]);

  // Sync passengers array when numSeats changes
  useEffect(() => {
    setPassengers((prev) => {
      const arr = [...prev];
      while (arr.length < numSeats) arr.push({ firstName: "", lastName: "", phone: "" });
      return arr.slice(0, numSeats);
    });
  }, [numSeats]);

  const updatePassenger = (index: number, field: keyof PassengerInfo, value: string) => {
    setPassengers((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || !user) return;

    // Validate all passengers
    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].firstName || !passengers[i].lastName || !passengers[i].phone) {
        toast({ title: "Erreur", description: `Veuillez remplir tous les champs du passager ${i + 1}`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    // Create one reservation per passenger
    const reservationIds: string[] = [];
    for (const p of passengers) {
      const { data: reservation, error } = await supabase.from("reservations").insert({
        user_id: user.id,
        route_id: route.id,
        passenger_first_name: p.firstName,
        passenger_last_name: p.lastName,
        passenger_phone: p.phone,
        travel_date: travelDate,
        num_seats: 1,
        total_price: route.price,
        payment_method: paymentMethod,
        status: "en_attente",
      }).select("id").single();

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      reservationIds.push(reservation.id);
    }

    // Navigate to payment with all reservation IDs
    navigate(`/payment/${reservationIds.join(",")}`);
  };

  if (!route) return <Layout><div className="container mx-auto px-4 py-12 text-center">Chargement...</div></Layout>;

  const totalPrice = route.price * numSeats;

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
              <Banknote className="h-4 w-4 text-secondary" /> {route.price?.toLocaleString()} FCFA / place
            </span>
          </CardContent>
        </Card>

        {/* Reservation form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Informations des passagers
            </CardTitle>
            <CardDescription>Remplissez les coordonnées de chaque passager</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date de voyage</Label>
                  <Input id="date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Nombre de places</Label>
                  <Input id="seats" type="number" min={1} max={route.available_seats} value={numSeats} onChange={(e) => setNumSeats(Math.max(1, parseInt(e.target.value) || 1))} required />
                </div>
              </div>

              {/* Passenger forms */}
              {passengers.map((p, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Passager {i + 1}{i === 0 ? " (vous)" : ""}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Prénom</Label>
                        <Input value={p.firstName} onChange={(e) => updatePassenger(i, "firstName", e.target.value)} required placeholder="Prénom" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input value={p.lastName} onChange={(e) => updatePassenger(i, "lastName", e.target.value)} required placeholder="Nom" />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label className="text-xs">Téléphone</Label>
                      <Input type="tel" value={p.phone} onChange={(e) => updatePassenger(i, "phone", e.target.value)} required placeholder="+226 XX XX XX XX" />
                    </div>
                  </CardContent>
                </Card>
              ))}

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
                <p className="text-sm text-muted-foreground">Total à payer ({numSeats} place{numSeats > 1 ? "s" : ""})</p>
                <p className="text-2xl font-bold">{totalPrice.toLocaleString()} FCFA</p>
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
