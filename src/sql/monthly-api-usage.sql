SELECT
  DATE_TRUNC('month', a."timestamp") AS month,
  COUNT(*) AS total_api_requests,
  SUM(a.rows_returned) AS total_api_rows_returned,
  COUNT(DISTINCT CASE WHEN a.request_count >= 5 THEN a.user_id END) AS unique_api_users
FROM (
  SELECT 
    aku.*,
    COUNT(*) OVER (PARTITION BY DATE_TRUNC('month', aku."timestamp"), aku.user_id) AS request_count
  FROM api_server.api_key_usage aku
  JOIN api_server.users u ON u.id = aku.user_id
  WHERE 1=1
    AND aku.api_key IS NOT NULL
    AND aku."timestamp" >= NOW() - INTERVAL '7 days'
    {{USER_FILTER}}
) a
GROUP BY DATE_TRUNC('month', a."timestamp")
ORDER BY month;
