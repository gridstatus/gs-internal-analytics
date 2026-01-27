-- Required placeholders:
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

WITH last_30_days_start AS (
  SELECT NOW() - INTERVAL '30 days' AS start_time
),
previous_30_days_start AS (
  SELECT NOW() - INTERVAL '60 days' AS start_time
),
previous_30_days_end AS (
  SELECT NOW() - INTERVAL '30 days' AS end_time
),
last_30_days_count AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_30_days_start)
    AND created_at < NOW()
    {{USER_FILTER}}
),
previous_30_days_count AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM previous_30_days_start)
    AND created_at < (SELECT end_time FROM previous_30_days_end)
    {{USER_FILTER}}
)
SELECT 
  (SELECT count FROM last_30_days_count)::text AS last_30_days,
  (SELECT count FROM previous_30_days_count)::text AS previous_30_days

