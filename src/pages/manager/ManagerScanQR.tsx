import { useOutletContext } from "react-router-dom";
import ScanTicket from "@/components/ScanTicket";

const ManagerScanQR = () => {
  const { companyId } = useOutletContext<{ companyId: string }>();
  return <ScanTicket companyId={companyId} />;
};

export default ManagerScanQR;
