-- Count of feed impressions in the date window. {{DATE_FILTER}} and {{USER_FILTER}} are applied to restrict to correct users.
SELECT COUNT(*) AS total
FROM insights.post_views pv
JOIN api_server.users u ON pv.user_id = u.id
WHERE pv.view_source = 'feed'
  AND {{DATE_FILTER}}
  AND {{USER_FILTER}}

