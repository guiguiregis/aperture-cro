"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  checkLlmKeys,
  deleteAccount,
  deleteAllSites,
  saveApiKeys,
  updateProfile,
} from "@/lib/actions/settings";

type KeyStatus = "ok" | "no_credit" | "invalid" | "error" | string | null;

type Profile = {
  email: string;
  name: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openaiKeyStatus: KeyStatus;
  anthropicKeyStatus: KeyStatus;
  llmStatusMessage: string | null;
  llmStatusUpdatedAt: Date | string | null;
  _count: { websites: number };
};

function statusBadge(status: KeyStatus) {
  if (status === "ok") return <Badge variant="good">Ready</Badge>;
  if (status === "no_credit") return <Badge variant="high">Out of credit</Badge>;
  if (status === "invalid") return <Badge variant="high">Invalid key</Badge>;
  if (status === "error") return <Badge variant="mid">Error</Badge>;
  return <Badge variant="secondary">Not checked</Badge>;
}

function KeyStatusNote({ status, provider }: { status: KeyStatus; provider: "openai" | "anthropic" }) {
  if (status === "no_credit") {
    const href =
      provider === "openai"
        ? "https://platform.openai.com/settings/organization/billing"
        : "https://console.anthropic.com/settings/billing";
    return (
      <p className="text-xs text-destructive">
        This key has no remaining credit.{" "}
        <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Add billing
        </a>{" "}
        or paste a new key.
      </p>
    );
  }
  if (status === "invalid") {
    return <p className="text-xs text-destructive">This key was rejected. Check for extra spaces or a revoked key.</p>;
  }
  if (status === "error") {
    return <p className="text-xs text-amber-300">Last request failed. Test the key again.</p>;
  }
  return null;
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const outOfCredit =
    profile.openaiKeyStatus === "no_credit" || profile.anthropicKeyStatus === "no_credit";

  async function onProfile(formData: FormData) {
    const result = await updateProfile(formData);
    if (result.error) toast.error(result.error);
    else toast.success("Profile updated.");
    router.refresh();
  }

  async function onKeys(formData: FormData) {
    await saveApiKeys(formData);
    toast.success("API keys saved. Test them to confirm credit.");
    router.refresh();
  }

  async function onCheckKeys() {
    setChecking(true);
    const result = await checkLlmKeys();
    setChecking(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    if (result.message) toast.error(result.message);
    else toast.success("Keys responded. Credit looks available.");
    router.refresh();
  }

  async function onDeleteSites() {
    await deleteAllSites();
    toast.success("All sites deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {outOfCredit || profile.llmStatusMessage ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">LLM key problem</p>
          <p className="mt-1 text-destructive/90">
            {profile.llmStatusMessage ??
              "An API key is out of credit. Audits will fall back to heuristics until you add billing or a new key."}
          </p>
        </div>
      ) : null}

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

      <Card className={outOfCredit ? "border-destructive/40" : undefined}>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Stored on your user record and used for LLM audits. Leave empty to fall back to server
            env keys, then heuristics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onKeys} className="grid max-w-xl gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="openaiApiKey">OpenAI API key</Label>
                {profile.openaiApiKey ? statusBadge(profile.openaiKeyStatus) : null}
              </div>
              <Input
                id="openaiApiKey"
                name="openaiApiKey"
                type="password"
                defaultValue={profile.openaiApiKey ?? ""}
                placeholder="sk-..."
                aria-invalid={profile.openaiKeyStatus === "no_credit" || profile.openaiKeyStatus === "invalid"}
              />
              <KeyStatusNote status={profile.openaiKeyStatus} provider="openai" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="anthropicApiKey">Anthropic API key</Label>
                {profile.anthropicApiKey ? statusBadge(profile.anthropicKeyStatus) : null}
              </div>
              <Input
                id="anthropicApiKey"
                name="anthropicApiKey"
                type="password"
                defaultValue={profile.anthropicApiKey ?? ""}
                placeholder="sk-ant-..."
                aria-invalid={
                  profile.anthropicKeyStatus === "no_credit" || profile.anthropicKeyStatus === "invalid"
                }
              />
              <KeyStatusNote status={profile.anthropicKeyStatus} provider="anthropic" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="w-fit">
                Save keys
              </Button>
              <Button type="button" variant="outline" disabled={checking} onClick={onCheckKeys}>
                {checking ? "Checking…" : "Test keys"}
              </Button>
            </div>
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
