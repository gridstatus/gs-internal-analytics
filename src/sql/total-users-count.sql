-- Required placeholders:
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree

SELECT COUNT(*)::text AS total_users
FROM api_server.users
WHERE created_at IS NOT NULL
  {{USER_FILTER}}

