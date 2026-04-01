import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminScanQR = () => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const verifyTicket = async (qrCode: string) => {
    setError("");
    setResult(null);

    const { data: ticket, error: err } = await supabase
      .from("tickets")
      .select("*, reservation:reservations(*, route:routes(departure_time, price, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)))")
      .eq("qr_code", qrCode)
      .maybeSingle();

    if (err || !ticket) {
      setError("Ticket non trouvé ou QR code invalide");
      return;
    }

    setResult(ticket);
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    setError("");

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
      setError("Impossible d'accéder à la caméra");
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
            <div id="qr-reader" ref={containerRef} className="mb-4 rounded-lg overflow-hidden" />
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
                placeholder="Entrez le code QR ou numéro de ticket..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              />
              <Button onClick={handleManualSearch}>Vérifier</Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Ticket invalide</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-primary text-lg">Ticket valide</p>
                  <p className="text-sm text-muted-foreground">N° {result.ticket_number}</p>
                </div>
                <Badge className="ml-auto" variant={result.reservation?.status === "paye" ? "default" : "secondary"}>
                  {result.reservation?.status === "paye" ? "Payé" : result.reservation?.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Passager :</span><br /><strong>{result.reservation?.passenger_first_name} {result.reservation?.passenger_last_name}</strong></div>
                <div><span className="text-muted-foreground">Téléphone :</span><br /><strong>{result.reservation?.passenger_phone}</strong></div>
                <div><span className="text-muted-foreground">Trajet :</span><br /><strong>{result.reservation?.route?.departure_city?.name} → {result.reservation?.route?.arrival_city?.name}</strong></div>
                <div><span className="text-muted-foreground">Société :</span><br /><strong>{result.reservation?.route?.company?.name}</strong></div>
                <div><span className="text-muted-foreground">Date :</span><br /><strong>{result.reservation?.travel_date ? new Date(result.reservation.travel_date).toLocaleDateString("fr-FR") : "—"}</strong></div>
                <div><span className="text-muted-foreground">Heure :</span><br /><strong>{result.reservation?.route?.departure_time}</strong></div>
                <div><span className="text-muted-foreground">Places :</span><br /><strong>{result.reservation?.num_seats}</strong></div>
                <div><span className="text-muted-foreground">Total :</span><br /><strong>{result.reservation?.total_price?.toLocaleString()} FCFA</strong></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminScanQR;
