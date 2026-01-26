-- Filter views by internal users (engagement metrics should exclude GS employees)
-- Note: Post authorship is NOT filtered since all posts are by GS employees.
-- Note: PostgreSQL only tracks logged-in users. Anonymous users are tracked in PostHog.
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
WHERE 1=1
  AND pv.viewed_at >= '2025-10-01'
  AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
  {{INTERNAL_EMAIL_FILTER}}
GROUP BY DATE_TRUNC('month', pv.viewed_at)
ORDER BY month DESC;

