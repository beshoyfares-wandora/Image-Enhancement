import cors from "cors";
import express, { type Application } from "express";
import { env } from "./config/env.js";
import { buildContainer } from "./composition/container.js";
import { errorHandler, notFoundHandler } from "./interfaces/http/middlewares/errorHandler.js";
import { createApiRouter } from "./interfaces/http/routes/index.js";

/** Creates and configures the Express application. */
export function createApp(): Application {
  const app = express();
  const { controllers } = buildContainer();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    })
  );
  app.use(express.json({ limit: env.MAX_UPLOAD_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: env.MAX_UPLOAD_SIZE }));

  app.use("/api", createApiRouter(controllers));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
