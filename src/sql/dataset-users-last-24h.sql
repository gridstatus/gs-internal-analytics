-- Users who queried the given dataset in the last N days. $1 = dataset id, $2 = days (integer); {{USER_FILTER}} restricts to correct users.
-- avg_seconds_between = (last query − first query) / (num_requests − 1); NULL when num_requests < 2.
SELECT
  u.id AS user_id,
  u.username,
  COUNT(*) AS num_requests,
  MAX(aku."timestamp") AS last_query_at,
  EXTRACT(EPOCH FROM (MAX(aku."timestamp") - MIN(aku."timestamp")) / NULLIF(COUNT(*) - 1, 0)) AS avg_seconds_between
FROM api_server.api_key_usage aku
JOIN api_server.users u ON u.id = aku.user_id
WHERE aku.query ->> 'dataset' = $1
  AND aku."timestamp" >= NOW() - ($2::int * INTERVAL '1 day')
  AND {{USER_FILTER}}
GROUP BY u.id, u.username
ORDER BY num_requests DESC;
