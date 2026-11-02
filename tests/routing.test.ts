import { describe, expect, it } from "vitest";
import { CREDIT_COST, type CreditAction } from "../src/plans";
import { ACTION_TIER, fallbackParams, modelFor, systemBlocks } from "../src/routing";

const actions = Object.keys(CREDIT_COST) as CreditAction[];

describe("model routing", () => {
  it("sends every 1-credit action to the fast model", () => {
    for (const a of actions.filter((a) => CREDIT_COST[a] === 1)) expect(ACTION_TIER[a]).toBe("fast");
  });

  it("prices smart-model work above fast-model work", () => {
    const fastMax = Math.max(...actions.filter((a) => ACTION_TIER[a] === "fast").map((a) => CREDIT_COST[a]));
    const smartMin = Math.min(...actions.filter((a) => ACTION_TIER[a] !== "fast").map((a) => CREDIT_COST[a]));
    expect(smartMin).toBeGreaterThan(fastMax);
  });

  it("lets an environment variable override a tier's model", () => {
    expect(modelFor("captions", { AI_MODEL_FAST: "claude-test" })).toBe("claude-test");
    expect(modelFor("calendar", { AI_MODEL_FAST: "claude-test" })).toBe("claude-sonnet-5-5");
  });

  it("adds refusal fallbacks only where the model supports them", () => {
    expect(fallbackParams("claude-haiku-5-5")).toEqual({});
    expect(fallbackParams("claude-sonnet-5-5")).toHaveProperty("fallbacks", "default");
  });
});

describe("prompt caching", () => {
  it("marks the brand profile, not the shared system prompt, as the cache breakpoint", () => {
    const [system, brand] = systemBlocks("You are a copywriter.", "Brand: Acme");
    expect(system).not.toHaveProperty("cache_control");
    expect(brand).toHaveProperty("cache_control", { type: "ephemeral" });
  });

  it("sends no cache breakpoint when there's no brand", () => {
    expect(systemBlocks("You are a copywriter.")).toHaveLength(1);
  });
});
