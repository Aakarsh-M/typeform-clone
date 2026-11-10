import { Lock } from "lucide-react";

// Placeholder required by the assignment: integrations and webhooks.
const INTEGRATIONS = [
  { name: "Google Sheets", blurb: "Send each response to a new row", color: "#CDEBDD" },
  { name: "Slack", blurb: "Post new responses to a channel", color: "#D9CBF0" },
  { name: "Webhooks", blurb: "POST responses to your own endpoint", color: "#C9DDF5" },
  { name: "HubSpot", blurb: "Create contacts from responses", color: "#FBE3B2" },
  { name: "Zapier", blurb: "Connect to thousands of apps", color: "#F3C6D2" },
  { name: "Notion", blurb: "Add responses to a database", color: "#E3E0D6" },
];

export default function ConnectPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="text-xl font-medium">Connect</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Integrations are coming soon. Until then, download your responses as CSV from Results.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
            <span
              style={{ background: i.color }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold"
            >
              {i.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium">
                {i.name} <Lock size={12} className="text-ink-muted" />
              </p>
              <p className="text-sm text-ink-muted">{i.blurb}</p>
              <p className="mt-2 text-xs font-medium text-ink-muted">Coming soon</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
