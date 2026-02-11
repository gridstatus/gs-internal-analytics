-- Update only columns present in the request body. {{SET_CLAUSE}} is built by the caller (e.g. "plan_id = $2, status = $3"); $1 is the subscription id; $2..$N are the new values in the same order.
UPDATE api_server.subscriptions
SET {{SET_CLAUSE}}
WHERE id = $1
