-- New users and cumulative total by period (day, week, month, or year). {{PERIOD}} and {{USER_FILTER}} are applied; {{USER_FILTER}} restricts to correct users.
WITH user_data AS (
  SELECT
    clerk_id as user_id,
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    created_at,
    CASE
      WHEN SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT LIKE '%.edu'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT LIKE '%.gov'
      THEN TRUE
      ELSE FALSE
    END AS is_corporate_domain
  FROM api_server.users
  WHERE 1=1
    {{USER_FILTER}}
)
SELECT
  DATE_TRUNC('{{PERIOD}}', created_at) AS month,
  COUNT(*) AS new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('{{PERIOD}}', created_at)) AS total_users,
  COUNT(*) FILTER (WHERE is_corporate_domain) AS new_corp_users,
  SUM(COUNT(*) FILTER (WHERE is_corporate_domain)) OVER (ORDER BY DATE_TRUNC('{{PERIOD}}', created_at)) AS total_corp_users
FROM user_data
WHERE created_at IS NOT NULL
GROUP BY DATE_TRUNC('{{PERIOD}}', created_at)
ORDER BY month;

