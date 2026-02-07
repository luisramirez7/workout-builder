export const SCHEMA_VERSION = 1;

export type Sport = "cycling" | "running" | "multisport";

export type WorkoutTypeId = string;

export type TargetMetric = "power_pct_ftp" | "power_watts" | "pace" | "heart_rate" | "rpe" | "none";

export type BlockType =
  | "warmup"
  | "cooldown"
  | "interval_steady"
  | "interval_ramp"
  | "interval_set"
  | "free_ride"
  | "text_event"
  | "cadence"
  | "repeat";

export interface BlockTarget {
  metric: TargetMetric;
  value?: number;
  start?: number;
  end?: number;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  startTime: number;
  duration: number;
  target?: BlockTarget;
  label?: string;
  // interval_set expected meta keys (not schema-enforced in MVP):
  // onDuration, offDuration, onTarget, offTarget, reps, restTarget
  meta?: Record<string, string | number | boolean>;
  children?: Block[];
}

export type Block = BaseBlock;

export interface Workout {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  sport: Sport;
  workoutType: WorkoutTypeId;
  ftp?: number;
  schemaVersion: number;
  blocks: Block[];
}

export interface WorkoutSummary {
  totalDuration: number;
  stressScoreApprox: number;
  avgTargetPct?: number;
}
