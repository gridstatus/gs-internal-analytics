-- Distinct entitlements across all plans, for use in subscription editing dropdowns.
SELECT DISTINCT unnest(entitlements) AS entitlement
FROM api_server.plans
WHERE entitlements IS NOT NULL
ORDER BY entitlement
