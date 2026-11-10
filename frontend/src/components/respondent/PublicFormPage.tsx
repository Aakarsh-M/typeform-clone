"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { api, ApiError } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

import { FormRunner } from "./FormRunner";

export function PublicFormPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<{ closed: boolean; message: string } | null>(null);

  useEffect(() => {
    api
      .getPublicForm(publicId)
      .then((f) => {
        setForm(f);
        document.title = f.title;
      })
      .catch((err) =>
        setError({
          closed: err instanceof ApiError && err.status === 404,
          message: err instanceof Error ? err.message : "Something went wrong",
        }),
      );
  }, [publicId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <h1 className="text-2xl">{error.closed ? "This typeform is now closed" : "Something went wrong"}</h1>
        <p className="max-w-md text-ink-muted">
          {error.closed
            ? "It may have been unpublished or the link is incorrect."
            : "We couldn't load this form. Please refresh the page."}
        </p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#0445AF]">
        <Spinner />
      </div>
    );
  }

  return (
    <FormRunner
      title={form.title}
      questions={form.questions}
      settings={form.settings}
      mode="live"
      publicId={form.public_id}
    />
  );
}
