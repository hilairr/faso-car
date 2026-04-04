import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bus, Clock, MapPin, ArrowRight, Banknote, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

interface City {
  id: string;
  name: string;
}

interface RouteResult {
  id: string;
  departure_time: string;
  price: number;
  available_seats: number;
  company: { id: string; name: string };
  departure_city: { id: string; name: string };
  arrival_city: { id: string; name: string };
}

const Search = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [departureCity, setDepartureCity] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCities = async () => {
      setCitiesLoading(true);
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase.from("cities").select("id, name").order("name");
        if (data && data.length > 0) {
          setCities(data);
          setCitiesLoading(false);
          return;
        }
        if (error) console.error("Cities load error:", error);
        await new Promise((r) => setTimeout(r, 500));
      }
      setCitiesLoading(false);
    };
    loadCities();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    let query = supabase
      .from("routes")
      .select("id, departure_time, price, available_seats, company:companies(id, name), departure_city:cities!routes_departure_city_id_fkey(id, name), arrival_city:cities!routes_arrival_city_id_fkey(id, name)")
      .eq("is_active", true);

    if (departureCity) query = query.eq("departure_city_id", departureCity);
    if (arrivalCity) query = query.eq("arrival_city_id", arrivalCity);

    const { data } = await query.order("departure_time");
    if (data) {
      setRoutes(data.map((r: any) => ({
        id: r.id,
        departure_time: r.departure_time,
        price: r.price,
        available_seats: r.available_seats,
        company: r.company,
        departure_city: r.departure_city,
        arrival_city: r.arrival_city,
      })));
    }
    setLoading(false);
  };

  const handleReserve = (routeId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/reserve/${routeId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-8">Rechercher un trajet</h1>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Ville de départ</Label>
                {citiesLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                  </div>
                ) : (
                  <Select value={departureCity} onValueChange={setDepartureCity}>
                    <SelectTrigger><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les villes</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                {citiesLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                  </div>
                ) : (
                  <Select value={arrivalCity} onValueChange={setArrivalCity}>
                    <SelectTrigger><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les villes</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={handleSearch} disabled={loading || citiesLoading} className="h-10">
                {loading ? "Recherche..." : "Rechercher"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searched && routes.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Aucun trajet trouvé pour cette recherche.</p>
        )}

        <div className="space-y-4">
          {routes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Bus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{route.company.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {route.departure_city.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                      {route.arrival_city.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{route.departure_time.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-secondary" />
                    <span className="font-bold text-lg">{route.price.toLocaleString()} FCFA</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{route.available_seats} places</div>
                  <Button size="sm" onClick={() => handleReserve(route.id)}>Réserver</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Search;
