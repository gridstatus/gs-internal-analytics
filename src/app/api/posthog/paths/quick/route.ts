import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

const DATE_FILTER_24H = 'timestamp >= now() - INTERVAL 24 HOUR';
// Each column displays at most DISPLAY_LIMIT paths.
// Query limits are larger to ensure DISPLAY_LIMIT remain after deduplication across columns:
//   col 1: query DISPLAY_LIMIT (no prior filter)
//   col 2: query DISPLAY_LIMIT * 2 (excludes col 1)
//   col 3: query DISPLAY_LIMIT * 3 (excludes col 1 + col 2)
const DISPLAY_LIMIT = 25;

/** Top paths by views (24h), by unique users (24h), last visited. Each column shows at most DISPLAY_LIMIT; higher query limits ensure enough after filtering. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [topByViewsResults, recentResults, topByUsersResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', {
            dateFilter: DATE_FILTER_24H,
            limit: DISPLAY_LIMIT,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('path-recent.hogql', {
            limit: DISPLAY_LIMIT * 3,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('path-top-by-unique-users.hogql', {
            dateFilter: DATE_FILTER_24H,
            limit: DISPLAY_LIMIT * 2,
          })
        ),
      ]);

      const topByViews = (topByViewsResults as [string, number][]).map(([pathname, views]) => ({
        pathname: String(pathname ?? '/'),
        views: Number(views ?? 0),
      }));
      const topByViewsSet = new Set(topByViews.map((p) => p.pathname));
      const topByUniqueUsersRaw = (topByUsersResults as [string, number][]).map(([pathname, unique_users]) => ({
        pathname: String(pathname ?? '/'),
        uniqueUsers: Number(unique_users ?? 0),
      }));
      const topByUniqueUsers = topByUniqueUsersRaw.filter((p) => !topByViewsSet.has(p.pathname));
      const inColumn1Or2 = new Set([...topByViewsSet, ...topByUniqueUsers.map((p) => p.pathname)]);
      const recentRaw = (recentResults as [string, string][]).map(([pathname, last_seen]) => ({
        pathname: String(pathname ?? '/'),
        lastSeen: String(last_seen ?? ''),
      }));
      const recent = recentRaw.filter((p) => !inColumn1Or2.has(p.pathname));

      return NextResponse.json({
        topByViews: topByViews.slice(0, DISPLAY_LIMIT),
        topByUniqueUsers: topByUniqueUsers.slice(0, DISPLAY_LIMIT),
        recent: recent.slice(0, DISPLAY_LIMIT),
      });
    } catch (error) {
      console.error('Error fetching path quick selects:', error);
      if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
