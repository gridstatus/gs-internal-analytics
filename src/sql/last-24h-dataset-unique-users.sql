-- Unique users per dataset in the last 24 hours. {{USER_FILTER}} restricts to correct users (join to users for domain filtering).
SELECT
  aku.query ->> 'dataset' AS dataset_id,
  COUNT(DISTINCT aku.user_id) AS num_unique_users,
  MAX(aku."timestamp") AS last_query_at
FROM api_server.api_key_usage aku
JOIN api_server.users u ON u.id = aku.user_id
WHERE aku."timestamp" >= NOW() - INTERVAL '24 hours'
  AND aku.query ? 'dataset'
  AND {{USER_FILTER}}
GROUP BY aku.query ->> 'dataset'
ORDER BY num_unique_users DESC;
