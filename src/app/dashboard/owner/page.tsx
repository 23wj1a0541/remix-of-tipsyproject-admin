"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function OwnerDashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  const [staff, setStaff] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Forms
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [newRestaurantUpi, setNewRestaurantUpi] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");

  // Inline edit for selected restaurant
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editUpi, setEditUpi] = useState("");

  // Role guard
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login?role=owner");
      return;
    }
    const role = (session.user as { role?: string })?.role;
    if (role && role !== "owner") {
      const target = role === "worker" ? "/dashboard/worker" : role === "admin" ? "/admin" : "/";
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

  // Fetch restaurants (owner)
  useEffect(() => {
    const load = async () => {
      if (isPending) return;
      if (!session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/restaurants`, { headers: authHeaders });
        if (!res.ok) throw new Error(`Restaurants error ${res.status}`);
        const data = await res.json();
        setRestaurants(data);
        // Auto-select first restaurant
        if (data?.length) setSelectedRestaurantId((prev) => prev ?? data[0].id);
      } catch (e: any) {
        setError(e?.message || "Failed to load owner data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isPending, session?.user, authHeaders]);

  // When selected restaurant changes, seed edit fields
  useEffect(() => {
    if (!selectedRestaurantId) return;
    const r = restaurants.find((x) => x.id === selectedRestaurantId);
    if (r) {
      setEditName(r.name || "");
      setEditAddress(r.address || "");
      setEditUpi(r.upiHandle || "");
    }
  }, [selectedRestaurantId, restaurants]);

  // Fetch staff and reviews when restaurant changes
  useEffect(() => {
    const run = async () => {
      if (!selectedRestaurantId) return;
      try {
        // Staff
        const sRes = await fetch(`/api/staff?restaurantId=${selectedRestaurantId}`, { headers: authHeaders });
        if (!sRes.ok) throw new Error(`Staff error ${sRes.status}`);
        const sJson = await sRes.json();
        setStaff(sJson);
        // Reviews
        const rRes = await fetch(`/api/reviews?restaurantId=${selectedRestaurantId}`, { headers: authHeaders });
        if (!rRes.ok) throw new Error(`Reviews error ${rRes.status}`);
        const rJson = await rRes.json();
        setReviews(rJson);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load restaurant data");
      }
    };
    run();
  }, [selectedRestaurantId, authHeaders]);

  const handleModerate = async (reviewId: number, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ reviewId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to update review");
        return;
      }
      toast.success(`Review ${action}d`);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r)));
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    }
  };

  const handleUpdateRestaurant = async () => {
    if (!selectedRestaurantId) return;
    try {
      const res = await fetch(`/api/restaurants/${selectedRestaurantId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          name: editName.trim(),
          address: editAddress.trim() || null,
          upi_handle: editUpi.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to update restaurant");
        return;
      }
      toast.success("Restaurant updated");
      // sync local list
      setRestaurants((prev) => prev.map((r) => (r.id === json.id ? { ...r, name: json.name, address: json.address, upiHandle: json.upiHandle } : r)));
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurantId) return;
    try {
      const res = await fetch(`/api/restaurants/${selectedRestaurantId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to delete restaurant");
        return;
      }
      toast.success("Restaurant deleted");
      setRestaurants((prev) => prev.filter((r) => r.id !== selectedRestaurantId));
      setSelectedRestaurantId(null);
      setStaff([]);
      setReviews([]);
      setEditName("");
      setEditAddress("");
      setEditUpi("");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    }
  };

  const pendingReviews = useMemo(() => reviews.filter((r) => r.status === "pending").length, [reviews]);
  const staffCount = useMemo(() => staff.length, [staff]);

  if (isPending || !session?.user) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
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
      <p className="mt-1 text-muted-foreground">
        Welcome back{session.user.name ? ", " + session.user.name : ""}.
      </p>

      {/* Quick Analytics */}
      {!loading && !error && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Selected restaurant</div>
              <div className="text-sm font-medium truncate">
                {restaurants.find((r) => r.id === selectedRestaurantId)?.name || "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Staff</div>
              <div className="text-sm font-medium">{staffCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Pending reviews</div>
              <div className="text-sm font-medium">{pendingReviews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">UPI handle</div>
              <div className="text-sm font-medium truncate">
                {restaurants.find((r) => r.id === selectedRestaurantId)?.upiHandle || "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
        </div>
      )}

      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

      {!loading && !error && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Restaurants & Create */}
          <Card className="md:col-span-1">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-medium">Your Restaurants</h3>
                <p className="text-sm text-muted-foreground mt-1">Select to manage staff and reviews.</p>
                <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                  {restaurants.length === 0 && (
                    <p className="text-sm text-muted-foreground">No restaurants yet.</p>
                  )}
                  {restaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRestaurantId(r.id)}
                      className={`w-full text-left rounded border px-3 py-2 text-sm ${selectedRestaurantId === r.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      <div className="font-medium">{r.name}</div>
                      {r.address && <div className="text-xs opacity-80 truncate">{r.address}</div>}
                      {typeof r.staffCount !== "undefined" && (
                        <div className="text-xs opacity-60">{r.staffCount} staff</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <h4 className="font-medium">Create Restaurant</h4>
                <div className="mt-2 grid gap-2">
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="Name"
                    value={newRestaurantName}
                    onChange={(e) => setNewRestaurantName(e.target.value)}
                  />
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="Address (optional)"
                    value={newRestaurantAddress}
                    onChange={(e) => setNewRestaurantAddress(e.target.value)}
                  />
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="UPI Handle (optional)"
                    value={newRestaurantUpi}
                    onChange={(e) => setNewRestaurantUpi(e.target.value)}
                  />
                  <Button onClick={handleCreateRestaurant} className="h-9">Create</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Management */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Staff Management</h3>
                  <p className="text-sm text-muted-foreground mt-1">Invite, manage roles, and QR assignments.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Staff email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                  <Button onClick={handleInvite} className="h-9">Invite</Button>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-64 overflow-auto pr-1">
                {(!selectedRestaurantId || staff.length === 0) && (
                  <p className="text-sm text-muted-foreground">{selectedRestaurantId ? "No staff yet." : "Select a restaurant to view staff."}</p>
                )}
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm rounded border px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.user?.name || s.user?.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.user?.email}</div>
                      {s.qrSlug && (
                        <div className="text-xs text-muted-foreground truncate">QR: {s.qrSlug}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{s.roleInRestaurant}</span>
                      <Button variant="outline" className="h-8" onClick={() => handleRemoveStaff(s.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit Selected Restaurant */}
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <h3 className="font-medium">Restaurant Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">Update name, address, or UPI handle.</p>
              {!selectedRestaurantId && (
                <p className="text-sm text-muted-foreground mt-2">Select a restaurant to edit.</p>
              )}
              {selectedRestaurantId && (
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="Address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="UPI Handle"
                    value={editUpi}
                    onChange={(e) => setEditUpi(e.target.value)}
                  />
                  <div className="md:col-span-3 pt-2 flex items-center gap-2">
                    <Button onClick={handleUpdateRestaurant} className="h-9">Save Changes</Button>
                    <Button onClick={handleDeleteRestaurant} variant="outline" className="h-9">Delete Restaurant</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews Moderation */}
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <h3 className="font-medium">Review Management</h3>
              <p className="text-sm text-muted-foreground mt-1">Approve or reject customer reviews.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(!selectedRestaurantId || reviews.length === 0) && (
                  <p className="text-sm text-muted-foreground">{selectedRestaurantId ? "No reviews yet." : "Select a restaurant to view reviews."}</p>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.rating} ★</div>
                      <span className={`${r.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : r.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-secondary text-secondary-foreground"} text-xs px-2 py-0.5 rounded-full`}>{r.status}</span>
                    </div>
                    {r.comment && <div className="text-muted-foreground mt-1">{r.comment}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" className="h-8" variant="outline" onClick={() => handleModerate(r.id, "approve")} disabled={r.status === "approved"}>Approve</Button>
                      <Button size="sm" className="h-8" variant="outline" onClick={() => handleModerate(r.id, "reject")} disabled={r.status === "rejected"}>Reject</Button>
                    </div>
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