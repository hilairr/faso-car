import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Search from "./pages/Search.tsx";
import Reserve from "./pages/Reserve.tsx";
import Payment from "./pages/Payment.tsx";
import MyTickets from "./pages/MyTickets.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminCompanies from "./pages/admin/AdminCompanies.tsx";
import AdminCities from "./pages/admin/AdminCities.tsx";
import AdminRoutes from "./pages/admin/AdminRoutes.tsx";
import AdminReservations from "./pages/admin/AdminReservations.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<Search />} />
            <Route path="/reserve/:routeId" element={<Reserve />} />
            <Route path="/payment/:reservationId" element={<Payment />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="cities" element={<AdminCities />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="reservations" element={<AdminReservations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
