import { z } from "zod";
import { SCHEMA_VERSION } from "./types";

const blockTargetSchema = z
  .object({
    metric: z.enum(["power_pct_ftp", "power_watts", "pace", "heart_rate", "rpe", "none"]),
    value: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional()
  })
  .refine((target) => target.value !== undefined || target.start !== undefined || target.end !== undefined, {
    message: "target must include value or start/end"
  })
  .optional();

export const blockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum(["warmup", "cooldown", "interval_steady", "interval_ramp", "interval_set", "free_ride", "text_event", "cadence", "repeat"]),
    startTime: z.number().min(0),
    duration: z.number().min(0),
    target: blockTargetSchema,
    label: z.string().optional(),
    meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    children: z.array(blockSchema).optional()
  })
);

export const workoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  author: z.string().default(""),
  tags: z.array(z.string()).default([]),
  sport: z.enum(["cycling", "running", "multisport"]),
  workoutType: z.string().min(1),
  ftp: z.number().positive().optional(),
  schemaVersion: z.number().int().default(SCHEMA_VERSION),
  blocks: z.array(blockSchema)
});

export type WorkoutInput = z.input<typeof workoutSchema>;

export function parseWorkout(input: unknown) {
  return workoutSchema.parse(input);
}
