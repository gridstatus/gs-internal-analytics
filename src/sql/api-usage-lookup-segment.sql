-- Request count, total rows, distinct user count, and user ID array for one time segment. {{ID_COLUMN}} is set to user_id or organization_id; $1 = entity ID, $2 = segment start (inclusive), $3 = segment end (exclusive).
SELECT
  COUNT(*) AS request_count,
  COALESCE(SUM(rows_returned), 0)::bigint AS total_rows,
  COUNT(DISTINCT user_id) AS distinct_users,
  ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS user_ids
FROM api_server.api_key_usage
WHERE {{ID_COLUMN}} = $1
  AND timestamp >= $2::timestamptz
  AND timestamp < $3::timestamptz
