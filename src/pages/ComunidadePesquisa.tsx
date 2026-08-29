import { Layout } from "@/components/layout/Layout";

export default function ComunidadePesquisa() {
  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-center gap-3 py-24">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">A carregar...</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}