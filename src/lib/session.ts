"use client";

import { useEffect, useState, useCallback } from "react";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "worker" | "owner" | "admin";
  avatarUrl?: string | null;
  restaurantId?: number | null;
};

export type Session = {
  user: SessionUser | null;
  token: string | null;
};

const TOKEN_KEY = "bearer_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function useSession() {
  const [session, setSession] = useState<Session>({ user: null, token: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setSession({ user: null, token: null });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Profile load failed: ${res.status}`);
      const data = await res.json();
      setSession({ user: data as SessionUser, token });
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setSession({ user: null, token: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { ...session, loading, error, refresh: fetchProfile };
}

export async function signOut() {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}