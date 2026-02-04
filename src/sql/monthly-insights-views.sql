-- Monthly post view counts (impressions, views, unique viewers) since 2025-10-01. {{USER_FILTER}} is applied to restrict to correct users. Logged-in users only; anonymous in PostHog.
SELECT
  DATE_TRUNC('month', pv.viewed_at) AS month,
  COUNT(*) FILTER (WHERE pv.view_source = 'feed') AS impressions,
  COUNT(*) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) AS views,
  COUNT(*) AS total_views,
  COUNT(DISTINCT pv.post_id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) AS posts_viewed,
  COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) AS unique_viewers_logged_in,
  COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.view_source = 'feed') AS unique_homefeed_visitors_logged_in,
  COUNT(DISTINCT pv.user_id) AS unique_visitors_logged_in
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE pv.viewed_at >= '2025-10-01'
  AND {{USER_FILTER}}
GROUP BY DATE_TRUNC('month', pv.viewed_at)
ORDER BY month DESC;

