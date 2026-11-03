"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 3000;

/** Reloads the server-rendered check result while a check is still running. */
export function CheckPoller() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
