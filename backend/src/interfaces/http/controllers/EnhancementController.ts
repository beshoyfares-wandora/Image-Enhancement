import type { NextFunction, Request, Response } from "express";
import type { EnhanceImageUseCase } from "../../../application/use-cases/EnhanceImageUseCase.js";
import type { EnhancementOutcome } from "../../../domain/entities/Enhancement.js";
import type { ImageData } from "../../../domain/entities/Image.js";
import { imageToDataUrl } from "../../../domain/entities/Image.js";
import { BadRequestError } from "../../../shared/errors/AppError.js";
import { enhanceRequestSchema } from "../validation/enhancement.schema.js";

export class EnhancementController {
  constructor(private readonly enhanceImage: EnhanceImageUseCase) {}

  /** POST /api/enhance (multipart/form-data: image file + optional productUrl) */
  enhance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = enhanceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError("Invalid request body", parsed.error.flatten());
      }

      const file = req.file;
      if (!file || !file.buffer?.length) {
        throw new BadRequestError("image file is required");
      }
      if (!file.mimetype.startsWith("image/")) {
        throw new BadRequestError("uploaded file must be an image");
      }

      const original: ImageData = {
        base64: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      };
      const outcome = await this.enhanceImage.execute(original, parsed.data.url);

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
    productInfo: outcome.productInfo,
    productContent: outcome.productContent,
    marketingImages: outcome.marketingImages.map((generated) => ({
      prompt: generated.prompt,
      image: generated.image ? imageToDataUrl(generated.image) : null,
      error: generated.error,
    })),
  };
}
