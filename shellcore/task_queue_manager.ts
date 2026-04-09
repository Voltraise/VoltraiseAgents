import { execCommand } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
  priority?: number
  createdAt?: number
}

export interface ShellResult {
  taskId: string
  output?: string
  error?: string
  executedAt: number
  durationMs?: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    const newTask = {
      ...task,
      createdAt: task.createdAt || Date.now(),
      priority: task.priority ?? 0,
    }
    this.tasks.push(newTask)
  }

  /**
   * Execute all scheduled tasks in sequence.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
      const start = Date.now()
      try {
        const output = await execCommand(task.command)
        const end = Date.now()
        results.push({
          taskId: task.id,
          output,
          executedAt: start,
          durationMs: end - start,
        })
      } catch (err: any) {
        const end = Date.now()
        results.push({
          taskId: task.id,
          error: err.message,
          executedAt: start,
          durationMs: end - start,
        })
      }
    }
    this.tasks = []
    return results
  }

  /**
   * Run a single task immediately without adding to queue.
   */
  async runSingle(task: ShellTask): Promise<ShellResult> {
    const start = Date.now()
    try {
      const output = await execCommand(task.command)
      return {
        taskId: task.id,
        output,
        executedAt: start,
        durationMs: Date.now() - start,
      }
    } catch (err: any) {
      return {
        taskId: task.id,
        error: err.message,
        executedAt: start,
        durationMs: Date.now() - start,
      }
    }
  }

  /**
   * Get the number of queued tasks.
   */
  count(): number {
    return this.tasks.length
  }

  /**
   * Clear all scheduled tasks without running them.
   */
  clear(): void {
    this.tasks = []
  }
}
