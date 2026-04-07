import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, XCircle, Search, AlertTriangle, Clock, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScanTicketProps {
  companyId?: string;
}

const ScanTicket = ({ companyId }: ScanTicketProps) => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"valid" | "used" | "expired" | "invalid" | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const { toast } = useToast();

  const verifyTicket = async (input: string) => {
    setResult(null);
    setStatus(null);
    setLoading(true);

    let ticketNumber = input.trim();
    try {
      const parsed = JSON.parse(input);
      if (parsed.ticket) ticketNumber = parsed.ticket;
    } catch {}

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*, reservation:reservations(*, route:routes(departure_time, price, company_id, company:companies(name), departure_city:cities!routes_departure_city_id_fkey(name), arrival_city:cities!routes_arrival_city_id_fkey(name)))")
      .or(`ticket_number.eq.${ticketNumber},qr_code.eq.${input.trim()}`)
      .maybeSingle();

    setLoading(false);

    if (error || !ticket) {
      setStatus("invalid");
      return;
    }

    if (companyId && ticket.reservation?.route?.company_id !== companyId) {
      setStatus("invalid");
      toast({ title: "Erreur", description: "Ce ticket n'appartient pas à votre société.", variant: "destructive" });
      return;
    }

    setResult(ticket);

    if (ticket.used_at) {
      setStatus("used");
      return;
    }

    if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
      setStatus("expired");
      return;
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
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) throw new Error("No cameras found");

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const backCamera = devices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("arrière") || d.label.toLowerCase().includes("environment"));
      const cameraId = backCamera?.id || devices[devices.length - 1].id;

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          scanner.stop().then(() => { setScanning(false); verifyTicket(decodedText); });
        },
        () => {}
      );
    } catch {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.stop().then(() => { setScanning(false); verifyTicket(decodedText); });
          },
          () => {}
        );
      } catch {
        toast({ title: "Erreur caméra", description: "Impossible d'accéder à la caméra. Vérifiez les permissions.", variant: "destructive" });
        setScanning(false);
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  const handleManualSearch = () => {
    if (manualCode.trim()) verifyTicket(manualCode.trim());
  };

  const resetScan = () => { setResult(null); setStatus(null); setManualCode(""); };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Vérification de ticket</h1>

      <div className="space-y-4">
        {/* Scanner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" /> Scanner QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="qr-reader" className="mb-3 rounded-lg overflow-hidden" style={{ minHeight: scanning ? 280 : 0 }} />
            {!scanning ? (
              <Button onClick={startScanner} className="w-full" size="sm">
                <ScanLine className="h-4 w-4 mr-2" /> Démarrer la caméra
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopScanner} className="w-full" size="sm">
                Arrêter la caméra
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual search */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="N° ticket (ex: FC-...)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="text-sm"
              />
              <Button onClick={handleManualSearch} disabled={loading} size="sm">
                {loading ? "..." : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result: Invalid */}
        {status === "invalid" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-destructive shrink-0" />
              <p className="font-semibold text-destructive text-sm">Ticket invalide — aucun ticket trouvé.</p>
            </CardContent>
          </Card>
        )}

        {/* Result: Used */}
        {status === "used" && result && (
          <Card className="border-amber-500 bg-amber-50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-700 text-sm">Ticket déjà utilisé</p>
                  <p className="text-xs text-muted-foreground">Utilisé le {new Date(result.used_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
              <p className="text-sm font-mono bg-background rounded px-2 py-1">N° {result.ticket_number}</p>
              <Button variant="outline" size="sm" className="w-full" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}

        {/* Result: Expired */}
        {status === "expired" && result && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Ticket expiré</p>
                  <p className="text-xs text-muted-foreground">Expiré le {new Date(result.expires_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
              <p className="text-sm font-mono bg-background rounded px-2 py-1">N° {result.ticket_number}</p>
              <Button variant="outline" size="sm" className="w-full" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}

        {/* Result: Valid */}
        {status === "valid" && result && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <p className="font-semibold text-primary text-sm">Ticket valide ✓</p>
              </div>
              <p className="text-sm font-mono bg-background rounded px-2 py-1">N° {result.ticket_number}</p>
              <Button className="w-full" size="sm" onClick={markAsUsed}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Marquer comme utilisé
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={resetScan}>Nouveau scan</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanTicket;
