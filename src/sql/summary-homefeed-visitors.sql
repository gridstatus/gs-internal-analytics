-- Required placeholders:
--   {{DATE_FILTER}} - Date filter clause (e.g., "AND pv.viewed_at >= NOW() - INTERVAL '7 days'")
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree

SELECT COUNT(DISTINCT pv.user_id) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE 1=1
  AND pv.view_source = 'feed'
  {{DATE_FILTER}}
  {{USER_FILTER}}

