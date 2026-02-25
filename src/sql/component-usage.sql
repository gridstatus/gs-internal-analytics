-- Per-component-type usage in charts and dashboards: counts and distinct users. {{USER_FILTER}} is applied via join to api_server.users u.
WITH filtered_charts AS (
  SELECT c.component_type, c.user_id, u.username
  FROM api_server.charts c
  JOIN api_server.users u ON u.id = c.user_id
  WHERE c.status = 'active'
    AND {{USER_FILTER}}
),
charts_counts AS (
  SELECT
    component_type,
    COUNT(*) AS total_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM filtered_charts
  GROUP BY component_type
),
charts_user_list AS (
  SELECT
    component_type,
    json_agg(
      json_build_object('id', user_id, 'username', username)
      ORDER BY username
    ) AS users
  FROM (SELECT DISTINCT component_type, user_id, username FROM filtered_charts) AS dedup
  GROUP BY component_type
),
charts_usage AS (
  SELECT cc.component_type, cc.total_count, cc.unique_users, COALESCE(cu.users, '[]'::json) AS users
  FROM charts_counts cc
  LEFT JOIN charts_user_list cu ON cc.component_type = cu.component_type
),
dashboard_components AS (
  SELECT d.user_id, comp.value->>'type' AS component_type, u.username
  FROM api_server.dashboards d
  JOIN api_server.users u ON u.id = d.user_id
  CROSS JOIN LATERAL jsonb_each(d.dashboard_data->'components') AS comp(key, value)
  WHERE d.status = 'active'
    AND d.dashboard_data ? 'components'
    AND {{USER_FILTER}}
),
dashboards_counts AS (
  SELECT
    component_type,
    COUNT(*) AS total_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM dashboard_components
  GROUP BY component_type
),
dashboards_user_list AS (
  SELECT
    component_type,
    json_agg(
      json_build_object('id', user_id, 'username', username)
      ORDER BY username
    ) AS users
  FROM (SELECT DISTINCT component_type, user_id, username FROM dashboard_components) AS dedup
  GROUP BY component_type
),
dashboards_usage AS (
  SELECT dc.component_type, dc.total_count, dc.unique_users, COALESCE(du.users, '[]'::json) AS users
  FROM dashboards_counts dc
  LEFT JOIN dashboards_user_list du ON dc.component_type = du.component_type
)
SELECT
  COALESCE(c.component_type, d.component_type) AS component_type,
  COALESCE(c.total_count, 0) AS charts_total_count,
  COALESCE(c.unique_users, 0) AS charts_unique_users,
  COALESCE(c.users, '[]'::json) AS charts_users,
  COALESCE(d.total_count, 0) AS dashboards_total_count,
  COALESCE(d.unique_users, 0) AS dashboards_unique_users,
  COALESCE(d.users, '[]'::json) AS dashboards_users
FROM charts_usage c
FULL OUTER JOIN dashboards_usage d ON c.component_type = d.component_type
ORDER BY component_type;
