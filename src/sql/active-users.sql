-- Count of active users in 24h, 7d, 30d, 90d and total. {{USER_FILTER}} is applied to restrict to correct users.
SELECT
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours') AS active_24h,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days') AS active_7d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_30d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '90 days') AS active_90d,
  (SELECT COUNT(*) FROM api_server.users WHERE 1=1
    {{USER_FILTER}}) AS total_users
FROM api_server.users
WHERE 1=1
  AND last_active_at IS NOT NULL
  {{USER_FILTER}};
