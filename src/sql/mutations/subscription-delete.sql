-- Delete a subscription by id. $1 = subscription id. Caller must verify the subscription has no stripe_subscription_id before calling.
DELETE FROM api_server.subscriptions
WHERE id = $1
