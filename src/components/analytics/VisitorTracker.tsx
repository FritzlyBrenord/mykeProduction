"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DEVICE_ID_STORAGE_KEY = "myke_device_id";

function getDeviceId() {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const queryString = searchParams?.toString() || "";
    const path = queryString ? `${pathname}?${queryString}` : pathname;

    void fetch("/api/visitors/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: getDeviceId(),
        path,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
