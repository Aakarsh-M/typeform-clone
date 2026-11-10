export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60 ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-ink-muted">
      <Spinner />
    </div>
  );
}
