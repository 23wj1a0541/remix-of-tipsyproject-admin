"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const presetRole = (search.get("role") as "worker" | "owner" | "admin" | null) || "worker";
  const [role, setRole] = useState<"worker" | "owner" | "admin">(presetRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      // We don't have role in session yet; use the selected/preset role as hint
      const dest = role === "admin" ? "/admin" : role === "owner" ? "/dashboard/owner" : "/dashboard/worker";
      router.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending, role]);

  const title = useMemo(() => {
    if (role === "worker") return "Worker Login";
    if (role === "owner") return "Restaurant Owner Login";
    return "Admin Login";
  }, [role]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fallbackURL = role === "admin" ? "/admin" : role === "owner" ? "/dashboard/owner" : "/dashboard/worker";
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: fallbackURL,
      });
      if (error?.code) {
        toast.error("Invalid email or password. Please make sure you have an account.");
        return;
      }

      // After successful sign-in, fetch profile and store bearer token for API calls
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const me = await res.json();
          if (me?.authUserId) {
            localStorage.setItem("bearer_token", String(me.authUserId));
          }
          const actualRole = me?.role as "worker" | "owner" | "admin" | undefined;
          const dest = actualRole === "admin" ? "/admin" : actualRole === "owner" ? "/dashboard/owner" : "/dashboard/worker";
          router.replace(dest);
          return;
        }
      } catch {}

      // Fallback redirect if profile fetch fails
      router.push(fallbackURL);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-[url('https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center">
      <div className="min-h-screen backdrop-brightness-75 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border">
          <CardContent className="p-6">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs">TIPSY</span>
              <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Seamless, role-aware access. Choose your role and sign in.
              </p>
            </div>

            <div className="mb-4 flex gap-2">
              <Button
                variant={role === "worker" ? "default" : "outline"}
                onClick={() => setRole("worker")}
                className="flex-1"
              >
                Worker
              </Button>
              <Button
                variant={role === "owner" ? "default" : "outline"}
                onClick={() => setRole("owner")}
                className="flex-1"
              >
                Owner
              </Button>
              <Button
                variant={role === "admin" ? "default" : "outline"}
                onClick={() => setRole("admin")}
                className="flex-1"
              >
                Admin
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={role === "owner" ? "owner@restaurant.com" : role === "admin" ? "admin@tipsy.app" : "worker@restaurant.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="off"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link href="/register" className="text-sm underline hover:no-underline">Create account</Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-xs text-muted-foreground">
              <p>
                New here? Explore the platform from the home page.
                <Link href="/" className="ml-1 underline">Go Home</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}