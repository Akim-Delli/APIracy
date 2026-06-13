import Link from "next/link";
import { SpaceBackground } from "./_components/space-background";
import { SiteHeader } from "./_components/site-header";

export default function NotFound() {
  return (
    <>
      <SpaceBackground />
      <SiteHeader />
      <main className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <span className="font-display bg-linear-to-b from-white to-zinc-600 bg-clip-text text-7xl font-bold text-transparent sm:text-8xl">
          404
        </span>
        <h1 className="font-display mt-4 text-2xl font-semibold text-white">Lost in space</h1>
        <p className="mt-3 max-w-md text-zinc-400">
          This page drifted out of orbit. Head back to the playground or browse the API reference.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link href="/" className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
            Back home
          </Link>
          <Link href="/docs" className="btn-ghost rounded-lg border border-zinc-700/60 px-5 py-2.5 text-sm font-semibold text-zinc-200">
            API Reference
          </Link>
        </div>
      </main>
    </>
  );
}
