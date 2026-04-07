import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ROLES = [
  { value: "user", label: "Utilisateur" },
  { value: "manager", label: "Gérant" },
  { value: "admin", label: "Administrateur" },
] as const;

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [newRole, setNewRole] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const loadUsers = useCallback(async () => {
    const [{ data: profiles }, { data: roles }, { data: companyManagers }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("company_managers").select("*"),
    ]);

    if (profiles && roles) {
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const managerMap: Record<string, string> = {};
      companyManagers?.forEach((cm: any) => {
        managerMap[cm.user_id] = cm.company_id;
      });

      setUsers(profiles.map((p: any) => ({
        ...p,
        roles: roleMap[p.user_id] || ["user"],
        primaryRole: roleMap[p.user_id]?.includes("admin")
          ? "admin"
          : roleMap[p.user_id]?.includes("manager")
            ? "manager"
            : "user",
        companyId: managerMap[p.user_id] || null,
      })));
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    const { data } = await supabase.from("companies").select("id, name").eq("is_active", true).order("name");
    if (data) setCompanies(data);
  }, []);

  useEffect(() => { loadUsers(); loadCompanies(); }, [loadUsers, loadCompanies]);
  useRealtimeTable("profiles", loadUsers);
  useRealtimeTable("user_roles", loadUsers);

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    if (newRole === "manager" && !selectedCompanyId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une société pour le gérant.", variant: "destructive" });
      return;
    }
    setChanging(true);

    try {
      await supabase.from("user_roles").delete().eq("user_id", selectedUser.user_id);
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.user_id,
        role: newRole as any,
      });
      if (error) throw error;

      // Handle company_managers
      await supabase.from("company_managers").delete().eq("user_id", selectedUser.user_id);
      if (newRole === "manager" && selectedCompanyId) {
        await supabase.from("company_managers").insert({
          user_id: selectedUser.user_id,
          company_id: selectedCompanyId,
        });
      }

      toast({ title: "Rôle modifié", description: `${selectedUser.first_name || "Utilisateur"} est maintenant ${ROLES.find(r => r.value === newRole)?.label}` });
      setSelectedUser(null);
      setSelectedCompanyId("");
      loadUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setChanging(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await supabase.from("company_managers").delete().eq("user_id", deleteTarget.user_id);
      await supabase.from("user_roles").delete().eq("user_id", deleteTarget.user_id);
      const { error } = await supabase.from("profiles").delete().eq("user_id", deleteTarget.user_id);
      if (error) throw error;

      toast({ title: "Utilisateur supprimé", description: `${deleteTarget.first_name || "Utilisateur"} ${deleteTarget.last_name || ""} a été supprimé.` });
      setDeleteTarget(null);
      loadUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge key={role} variant="destructive">Admin</Badge>;
      case "manager": return <Badge key={role} className="bg-amber-500 text-white">Gérant</Badge>;
      default: return <Badge key={role} variant="secondary">Utilisateur</Badge>;
    }
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return null;
    return companies.find(c => c.id === companyId)?.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground">Tous les comptes inscrits ({users.length})</p>
        </div>
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Société</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.first_name || u.last_name
                      ? `${u.first_name} ${u.last_name}`
                      : <span className="text-muted-foreground italic">Non renseigné</span>}
                  </TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r: string) => roleBadge(r))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.primaryRole === "manager" && u.companyId
                      ? <span className="font-medium">{getCompanyName(u.companyId)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {u.user_id !== currentUser?.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.primaryRole);
                            setSelectedCompanyId(u.companyId || "");
                          }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role change dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>Sélectionnez un nouveau rôle pour cet utilisateur.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Utilisateur : <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
              </p>
              <div className="space-y-2">
                <Label>Nouveau rôle</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newRole === "manager" && (
                <div className="space-y-2">
                  <Label>Société de transport</Label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une société..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedCompanyId && (
                    <p className="text-xs text-destructive">Vous devez associer le gérant à une société.</p>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={handleChangeRole} disabled={changing || (newRole === selectedUser.primaryRole && (newRole !== "manager" || selectedCompanyId === (selectedUser.companyId || "")))}>
                {changing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Modification...</> : "Confirmer le changement"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm">
                Voulez-vous vraiment supprimer <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> ?
              </p>
              <p className="text-xs text-muted-foreground">
                Son profil, ses rôles et ses associations de société seront supprimés.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Annuler</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteUser} disabled={deleting}>
                  {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Suppression...</> : "Supprimer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
