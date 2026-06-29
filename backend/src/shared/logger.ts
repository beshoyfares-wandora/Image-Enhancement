/* Minimal structured logger. Swap for pino/winston if richer logging is needed. */

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level.toUpperCase()}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, message, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, message);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};
