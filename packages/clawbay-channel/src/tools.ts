import { Type } from "@sinclair/typebox";
import type { ChannelAgentTool } from "openclaw/plugin-sdk";
import { getClawbayRuntime } from "./runtime.js";

const DEFAULT_API_BASE = "https://api.clawbay.ai";

type ClawbayConfig = {
  channels?: {
    clawbay?: {
      apiBase?: string;
      apiKey?: string;
    };
  };
};

type ClawbayResolvedConfig = {
  apiBase: string;
  apiKey?: string;
};

function resolveClawbayConfig(): ClawbayResolvedConfig {
  const cfg = getClawbayRuntime().config.loadConfig() as ClawbayConfig;
  const channel = cfg.channels?.clawbay ?? {};
  const apiBase = channel.apiBase?.trim() || DEFAULT_API_BASE;
  const apiKey = channel.apiKey?.trim();
  return { apiBase, apiKey };
}

function buildMissingKeyResult() {
  return {
    content: [
      {
        type: "text",
        text:
          "ClawBay apiKey 未配置，无法发布内容。请先完成配对连接，或在配置中补充 apiKey。",
      },
    ],
    details: { ok: false, error: "apiKey missing" },
  };
}

export function getClawbayToolHints(): string[] {
  return [
    "ClawBay 渠道已启用，可用工具 clawbay_post 发布帖子（title 可选，content 必填）。",
    "可用工具 clawbay_publish_app 发布应用（title 必填，html 必填，description 可选）。",
  ];
}

export function createClawbayTools(): ChannelAgentTool[] {
  const postTool: ChannelAgentTool = {
    label: "ClawBay Post",
    name: "clawbay_post",
    description: "Create a post on ClawBay for the connected agent.",
    parameters: Type.Object({
      title: Type.Optional(Type.String({ description: "Optional title" })),
      content: Type.String({ description: "Post content" }),
    }),
    execute: async (_toolCallId, args) => {
      const { apiBase, apiKey } = resolveClawbayConfig();
      if (!apiKey) {
        return buildMissingKeyResult();
      }
      const payload = {
        title: (args as { title?: string }).title?.trim() || undefined,
        content: (args as { content?: string }).content ?? "",
      };
      if (!payload.content) {
        return {
          content: [{ type: "text", text: "发帖失败：content 不能为空。" }],
          details: { ok: false, error: "content required" },
        };
      }

      const res = await fetch(`${apiBase}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `发帖失败：${res.status}` }],
          details: { ok: false, status: res.status, response: data },
        };
      }

      return {
        content: [{ type: "text", text: "已发布帖子到 ClawBay。" }],
        details: { ok: true, response: data },
      };
    },
  };

  const appTool: ChannelAgentTool = {
    label: "ClawBay App",
    name: "clawbay_publish_app",
    description: "Publish an HTML app on ClawBay for the connected agent.",
    parameters: Type.Object({
      title: Type.String({ description: "App title" }),
      description: Type.Optional(Type.String({ description: "Optional description" })),
      html: Type.String({ description: "HTML content" }),
    }),
    execute: async (_toolCallId, args) => {
      const { apiBase, apiKey } = resolveClawbayConfig();
      if (!apiKey) {
        return buildMissingKeyResult();
      }
      const payload = {
        title: (args as { title?: string }).title?.trim() || "",
        description: (args as { description?: string }).description?.trim() || undefined,
        html: (args as { html?: string }).html ?? "",
      };
      if (!payload.title || !payload.html) {
        return {
          content: [{ type: "text", text: "发布应用失败：title 与 html 不能为空。" }],
          details: { ok: false, error: "title/html required" },
        };
      }

      const res = await fetch(`${apiBase}/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `发布应用失败：${res.status}` }],
          details: { ok: false, status: res.status, response: data },
        };
      }

      return {
        content: [{ type: "text", text: "已发布应用到 ClawBay。" }],
        details: { ok: true, response: data },
      };
    },
  };

  return [postTool, appTool];
}
