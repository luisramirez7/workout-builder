import { Block, Workout } from "../schema";
import { BlockLayout, EditorCommand, EditorSnapshot, EditorState, HitTestResult, TimelineScale } from "./types";
import { calculateSummary, clamp, cloneWorkout, recomputeStartTimes } from "./utils";

function updateBlock(workout: Workout, blockId: string, updater: (block: Block) => Block): Workout {
  return {
    ...workout,
    blocks: workout.blocks.map((block) => (block.id === blockId ? updater(block) : block))
  };
}

function mergeMeta(
  base?: Record<string, string | number | boolean>,
  patch?: Partial<Record<string, string | number | boolean>>
): Record<string, string | number | boolean> | undefined {
  if (!base && !patch) return undefined;
  const next: Record<string, string | number | boolean> = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function reorderByDropTime(blocks: Block[], blockId: string, dropTime: number): Block[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return recomputeStartTimes(blocks);

  const next = [...blocks];
  const [moving] = next.splice(index, 1);
  const targetTime = Math.max(0, dropTime);

  let cursor = 0;
  let insertAt = next.length;
  for (let i = 0; i < next.length; i += 1) {
    const block = next[i];
    const mid = cursor + block.duration / 2;
    if (targetTime < mid) {
      insertAt = i;
      break;
    }
    cursor += block.duration;
  }

  next.splice(insertAt, 0, moving);
  return recomputeStartTimes(next);
}

export function expandIntervalSet(block: Block): Block[] {
  const reps = Math.max(1, Math.round(Number(block.meta?.reps ?? 3)));
  const onDuration = Math.max(1, Math.round(Number(block.meta?.onDuration ?? 60)));
  const offDuration = Math.max(1, Math.round(Number(block.meta?.offDuration ?? 60)));
  const onTarget = Number(block.meta?.onTarget ?? block.target?.value ?? 100);
  const offTarget = Number(block.meta?.offTarget ?? block.meta?.restTarget ?? 55);

  const children: Block[] = [];
  let cursor = block.startTime;
  for (let i = 0; i < reps; i += 1) {
    children.push({
      id: `${block.id}-on-${i}`,
      type: "interval_steady",
      startTime: cursor,
      duration: onDuration,
      target: { metric: "power_pct_ftp", value: onTarget },
      meta: { virtual: true, parentId: block.id, kind: "on" },
      label: "ON"
    });
    cursor += onDuration;

    children.push({
      id: `${block.id}-off-${i}`,
      type: "free_ride",
      startTime: cursor,
      duration: offDuration,
      target: { metric: "power_pct_ftp", value: offTarget },
      meta: { virtual: true, parentId: block.id, kind: "off" },
      label: "OFF"
    });
    cursor += offDuration;
  }

  return children;
}

export class EditorEngine {
  private state: EditorState;

  constructor(initialWorkout: Workout) {
    this.state = {
      workout: {
        ...initialWorkout,
        blocks: recomputeStartTimes(initialWorkout.blocks)
      },
      selectedBlockId: null,
      history: [],
      future: []
    };
  }

  getState(): EditorState {
    return this.state;
  }

  dispatch(command: EditorCommand) {
    const previous = cloneWorkout(this.state.workout);
    const next = this.applyCommand(command, previous);

    this.state = {
      ...this.state,
      workout: next,
      history: [...this.state.history, previous],
      future: []
    };
  }

  select(blockId: string | null) {
    this.state = { ...this.state, selectedBlockId: blockId };
  }

  undo() {
    const last = this.state.history[this.state.history.length - 1];
    if (!last) return;

    const current = cloneWorkout(this.state.workout);
    this.state = {
      ...this.state,
      workout: last,
      history: this.state.history.slice(0, -1),
      future: [...this.state.future, current]
    };
  }

  redo() {
    const next = this.state.future[this.state.future.length - 1];
    if (!next) return;

    const current = cloneWorkout(this.state.workout);
    this.state = {
      ...this.state,
      workout: next,
      history: [...this.state.history, current],
      future: this.state.future.slice(0, -1)
    };
  }

  snapshot(scale: TimelineScale): EditorSnapshot {
    const workout = this.state.workout;
    const expandedBlocks = workout.blocks.flatMap((block) => (block.type === "interval_set" ? [block, ...expandIntervalSet(block)] : [block]));
    const layout = expandedBlocks.map((block) => {
      const target = block.target?.value ?? block.target?.start ?? 50;
      const yFromBottom = clamp(target, scale.intensityMin, scale.intensityMax);
      const normalized = (yFromBottom - scale.intensityMin) / (scale.intensityMax - scale.intensityMin || 1);
      return {
        id: block.id,
        x: block.startTime * scale.pxPerSecond,
        width: block.duration * scale.pxPerSecond,
        y: (1 - normalized) * (scale.intensityMax - scale.intensityMin) * scale.pxPerIntensity,
        height: Math.max(20, normalized * (scale.intensityMax - scale.intensityMin) * scale.pxPerIntensity),
        blockType: block.type,
        virtual: block.meta?.virtual === true,
        parentId: typeof block.meta?.parentId === "string" ? block.meta.parentId : undefined
      };
    });

    return {
      workout,
      summary: calculateSummary(workout),
      layout
    };
  }

  hitTest(scale: TimelineScale, point: { x: number; y: number }, tolerance = 10): HitTestResult {
    const layouts = this.snapshot(scale).layout;
    for (let index = layouts.length - 1; index >= 0; index -= 1) {
      const block = layouts[index];
      if (block.virtual) continue;
      if (point.x >= block.x && point.x <= block.x + block.width && point.y >= block.y && point.y <= block.y + block.height) {
        if (Math.abs(point.x - (block.x + block.width)) <= tolerance) return { blockId: block.id, zone: "resize_right" };
        if (Math.abs(point.y - block.y) <= tolerance) return { blockId: block.id, zone: "resize_intensity" };
        return { blockId: block.id, zone: "body" };
      }
    }

    return { blockId: null };
  }

  private applyCommand(command: EditorCommand, workout: Workout): Workout {
    switch (command.type) {
      case "add_block": {
        return { ...workout, blocks: recomputeStartTimes([...workout.blocks, command.block]) };
      }
      case "remove_block": {
        return { ...workout, blocks: recomputeStartTimes(workout.blocks.filter((block) => block.id !== command.blockId)) };
      }
      case "reorder_block": {
        return { ...workout, blocks: reorderByDropTime(workout.blocks, command.blockId, command.dropTime) };
      }
      case "update_block": {
        const updated = updateBlock(workout, command.blockId, (block) => ({
          ...block,
          ...command.patch,
          id: block.id,
          target: command.patch.target ? { ...block.target, ...command.patch.target } : block.target,
          meta: command.patch.meta ? mergeMeta(block.meta, command.patch.meta) : block.meta
        }));
        return { ...updated, blocks: recomputeStartTimes(updated.blocks) };
      }
      case "resize_block": {
        const resized = updateBlock(workout, command.blockId, (block) => {
          const target = block.target ? { ...block.target } : undefined;
          if (target) {
            if (command.targetValue !== undefined) target.value = clamp(command.targetValue, 1, 200);
            if (command.targetStart !== undefined) target.start = clamp(command.targetStart, 1, 200);
            if (command.targetEnd !== undefined) target.end = clamp(command.targetEnd, 1, 200);
          }

          return {
            ...block,
            duration: command.duration !== undefined ? Math.max(1, Math.round(command.duration)) : block.duration,
            meta: command.metaPatch ? mergeMeta(block.meta, command.metaPatch) : block.meta,
            target
          };
        });
        return { ...resized, blocks: recomputeStartTimes(resized.blocks) };
      }
      case "set_blocks": {
        return { ...workout, blocks: recomputeStartTimes(command.blocks) };
      }
      case "set_metadata": {
        return { ...workout, ...command.patch };
      }
      default:
        return workout;
    }
  }
}
