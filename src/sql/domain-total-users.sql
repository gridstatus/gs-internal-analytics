-- Total registered users per email domain. {{USER_FILTER}} is applied to restrict to correct users.
SELECT
  SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
  COUNT(*) AS total_users
FROM api_server.users
WHERE {{USER_FILTER}}
GROUP BY domain
ORDER BY total_users DESC
