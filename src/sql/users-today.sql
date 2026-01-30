-- Counts: users today, yesterday (all day and same time window), last week (all day and same time window). {{USER_FILTER}} is applied to restrict to correct users.
WITH today_start AS (
  SELECT DATE_TRUNC('day', NOW()) AS start_time
),
yesterday_start AS (
  SELECT DATE_TRUNC('day', NOW() - INTERVAL '1 day') AS start_time
),
last_week_start AS (
  SELECT DATE_TRUNC('day', NOW() - INTERVAL '7 days') AS start_time
),
users_today AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM today_start)
    AND created_at < (SELECT start_time FROM today_start) + INTERVAL '1 day'
    {{USER_FILTER}}
),
users_yesterday_all AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM yesterday_start)
    AND created_at < (SELECT start_time FROM yesterday_start) + INTERVAL '1 day'
    {{USER_FILTER}}
),
users_yesterday_same_time AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM yesterday_start)
    AND created_at < (SELECT start_time FROM yesterday_start) + (NOW() - (SELECT start_time FROM today_start))
    {{USER_FILTER}}
),
users_last_week_all AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_week_start)
    AND created_at < (SELECT start_time FROM last_week_start) + INTERVAL '1 day'
    {{USER_FILTER}}
),
users_last_week_same_time AS (
  SELECT COUNT(*) as count
  FROM api_server.users
  WHERE created_at >= (SELECT start_time FROM last_week_start)
    AND created_at < (SELECT start_time FROM last_week_start) + (NOW() - (SELECT start_time FROM today_start))
    {{USER_FILTER}}
)
SELECT 
  (SELECT count FROM users_today) as users_today,
  (SELECT count FROM users_yesterday_all) as users_yesterday_all,
  (SELECT count FROM users_yesterday_same_time) as users_yesterday_same_time,
  (SELECT count FROM users_last_week_all) as users_last_week_all,
  (SELECT count FROM users_last_week_same_time) as users_last_week_same_time

