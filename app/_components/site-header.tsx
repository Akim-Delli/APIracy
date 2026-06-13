import Link from "next/link";

const NAV = [
  { label: "API Reference", href: "/docs", page: true },
  { label: "OpenAPI", href: "/api/openapi.json", page: false },
  { label: "Status", href: "/api/health", page: false },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-space-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-tr from-indigo-600 to-indigo-400 shadow-[0_0_20px_-4px_rgba(99,102,241,0.8)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
            </svg>
          </span>
          API<span className="text-indigo-400">racy</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-zinc-400 sm:gap-8">
          {NAV.map((item) =>
            item.page ? (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-zinc-100">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="transition-colors hover:text-zinc-100">
                {item.label}
              </a>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
