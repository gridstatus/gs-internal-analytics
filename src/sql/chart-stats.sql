-- Required placeholders:
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree

SELECT COUNT(*) as total, COUNT(DISTINCT c.user_id) as users 
FROM api_server.charts c
JOIN api_server.users u ON u.id = c.user_id
WHERE 1=1
  {{USER_FILTER}}

