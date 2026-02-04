/**
 * Classify API routes as DB vs PostHog for the sidebar "Queries" widget.
 * Convention: any path that contains "posthog" (e.g. /api/posthog/...) is PostHog; else DB.
 */
export type QuerySource = 'db' | 'posthog';

export function getQuerySource(url: string): QuerySource {
  const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
  return path.includes('posthog') ? 'posthog' : 'db';
}
