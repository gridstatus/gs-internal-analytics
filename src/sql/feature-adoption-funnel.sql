-- Feature Adoption Funnel
-- Tracks user progression through key features

WITH user_features AS (
  SELECT
    u.id as user_id,
    CASE WHEN EXISTS (SELECT 1 FROM api_server.dashboards d WHERE d.user_id = u.id) THEN 1 ELSE 0 END as has_dashboard,
    CASE WHEN EXISTS (SELECT 1 FROM api_server.charts c WHERE c.user_id = u.id) THEN 1 ELSE 0 END as has_chart,
    CASE WHEN EXISTS (SELECT 1 FROM api_server.alerts a WHERE a.user_id = u.id) THEN 1 ELSE 0 END as has_alert,
    CASE WHEN EXISTS (SELECT 1 FROM api_server.downloads dl WHERE dl.user_id = u.id) THEN 1 ELSE 0 END as has_download,
    CASE WHEN EXISTS (SELECT 1 FROM api_server.api_keys ak WHERE ak.user_id = u.id AND ak.is_active = true) THEN 1 ELSE 0 END as has_api_key
  FROM api_server.users u
  WHERE 1=1
    AND u.created_at > NOW() - INTERVAL 12 MONTH
    AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
    {{EDU_GOV_FILTER}}
    {{INTERNAL_EMAIL_FILTER}}
)
SELECT
  COUNT(*) as total_users,
  SUM(has_dashboard) as dashboard_users,
  SUM(has_chart) as chart_users,
  SUM(has_alert) as alert_users,
  SUM(has_download) as download_users,
  SUM(has_api_key) as api_key_users,
  SUM(CASE WHEN has_dashboard = 1 AND has_chart = 1 AND has_alert = 1 THEN 1 ELSE 0 END) as multi_feature_users
FROM user_features;

