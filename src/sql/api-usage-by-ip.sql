-- API usage grouped by client IP for the last 24 hours. Shows distinct user count, total rows returned, request count, and usernames per IP. {{USER_FILTER}} filters by username domain.
SELECT
  api.query->'headers'->>'true-client-ip' AS ip,
  COUNT(DISTINCT api.user_id) AS distinct_users,
  SUM(api.rows_returned) AS total_rows_returned,
  COUNT(*) AS request_count,
  ARRAY_AGG(DISTINCT u.username) AS user_names
FROM api_server.api_key_usage AS api
JOIN api_server.users u ON api.user_id = u.id
WHERE api.timestamp > NOW() - INTERVAL '24 hours'
  AND api.api_key IS NOT NULL
  AND {{USER_FILTER}}
GROUP BY api.query->'headers'->>'true-client-ip'
ORDER BY distinct_users DESC, total_rows_returned DESC
