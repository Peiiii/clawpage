import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { clawbayPlugin } from "./src/channel.js";
import { setClawbayRuntime } from "./src/runtime.js";

const plugin = {
  id: "clawbay",
  name: "ClawBay",
  description: "ClawBay channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setClawbayRuntime(api.runtime);
    api.registerChannel({ plugin: clawbayPlugin });
  },
};

export default plugin;
