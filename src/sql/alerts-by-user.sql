SELECT
  u.id AS user_id,
  u.username,
  SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) AS domain,
  COUNT(DISTINCT a.id) AS alert_count,
  MAX(a.created_at) AS last_alert_created
FROM api_server.users u
LEFT JOIN api_server.alerts a ON a.user_id = u.id
WHERE 1=1
  AND a.id IS NOT NULL
  {{USER_FILTER}}
GROUP BY u.id, u.username
ORDER BY COUNT(DISTINCT a.id) DESC;

