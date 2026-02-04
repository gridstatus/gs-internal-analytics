-- Organizations matching search (name ILIKE), with user counts and 7d new/active. Parameter $1 = search term. {{USER_FILTER}} is applied to restrict to correct users.
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
  AND {{USER_FILTER}}
GROUP BY o.id, o.name, o.created_at
ORDER BY COUNT(uo.user_id) DESC
LIMIT 100

