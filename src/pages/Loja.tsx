import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  Cpu,
  Diamond,
  GraduationCap,
  LayoutGrid,
  Library,
  Lock,
  Package,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useStoreProducts, type StoreCategory, type StoreProduct } from "@/hooks/useStoreProducts";
import { useSubscription } from "@/hooks/useSubscription";

type Category = "all" | StoreCategory;

const CATEGORY_ACCENT: Record<StoreCategory, string> = {
  bots: "#30D158",
  mentorias: "#FF9F0A",
  ebooks: "#64D2FF",
};

const CATEGORY_ICON: Record<StoreCategory, LucideIcon> = {
  bots: Cpu,
  mentorias: Users,
  ebooks: BookOpen,
};

const ICON_MAP: Record<string, LucideIcon> = {
  "rocket-outline": Rocket,
  "trending-up-outline": TrendingUp,
  "notifications-outline": Bell,
  "school-outline": GraduationCap,
  "people-outline": Users,
  "book-outline": BookOpen,
  "library-outline": Library,
  "shield-checkmark-outline": ShieldCheck,
};

const CATEGORIES: { key: Category; labelKey: string; icon: LucideIcon }[] = [
  { key: "all", labelKey: "store.categoryAll", icon: LayoutGrid },
  { key: "bots", labelKey: "store.categoryBots", icon: Cpu },
  { key: "mentorias", labelKey: "store.categoryMentorias", icon: Users },
  { key: "ebooks", labelKey: "store.categoryEbooks", icon: BookOpen },
];

const INCLUDED_KEYS: Record<StoreCategory, string[]> = {
  bots: ["store.incBot1", "store.incBot2", "store.incBot3"],
  mentorias: ["store.incMentor1", "store.incMentor2", "store.incMentor3"],
  ebooks: ["store.incEbook1", "store.incEbook2", "store.incEbook3"],
};

const productIcon = (item: StoreProduct): LucideIcon => ICON_MAP[item.icon] ?? Package;

