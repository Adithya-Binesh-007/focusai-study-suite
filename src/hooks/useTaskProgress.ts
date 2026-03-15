import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

// Maps task titles to their progress_type, target, and action route
export const TRACKABLE_TASKS: Record<string, { type: string; target: number; route?: string; actionLabel?: string }> = {
  "Ask AI 3 questions": { type: "ai_questions", target: 3, route: "/assistant", actionLabel: "Go to Assistant" },
  "Use Exam Mode": { type: "exam_mode_use", target: 1, route: "/assistant", actionLabel: "Go to Exam Mode" },
  "Download AI notes as PDF": { type: "pdf_download", target: 1, route: "/assistant", actionLabel: "Go to Assistant" },
  "Start a new AI conversation": { type: "new_conversation", target: 1, route: "/assistant", actionLabel: "Start Conversation" },
  "Upload a photo to AI": { type: "photo_upload", target: 1, route: "/assistant", actionLabel: "Upload Photo" },
  "Complete 5 other tasks": { type: "complete_tasks", target: 5 },
  "Visit the Analytics page": { type: "visit_analytics", target: 1, route: "/analytics", actionLabel: "Go to Analytics" },
  "Check your credit balance": { type: "visit_credits", target: 1, route: "/credits", actionLabel: "Go to Credits" },
};

export function useTaskProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementProgress = useCallback(
    async (progressType: string) => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data: progressRows } = await supabase
        .from("task_progress")
        .select("*, tasks!inner(id, is_completed, title, credits_reward)")
        .eq("user_id", user.id)
        .eq("progress_type", progressType)
        .eq("tracked_date", today);

      if (!progressRows || progressRows.length === 0) return;

      for (const row of progressRows) {
        const task = (row as any).tasks;
        if (task?.is_completed) continue;

        const newCount = Math.min(row.current_count + 1, row.target_count);

        await supabase
          .from("task_progress")
          .update({ current_count: newCount })
          .eq("id", row.id);

        // Auto-complete the task and award credits when target reached
        if (newCount >= row.target_count && task) {
          await supabase
            .from("tasks")
            .update({ is_completed: true })
            .eq("id", task.id);

          // Award credits
          const { data: profile } = await supabase
            .from("profiles")
            .select("total_credits")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ total_credits: profile.total_credits + task.credits_reward })
              .eq("user_id", user.id);
          }

          await supabase.from("credit_transactions").insert({
            user_id: user.id,
            amount: task.credits_reward,
            type: "earned" as const,
            description: `Completed task: ${task.title}`,
          });

          // Also increment "complete_tasks" progress for the meta-task
          if (progressType !== "complete_tasks") {
            // Recursively increment the "complete 5 other tasks" tracker
            await incrementProgress("complete_tasks");
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["task-progress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    },
    [user, queryClient]
  );

  return { incrementProgress };
}
