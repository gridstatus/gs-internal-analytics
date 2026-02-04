-- Total chart count and distinct users who created charts. {{USER_FILTER}} is applied to restrict to correct users.
SELECT COUNT(*) as total, COUNT(DISTINCT c.user_id) as users 
FROM api_server.charts c
JOIN api_server.users u ON u.id = c.user_id
WHERE c.id IS NOT NULL
  AND {{USER_FILTER}}

