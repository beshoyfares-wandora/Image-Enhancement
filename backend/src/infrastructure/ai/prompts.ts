/**
 * Wraps the creative editing prompt with a directive that the image model must:
 *  - return a VISIBLY enhanced image (never echo back the original), and
 *  - keep only the product and the person/subject identical.
 *
 * The balance matters: an over-restrictive "do not change anything" instruction
 * makes models return the input untouched, while no instruction lets them
 * restyle the product. This pushes a strong scene/lighting transformation while
 * locking the product's identity.
 */
const FIDELITY_DIRECTIVE = `You are retouching a product photo into a premium e-commerce studio image. Return a NEW, dramatically enhanced image. Never return the original image unchanged or only slightly adjusted — the difference must be immediately obvious at a glance.

YOU MUST clearly and visibly apply ALL of these (a subtle tweak is not acceptable):
- COMPLETELY REPLACE the original background with the clean, premium studio backdrop described below. Do not keep, blur, or lightly edit the old background — remove it entirely and rebuild it.
- relight the scene with professional studio lighting: bright even key light, soft fill, rim/edge light, natural highlights, and realistic soft contact shadows grounding the subject.
- correct white balance and noticeably improve exposure, contrast, dynamic range, clarity and sharpness for a crisp, high-end catalog look.
- remove dust, lint, stray fibers, wrinkles and any distracting elements from the scene.

KEEP STRICTLY IDENTICAL — ONLY the product and the person/subject themselves:
- their exact shape, proportions, pose, body angle, face, skin and hair
- their colors, materials, textures and fabric folds
- all branding, logos, labels, printed text, embroidery and patterns
Do not redraw, restyle, beautify, reshape, recolor, add or remove the product or the person. Do NOT merely upscale or sharpen the original — transform the PRESENTATION (background, lighting, mood), never the product.

Apply this art direction:`;

/** Builds the final instruction passed to an image-editing model. */
export function buildEditInstruction(editingPrompt: string): string {
  return `${FIDELITY_DIRECTIVE}\n\n${editingPrompt}`;
}
