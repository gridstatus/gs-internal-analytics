-- Summary of new users created over last 3 months
WITH user_data AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS new_users
  FROM api_server.users
  WHERE 1=1
    AND created_at >= NOW() - INTERVAL '3 months'
    {{USER_FILTER}}
  GROUP BY DATE_TRUNC('month', created_at)
)
SELECT
  month,
  new_users
FROM user_data
ORDER BY month DESC;

