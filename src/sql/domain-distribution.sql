WITH corp_users AS (
  SELECT SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain
  FROM api_server.users
  WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
    {{FREE_EMAIL_DOMAINS}}{{GRIDSTATUS_FILTER_IN_LIST}}
  )
  {{EDU_GOV_FILTER}}
  {{INTERNAL_EMAIL_FILTER}}
),
domain_counts AS (
  SELECT domain, COUNT(*) AS user_count
  FROM corp_users
  GROUP BY domain
  HAVING COUNT(*) > 1
)
SELECT
  LEAST(user_count, 25) AS users_bucket,
  COUNT(*) AS domain_count
FROM domain_counts
GROUP BY LEAST(user_count, 25)
ORDER BY users_bucket;
