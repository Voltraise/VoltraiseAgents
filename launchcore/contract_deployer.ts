export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  retries?: number
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  attempts?: number
  durationMs?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
  }

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, retries = 2, timeoutMs = 20000 } =
      this.config
    let attempt = 0
    const start = Date.now()

    while (attempt <= retries) {
      attempt++
      try {
        const res = await this.withTimeout(
          fetch(deployEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({ contractName, parameters }),
          }),
          timeoutMs
        )

        if (!res.ok) {
          const text = await res.text()
          if (attempt > retries) {
            return {
              success: false,
              error: `HTTP ${res.status}: ${text}`,
              attempts: attempt,
              durationMs: Date.now() - start,
            }
          }
          continue
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          attempts: attempt,
          durationMs: Date.now() - start,
        }
      } catch (err: any) {
        if (attempt > retries) {
          return {
            success: false,
            error: err.message,
            attempts: attempt,
            durationMs: Date.now() - start,
          }
        }
      }
    }

    return {
      success: false,
      error: "Deployment failed after all retries",
      attempts: retries + 1,
      durationMs: Date.now() - start,
    }
  }
}
