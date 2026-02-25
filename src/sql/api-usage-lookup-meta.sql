-- Earliest API usage timestamp for a single user or organization. {{ID_COLUMN}} is set to user_id or organization_id by the caller; $1 is the entity ID.
SELECT MIN(timestamp) AS earliest_date
FROM api_server.api_key_usage
WHERE {{ID_COLUMN}} = $1
