"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<string>("");

  useEffect(() => {
    // Check for BarcodeDetector support
    // @ts-ignore - experimental API
    const ok = typeof window !== "undefined" && !!(window as any).BarcodeDetector;
    setSupported(ok);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let detector: any = null;

    const start = async () => {
      try {
        setError(null);
        // @ts-ignore - experimental API
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          try {
            if (videoRef.current && detector) {
              const detections = await detector.detect(videoRef.current);
              if (detections && detections.length) {
                const raw = detections[0].rawValue as string;
                handleDetected(raw);
                return; // stop after first
              }
            }
          } catch (_) {}
          raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch (e: any) {
        setError(e?.message || "Camera access failed");
        setScanning(false);
      }
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      raf = null;
      stream = null;
    };

    if (supported && scanning) start();
    return () => {
      stop();
    };
  }, [supported, scanning]);

  const handleDetected = (value: string) => {
    // Accept either full URL ending with /t/<slug> or just the slug itself
    try {
      let slug = value;
      if (value.startsWith("http")) {
        const u = new URL(value);
        const parts = u.pathname.split("/").filter(Boolean);
        const tIndex = parts.findIndex((p) => p === "t");
        if (tIndex >= 0 && parts[tIndex + 1]) slug = parts[tIndex + 1];
      }
      router.push(`/t/${encodeURIComponent(slug)}`);
    } catch {
      // fallback: treat as slug
      router.push(`/t/${encodeURIComponent(value)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <h1 className="text-2xl font-semibold">Scan QR to Tip</h1>
        <p className="text-sm text-muted-foreground mt-1">Use your camera to scan a Tipsy QR or enter the code manually.</p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Camera Scanner</div>
                  <div className="text-xs text-muted-foreground">Experimental — works on modern mobile browsers</div>
                </div>
                {supported && (
                  <Button size="sm" className="h-8" onClick={() => setScanning((s) => !s)}>
                    {scanning ? "Stop" : "Start"}
                  </Button>
                )}
              </div>

              {!supported && (
                <div className="text-sm text-muted-foreground">Your browser doesn't support inline QR scanning. Use manual entry.</div>
              )}

              <div className="aspect-video bg-black/80 rounded overflow-hidden">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="font-medium">Manual Entry</div>
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm w-full"
                placeholder="Enter QR slug (e.g., aisha-qr) or full URL"
              />
              <Button className="h-10" onClick={() => manual.trim() && handleDetected(manual.trim())}>Continue</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}