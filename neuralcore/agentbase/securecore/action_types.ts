import { z } from "zod"

/**
 * Base types for any action.
 */
export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  notice: string
  data?: T
}

export interface BaseAction<
  S extends ActionSchema,
  R,
  Ctx = unknown
> {
  id: string
  summary: string
  input: S
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<ActionResponse<R>>
}
