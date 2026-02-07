import { SCHEMA_VERSION, Workout } from "./types";
import { parseWorkout } from "./schema";

export function migrateWorkout(input: unknown): Workout {
  const parsed = parseWorkout(input);
  if (parsed.schemaVersion === SCHEMA_VERSION) {
    return parsed as Workout;
  }

  // V1 MVP migration placeholder. Future versions can branch here.
  return {
    ...(parsed as Workout),
    schemaVersion: SCHEMA_VERSION
  };
}
