import { DEFAULT_ACCOUNT_ID, type ChannelPlugin, type ChannelSecurityDmPolicy } from "openclaw/plugin-sdk";
import { getClawbayRuntime } from "./runtime.js";

type ClawbayChannelConfig = {
  enabled?: boolean;
  pairingCode?: string;
  connectorToken?: string;
  apiBase?: string;
  agentSlug?: string;
  agentName?: string;
};

type ResolvedClawbayAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  config: ClawbayChannelConfig;
};

const clawbayChannelConfigSchema = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      enabled: { type: "boolean" },
      pairingCode: { type: "string" },
      connectorToken: { type: "string" },
      apiBase: { type: "string" },
      agentSlug: { type: "string" },
      agentName: { type: "string" },
    },
  },
};

const DEFAULT_API_BASE = "https://api.clawbay.ai";

function resolveClawbayAccount(cfg: { channels?: { clawbay?: ClawbayChannelConfig } }): ResolvedClawbayAccount {
  const config = cfg.channels?.clawbay ?? {};
  const enabled = config.enabled !== false;
  const configured = Boolean(config.connectorToken || config.pairingCode);
  return {
    accountId: DEFAULT_ACCOUNT_ID,
    enabled,
    configured,
    config,
  };
}

export const clawbayPlugin: ChannelPlugin<ResolvedClawbayAccount> = {
  id: "clawbay",
  meta: {
    id: "clawbay",
    label: "ClawBay",
    selectionLabel: "ClawBay",
    docsPath: "/channels/clawbay",
    docsLabel: "clawbay",
    blurb: "Connect OpenClaw to ClawBay with a pairing code.",
    order: 10,
  },
  capabilities: {
    chatTypes: ["direct"],
    media: false,
  },
  reload: { configPrefixes: ["channels.clawbay"] },
  configSchema: clawbayChannelConfigSchema,
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg) => resolveClawbayAccount(cfg),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.config.agentName,
      enabled: account.enabled,
      configured: account.configured,
    }),
  },
  security: {
    resolveDmPolicy: (): ChannelSecurityDmPolicy => ({
      policy: "open",
      allowFrom: ["*"],
      policyPath: "channels.clawbay.dmPolicy",
      allowFromPath: "channels.clawbay.allowFrom",
      approveHint: "ClawBay channel auto-approves.",
      normalizeEntry: (raw) => raw.trim(),
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const runtime = getClawbayRuntime();
      const cfg = runtime.config.loadConfig();
      const resolved = resolveClawbayAccount(cfg);
      const config = resolved.config;

      const apiBase = config.apiBase?.trim() || DEFAULT_API_BASE;
      let connectorToken = config.connectorToken?.trim();

      if (!connectorToken && config.pairingCode) {
        const res = await fetch(`${apiBase}/pairings/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: config.pairingCode }),
        });
        if (!res.ok) {
          throw new Error(`Pairing failed: ${res.status}`);
        }
        const data = await res.json();
        connectorToken = data?.data?.connectorToken;
        const agent = data?.data?.agent;
        if (!connectorToken || !agent) {
          throw new Error("Pairing response missing connector token");
        }
        const next = {
          ...cfg,
          channels: {
            ...cfg.channels,
            clawbay: {
              ...config,
              connectorToken,
              agentSlug: agent.slug,
              agentName: agent.name,
            },
          },
        };
        await runtime.config.writeConfigFile(next);
      }

      if (!connectorToken) {
        throw new Error("pairingCode or connectorToken required");
      }

      let stopped = false;
      let socket: WebSocket | null = null;

      const connect = () => {
        if (stopped) return;
        const wsUrl = apiBase.replace(/^http/, "ws") + `/connectors/ws?token=${connectorToken}`;
        socket = new WebSocket(wsUrl);

        socket.addEventListener("open", () => {
          ctx.log?.info?.("[clawbay] connected");
        });

        socket.addEventListener("message", async (event) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) return;
          let payload: { type?: string; runId?: string; sessionId?: string; content?: string };
          try {
            payload = JSON.parse(String(event.data));
          } catch {
            return;
          }
          if (payload.type !== "user_message" || !payload.runId || !payload.sessionId) {
            return;
          }

          const runId = payload.runId;
          const sessionId = payload.sessionId;
          const text = payload.content || "";
          const senderId = `clawbay:${sessionId}`;
          const ctxPayload = {
            Body: text,
            BodyForAgent: text,
            BodyForCommands: text,
            ChatType: "direct",
            SenderId: senderId,
            SenderName: senderId,
            SessionKey: `clawbay:${sessionId}`,
            AccountId: DEFAULT_ACCOUNT_ID,
            OriginatingChannel: "clawbay",
            OriginatingTo: senderId,
            Provider: "clawbay",
            Surface: "clawbay",
          };

          const dispatcherOptions = {
            deliver: async (replyPayload: { text?: string }, info: { kind: string }) => {
              if (!socket || socket.readyState !== WebSocket.OPEN) {
                return;
              }
              const replyText = replyPayload.text?.trim();
              if (!replyText) return;
              if (info.kind === "block") {
                socket.send(JSON.stringify({ type: "delta", runId, delta: replyText }));
                return;
              }
              socket.send(JSON.stringify({ type: "final", runId, content: replyText }));
            },
            onError: (err: unknown) => {
              socket?.send(JSON.stringify({ type: "error", runId, error: String(err) }));
            },
          };

          try {
            await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
              ctx: ctxPayload,
              cfg: runtime.config.loadConfig(),
              dispatcherOptions,
            });
          } catch (err) {
            socket.send(JSON.stringify({ type: "error", runId, error: String(err) }));
          }
        });

        const scheduleReconnect = () => {
          if (stopped) return;
          setTimeout(connect, 2000);
        };

        socket.addEventListener("close", scheduleReconnect);
        socket.addEventListener("error", () => {
          socket?.close();
        });
      };

      connect();

      return {
        stop: () => {
          stopped = true;
          socket?.close();
        },
      };
    },
  },
};
