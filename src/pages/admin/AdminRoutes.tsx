import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const AdminRoutes = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [companyId, setCompanyId] = useState("");
  const [departureCityId, setDepartureCityId] = useState("");
  const [arrivalCityId, setArrivalCityId] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("50");
  const { toast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("routes")
      .select("*, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
      .order("departure_time");
    if (data) setRoutes(data);
  }, []);

  const loadSelects = useCallback(async () => {
    const [{ data: comps }, { data: cits }] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("cities").select("id, name").order("name"),
    ]);
    if (comps) setCompanies(comps);
    if (cits) setCities(cits);
  }, []);

  useEffect(() => { load(); loadSelects(); }, [load, loadSelects]);
  useRealtimeTable("routes", load);
  useRealtimeTable("companies", loadSelects);
  useRealtimeTable("cities", loadSelects);

  const resetForm = () => {
    setCompanyId(""); setDepartureCityId(""); setArrivalCityId("");
    setDepartureTime(""); setPrice(""); setSeats("50"); setEditing(null);
  };

  const openEdit = (r: any) => {
    setEditing(r); setCompanyId(r.company_id); setDepartureCityId(r.departure_city_id);
    setArrivalCityId(r.arrival_city_id); setDepartureTime(r.departure_time.slice(0, 5));
    setPrice(r.price.toString()); setSeats(r.available_seats.toString()); setOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !departureCityId || !arrivalCityId || !departureTime || !price) return;
    const payload = {
      company_id: companyId, departure_city_id: departureCityId, arrival_city_id: arrivalCityId,
      departure_time: departureTime, price: parseInt(price), available_seats: parseInt(seats),
    };
    if (editing) {
      await supabase.from("routes").update(payload).eq("id", editing.id);
      toast({ title: "Trajet modifié" });
    } else {
      await supabase.from("routes").insert(payload);
      toast({ title: "Trajet ajouté" });
    }
    resetForm(); setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce trajet ?")) return;
    await supabase.from("routes").delete().eq("id", id);
    toast({ title: "Trajet supprimé" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Trajets</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau trajet"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Société</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ville de départ</Label>
                <Select value={departureCityId} onValueChange={setDepartureCityId}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={arrivalCityId} onValueChange={setArrivalCityId}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Heure</Label><Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} /></div>
                <div className="space-y-2"><Label>Prix (FCFA)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Places</Label><Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={handleSave}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Société</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Places</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.company?.name}</TableCell>
                  <TableCell>{r.departure_city?.name}</TableCell>
                  <TableCell>{r.arrival_city?.name}</TableCell>
                  <TableCell>{r.departure_time?.slice(0, 5)}</TableCell>
                  <TableCell>{r.price?.toLocaleString()} FCFA</TableCell>
                  <TableCell>{r.available_seats}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoutes;
