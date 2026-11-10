export function ComingSoon({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <h2 className="text-xl font-medium">{title}</h2>
      <p className="max-w-sm text-ink-muted">{children ?? "Coming soon."}</p>
    </div>
  );
}
