/** Reads a File into a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Triggers a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Validates that a file is an image within the size limit. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please select an image file.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Image is too large (max 20 MB).";
  }
  return null;
}
