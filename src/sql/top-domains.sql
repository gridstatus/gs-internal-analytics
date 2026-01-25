SELECT
  SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
  COUNT(*) AS user_count
FROM api_server.users
WHERE created_at >= NOW() - INTERVAL '{{DAYS}} days'
  AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
    'gmail.com', 'comcast.net', 'yahoo.com', 'hotmail.com', 'qq.com',
    'outlook.com', 'icloud.com', 'aol.com', 'me.com', 'protonmail.com',
    'live.com', 'msn.com', 'zoho.com', 'gmx.com', 'yandex.com'{{GRIDSTATUS_FILTER_IN_LIST}}
  )
  AND NOT (
    SUBSTRING(username FROM POSITION('@' IN username) + 1) LIKE '%.edu'
    OR SUBSTRING(username FROM POSITION('@' IN username) + 1) LIKE '%.gov'
  )
  {{INTERNAL_EMAIL_FILTER}}
  {{DOMAIN_FILTER}}
GROUP BY SUBSTRING(username FROM POSITION('@' IN username) + 1)
ORDER BY user_count DESC
LIMIT 20;

