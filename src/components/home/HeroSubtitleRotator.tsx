import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

const ROTATOR_KEYS = [
  "inicio.heroRotator1",
  "inicio.heroRotator2",
  "inicio.heroRotator3",
  "inicio.heroRotator4",
  "inicio.heroRotator5",
] as const;

const INTERVAL_MS = 4000;
const SWAP_MS = 0.3;

/** Subtítulo rotativo do hero: troca de frase a cada 4s com crossfade.
 *  Altura fixa no wrapper para não haver layout shift entre trocas. */
export function HeroSubtitleRotator() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ROTATOR_KEYS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div
      aria-live="polite"
      className="mt-6 min-h-[4.75rem] max-w-xl text-base text-muted-foreground sm:min-h-[3.5rem] sm:text-lg"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={index}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, y: -6, transition: { duration: SWAP_MS } }
          }
          transition={reduceMotion ? { duration: 0 } : { duration: SWAP_MS }}
        >
          {t(ROTATOR_KEYS[index])}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
