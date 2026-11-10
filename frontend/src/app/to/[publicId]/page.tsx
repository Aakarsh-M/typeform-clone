import { Suspense } from "react";

import { PublicFormPage } from "@/components/respondent/PublicFormPage";

// Public, no-login respondent experience: /to/<public_id>
export default function RespondentPage() {
  return (
    <Suspense>
      <PublicFormPage />
    </Suspense>
  );
}
