"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Unregister all old service workers first to clear stale cache
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        Promise.all(registrations.map((r) => r.unregister())).then(() => {
          // Re-register fresh
          navigator.serviceWorker.register("/service-worker.js").catch(() => {});
        });
      });
    }
  }, []);
  return null;
}
