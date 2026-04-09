import type { BaseElarisAction, ElarisActionResponse } from "./baseElarisAction"
import { z } from "zod"

export interface AgentContext {
  apiEndpoint: string
  apiKey: string
  metadata?: Record<string, any>
}

/**
 * Central Agent that registers and executes ElarisFlow actions.
 * Provides runtime validation of payloads against zod schemas.
 */
export class ElarisAgent {
  private actions = new Map<string, BaseElarisAction<any, any, AgentContext>>()

  /**
   * Register a new action with the agent.
   */
  register<S, R>(action: BaseElarisAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" is already registered`)
    }
    this.actions.set(action.id, action)
  }

  /**
   * Invoke an action by id, validating input with its zod schema.
   */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<ElarisActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      throw new Error(`Unknown action "${actionId}"`)
    }

    // validate input payload using the schema
    const parsed = (action.input as z.ZodTypeAny).safeParse(payload)
    if (!parsed.success) {
      return {
        notice: `Validation failed for action "${actionId}"`,
        data: parsed.error.issues.map(i => i.message) as any,
      }
    }

    try {
      return await action.execute({
        payload: parsed.data,
        context: ctx,
      })
    } catch (err: any) {
      return {
        notice: `Execution error in action "${actionId}"`,
        data: { error: err.message } as any,
      }
    }
  }

  /**
   * List registered action IDs.
   */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  /**
   * Check if an action is registered.
   */
  hasAction(id: string): boolean {
    return this.actions.has(id)
  }
}
