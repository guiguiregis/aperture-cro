"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  deleteAccount,
  deleteAllSites,
  saveApiKeys,
  updateProfile,
} from "@/lib/actions/settings";

type Profile = {
  email: string;
  name: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  _count: { websites: number };
};

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function onProfile(formData: FormData) {
    const result = await updateProfile(formData);
    if (result.error) toast.error(result.error);
    else toast.success("Profile updated.");
    router.refresh();
  }

  async function onKeys(formData: FormData) {
    await saveApiKeys(formData);
    toast.success("API keys saved.");
    router.refresh();
  }

  async function onDeleteSites() {
    await deleteAllSites();
    toast.success("All sites deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage how Aperture identifies your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onProfile} className="grid max-w-xl gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
            </div>
            <Button type="submit" className="w-fit">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Stored on your user record and used for LLM audits. Leave empty to fall back to server env keys, then heuristics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onKeys} className="grid max-w-xl gap-4">
            <div className="space-y-2">
              <Label htmlFor="openaiApiKey">OpenAI API key</Label>
              <Input
                id="openaiApiKey"
                name="openaiApiKey"
                type="password"
                defaultValue={profile.openaiApiKey ?? ""}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropicApiKey">Anthropic API key</Label>
              <Input
                id="anthropicApiKey"
                name="anthropicApiKey"
                type="password"
                defaultValue={profile.anthropicApiKey ?? ""}
                placeholder="sk-ant-..."
              />
            </div>
            <Button type="submit" className="w-fit">
              Save keys
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current workspace entitlements.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Badge>{profile.plan}</Badge>
          <p className="text-sm text-muted-foreground">
            {profile._count.websites} registered site{profile._count.websites === 1 ? "" : "s"}
            {profile.plan === "FREE" ? " · Free includes 5 sites" : " · Unlimited sites"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Bulk delete and account removal cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete all sites</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete every site?</AlertDialogTitle>
                <AlertDialogDescription>
                  All crawl captures and audit reports will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteSites}>Delete sites</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your profile, sites, and reports.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAccount()}>
                  Delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
