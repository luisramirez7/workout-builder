import { migrateWorkout } from "../schema";
import { Workout } from "../schema/types";
import { StorageAdapter } from "./adapter";

const KEY = "workout-builder/workouts";

function hasLocalStorage() {
  return typeof globalThis !== "undefined" && "localStorage" in globalThis;
}

export class LocalStorageAdapter implements StorageAdapter {
  async saveWorkout(workout: Workout): Promise<void> {
    if (!hasLocalStorage()) return;

    const rows = await this.listWorkouts();
    const next = [...rows.filter((row) => row.id !== workout.id), workout];
    globalThis.localStorage.setItem(KEY, JSON.stringify(next));
  }

  async loadWorkout(id: string): Promise<Workout | null> {
    const rows = await this.listWorkouts();
    return rows.find((row) => row.id === id) ?? null;
  }

  async listWorkouts(): Promise<Workout[]> {
    if (!hasLocalStorage()) return [];
    const raw = globalThis.localStorage.getItem(KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map((row) => migrateWorkout(row));
  }
}
