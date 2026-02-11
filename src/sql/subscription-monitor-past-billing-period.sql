-- Subscriptions past current_billing_period_end, excluding canceled and incomplete_expired. {{USER_FILTER}} applied.
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
JOIN api_server.users u ON s.user_id = u.id
LEFT JOIN api_server.organizations o ON s.organization_id = o.id
LEFT JOIN api_server.plans p ON p.id = s.plan_id
WHERE s.current_billing_period_end < NOW()
  AND s.status != 'canceled'
  AND s.status != 'incomplete_expired'
  AND {{USER_FILTER}}
ORDER BY s.current_billing_period_end ASC
