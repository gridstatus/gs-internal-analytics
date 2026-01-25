SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_reactions,
  COUNT(DISTINCT post_id) AS posts_with_reactions,
  COUNT(DISTINCT user_id) AS unique_reactors,
  COUNT(*) FILTER (WHERE reaction_type = 'LIKE') AS likes,
  COUNT(*) FILTER (WHERE reaction_type = 'DISLIKE') AS dislikes
FROM insights.reactions
WHERE created_at >= '2025-10-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

