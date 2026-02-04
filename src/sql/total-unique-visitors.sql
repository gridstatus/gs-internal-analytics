-- Distinct users who viewed posts since 2025-10-01 (all time). {{USER_FILTER}} is applied to restrict to correct users.
SELECT COUNT(DISTINCT pv.user_id) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE pv.viewed_at >= '2025-10-01'
  AND {{USER_FILTER}}

