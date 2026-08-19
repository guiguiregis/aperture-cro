import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r bg-card p-10 lg:flex">
        <BrandMark />
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">
            Audit live pages the way a CRO lead would.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Crawl, score, and ship UI fixes without waiting on a research sprint.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Demo: demo@aperture.dev / demo1234</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 lg:hidden">
              <BrandMark />
            </div>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to manage websites and launch audits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm googleEnabled={googleEnabled} />
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
