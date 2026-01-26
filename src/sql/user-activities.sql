-- Unified activity feed: user registrations, joining orgs, creating charts/dashboards, creating API keys, creating alerts
-- Optimized: Only fetch activities from last 90 days to improve performance
WITH user_registrations AS (
  SELECT
    u.id as user_id,
    u.username,
    u.created_at as activity_date,
    'user_registered' as activity_type,
    NULL::text as activity_detail
  FROM api_server.users u
  WHERE 1=1
    AND u.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
),
org_joins AS (
  SELECT
    uo.user_id,
    u.username,
    u.created_at as activity_date,
    'joined_org' as activity_type,
    o.name as activity_detail
  FROM api_server.user_organizations uo
  JOIN api_server.users u ON u.id = uo.user_id
  JOIN api_server.organizations o ON o.id = uo.organization_id
  WHERE 1=1
    AND u.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
),
chart_creations AS (
  SELECT
    c.user_id,
    u.username,
    c.created_at as activity_date,
    'created_chart' as activity_type,
    c.name as activity_detail
  FROM api_server.charts c
  JOIN api_server.users u ON u.id = c.user_id
  WHERE 1=1
    AND c.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
),
dashboard_creations AS (
  SELECT
    d.user_id,
    u.username,
    d.created_at as activity_date,
    'created_dashboard' as activity_type,
    d.name as activity_detail
  FROM api_server.dashboards d
  JOIN api_server.users u ON u.id = d.user_id
  WHERE 1=1
    AND d.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
),
api_key_creations AS (
  SELECT
    ak.user_id,
    u.username,
    ak.created_at as activity_date,
    'created_api_key' as activity_type,
    'API Key'::text as activity_detail
  FROM api_server.api_keys ak
  JOIN api_server.users u ON u.id = ak.user_id
  WHERE 1=1
    AND ak.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
),
alert_creations AS (
  SELECT
    a.user_id,
    u.username,
    a.created_at as activity_date,
    'created_alert' as activity_type,
    NULL::text as activity_detail
  FROM api_server.alerts a
  JOIN api_server.users u ON u.id = a.user_id
  WHERE 1=1
    AND a.created_at >= NOW() - INTERVAL '90 days'
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{INTERNAL_EMAIL_FILTER}}
)
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM user_registrations
UNION ALL
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM org_joins
UNION ALL
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM chart_creations
UNION ALL
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM dashboard_creations
UNION ALL
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM api_key_creations
UNION ALL
SELECT
  user_id,
  username,
  activity_date,
  activity_type,
  activity_detail
FROM alert_creations
ORDER BY activity_date DESC
LIMIT 1000;

