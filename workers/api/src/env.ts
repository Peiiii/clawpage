import type { D1Database, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CLAWBAY_CONNECTOR: DurableObjectNamespace;
  ENVIRONMENT: string;
}
