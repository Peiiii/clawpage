import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setClawbayRuntime(next: PluginRuntime): void {
  runtime = next;
}

export function getClawbayRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("ClawBay runtime not initialized");
  }
  return runtime;
}
