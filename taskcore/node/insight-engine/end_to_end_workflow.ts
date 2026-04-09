type PublicKeyString = string
type UrlString = string

interface RunSummary {
  recordsCount: number
  depthMetricsKeys: string[]
  patternsCount: number
  tasksRan: number
  signatureValid: boolean
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function isLikelyPubkey(s: string): boolean {
  // loose base58-ish check for Solana-like pubkeys (no 0,O,I,l)
  return /^[1-9A-HJ-NP-Za-km-z]{20,64}$/.test(s)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

(async () => {
  const SOLANA_RPC: UrlString = "https://solana.rpc"
  const DEX_API: UrlString = "https://dex.api"
  const MINT: PublicKeyString = "MintPubkeyHere"
  const MARKET: PublicKeyString = "MarketPubkeyHere"

  // Basic input validation before any network work
  assert(isValidUrl(SOLANA_RPC), "Invalid SOLANA_RPC URL")
  assert(isValidUrl(DEX_API), "Invalid DEX_API URL")
  assert(isLikelyPubkey(MINT), "Invalid token mint public key format")
  assert(isLikelyPubkey(MARKET), "Invalid market public key format")

  const timings: Record<string, number> = {}
  const t0 = Date.now()

  try {
    // 1) Analyze activity
    const t1 = Date.now()
    const activityAnalyzer = new TokenActivityAnalyzer(SOLANA_RPC)
    const records = await activityAnalyzer.analyzeActivity(MINT, 20)
    timings.activityMs = Date.now() - t1

    // 2) Analyze depth
    const t2 = Date.now()
    const depthAnalyzer = new TokenDepthAnalyzer(DEX_API, MARKET)
    const depthMetrics = await depthAnalyzer.analyze(30)
    timings.depthMs = Date.now() - t2

    // 3) Detect patterns
    const t3 = Date.now()
    const volumes = Array.isArray(records) ? records.map((r: any) => Number(r.amount) || 0) : []
    const patterns =
      volumes.length > 1 ? detectVolumePatterns(volumes, 5, 100) : []
    timings.patternsMs = Date.now() - t3

    // 4) Execute a custom task
    const t4 = Date.now()
    const engine = new ExecutionEngine()
    engine.register("report", async (params) => ({
      records: Array.isArray(params.records) ? params.records.length : 0,
      hasPatterns: Array.isArray(params.patterns) && params.patterns.length > 0,
    }))
    engine.enqueue("task1", "report", { records, patterns })
    const taskResults = await engine.runAll()
    timings.tasksMs = Date.now() - t4

    // 5) Sign the results
    const t5 = Date.now()
    const signer = new SigningEngine()
    const payload = JSON.stringify({ depthMetrics, patterns, taskResults })
    const signature = await signer.sign(payload)
    const ok = await signer.verify(payload, signature)
    timings.cryptoMs = Date.now() - t5

    const summary: RunSummary = {
      recordsCount: Array.isArray(records) ? records.length : 0,
      depthMetricsKeys: depthMetrics ? Object.keys(depthMetrics) : [],
      patternsCount: Array.isArray(patterns) ? patterns.length : 0,
      tasksRan: Array.isArray(taskResults) ? taskResults.length : 0,
      signatureValid: ok === true,
    }

    timings.totalMs = Date.now() - t0

    console.log({
      summary,
      records,
      depthMetrics,
      patterns,
      taskResults,
      signatureLength: typeof signature === "string" ? signature.length : 0,
      timings,
    })
  } catch (err: any) {
    timings.totalMs = Date.now() - t0
    console.error({
      error: err?.message || String(err),
      timings,
    })
  }
})()
