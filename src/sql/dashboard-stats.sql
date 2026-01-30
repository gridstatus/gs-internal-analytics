-- Total dashboard count and distinct users who created dashboards. {{USER_FILTER}} is applied to restrict to correct users.
SELECT COUNT(*) as total, COUNT(DISTINCT d.user_id) as users 
FROM api_server.dashboards d
JOIN api_server.users u ON u.id = d.user_id
WHERE 1=1
  {{USER_FILTER}}

