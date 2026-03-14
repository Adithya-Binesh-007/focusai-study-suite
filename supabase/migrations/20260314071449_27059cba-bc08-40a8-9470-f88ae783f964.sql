-- Table to track progress on on-site tasks (e.g. "asked 2/3 questions")
CREATE TABLE public.task_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  current_count integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL DEFAULT 1,
  progress_type text NOT NULL, -- e.g. 'ai_questions', 'exam_mode_use', 'pdf_download', 'photo_upload', 'visit_analytics', 'visit_credits', 'complete_tasks'
  tracked_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

ALTER TABLE public.task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.task_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.task_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.task_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
