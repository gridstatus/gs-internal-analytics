import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get post details
    const postResult = await query<{
      id: string;
      content: string;
      created_at: Date;
      updated_at: Date;
      status: string;
      author_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
    }>(
      `
      SELECT 
        p.id,
        p.content,
        p.created_at,
        p.updated_at,
        p.status,
        p.author_id,
        u.username,
        u.first_name,
        u.last_name
      FROM insights.posts p
      LEFT JOIN api_server.users u ON p.author_id = u.id
      WHERE p.id = $1
    `,
      [id]
    );

    if (postResult.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postResult[0];

    // Get stats
    const [viewsResult, reactionsResult, savesResult, tagsResult] = await Promise.all([
      query<{
        impressions: string;
        views: string;
        total: string;
        unique_impression_users: string;
        unique_viewers: string;
      }>(
        `
        SELECT 
          COUNT(*) FILTER (WHERE view_source = 'feed') as impressions,
          COUNT(*) FILTER (WHERE view_source IN ('feed_expanded', 'detail')) as views,
          COUNT(*) as total,
          COUNT(DISTINCT user_id) FILTER (WHERE view_source = 'feed') as unique_impression_users,
          COUNT(DISTINCT user_id) FILTER (WHERE view_source IN ('feed_expanded', 'detail')) as unique_viewers
        FROM insights.post_views
        WHERE post_id = $1
      `,
        [id]
      ),
      query<{
        total: string;
        likes: string;
        dislikes: string;
        unique_users: string;
      }>(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE reaction_type = 'LIKE') as likes,
          COUNT(*) FILTER (WHERE reaction_type = 'DISLIKE') as dislikes,
          COUNT(DISTINCT user_id) as unique_users
        FROM insights.reactions
        WHERE post_id = $1
      `,
        [id]
      ),
      query<{ count: string; unique_users: string }>(
        `
        SELECT 
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM insights.saved_posts
        WHERE post_id = $1
      `,
        [id]
      ),
      query<{ id: number; name: string; description: string | null }>(
        `
        SELECT t.id, t.name, t.description
        FROM insights.tags t
        INNER JOIN insights.post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = $1
        ORDER BY t.name
      `,
        [id]
      ),
    ]);

    // Get hourly views (last 7 days)
    const hourlyViews = await query<{
      hour: Date;
      views: string;
      unique_viewers: string;
    }>(
      `
      SELECT 
        DATE_TRUNC('hour', viewed_at) AS hour,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_viewers
      FROM insights.post_views
      WHERE post_id = $1
        AND viewed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('hour', viewed_at)
      ORDER BY hour DESC
      LIMIT 168
    `,
      [id]
    );

    // Get daily views (last 90 days)
    const dailyViews = await query<{
      day: Date;
      views: string;
      unique_viewers: string;
    }>(
      `
      SELECT 
        DATE_TRUNC('day', viewed_at) AS day,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_viewers
      FROM insights.post_views
      WHERE post_id = $1
        AND viewed_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY DATE_TRUNC('day', viewed_at)
      ORDER BY day DESC
      LIMIT 90
    `,
      [id]
    );

    // Get monthly views (last 12 months)
    const monthlyViews = await query<{
      month: Date;
      views: string;
      unique_viewers: string;
    }>(
      `
      SELECT 
        DATE_TRUNC('month', viewed_at) AS month,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_viewers
      FROM insights.post_views
      WHERE post_id = $1
        AND viewed_at >= '2025-10-01'
      GROUP BY DATE_TRUNC('month', viewed_at)
      ORDER BY month DESC
      LIMIT 12
    `,
      [id]
    );

    // Get users who viewed the post (separate impressions and views)
    const viewers = await query<{
      user_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      impressions: string;
      views: string;
      first_viewed: Date;
      last_viewed: Date;
    }>(
      `
      SELECT 
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(pv.id) FILTER (WHERE pv.view_source = 'feed') as impressions,
        COUNT(pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) as views,
        MIN(pv.viewed_at) as first_viewed,
        MAX(pv.viewed_at) as last_viewed
      FROM insights.post_views pv
      INNER JOIN api_server.users u ON pv.user_id = u.id
      WHERE pv.post_id = $1
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY last_viewed DESC
      LIMIT 100
    `,
      [id]
    );

    // Get users who reacted to the post
    const reactors = await query<{
      user_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      reaction_type: string;
      created_at: Date;
    }>(
      `
      SELECT 
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        r.reaction_type,
        r.created_at
      FROM insights.reactions r
      INNER JOIN api_server.users u ON r.user_id = u.id
      WHERE r.post_id = $1
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
      [id]
    );

    // Get users who saved the post
    const savers = await query<{
      user_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      created_at: Date;
    }>(
      `
      SELECT 
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        sp.created_at
      FROM insights.saved_posts sp
      INNER JOIN api_server.users u ON sp.user_id = u.id
      WHERE sp.post_id = $1
      ORDER BY sp.created_at DESC
      LIMIT 100
    `,
      [id]
    );

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.created_at.toISOString(),
        updatedAt: post.updated_at.toISOString(),
        status: post.status,
        author: {
          id: post.author_id,
          username: post.username,
          email: null,
          firstName: post.first_name,
          lastName: post.last_name,
        },
      },
      stats: {
        impressions: {
          total: Number(viewsResult[0]?.impressions || 0),
          uniqueUsers: Number(viewsResult[0]?.unique_impression_users || 0),
        },
        views: {
          total: Number(viewsResult[0]?.views || 0),
          uniqueUsers: Number(viewsResult[0]?.unique_viewers || 0),
        },
        totalViews: Number(viewsResult[0]?.total || 0),
        engagementRate: viewsResult[0]?.impressions && Number(viewsResult[0].impressions) > 0
          ? Number(((Number(viewsResult[0].views) / Number(viewsResult[0].impressions)) * 100).toFixed(2))
          : 0,
        reactions: {
          total: Number(reactionsResult[0]?.total || 0),
          likes: Number(reactionsResult[0]?.likes || 0),
          dislikes: Number(reactionsResult[0]?.dislikes || 0),
          uniqueUsers: Number(reactionsResult[0]?.unique_users || 0),
        },
        saves: {
          total: Number(savesResult[0]?.count || 0),
          uniqueUsers: Number(savesResult[0]?.unique_users || 0),
        },
      },
      tags: tagsResult.map((tag) => ({
        id: tag.id,
        name: tag.name,
        description: tag.description,
      })),
      hourlyViews: (() => {
        // Generate all hours for the last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const allHours: Array<{ hour: string; views: number; uniqueViewers: number }> = [];
        
        // Round down to the nearest hour
        const startHour = new Date(sevenDaysAgo);
        startHour.setUTCMinutes(0);
        startHour.setUTCSeconds(0);
        startHour.setUTCMilliseconds(0);
        
        const endHour = new Date(now);
        endHour.setUTCMinutes(0);
        endHour.setUTCSeconds(0);
        endHour.setUTCMilliseconds(0);
        
        // Create a map of existing data
        const dataMap = new Map<string, { views: number; uniqueViewers: number }>();
        hourlyViews.forEach((hv) => {
          const hourKey = hv.hour.toISOString();
          dataMap.set(hourKey, {
            views: Number(hv.views),
            uniqueViewers: Number(hv.unique_viewers),
          });
        });
        
        // Generate all hours and fill in missing ones with 0
        for (let hour = new Date(startHour); hour <= endHour; hour.setUTCHours(hour.getUTCHours() + 1)) {
          const hourKey = hour.toISOString();
          const data = dataMap.get(hourKey);
          allHours.push({
            hour: hourKey,
            views: data?.views || 0,
            uniqueViewers: data?.uniqueViewers || 0,
          });
        }
        
        return allHours;
      })(),
      dailyViews: dailyViews.map((dv) => ({
        day: dv.day.toISOString().slice(0, 10),
        views: Number(dv.views),
        uniqueViewers: Number(dv.unique_viewers),
      })),
      monthlyViews: monthlyViews.map((mv) => ({
        month: mv.month.toISOString().slice(0, 7),
        views: Number(mv.views),
        uniqueViewers: Number(mv.unique_viewers),
      })),
      viewers: viewers.map((v) => ({
        userId: v.user_id,
        username: v.username,
        firstName: v.first_name,
        lastName: v.last_name,
        impressions: Number(v.impressions),
        views: Number(v.views),
        firstViewed: v.first_viewed.toISOString(),
        lastViewed: v.last_viewed.toISOString(),
      })),
      reactors: reactors.map((r) => ({
        userId: r.user_id,
        username: r.username,
        firstName: r.first_name,
        lastName: r.last_name,
        reactionType: r.reaction_type,
        createdAt: r.created_at.toISOString(),
      })),
      savers: savers.map((s) => ({
        userId: s.user_id,
        username: s.username,
        firstName: s.first_name,
        lastName: s.last_name,
        createdAt: s.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching insight detail:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

