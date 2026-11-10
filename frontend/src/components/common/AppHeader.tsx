import Link from "next/link";

/** Product wordmark, deliberately generic rather than Typeform's own logo. */
export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Home">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-white">
        Tf
      </span>
      <span className="hidden sm:inline">Typeform Clone</span>
    </Link>
  );
}

export function Avatar() {
  return (
    <span
      title="Demo Creator"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3D2D73] text-xs font-semibold text-white"
    >
      DC
    </span>
  );
}

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5">
      <Wordmark />
      <Avatar />
    </header>
  );
}
