-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account
-- Note: This query uses $1 parameter for search term

SELECT 
  o.id, 
  o.name, 
  o.created_at, 
  COUNT(DISTINCT uo.user_id) as user_count,
  COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN u.id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN u.last_active_at >= NOW() - INTERVAL '7 days' THEN u.id END) as active_users_7d
FROM api_server.organizations o
LEFT JOIN api_server.user_organizations uo ON uo.organization_id = o.id
LEFT JOIN api_server.users u ON u.id = uo.user_id
WHERE o.name ILIKE $1
  {{USER_FILTER}}
GROUP BY o.id, o.name, o.created_at
ORDER BY COUNT(uo.user_id) DESC
LIMIT 100

