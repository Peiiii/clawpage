import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../env';

const SESSION_COOKIE_NAME = 'clawbay_session';
const GOOGLE_PROVIDER = 'google';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_RETURN_TO = 'https://clawbay.ai/';

const ALLOWED_RETURN_HOSTS = new Set(['clawbay.ai', 'www.clawbay.ai']);

type OAuthStateRow = {
  id: string;
  returnTo: string;
  expiresAt: number;
};

type OAuthAccountRow = {
  userId: string;
};

type UserRow = {
  id: string;
};

type SessionUserRow = {
  sessionId: string;
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: number;
  lastLoginAt: number | null;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function getGoogleClientConfig(env: Env): { clientId: string; clientSecret: string } | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

function resolveReturnTo(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RETURN_TO;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return DEFAULT_RETURN_TO;
    }

    if (ALLOWED_RETURN_HOSTS.has(url.hostname)) {
      return url.toString();
    }

    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.protocol === 'http:') {
      return url.toString();
    }

    if (url.hostname.endsWith('.clawpage.pages.dev') && url.protocol === 'https:') {
      return url.toString();
    }

    return DEFAULT_RETURN_TO;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

function buildGoogleRedirectUri(requestUrl: string): string {
  const origin = new URL(requestUrl).origin;
  return `${origin}/auth/google/callback`;
}

function generateOpaqueToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function appendAuthResult(returnTo: string, status: 'success' | 'error', message?: string): string {
  const url = new URL(returnTo);
  url.searchParams.set('auth', status);
  if (message) {
    url.searchParams.set('authMessage', message);
  }
  return url.toString();
}

