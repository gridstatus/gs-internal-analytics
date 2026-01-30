-- Published insight posts ranked by engagement (impressions, views, reactions, saves, engagement rate). {{TIMEFILTER}} filters by post date. Does not filter by author (all posts by GS).
SELECT
  p.id,
  p.content,
  p.created_at,
  p.updated_at,
  p.author_id,
  u.username,
  COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source = 'feed') AS impressions,
  COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) AS view_count,
  COUNT(DISTINCT r.id) AS reaction_count,
  COUNT(DISTINCT sp.id) AS save_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'LIKE') AS like_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'DISLIKE') AS dislike_count,
  CASE 
    WHEN COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source = 'feed') > 0 
    THEN ROUND(
      (COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail'))::numeric / 
       COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source = 'feed')::numeric) * 100, 
      2
    )
    ELSE 0
  END AS engagement_rate
FROM insights.posts p
LEFT JOIN api_server.users u ON p.author_id = u.id
LEFT JOIN insights.post_views pv ON p.id = pv.post_id
LEFT JOIN insights.reactions r ON p.id = r.post_id
LEFT JOIN insights.saved_posts sp ON p.id = sp.post_id
WHERE p.status = 'PUBLISHED'
  {{TIMEFILTER}}
GROUP BY p.id, p.content, p.created_at, p.updated_at, p.author_id, u.username
ORDER BY engagement_rate DESC, view_count DESC
LIMIT 100;
