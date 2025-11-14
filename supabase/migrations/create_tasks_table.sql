-- Create tasks table to sync GHL tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ghl_task_id TEXT UNIQUE NOT NULL,
    ghl_contact_id TEXT,
    task_name TEXT NOT NULL,
    task_description TEXT,
    assignee_name TEXT,
    assignee_id TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_ghl_task_id ON public.tasks(ghl_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ghl_contact_id ON public.tasks(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable Row Level Security (optional)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on tasks" ON public.tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.tasks IS 'Syncs tasks created in GoHighLevel via webhook';
