-- Users ranked by engagement (reactions, views, saves) in a time window. {{TIME_FILTER_REACTIONS}}, {{TIME_FILTER_VIEWS}}, {{TIME_FILTER_SAVES}} and {{USER_FILTER}} are applied to restrict to correct users and time range.
SELECT
  u.id as user_id,
  u.username,
  u.first_name,
  u.last_name,
  COALESCE(COUNT(DISTINCT r.id), 0) as reaction_count,
  COALESCE(COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'LIKE'), 0) as likes_count,
  COALESCE(COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'DISLIKE'), 0) as dislikes_count,
  COALESCE(COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')), 0) as engagement_count,
  COALESCE(COUNT(DISTINCT sp.id), 0) as save_count,
  COALESCE(COUNT(DISTINCT r.id), 0) + 
  COALESCE(COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')), 0) + 
  COALESCE(COUNT(DISTINCT sp.id), 0) as total_engagement_score
FROM api_server.users u
LEFT JOIN insights.reactions r ON u.id = r.user_id
  {{TIME_FILTER_REACTIONS}}
LEFT JOIN insights.post_views pv ON u.id = pv.user_id 
  AND pv.view_source IN ('feed_expanded', 'detail')
  {{TIME_FILTER_VIEWS}}
LEFT JOIN insights.saved_posts sp ON u.id = sp.user_id
  {{TIME_FILTER_SAVES}}
WHERE 1=1
  AND u.username IS NOT NULL
  {{USER_FILTER}}
GROUP BY u.id, u.username, u.first_name, u.last_name
HAVING 
  COUNT(DISTINCT r.id) > 0 OR 
  COUNT(DISTINCT pv.id) FILTER (WHERE pv.view_source IN ('feed_expanded', 'detail')) > 0 OR 
  COUNT(DISTINCT sp.id) > 0
ORDER BY total_engagement_score DESC, reaction_count DESC, engagement_count DESC, save_count DESC
LIMIT 100;

