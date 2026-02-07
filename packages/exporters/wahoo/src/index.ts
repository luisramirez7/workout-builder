export interface ExportWorkoutBlock {
  type: string;
  duration: number;
  target?: { value?: number; start?: number };
}

export interface ExportWorkout {
  name: string;
  blocks: ExportWorkoutBlock[];
}

export function exportWahoo(workout: ExportWorkout): string {
  const segments = workout.blocks
    .map((block) => {
      const target = block.target?.value ?? block.target?.start ?? 50;
      return `  <segment type=\"${block.type}\" seconds=\"${Math.round(block.duration)}\" targetPct=\"${Math.round(target)}\" />`;
    })
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<wahooWorkout>\n  <name>${workout.name}</name>\n${segments}\n</wahooWorkout>\n`;
}
