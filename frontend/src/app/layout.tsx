import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Typeform Clone",
  description: "Build conversational forms, one question at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-center" toastOptions={{ className: "!rounded-lg" }} />
      </body>
    </html>
  );
}
