-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account
-- Note: This query uses $1 parameter for search term

SELECT 
  u.id, 
  u.username, 
  u.first_name, 
  u.last_name, 
  u.created_at, 
  u.last_active_at,
  EXISTS (
    SELECT 1
    FROM api_server.api_key_usage aku
    WHERE aku.user_id = u.id
      AND aku.api_key IS NOT NULL
    LIMIT 1
  ) as has_api_key
FROM api_server.users u
WHERE (
  u.username ILIKE $1 
  OR COALESCE(u.first_name, '') ILIKE $1 
  OR COALESCE(u.last_name, '') ILIKE $1 
  OR COALESCE(u.first_name || ' ' || u.last_name, '') ILIKE $1
  OR (POSITION('@' IN u.username) > 0 AND SUBSTRING(u.username FROM 1 FOR POSITION('@' IN u.username) - 1) ILIKE $1)
  OR (POSITION('@' IN u.username) > 0 AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) ILIKE $1)
)
  {{USER_FILTER}}
ORDER BY u.last_active_at DESC NULLS LAST
LIMIT 100

