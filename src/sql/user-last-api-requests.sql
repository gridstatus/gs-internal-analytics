-- Last 10 API requests for a single user. $1 = user_id. {{USER_FILTER}} is applied via join to users.
SELECT
  aku.timestamp,
  aku.rows_returned,
  aku.query ->> 'dataset' AS dataset,
  aku.query ->> 'client_version' AS client_version
FROM api_server.api_key_usage aku
JOIN api_server.users u ON u.id = aku.user_id
WHERE aku.user_id = $1
  AND aku.api_key IS NOT NULL
  AND {{USER_FILTER}}
ORDER BY aku.timestamp DESC
LIMIT 10
