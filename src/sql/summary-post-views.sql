-- Combined post-view summary: unique visitors, homefeed visitors, engagements, and impressions in a single scan. {{DATE_FILTER}} and {{USER_FILTER}} are applied to restrict to correct users and time range.
SELECT
  COUNT(DISTINCT pv.user_id) AS unique_visitors,
  COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.view_source = 'feed') AS homefeed_visitors,
  COUNT(*) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) AS engagements,
  COUNT(*) FILTER (WHERE pv.view_source = 'feed') AS impressions
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE pv.user_id IS NOT NULL
  AND {{DATE_FILTER}}
  AND {{USER_FILTER}}
