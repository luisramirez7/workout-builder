import { create } from "zustand";
import { Block, EditorEngine, Workout, WorkoutTypePlugin } from "@workout-builder/core";
import { createCyclingWorkout, cyclingStructuredPlugin } from "@workout-builder/plugins-cycling-structured";

interface EditorStore {
  plugin: WorkoutTypePlugin;
  engine: EditorEngine;
  refreshKey: number;
  selectedBlockId: string | null;
  setPlugin: (plugin: WorkoutTypePlugin) => void;
  setWorkout: (workout: Workout) => void;
  addBlock: (type: Block["type"]) => void;
  reorderBlock: (blockId: string, dropTime: number) => void;
  updateBlockProps: (blockId: string, patch: Partial<Block>) => void;
  resizeBlock: (
    blockId: string,
    payload: {
      duration?: number;
      targetValue?: number;
      targetStart?: number;
      targetEnd?: number;
      metaPatch?: Partial<Record<string, string | number | boolean>>;
    }
  ) => void;
  removeBlock: (blockId: string) => void;
  updateMetadata: (patch: Partial<Pick<Workout, "name" | "description" | "author" | "tags">>) => void;
  selectBlock: (blockId: string | null) => void;
  undo: () => void;
  redo: () => void;
}

const initialWorkout = createCyclingWorkout({
  blocks: [
    {
      id: "warmup-1",
      type: "warmup",
      startTime: 0,
      duration: 600,
      target: { metric: "power_pct_ftp", start: 50, end: 75 },
      label: "Warm up"
    },
    {
      id: "interval-1",
      type: "interval_steady",
      startTime: 600,
      duration: 300,
      target: { metric: "power_pct_ftp", value: 95 },
      label: "Intervals"
    },
    {
      id: "cooldown-1",
      type: "cooldown",
      startTime: 900,
      duration: 300,
      target: { metric: "power_pct_ftp", start: 70, end: 45 },
      label: "Cool down"
    }
  ]
});

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function touch(set: (fn: (state: EditorStore) => EditorStore) => void, selectedBlockId?: string | null) {
  set((state) => ({ ...state, refreshKey: state.refreshKey + 1, selectedBlockId: selectedBlockId ?? state.selectedBlockId }));
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  plugin: cyclingStructuredPlugin,
  engine: new EditorEngine(initialWorkout),
  refreshKey: 0,
  selectedBlockId: null,
  setPlugin: (plugin) => {
    set((state) => ({ ...state, plugin }));
  },
  setWorkout: (workout) => {
    set((state) => ({ ...state, engine: new EditorEngine(workout), selectedBlockId: null, refreshKey: state.refreshKey + 1 }));
  },
  addBlock: (type) => {
    const { engine, plugin } = get();
    const current = engine.getState().workout;
    const end = current.blocks.reduce((sum, block) => sum + block.duration, 0);
    const block =
      plugin.createDefaultBlock?.(type, end) ?? {
        id: genId(type),
        type,
        startTime: end,
        duration: 300,
        target: { metric: "none", value: 50 }
      };

    engine.dispatch({ type: "add_block", block: { ...block, id: block.id || genId(type) } });
    touch(set, block.id);
  },
  reorderBlock: (blockId, dropTime) => {
    const { engine } = get();
    engine.dispatch({ type: "reorder_block", blockId, dropTime });
    touch(set);
  },
  updateBlockProps: (blockId, patch) => {
    const { engine } = get();
    engine.dispatch({ type: "update_block", blockId, patch });
    touch(set);
  },
  resizeBlock: (blockId, payload) => {
    const { engine } = get();
    engine.dispatch({ type: "resize_block", blockId, ...payload });
    touch(set);
  },
  removeBlock: (blockId) => {
    const { engine } = get();
    engine.dispatch({ type: "remove_block", blockId });
    touch(set, null);
  },
  updateMetadata: (patch) => {
    const { engine } = get();
    engine.dispatch({ type: "set_metadata", patch });
    touch(set);
  },
  selectBlock: (blockId) => {
    const { engine } = get();
    engine.select(blockId);
    touch(set, blockId);
  },
  undo: () => {
    const { engine } = get();
    engine.undo();
    touch(set);
  },
  redo: () => {
    const { engine } = get();
    engine.redo();
    touch(set);
  }
}));
