-- Single plan row by id. Parameter $1 = plan id.
SELECT *
FROM api_server.plans
WHERE id = $1
