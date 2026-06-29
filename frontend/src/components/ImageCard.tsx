import { downloadDataUrl } from "../utils/file";
import { Spinner } from "./Spinner";

interface ImageCardProps {
  title: string;
  subtitle?: string;
  image: string | null;
  loading?: boolean;
  error?: string | null;
  downloadName?: string;
  accent?: "slate" | "indigo" | "emerald";
}

const accentRing: Record<NonNullable<ImageCardProps["accent"]>, string> = {
  slate: "ring-slate-700",
  indigo: "ring-indigo-500/40",
  emerald: "ring-emerald-500/40",
};

export function ImageCard({
  title,
  subtitle,
  image,
  loading,
  error,
  downloadName = "image.png",
  accent = "slate",
}: ImageCardProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl bg-slate-900/60 ring-1 ${accentRing[accent]}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {image ? (
          <button
            type="button"
            onClick={() => downloadDataUrl(image, downloadName)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Download
          </button>
        ) : null}
      </div>

      <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.08),_transparent_70%)] p-4">
        {loading ? (
          <Spinner label="Generating…" />
        ) : error ? (
          <p className="px-6 text-center text-sm text-rose-400">{error}</p>
        ) : image ? (
          <img
            src={image}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <p className="text-sm text-slate-500">No image yet</p>
        )}
      </div>
    </div>
  );
}
