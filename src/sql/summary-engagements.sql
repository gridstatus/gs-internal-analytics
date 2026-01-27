-- Required placeholders:
--   {{DATE_FILTER}} - Date filter clause (e.g., "AND pv.viewed_at >= NOW() - INTERVAL '7 days'")
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

SELECT COUNT(*) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE 1=1
  AND pv.view_source IN ('feed_expanded', 'detail')
  {{DATE_FILTER}}
  {{USER_FILTER}}

