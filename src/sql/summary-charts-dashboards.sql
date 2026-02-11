-- Combined chart and dashboard stats: total counts and distinct creators for each. {{USER_FILTER}} is applied to restrict to correct users.
WITH chart_stats AS (
  SELECT COUNT(*) as total, COUNT(DISTINCT c.user_id) as users
  FROM api_server.charts c
  JOIN api_server.users u ON u.id = c.user_id
  WHERE c.id IS NOT NULL
    AND {{USER_FILTER}}
),
dashboard_stats AS (
  SELECT COUNT(*) as total, COUNT(DISTINCT d.user_id) as users
  FROM api_server.dashboards d
  JOIN api_server.users u ON u.id = d.user_id
  WHERE d.id IS NOT NULL
    AND {{USER_FILTER}}
)
SELECT
  cs.total AS chart_total,
  cs.users AS chart_users,
  ds.total AS dashboard_total,
  ds.users AS dashboard_users
FROM chart_stats cs, dashboard_stats ds
