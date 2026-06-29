import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Image generation can take several minutes; don't let the HTTP server abort the
// request before the upstream AI timeout (AI_REQUEST_TIMEOUT_MS) has a chance.
server.requestTimeout = env.AI_REQUEST_TIMEOUT_MS + 30_000;
server.headersTimeout = server.requestTimeout;

const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
