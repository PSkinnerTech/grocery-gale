-- Create table to track last user message timestamps
CREATE TABLE public.user_message_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_message_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_message_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own message activity" 
ON public.user_message_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own message activity" 
ON public.user_message_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message activity" 
ON public.user_message_activity 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_message_activity_updated_at
BEFORE UPDATE ON public.user_message_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();