import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type StoreCategory = "bots" | "mentorias" | "ebooks";

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  category: StoreCategory;
  isPremium: boolean;
  price: string;
  icon: string;
  featured?: boolean;
  color: string;
  rating?: number;
  users?: number;
}

export const STORE_PRODUCTS_STORAGE_KEY = "store_products_v1";

export const DEFAULT_STORE_PRODUCTS: StoreProduct[] = [
  {
    id: "bot-scalper-pro",
    title: "Bot Scalper Pro",
    description: "Bot automatizado para operações de scalping em boom com gestão de risco avançada.",
    category: "bots",
    isPremium: true,
    price: "5.000 Kz",
    icon: "rocket-outline",
    featured: true,
    color: "#FF6B6B",
    rating: 4.8,
    users: 342,
  },
  {
    id: "bot-swing-trader",
    title: "Bot Swing Trader",
    description: "Bot para operações de swing com trailing stop e filtros de volatilidade.",
    category: "bots",
    isPremium: true,
    price: "3.500 Kz",
    icon: "trending-up-outline",
    color: "#4ECDC4",
    rating: 4.6,
    users: 218,
  },
  {
    id: "bot-sinalizador",
    title: "Bot Sinalizador",
    description: "Bot que envia sinais em tempo real para seu canal de trading.",
    category: "bots",
    isPremium: false,
    price: "Grátis",
    icon: "notifications-outline",
    color: "#45B7D1",
    rating: 4.3,
    users: 891,
  },
  {
    id: "mentoria-individual",
    title: "Mentoria Individual",
    description: "Acompanhamento personalizado com trader profissional. Sessões ao vivo e análise de portfolio.",
    category: "mentorias",
    isPremium: true,
    price: "15.000 Kz",
    icon: "school-outline",
    featured: true,
    color: "#96CEB4",
    rating: 4.9,
    users: 56,
  },
  {
    id: "mentoria-grupo",
    title: "Mentoria em Grupo",
    description: "Aprenda em grupo com sessões semanais ao vivo e comunidade exclusiva.",
    category: "mentorias",
    isPremium: false,
    price: "5.000 Kz",
    icon: "people-outline",
    color: "#FFEAA7",
    rating: 4.5,
    users: 234,
  },
  {
    id: "ebook-fundamentos",
    title: "Ebook: Fundamentos",
    description: "Guia completo de análise fundamentalista para boom. Do básico ao avançado.",
    category: "ebooks",
    isPremium: false,
    price: "Grátis",
    icon: "book-outline",
    color: "#DDA0DD",
    rating: 4.2,
    users: 1203,
  },
  {
    id: "ebook-estrategias",
    title: "Ebook: Estratégias Avançadas",
    description: "Estratégias profissionais de trading com exemplos reais e backtests.",
    category: "ebooks",
    isPremium: true,
    price: "2.500 Kz",
    icon: "library-outline",
    color: "#FF9FF3",
    rating: 4.7,
    users: 445,
  },
  {
    id: "ebook-gestao-risco",
    title: "Ebook: Gestão de Risco",
    description: "Aprenda a proteger seu capital e maximizar lucros com gestão profissional.",
    category: "ebooks",
    isPremium: false,
    price: "1.500 Kz",
    icon: "shield-checkmark-outline",
    color: "#54A0FF",
    rating: 4.4,
    users: 678,
  },
];

function fromRow(r: Record<string, unknown>): StoreProduct {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string,
    category: r.category as StoreCategory,
    isPremium: Boolean(r.is_premium),
    price: r.price as string,
    icon: r.icon as string,
    featured: Boolean(r.featured),
    color: (r.color as string) ?? "#7C3AED",
    rating: r.rating != null ? Number(r.rating) : undefined,
    users: r.users_count != null ? Number(r.users_count) : undefined,
  };
}

export function useStoreProducts() {
  const [products, setProducts] = useState<StoreProduct[]>(DEFAULT_STORE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<StoreProduct[]>(DEFAULT_STORE_PRODUCTS);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve(localStorage.getItem(STORE_PRODUCTS_STORAGE_KEY))
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as StoreProduct[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            listRef.current = parsed;
            setProducts(parsed);
          }
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchServer = useCallback(async (): Promise<StoreProduct[] | null> => {
    const { data, error } = await supabase
      .from("store_products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map(fromRow);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchServer().then((server) => {
      if (cancelled || !server) return;
      listRef.current = server;
      setProducts(server);
      localStorage.setItem(STORE_PRODUCTS_STORAGE_KEY, JSON.stringify(server));
    });
    return () => {
      cancelled = true;
    };
  }, [fetchServer]);

  const refresh = useCallback(async () => {
    const server = await fetchServer();
    if (!server) return;
    listRef.current = server;
    setProducts(server);
    localStorage.setItem(STORE_PRODUCTS_STORAGE_KEY, JSON.stringify(server));
  }, [fetchServer]);

  return { products, loading, refresh };
}