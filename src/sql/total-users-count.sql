-- Total user count. {{USER_FILTER}} is applied to restrict to correct users.
SELECT COUNT(*)::text AS total_users
FROM api_server.users
WHERE created_at IS NOT NULL
  AND {{USER_FILTER}}

