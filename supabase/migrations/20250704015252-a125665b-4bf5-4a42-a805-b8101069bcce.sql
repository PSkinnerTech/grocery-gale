-- Enable Row Level Security on n8n_chat_histories table
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Since this table doesn't have a user_id column and is used for n8n integration,
-- we'll restrict access to only service role or specific functions
-- This prevents public access while allowing controlled access through edge functions

-- Create a policy that denies all public access by default
CREATE POLICY "Deny all public access to n8n_chat_histories" 
ON public.n8n_chat_histories 
FOR ALL 
USING (false);