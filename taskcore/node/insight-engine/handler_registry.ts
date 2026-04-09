/**
 * Task execution engine: registers handlers, enqueues tasks, and executes them.
 */
type Handler = (params: any) => Promise<any>

export interface Task {
  id: string
  type: string
  params: any
  createdAt: number
  priority?: number
}

export interface TaskResult {
  id: string
  result?: any
  error?: string
  startedAt: number
  finishedAt: number
  durationMs: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []

  register(type: string, handler: Handler): void {
    this.handlers[type] = handler
  }

  enqueue(id: string, type: string, params: any, priority: number = 0): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, createdAt: Date.now(), priority })
  }

  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    // sort by priority (descending)
    this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    while (this.queue.length) {
      const task = this.queue.shift()!
      const startedAt = Date.now()
      try {
        const data = await this.handlers[task.type](task.params)
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          result: data,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      } catch (err: any) {
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          error: err.message,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      }
    }
    return results
  }

  getQueueLength(): number {
    return this.queue.length
  }

  clearQueue(): void {
    this.queue = []
  }
}
