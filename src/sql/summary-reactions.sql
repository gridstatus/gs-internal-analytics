-- Count of reactions in the date window. {{DATE_FILTER}} and {{USER_FILTER}} are applied to restrict to correct users.
SELECT COUNT(*) AS total
FROM insights.reactions r
JOIN api_server.users u ON r.user_id = u.id
WHERE 1=1
  {{DATE_FILTER}}
  {{USER_FILTER}}

