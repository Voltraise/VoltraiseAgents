import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data from a liquidity source
 * – run health / risk analysis on a liquidity pool
 * Each entry is immutable and should be used for registering actions
 * within the agent execution pipeline.
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Get the full list of available liquidity tool identifiers.
 */
export function getLiquidityToolKeys(): string[] {
  return Object.keys(LIQUIDITY_ANALYSIS_TOOLS)
}

/**
 * Utility: fetch a specific liquidity tool by key.
 * Returns undefined if the key is not registered.
 */
export function getLiquidityTool(key: string): Toolkit | undefined {
  return LIQUIDITY_ANALYSIS_TOOLS[key]
}

/**
 * Metadata describing the toolkit module.
 */
export const LIQUIDITY_ANALYSIS_METADATA = {
  category: "liquidity",
  tools: getLiquidityToolKeys(),
  description: "Provides pool data fetching and pool health analysis actions",
}
