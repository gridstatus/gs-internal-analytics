-- Count of new users in the last 30 days, previous 30 days, and same 30-day window 1 year ago. {{USER_FILTER}} is applied to restrict to correct users.
WITH last_30_days_start AS (
  SELECT NOW() - INTERVAL '30 days' AS start_time
),
previous_30_days_start AS (
  SELECT NOW() - INTERVAL '60 days' AS start_time
),
previous_30_days_end AS (
  SELECT NOW() - INTERVAL '30 days' AS end_time
),
same_time_1_year_ago_start AS (
  SELECT NOW() - INTERVAL '1 year' - INTERVAL '30 days' AS start_time
),
same_time_1_year_ago_end AS (
  SELECT NOW() - INTERVAL '1 year' AS end_time
),
last_30_days_count AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_30_days_start)
    AND created_at < NOW()
    AND {{USER_FILTER}}
),
previous_30_days_count AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM previous_30_days_start)
    AND created_at < (SELECT end_time FROM previous_30_days_end)
    AND {{USER_FILTER}}
),
same_time_1_year_ago_count AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM same_time_1_year_ago_start)
    AND created_at < (SELECT end_time FROM same_time_1_year_ago_end)
    AND {{USER_FILTER}}
)
SELECT 
  (SELECT count FROM last_30_days_count)::text AS last_30_days,
  (SELECT count FROM previous_30_days_count)::text AS previous_30_days,
  (SELECT count FROM same_time_1_year_ago_count)::text AS last_30_days_same_time_1_year_ago

