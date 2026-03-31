import { Link, useNavigate } from "react-router-dom";
import { Bus, Menu, X, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Bus className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold font-display text-primary">FasoCar</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Accueil</Link>
          <Link to="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Rechercher</Link>
          {user ? (
            <>
              <Link to="/my-tickets" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mes Tickets</Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Déconnexion
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>
              <User className="h-4 w-4 mr-1" /> Connexion
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">Accueil</Link>
          <Link to="/search" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">Rechercher</Link>
          {user ? (
            <>
              <Link to="/my-tickets" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">Mes Tickets</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">Admin</Link>}
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                <LogOut className="h-4 w-4 mr-1" /> Déconnexion
              </Button>
            </>
          ) : (
            <Button size="sm" className="w-full" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>
              <User className="h-4 w-4 mr-1" /> Connexion
            </Button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
