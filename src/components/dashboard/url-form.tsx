"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWebsiteAndAnalyze } from "@/lib/actions/sites";

export function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await createWebsiteAndAnalyze(url);
    setPending(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Crawl started. Building the CRO report...");
    if (result.id) {
      router.push(`/dashboard/sites/${result.id}`);
    }
    router.refresh();
    setUrl("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <ScanSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://your-landing-page.com"
          className="h-11 pl-9"
          required
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="sm:w-auto">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Launch analysis
      </Button>
    </form>
  );
}
