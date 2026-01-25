WITH corp_domains AS (
  SELECT
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    DATE_TRUNC('month', created_at) AS month
  FROM api_server.users
  WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
    'gmail.com', 'comcast.net', 'yahoo.com', 'hotmail.com', 'qq.com',
    'outlook.com', 'icloud.com', 'aol.com', 'me.com', 'protonmail.com',
    'live.com', 'msn.com', 'zoho.com', 'gmx.com', 'yandex.com'{{GRIDSTATUS_FILTER_IN_LIST}}
  )
  AND NOT (
    SUBSTRING(username FROM POSITION('@' IN username) + 1) LIKE '%.edu'
    OR SUBSTRING(username FROM POSITION('@' IN username) + 1) LIKE '%.gov'
  )
  {{INTERNAL_EMAIL_FILTER}}
  AND created_at IS NOT NULL
),
monthly_domain_counts AS (
  SELECT
    domain,
    month,
    COUNT(*) OVER (PARTITION BY domain ORDER BY month) AS domain_user_count
  FROM corp_domains
)
SELECT
  month,
  COUNT(DISTINCT domain) AS corp_domains,
  COUNT(DISTINCT domain) FILTER (WHERE domain_user_count >= 3) AS teams,
  SUM(domain_user_count) FILTER (WHERE domain_user_count >= 3) AS users_on_teams
FROM monthly_domain_counts
GROUP BY month
ORDER BY month;
