import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const AdminCities = () => {
  const [cities, setCities] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase.from("cities").select("*").order("name");
    if (data) setCities(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("cities", load);

  const resetForm = () => { setName(""); setRegion(""); setEditing(null); };
  const openEdit = (c: any) => { setEditing(c); setName(c.name); setRegion(c.region || ""); setOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      await supabase.from("cities").update({ name, region }).eq("id", editing.id);
      toast({ title: "Ville modifiée" });
    } else {
      await supabase.from("cities").insert({ name, region });
      toast({ title: "Ville ajoutée" });
    }
    resetForm(); setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette ville ?")) return;
    await supabase.from("cities").delete().eq("id", id);
    toast({ title: "Ville supprimée" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Villes</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle ville"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Région</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} /></div>
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
                <TableHead>Nom</TableHead>
                <TableHead>Région</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.region || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminCities;
