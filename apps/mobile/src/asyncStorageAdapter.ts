import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAdapter, Workout, migrateWorkout } from "@workout-builder/core";

const KEY = "workout-builder/workouts";

export class AsyncStorageAdapter implements StorageAdapter {
  async saveWorkout(workout: Workout): Promise<void> {
    const rows = await this.listWorkouts();
    const next = [...rows.filter((row) => row.id !== workout.id), workout];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  async loadWorkout(id: string): Promise<Workout | null> {
    const rows = await this.listWorkouts();
    return rows.find((row) => row.id === id) ?? null;
  }

  async listWorkouts(): Promise<Workout[]> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map((row) => migrateWorkout(row));
  }
}
