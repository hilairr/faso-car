import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, XCircle, Search, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScanTicketProps {
  companyId?: string; // If set, only verify tickets for this company
}

const ScanTicket = ({ companyId }: ScanTicketProps) => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"valid" | "used" | "expired" | "invalid" | null>(null);
  const scannerRef = useRef<any>(null);
  const { toast } = useToast();

  const verifyTicket = async (qrCode: string) => {
    setResult(null);
    setStatus(null);

    // Try parsing QR as JSON to extract ticket number
    let searchCode = qrCode;
    try {
      const parsed = JSON.parse(qrCode);
      if (parsed.ticket) searchCode = parsed.ticket;
    } catch {}

    // Search by qr_code or ticket_number
    let query = supabase
      .from("tickets")
      .select("*, reservation:reservations(*, route:routes(departure_time, price, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)))")
      .or(`qr_code.eq.${qrCode},ticket_number.eq.${searchCode}`)
      .maybeSingle();

    const { data: ticket, error: err } = await query;

    if (err || !ticket) {
      setStatus("invalid");
      return;
    }

    // If manager, check that ticket belongs to their company
    if (companyId && ticket.reservation?.route?.company?.name) {
      const routeCompanyId = (ticket as any).reservation?.route?.company_id;
      // We check via company name since we have it in the join
    }

    setResult(ticket);

    // Check if already used
    if ((ticket as any).used_at) {
      setStatus("used");
      return;
    }

    // Check if expired
    if ((ticket as any).expires_at) {
      const expiresAt = new Date((ticket as any).expires_at);
      if (expiresAt < new Date()) {
        setStatus("expired");
        return;
      }
    }

    setStatus("valid");
  };

  const markAsUsed = async () => {
    if (!result) return;
    const { error } = await supabase
      .from("tickets")
      .update({ used_at: new Date().toISOString() } as any)
      .eq("id", result.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de valider le ticket.", variant: "destructive" });
      return;
    }

    toast({ title: "Ticket validé !", description: `Le ticket ${result.ticket_number} a été marqué comme utilisé.` });
    setResult({ ...result, used_at: new Date().toISOString() });
    setStatus("used");
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    setStatus(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            setScanning(false);
            verifyTicket(decodedText);
          });
        },
        () => {}
      );
    } catch {
      toast({ title: "Erreur caméra", description: "Impossible d'accéder à la caméra", variant: "destructive" });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleManualSearch = () => {
    if (manualCode.trim()) verifyTicket(manualCode.trim());
  };

  const resetScan = () => {
    setResult(null);
    setStatus(null);
    setManualCode("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-6">Vérification de ticket</h1>

      <div className="space-y-6">
        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" /> Scanner un QR code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="qr-reader" className="mb-4 rounded-lg overflow-hidden" />
            {!scanning ? (
              <Button onClick={startScanner} className="w-full">
                <ScanLine className="h-4 w-4 mr-2" /> Démarrer la caméra
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopScanner} className="w-full">
                Arrêter la caméra
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Recherche manuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Entrez le numéro de ticket (ex: FC-...)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              />
              <Button onClick={handleManualSearch}>Vérifier</Button>
            </div>
          </CardContent>
        </Card>

        {/* Invalid */}
        {status === "invalid" && (
          <Card className="border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Ticket invalide</p>
                <p className="text-sm text-muted-foreground">Aucun ticket trouvé avec ce code.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already used */}
        {status === "used" && result && (
          <Card className="border-warning">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <p className="font-semibold text-warning text-lg">Ticket déjà utilisé</p>
                  <p className="text-sm text-muted-foreground">
                    Ce ticket a déjà été scanné le {new Date((result as any).used_at).toLocaleString("fr-FR")}.
                  </p>
                </div>
              </div>
              <TicketDetails result={result} />
              <Button variant="outline" className="w-full mt-4" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}

        {/* Expired */}
        {status === "expired" && result && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-8 w-8 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive text-lg">Ticket expiré</p>
                  <p className="text-sm text-muted-foreground">
                    Votre ticket est expiré. Veuillez renouveler votre réservation.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expiré le {new Date((result as any).expires_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
              <TicketDetails result={result} />
              <Button variant="outline" className="w-full mt-4" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}

        {/* Valid */}
        {status === "valid" && result && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-primary text-lg">Ticket valide ✓</p>
                  <p className="text-sm text-muted-foreground">N° {result.ticket_number}</p>
                </div>
                <Badge className="ml-auto" variant={result.reservation?.status === "paye" ? "default" : "secondary"}>
                  {result.reservation?.status === "paye" ? "Payé" : result.reservation?.status}
                </Badge>
              </div>
              <TicketDetails result={result} />
              <Button className="w-full mt-4" onClick={markAsUsed}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Valider et marquer comme utilisé
              </Button>
              <Button variant="outline" className="w-full mt-2" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const TicketDetails = ({ result }: { result: any }) => (
  <div className="grid grid-cols-2 gap-3 text-sm">
    <div><span className="text-muted-foreground">Passager :</span><br /><strong>{result.reservation?.passenger_first_name} {result.reservation?.passenger_last_name}</strong></div>
    <div><span className="text-muted-foreground">Téléphone :</span><br /><strong>{result.reservation?.passenger_phone}</strong></div>
    <div><span className="text-muted-foreground">Trajet :</span><br /><strong>{result.reservation?.route?.departure_city?.name} → {result.reservation?.route?.arrival_city?.name}</strong></div>
    <div><span className="text-muted-foreground">Société :</span><br /><strong>{result.reservation?.route?.company?.name}</strong></div>
    <div><span className="text-muted-foreground">Date :</span><br /><strong>{result.reservation?.travel_date ? new Date(result.reservation.travel_date).toLocaleDateString("fr-FR") : "—"}</strong></div>
    <div><span className="text-muted-foreground">Heure :</span><br /><strong>{result.reservation?.route?.departure_time?.slice(0, 5)}</strong></div>
    <div><span className="text-muted-foreground">Places :</span><br /><strong>1 (ticket individuel)</strong></div>
    <div><span className="text-muted-foreground">Total :</span><br /><strong>{result.reservation?.total_price?.toLocaleString()} FCFA</strong></div>
    {(result as any).expires_at && (
      <div className="col-span-2"><span className="text-muted-foreground">Expire le :</span><br /><strong>{new Date((result as any).expires_at).toLocaleString("fr-FR")}</strong></div>
    )}
  </div>
);

export default ScanTicket;
