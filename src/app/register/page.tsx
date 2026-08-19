import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
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
            Register sites. Launch crawls. Ship the highest-leverage UI changes.
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Free plan includes 5 websites.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 lg:hidden">
              <BrandMark />
            </div>
            <CardTitle>Create your workspace</CardTitle>
            <CardDescription>Email and password, or Google if configured.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RegisterForm googleEnabled={googleEnabled} />
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
