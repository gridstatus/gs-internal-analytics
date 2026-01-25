WITH user_data AS (
  SELECT
    clerk_id as user_id,
    SUBSTRING(username FROM POSITION('@' IN username) + 1) AS domain,
    created_at,
    CASE
      WHEN SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
        {{FREE_EMAIL_DOMAINS}}
      )
      {{EDU_GOV_FILTER}} THEN TRUE
      ELSE FALSE
    END AS is_corporate_domain
  FROM api_server.users
  WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
)
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS total_users,
  COUNT(*) FILTER (WHERE is_corporate_domain) AS new_corp_users,
  SUM(COUNT(*) FILTER (WHERE is_corporate_domain)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS total_corp_users
FROM user_data
WHERE created_at IS NOT NULL
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
