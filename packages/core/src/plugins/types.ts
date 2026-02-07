import { Block, BlockType, Sport, TargetMetric, Workout } from "../schema";

export interface BlockTemplate {
  type: BlockType;
  label: string;
  defaultDuration: number;
  allowsVerticalResize: boolean;
  defaultTarget?: {
    metric: TargetMetric;
    value?: number;
    start?: number;
    end?: number;
  };
}

export interface ExporterAdapter {
  id: string;
  label: string;
  fileExtension: string;
  export: (workout: Workout) => string;
}

export interface WorkoutTypePlugin {
  id: string;
  label: string;
  sport: Sport;
  blockCatalog: () => BlockTemplate[];
  targetMetrics: () => TargetMetric[];
  validate: (workout: Workout) => { valid: boolean; errors: string[] };
  normalize?: (workout: Workout) => Workout;
  serialize?: (workout: Workout) => unknown;
  deserialize?: (input: unknown) => Workout;
  exporters: ExporterAdapter[];
  createDefaultBlock?: (type: BlockType, startTime: number) => Block;
}
