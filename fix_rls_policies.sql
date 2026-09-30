-- Triadict Studio - Fix RLS Policies for Tasks and Learning Logs

-- Enable RLS just in case they aren't enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
-- 1. Check if SELECT policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can view all tasks'
    ) THEN
        CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);
    END IF;
END
$$;

-- 2. Drop the incorrect policies if they were created from the previous script
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- 3. Create the correct policies using 'assigned_to'
CREATE POLICY "Authenticated users can insert tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Users can update their tasks" 
ON public.tasks FOR UPDATE 
USING (true)
WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Users can delete their tasks" 
ON public.tasks FOR DELETE 
USING (auth.uid() = assigned_to);


-- Learning Logs Policies
-- 1. Check if SELECT policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_logs' AND policyname = 'Users can view all learning logs'
    ) THEN
        CREATE POLICY "Users can view all learning logs" ON public.learning_logs FOR SELECT USING (true);
    END IF;
END
$$;

-- 2. Drop the incorrect policies if they were created from the previous script
DROP POLICY IF EXISTS "Authenticated users can insert learning logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Users can delete their own learning logs" ON public.learning_logs;

-- 3. Create the correct policies using 'member_id'
CREATE POLICY "Authenticated users can insert learning logs" 
ON public.learning_logs FOR INSERT 
WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can delete their own learning logs" 
ON public.learning_logs FOR DELETE 
USING (auth.uid() = member_id);

CREATE POLICY "Users can update their own learning logs" 
ON public.learning_logs FOR UPDATE 
USING (true)
WITH CHECK (auth.uid() = member_id);
