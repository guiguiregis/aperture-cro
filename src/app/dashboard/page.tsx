import { UrlForm } from "@/components/dashboard/url-form";
import { WebsiteGrid } from "@/components/dashboard/website-grid";
import { getDashboardWebsites } from "@/lib/actions/sites";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const websites = await getDashboardWebsites();

  return (
    <div className="mx-auto h-full max-w-7xl space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Website audits</h1>
        <p className="mt-2 text-muted-foreground">
          Enter a URL to crawl the live DOM and generate a CRO, SEO, and page-speed report.
        </p>
      </div>
      <UrlForm />
      <WebsiteGrid initial={websites} />
    </div>
  );
}
