-- The verified GitHub CPU worker owns scheduled Senate imports. Edge remains
-- available for authenticated manual requests, but its source access is denied.
-- Avoid competing runs overwriting the worker's observed source status.
SELECT cron.alter_job(job_id := jobid, active := false)
FROM cron.job WHERE jobname = 'sync-senate-trades';
