"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Role guard
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login?role=admin");
      return;
    }
    const role = (session.user as { role?: string })?.role;
    if (role && role !== "admin") {
      const target = role === "owner" ? "/dashboard/owner" : role === "worker" ? "/dashboard/worker" : "/";
      router.replace(target);
    }
  }, [session, isPending, router]);

  const authHeaders = useMemo(() => {
    if (typeof window === "undefined") return { "Content-Type": "application/json" } as HeadersInit;
    const token = localStorage.getItem("bearer_token");
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
  }, []);

  // Feature toggles state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Array<{ id: number; key: string; name: string; description?: string | null; enabled: boolean; createdAt: number }>>([]);
  const [saving, setSaving] = useState(false);

  // Fetch features
  useEffect(() => {
    const run = async () => {
      if (isPending) return;
      if (!session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/feature-toggles", { headers: authHeaders });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Failed to load features (${res.status})`);
        setFeatures(json);
      } catch (e: any) {
        setError(e?.message || "Failed to load features");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isPending, session?.user, authHeaders]);

  // Save updates
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = features.map((f) => ({ key: f.key, name: f.name, description: f.description ?? null, enabled: f.enabled }));
      const res = await fetch("/api/feature-toggles", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to save toggles");
        return;
      }
      toast.success("Feature toggles updated");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (isPending || !session?.user) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8"
            onClick={() => router.push("/profile")}
          >
            Profile
          </Button>
          <Button
            variant="outline"
            className="h-8"
            onClick={async () => {
              const { error } = await authClient.signOut();
              if (!error?.code) {
                localStorage.removeItem("bearer_token");
                router.push("/");
              }
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted-foreground">Platform controls and insights</p>

      {loading && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-6"><div className="h-28 bg-muted animate-pulse rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-28 bg-muted animate-pulse rounded" /></CardContent></Card>
        </div>
      )}

      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

      {!loading && !error && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Feature Toggles */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Feature Toggles</h3>
                  <p className="text-sm text-muted-foreground mt-1">Enable/disable features across the platform.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="h-9">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              <div className="mt-4 divide-y rounded border">
                {features.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No features found.</div>
                )}
                {features.map((f, idx) => (
                  <div key={f.id ?? f.key ?? idx} className="p-4 grid gap-2 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-3">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground break-all">{f.key}</div>
                    </div>
                    <div className="md:col-span-6">
                      <input
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                        value={f.description ?? ""}
                        onChange={(e) => setFeatures((prev) => prev.map((x) => (x.key === f.key ? { ...x, description: e.target.value } : x)))}
                        placeholder="Description"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end gap-3">
                      <label className="text-sm">Enabled</label>
                      <input
                        type="checkbox"
                        checked={!!f.enabled}
                        onChange={(e) => setFeatures((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: e.target.checked } : x)))}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Placeholders for User Management / Analytics / CMS */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium">User Management</h3>
              <p className="text-sm text-muted-foreground mt-1">View, search, and manage users. (Coming soon)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium">Analytics Overview</h3>
              <p className="text-sm text-muted-foreground mt-1">High-level metrics across the platform. (Coming soon)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium">CMS</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage marketing pages and content. (Coming soon)</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}