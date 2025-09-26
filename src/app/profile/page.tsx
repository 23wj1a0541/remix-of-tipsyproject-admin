"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [qrEntries, setQrEntries] = useState<Array<{ qrSlug: string; restaurantName: string }>>([]);

  // Guard: must be logged in
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) router.replace("/login");
  }, [isPending, session?.user, router]);

  const headers = useMemo(() => {
    if (typeof window === "undefined") return { "Content-Type": "application/json" } as HeadersInit;
    const token = localStorage.getItem("bearer_token");
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
  }, []);

  // Load current profile (and worker QR links if applicable)
  useEffect(() => {
    const load = async () => {
      if (isPending || !session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users/me", { headers });
        if (!res.ok) throw new Error(`Profile error ${res.status}`);
        const me = await res.json();
        setName(me?.name || "");
        setPhone(me?.phone || "");
        setAvatarUrl(me?.avatarUrl || "");
        setRole(me?.role || "");
        setUserId(me?.id ?? null);

        // If worker, load QR slugs via workers API
        if ((me?.role === "worker" || me?.role === "owner") && me?.id) {
          try {
            const w = await fetch(`/api/workers/${me.id}`);
            if (w.ok) {
              const worker = await w.json();
              const entries: Array<{ qrSlug: string; restaurantName: string }> = (worker.restaurants || [])
                .map((r: any) => ({ qrSlug: r.staff?.qrSlug, restaurantName: r.restaurant?.name }))
                .filter((e: any) => !!e.qrSlug);
              setQrEntries(entries);
            }
          } catch {}
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isPending, session?.user, headers]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name, phone: phone || null, avatar_url: avatarUrl || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to save profile");
        return;
      }
      // refresh local state from response
      setName(json?.name || name);
      setPhone(json?.phone || phone);
      setAvatarUrl(json?.avatarUrl || avatarUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => {
    const dest = role === "admin" ? "/admin" : role === "owner" ? "/dashboard/owner" : "/dashboard/worker";
    router.push(dest);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // silent success
    } catch {}
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (isPending || !session?.user) return null;

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <Button variant="secondary" className="h-9" onClick={goToDashboard}>Go to Dashboard</Button>
      </div>
      <p className="mt-1 text-muted-foreground">Manage your account information.</p>

      {loading && (
        <div className="mt-6 grid gap-4">
          <div className="h-9 bg-muted animate-pulse rounded" />
          <div className="h-9 bg-muted animate-pulse rounded" />
          <div className="h-9 bg-muted animate-pulse rounded" />
        </div>
      )}

      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

      {!loading && !error && (
        <Card className="mt-6">
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="text-sm font-medium break-all">{session.user.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Role</div>
              <div className="text-sm font-medium capitalize">{role || "worker"}</div>
            </div>

            <div>
              <label className="text-sm">Full name</label>
              <input
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-sm">Phone</label>
              <input
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91-98765-43210"
              />
            </div>
            <div>
              <label className="text-sm">Avatar URL</label>
              <input
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving} className="h-10">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>

            {/* Worker QR links */}
            {role === "worker" && qrEntries.length > 0 && (
              <div className="pt-4">
                <div className="text-sm font-medium">Your QR Links</div>
                <div className="mt-2 space-y-2">
                  {qrEntries.map((e, idx) => {
                    const url = `${origin}/t/${e.qrSlug}`;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{e.restaurantName}</div>
                          <div className="text-xs text-muted-foreground break-all">{url}</div>
                        </div>
                        <button className="text-xs h-8 px-2 rounded border" onClick={() => copyToClipboard(url)}>
                          Copy
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}