import { notFound } from "next/navigation";
import { ReportView } from "@/components/audit/report-view";
import { getSiteReport } from "@/lib/actions/sites";

export const metadata = { title: "Audit report" };

export default async function SiteReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getSiteReport(id);
  if (!site) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ReportView websiteId={id} initial={site} />
    </div>
  );
}
