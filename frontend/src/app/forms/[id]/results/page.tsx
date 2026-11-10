import { Suspense } from "react";

import { Results } from "@/components/results/Results";
import { PageSpinner } from "@/components/ui/Spinner";

export default function ResultsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Results />
    </Suspense>
  );
}
