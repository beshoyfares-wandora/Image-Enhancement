import type { NextFunction, Request, Response } from "express";
import type { EnhanceImageUseCase } from "../../../application/use-cases/EnhanceImageUseCase.js";
import type { EnhancementOutcome } from "../../../domain/entities/Enhancement.js";
import { dataUrlToImage, imageToDataUrl } from "../../../domain/entities/Image.js";
import { BadRequestError } from "../../../shared/errors/AppError.js";
import { enhanceRequestSchema } from "../validation/enhancement.schema.js";

export class EnhancementController {
  constructor(private readonly enhanceImage: EnhanceImageUseCase) {}

  /** POST /api/enhance */
  enhance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = enhanceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError("Invalid request body", parsed.error.flatten());
      }

      const original = dataUrlToImage(parsed.data.image);
      const outcome = await this.enhanceImage.execute(original);

      res.status(200).json(toResponse(outcome));
    } catch (error) {
      next(error);
    }
  };
}

function toResponse(outcome: EnhancementOutcome) {
  return {
    prompt: outcome.prompt,
    results: outcome.results.map((result) => ({
      provider: result.provider,
      model: result.model,
      image: result.image ? imageToDataUrl(result.image) : null,
      error: result.error,
    })),
  };
}
