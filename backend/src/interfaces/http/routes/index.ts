import { Router } from "express";
import type { EnhancementController } from "../controllers/EnhancementController.js";

/** Builds the API router, wiring routes to the injected controllers. */
export function createApiRouter(controllers: {
  enhancement: EnhancementController;
}): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.post("/enhance", controllers.enhancement.enhance);

  return router;
}
