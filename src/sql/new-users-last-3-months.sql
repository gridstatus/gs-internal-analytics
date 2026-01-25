-- Summary of new users created over last 3 months
WITH user_data AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS new_users
  FROM api_server.users
  WHERE created_at >= NOW() - INTERVAL '3 months'
    AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
  GROUP BY DATE_TRUNC('month', created_at)
)
SELECT
  month,
  new_users
FROM user_data
ORDER BY month DESC;

