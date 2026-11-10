"use client";

import { useEffect, useRef } from "react";

/** True when the key event comes from a field where typing letters is text entry. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Window-level key handler that is only live while `enabled`.
 *
 * Input components register their own shortcuts (A/B/C, Y/N, 1-9) with this
 * and call preventDefault when they handle a key. The form runner registers
 * Enter/arrow navigation the same way and skips events already handled.
 * Child effects run before parent effects, so inputs always get first go.
 */
export function useHotkeys(enabled: boolean, handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      ref.current(e);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
