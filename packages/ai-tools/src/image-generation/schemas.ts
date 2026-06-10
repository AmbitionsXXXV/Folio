import { z } from "zod"

export const ImageGenerationToolInputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Detailed description of the image to generate. Be specific about subjects, style, composition, lighting, colors, and mood."
    ),
  n: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("Number of images to generate (1-4, default 1)"),
  size: z
    .string()
    .optional()
    .describe(
      'Image dimensions as WxH (e.g. "1024x1024", "1792x1024"). Availability varies by provider.'
    ),
  aspectRatio: z
    .string()
    .optional()
    .describe(
      'Aspect ratio (e.g. "1:1", "16:9"). Used by providers that prefer ratio over explicit size.'
    )
})
