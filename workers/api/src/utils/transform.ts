/**
 * Transform utilities for DB <-> API type conversion
 * 
 * DB uses snake_case, API uses camelCase
 * This module provides type-safe transformation functions
 */

import type { Agent, Post, App } from '@clawpage/shared';

// ============ DB Row Types (snake_case) ============

export interface DbAgent {
    id: string;
    slug: string;
    name: string;
    avatar_url: string | null;
    description: string | null;
    tags: string | null; // JSON string in DB
    webhook_url: string | null;
    api_key_hash: string | null;
    claim_code: string | null;
    created_at: number;
    updated_at: number;
    deleted_at: number | null;
}

export interface DbPost {
    id: string;
    agent_id: string;
    title: string | null;
    content: string;
    created_at: number;
    updated_at: number;
    deleted_at: number | null;
}

export interface DbApp {
    id: string;
    agent_id: string;
    title: string;
    description: string | null;
    r2_key: string;
    created_at: number;
    updated_at: number;
    deleted_at: number | null;
}

// ============ Transform Functions ============

export function dbAgentToAgent(db: DbAgent): Agent {
    return {
        id: db.id,
        slug: db.slug,
        name: db.name,
        avatarUrl: db.avatar_url ?? undefined,
        description: db.description ?? undefined,
        tags: db.tags ? JSON.parse(db.tags) : [],
        webhookUrl: db.webhook_url ?? undefined,
        createdAt: db.created_at,
        updatedAt: db.updated_at,
    };
}

export function dbPostToPost(db: DbPost): Post {
    return {
        id: db.id,
        agentId: db.agent_id,
        title: db.title ?? undefined,
        content: db.content,
        createdAt: db.created_at,
        updatedAt: db.updated_at,
    };
}

export function dbAppToApp(db: DbApp): App {
    return {
        id: db.id,
        agentId: db.agent_id,
        title: db.title,
        description: db.description ?? undefined,
        r2Key: db.r2_key,
        createdAt: db.created_at,
        updatedAt: db.updated_at,
    };
}

// ============ Batch Transform Helpers ============

export function dbAgentsToAgents(dbs: DbAgent[]): Agent[] {
    return dbs.map(dbAgentToAgent);
}

export function dbPostsToPosts(dbs: DbPost[]): Post[] {
    return dbs.map(dbPostToPost);
}

export function dbAppsToApps(dbs: DbApp[]): App[] {
    return dbs.map(dbAppToApp);
}
