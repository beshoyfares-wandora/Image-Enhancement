import { useState } from "react";
import { ImageCard } from "./components/ImageCard";
import { PromptPanel } from "./components/PromptPanel";
import { UploadDropzone } from "./components/UploadDropzone";
import { useImageEnhancer } from "./hooks/useImageEnhancer";
import type { EnhancementProvider } from "./types/enhancement";

// Display labels per result slot. The subtitle under each card always shows the
// exact model id returned by the backend, so these are just friendly headings.
const PROVIDER_META: Record<
  EnhancementProvider,
  { label: string; accent: "indigo" | "emerald" }
> = {
  gemini: { label: "Gemini 3 Pro", accent: "indigo" },
  "gpt-image": { label: "GPT Image 2", accent: "emerald" },
};

export default function App() {
  const [original, setOriginal] = useState<string | null>(null);
  const { status, result, error, run, reset } = useImageEnhancer();

  const isLoading = status === "loading";

  const handleImageSelected = (dataUrl: string) => {
    setOriginal(dataUrl);
    void run(dataUrl);
  };

  const handleReset = () => {
    setOriginal(null);
    reset();
  };

  const findResult = (provider: EnhancementProvider) =>
    result?.results.find((r) => r.provider === provider) ?? null;

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-4xl font-bold text-transparent">
            AI Ecommerce Image Enhancer
          </h1>
          <p className="mt-3 text-slate-400">
            Upload a product photo. Claude writes the editing prompt, then Gemini and
            GPT Image generate enhanced versions side by side.
          </p>
        </header>

        {!original ? (
          <div className="mx-auto max-w-2xl">
            <UploadDropzone onImageSelected={handleImageSelected} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Results</h2>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Start over
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            {(isLoading || result) && (
              <PromptPanel prompt={result?.prompt ?? ""} loading={isLoading} />
            )}

            <div className="grid gap-6 md:grid-cols-3">
              <ImageCard
                title="Original"
                subtitle="Your upload"
                image={original}
                downloadName="original.png"
                accent="slate"
              />

              {(Object.keys(PROVIDER_META) as EnhancementProvider[]).map((provider) => {
                const meta = PROVIDER_META[provider];
                const providerResult = findResult(provider);
                return (
                  <ImageCard
                    key={provider}
                    title={meta.label}
                    subtitle={providerResult?.model}
                    image={providerResult?.image ?? null}
                    loading={isLoading}
                    error={providerResult?.error ?? null}
                    downloadName={`${provider}.png`}
                    accent={meta.accent}
                  />
                );
              })}
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-slate-600">
          Runs locally · No authentication · Powered by Requesty
        </footer>
      </div>
    </div>
  );
}
