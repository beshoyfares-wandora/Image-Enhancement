/** Typed access to the public (VITE_) environment variables. */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
} as const;
