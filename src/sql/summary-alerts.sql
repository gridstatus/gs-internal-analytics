-- Total alert count and distinct users who created alerts. {{USER_FILTER}} is applied to restrict to correct users.
SELECT COUNT(*) as total, COUNT(DISTINCT a.user_id) as users 
FROM api_server.alerts a
JOIN api_server.users u ON u.id = a.user_id
WHERE a.id IS NOT NULL
  AND {{USER_FILTER}}

