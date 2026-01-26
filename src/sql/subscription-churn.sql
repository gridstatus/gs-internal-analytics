-- Subscription Churn Analysis
-- Analyzes subscription cancellations and retention

SELECT
  p.plan_name,
  s.status,
  COUNT(*) as count,
  COUNT(DISTINCT s.user_id) as unique_users
FROM api_server.subscriptions s
LEFT JOIN api_server.plans p ON s.plan_id = p.id
GROUP BY p.plan_name, s.status
ORDER BY p.plan_name, s.status;

