"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TippingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // form state
  const [amount, setAmount] = useState<number>(2000); // ₹20.00 default (in cents)
  const [payerName, setPayerName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [submitting, setSubmitting] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const fullUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workers/by-slug/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(`Failed to load tipping profile (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [slug]);

  const preset = [1000, 2000, 5000, 10000]; // ₹10, ₹20, ₹50, ₹100

  // Build UPI deeplink based on selected amount and restaurant UPI handle
  const upiLink = useMemo(() => {
    const handle = data?.restaurant?.upiHandle as string | undefined;
    if (!handle) return null;
    const am = Math.max(1, Math.round(amount / 100));
    const pn = encodeURIComponent(data?.worker?.name || data?.restaurant?.name || "TIPSY");
    const tn = encodeURIComponent(message || `Tip for ${data?.worker?.name || "service"}`);
    return `upi://pay?pa=${encodeURIComponent(handle)}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
  }, [data, amount, message]);

  const copyToClipboard = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSubmit = async () => {
    if (!slug) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_slug: slug,
          amount_cents: amount,
          currency: "INR",
          payer_name: payerName || null,
          message: message || null,
          rating: rating ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Payment failed");
        return;
      }
      toast.success("Tip sent! Thank you for supporting great service.");
      // Simple success redirect to same page to refresh state
      router.replace(fullUrl);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripeCheckout = async () => {
    try {
      setStripeLoading(true);
      const res = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: amount, currency: "INR", metadata: { qr_slug: slug } }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to start checkout");
        return;
      }
      // Navigate to placeholder checkout URL
      window.location.href = json.checkoutUrl;
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setStripeLoading(false);
    }
  };

  // Submit only a review without sending a tip
  const handleReviewOnly = async () => {
    if (!slug) return;
    if (rating == null) {
      toast.error("Please select a rating to submit a review");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_slug: slug,
          rating,
          comment: message || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to submit review");
        return;
      }
      toast.success("Review submitted! Pending moderation.");
      // Refresh page data
      router.replace(fullUrl);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10 max-w-3xl">
        {loading && (
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-40 bg-muted animate-pulse rounded" />
          </div>
        )}

        {error && (
          <div className="text-destructive">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Tip {data.worker?.name || "your server"}</h1>
              {data.worker?.averageRating != null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Average rating: {data.worker.averageRating} ★
                </p>
              )}
            </div>

            <Card className="bg-card/60 backdrop-blur">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">Restaurant</div>
                <div className="font-medium">{data.restaurant?.name}</div>
                {data.restaurant?.address && (
                  <div className="text-sm text-muted-foreground">{data.restaurant.address}</div>
                )}
                {data.restaurant?.upiHandle && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm">UPI: {data.restaurant.upiHandle}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(data.restaurant.upiHandle as string, "UPI handle copied")}
                      className="text-xs h-7 px-2 rounded border"
                    >
                      Copy UPI
                    </button>
                    {upiLink && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiLink, "UPI deeplink copied")}
                        className="text-xs h-7 px-2 rounded border"
                      >
                        Copy UPI deeplink
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="text-sm font-medium">Select amount</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preset.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={amount === p ? "default" : "secondary"}
                        className="h-10 px-4"
                        onClick={() => setAmount(p)}
                      >
                        ₹{(p / 100).toFixed(0)}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={Math.round(amount / 100)}
                      onChange={(e) => {
                        const v = Math.max(1, parseInt(e.target.value || "0", 10));
                        setAmount(v * 100);
                      }}
                      className="w-40 h-10 rounded-md border bg-background px-3 text-sm"
                      placeholder="Custom (₹)"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm" htmlFor="payerName">Your name (optional)</label>
                    <input
                      id="payerName"
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      placeholder="e.g., Ananya"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm" htmlFor="message">Message (optional)</label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Leave a note of appreciation"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm">Rating (optional)</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(r)}
                          className={`h-9 w-9 rounded-full border text-sm ${rating === r ? "bg-primary text-primary-foreground" : "bg-background"}`}
                          aria-pressed={rating === r}
                        >
                          {r}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setRating(null)}
                        className="h-9 rounded-full border px-3 text-xs"
                      >
                        No rating
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button onClick={handleSubmit} disabled={submitting} className="h-11 px-6">
                    {submitting ? "Processing..." : `Send ₹${(amount / 100).toFixed(0)} tip`}
                  </Button>
                  {upiLink && (
                    <a
                      href={upiLink}
                      className="h-11 px-4 rounded-md border text-sm inline-flex items-center"
                    >
                      Open in UPI app
                    </a>
                  )}
                  {upiLink && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiLink, "UPI deeplink copied")}
                      className="h-11 px-4 rounded-md border text-sm"
                    >
                      Copy UPI deeplink
                    </button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-4"
                    onClick={handleStripeCheckout}
                    disabled={stripeLoading}
                  >
                    {stripeLoading ? "Starting..." : "Pay with card (demo)"}
                  </Button>
                  <button
                    type="button"
                    onClick={handleReviewOnly}
                    className="h-11 px-4 rounded-md border text-sm"
                  >
                    Review only
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Secure UPI payment placeholder. You will not be charged in this demo.
                </p>
              </CardContent>
            </Card>

            {Array.isArray(data.reviews) && data.reviews.length > 0 && (
              <div>
                <h2 className="text-lg font-medium">Recent reviews</h2>
                <div className="mt-3 grid gap-3">
                  {data.reviews.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium">{r.rating} ★</div>
                        {r.comment && (
                          <div className="text-sm text-muted-foreground mt-1">{r.comment}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}