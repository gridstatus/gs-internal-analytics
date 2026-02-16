-- Insert a new subscription via CTE for readable preview. $1=user_id, $2=organization_id, $3=plan_id, $4=status, $5=start_date, $6=enforce_api_usage_limit, $7=cancel_at_period_end, $8=current_billing_period_start, $9=current_billing_period_end. created_at set to NOW(). Returns the new row id.
WITH input AS (
  SELECT
    $1::bigint       AS user_id,
    $2::text         AS organization_id,
    $3::int          AS plan_id,
    $4::text         AS status,
    $5::timestamptz  AS start_date,
    $6::boolean      AS enforce_api_usage_limit,
    $7::boolean      AS cancel_at_period_end,
    $8::timestamptz  AS current_billing_period_start,
    $9::timestamptz  AS current_billing_period_end
)
INSERT INTO api_server.subscriptions (
  user_id,
  organization_id,
  plan_id,
  status,
  start_date,
  enforce_api_usage_limit,
  cancel_at_period_end,
  current_billing_period_start,
  current_billing_period_end,
  created_at
)
SELECT
  user_id,
  organization_id,
  plan_id,
  status,
  start_date,
  enforce_api_usage_limit,
  cancel_at_period_end,
  current_billing_period_start,
  current_billing_period_end,
  NOW()
FROM input
RETURNING id
