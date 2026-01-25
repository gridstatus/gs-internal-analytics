SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_posts,
  COUNT(DISTINCT author_id) AS unique_authors
FROM insights.posts
WHERE status = 'PUBLISHED'
  AND created_at >= '2025-10-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

