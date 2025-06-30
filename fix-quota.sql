-- Fix admin user quota
UPDATE user_quotas 
SET 
  max_storage = 107374182400, -- 100 GB
  max_files = 100000,
  used_storage = 0,
  used_files = 0
WHERE user_id = '2e4f1e48-bdcf-4446-a04d-b4a2e4c0baf3';

-- Check result
SELECT * FROM user_quotas WHERE user_id = '2e4f1e48-bdcf-4446-a04d-b4a2e4c0baf3';