-- New-user counts for current month, previous month, and same month last year. {{USER_FILTER}} is applied to restrict to correct users. Single scan using FILTER.
WITH bounds AS (
  SELECT
    DATE_TRUNC('month', NOW()) AS cur_start,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' AS cur_end,
    DATE_TRUNC('month', NOW() - INTERVAL '1 month') AS prev_start,
    DATE_TRUNC('month', NOW() - INTERVAL '1 year') AS ly_start,
    DATE_TRUNC('month', NOW() - INTERVAL '1 year') + INTERVAL '1 month' AS ly_end,
    NOW() - DATE_TRUNC('month', NOW()) AS elapsed_this_month
)
SELECT
  COUNT(*) FILTER (
    WHERE created_at >= b.cur_start
      AND created_at < b.cur_end
  ) AS current_month_all,
  COUNT(*) FILTER (
    WHERE created_at >= b.prev_start
      AND created_at < b.cur_start
  ) AS previous_month_all,
  COUNT(*) FILTER (
    WHERE created_at >= b.prev_start
      AND created_at < b.prev_start + b.elapsed_this_month
  ) AS previous_month_same_time,
  COUNT(*) FILTER (
    WHERE created_at >= b.ly_start
      AND created_at < b.ly_end
  ) AS last_year_month_all,
  COUNT(*) FILTER (
    WHERE created_at >= b.ly_start
      AND created_at < b.ly_start + b.elapsed_this_month
  ) AS last_year_month_same_time
FROM api_server.users, bounds b
WHERE created_at >= b.ly_start
  AND {{USER_FILTER}}
