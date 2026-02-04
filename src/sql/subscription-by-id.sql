-- Single subscription by id with username, organization name, and plan name. Parameter $1 = subscription id.
SELECT
  s.id,
  s.user_id,
  u.username,
  s.plan_id,
  p.plan_name,
  s.start_date,
  s.status,
  s.cancel_at_period_end,
  s.organization_id,
  o.name AS organization_name,
  s.stripe_subscription_id,
  s.current_billing_period_start,
  s.current_billing_period_end,
  s.created_at,
  s.enforce_api_usage_limit,
  s.api_rows_returned_limit_override,
  s.api_requests_limit_override,
  s.api_rows_per_response_limit_override,
  s.alerts_limit_override,
  s.dashboards_limit_override,
  s.downloads_limit_override,
  s.entitlement_overrides,
  s.per_second_api_rate_limit_override,
  s.per_minute_api_rate_limit_override,
  s.per_hour_api_rate_limit_override,
  s.charts_limit_override
FROM api_server.subscriptions s
LEFT JOIN api_server.users u ON u.id = s.user_id
LEFT JOIN api_server.organizations o ON o.id = s.organization_id
LEFT JOIN api_server.plans p ON p.id = s.plan_id
WHERE s.id = $1
