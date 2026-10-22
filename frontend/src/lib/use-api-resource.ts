"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

/** Keep visible records current without polling background tabs. */
export function useApiResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!path) { setData(null); setLoading(false); return; }
    try {
      const result = await apiClient.get<T>(path);
      if (request === generation.current) { setData(result); setError(null); }
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : "Records could not be loaded.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setLoading(Boolean(path));
    void refresh();
    const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(visibleRefresh, 60000);
    window.addEventListener("focus", visibleRefresh);
    window.addEventListener("academic-data-changed", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      generation.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      window.removeEventListener("academic-data-changed", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [refresh]);
  return { data, error, loading, refresh };
}
