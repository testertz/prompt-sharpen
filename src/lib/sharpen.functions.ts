import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharpenCategory = "general" | "code" | "image";

export type SharpenResult = {
  enhanced_prompt: string;
  why: string[];
};

export type SharpenErrorCode =
  | "rate_limited"
  | "config"
  | "malformed"
  | "network"
  | "empty";

export class SharpenError extends Error {
  code: SharpenErrorCode;
  constructor(code: SharpenErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const inputSchema = z.object({
  draft: z.string().min(1).max(8000),
  category: z.enum(["general", "code", "image"]),
});

const resultSchema = z.object({
  enhanced_prompt: z.string().min(1),
  why: z.array(z.string().min(1)).min(1).max(6),
});

const framing: Record<SharpenCategory, string> = {
  general: "for a general-purpose AI chatbot",
  code: "for an AI coding assistant",
  image: "for an AI image generation model",
};

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enhanced_prompt: {
      type: "string",
      description: "The rewritten prompt, ready to paste. No commentary.",
    },
    why: {
      type: "array",
      description: "2-4 short bullets, under 12 words each, naming specific improvements.",
      items: { type: "string" },
    },
  },
  required: ["enhanced_prompt", "why"],
} as const;

export const sharpenPrompt = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SharpenResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new SharpenError("config", "The AI service is not configured.");
    }

    const instructions = [
      `You rewrite rough draft prompts into clear, well-structured prompts ${framing[data.category]}.`,
      "Rules:",
      "- Preserve the original intent and every stated constraint. Never invent new requirements.",
      "- Add missing but clearly useful specificity (format, scope, audience, tone, examples) only when it meaningfully helps.",
      "- Stay concise. No filler, no preamble, no meta-commentary.",
      "- Rewrite the prompt only. Never answer it.",
      "- The 'why' bullets must name the specific improvements you made to this prompt, each under 12 words.",
    ].join("\n");

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          instructions,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: `Draft prompt:\n\n${data.draft}` }],
            },
          ],
          reasoning: { effort: "low" },
          text: {
            format: {
              type: "json_schema",
              name: "sharpened_prompt",
              strict: true,
              schema: jsonSchema,
            },
          },
        }),
      });
    } catch {
      throw new SharpenError("network", "Couldn't reach the AI service. Check your connection and try again.");
    }

    if (!res.ok) {
      if (res.status === 429) {
        throw new SharpenError("rate_limited", "Too many requests right now. Wait a moment and try again.");
      }
      if (res.status === 401 || res.status === 402 || res.status === 403) {
        throw new SharpenError("config", "The AI service rejected this request. Check the workspace AI setup and credits.");
      }
      throw new SharpenError("network", "The AI service had a problem. Please try again.");
    }

    if (!res.body) {
      throw new SharpenError("network", "The AI service returned an empty response.");
    }

    let text = "";
    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
              text += event.delta;
            } else if (event.type === "response.completed" && event.response?.output_text) {
              if (!text) text = event.response.output_text;
            }
          } catch {
            // ignore keep-alive / non-JSON lines
          }
        }
      }
    } catch {
      throw new SharpenError("network", "The connection dropped while sharpening. Please try again.");
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new SharpenError("malformed", "The model returned nothing usable. Try rephrasing your draft.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new SharpenError("malformed", "The model's response couldn't be read. Please try again.");
    }

    const validated = resultSchema.safeParse(parsed);
    if (!validated.success) {
      throw new SharpenError("malformed", "The model's response was incomplete. Please try again.");
    }

    return {
      enhanced_prompt: validated.data.enhanced_prompt.trim(),
      why: validated.data.why.slice(0, 4).map((w) => w.trim()),
    };
  });
