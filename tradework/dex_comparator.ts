export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  lastUpdated?: string
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
  retries?: number
}

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  private async fetchFromApi<T>(
    api: { name: string; baseUrl: string; apiKey?: string },
    path: string,
    attempt = 1
  ): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10000)
    try {
      const res = await fetch(`${api.baseUrl}${path}`, {
        headers: api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {},
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} ${res.status}`)
      return (await res.json()) as T
    } catch (err) {
      if (attempt <= (this.config.retries ?? 1)) {
        return this.fetchFromApi<T>(api, path, attempt + 1)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const results: PairInfo[] = []
    const tasks = this.config.apis.map(async api => {
      try {
        const data = await this.fetchFromApi<any>(api, `/pair/${pairAddress}`)
        results.push({
          exchange: api.name,
          pairAddress,
          baseSymbol: data.token0.symbol,
          quoteSymbol: data.token1.symbol,
          liquidityUsd: Number(data.liquidityUsd),
          volume24hUsd: Number(data.volume24hUsd),
          priceUsd: Number(data.priceUsd),
          lastUpdated: new Date().toISOString(),
        })
      } catch {
        // skip failed API
      }
    })
    await Promise.all(tasks)
    return results
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, { bestVolume: PairInfo; bestLiquidity: PairInfo; sources: number }>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        if (!infos.length) return [addr, { bestVolume: null, bestLiquidity: null, sources: 0 }] as const
        const bestVolume = infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a), infos[0])
        const bestLiquidity = infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a), infos[0])
        return [addr, { bestVolume, bestLiquidity, sources: infos.length }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Summarize pair comparison results into a report string.
   */
  async summarizePairs(pairs: string[]): Promise<string> {
    const comparison = await this.comparePairs(pairs)
    const lines: string[] = []
    for (const [addr, { bestVolume, bestLiquidity, sources }] of Object.entries(comparison)) {
      lines.push(
        `${addr}: Sources=${sources}, BestVolume=${bestVolume?.exchange ?? "n/a"}, BestLiquidity=${bestLiquidity?.exchange ?? "n/a"}`
      )
    }
    return lines.join("\n")
  }
}
