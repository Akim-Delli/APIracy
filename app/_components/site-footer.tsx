import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-space-950/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
        <p>
          API<span className="text-indigo-400">racy</span> — cached in Supabase, deployed on Vercel.
        </p>
        <div className="flex gap-6">
          <Link href="/docs" className="transition-colors hover:text-zinc-300">API Reference</Link>
          <a href="/api/openapi.json" className="transition-colors hover:text-zinc-300">OpenAPI</a>
          <a href="/api/health" className="transition-colors hover:text-zinc-300">Status</a>
        </div>
      </div>
    </footer>
  );
}
