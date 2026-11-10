import { Suspense } from "react";

import { FormTopBar } from "@/components/form-shell/FormTopBar";

// Shared shell for one form. The top bar reads the URL, so it sits in its own
// Suspense boundary and the rest of the layout can still be prerendered.
export default function FormLayout({ children }: LayoutProps<"/forms/[id]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-14 border-b border-line bg-surface" />}>
        <FormTopBar />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
