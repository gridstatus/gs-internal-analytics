WITH corp_users AS (
  SELECT SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain
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
),
domain_counts AS (
  SELECT domain, COUNT(*) AS user_count
  FROM corp_users
  GROUP BY domain
)
SELECT
  COUNT(DISTINCT domain) AS total_corp_domains,
  COUNT(DISTINCT domain) FILTER (WHERE user_count >= 3) AS teams_count,
  COALESCE(SUM(user_count) FILTER (WHERE user_count >= 3), 0) AS users_on_teams
FROM domain_counts;
