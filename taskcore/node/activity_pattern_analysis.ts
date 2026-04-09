/**
 * Detect volume-based patterns in a series of activity amounts.
 */
export interface PatternMatch {
  index: number
  window: number
  average: number
  max: number
  min: number
  stdDev: number
}

function calculateStdDev(values: number[], mean: number): number {
  if (!values.length) return 0
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  const matches: PatternMatch[] = []
  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    const max = Math.max(...slice)
    const min = Math.min(...slice)
    const stdDev = calculateStdDev(slice, avg)

    if (avg >= threshold) {
      matches.push({
        index: i,
        window: windowSize,
        average: avg,
        max,
        min,
        stdDev,
      })
    }
  }
  return matches
}

export function summarizePatterns(matches: PatternMatch[]): {
  count: number
  avgOfAverages: number
  maxAverage: number
  dominantWindow: number
} {
  if (!matches.length) {
    return { count: 0, avgOfAverages: 0, maxAverage: 0, dominantWindow: 0 }
  }
  const totalAvg = matches.reduce((sum, m) => sum + m.average, 0)
  const avgOfAverages = totalAvg / matches.length
  const maxAverage = Math.max(...matches.map(m => m.average))
  const dominantWindow = matches
    .map(m => m.window)
    .reduce(
      (a, b, i, arr) =>
        arr.filter(x => x === a).length >= arr.filter(x => x === b).length ? a : b,
      matches[0].window
    )
  return { count: matches.length, avgOfAverages, maxAverage, dominantWindow }
}
