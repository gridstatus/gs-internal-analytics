-- All subscriptions with username, organization name, and plan name.
SELECT
  s.id,
  s.user_id,
  u.username,
  s.plan_id,
  p.plan_name,
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
LEFT JOIN api_server.plans p ON p.id = s.plan_id
ORDER BY s.start_date DESC
