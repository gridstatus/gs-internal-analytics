-- Filter reactions by internal users (engagement metrics should exclude GS employees)
-- Note: Post authorship is NOT filtered since all posts are by GS employees.
SELECT
  DATE_TRUNC('month', r.created_at) AS month,
  COUNT(*) AS total_reactions,
  COUNT(DISTINCT r.post_id) AS posts_with_reactions,
  COUNT(DISTINCT r.user_id) AS unique_reactors,
  COUNT(*) FILTER (WHERE r.reaction_type = 'LIKE') AS likes,
  COUNT(*) FILTER (WHERE r.reaction_type = 'DISLIKE') AS dislikes
FROM insights.reactions r
JOIN api_server.users u ON r.user_id = u.id
WHERE 1=1
  AND r.created_at >= '2025-10-01'
  AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
  {{INTERNAL_EMAIL_FILTER}}
GROUP BY DATE_TRUNC('month', r.created_at)
ORDER BY month DESC;

