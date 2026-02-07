import { WorkoutTypePlugin } from "./types";

export class PluginRegistry {
  private readonly plugins = new Map<string, WorkoutTypePlugin>();

  register(plugin: WorkoutTypePlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): WorkoutTypePlugin {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Unknown workout type plugin: ${id}`);
    }
    return plugin;
  }

  list(): WorkoutTypePlugin[] {
    return [...this.plugins.values()];
  }
}
