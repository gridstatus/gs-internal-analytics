SELECT
  al.id,
  al.alert_id,
  al.type,
  al.value,
  al.timestamp,
  al.message
FROM api_server.alert_logs al
WHERE al.user_id = $1
ORDER BY al.timestamp DESC
LIMIT 100

