import { exportGarmin } from "@workout-builder/exporter-garmin";
import { exportWahoo } from "@workout-builder/exporter-wahoo";
import { exportZwift } from "@workout-builder/exporter-zwift";
import { Block, BlockTemplate, SCHEMA_VERSION, Workout, WorkoutTypePlugin } from "@workout-builder/core";

const cyclingBlocks: BlockTemplate[] = [
  {
    type: "warmup",
    label: "Warm up",
    defaultDuration: 600,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", start: 50, end: 75 }
  },
  {
    type: "cooldown",
    label: "Cool down",
    defaultDuration: 600,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", start: 70, end: 45 }
  },
  {
    type: "interval_steady",
    label: "Steady interval",
    defaultDuration: 300,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", value: 95 }
  },
  {
    type: "interval_set",
    label: "Intervals",
    defaultDuration: 900,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", value: 100 }
  },
  {
    type: "interval_ramp",
    label: "Ramp",
    defaultDuration: 240,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", start: 85, end: 105 }
  },
  {
    type: "free_ride",
    label: "Free ride",
    defaultDuration: 300,
    allowsVerticalResize: false,
    defaultTarget: { metric: "none", value: 50 }
  },
  {
    type: "text_event",
    label: "Text event",
    defaultDuration: 1,
    allowsVerticalResize: false,
    defaultTarget: { metric: "none", value: 50 }
  },
  {
    type: "cadence",
    label: "Cadence",
    defaultDuration: 180,
    allowsVerticalResize: true,
    defaultTarget: { metric: "power_pct_ftp", value: 85 }
  },
  {
    type: "repeat",
    label: "Repeat",
    defaultDuration: 300,
    allowsVerticalResize: false,
    defaultTarget: { metric: "power_pct_ftp", value: 90 }
  }
];

function makeDefaultBlock(type: Block["type"], startTime: number, id?: string): Block {
  if (type === "interval_set") {
    return {
      id: id ?? `${type}-${Math.random().toString(36).slice(2, 10)}`,
      type,
      startTime,
      duration: 900,
      target: { metric: "power_pct_ftp", value: 105 },
      meta: {
        reps: 3,
        onDuration: 60,
        offDuration: 60,
        onTarget: 105,
        offTarget: 55
      },
      label: "Intervals"
    };
  }

  const template = cyclingBlocks.find((entry) => entry.type === type);
  if (!template) {
    throw new Error(`Unsupported block type: ${type}`);
  }

  return {
    id: id ?? `${type}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    startTime,
    duration: template.defaultDuration,
    target: template.defaultTarget,
    meta: type === "repeat" ? { repeat: 2 } : type === "cadence" ? { rpm: 95 } : undefined,
    label: type === "text_event" ? "Focus" : template.label
  };
}

export const cyclingStructuredPlugin: WorkoutTypePlugin = {
  id: "cycling-structured",
  label: "Cycling Structured",
  sport: "cycling",
  blockCatalog: () => cyclingBlocks,
  targetMetrics: () => ["power_pct_ftp", "power_watts", "heart_rate", "rpe"],
  validate: (workout: Workout) => {
    const errors: string[] = [];
    if (workout.sport !== "cycling") errors.push("CyclingStructured only supports cycling workouts");
    if (workout.blocks.length === 0) errors.push("Workout must include at least one block");

    workout.blocks.forEach((block) => {
      if (block.duration <= 0) errors.push(`Block ${block.id} duration must be > 0`);
      if (block.type === "warmup") {
        if (block.target?.value !== undefined && (block.target.start === undefined || block.target.end === undefined)) {
          block.target = {
            metric: block.target.metric,
            start: block.target.start ?? block.target.value,
            end: block.target.end ?? block.target.value
          };
        }
        if (block.target?.start === undefined || block.target?.end === undefined) {
          errors.push(`Block ${block.id} warmup must be ramp (start/end)`);
        }
      }
      if (block.type === "interval_steady" && block.target?.value === undefined) {
        errors.push(`Block ${block.id} steady intervals need target value`);
      }
    });

    return { valid: errors.length === 0, errors };
  },
  createDefaultBlock: (type, startTime) => makeDefaultBlock(type, startTime),
  exporters: [
    { id: "zwift", label: "Zwift (.zwo)", fileExtension: ".zwo", export: exportZwift },
    { id: "garmin", label: "Garmin (.xml)", fileExtension: ".xml", export: exportGarmin },
    { id: "wahoo", label: "Wahoo (.xml)", fileExtension: ".xml", export: exportWahoo }
  ],
  normalize: (workout) => ({ ...workout, schemaVersion: SCHEMA_VERSION })
};

export function createCyclingWorkout(partial?: Partial<Workout>): Workout {
  return {
    id: partial?.id ?? `workout-${Date.now()}`,
    name: partial?.name ?? "New Workout",
    description: partial?.description ?? "",
    author: partial?.author ?? "",
    tags: partial?.tags ?? [],
    sport: "cycling",
    workoutType: "cycling-structured",
    ftp: partial?.ftp,
    schemaVersion: SCHEMA_VERSION,
    blocks: partial?.blocks ?? []
  };
}
