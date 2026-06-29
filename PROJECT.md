# AI Ecommerce Image Enhancer

Goal:

Build a desktop web application.

The user uploads one product image.

The application should:

1. Display uploaded image.
2. Ask Claude Opus to generate an editing prompt.
3. Send:
   - original image
   - generated prompt

to both

- Gemini 3 Pro (Nano Banana)
- GPT Image 2

using Requesty APIs.

Display:

- Original
- Gemini result
- GPT Image result

Allow downloading each image.

No authentication.

Single user.

Everything runs locally.

Tech stack:

- React
- Vite
- TypeScript
- TailwindCSS
- Node.js backend