export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  duration: number
  pointsCount: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5,
  neutralThreshold: number = 0.2
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    const reachedMinLen = i - segStart >= minSegmentLength
    const isEnd = i === points.length - 1
    const nextChange =
      !isEnd &&
      ((direction === 1 && points[i + 1].priceUsd < curr) ||
        (direction === -1 && points[i + 1].priceUsd > curr))

    if (reachedMinLen && (isEnd || nextChange)) {
      const start = points[segStart]
      const end = points[i]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100

      let trend: "upward" | "downward" | "neutral"
      if (Math.abs(changePct) <= neutralThreshold) {
        trend = "neutral"
      } else {
        trend = changePct > 0 ? "upward" : "downward"
      }

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend,
        changePct: Math.round(changePct * 100) / 100,
        duration: end.timestamp - start.timestamp,
        pointsCount: i - segStart + 1,
      })
      segStart = i
    }
  }
  return results
}
