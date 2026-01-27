-- Required placeholders:
--   {{DAYS_OFFSET}} - Number of days to offset (0 = today, 1 = yesterday, 7 = last week)
--   {{USER_FILTER}} - Combined filter for gridstatus.io domain and test account

WITH hours AS (
  SELECT generate_series(
    DATE_TRUNC('day', NOW() - INTERVAL '{{DAYS_OFFSET}} days'),
    -- For today (days_offset=0), cap at current hour; for past days, show all 24 hours
    LEAST(
      DATE_TRUNC('day', NOW() - INTERVAL '{{DAYS_OFFSET}} days') + INTERVAL '1 day' - INTERVAL '1 hour',
      DATE_TRUNC('hour', NOW())
    ),
    INTERVAL '1 hour'
  ) AS hour
),
counts AS (
  SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS new_users
  FROM api_server.users
  WHERE created_at >= DATE_TRUNC('day', NOW() - INTERVAL '{{DAYS_OFFSET}} days')
    AND created_at < DATE_TRUNC('day', NOW() - INTERVAL '{{DAYS_OFFSET}} days') + INTERVAL '1 day'
    {{USER_FILTER}}
  GROUP BY 1
)
SELECT h.hour, COALESCE(c.new_users, 0) AS new_users
FROM hours h
LEFT JOIN counts c ON c.hour = h.hour
ORDER BY h.hour ASC

