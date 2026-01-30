-- Distinct users who viewed posts (any view source) in the date window. {{DATE_FILTER}} and {{USER_FILTER}} are applied to restrict to correct users.
SELECT COUNT(DISTINCT pv.user_id) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE 1=1
  {{DATE_FILTER}}
  {{USER_FILTER}}

