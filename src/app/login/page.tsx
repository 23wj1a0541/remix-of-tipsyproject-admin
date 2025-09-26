"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

function RoleSelector({ onRoleChange }: { onRoleChange: (role: "worker" | "owner" | "admin") => void }) {
  const search = useSearchParams();
  const presetRole = (search.get("role") as "worker" | "owner" | "admin" | null) || "worker";

  useEffect(() => {
    onRoleChange(presetRole);
  }, [presetRole, onRoleChange]);

  return (
    <div className="mb-4 flex gap-2">
      <Button
        variant={presetRole === "worker" ? "default" : "outline"}
        onClick={() => onRoleChange("worker")}
        className="flex-1"
      >
        Worker
      </Button>
      <Button
        variant={presetRole === "owner" ? "default" : "outline"}
        onClick={() => onRoleChange("owner")}
        className="flex-1"
      >
        Owner
      </Button>
      <Button
        variant={presetRole === "admin" ? "default" : "outline"}
        onClick={() => onRoleChange("admin")}
        className="flex-1"
      >
        Admin
      </Button>
    </div>
  );
}

function LoginForm({ role, onEmailChange, onPasswordChange, onRememberChange, loading, onSubmit, email, password, rememberMe }: {
  role: "worker" | "owner" | "admin";
  onEmailChange: (e: string) => void;
  onPasswordChange: (e: string) => void;
  onRememberChange: (e: boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  email: string;
  password: string;
  rememberMe: boolean;
}) {
  const title = useMemo(() => {
    if (role === "worker") return "Worker Login";
    if (role === "owner") return "Restaurant Owner Login";
    return "Admin Login";
  }, [role]);

  return (
    <>
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs">TIPSY</span>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seamless, role-aware access. Choose your role and sign in.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder={role === "owner" ? "owner@restaurant.com" : role === "admin" ? "admin@tipsy.app" : "worker@restaurant.com"}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
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
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={rememberMe}
              onChange={(e) => onRememberChange(e.target.checked)}
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
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"worker" | "owner" | "admin">("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      const dest = role === "admin" ? "/admin" : role === "owner" ? "/dashboard/owner" : "/dashboard/worker";
      router.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending, role]);

  function handleRoleChange(newRole: "worker" | "owner" | "admin") {
    setRole(newRole);
  }

  async function handleSubmit(e: React.FormEvent) {
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
            <Suspense fallback={<div className="mb-4 flex gap-2"><div className="flex-1 h-10 bg-muted rounded-md animate-pulse" /><div className="flex-1 h-10 bg-muted rounded-md animate-pulse" /><div className="flex-1 h-10 bg-muted rounded-md animate-pulse" /></div>}>
              <RoleSelector onRoleChange={handleRoleChange} />
            </Suspense>
            <LoginForm 
              role={role}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onRememberChange={setRememberMe}
              loading={loading}
              onSubmit={handleSubmit}
              email={email}
              password={password}
              rememberMe={rememberMe}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-0px)] bg-[url('https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center">
        <div className="min-h-screen backdrop-brightness-75 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex gap-2">
                <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
                <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
                <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                </div>
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginPage />
    </Suspense>
  );
}