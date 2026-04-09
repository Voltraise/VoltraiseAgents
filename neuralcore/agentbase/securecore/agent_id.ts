/**
 * Unique identifier for the Solana Knowledge Agent.
 * This constant is used across the system to ensure consistent references
 * when invoking or registering the agent.
 */
export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

/**
 * Type alias representing the identifier of the Solana Knowledge Agent.
 * Useful for typing contexts or enforcing strict IDs in configs.
 */
export type SolanaKnowledgeAgentId = typeof SOLANA_KNOWLEDGE_AGENT_ID

/**
 * Utility function that returns the Solana Knowledge Agent identifier.
 * Can be used in cases where dynamic resolution is required.
 */
export function getSolanaKnowledgeAgentId(): SolanaKnowledgeAgentId {
  return SOLANA_KNOWLEDGE_AGENT_ID
}

/**
 * Registry entry helper for agent initialization.
 */
export const SOLANA_KNOWLEDGE_AGENT_ENTRY = {
  id: SOLANA_KNOWLEDGE_AGENT_ID,
  description: "Provides authoritative knowledge on Solana protocols, tokens, and ecosystem",
}
