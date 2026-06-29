import { useCallback, useRef, useState } from "react";
import { fileToDataUrl, validateImageFile } from "../utils/file";

interface UploadDropzoneProps {
  onImageSelected: (dataUrl: string) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onImageSelected, disabled }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      const dataUrl = await fileToDataUrl(file);
      onImageSelected(dataUrl);
    },
    [onImageSelected]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [disabled, handleFile]
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition",
          isDragging
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60",
          disabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <div className="rounded-full bg-indigo-500/15 p-3 text-2xl">🖼️</div>
        <div>
          <p className="font-medium text-slate-100">
            Drop a product image here, or click to browse
          </p>
          <p className="mt-1 text-sm text-slate-400">PNG, JPG or WEBP up to 20 MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
