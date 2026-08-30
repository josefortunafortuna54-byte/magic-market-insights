import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import Perfil from "./pages/Perfil";
import Depositos from "./pages/Depositos";
import Banca from "./pages/Banca";
import {
  DiarioTraderPage,
  SuporteIaPage,
  DefinicoesBoomsPage,
  TemaPage,
  IdiomaPage,
} from "./pages/PlaceholderPages";
import Notificacoes from "./pages/Notificacoes";
import Index from "./pages/Index";
import Analises from "./pages/Analises";
import Historico from "./pages/Historico";
import Planos from "./pages/Planos";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminGate from "./pages/AdminGate";
import Horarios from "./pages/Horarios";
import Comunidade from "./pages/Comunidade";
import ComunidadeCanal from "./pages/ComunidadeCanal";
import ComunidadeDm from "./pages/ComunidadeDm";
import ComunidadePesquisa from "./pages/ComunidadePesquisa";
import ComunidadeNovoCanal from "./pages/ComunidadeNovoCanal";
import ComunidadeNovoDm from "./pages/ComunidadeNovoDm";
import PerfilPublico from "./pages/PerfilPublico";
import Loja from "./pages/Loja";
import RecuperarSenha from "./pages/RecuperarSenha";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import AvisoRisco from "./pages/AvisoRisco";
import SignalDetail from "./pages/SignalDetail";

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
            <Route path="/analises" element={<Analises />} />
            <Route path="/analises/:id" element={<SignalDetail />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/banca" element={<Banca />} />
            <Route path="/depositos" element={<Depositos />} />
            <Route path="/notificacoes" element={<Notificacoes />} />
            <Route path="/diario-trader" element={<DiarioTraderPage />} />
            <Route path="/suporte-ia" element={<SuporteIaPage />} />
            <Route path="/definicoes-booms" element={<DefinicoesBoomsPage />} />
            <Route path="/tema" element={<TemaPage />} />
            <Route path="/idioma" element={<IdiomaPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
            <Route path="/admin-gate" element={<AdminGate />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/comunidade" element={<Comunidade />} />
            <Route path="/comunidade/canais/:channelId" element={<ComunidadeCanal />} />
            <Route path="/comunidade/dm/:conversationId" element={<ComunidadeDm />} />
            <Route path="/comunidade/pesquisa" element={<ComunidadePesquisa />} />
            <Route path="/comunidade/novo-canal" element={<ComunidadeNovoCanal />} />
            <Route path="/comunidade/novo-dm" element={<ComunidadeNovoDm />} />
            <Route path="/comunidade/user/:userId" element={<PerfilPublico />} />
            <Route path="/comunidade/loja" element={<Loja />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/aviso-risco" element={<AvisoRisco />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
