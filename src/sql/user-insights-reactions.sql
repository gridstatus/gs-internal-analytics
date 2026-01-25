SELECT
  p.id,
  p.content,
  p.created_at,
  p.author_id,
  u.username as author_username,
  r.reaction_type,
  r.created_at as reaction_date
FROM insights.reactions r
JOIN insights.posts p ON r.post_id = p.id
LEFT JOIN api_server.users u ON p.author_id = u.id
WHERE r.user_id = $1
  AND p.status = 'PUBLISHED'
ORDER BY r.created_at DESC
LIMIT 100;

