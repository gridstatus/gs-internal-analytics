-- NOTE: We do NOT filter post authors by internal email domain.
-- All insight posts are authored by GS employees, so filtering would remove all posts.
-- The internal filter only applies to views/reactions (user engagement metrics).
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_posts,
  COUNT(DISTINCT author_id) AS unique_authors
FROM insights.posts
WHERE status = 'PUBLISHED'
  AND created_at >= '2025-10-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

