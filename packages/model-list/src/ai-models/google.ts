import type { ModelParamsSchema } from "../standard-parameters"
import type { AIChatModelCard, AIImageModelCard } from "../types"

/**
 * gemini implicit caching not extra cost
 * https://openrouter.ai/docs/features/prompt-caching#implicit-caching
 */

const googleChatModels: AIChatModelCard[] = [
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      structuredOutput: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description: "Latest release of Gemini Pro",
    displayName: "Gemini Pro Latest",
    id: "gemini-pro-latest",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          strategy: "tiered",
          tiers: [
            { rate: 0.31, upTo: 200_000 },
            { rate: 0.625, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 1.25, upTo: 200_000 },
            { rate: 2.5, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 10, upTo: 200_000 },
            { rate: 15, upTo: "infinity" }
          ],
          unit: "millionTokens"
        }
      ]
    },
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description: "Latest release of Gemini Flash",
    displayName: "Gemini Flash Latest",
    id: "gemini-flash-latest",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.075,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.3,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 2.5,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description: "Latest release of Gemini Flash-Lite",
    displayName: "Gemini Flash-Lite Latest",
    id: "gemini-flash-lite-latest",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.025,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 3 Pro is Google’s most powerful agent and vibe-coding model, delivering richer visuals and deeper interaction on top of state-of-the-art reasoning.",
    displayName: "Gemini 3 Pro Preview",
    enabled: true,
    id: "gemini-3-pro-preview",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          strategy: "tiered",
          tiers: [
            { rate: 0.2, upTo: 200_000 },
            { rate: 0.4, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 2, upTo: 200_000 },
            { rate: 4, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 12, upTo: 200_000 },
            { rate: 18, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          lookup: { prices: { "1h": 4.5 }, pricingParams: ["ttl"] },
          name: "textInput_cacheWrite",
          strategy: "lookup",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-11-18",
    settings: {
      extendParams: ["thinkingLevel2", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 3 Flash is the smartest model built for speed, combining cutting-edge intelligence with excellent search grounding.",
    displayName: "Gemini 3 Flash Preview",
    enabled: true,
    id: "gemini-3-flash-preview",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.05,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.5,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 3,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          lookup: { prices: { "1h": 1 }, pricingParams: ["ttl"] },
          name: "textInput_cacheWrite",
          strategy: "lookup",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-12-17",
    settings: {
      extendParams: ["thinkingLevel", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 2.5 Pro is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.",
    displayName: "Gemini 2.5 Pro",
    id: "gemini-2.5-pro",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          strategy: "tiered",
          tiers: [
            { rate: 0.31, upTo: 200_000 },
            { rate: 0.625, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 1.25, upTo: 200_000 },
            { rate: 2.5, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 10, upTo: 200_000 },
            { rate: 15, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          lookup: { prices: { "1h": 4.5 }, pricingParams: ["ttl"] },
          name: "textInput_cacheWrite",
          strategy: "lookup",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-06-17",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 2.5 Pro Preview is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.",
    displayName: "Gemini 2.5 Pro Preview 06-05",
    id: "gemini-2.5-pro-preview-06-05",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          strategy: "tiered",
          tiers: [
            { rate: 0.31, upTo: 200_000 },
            { rate: 0.625, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 1.25, upTo: 200_000 },
            { rate: 2.5, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 10, upTo: 200_000 },
            { rate: 15, upTo: "infinity" }
          ],
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-06-05",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 2.5 Pro Preview is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.",
    displayName: "Gemini 2.5 Pro Preview 05-06",
    id: "gemini-2.5-pro-preview-05-06",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          strategy: "tiered",
          tiers: [
            { rate: 0.31, upTo: 200_000 },
            { rate: 0.625, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 1.25, upTo: 200_000 },
            { rate: 2.5, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 10, upTo: 200_000 },
            { rate: 15, upTo: "infinity" }
          ],
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-05-06",
    settings: {
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 2.5 Flash is Google’s best-value model with full capabilities.",
    displayName: "Gemini 2.5 Flash",
    id: "gemini-2.5-flash",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.075,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.3,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 2.5,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-06-17",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description: "Preview release (Septempber 25th, 2025) of Gemini 2.5 Flash",
    displayName: "Gemini 2.5 Flash Preview Sep 2025",
    id: "gemini-2.5-flash-preview-09-2025",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.075,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.3,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 2.5,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-09-25",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Gemini 2.5 Flash-Lite is Google’s smallest, best-value model, designed for large-scale use.",
    displayName: "Gemini 2.5 Flash-Lite",
    id: "gemini-2.5-flash-lite",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.025,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-07-22",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      video: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 65_536,
    description:
      "Preview release (September 25th, 2025) of Gemini 2.5 Flash-Lite",
    displayName: "Gemini 2.5 Flash-Lite Preview Sep 2025",
    id: "gemini-2.5-flash-lite-preview-09-2025",
    maxOutput: 65_536,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.025,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-09-25",
    settings: {
      extendParams: ["thinkingBudget", "urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      search: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 8192,
    description:
      "Gemini 2.0 Flash delivers next-gen features including exceptional speed, native tool use, multimodal generation, and a 1M-token context window.",
    displayName: "Gemini 2.0 Flash",
    id: "gemini-2.0-flash",
    maxOutput: 8192,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.025,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-02-05",
    settings: {
      extendParams: ["urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      functionCall: true,
      search: true,
      vision: true
    },
    contextWindowTokens: 1_048_576 + 8192,
    description:
      "Gemini 2.0 Flash delivers next-gen features including exceptional speed, native tool use, multimodal generation, and a 1M-token context window.",
    displayName: "Gemini 2.0 Flash 001",
    id: "gemini-2.0-flash-001",
    maxOutput: 8192,
    pricing: {
      units: [
        {
          name: "textInput_cacheRead",
          rate: 0.025,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-02-05",
    settings: {
      extendParams: ["urlContext"],
      searchImpl: "params",
      searchProvider: "google"
    },
    type: "chat"
  },
  {
    abilities: {
      vision: true
    },
    contextWindowTokens: 1_048_576 + 8192,
    description:
      "A Gemini 2.0 Flash variant optimized for cost efficiency and low latency.",
    displayName: "Gemini 2.0 Flash-Lite",
    id: "gemini-2.0-flash-lite",
    maxOutput: 8192,
    pricing: {
      units: [
        {
          name: "textInput",
          rate: 0.075,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.3,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    releasedAt: "2025-02-05",
    type: "chat"
  }
]

const nanoBanana2ParamsSchema: ModelParamsSchema = {
  aspectRatio: {
    default: "1:1",
    enum: [
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9"
    ]
  },
  imageUrls: { default: [] },
  prompt: { default: "" },
  resolution: {
    default: "1K",
    enum: ["512px", "1K", "2K", "4K"]
  }
}

const nanoBananaProParamsSchema: ModelParamsSchema = {
  aspectRatio: {
    default: "1:1",
    enum: [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9"
    ]
  },
  imageUrls: { default: [] },
  prompt: { default: "" },
  resolution: {
    default: "1K",
    enum: ["1K", "2K", "4K"]
  }
}

const nanoBananaParamsSchema: ModelParamsSchema = {
  aspectRatio: {
    default: "1:1",
    enum: [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9"
    ]
  },
  imageUrls: { default: [] },
  prompt: { default: "" }
}

const googleImageModels: AIImageModelCard[] = [
  {
    description:
      "Imagen 4.0 Generate is Google's latest image generation model, producing high-quality images with exceptional detail and photorealism.",
    displayName: "Imagen 4.0 Generate",
    enabled: true,
    id: "imagen-4.0-generate-001",
    pricing: {
      approximatePricePerImage: 0.04,
      units: [
        {
          name: "imageGeneration",
          rate: 0.04,
          strategy: "fixed",
          unit: "image"
        }
      ]
    },
    resolutions: ["1024x1024", "1536x1024", "1024x1536"],
    type: "image"
  },
  {
    description:
      "Nano Banana 2 (Gemini 3.1 Flash Image Preview) is the high-efficiency image generation model optimized for speed and high-volume developer use cases. Supports up to 4K resolution, 14 reference images, Google Search grounding, and advanced text rendering.",
    displayName: "Nano Banana 2 (Gemini 3.1 Flash Image)",
    enabled: true,
    id: "gemini-3.1-flash-image-preview",
    parameters: nanoBanana2ParamsSchema,
    pricing: {
      units: [
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "imageInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "imageOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    resolutions: [
      "512x512",
      "1024x1024",
      "2048x2048",
      "4096x4096",
      "1376x768",
      "2752x1536",
      "5504x3072",
      "768x1376",
      "1536x2752",
      "3072x5504"
    ],
    type: "image"
  },
  {
    description:
      'Nano Banana Pro (Gemini 3 Pro Image Preview) is designed for professional asset production, utilizing advanced reasoning ("Thinking") to follow complex instructions and render high-fidelity text. Supports up to 4K resolution and Google Search grounding.',
    displayName: "Nano Banana Pro (Gemini 3 Pro Image)",
    enabled: true,
    id: "gemini-3-pro-image-preview",
    parameters: nanoBananaProParamsSchema,
    pricing: {
      units: [
        {
          name: "textInput",
          strategy: "tiered",
          tiers: [
            { rate: 1.25, upTo: 200_000 },
            { rate: 2.5, upTo: "infinity" }
          ],
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          strategy: "tiered",
          tiers: [
            { rate: 10, upTo: 200_000 },
            { rate: 15, upTo: "infinity" }
          ],
          unit: "millionTokens"
        }
      ]
    },
    resolutions: [
      "1024x1024",
      "2048x2048",
      "4096x4096",
      "1376x768",
      "2752x1536",
      "5504x3072",
      "768x1376",
      "1536x2752",
      "3072x5504"
    ],
    type: "image"
  },
  {
    description:
      "Nano Banana (Gemini 2.5 Flash Image) is designed for speed and efficiency, optimized for high-volume, low-latency image generation tasks at 1K resolution.",
    displayName: "Nano Banana (Gemini 2.5 Flash Image)",
    id: "gemini-2.5-flash-image",
    parameters: nanoBananaParamsSchema,
    pricing: {
      units: [
        {
          name: "textInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "textOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "imageInput",
          rate: 0.1,
          strategy: "fixed",
          unit: "millionTokens"
        },
        {
          name: "imageOutput",
          rate: 0.4,
          strategy: "fixed",
          unit: "millionTokens"
        }
      ]
    },
    resolutions: [
      "1024x1024",
      "1344x768",
      "768x1344",
      "1248x832",
      "832x1248",
      "1184x864",
      "864x1184",
      "1152x896",
      "896x1152"
    ],
    type: "image"
  }
]

export const allModels = [...googleChatModels, ...googleImageModels]

export default allModels
