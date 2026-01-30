import { NextResponse } from 'next/server';
import {
  getMonthlyInsightsPosts,
  getMonthlyInsightsViews,
  getMonthlyInsightsReactions,
  getTopInsightsPosts,
  getSummaryUniqueVisitors,
  getSummaryHomefeedVisitors,
  getSummaryEngagements,
  getSummaryImpressions,
  getSummaryReactions,
  getSummaryPosts,
  getSummaryAnonymousVisitors,
  getSummaryAnonymousHomefeedVisitors,
  fetchPosthogAnonymousUsers,
  fetchPosthogAnonymousHomefeedVisitors,
} from '@/lib/queries';
import { getFilterInternal, getFilterFree, jsonError, withRequestContext } from '@/lib/api-helpers';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function formatPeriod(date: Date, period: 'day' | 'week' | 'month'): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  if (period === 'day') {
    return `${year}-${month}-${day}`;
  } else if (period === 'week') {
    // Get Monday of the week (ISO week starts on Monday)
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    weekStart.setUTCDate(weekStart.getUTCDate() + diff);
    const weekYear = weekStart.getUTCFullYear();
    const weekMonth = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
    const weekDay = String(weekStart.getUTCDate()).padStart(2, '0');
    return `${weekYear}-${weekMonth}-${weekDay}`;
  } else {
    return `${year}-${month}`;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterInternal = getFilterInternal(searchParams);
      const filterFree = getFilterFree(searchParams);
      const timeFilter = searchParams.get('timeFilter') as '24h' | '7d' | '1m' | null;
      const chartPeriod = (searchParams.get('chartPeriod') as 'day' | 'week' | 'month') || 'month';
      const summaryPeriod = (searchParams.get('summaryPeriod') as '1d' | '7d' | '30d' | 'all') || 'all';
    
    const [posts, views, reactions, topPosts, anonymousVisitors, anonymousHomefeedVisitors] = await Promise.all([
      getMonthlyInsightsPosts(chartPeriod, filterInternal, filterFree),
      getMonthlyInsightsViews(chartPeriod, filterInternal, filterFree),
      getMonthlyInsightsReactions(chartPeriod, filterInternal, filterFree),
      getTopInsightsPosts(timeFilter || undefined, filterInternal, filterFree),
      fetchPosthogAnonymousUsers(chartPeriod),
      fetchPosthogAnonymousHomefeedVisitors(chartPeriod),
    ]);

    // Fetch summary KPIs using dedicated queries (independent of chartPeriod)
    const [
      summaryUniqueVisitorsLoggedIn,
      summaryHomefeedVisitorsLoggedIn,
      summaryEngagements,
      summaryImpressions,
      summaryReactions,
      summaryPosts,
      summaryAnonymousVisitors,
      summaryAnonymousHomefeedVisitors,
    ] = await Promise.all([
      getSummaryUniqueVisitors(summaryPeriod, filterInternal, filterFree),
      getSummaryHomefeedVisitors(summaryPeriod, filterInternal, filterFree),
      getSummaryEngagements(summaryPeriod, filterInternal, filterFree),
      getSummaryImpressions(summaryPeriod, filterInternal, filterFree),
      getSummaryReactions(summaryPeriod, filterInternal, filterFree),
      getSummaryPosts(summaryPeriod),
      getSummaryAnonymousVisitors(summaryPeriod),
      getSummaryAnonymousHomefeedVisitors(summaryPeriod),
    ]);

    // Format period data (day/week/month) and merge PostHog anonymous data
    const monthlyData = posts.map((p) => {
      const periodStr = formatPeriod(p.month, chartPeriod);
      const viewData = views.find((v) => formatPeriod(v.month, chartPeriod) === periodStr);
      const reactionData = reactions.find((r) => formatPeriod(r.month, chartPeriod) === periodStr);
      
      // Find matching PostHog anonymous data for this period
      const anonData = anonymousVisitors.find((a) => a.period === periodStr);
      const anonHomefeedData = anonymousHomefeedVisitors.find((a) => a.period === periodStr);
      
      const uniqueVisitorsLoggedIn = viewData ? Number(viewData.unique_visitors_logged_in) : 0;
      const uniqueVisitorsAnon = anonData ? anonData.anonymousUsers : 0;
      const uniqueHomefeedVisitorsLoggedIn = viewData ? Number(viewData.unique_homefeed_visitors_logged_in) : 0;
      const uniqueHomefeedVisitorsAnon = anonHomefeedData ? anonHomefeedData.anonymousUsers : 0;

      return {
        month: periodStr,
        posts: Number(p.total_posts),
        authors: Number(p.unique_authors),
        impressions: viewData ? Number(viewData.impressions) : 0,
        engagements: viewData ? Number(viewData.views) : 0,
        postsViewed: viewData ? Number(viewData.posts_viewed) : 0,
        uniqueVisitorsLoggedIn,
        uniqueVisitorsAnon,
        uniqueVisitors: uniqueVisitorsLoggedIn + uniqueVisitorsAnon,
        uniqueHomefeedVisitorsLoggedIn,
        uniqueHomefeedVisitorsAnon,
        uniqueHomefeedVisitors: uniqueHomefeedVisitorsLoggedIn + uniqueHomefeedVisitorsAnon,
        reactions: reactionData ? Number(reactionData.total_reactions) : 0,
        likes: reactionData ? Number(reactionData.likes) : 0,
        dislikes: reactionData ? Number(reactionData.dislikes) : 0,
        postsWithReactions: reactionData ? Number(reactionData.posts_with_reactions) : 0,
        uniqueReactors: reactionData ? Number(reactionData.unique_reactors) : 0,
      };
    });

    // Calculate MoM changes
    const monthlyDataWithChanges = monthlyData.map((current, index) => {
      const previous = index > 0 ? monthlyData[index - 1] : null;
      return {
        ...current,
        postsMomChange: previous
          ? Math.round(((current.posts - previous.posts) / previous.posts) * 100)
          : 0,
        impressionsMomChange: previous
          ? Math.round(((current.impressions - previous.impressions) / previous.impressions) * 100)
          : 0,
        engagementsMomChange: previous
          ? Math.round(((current.engagements - previous.engagements) / previous.engagements) * 100)
          : 0,
        reactionsMomChange: previous
          ? Math.round(((current.reactions - previous.reactions) / previous.reactions) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      summary: {
        totalPosts: summaryPosts,
        totalImpressions: summaryImpressions,
        totalEngagements: summaryEngagements,
        totalReactions: summaryReactions,
        uniqueAuthors: 0, // Not used in summary KPIs, can be calculated separately if needed
        totalUniqueVisitors: summaryUniqueVisitorsLoggedIn + summaryAnonymousVisitors,
        totalUniqueVisitorsLoggedIn: summaryUniqueVisitorsLoggedIn,
        totalUniqueVisitorsAnon: summaryAnonymousVisitors,
        totalUniqueHomefeedVisitors: summaryHomefeedVisitorsLoggedIn + summaryAnonymousHomefeedVisitors,
        totalUniqueHomefeedVisitorsLoggedIn: summaryHomefeedVisitorsLoggedIn,
        totalUniqueHomefeedVisitorsAnon: summaryAnonymousHomefeedVisitors,
      },
      monthlyData: monthlyDataWithChanges.reverse(),
      topPosts: topPosts.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.created_at.toISOString(),
        updatedAt: post.updated_at.toISOString(),
        authorId: post.author_id,
        username: post.username,
        email: null,
        impressions: Number(post.impressions),
        viewCount: Number(post.view_count),
        reactionCount: Number(post.reaction_count),
        saveCount: Number(post.save_count),
        likeCount: Number(post.like_count),
        dislikeCount: Number(post.dislike_count),
        engagementRate: Number(post.engagement_rate),
      })),
    });
  } catch (error) {
      console.error('Error fetching insights data:', error);
      return jsonError(error);
    }
  });
}

