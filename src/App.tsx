import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPrompt } from "@/components/PWA/InstallPrompt";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { AdminLayout } from "@/components/Layout/AdminLayout";
import { ClientLayout } from "@/components/Layout/ClientLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Barbers from "./pages/Barbers";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import Financial from "./pages/Financial";
import Settings from "./pages/Settings";
import Portfolio from "./pages/Portfolio";
import ClientHome from "./pages/client/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientBarbers from "./pages/client/ClientBarbers";
import ClientServices from "./pages/client/ClientServices";
import ClientProfile from "./pages/client/ClientProfile";
import ClientPortfolio from "./pages/client/ClientPortfolio";
import SelectBarbershop from "./pages/client/SelectBarbershop";
import ClientSignup from "./pages/ClientSignup";
import ClientLogin from "./pages/ClientLogin";
import PublicBarbershopSelection from "./pages/PublicBarbershopSelection";
import Install from "./pages/Install";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InstallPrompt />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cadastro-cliente" element={<ClientSignup />} />
            <Route path="/login-cliente" element={<ClientLogin />} />
            <Route path="/selecionar-barbearia" element={<PublicBarbershopSelection />} />
            <Route path="/install" element={<Install />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="owner">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="barbers" element={<Barbers />} />
              <Route path="services" element={<Services />} />
              <Route path="clients" element={<Clients />} />
              <Route path="financial" element={<Financial />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Client Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientHome />} />
              <Route path="select-barbershop" element={<SelectBarbershop />} />
              <Route path="booking" element={<ClientBooking />} />
              <Route path="appointments" element={<ClientAppointments />} />
              <Route path="barbers" element={<ClientBarbers />} />
              <Route path="services" element={<ClientServices />} />
              <Route path="portfolio" element={<ClientPortfolio />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>

            {/* Default redirect to home */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
