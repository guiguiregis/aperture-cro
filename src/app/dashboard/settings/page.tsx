import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettingsProfile } from "@/lib/actions/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getSettingsProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto h-full max-w-3xl space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Profile, LLM keys, plan status, and destructive workspace actions.
        </p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
