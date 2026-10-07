-- The verified GitHub CPU worker owns scheduled Senate imports. Edge remains
-- available for authenticated manual requests, but its source access is denied.
-- Avoid competing runs overwriting the worker's observed source status.
UPDATE cron.job SET active = false WHERE jobname = 'sync-senate-trades';
