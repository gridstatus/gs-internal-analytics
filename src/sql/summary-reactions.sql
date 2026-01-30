-- Required placeholders:
--   {{DATE_FILTER}} - Date filter clause (e.g., "AND r.created_at >= NOW() - INTERVAL '7 days'")
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree

SELECT COUNT(*) AS total
FROM insights.reactions r
JOIN api_server.users u ON r.user_id = u.id
WHERE 1=1
  {{DATE_FILTER}}
  {{USER_FILTER}}

