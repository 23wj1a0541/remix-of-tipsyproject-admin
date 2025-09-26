"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function WorkerDashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tips, setTips] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [qrEntries, setQrEntries] = useState<Array<{ qrSlug: string; restaurantName: string }>>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Role guard
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login?role=worker");
      return;
    }
    const role = (session.user as { role?: string })?.role;
    if (role && role !== "worker") {
      const target = role === "owner" ? "/dashboard/owner" : role === "admin" ? "/admin" : "/";
      router.replace(target);
    }
  }, [session, isPending, router]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  // Performance summaries
  const avgRating = useMemo(() => {
    if (!reviews?.length) return null;
    const approved = reviews.filter((r) => r.status ? r.status === "approved" : true);
    if (!approved.length) return null;
    const sum = approved.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return Math.round((sum / approved.length) * 10) / 10;
  }, [reviews]);

  const earnings30d = useMemo(() => {
    if (!tips?.length) return 0;
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    const recent = tips.filter((t) => {
      const ts = new Date(t.createdAt).getTime();
      return now - ts <= days30;
    });
    const cents = recent.reduce((acc, t) => acc + (Number(t.amountCents) || 0), 0);
    return cents;
  }, [tips]);

  // helper: download QR as PNG
  const handleDownloadQR = (url: string, filename: string) => {
    try {
      // Find the nearest SVG for this URL by data-url attribute
      // Fallback: build a fresh SVG string from value
      const size = 256;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
        <rect width='100%' height='100%' fill='white'/>
        <foreignObject x='0' y='0' width='${size}' height='${size}'>
          <div xmlns='http://www.w3.org/1999/xhtml' style='display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px'>
            ${document.querySelector(`[data-qr='${url}']`)?.outerHTML || ''}
          </div>
        </foreignObject>
      </svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const urlCreator = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(pngBlob);
            a.download = `${filename}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
          }, "image/png");
        }
        URL.revokeObjectURL(urlCreator);
      };
      img.onerror = () => URL.revokeObjectURL(urlCreator);
      img.src = urlCreator;
    } catch {}
  };

  // Fetch data when authenticated
  useEffect(() => {
    const run = async () => {
      if (isPending) return;
      if (!session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
        const headers: HeadersInit = token
          ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json" };

        // 1) Profile (also contains role, id, derived stats)
        const meRes = await fetch("/api/users/me", { headers });
        if (!meRes.ok) throw new Error(`Profile error ${meRes.status}`);
        const me = await meRes.json();
        setProfile(me);

        // 2) Worker restaurants + QR slugs
        const workerRes = await fetch(`/api/workers/${me.id}`);
        if (!workerRes.ok) throw new Error(`Worker info error ${workerRes.status}`);
        const worker = await workerRes.json();
        const entries: Array<{ qrSlug: string; restaurantName: string }> = (worker.restaurants || []).map((r: any) => ({
          qrSlug: r.staff?.qrSlug,
          restaurantName: r.restaurant?.name,
        })).filter((e: any) => !!e.qrSlug);
        setQrEntries(entries);

        // 3) Tips
        const tipsRes = await fetch("/api/tips?limit=10", { headers });
        if (!tipsRes.ok) throw new Error(`Tips error ${tipsRes.status}`);
        const tipsJson = await tipsRes.json();
        setTips(tipsJson);

        // 3.5) Reviews (worker sees own)
        const revRes = await fetch("/api/reviews?limit=10", { headers });
        if (!revRes.ok) throw new Error(`Reviews error ${revRes.status}`);
        const revJson = await revRes.json();
        setReviews(revJson);

        // 4) Notifications
        const notiRes = await fetch("/api/notifications?limit=10", { headers });
        if (!notiRes.ok) throw new Error(`Notifications error ${notiRes.status}`);
        const notiJson = await notiRes.json();
        setNotifications(notiJson);
        const unread = notiRes.headers.get("X-Unread-Count");
        setUnreadCount(unread ? parseInt(unread) || 0 : 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isPending, session?.user]);

  // Mark notification as read
  const handleMarkRead = async (id: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const headers: HeadersInit = token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST", headers });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  if (isPending || !session?.user) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Worker Dashboard</h1>
        <div className="flex items-center gap-2">
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
          <Button
            variant="secondary"
            className="h-8"
            onClick={() => router.push("/profile")}
          >
            Profile
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted-foreground">
        Welcome back{session.user.name ? ", " + session.user.name : ""}.
      </p>

      {loading && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* QR Code */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium">Your QR Codes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Share this QR with customers to tip and leave a review.
              </p>
              <div className="mt-4 space-y-6">
                {qrEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground">No QR assigned yet. Ask your owner to add you as staff.</p>
                )}
                {qrEntries.map((e, idx) => {
                  const url = `${origin}/t/${e.qrSlug}`; // future public tipping page
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded">
                        <div data-qr={url}>
                          <QRCode value={url} size={96} fgColor="#111" bgColor="#fff" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{e.restaurantName}</div>
                        <div className="text-xs text-muted-foreground break-all">{url}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadQR(url, e.qrSlug)}
                        className="text-xs h-8 px-2 rounded border"
                      >
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium">Earnings</h3>
              <p className="text-sm text-muted-foreground mt-1">Track your daily and monthly tips.</p>
              <div className="mt-4 space-y-1">
                <div className="text-3xl font-semibold">
                  ₹{(((profile?.total_earnings_cents as number) || 0) / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total tips • {profile?.tips_count ?? 0} received
                </div>
              </div>
              {/* Quick performance summary */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Last 30 days</div>
                  <div className="text-sm font-medium">₹{(earnings30d / 100).toFixed(0)}</div>
                </div>
                <div className="rounded border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Avg rating</div>
                  <div className="text-sm font-medium">{avgRating != null ? `${avgRating} ★` : "—"}</div>
                </div>
              </div>
              <div className="mt-6 space-y-3 max-h-60 overflow-auto pr-1">
                {tips.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tips yet.</p>
                )}
                {tips.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="truncate">
                      <div className="font-medium">₹{(t.amountCents / 100).toFixed(0)} {t.restaurant?.name ? `• ${t.restaurant.name}` : ""}</div>
                      {t.message && <div className="text-muted-foreground truncate">{t.message}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Notifications</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {unreadCount} unread
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">New tips and reviews appear here.</p>
              <div className="mt-4 space-y-3 max-h-60 overflow-auto pr-1">
                {notifications.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{n.title}</div>
                        <div className="text-muted-foreground text-xs">{n.body}</div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-xs h-7 px-2 rounded border"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <h3 className="font-medium">Recent Reviews</h3>
              <p className="text-sm text-muted-foreground mt-1">What customers are saying about your service.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {reviews.length === 0 && (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.rating} ★</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    {r.comment && <div className="text-muted-foreground mt-1">{r.comment}</div>}
                    {r.restaurant?.name && (
                      <div className="text-xs text-muted-foreground mt-1">{r.restaurant.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}