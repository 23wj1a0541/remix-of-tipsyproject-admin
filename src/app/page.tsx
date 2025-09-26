"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        aria-label="TIPSY - Digital tipping platform"
      >
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1800&auto=format&fit=crop)",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 to-background" />

        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm">
              TIPSY — Bridging appreciation in the digital age
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight">
              Digital tipping that empowers service workers and delights customers
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Personalized QR badges, instant UPI tips, intelligent reviews, and
              actionable analytics for restaurants. Built to scale like a startup,
              designed to feel human.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="h-12 px-6">
                <Link href="/login?role=worker">I serve customers (Worker)</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-12 px-6">
                <Link href="/login?role=owner">I run a restaurant (Owner)</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold">Direct digital tips</h3>
            <p className="mt-2 text-muted-foreground">
              Seamless UPI-powered tipping via unique QR codes for each worker. No
              middlemen, no friction.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold">Smart reviews</h3>
            <p className="mt-2 text-muted-foreground">
              Encourage quality service with fair, filterable reviews and
              moderation controls.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold">Actionable analytics</h3>
            <p className="mt-2 text-muted-foreground">
              Real-time insights for owners and workers—earnings, ratings,
              conversion and more.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Callouts */}
      <section className="container mx-auto px-6 pb-24 grid lg:grid-cols-2 gap-6">
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-8">
            <h3 className="text-2xl font-semibold">For Service Workers</h3>
            <p className="mt-2 text-muted-foreground">
              Own your earnings with a personal tipping profile, live
              notifications, and a beautiful QR badge.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href="/login?role=worker">Worker Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/worker">View Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-8">
            <h3 className="text-2xl font-semibold">For Restaurant Owners</h3>
            <p className="mt-2 text-muted-foreground">
              Manage staff, track performance, moderate reviews, and grow your
              brand reputation.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="secondary">
                <Link href="/login?role=owner">Owner Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/owner">View Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t">
        <div className="container mx-auto px-6 py-8 text-sm text-muted-foreground flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TIPSY. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/scan" className="hover:underline">
              Scan QR
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}