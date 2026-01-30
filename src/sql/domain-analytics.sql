-- Analytics for a single domain: total users, new/active in 7d and 30d, admin count. Parameter $1 = domain (e.g. substring after @).
WITH domain_users AS (
  SELECT
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    u.created_at,
    u.last_active_at,
    u.is_admin
  FROM api_server.users u
  WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) = $1
)
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_7d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days') AS active_users_7d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_users_30d,
  COUNT(*) FILTER (WHERE is_admin = true) AS admin_count
FROM domain_users;

