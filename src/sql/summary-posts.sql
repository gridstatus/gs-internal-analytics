-- Count of published insights posts in the given period. {{USER_FILTER}} is not applied (posts are by GS employees). {{DATE_FILTER}} is required (e.g. p.created_at >= ...).
SELECT COUNT(*) AS total
FROM insights.posts p
WHERE p.status = 'PUBLISHED'
  AND {{DATE_FILTER}}
