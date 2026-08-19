import Link from "next/link";
import {
  Aperture,
  ArrowRight,
  Gauge,
  Layers3,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-60" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Puppeteer crawl · RAG/LLM CRO engine · Copy-paste UI fixes
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
          See the conversion leaks your team keeps shipping.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Aperture crawls a live page, extracts DOM, CSS, and visual structure, then scores CRO
          heuristics with an LLM. You get a 0–100 report plus exact HTML/CSS replacements.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={session ? "/dashboard" : "/register"}>
              Audit a website
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">View sample workflow</Link>
          </Button>
        </div>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ScanSearch,
              title: "Headless crawl",
              body: "Puppeteer captures headings, CTAs, computed CSS, metadata, and a full-page screenshot.",
            },
            {
              icon: Gauge,
              title: "CRO score",
              body: "Typography, CTA placement, hierarchy, accessibility, and conversion flow are scored 0–100.",
            },
            {
              icon: Layers3,
              title: "Code replacements",
              body: "Each issue includes the current snippet and a ready-to-paste Tailwind/HTML optimization.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-2xl border p-6">
              <item.icon className="mb-4 h-5 w-5 text-primary" />
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 overflow-hidden rounded-3xl border bg-card">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12">
              <p className="text-sm font-medium text-primary">Report anatomy</p>
              <h2 className="mt-3 text-3xl font-semibold">A score you can ship against.</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li>Overall CRO score with Poor / Medium / Good banding</li>
                <li>Three executive takeaways for stakeholders</li>
                <li>5–10 selector-level suggestions with impact tags</li>
                <li>Screenshot overlay markers on problem areas</li>
              </ul>
            </div>
            <div className="border-t bg-secondary/40 p-8 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Aperture className="h-4 w-4 text-primary" />
                    checkout.example.com
                  </span>
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    71 · MEDIUM
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border p-3">
                    Typography
                    <p className="mt-1 text-2xl font-semibold">64</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    CTA Placement
                    <p className="mt-1 text-2xl font-semibold">58</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    Hierarchy
                    <p className="mt-1 text-2xl font-semibold">77</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    Conversion flow
                    <p className="mt-1 text-2xl font-semibold">69</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
