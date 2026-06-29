interface PromptPanelProps {
  prompt: string;
  loading?: boolean;
}

export function PromptPanel({ prompt, loading }: PromptPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <h2 className="font-semibold text-slate-100">Claude's editing prompt</h2>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-700" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700" />
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {prompt}
        </p>
      )}
    </div>
  );
}
