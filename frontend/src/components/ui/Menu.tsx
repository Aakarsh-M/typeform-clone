"use client";

// Small popover menu (the "..." menus on forms and questions).

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}

export function Menu({ trigger, items, align = "right" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {/* No exit animation: a menu must disappear the instant an item is chosen. */}
      {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-40 mt-1 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {items.map((item) => (
              <li key={item.label}>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-hover ${
                    item.danger ? "text-danger" : ""
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </motion.ul>
      )}
    </div>
  );
}
