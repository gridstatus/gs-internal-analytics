-- Subscriptions for a plan with username and organization name. Parameter $1 = plan_id. Limit 100.
SELECT
  s.id,
  s.user_id,
  u.username,
  s.plan_id,
  s.start_date,
  s.status,
  s.organization_id,
  o.name AS organization_name,
  s.stripe_subscription_id,
  s.current_billing_period_start,
  s.current_billing_period_end,
  s.cancel_at_period_end,
  s.enforce_api_usage_limit,
  s.created_at
FROM api_server.subscriptions s
LEFT JOIN api_server.users u ON u.id = s.user_id
LEFT JOIN api_server.organizations o ON o.id = s.organization_id
WHERE s.plan_id = $1
ORDER BY s.start_date DESC
LIMIT 100
