export interface ExportWorkoutBlock {
  type: string;
  duration: number;
  target?: { value?: number; start?: number };
}

export interface ExportWorkout {
  name: string;
  sport: string;
  blocks: ExportWorkoutBlock[];
}

export function exportGarmin(workout: ExportWorkout): string {
  const steps = workout.blocks
    .map((block, index) => {
      const target = block.target?.value ?? block.target?.start ?? 50;
      return `    <step order=\"${index + 1}\" type=\"${block.type}\" duration=\"${Math.round(block.duration)}\" intensityPct=\"${Math.round(target)}\" />`;
    })
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<garminWorkout name=\"${workout.name}\" sport=\"${workout.sport}\">\n${steps}\n</garminWorkout>\n`;
}
