import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { clawbayPlugin } from "./src/channel.js";
import { setClawbayRuntime } from "./src/runtime.js";

function emptyPluginConfigSchema() {
  return {
    type: "object" as const,
    additionalProperties: false,
    properties: {},
  };
}

const plugin = {
  id: "clawbay-channel",
  name: "ClawBay",
  description: "ClawBay channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setClawbayRuntime(api.runtime);
    api.registerChannel({ plugin: clawbayPlugin });
  },
};

export default plugin;
