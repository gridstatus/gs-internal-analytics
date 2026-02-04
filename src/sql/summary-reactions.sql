-- Count of reactions in the date window. {{DATE_FILTER}} and {{USER_FILTER}} are applied to restrict to correct users.
SELECT COUNT(*) AS total
FROM insights.reactions r
JOIN api_server.users u ON r.user_id = u.id
WHERE r.id IS NOT NULL
  AND {{DATE_FILTER}}
  AND {{USER_FILTER}}

