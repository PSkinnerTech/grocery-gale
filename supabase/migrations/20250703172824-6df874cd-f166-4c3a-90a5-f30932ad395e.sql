-- Check if there's a unique constraint on dietary_preferences.user_id and remove it if it exists
-- Since we want to use upsert, we should have a unique constraint but handle it properly

-- First, let's see what constraints exist
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'dietary_preferences' 
AND constraint_type = 'UNIQUE';

-- Drop the unique constraint if it exists (it should be recreated properly)
ALTER TABLE public.dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;

-- Add the unique constraint back properly
ALTER TABLE public.dietary_preferences ADD CONSTRAINT dietary_preferences_user_id_unique UNIQUE (user_id);