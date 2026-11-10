"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { copyToClipboard } from "@/lib/format";

/** Read-only public link with a copy button. */
export function ShareLink({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);
  // window.location only exists in the browser; the server renders a relative link.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = `${origin}/to/${publicId}`;

  const copy = async () => {
    if (await copyToClipboard(url)) {
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy, select the link and copy it manually");
    }
  };

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        aria-label="Public link"
        onFocus={(e) => e.target.select()}
        className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm"
      />
      <Button onClick={copy} className="w-28">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
