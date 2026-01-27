-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

SELECT COUNT(DISTINCT pv.user_id) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE 1=1
  AND pv.viewed_at >= '2025-10-01'
  {{USER_FILTER}}

