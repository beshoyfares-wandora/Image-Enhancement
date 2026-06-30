import { Router } from "express";
import multer from "multer";
import type { EnhancementController } from "../controllers/EnhancementController.js";
import type { ProductController } from "../controllers/ProductController.js";

// Images arrive as multipart/form-data; keep them in memory and cap the size.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

/** Builds the API router, wiring routes to the injected controllers. */
export function createApiRouter(controllers: {
  enhancement: EnhancementController;
  product: ProductController;
}): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.post("/enhance", upload.single("image"), controllers.enhancement.enhance);
  router.post("/product/scrape", controllers.product.scrape);

  return router;
}
