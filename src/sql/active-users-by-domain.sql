WITH user_domains AS (
  SELECT
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    last_active_at
  FROM api_server.users
  WHERE last_active_at IS NOT NULL
    AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
      'gmail.com', 'comcast.net', 'yahoo.com', 'hotmail.com', 'qq.com',
      'outlook.com', 'icloud.com', 'aol.com', 'me.com', 'protonmail.com',
      'live.com', 'msn.com', 'zoho.com', 'gmx.com', 'yandex.com'{{GRIDSTATUS_FILTER_IN_LIST}}
    )
    {{INTERNAL_EMAIL_FILTER}}
)
SELECT
  domain,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours') AS active_24h,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days') AS active_7d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_30d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '90 days') AS active_90d,
  COUNT(*) AS total_users
FROM user_domains
GROUP BY domain
HAVING COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '90 days') > 0
ORDER BY active_7d DESC, active_30d DESC;
