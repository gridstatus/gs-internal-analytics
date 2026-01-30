-- Post views (feed_expanded or detail) by a user, most recent first. Parameter $1 = user_id.
SELECT
  p.id,
  p.content,
  p.created_at,
  p.author_id,
  u.username as author_username,
  MIN(pv.viewed_at) as first_viewed,
  MAX(pv.viewed_at) as last_viewed,
  COUNT(*) as view_count,
  STRING_AGG(DISTINCT pv.view_source, ', ' ORDER BY pv.view_source) as view_sources
FROM insights.post_views pv
JOIN insights.posts p ON pv.post_id = p.id
LEFT JOIN api_server.users u ON p.author_id = u.id
WHERE pv.user_id = $1
  AND p.status = 'PUBLISHED'
  AND pv.view_source IN ('feed_expanded', 'detail')
GROUP BY p.id, p.content, p.created_at, p.author_id, u.username
ORDER BY MAX(pv.viewed_at) DESC
LIMIT 100;

