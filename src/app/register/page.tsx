"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const search = useSearchParams();
  const presetRole = (search.get("role") as "worker" | "owner" | null) || "worker";
  const [role, setRole] = useState<"worker" | "owner">(presetRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (role === "owner" ? "Create Owner Account" : "Create Worker Account"), [role]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email,
        name,
        password,
      });

      if (error?.code) {
        const map: Record<string, string> = {
          USER_ALREADY_EXISTS: "Email already registered",
        };
        toast.error(map[error.code] || "Registration failed");
        return;
      }

      toast.success("Account created! Please log in.");
      // Preserve intended role in query for tailored login experience
      router.push(`/login?registered=true&role=${role}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] bg-[url('https://images.unsplash.com/photo-1521017432531-fbd92d1cf06e?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center">
      <div className="min-h-screen backdrop-brightness-75 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border">
          <CardContent className="p-6">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs">TIPSY</span>
              <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Join TIPSY to enable digital tipping and transparent appreciation.
              </p>
            </div>

            <div className="mb-4 flex gap-2">
              <Button
                variant={role === "worker" ? "default" : "outline"}
                onClick={() => setRole("worker")}
                className="flex-1"
              >
                I am a Worker
              </Button>
              <Button
                variant={role === "owner" ? "default" : "outline"}
                onClick={() => setRole("owner")}
                className="flex-1"
              >
                I am an Owner
              </Button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" placeholder="Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder={role === "owner" ? "owner@restaurant.com" : "worker@restaurant.com"} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="off" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" autoComplete="off" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-xs text-muted-foreground">
              <p>
                Already have an account?
                <Link href={`/login?role=${role}`} className="ml-1 underline">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}