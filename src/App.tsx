import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminGuard } from "@/components/auth/AdminGuard";
import Index from "./pages/Index";
import Analises from "./pages/Analises";
import Historico from "./pages/Historico";
import Planos from "./pages/Planos";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Horarios from "./pages/Horarios";
import Comunidade from "./pages/Comunidade";
import RecuperarSenha from "./pages/RecuperarSenha";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import AvisoRisco from "./pages/AvisoRisco";
import SignalDetail from "./pages/SignalDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analises" element={<Analises />} />
          <Route path="/analises/:id" element={<SignalDetail />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
          <Route path="/horarios" element={<Horarios />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/aviso-risco" element={<AvisoRisco />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
