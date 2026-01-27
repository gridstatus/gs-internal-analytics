-- Required placeholders:
--   {{TIMESTAMP_FIELD}} - Field name to filter by (e.g., 'created_at', 'last_active_at')
--   {{DAYS}} - Number of days to look back
--   {{DOMAIN_FILTER}} - Optional domain search filter clause
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

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

