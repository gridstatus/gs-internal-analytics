import { NextResponse } from 'next/server';
import {
  getMonthlyInsightsPosts,
  getMonthlyInsightsViews,
  getMonthlyInsightsReactions,
  getTopInsightsPosts,
} from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') as '24h' | '7d' | '1m' | null;
    
    const [posts, views, reactions, topPosts] = await Promise.all([
      getMonthlyInsightsPosts(),
      getMonthlyInsightsViews(),
      getMonthlyInsightsReactions(),
      getTopInsightsPosts(timeFilter || undefined),
    ]);

    // Calculate summary stats
    const totalPosts = posts.reduce((sum, p) => sum + Number(p.total_posts), 0);
    const totalImpressions = views.reduce((sum, v) => sum + Number(v.impressions), 0);
    const totalViews = views.reduce((sum, v) => sum + Number(v.views), 0);
    const totalReactions = reactions.reduce((sum, r) => sum + Number(r.total_reactions), 0);
    const uniqueAuthors = new Set(posts.flatMap((p) => [Number(p.unique_authors)])).size;

    // Format monthly data
    const monthlyData = posts.map((p) => {
      const monthStr = formatMonth(p.month);
      const viewData = views.find((v) => formatMonth(v.month) === monthStr);
      const reactionData = reactions.find((r) => formatMonth(r.month) === monthStr);

      return {
        month: monthStr,
        posts: Number(p.total_posts),
        authors: Number(p.unique_authors),
        impressions: viewData ? Number(viewData.impressions) : 0,
        views: viewData ? Number(viewData.views) : 0,
        postsViewed: viewData ? Number(viewData.posts_viewed) : 0,
        uniqueViewers: viewData ? Number(viewData.unique_viewers) : 0,
        uniqueImpressionUsers: viewData ? Number(viewData.unique_impression_users) : 0,
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
        viewsMomChange: previous
          ? Math.round(((current.views - previous.views) / previous.views) * 100)
          : 0,
        reactionsMomChange: previous
          ? Math.round(((current.reactions - previous.reactions) / previous.reactions) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      summary: {
        totalPosts,
        totalImpressions,
        totalViews,
        totalReactions,
        uniqueAuthors,
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
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

