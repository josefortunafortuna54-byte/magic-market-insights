import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Analises from "./pages/Analises";
import Historico from "./pages/Historico";
import Resultados from "./pages/Resultados";
import IATrader from "./pages/IATrader";
import Planos from "./pages/Planos";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Admin from "./pages/Admin";
import AISettings from "./pages/AISettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/analises" element={<Analises />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/ia-trader" element={<IATrader />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes-ia"
              element={
                <ProtectedRoute requireAdmin>
                  <AISettings />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
