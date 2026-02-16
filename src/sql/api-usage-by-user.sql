-- API usage grouped by user/org for the last 24 hours. Shows request counts, rows returned, client versions, and datasets accessed. Joins active subscriptions for plan info. {{USER_FILTER}} filters by username domain. User join is in the CTE so filtering applies before aggregation.
WITH processed_api_usage AS (
  SELECT
    COALESCE(aku.organization_id::TEXT, aku.user_id::TEXT) AS usage_id,
    aku.user_id,
    aku.organization_id,
    aku.timestamp,
    aku.rows_returned,
    aku.query,
    u.username
  FROM api_server.api_key_usage aku
  JOIN api_server.users u ON aku.user_id = u.id
  WHERE aku.timestamp >= current_date - INTERVAL '1 days'
    AND aku.api_key IS NOT NULL
    AND {{USER_FILTER}}
),
active_subscriptions AS (
  SELECT organization_id, user_id, plan_id
  FROM api_server.subscriptions
  WHERE status != 'canceled'
)
SELECT
  p.username AS user,
  org.name AS org,
  p.usage_id,
  COALESCE(sub_org.plan_id, sub_user.plan_id) AS plan_id,
  COUNT(*) AS total_requests,
  SUM(p.rows_returned) AS total_rows_returned,
  MAX(p.timestamp) AS last_request_time,
  array_agg(DISTINCT p.query ->> 'client_version') AS unique_client_versions,
  array_agg(DISTINCT p.query ->> 'dataset') AS unique_datasets,
  p.user_id,
  org.id AS org_id
FROM processed_api_usage p
LEFT JOIN api_server.organizations org ON p.organization_id = org.id
LEFT JOIN active_subscriptions sub_org ON p.organization_id = sub_org.organization_id
LEFT JOIN active_subscriptions sub_user ON p.organization_id IS NULL AND p.user_id = sub_user.user_id
GROUP BY
  p.username,
  org.name,
  org.id,
  p.user_id,
  p.usage_id,
  COALESCE(sub_org.plan_id, sub_user.plan_id)
ORDER BY SUM(p.rows_returned) DESC
