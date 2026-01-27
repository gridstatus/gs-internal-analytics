-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

SELECT COUNT(*)::text AS total_users
FROM api_server.users
WHERE created_at IS NOT NULL
  {{USER_FILTER}}

