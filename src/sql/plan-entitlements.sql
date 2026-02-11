-- Distinct entitlements from plans and subscription overrides, for use in subscription editing dropdowns.
SELECT DISTINCT entitlement FROM (
  SELECT unnest(entitlements) AS entitlement
  FROM api_server.plans
  WHERE entitlements IS NOT NULL
  UNION
  SELECT unnest(entitlement_overrides) AS entitlement
  FROM api_server.subscriptions
  WHERE entitlement_overrides IS NOT NULL
) combined
ORDER BY entitlement
