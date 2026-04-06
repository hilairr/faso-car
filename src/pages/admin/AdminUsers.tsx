import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = useCallback(async () => {
    // Get profiles + roles
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);

    if (profiles && roles) {
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      setUsers(profiles.map((p: any) => ({
        ...p,
        roles: roleMap[p.user_id] || ["user"],
      })));
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useRealtimeTable("profiles", loadUsers);
  useRealtimeTable("user_roles", loadUsers);

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge key={role} variant="destructive">Admin</Badge>;
      case "manager": return <Badge key={role} className="bg-amber-500 text-white">Gérant</Badge>;
      default: return <Badge key={role} variant="secondary">Utilisateur</Badge>;
    }
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
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : <span className="text-muted-foreground italic">Non renseigné</span>}
                  </TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r: string) => roleBadge(r))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
