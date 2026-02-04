import { query } from '@/lib/db';

/** User-facing message when PostHog is throttled. Use in API responses. */
export const POSTHOG_THROTTLED_MESSAGE =
  'PostHog is temporarily busy. Please try again in a moment.';

/** User-facing message when PostHog returns a server error. */
export const POSTHOG_SERVER_ERROR_MESSAGE =
  'PostHog is temporarily unavailable. Please try again.';

export class PostHogThrottledError extends Error {
  constructor(message: string = POSTHOG_THROTTLED_MESSAGE) {
    super(message);
    this.name = 'PostHogThrottledError';
  }
}

export class PostHogServerError extends Error {
  constructor(message: string = POSTHOG_SERVER_ERROR_MESSAGE) {
    super(message);
    this.name = 'PostHogServerError';
  }
}

type PosthogErrorParsed = { throttled: boolean; serverError: boolean; message: string };

function parsePosthogErrorBody(status: number, bodyText: string): PosthogErrorParsed {
  try {
    const data = JSON.parse(bodyText) as { type?: string; code?: string; detail?: string };
    const throttled =
      data?.type === 'throttled_error' ||
      data?.code === 'throttled' ||
      status === 429;
    const serverError =
      data?.type === 'server_error' ||
      data?.code === 'error' ||
      (status >= 500 && status < 600);
    const message = throttled
      ? POSTHOG_THROTTLED_MESSAGE
      : serverError
        ? POSTHOG_SERVER_ERROR_MESSAGE
        : (data?.detail || bodyText || `PostHog API error: ${status}`);
    return {
      throttled: Boolean(throttled),
      serverError: Boolean(serverError),
      message,
    };
  } catch {
    return {
      throttled: status === 429,
      serverError: status >= 500 && status < 600,
      message:
        status === 429
          ? POSTHOG_THROTTLED_MESSAGE
          : status >= 500 && status < 600
            ? POSTHOG_SERVER_ERROR_MESSAGE
            : (bodyText || `PostHog API error: ${status}`),
    };
  }
}

const POSTHOG_RETRY_DELAY_MS = 2000;
const POSTHOG_MAX_ATTEMPTS = 2;

/** Max concurrent PostHog API requests; excess wait for a slot. */
const POSTHOG_MAX_CONCURRENT = 3;

function createSemaphore(n: number) {
  let inUse = 0;
  const waiters: Array<() => void> = [];
  return {
    acquire(): Promise<void> {
      if (inUse < n) {
        inUse++;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        waiters.push(() => {
          inUse++;
          resolve();
        });
      });
    },
    release(): void {
      inUse--;
      if (waiters.length > 0) {
        const next = waiters.shift();
        if (next) next();
      }
    },
  };
}

const posthogSemaphore = createSemaphore(POSTHOG_MAX_CONCURRENT);

async function doPosthogFetchWithRetry(
  url: string,
  body: { query: { kind: string; query: string } },
  headers: Record<string, string>
): Promise<Response> {
  let lastStatus = 0;
  let lastText = '';
  const retryable = (p: PosthogErrorParsed) => p.throttled || p.serverError;
  for (let attempt = 1; attempt <= POSTHOG_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    lastStatus = response.status;
    if (response.ok) return response;
    lastText = await response.text();
    const parsed = parsePosthogErrorBody(response.status, lastText);
    if (retryable(parsed) && attempt < POSTHOG_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, POSTHOG_RETRY_DELAY_MS));
      continue;
    }
    if (parsed.throttled) throw new PostHogThrottledError(parsed.message);
    if (parsed.serverError) throw new PostHogServerError(parsed.message);
    console.error('PostHog API error:', response.status, lastText);
    throw new Error(parsed.message);
  }
  const parsed = parsePosthogErrorBody(lastStatus, lastText);
  if (parsed.throttled) throw new PostHogThrottledError(parsed.message);
  throw new PostHogServerError(parsed.message);
}

/**
 * Run a single PostHog query request with optional retry on throttle or server error.
 * Respects POSTHOG_MAX_CONCURRENT; throws PostHogThrottledError / PostHogServerError (after retries); throws Error on other failures.
 */
export async function posthogFetchWithRetry(
  url: string,
  body: { query: { kind: string; query: string } },
  headers: Record<string, string>
): Promise<Response> {
  await posthogSemaphore.acquire();
  try {
    return await doPosthogFetchWithRetry(url, body, headers);
  } finally {
    posthogSemaphore.release();
  }
}

/**
 * Execute a HogQL query against the PostHog API.
 * Returns an empty array if credentials are missing.
 * Throws PostHogThrottledError when throttled (after retry); throws Error on other API errors.
 */
export async function runPosthogQuery(hogql: string): Promise<unknown[][]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!projectId || !apiKey) return [];

  const response = await posthogFetchWithRetry(
    `https://us.i.posthog.com/api/projects/${projectId}/query/`,
    { query: { kind: 'HogQLQuery', query: hogql } },
    { Authorization: `Bearer ${apiKey}` }
  );
  const data = await response.json();
  return data.results || [];
}

/**
 * Look up internal user IDs for a list of email addresses.
 * Returns a Map from email → user ID.
 */
export async function getUserIdsFromEmails(emails: string[]): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();
  const users = await query<{ username: string; id: number }>(
    `SELECT username, id FROM api_server.users WHERE username = ANY($1)`,
    [emails]
  );
  const map = new Map<string, number>();
  for (const u of users) map.set(u.username, u.id);
  return map;
}
