import { Block, Workout, WorkoutSummary } from "../schema";

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function recomputeStartTimes(blocks: Block[]): Block[] {
  let cursor = 0;
  return blocks.map((block) => {
    const next = { ...block, startTime: cursor, duration: Math.max(1, block.duration) };
    cursor += next.duration;
    return next;
  });
}

export const sortAndSnapBlocks = recomputeStartTimes;

export function calculateSummary(workout: Workout): WorkoutSummary {
  const totalDuration = workout.blocks.reduce((sum, block) => sum + block.duration, 0);
  const weighted = workout.blocks.reduce((sum, block) => {
    const value = block.target?.value ?? block.target?.start ?? 0;
    return sum + value * block.duration;
  }, 0);

  const avgTargetPct = totalDuration > 0 ? weighted / totalDuration : undefined;
  const stressScoreApprox = avgTargetPct ? Math.round((avgTargetPct * avgTargetPct * totalDuration) / 3600) : 0;

  return { totalDuration, stressScoreApprox, avgTargetPct };
}

export function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    tags: [...workout.tags],
    blocks: workout.blocks.map((block) => ({
      ...block,
      target: block.target ? { ...block.target } : undefined,
      meta: block.meta ? { ...block.meta } : undefined,
      children: block.children?.map((child) => ({ ...child }))
    }))
  };
}
