-- Percentile rank of a user by created_at (first X% of users). $1 = user_id. Returns users_at_or_before and total.
SELECT
  (SELECT COUNT(*)::int FROM api_server.users
   WHERE created_at <= (SELECT created_at FROM api_server.users WHERE id = $1)) as users_at_or_before,
  (SELECT COUNT(*)::int FROM api_server.users) as total_users
