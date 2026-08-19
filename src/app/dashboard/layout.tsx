import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardHeader name={session.user.name} email={session.user.email} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
