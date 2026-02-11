-- Subscriptions for an organization with username and plan name. Parameter $1 = organization_id. Limit 100.
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
  s.created_at
FROM api_server.subscriptions s
LEFT JOIN api_server.users u ON u.id = s.user_id
LEFT JOIN api_server.organizations o ON o.id = s.organization_id
LEFT JOIN api_server.plans p ON p.id = s.plan_id
WHERE s.organization_id = $1
ORDER BY s.start_date DESC
LIMIT 100
