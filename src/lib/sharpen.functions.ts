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
  why: z.array(z.string().min(1)).min(1).max(8),
});

const framing: Record<SharpenCategory, string> = {
  general: "for a general-purpose AI chatbot",
  code: "for an AI coding assistant",
  image: "for an AI image generation model",
};

const categoryGuidance: Record<SharpenCategory, string> = {
  general: [
    "Structure the rewritten prompt with clear labelled sections such as: Role, Context, Task, Requirements, Constraints, Output format.",
    "Spell out the audience, tone, depth, and structure of the answer you want.",
    "State what to include and what to leave out, and how to handle ambiguity or missing information.",
  ].join("\n"),
  code: [
    "Structure the rewritten prompt with clear labelled sections such as: Role, Context, Task, Functional requirements, Technical constraints, Edge cases, Output format.",
    "Name the language, framework, and versions when implied; describe expected inputs and outputs, error handling, validation, and naming conventions.",
    "Ask for modular, readable code, and say whether tests, comments, or usage examples are expected.",
  ].join("\n"),
  image: [
    "Structure the rewritten prompt as a dense visual description covering: subject and action, setting, composition and framing, camera or lens perspective, lighting, colour palette, medium and art style, mood, and level of detail.",
    "Finish with an explicit list of things to avoid (negative prompt) and the aspect ratio when it is implied.",
    "Keep it descriptive prose plus short attribute clauses, not a conversational request.",
  ].join("\n"),
};

export type SharpenResponse =
  | { ok: true; data: SharpenResult }
  | { ok: false; code: SharpenErrorCode; message: string };

async function run(data: z.infer<typeof inputSchema>): Promise<SharpenResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new SharpenError("config", "The AI service is not configured.");
  }

  const system = [
    `You expand rough draft prompts into thorough, highly specific, instruction-rich prompts ${framing[data.category]}.`,
    "",
    "Goal: the rewritten prompt should be substantially richer and more actionable than the draft — the kind of prompt an expert would write, so the receiving model needs no follow-up questions.",
    "",
    "Rules:",
    "- Preserve the original intent and every stated constraint. Never contradict the draft.",
    "- Expand generously: add the missing context, scope, requirements, success criteria, and output format that the draft clearly implies.",
    "- Make every instruction concrete and testable. No vague adjectives, no filler, no preamble, no meta-commentary.",
    "- Never answer the draft. Only rewrite it as a prompt.",
    "- Do not invent facts the user would have to correct (specific names, numbers, URLs). Use clear placeholders in [square brackets] if a detail is genuinely required but unknown.",
    "",
    categoryGuidance[data.category],
    "",
    'Respond with valid JSON only, no markdown fences, in exactly this shape: {"enhanced_prompt": string, "why": string[]}.',
    "'enhanced_prompt' is the full rewritten prompt, ready to paste, using newlines for structure.",
    "'why' is 3-6 short bullets, each under 12 words, naming the specific improvements you made to this prompt.",
  ].join("\n");

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Draft prompt:\n\n${data.draft}`,
          },
        ],
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
            choices?: Array<{ delta?: { content?: string | null } }>;
          };
          const chunk = event.choices?.[0]?.delta?.content;
          if (typeof chunk === "string") text += chunk;
        } catch {
          // ignore keep-alive / non-JSON lines
        }
      }
    }
  } catch {
    throw new SharpenError("network", "The connection dropped while sharpening. Please try again.");
  }

  let trimmed = text.trim();
  if (!trimmed) {
    throw new SharpenError("malformed", "The model returned nothing usable. Try rephrasing your draft.");
  }

  // Defensively strip markdown fences if the model adds them.
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
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
    why: validated.data.why.slice(0, 6).map((w) => w.trim()),
  };
}

export const sharpenPrompt = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SharpenResponse> => {
    try {
      return { ok: true, data: await run(data) };
    } catch (error) {
      if (error instanceof SharpenError) {
        return { ok: false, code: error.code, message: error.message };
      }
      console.error("sharpen failed", error);
      return {
        ok: false,
        code: "network",
        message: "Something went wrong while sharpening. Please try again.",
      };
    }
  });
