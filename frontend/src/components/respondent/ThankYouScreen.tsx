"use client";

import { motion } from "framer-motion";

import type { FormSettings } from "@/lib/types";

interface ThankYouScreenProps {
  settings: FormSettings;
  onRestart?: () => void;
}

export function ThankYouScreen({ settings, onRestart }: ThankYouScreenProps) {
  const title = settings.thank_you?.title || "Thanks for completing this typeform";
  const description = settings.thank_you?.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex max-w-2xl flex-col items-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl leading-snug text-[var(--q-text)] md:text-3xl">{title}</h1>
      {description && <p className="text-lg text-[var(--q-text)] opacity-70">{description}</p>}
      {onRestart && (
        <button
          type="button"
          onClick={onRestart}
          className="mt-4 h-11 rounded bg-[var(--q-btn)] px-5 text-lg font-bold text-[var(--q-btn-text)] hover:opacity-90"
        >
          Restart
        </button>
      )}
    </motion.div>
  );
}
