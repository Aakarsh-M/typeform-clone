import { Suspense } from "react";

import { SharePanel } from "@/components/share/SharePanel";
import { PageSpinner } from "@/components/ui/Spinner";

export default function SharePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SharePanel />
    </Suspense>
  );
}
