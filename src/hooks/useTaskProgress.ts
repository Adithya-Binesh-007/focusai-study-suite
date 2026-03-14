import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

// Maps task titles to their progress_type and target
export const TRACKABLE_TASKS: Record<string, { type: string; target: number }> = {
  "Ask AI 3 questions": { type: "ai_questions", target: 3 },
  "Use Exam Mode": { type: "exam_mode_use", target: 1 },
  "Download AI notes as PDF": { type: "pdf_download", target: 1 },
  "Start a new AI conversation": { type: "new_conversation", target: 1 },
  "Upload a photo to AI": { type: "photo_upload", target: 1 },
  "Complete 5 other tasks": { type: "complete_tasks", target: 5 },
  "Visit the Analytics page": { type: "visit_analytics", target: 1 },
  "Check your credit balance": { type: "visit_credits", target: 1 },
};

export function useTaskProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementProgress = useCallback(
    async (progressType: string) => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // Find the task_progress row for this type today
      const { data: progressRows } = await supabase
        .from("task_progress")
        .select("*, tasks!inner(id, is_completed, title)")
        .eq("user_id", user.id)
        .eq("progress_type", progressType)
        .eq("tracked_date", today);

      if (!progressRows || progressRows.length === 0) return;

      for (const row of progressRows) {
        if ((row as any).tasks?.is_completed) continue; // already completed

        const newCount = Math.min(row.current_count + 1, row.target_count);

        await supabase
          .from("task_progress")
          .update({ current_count: newCount })
          .eq("id", row.id);

        // Auto-complete the task if target reached
        if (newCount >= row.target_count) {
          // Trigger task completion via the useTasks hook
          // We'll just mark it and let the UI reflect
        }
      }

      queryClient.invalidateQueries({ queryKey: ["task-progress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    [user, queryClient]
  );

  return { incrementProgress };
}
