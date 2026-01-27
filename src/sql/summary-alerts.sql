-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

SELECT COUNT(*) as total, COUNT(DISTINCT a.user_id) as users 
FROM api_server.alerts a
JOIN api_server.users u ON u.id = a.user_id
WHERE 1=1
  {{USER_FILTER}}

