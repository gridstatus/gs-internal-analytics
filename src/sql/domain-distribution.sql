-- Histogram of domain sizes: how many domains have 2, 3, … users (bucketed to 25). {{USER_FILTER}} is applied to restrict to correct users.
WITH corp_users AS (
  SELECT SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain
  FROM api_server.users
  WHERE 1=1
    {{USER_FILTER}}
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
