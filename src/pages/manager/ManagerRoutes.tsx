import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

const ManagerRoutes = () => {
  const { companyId } = useOutletContext<{ companyId: string }>();
  const [routes, setRoutes] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [depCity, setDepCity] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [depTime, setDepTime] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("50");
  const { toast } = useToast();

  const load = async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("routes")
        .select("*, departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)")
        .eq("company_id", companyId).order("departure_time"),
      supabase.from("cities").select("*").order("name"),
    ]);
    if (r) setRoutes(r);
    if (c) setCities(c);
  };

  useEffect(() => { if (companyId) load(); }, [companyId]);

  const resetForm = () => { setDepCity(""); setArrCity(""); setDepTime(""); setPrice(""); setSeats("50"); setEditing(null); };

  const openEdit = (r: any) => {
    setEditing(r);
    setDepCity(r.departure_city_id);
    setArrCity(r.arrival_city_id);
    setDepTime(r.departure_time);
    setPrice(String(r.price));
    setSeats(String(r.available_seats));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!depCity || !arrCity || !depTime || !price) return;
    const payload = {
      company_id: companyId,
      departure_city_id: depCity,
      arrival_city_id: arrCity,
      departure_time: depTime,
      price: parseInt(price),
      available_seats: parseInt(seats),
    };
    if (editing) {
      await supabase.from("routes").update(payload).eq("id", editing.id);
      toast({ title: "Trajet modifié" });
    } else {
      await supabase.from("routes").insert(payload);
      toast({ title: "Trajet ajouté" });
    }
    resetForm();
    setOpen(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Mes trajets</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le trajet" : "Nouveau trajet"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ville de départ</Label>
                <Select value={depCity} onValueChange={setDepCity}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ville d'arrivée</Label>
                <Select value={arrCity} onValueChange={setArrCity}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Heure de départ</Label><Input type="time" value={depTime} onChange={(e) => setDepTime(e.target.value)} /></div>
              <div className="space-y-2"><Label>Prix (FCFA)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              <div className="space-y-2"><Label>Places disponibles</Label><Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
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
                <TableHead>Départ</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Places</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.departure_city?.name}</TableCell>
                  <TableCell>{r.arrival_city?.name}</TableCell>
                  <TableCell>{r.departure_time}</TableCell>
                  <TableCell className="font-medium">{r.price?.toLocaleString()} FCFA</TableCell>
                  <TableCell>{r.available_seats}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun trajet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerRoutes;
