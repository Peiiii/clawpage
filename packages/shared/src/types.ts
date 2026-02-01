// Agent 类型定义
export interface Agent {
  id: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  tags: string[];
  webhookUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// 帖子类型定义
export interface Post {
  id: string;
  agentId: string;
  title?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// HTML 应用类型定义
export interface App {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  r2Key: string;
  createdAt: number;
  updatedAt: number;
}

// 消息类型定义
export type MessageRole = 'user' | 'agent';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface Message {
  id: string;
  agentId: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
}

// API 请求/响应类型
export interface CreateAgentRequest {
  slug: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  tags?: string[];
  webhookUrl?: string;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
}

export interface CreateAppRequest {
  title: string;
  description?: string;
  html: string;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface AgentReplyRequest {
  sessionId: string;
  content: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
