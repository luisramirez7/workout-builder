# Cross-Platform Visual Workout Builder Spec

## Minimum Engine + Schema (Sport-Agnostic)
The minimum required core to reproduce the screenshot interaction model while staying sport-agnostic is:

1. A versioned canonical workout schema with timeline-native blocks:
   - `Workout`: metadata (`name`, `description`, `author`, `tags`), `sport`, `workoutType`, optional `ftp`, `schemaVersion`, and ordered `blocks`.
   - `Block`: `id`, `type`, `startTime`, `duration`, optional target (`metric` + `value|start|end`), optional `children` for repeat containers.
2. A deterministic layout/snap engine:
   - Convert blocks to x/y/width/height by scale.
   - Snap blocks end-to-end after add/move/resize.
   - Hit testing for block selection and resize edges.
3. Command-based editor engine:
   - Commands: add/remove/move/resize/set metadata/set blocks.
   - Undo/redo via history and future stacks.
4. Plugin API (`WorkoutTypePlugin`) to keep sport-specific behavior out of core:
   - Block catalog, target metrics, validator, exporter list, optional normalize/serialize hooks.

This is enough to faithfully model drag/reorder/resize/delete/undo behavior from the screenshot while allowing future workout types (for example Runna) to plug in without rewriting editor internals.

## Architecture

### Monorepo layout

- `packages/core`: canonical schema, plugin contracts, editor engine, storage adapters, cycling plugin.
- `packages/exporters/zwift`: `.zwo` adapter (implemented as primary target).
- `packages/exporters/garmin`: XML best-effort adapter.
- `packages/exporters/wahoo`: XML best-effort adapter.
- `packages/app`: shared React Native Web + native editor screen.
- `apps/web`: Expo web entry app.
- `apps/mobile`: Expo native entry app.
- `examples/workouts`: canonical sample workouts.
- `examples/exports`: generated exporter output samples.

### Runtime model

1. UI dispatches editor commands.
2. `EditorEngine` mutates canonical workout via command handlers.
3. Engine snaps/re-sorts timeline blocks and emits layout.
4. Plugin validates + exposes exporters.
5. Export pipeline maps `Workout -> platform file`.

## Schema

### Workout

- `id: string`
- `name: string`
- `description: string`
- `author: string`
- `tags: string[]`
- `sport: "cycling" | "running" | "multisport"`
- `workoutType: string`
- `ftp?: number`
- `schemaVersion: number`
- `blocks: Block[]`

### Block

- `id: string`
- `type: "warmup" | "cooldown" | "interval_steady" | "interval_ramp" | "free_ride" | "text_event" | "cadence" | "repeat"`
- `startTime: number`
- `duration: number`
- `target?: { metric, value?, start?, end? }`
- `children?: Block[]`

## Plugin system

`WorkoutTypePlugin`

- `id`, `label`, `sport`
- `blockCatalog()`
- `targetMetrics()`
- `validate(workout)`
- `exporters`
- optional `normalize`, `serialize`, `deserialize`, `createDefaultBlock`

### MVP plugin: CyclingStructured

- Metrics: `%FTP`, watts, HR, RPE.
- Block presets for warmup/cooldown/interval/free ride/text/cadence/repeat.
- Exporters: Zwift, Garmin, Wahoo.

## Runna plan (future)

Keep Runna as separate plugin module/package:

- `packages/core/plugins/runna-structured` (or separate workspace package)
- Reuse canonical schema and editor engine.
- Extend target metrics to running pace/HR/RPE.
- Add optional non-time constructs in plugin-normalized layer (distance reps), while canonical MVP remains time-based.
- Add Runna exporter adapters later.

## Local storage

- Adapter interface (`StorageAdapter`) supports web/native backing stores.
- MVP includes in-memory and web localStorage adapter.
- Native `AsyncStorage` adapter can be added with same interface.

## Local dev

1. `npm install`
2. Web: `npm run dev:web`
3. Mobile: `npm run dev:mobile`
4. Typecheck: `npm run typecheck`

## Notes on fidelity

- Layout and interaction model mirror Zwift-style builder: top metadata, central timeline with zone grid, right block palette, trash delete zone, inspector, undo/redo.
- UI stays cross-platform with React Native primitives, gesture-handler, reanimated, and SVG.
