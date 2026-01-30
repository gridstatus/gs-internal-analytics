-- Saved posts for a user, most recent first. Parameter $1 = user_id.
SELECT
  p.id,
  p.content,
  p.created_at,
  p.author_id,
  u.username as author_username,
  sp.created_at as saved_date
FROM insights.saved_posts sp
JOIN insights.posts p ON sp.post_id = p.id
LEFT JOIN api_server.users u ON p.author_id = u.id
WHERE sp.user_id = $1
  AND p.status = 'PUBLISHED'
ORDER BY sp.created_at DESC
LIMIT 100;

