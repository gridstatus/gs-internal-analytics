-- Top domains by user count in the window. {{TIMESTAMP_FIELD}} and {{DAYS}} define the window; {{USER_FILTER}} and {{DOMAIN_FILTER}} are applied to restrict to correct users.
SELECT
  SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
  COUNT(*) AS user_count
FROM api_server.users
WHERE 1=1
  AND {{TIMESTAMP_FIELD}} IS NOT NULL
  AND {{TIMESTAMP_FIELD}} >= NOW() - INTERVAL '{{DAYS}} days'
  {{USER_FILTER}}
  {{DOMAIN_FILTER}}
GROUP BY SUBSTRING(username FROM POSITION('@' IN username) + 1)
ORDER BY user_count DESC
LIMIT 20;

