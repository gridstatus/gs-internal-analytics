-- Active users grouped by email domain (24h, 7d, 30d, 90d and total). {{USER_FILTER}} is applied to restrict to correct users.
WITH user_domains AS (
  SELECT
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    last_active_at
  FROM api_server.users
  WHERE 1=1
    AND last_active_at IS NOT NULL
    {{USER_FILTER}}
)
SELECT
  domain,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours') AS active_24h,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days') AS active_7d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_30d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '90 days') AS active_90d,
  COUNT(*) AS total_users
FROM user_domains
GROUP BY domain
HAVING COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '90 days') > 0
ORDER BY active_7d DESC, active_30d DESC;