function getCookieSecurityOptions(requestUrl: string, maxAgeSeconds?: number) {
  const secure = new URL(requestUrl).protocol === 'https:';
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'None' as const : 'Lax' as const,
    path: '/',
    ...(typeof maxAgeSeconds === 'number' ? { maxAge: maxAgeSeconds } : {}),
  };
}

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.get('/google/start', async (c) => {
  const config = getGoogleClientConfig(c.env);
  if (!config) {
    return c.json({ success: false, error: 'Google OAuth is not configured' }, 500);
  }

  const returnTo = resolveReturnTo(c.req.query('returnTo'));
  const state = generateOpaqueToken(24);
  const now = Date.now();
  const redirectUri = buildGoogleRedirectUri(c.req.url);

  await c.env.DB.prepare(
    `INSERT INTO oauth_states (id, state, provider, return_to, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), state, GOOGLE_PROVIDER, returnTo, now, now + OAUTH_STATE_TTL_MS)
    .run();

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', config.clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('prompt', 'select_account');

  return c.redirect(authorizationUrl.toString(), 302);
});

authRouter.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const oauthError = c.req.query('error');

  if (!state) {
    return c.json({ success: false, error: 'Missing OAuth state' }, 400);
  }

  const stateRow = await c.env.DB.prepare(
    `SELECT id, return_to as returnTo, expires_at as expiresAt
     FROM oauth_states
     WHERE state = ? AND provider = ? AND consumed_at IS NULL
     LIMIT 1`
  )
    .bind(state, GOOGLE_PROVIDER)
    .first<OAuthStateRow>();

  if (!stateRow) {
    return c.json({ success: false, error: 'Invalid OAuth state' }, 400);
  }

  const returnTo = resolveReturnTo(stateRow.returnTo);
  const now = Date.now();

  await c.env.DB.prepare('UPDATE oauth_states SET consumed_at = ? WHERE id = ?')
    .bind(now, stateRow.id)
    .run();

  if (stateRow.expiresAt < now) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'oauth_state_expired'), 302);
  }

  if (oauthError) {
    return c.redirect(appendAuthResult(returnTo, 'error', oauthError), 302);
  }

  if (!code) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'missing_code'), 302);
  }

  const config = getGoogleClientConfig(c.env);
  if (!config) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'oauth_not_configured'), 302);
  }

  const redirectUri = buildGoogleRedirectUri(c.req.url);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  const tokenPayload = await tokenResponse.json<GoogleTokenResponse>();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const reason = tokenPayload.error || 'token_exchange_failed';
    return c.redirect(appendAuthResult(returnTo, 'error', reason), 302);
  }

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'userinfo_failed'), 302);
  }

  const profile = await userInfoResponse.json<GoogleUserInfo>();
  const profileEmail = profile.email?.trim().toLowerCase();

  if (!profile.sub || !profileEmail) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'profile_incomplete'), 302);
  }

  if (profile.email_verified === false) {
    return c.redirect(appendAuthResult(returnTo, 'error', 'email_not_verified'), 302);
  }

  let userId: string;
  const accountRow = await c.env.DB.prepare(
    `SELECT user_id as userId
     FROM oauth_accounts
     WHERE provider = ? AND provider_user_id = ?
     LIMIT 1`
  )
    .bind(GOOGLE_PROVIDER, profile.sub)
    .first<OAuthAccountRow>();

  if (accountRow) {
    userId = accountRow.userId;
    await c.env.DB.prepare(
      `UPDATE users
       SET email = ?, name = ?, avatar_url = ?, updated_at = ?, last_login_at = ?
       WHERE id = ?`
    )
      .bind(profileEmail, profile.name ?? null, profile.picture ?? null, now, now, userId)
      .run();
  } else {
    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .bind(profileEmail)
      .first<UserRow>();

    userId = existingUser?.id ?? crypto.randomUUID();

    if (existingUser) {
      await c.env.DB.prepare(
        `UPDATE users
         SET name = ?, avatar_url = ?, updated_at = ?, last_login_at = ?
         WHERE id = ?`
      )
        .bind(profile.name ?? null, profile.picture ?? null, now, now, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, avatar_url, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(userId, profileEmail, profile.name ?? null, profile.picture ?? null, now, now, now)
        .run();
    }

    await c.env.DB.prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, raw_profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, provider_user_id)
       DO UPDATE SET user_id = excluded.user_id, email = excluded.email, raw_profile = excluded.raw_profile, updated_at = excluded.updated_at`
    )
      .bind(
        crypto.randomUUID(),
        userId,
        GOOGLE_PROVIDER,
        profile.sub,
        profileEmail,
        JSON.stringify(profile),
        now,
        now
      )
      .run();
  }

  const sessionToken = generateOpaqueToken(32);
  const sessionHash = await sha256Hex(sessionToken);
  const sessionId = crypto.randomUUID();
  const expiresAt = now + SESSION_TTL_MS;

  await c.env.DB.prepare(
    `INSERT INTO user_sessions (id, user_id, token_hash, user_agent, ip, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      sessionId,
      userId,
      sessionHash,
      c.req.header('User-Agent') ?? null,
      c.req.header('CF-Connecting-IP') ?? null,
      now,
      expiresAt
    )
    .run();

  setCookie(
    c,
    SESSION_COOKIE_NAME,
    sessionToken,
    getCookieSecurityOptions(c.req.url, Math.floor(SESSION_TTL_MS / 1000))
  );

  return c.redirect(appendAuthResult(returnTo, 'success'), 302);
});

authRouter.get('/me', async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return c.json({ authenticated: false });
  }

  const sessionHash = await sha256Hex(sessionToken);
  const now = Date.now();

  const row = await c.env.DB.prepare(
    `SELECT
       us.id as sessionId,
       us.expires_at as expiresAt,
       u.id as userId,
       u.email,
       u.name,
       u.avatar_url as avatarUrl,
       u.created_at as createdAt,
       u.last_login_at as lastLoginAt
     FROM user_sessions us
     JOIN users u ON u.id = us.user_id
     WHERE us.token_hash = ?
       AND us.revoked_at IS NULL
       AND us.expires_at > ?
     LIMIT 1`
  )
    .bind(sessionHash, now)
    .first<SessionUserRow>();

  if (!row) {
    deleteCookie(c, SESSION_COOKIE_NAME, getCookieSecurityOptions(c.req.url));
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      sessionExpiresAt: row.expiresAt,
    },
  });
});

authRouter.post('/logout', async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken) {
    const sessionHash = await sha256Hex(sessionToken);
    await c.env.DB.prepare(
      'UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
    )
      .bind(Date.now(), sessionHash)
      .run();
  }

  deleteCookie(c, SESSION_COOKIE_NAME, getCookieSecurityOptions(c.req.url));
  return c.json({ success: true });
});
