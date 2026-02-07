export interface ExportWorkoutBlock {
  id: string;
  type: string;
  startTime: number;
  duration: number;
  target?: { value?: number; start?: number; end?: number };
  label?: string;
  meta?: Record<string, string | number | boolean>;
  children?: ExportWorkoutBlock[];
}

export interface ExportWorkout {
  name: string;
  author: string;
  description: string;
  sport: string;
  blocks: ExportWorkoutBlock[];
}

function expandIntervalSet(block: ExportWorkoutBlock): ExportWorkoutBlock[] {
  const reps = Math.max(1, Math.round(Number(block.meta?.reps ?? 3)));
  const onDuration = Math.max(1, Math.round(Number(block.meta?.onDuration ?? 60)));
  const offDuration = Math.max(1, Math.round(Number(block.meta?.offDuration ?? 60)));
  const onTarget = Number(block.meta?.onTarget ?? block.target?.value ?? 100);
  const offTarget = Number(block.meta?.offTarget ?? 55);

  const expanded: ExportWorkoutBlock[] = [];
  let cursor = block.startTime;
  for (let i = 0; i < reps; i += 1) {
    expanded.push({
      id: `${block.id}-on-${i}`,
      type: "interval_steady",
      startTime: cursor,
      duration: onDuration,
      target: { value: onTarget }
    });
    cursor += onDuration;

    expanded.push({
      id: `${block.id}-off-${i}`,
      type: "free_ride",
      startTime: cursor,
      duration: offDuration,
      target: { value: offTarget }
    });
    cursor += offDuration;
  }

  return expanded;
}

const esc = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const seconds = (value: number) => Math.max(1, Math.round(value));
const pct = (value?: number) => ((value ?? 50) / 100).toFixed(3);

function blockToZwo(block: ExportWorkoutBlock): string {
  const duration = seconds(block.duration);
  const start = pct(block.target?.start ?? block.target?.value);
  const end = pct(block.target?.end ?? block.target?.value);
  const value = pct(block.target?.value ?? block.target?.start);

  switch (block.type) {
    case "warmup":
      return `<Warmup Duration=\"${duration}\" PowerLow=\"${start}\" PowerHigh=\"${end}\"/>`;
    case "cooldown":
      return `<Cooldown Duration=\"${duration}\" PowerLow=\"${start}\" PowerHigh=\"${end}\"/>`;
    case "interval_ramp":
      return `<Ramp Duration=\"${duration}\" PowerLow=\"${start}\" PowerHigh=\"${end}\"/>`;
    case "interval_steady":
      return `<SteadyState Duration=\"${duration}\" Power=\"${value}\"/>`;
    case "free_ride":
      return `<FreeRide Duration=\"${duration}\" FlatRoad=\"1\"/>`;
    case "cadence":
      return `<SteadyState Duration=\"${duration}\" Power=\"${value}\" Cadence=\"${block.meta?.rpm ?? 90}\"/>`;
    case "text_event":
      return `<textevent timeoffset=\"${Math.round(block.startTime)}\" message=\"${esc(block.label ?? "Cue")}\"/>`;
    case "repeat": {
      const repeats = Math.max(1, Math.round(Number(block.meta?.repeat ?? 2)));
      const children = (block.children ?? []).map(blockToZwo).join("\n        ");
      return `<Repeat Repetitions=\"${repeats}\">\n        ${children}\n      </Repeat>`;
    }
    default:
      return `<SteadyState Duration=\"${duration}\" Power=\"${value}\"/>`;
  }
}

export function exportZwift(workout: ExportWorkout): string {
  const exportBlocks = workout.blocks.flatMap((block) => (block.type === "interval_set" ? expandIntervalSet(block) : [block]));
  const workoutBlocks = exportBlocks.filter((block) => block.type !== "text_event");
  const textEvents = exportBlocks.filter((block) => block.type === "text_event");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<workout_file>\n  <author>${esc(workout.author || "Workout Builder")}</author>\n  <name>${esc(workout.name)}</name>\n  <description>${esc(workout.description || "")}</description>\n  <sportType>bike</sportType>\n  <workout>\n    ${workoutBlocks.map(blockToZwo).join("\n    ")}\n  </workout>\n  ${textEvents.length ? `<textevents>\n    ${textEvents.map(blockToZwo).join("\n    ")}\n  </textevents>` : ""}\n</workout_file>\n`;
}
