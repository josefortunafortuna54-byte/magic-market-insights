import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStep {
  selector: string;
  title: string;
  desc: string;
}

function rectFor(selector: string): Rect | null {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const TOOLTIP_W = 420;

function tooltipStyle(rect: Rect): React.CSSProperties {
  const gap = 16;
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - TOOLTIP_W / 2),
    window.innerWidth - TOOLTIP_W - 12,
  );
  const below = rect.top + rect.height + gap;
  const top = below + 260 <= window.innerHeight ? below : Math.max(12, rect.top - gap - 260);
  return { width: TOOLTIP_W, left, top };
}

export function GuidedTour() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const steps = useMemo<TourStep[]>(
    () => [
      { selector: "#tour-hero", title: t("inicio.heroBadge"), desc: t("inicio.heroSubtitle") },
      { selector: "#tour-features", title: t("inicio.featuresTitle"), desc: t("inicio.featuresSubtitle") },
      { selector: "#tour-featured", title: t("inicio.featuredTitle"), desc: t("inicio.featuredSubtitle") },
      { selector: "#tour-how", title: t("inicio.howTitle"), desc: t("inicio.howSubtitle") },
      { selector: "#tour-app", title: t("app.title"), desc: t("app.subtitle") },
      { selector: "#tour-cta", title: t("inicio.ctaTitle"), desc: t("inicio.ctaSubtitle") },
    ],
    [t],
  );

  const measure = useCallback(() => {
    if (open) setRect(rectFor(steps[step].selector));
  }, [open, step, steps]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.querySelector(steps[step].selector)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    const t1 = setTimeout(measure, 400);
    const t2 = setTimeout(measure, 900);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
    };
  }, [open, step, measure, reduceMotion]);

  const go = (dir: 1 | -1) => {
    const next = step + dir;
    if (next < 0 || next >= steps.length) {
      setOpen(false);
      return;
    }
    setStep(next);
  };

  const last = step === steps.length - 1;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => { setStep(0); setOpen(true); }}
        whileTap={{ scale: 0.92 }}
        aria-label="Tour"
        className="fixed bottom-6 right-6 z-[60] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/25" />
        <Sparkles className="relative h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {open && rect && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/55"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed z-[80] rounded-xl border-2 border-primary"
              style={rect}
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
              role="dialog"
              aria-modal="true"
              className="fixed z-[90] rounded-2xl border border-border bg-card p-5 shadow-2xl"
              style={tooltipStyle(rect)}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {step + 1} / {steps.length}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">{steps[step].title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{steps[step].desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={step === 0}
                  aria-label={t("common.back")}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors",
                    step === 0 ? "opacity-40" : "hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  {last ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{last ? t("tour.finish") : t("tour.next")}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}