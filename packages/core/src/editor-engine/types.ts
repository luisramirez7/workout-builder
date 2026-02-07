import { Block, BlockType, Workout, WorkoutSummary } from "../schema";

export interface TimelineScale {
  pxPerSecond: number;
  pxPerIntensity: number;
  intensityMin: number;
  intensityMax: number;
}

export interface BlockLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blockType?: BlockType;
  virtual?: boolean;
  parentId?: string;
}

export type HitZone = "body" | "resize_right" | "resize_intensity";

export interface HitTestResult {
  blockId: string | null;
  zone?: HitZone;
}

export type EditorCommand =
  | { type: "add_block"; block: Block }
  | { type: "remove_block"; blockId: string }
  | { type: "reorder_block"; blockId: string; dropTime: number }
  | { type: "update_block"; blockId: string; patch: Partial<Block> }
  | {
      type: "resize_block";
      blockId: string;
      duration?: number;
      targetValue?: number;
      targetStart?: number;
      targetEnd?: number;
      metaPatch?: Partial<Record<string, string | number | boolean>>;
    }
  | { type: "set_blocks"; blocks: Block[] }
  | { type: "set_metadata"; patch: Partial<Pick<Workout, "name" | "description" | "author" | "tags" | "ftp">> };

export interface EditorState {
  workout: Workout;
  selectedBlockId: string | null;
  history: Workout[];
  future: Workout[];
}

export interface NewBlockConfig {
  id: string;
  type: BlockType;
  duration: number;
  targetValue?: number;
  targetStart?: number;
  targetEnd?: number;
  label?: string;
}

export interface EditorSnapshot {
  workout: Workout;
  summary: WorkoutSummary;
  layout: BlockLayout[];
}
