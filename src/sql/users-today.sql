-- Counts: users today, yesterday (all day and same time window), last week (all day and same time window). {{USER_FILTER}} is applied to restrict to correct users. Single scan using FILTER.
WITH bounds AS (
  SELECT
    DATE_TRUNC('day', NOW()) AS today_start,
    DATE_TRUNC('day', NOW() - INTERVAL '1 day') AS yesterday_start,
    DATE_TRUNC('day', NOW() - INTERVAL '7 days') AS last_week_start,
    NOW() - DATE_TRUNC('day', NOW()) AS elapsed_today
)
SELECT
  COUNT(*) FILTER (
    WHERE created_at >= b.today_start
      AND created_at < b.today_start + INTERVAL '1 day'
  ) AS users_today,
  COUNT(*) FILTER (
    WHERE created_at >= b.yesterday_start
      AND created_at < b.yesterday_start + INTERVAL '1 day'
  ) AS users_yesterday_all,
  COUNT(*) FILTER (
    WHERE created_at >= b.yesterday_start
      AND created_at < b.yesterday_start + b.elapsed_today
  ) AS users_yesterday_same_time,
  COUNT(*) FILTER (
    WHERE created_at >= b.last_week_start
      AND created_at < b.last_week_start + INTERVAL '1 day'
  ) AS users_last_week_all,
  COUNT(*) FILTER (
    WHERE created_at >= b.last_week_start
      AND created_at < b.last_week_start + b.elapsed_today
  ) AS users_last_week_same_time
FROM api_server.users, bounds b
WHERE created_at >= b.last_week_start
  AND {{USER_FILTER}}
