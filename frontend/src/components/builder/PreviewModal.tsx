"use client";

// Full-screen test run of the form as respondents will see it. Nothing is stored.

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { FormRunner } from "@/components/respondent/FormRunner";
import type { FormDetail } from "@/lib/types";

export function PreviewModal({ form, open, onClose }: { form: FormDetail; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 p-0 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative h-full w-full overflow-hidden md:rounded-xl"
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 24 }}
            role="dialog"
            aria-label="Form preview"
          >
            <FormRunner
              contained
              mode="preview"
              title={form.title}
              questions={form.questions}
              settings={form.settings}
            />
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">Preview: responses aren&apos;t saved</span>
              <button
                onClick={onClose}
                aria-label="Close preview"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
