/**
 * Analyze on-chain token activity: fetch recent activity and summarize transfers.
 * Uses Solana JSON-RPC methods: getSignaturesForAddress, getTransaction.
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
}

type JsonRpcParams = unknown[]
interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params: JsonRpcParams
}
interface JsonRpcResponse<T> {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: { code: number; message: string }
}

interface SignatureInfo {
  signature: string
  blockTime?: number
  err: unknown | null
}

interface UiTokenAmount {
  uiAmount: number | null
  decimals: number
}

interface TokenBalanceEntry {
  accountIndex: number
  mint: string
  owner?: string | null
  uiTokenAmount: UiTokenAmount
}

interface TransactionMeta {
  preTokenBalances?: TokenBalanceEntry[]
  postTokenBalances?: TokenBalanceEntry[]
}

interface TransactionResult {
  blockTime?: number
  meta?: TransactionMeta | null
}

/** Loose base58 check for Solana public keys */
const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{20,64}$/

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function jsonRpcFetch<T>(
  endpoint: string,
  method: string,
  params: JsonRpcParams,
  signal?: AbortSignal
): Promise<T> {
  const body: JsonRpcRequest = { jsonrpc: "2.0", id: Date.now(), method, params }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`RPC ${method} failed: HTTP ${res.status}`)
  const json = (await res.json()) as JsonRpcResponse<T>
  if (json.error) throw new Error(`RPC ${method} error ${json.error.code}: ${json.error.message}`)
  return json.result as T
}

export class TokenActivityAnalyzer {
  constructor(private rpcEndpoint: string) {}

  /**
   * Fetch signatures for an address (mint or account), optionally paginated via 'before'
   */
  async fetchRecentSignatures(address: string, limit = 100, before?: string, signal?: AbortSignal): Promise<string[]> {
    assert(PUBKEY_RE.test(address), "Invalid address format")
    const result = await jsonRpcFetch<SignatureInfo[]>(
      this.rpcEndpoint,
      "getSignaturesForAddress",
      [address, { limit, before }],
      signal
    )
    return result.filter(s => !s.err).map(s => s.signature)
  }

  /**
   * Fetch a single transaction by signature
   */
  private async fetchTransaction(sig: string, signal?: AbortSignal): Promise<TransactionResult | null> {
    const result = await jsonRpcFetch<TransactionResult>(
      this.rpcEndpoint,
      "getTransaction",
      [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      signal
    )
    return result
  }

  /**
   * Analyze token balance deltas for a specific mint within a transaction meta
   */
  private extractTokenDeltas(mint: string, meta: TransactionMeta, blockTime?: number, signature = ""): ActivityRecord[] {
    const pre = meta.preTokenBalances ?? []
    const post = meta.postTokenBalances ?? []
    // Index by accountIndex for robust alignment
    const preMap = new Map<number, TokenBalanceEntry>(pre.filter(x => x.mint === mint).map(x => [x.accountIndex, x]))
    const postMap = new Map<number, TokenBalanceEntry>(post.filter(x => x.mint === mint).map(x => [x.accountIndex, x]))

    const out: ActivityRecord[] = []
    const indices = new Set<number>([...preMap.keys(), ...postMap.keys()])
    for (const idx of indices) {
      const preItem = preMap.get(idx)
      const postItem = postMap.get(idx)
      const preAmt = preItem?.uiTokenAmount.uiAmount ?? 0
      const postAmt = postItem?.uiTokenAmount.uiAmount ?? 0
      const delta = (postAmt || 0) - (preAmt || 0)
      if (!delta) continue

      // Heuristic mapping: negative delta -> source, positive delta -> destination
      const source = delta < 0 ? (preItem?.owner ?? "unknown") : "unknown"
      const destination = delta > 0 ? (postItem?.owner ?? "unknown") : "unknown"

      if (delta !== 0) {
        out.push({
          timestamp: (blockTime ?? 0) * 1000,
          signature,
          source,
          destination,
          amount: Math.abs(delta),
        })
      }
    }
    return out
  }

  /**
   * Analyze recent activity for a mint. Will paginate signatures if needed to satisfy 'limit'.
   */
  async analyzeActivity(mint: string, limit = 50, signal?: AbortSignal): Promise<ActivityRecord[]> {
    assert(PUBKEY_RE.test(mint), "Invalid mint public key format")
    const perPage = Math.min(Math.max(limit, 1), 100)
    let collectedSigs: string[] = []
    let before: string | undefined

    // paginate until we get enough signatures (or no more)
    while (collectedSigs.length < limit) {
      const page = await this.fetchRecentSignatures(mint, perPage, before, signal)
      if (page.length === 0) break
      collectedSigs = collectedSigs.concat(page)
      if (page.length < perPage) break
      before = page[page.length - 1]
    }
    const sigs = collectedSigs.slice(0, limit)

    const out: ActivityRecord[] = []
    // modest concurrency to avoid rate limiting
    const concurrency = 5
    for (let i = 0; i < sigs.length; i += concurrency) {
      const batch = sigs.slice(i, i + concurrency)
      const results = await Promise.all(
        batch.map(async (sig) => {
          try {
            const tx = await this.fetchTransaction(sig, signal)
            if (!tx?.meta) return []
            return this.extractTokenDeltas(mint, tx.meta, tx.blockTime, sig)
          } catch {
            return []
          }
        })
      )
      for (const recs of results) out.push(...recs)
    }
    return out
  }

  /**
   * Summarize a set of activity records: totals and per-address net flow
   */
  summarize(records: ActivityRecord[]): {
    totalTransfers: number
    totalAmount: number
    uniqueAddresses: number
    byAddress: Record<string, number>
  } {
    const byAddress: Record<string, number> = {}
    let totalAmount = 0
    for (const r of records) {
      totalAmount += r.amount
      if (r.source && r.source !== "unknown") byAddress[r.source] = (byAddress[r.source] ?? 0) - r.amount
      if (r.destination && r.destination !== "unknown") byAddress[r.destination] = (byAddress[r.destination] ?? 0) + r.amount
    }
    const addrSet = new Set<string>()
    records.forEach(r => {
      if (r.source && r.source !== "unknown") addrSet.add(r.source)
      if (r.destination && r.destination !== "unknown") addrSet.add(r.destination)
    })
    return {
      totalTransfers: records.length,
      totalAmount,
      uniqueAddresses: addrSet.size,
      byAddress,
    }
  }
}
