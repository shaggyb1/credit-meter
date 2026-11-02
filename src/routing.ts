import type { CreditAction } from "./plans";

/**
 * Model routing keeps AI costs low enough for very cheap plans:
 * - fast:  quick, high-volume writing (captions, hashtags, ideas)
 * - smart: deeper work (scripts, calendars, scoring, insights, web research)
 * - agent: the assistant's tool-using conversations
 * Override any tier with AI_MODEL_FAST / AI_MODEL_SMART / AI_MODEL_AGENT.
 */
export type Tier = "fast" | "smart" | "agent";

export const DEFAULT_MODELS: Record<Tier, string> = {
  fast: "claude-haiku-5-5",
  smart: "claude-sonnet-5-5",
  agent: "claude-sonnet-5-5",
};

export const ACTION_TIER: Record<CreditAction, Tier> = {
  captions: "fast",
  hashtags: "fast",
  ideas: "fast",
  translate: "fast",
  replies: "fast",
  carousel: "fast",
  reel: "smart",
  score: "smart",
  brandDna: "smart",
  repurpose: "smart",
  insights: "smart",
  calendar: "smart",
  trends: "smart",
  copilot: "agent",
};

type Env = Record<string, string | undefined>;

export function modelFor(action: CreditAction, env: Env = process.env): string {
  const tier = ACTION_TIER[action];
  return env[`AI_MODEL_${tier.toUpperCase()}`] || DEFAULT_MODELS[tier];
}

/**
 * Server-side refusal fallback where the model supports it. Haiku has none (sending
 * `fallbacks` there is rejected or ignored), so it gets no extra params.
 */
export function fallbackParams(model: string) {
  return /haiku/.test(model) ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}

/**
 * System prompt blocks for a request. The brand profile is the same for every request
 * in a session, so the cache breakpoint goes after it and repeat calls read it from cache.
 */
export function systemBlocks(system: string, brandContext?: string) {
  if (!brandContext) return [{ type: "text" as const, text: system }];
  return [
    { type: "text" as const, text: system },
    { type: "text" as const, text: brandContext, cache_control: { type: "ephemeral" as const } },
  ];
}
