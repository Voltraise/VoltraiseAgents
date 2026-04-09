/**
 * Analyze on-chain orderbook depth for a given market.
 */
export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  totalBidVolume: number
  totalAskVolume: number
  bidCount: number
  askCount: number
  midPrice: number
}

export class TokenDepthAnalyzer {
  constructor(private rpcEndpoint: string, private marketId: string) {}

  async fetchOrderbook(depth = 50, signal?: AbortSignal): Promise<{ bids: Order[]; asks: Order[] }> {
    const url = `${this.rpcEndpoint}/orderbook/${this.marketId}?depth=${depth}`
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status}`)
    return await res.json()
  }

  private average(arr: Order[]): number {
    return arr.length ? arr.reduce((s, o) => s + o.size, 0) / arr.length : 0
  }

  private totalVolume(arr: Order[]): number {
    return arr.reduce((s, o) => s + o.size, 0)
  }

  private bestPrice(arr: Order[], isBid: boolean): number {
    if (!arr.length) return 0
    return isBid ? Math.max(...arr.map(o => o.price)) : Math.min(...arr.map(o => o.price))
  }

  async analyze(depth = 50, signal?: AbortSignal): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth, signal)
    const bestBid = this.bestPrice(bids, true)
    const bestAsk = this.bestPrice(asks, false)
    const spread = bestAsk && bestBid ? bestAsk - bestBid : 0
    const midPrice = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : 0

    return {
      averageBidDepth: this.average(bids),
      averageAskDepth: this.average(asks),
      spread,
      totalBidVolume: this.totalVolume(bids),
      totalAskVolume: this.totalVolume(asks),
      bidCount: bids.length,
      askCount: asks.length,
      midPrice,
    }
  }

  async summarize(depth = 50, signal?: AbortSignal): Promise<string> {
    const metrics = await this.analyze(depth, signal)
    return `Spread: ${metrics.spread.toFixed(4)}, Mid: ${metrics.midPrice.toFixed(4)}, Bids: ${metrics.bidCount}, Asks: ${metrics.askCount}`
  }
}
