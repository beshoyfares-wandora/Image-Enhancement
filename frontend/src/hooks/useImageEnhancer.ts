import { useCallback, useRef, useState } from "react";
import { enhanceImage } from "../services/enhancementApi";
import type { EnhanceResponse } from "../types/enhancement";

type Status = "idle" | "loading" | "success" | "error";

interface UseImageEnhancer {
  status: Status;
  result: EnhanceResponse | null;
  error: string | null;
  run: (imageDataUrl: string, productUrl?: string) => Promise<void>;
  reset: () => void;
}

/** Encapsulates the enhance request lifecycle and cancellation. */
export function useImageEnhancer(): UseImageEnhancer {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<EnhanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (imageDataUrl: string, productUrl = "") => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const response = await enhanceImage(imageDataUrl, productUrl, controller.signal);
      setResult(response);
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, run, reset };
}
