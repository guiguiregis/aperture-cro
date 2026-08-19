export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
      <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-secondary" />
        <div className="h-80 animate-pulse rounded-xl bg-secondary" />
        <div className="h-80 animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
