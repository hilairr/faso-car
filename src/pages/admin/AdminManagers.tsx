import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, UserCog } from "lucide-react";

const AdminManagers = () => {
  const [managers, setManagers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    const [{ data: mgrs }, { data: comps }] = await Promise.all([
      supabase.from("company_managers").select("*, company:companies(name)"),
      supabase.from("companies").select("*").order("name"),
    ]);
    if (mgrs) setManagers(mgrs);
    if (comps) setCompanies(comps);
  };

  // Load manager profiles
  const [managerProfiles, setManagerProfiles] = useState<Record<string, any>>({});

  const loadProfiles = async (managersList: any[]) => {
    const userIds = managersList.map((m) => m.user_id);
    if (userIds.length === 0) return;
    const { data } = await supabase.from("profiles").select("*").in("user_id", userIds);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach((p) => { map[p.user_id] = p; });
      setManagerProfiles(map);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (managers.length > 0) loadProfiles(managers); }, [managers]);

  const handleInvite = async () => {
    if (!email.trim() || !companyId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-manager", {
        body: { email: email.trim(), company_id: companyId },
      });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Gérant ajouté", description: data.message });
        setEmail("");
        setCompanyId("");
        setOpen(false);
        loadData();
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }

    setLoading(false);
  };

  const handleRemove = async (id: string, userId: string) => {
    if (!confirm("Retirer ce gérant ?")) return;
    await supabase.from("company_managers").delete().eq("id", id);
    // Remove manager role
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "manager" as any);
    toast({ title: "Gérant retiré" });
    loadData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Gérants de sociétés</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Inviter un gérant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un gérant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email du gérant</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gerant@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Société de transport</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une société" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={loading}>
                {loading ? "Envoi en cours..." : "Envoyer l'invitation"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Un compte sera créé et le gérant recevra un email pour confirmer son accès.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gérant</TableHead>
                <TableHead>Société</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      {managerProfiles[m.user_id]
                        ? `${managerProfiles[m.user_id].first_name} ${managerProfiles[m.user_id].last_name}`.trim() || m.user_id.slice(0, 8)
                        : m.user_id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>{(m as any).company?.name || "—"}</TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id, m.user_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {managers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun gérant assigné
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagers;
