import type { NextFunction, Request, Response } from "express";
import type { ScrapeProductUseCase } from "../../../application/use-cases/ScrapeProductUseCase.js";
import { BadRequestError } from "../../../shared/errors/AppError.js";
import { scrapeProductSchema } from "../validation/product.schema.js";

export class ProductController {
  constructor(private readonly scrapeProduct: ScrapeProductUseCase) {}

  /** POST /api/product/scrape */
  scrape = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = scrapeProductSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError("Invalid request body", parsed.error.flatten());
      }

      const data = await this.scrapeProduct.execute(parsed.data.url);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}
