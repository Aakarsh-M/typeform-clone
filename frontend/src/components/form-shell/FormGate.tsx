"use client";

// Renders its children only once the form for the current URL is in the
// store; shows a spinner while loading and a message if it doesn't exist.

import Link from "next/link";
import { useParams } from "next/navigation";

import { PageSpinner } from "@/components/ui/Spinner";
import { useFormStore } from "@/lib/formStore";
import type { FormDetail } from "@/lib/types";

export function FormGate({ children }: { children: (form: FormDetail) => React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const form = useFormStore((s) => s.form);
  const loadError = useFormStore((s) => s.loadError);

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
        <h2 className="text-xl font-medium">We couldn&apos;t open this form</h2>
        <p className="text-ink-muted">{loadError}</p>
        <Link href="/" className="text-sm underline">
          Back to My workspace
        </Link>
      </div>
    );
  }
  if (!form || form.id !== Number(id)) return <PageSpinner />;
  return <>{children(form)}</>;
}
