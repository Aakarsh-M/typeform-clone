"use client";

// Top bar for one form: back link and Create / Connect / Share / Results tabs.
// Reads the URL, so it must render inside a <Suspense> boundary.

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const TABS = [
  { slug: "create", label: "Create" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
];

export function FormTopBar() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink">
        ← My workspace
      </Link>
      <nav className="flex gap-6 self-stretch">
        {TABS.map((tab) => {
          const href = `/forms/${id}/${tab.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`flex items-center border-b-2 text-sm ${
                active ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="w-28" />
    </header>
  );
}
