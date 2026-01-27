-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

SELECT COUNT(*) as total, COUNT(DISTINCT c.user_id) as users 
FROM api_server.charts c
JOIN api_server.users u ON u.id = c.user_id
WHERE 1=1
  {{USER_FILTER}}

