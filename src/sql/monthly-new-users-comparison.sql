-- Required placeholders:
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree

WITH current_month_start AS (
  SELECT DATE_TRUNC('month', NOW()) AS start_time
),
current_month_end AS (
  SELECT DATE_TRUNC('month', NOW()) + INTERVAL '1 month' AS end_time
),
previous_month_start AS (
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 month') AS start_time
),
previous_month_end AS (
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 month') + INTERVAL '1 month' AS end_time
),
last_year_month_start AS (
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 year') AS start_time
),
last_year_month_end AS (
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 year') + INTERVAL '1 month' AS end_time
),
current_month_all AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM current_month_start)
    AND created_at < (SELECT end_time FROM current_month_end)
    {{USER_FILTER}}
),
previous_month_all AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM previous_month_start)
    AND created_at < (SELECT start_time FROM current_month_start)
    {{USER_FILTER}}
),
previous_month_same_time AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM previous_month_start)
    AND created_at < (SELECT start_time FROM previous_month_start) + (NOW() - (SELECT start_time FROM current_month_start))
    {{USER_FILTER}}
),
last_year_month_all AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_year_month_start)
    AND created_at < (SELECT end_time FROM last_year_month_end)
    {{USER_FILTER}}
),
last_year_month_same_time AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_year_month_start)
    AND created_at < (SELECT start_time FROM last_year_month_start) + (NOW() - (SELECT start_time FROM current_month_start))
    {{USER_FILTER}}
)
SELECT 
  (SELECT count FROM current_month_all) as current_month_all,
  (SELECT count FROM previous_month_all) as previous_month_all,
  (SELECT count FROM previous_month_same_time) as previous_month_same_time,
  (SELECT count FROM last_year_month_all) as last_year_month_all,
  (SELECT count FROM last_year_month_same_time) as last_year_month_same_time

