-- Users with at least one alert, ordered by alert count. {{USER_FILTER}} is applied to restrict to correct users.
SELECT
  u.id AS user_id,
  u.username,
  SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) AS domain,
  COUNT(DISTINCT a.id) AS alert_count,
  MAX(a.created_at) AS last_alert_created
FROM api_server.users u
LEFT JOIN api_server.alerts a ON a.user_id = u.id
WHERE a.id IS NOT NULL
  AND {{USER_FILTER}}
GROUP BY u.id, u.username
ORDER BY COUNT(DISTINCT a.id) DESC;

