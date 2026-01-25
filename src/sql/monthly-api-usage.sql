SELECT
  DATE_TRUNC('month', a."timestamp") AS month,
  COUNT(*) AS total_api_requests,
  SUM(a.rows_returned) AS total_api_rows_returned,
  COUNT(DISTINCT a.user_id) FILTER (WHERE cnt >= 5) AS unique_api_users
FROM (
  SELECT 
    aku.*,
    COUNT(*) OVER (PARTITION BY DATE_TRUNC('month', aku."timestamp"), aku.user_id) AS cnt
  FROM api_server.api_key_usage aku
  JOIN api_server.users u ON u.id = aku.user_id
  WHERE aku.api_key IS NOT NULL
    AND aku."timestamp" >= NOW() - INTERVAL '7 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
) a
GROUP BY DATE_TRUNC('month', a."timestamp")
ORDER BY month;
