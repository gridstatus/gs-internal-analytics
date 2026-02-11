-- Trialing subscriptions with no Stripe ID; past_end_date when billing period end is past. {{USER_FILTER}} applied.
SELECT
  s.id,
  s.user_id,
  u.username,
  o.name AS organization_name,
  s.status,
  s.current_billing_period_end < NOW() AS past_end_date
FROM api_server.subscriptions s
JOIN api_server.users u ON s.user_id = u.id
LEFT JOIN api_server.organizations o ON s.organization_id = o.id
WHERE s.status = 'trialing'
  AND s.stripe_subscription_id IS NULL
  AND {{USER_FILTER}}
