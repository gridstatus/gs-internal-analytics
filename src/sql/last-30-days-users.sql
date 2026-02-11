-- Count of new users in the last 30 days, previous 30 days, and same 30-day window 1 year ago. {{USER_FILTER}} is applied to restrict to correct users. Single scan using FILTER.
WITH bounds AS (
  SELECT
    NOW() - INTERVAL '30 days' AS last_30_start,
    NOW() - INTERVAL '60 days' AS prev_30_start,
    NOW() - INTERVAL '1 year' - INTERVAL '30 days' AS ly_start,
    NOW() - INTERVAL '1 year' AS ly_end
)
SELECT
  COUNT(*) FILTER (
    WHERE created_at >= b.last_30_start
      AND created_at < NOW()
  )::text AS last_30_days,
  COUNT(*) FILTER (
    WHERE created_at >= b.prev_30_start
      AND created_at < b.last_30_start
  )::text AS previous_30_days,
  COUNT(*) FILTER (
    WHERE created_at >= b.ly_start
      AND created_at < b.ly_end
  )::text AS last_30_days_same_time_1_year_ago
FROM api_server.users, bounds b
WHERE created_at >= b.ly_start
  AND {{USER_FILTER}}
