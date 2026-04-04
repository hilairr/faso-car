import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Route, Ticket, ArrowLeft, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const managerItems = [
  { title: "Tableau de bord", url: "/manager", icon: LayoutDashboard },
  { title: "Trajets", url: "/manager/routes", icon: Route },
  { title: "Tickets vendus", url: "/manager/tickets", icon: Ticket },
  { title: "Scanner QR", url: "/manager/scan", icon: ScanLine },
];

const ManagerLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isManager, setIsManager] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkManager = async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.from("company_managers").select("company_id, company:companies(name)").eq("user_id", user.id).maybeSingle();
      if (data) {
        setIsManager(true);
        setCompanyId(data.company_id);
        setCompanyName((data as any).company?.name || "");
      }
      setChecking(false);
    };
    if (!loading) checkManager();
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !checking && (!user || !isManager)) navigate("/auth");
  }, [user, isManager, loading, checking]);

  if (loading || checking) return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  if (!isManager) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{companyName || "Gérant"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managerItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-4">
            <SidebarTrigger />
            <h2 className="font-semibold text-lg">Espace Gérant — {companyName}</h2>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Retour au site</Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet context={{ companyId, companyName }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ManagerLayout;
