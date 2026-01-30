-- Registrations by period (day, week, or month) with counts and corp breakdown. {{USER_FILTER}} is applied to restrict to correct users.
WITH user_data AS (
  SELECT
    created_at,
    CASE
      WHEN SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT LIKE '%.edu'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT LIKE '%.gov'
      THEN TRUE
      ELSE FALSE
    END AS is_corporate_domain
  FROM api_server.users
  WHERE 1=1
    AND created_at IS NOT NULL
    {{USER_FILTER}}
),
daily_registrations AS (
  SELECT
    DATE_TRUNC('day', created_at) AS period,
    'day' AS period_type,
    COUNT(*) AS registration_count
  FROM user_data
  GROUP BY DATE_TRUNC('day', created_at)
),
weekly_registrations AS (
  SELECT
    DATE_TRUNC('week', created_at) AS period,
    'week' AS period_type,
    COUNT(*) AS registration_count
  FROM user_data
  GROUP BY DATE_TRUNC('week', created_at)
),
monthly_registrations AS (
  SELECT
    DATE_TRUNC('month', created_at) AS period,
    'month' AS period_type,
    COUNT(*) AS registration_count
  FROM user_data
  GROUP BY DATE_TRUNC('month', created_at)
),
all_periods AS (
  SELECT period, period_type, registration_count FROM daily_registrations
  UNION ALL
  SELECT period, period_type, registration_count FROM weekly_registrations
  UNION ALL
  SELECT period, period_type, registration_count FROM monthly_registrations
)
SELECT
  period,
  period_type,
  registration_count
FROM all_periods
ORDER BY period_type, registration_count DESC, period DESC;

