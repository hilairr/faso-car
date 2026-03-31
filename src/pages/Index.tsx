import { useNavigate } from "react-router-dom";
import { Bus, Search, CreditCard, Ticket, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";

const Index = () => {
  const navigate = useNavigate();

  const steps = [
    { icon: Search, title: "Recherchez", desc: "Trouvez votre trajet parmi toutes les sociétés de transport" },
    { icon: CreditCard, title: "Réservez & Payez", desc: "Payez facilement via Orange Money ou Moov Money" },
    { icon: Ticket, title: "Voyagez", desc: "Téléchargez votre ticket avec QR code et montez à bord" },
  ];

  const features = [
    { icon: MapPin, title: "Toutes les destinations", desc: "Ouagadougou, Bobo-Dioulasso, Koudougou et plus" },
    { icon: Clock, title: "Horaires en temps réel", desc: "Consultez les départs disponibles à tout moment" },
    { icon: Shield, title: "Paiement sécurisé", desc: "Orange Money & Moov Money acceptés" },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-1.5 mb-6">
            <Bus className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">N°1 au Burkina Faso</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            Réservez votre ticket<br />de car en ligne
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            TCV, STAF, Rakieta, TSR et plus — comparez les prix, les horaires et réservez en quelques clics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8 font-semibold" onClick={() => navigate("/search")}>
              <Search className="h-5 w-5 mr-2" /> Rechercher un trajet
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/auth")}>
              Créer un compte
            </Button>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Card key={i} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="pt-8 pb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-secondary mb-2">0{i + 1}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Pourquoi FasoCar ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Prêt à voyager ?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Rejoignez des milliers de voyageurs qui réservent leurs tickets en ligne sur FasoCar.
          </p>
          <Button size="lg" onClick={() => navigate("/search")} className="text-lg px-8">
            Trouver mon trajet
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
