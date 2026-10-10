import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import ratesHandler from "./api/rates";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "dev-api-rates",
      apply: "serve",
      configureServer(server) {
        // Em prod o /api/rates e uma edge function da Vercel. No dev o
        // Vite serviria o ficheiro .ts cru em vez de o executar, por isso
        // corre-se o mesmo handler aqui, com a mesma resposta JSON.
        server.middlewares.use("/api/rates", async (_req, res) => {
          try {
            const r = await ratesHandler();
            res.statusCode = r.status;
            for (const [k, v] of r.headers.entries()) res.setHeader(k, v);
            res.end(await r.text());
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ date: "", pairs: {}, stale: true }));
          }
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