export default function Loja() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const { products, refresh } = useStoreProducts();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [selectedItem, setSelectedItem] = useState<StoreProduct | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const total = products.length;
    const free = products.filter((i) => !i.isPremium).length;
    const ratingSum = products.reduce((acc, i) => acc + (i.rating ?? 0), 0);
    const rating = total > 0 ? ratingSum / total : 0;
    return { total, free, rating: rating.toFixed(1) };
  }, [products]);

  const filteredItems =
    selectedCategory === "all"
      ? products
      : products.filter((item) => item.category === selectedCategory);

  const featuredItems = products.filter((item) => item.featured);
  const activeCategory = CATEGORIES.find((c) => c.key === selectedCategory)!;

  const isLocked = (item: StoreProduct) => item.isPremium && !isPremium;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCta = () => {
    if (!selectedItem) return;
    const locked = isLocked(selectedItem);
    setSelectedItem(null);
    navigate(locked ? "/planos" : "/suporte-ia");
  };

  const closeItem = () => setSelectedItem(null);

  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedItem]);

  const Price = ({ item, locked }: { item: StoreProduct; locked: boolean }) =>
    item.isPremium || locked ? (
      <span className="text-sm font-extrabold text-foreground">{item.price}</span>
    ) : (
      <span className="text-sm font-extrabold text-primary">{t("store.free")}</span>
    );

  const ProBadge = ({ item }: { item: StoreProduct }) =>
    item.isPremium ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400">
        <Diamond className="h-2.5 w-2.5" />
        PRO
      </span>
    ) : (
      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
        {t("store.free")}
      </span>
    );

  return (
    <Layout noFooter>
      <section className="pt-6 pb-24">
        <div className="container mx-auto max-w-3xl px-4">
          <button
            type="button"
            onClick={() => navigate("/comunidade")}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back")}
          </button>

          <div className="mb-4 rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(255,159,10,0.14),rgba(22,164,58,0.08),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
                <Store className="h-[22px] w-[22px] text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl font-bold">{t("store.title")}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("store.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="shrink-0 rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                aria-label={t("store.refresh")}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="mt-4 flex items-center rounded-xl border border-border bg-background py-2">
              {[
                { value: stats.total, label: t("store.statsProducts") },
                { value: stats.free, label: t("store.statsFree") },
                { value: stats.rating, label: t("store.statsRating"), star: true },
              ].map((stat, idx) => (
                <div className="flex flex-1 items-center" key={idx}>
                  {idx > 0 ? <span className="h-6 w-px shrink-0 bg-border" /> : null}
                  <div className="flex flex-1 flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1 font-display text-base font-bold">
                      {stat.star ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {featuredItems.length > 0 ? (
            <>
              <div className="mb-3 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">{t("store.featuredSection")}</span>
              </div>
              <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 snap-x">
                {featuredItems.map((item) => {
                  const accent = item.color ?? CATEGORY_ACCENT[item.category];
                  const Icon = productIcon(item);
                  const locked = isLocked(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="relative w-[300px] shrink-0 snap-start rounded-2xl border border-amber-400/35 bg-[linear-gradient(135deg,rgba(255,159,10,0.16),rgba(255,159,10,0.04))] p-4 text-left transition-colors hover:border-amber-400/60"
                    >
                      <span className="absolute right-4 top-0 flex items-center gap-1 rounded-b-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#1A1A2E]">
                        <Star className="h-2.5 w-2.5" />
                        {t("store.featuredSection")}
                      </span>
                      <div className="mt-3 flex items-center gap-4">
                        <div
                          className="flex h-[52px] w-[52px] items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${accent}1F` }}
                        >
                          <Icon className="h-[26px] w-[26px]" color={accent} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-bold">{item.title}</p>
                          <div className="mt-1 flex items-center gap-1">
                            <ProBadge item={item} />
                            {locked ? (
                              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border bg-card">
                                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p
                        className="mt-2 min-h-[34px] text-sm leading-[17px] text-muted-foreground"
                        style={{
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t border-amber-400/15 pt-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <Star className="h-3 w-3 text-amber-400" />
                          {item.rating ?? 0}
                          <span className="ml-1 font-normal text-muted-foreground">
                            ({item.users ?? 0})
                          </span>
                        </span>
                        <Price item={item} locked={locked} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 py-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const count =
                cat.key === "all"
                  ? products.length
                  : products.filter((i) => i.category === cat.key).length;
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs transition-colors ${
                    isActive
                      ? "border-amber-400 bg-amber-400 font-semibold text-[#1A1A2E]"
                      : "border-border bg-card font-semibold text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CatIcon className="h-3.5 w-3.5" />
                  {t(cat.labelKey)}
                  <span
                    className={`min-w-[18px] rounded-full px-1 py-px text-center text-[10px] ${
                      isActive ? "bg-[#1A1A2E]/25 text-[#1A1A2E]" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t(activeCategory.labelKey)}</span>
            <span className="text-xs text-muted-foreground">
              {t("store.items", { count: filteredItems.length })}
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">{t("store.empty")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const accent = item.color ?? CATEGORY_ACCENT[item.category];
                const Icon = productIcon(item);
                const locked = isLocked(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex flex-col border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${accent}1F` }}
                      >
                        <Icon className="h-5 w-5" color={accent} />
                      </div>
                      <ProBadge item={item} />
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-foreground">{item.title}</p>
                    <p
                      className="mt-0.5 min-h-[34px] flex-1 text-[13px] leading-[17px] text-muted-foreground"
                      style={{
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <Star className="h-3 w-3 text-amber-400" />
                        {item.rating ?? 0}
                      </span>
                      <Price item={item} locked={locked} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            onClick={closeItem}
            aria-label={t("common.close")}
          />
          <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border border-b-0 bg-card">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted" />
            <button
              type="button"
              onClick={closeItem}
              className="absolute right-4 top-4 z-10 rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="overflow-y-auto px-4 pb-6">
              <div className="flex items-center gap-4 pt-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category]}1F` }}
                >
                  {(() => {
                    const Icon = productIcon(selectedItem);
                    return <Icon className="h-8 w-8" color={selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category]} />;
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-snug">{selectedItem.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-bold"
                      style={{ color: selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category] }}
                    >
                      {(() => {
                        const Icon = CATEGORY_ICON[selectedItem.category];
                        return <Icon className="h-2.5 w-2.5" />;
                      })()}
                      {t(CATEGORIES.find((c) => c.key === selectedItem.category)!.labelKey)}
                    </span>
                    <ProBadge item={selectedItem} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <Star className="h-3 w-3 text-amber-400" />
                  {selectedItem.rating ?? 0}
                </span>
                <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground" />
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {selectedItem.users ?? 0}
                </span>
                <span className="flex-1" />
                <Price item={selectedItem} locked={isLocked(selectedItem)} />
              </div>

              <p className="mt-4 text-sm leading-[21px] text-muted-foreground">
                {selectedItem.description}
              </p>

              <p className="mb-2 mt-5 text-xs font-semibold text-foreground">{t("store.included")}</p>
              <div className="space-y-2">
                {INCLUDED_KEYS[selectedItem.category].map((text) => (
                  <div key={text} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground">{t(text)}</span>
                  </div>
                ))}
              </div>

              <Button
                className="mt-6 w-full"
                variant={isLocked(selectedItem) ? "premium" : "default"}
                onClick={handleCta}
              >
                {isLocked(selectedItem) ? t("store.upgradeCta") : t("store.requestCta")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}