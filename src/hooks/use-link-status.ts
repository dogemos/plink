"use client";

import { useEffect, useState } from "react";

export interface LinkStatus {
  status: "pending" | "paid" | "expired";
  txHash: string | null;
  txVerified: boolean;
  paidAt: string | null;
}

const POLL_INTERVAL_MS = 4000;

/**
 * Polls /api/links/[id]/status every 4 seconds until the link reaches
 * a terminal state (paid or expired). Returns null while loading.
 */
export function useLinkStatus(id: string | null): LinkStatus | null {
  const [data, setData] = useState<LinkStatus | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await fetch(`/api/links/${id}/status`);
          if (res.ok) {
            const status: LinkStatus = await res.json();
            if (active) setData(status);
            if (status.status !== "pending") break;
          }
        } catch {
          // Network error — keep polling
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [id]);

  return data;
}
