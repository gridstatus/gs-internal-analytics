SELECT
  DATE_TRUNC('month', viewed_at) AS month,
  COUNT(*) FILTER (WHERE view_source = 'feed') AS impressions,
  COUNT(*) FILTER (WHERE view_source IN ('feed_expanded', 'detail')) AS views,
  COUNT(*) AS total_views,
  COUNT(DISTINCT post_id) FILTER (WHERE view_source IN ('feed_expanded', 'detail')) AS posts_viewed,
  COUNT(DISTINCT user_id) FILTER (WHERE view_source IN ('feed_expanded', 'detail')) AS unique_viewers,
  COUNT(DISTINCT user_id) FILTER (WHERE view_source = 'feed') AS unique_impression_users
FROM insights.post_views
WHERE viewed_at >= '2025-10-01'
GROUP BY DATE_TRUNC('month', viewed_at)
ORDER BY month DESC;

