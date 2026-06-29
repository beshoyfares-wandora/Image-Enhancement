interface SpinnerProps {
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
