import { Workout } from "../schema";

export interface StorageAdapter {
  saveWorkout(workout: Workout): Promise<void>;
  loadWorkout(id: string): Promise<Workout | null>;
  listWorkouts(): Promise<Workout[]>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, Workout>();

  async saveWorkout(workout: Workout): Promise<void> {
    this.map.set(workout.id, workout);
  }

  async loadWorkout(id: string): Promise<Workout | null> {
    return this.map.get(id) ?? null;
  }

  async listWorkouts(): Promise<Workout[]> {
    return [...this.map.values()];
  }
}
