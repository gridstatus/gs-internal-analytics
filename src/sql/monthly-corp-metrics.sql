WITH corp_domains AS (
  SELECT
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    DATE_TRUNC('month', created_at) AS month
  FROM api_server.users
  WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
    {{FREE_EMAIL_DOMAINS}}{{GRIDSTATUS_FILTER_IN_LIST}}
  )
  {{EDU_GOV_FILTER}}
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
