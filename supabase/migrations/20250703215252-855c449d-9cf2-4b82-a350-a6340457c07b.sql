-- Add new columns to meals table
ALTER TABLE public.meals 
ADD COLUMN meal_type TEXT,
ADD COLUMN ingredients JSONB,
ADD COLUMN calories INTEGER;

-- Rename meal_name to name
ALTER TABLE public.meals 
RENAME COLUMN meal_name TO name;

-- Create unique index on user_id and name
CREATE UNIQUE INDEX meals_user_name_idx ON public.meals(user_id, name);