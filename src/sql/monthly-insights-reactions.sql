-- Monthly reaction counts (total, posts, reactors, likes, dislikes) since 2025-10-01. {{USER_FILTER}} is applied to restrict to correct users (engagement excludes GS).
SELECT
  DATE_TRUNC('month', r.created_at) AS month,
  COUNT(*) AS total_reactions,
  COUNT(DISTINCT r.post_id) AS posts_with_reactions,
  COUNT(DISTINCT r.user_id) AS unique_reactors,
  COUNT(*) FILTER (WHERE r.reaction_type = 'LIKE') AS likes,
  COUNT(*) FILTER (WHERE r.reaction_type = 'DISLIKE') AS dislikes
FROM insights.reactions r
JOIN api_server.users u ON r.user_id = u.id
WHERE r.created_at >= '2025-10-01'
  AND {{USER_FILTER}}
GROUP BY DATE_TRUNC('month', r.created_at)
ORDER BY month DESC;

