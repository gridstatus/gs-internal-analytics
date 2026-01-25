SELECT
  MAX(created_at) as latest_created_at,
  DATE_TRUNC('month', MAX(created_at)) as latest_month,
  COUNT(*) FILTER (WHERE created_at >= '2026-01-01') as jan_2026_count
FROM api_server.users;
