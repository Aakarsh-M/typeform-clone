import { Suspense } from "react";

import { Builder } from "@/components/builder/Builder";
import { PageSpinner } from "@/components/ui/Spinner";

export default function CreatePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Builder />
    </Suspense>
  );
}
