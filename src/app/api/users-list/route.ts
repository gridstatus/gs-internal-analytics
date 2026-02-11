import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { loadSql, getSubscriptionsByUserId, toSubscriptionListItem } from '@/lib/queries';
import { withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    const search = searchParams.get('search') || '';
    const id = searchParams.get('id');

    try {
    // If ID provided, get single user with details
    if (id) {
      const users = await query<{
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        created_at: Date;
        last_active_at: Date;
        is_admin: boolean;
        clerk_id: string | null;
      }>(`SELECT id, username, first_name, last_name, created_at, last_active_at, is_admin, clerk_id
          FROM api_server.users WHERE id = $1`, [id]);

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];

      // Get organizations
      const orgs = await query<{
        id: string;
        name: string;
        role: string;
      }>(`
        SELECT o.id, o.name, uo.role
        FROM api_server.organizations o
        JOIN api_server.user_organizations uo ON uo.organization_id = o.id
        WHERE uo.user_id = $1
      `, [id]);

      // Get charts, dashboards, alerts, and insights engagements (feed_expanded + detail) count
      const stats = await query<{
        chart_count: string;
        dashboard_count: string;
        alert_count: string;
        insights_engagements_count: string;
      }>(`
        SELECT
          (SELECT COUNT(*) FROM api_server.charts WHERE user_id = $1) as chart_count,
          (SELECT COUNT(*) FROM api_server.dashboards WHERE user_id = $1) as dashboard_count,
          (SELECT COUNT(*) FROM api_server.alerts WHERE user_id = $1) as alert_count,
          (SELECT COUNT(*) FROM insights.post_views WHERE user_id = $1 AND view_source IN ('feed_expanded', 'detail')) as insights_engagements_count
      `, [id]);

      // Get actual charts with names
      const charts = await query<{
        id: number;
        name: string;
        created_at: Date;
      }>(`
        SELECT id, name, created_at
        FROM api_server.charts
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [id]);

      // Get actual dashboards with names
      const dashboards = await query<{
        id: number;
        name: string;
        created_at: Date;
      }>(`
        SELECT id, name, created_at
        FROM api_server.dashboards
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [id]);

      // Get actual alerts with details
      const alerts = await query<{
        id: number;
        created_at: Date;
      }>(`
        SELECT id, created_at
        FROM api_server.alerts
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [id]);

      // Get alert logs for this user
      const alertLogs = await query<{
        id: string;
        alert_id: string | null;
        type: string;
        value: string;
        timestamp: Date | null;
        message: string | null;
      }>(loadSql('user-alert-logs.sql'), [id]);

      // Get API usage (last 30 days)
      const apiUsage = await query<{
        request_count: string;
        rows_returned: string;
      }>(`
        SELECT COUNT(*) as request_count, COALESCE(SUM(rows_returned), 0) as rows_returned
        FROM api_server.api_key_usage
        WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
      `, [id]);

      // Get API keys for this user
      // Note: This query benefits from an index on api_key_usage(user_id, api_key, timestamp)
      const apiKeys = await query<{
        api_key: string;
        first_used: Date;
        last_used: Date;
        request_count: string;
      }>(`
        SELECT 
          api_key,
          MIN(timestamp) as first_used,
          MAX(timestamp) as last_used,
          COUNT(*) as request_count
        FROM api_server.api_key_usage
        WHERE user_id = $1 AND api_key IS NOT NULL
        GROUP BY api_key
        ORDER BY MAX(timestamp) DESC
      `, [id]);

      // Get posts user has reacted to
      const reactionsSql = loadSql('user-insights-reactions.sql');
      const reactions = await query<{
        id: string;
        content: string;
        created_at: Date;
        author_id: number;
        author_username: string | null;
        reaction_type: string;
        reaction_date: Date;
      }>(reactionsSql, [id]);

      // Get posts user has saved
      const savedSql = loadSql('user-insights-saved.sql');
      const saved = await query<{
        id: string;
        content: string;
        created_at: Date;
        author_id: number;
        author_username: string | null;
        saved_date: Date;
      }>(savedSql, [id]);

      // Get posts user has viewed (feed_expanded or detail)
      const viewsSql = loadSql('user-insights-views.sql');
      const views = await query<{
        id: string;
        content: string;
        created_at: Date;
        author_id: number;
        author_username: string | null;
        first_viewed: Date;
        last_viewed: Date;
        view_count: string;
        view_sources: string;
      }>(viewsSql, [id]);

      // Get subscriptions for this user
      const subscriptionRows = await getSubscriptionsByUserId(id);
      const subscriptions = subscriptionRows.map(toSubscriptionListItem);

      // First X% of users by created_at
      const percentileResult = await query<{ users_at_or_before: number; total_users: number }>(
        loadSql('user-percentile.sql'),
        [id]
      );
      const p = percentileResult[0];
      const firstPercentile =
        p && p.total_users > 0
          ? Math.round((p.users_at_or_before / p.total_users) * 1000) / 10
          : null;

      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
          lastActiveAt: user.last_active_at,
          isAdmin: user.is_admin,
          clerkId: user.clerk_id,
        },
        organizations: orgs.map(o => ({
          id: o.id,
          name: o.name,
          role: o.role,
        })),
        stats: {
          chartCount: Number(stats[0]?.chart_count || 0),
          dashboardCount: Number(stats[0]?.dashboard_count || 0),
          alertCount: Number(stats[0]?.alert_count || 0),
          apiRequests30d: Number(apiUsage[0]?.request_count || 0),
          apiRows30d: Number(apiUsage[0]?.rows_returned || 0),
          insightsEngagements: Number(stats[0]?.insights_engagements_count || 0),
        },
        charts: charts.map(c => ({
          id: c.id,
          name: c.name,
          createdAt: c.created_at,
        })),
        dashboards: dashboards.map(d => ({
          id: d.id,
          name: d.name,
          createdAt: d.created_at,
        })),
        alerts: alerts.map(a => ({
          id: a.id,
          createdAt: a.created_at,
        })),
        alertLogs: alertLogs.map(al => ({
          id: al.id,
          alertId: al.alert_id,
          type: al.type,
          value: al.value,
          timestamp: al.timestamp,
          message: al.message,
        })),
        apiKeys: apiKeys.map(k => ({
          apiKey: k.api_key,
          firstUsed: k.first_used,
          lastUsed: k.last_used,
          requestCount: Number(k.request_count),
        })),
        insights: {
          reactions: reactions.map(r => ({
            postId: r.id,
            content: r.content,
            createdAt: r.created_at,
            authorId: r.author_id,
            authorUsername: r.author_username,
            reactionType: r.reaction_type,
            reactionDate: r.reaction_date,
          })),
          saved: saved.map(s => ({
            postId: s.id,
            content: s.content,
            createdAt: s.created_at,
            authorId: s.author_id,
            authorUsername: s.author_username,
            savedDate: s.saved_date,
          })),
          views: views.map(v => ({
            postId: v.id,
            content: v.content,
            createdAt: v.created_at,
            authorId: v.author_id,
            authorUsername: v.author_username,
            firstViewed: v.first_viewed,
            lastViewed: v.last_viewed,
            viewCount: Number(v.view_count),
            viewSources: v.view_sources,
          })),
        },
        subscriptions,
        firstPercentile,
      });
    }

    // Search users with fuzzy matching on username/email and first/last name
    // Uses ILIKE for pattern matching - exact matches work, partial matches supported
    const searchSql = loadSql('users-list-search.sql', { usernamePrefix: 'u.' });
    const users = await query<{
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      created_at: Date;
      last_active_at: Date;
      has_api_key: boolean;
    }>(searchSql, [`%${search}%`]);

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        createdAt: u.created_at,
        lastActiveAt: u.last_active_at,
        hasApiKey: u.has_api_key,
      })),
    });
  } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
  });
}
