-- Subscriptions where limit not enforced and not canceled. {{USER_FILTER}} applied.
SELECT
  s.id,
  s.user_id,
  u.username,
  o.name AS organization_name
FROM api_server.subscriptions s
JOIN api_server.users u ON s.user_id = u.id
LEFT JOIN api_server.organizations o ON s.organization_id = o.id
WHERE s.enforce_api_usage_limit = false
  AND s.status != 'canceled'
  AND {{USER_FILTER}}
