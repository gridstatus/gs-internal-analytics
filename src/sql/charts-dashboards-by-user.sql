SELECT
  u.id AS user_id,
  u.username,
  SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) AS domain,
  COUNT(DISTINCT c.id) AS chart_count,
  COUNT(DISTINCT d.id) AS dashboard_count,
  MAX(c.created_at) AS last_chart_created,
  MAX(d.created_at) AS last_dashboard_created
FROM api_server.users u
LEFT JOIN api_server.charts c ON c.user_id = u.id
LEFT JOIN api_server.dashboards d ON d.user_id = u.id
WHERE (c.id IS NOT NULL OR d.id IS NOT NULL)
  AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
  {{INTERNAL_EMAIL_FILTER}}
GROUP BY u.id, u.username
ORDER BY (COUNT(DISTINCT c.id) + COUNT(DISTINCT d.id)) DESC;
