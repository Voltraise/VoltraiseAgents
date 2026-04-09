import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

export interface ScheduledTask {
  id: string
  name: string
  type: string
  parameters: Record<string, any>
  scheduleCron?: string
  createdAt: string
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string; task?: ScheduledTask }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues.map(i => i.message).join("; ")}`,
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  const task: ScheduledTask = {
    id: `${taskName}-${Date.now()}`,
    name: taskName,
    type: taskType,
    parameters,
    scheduleCron,
    createdAt: new Date().toISOString(),
  }

  // Placeholder for actual scheduling logic (cron registration, queue push, etc.)
  await simulateTaskStorage(task)

  return { success: true, message: `Task "${taskName}" scheduled with ID ${task.id}`, task }
}

async function simulateTaskStorage(task: ScheduledTask): Promise<void> {
  // In a real system, this would persist to DB or scheduler
  console.log("Task stored:", task)
}
