import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { TRACKABLE_TASKS } from "@/hooks/useTaskProgress";

// On-site tasks (trackable within the app) — majority
const ONSITE_TASKS = [
  { title: "Ask AI 3 questions", description: "Use the AI Study Assistant to ask 3 study questions" },
  { title: "Use Exam Mode", description: "Switch to Exam Mode and practice with AI-generated questions" },
  { title: "Download AI notes as PDF", description: "Generate study notes with AI and download them as PDF" },
  { title: "Start a new AI conversation", description: "Begin a fresh conversation with the AI assistant" },
  { title: "Upload a photo to AI", description: "Upload a study photo and ask the AI to analyze it" },
  { title: "Complete 5 other tasks", description: "Complete at least 5 other daily tasks today" },
  { title: "Visit the Analytics page", description: "Check your study analytics and progress" },
  { title: "Check your credit balance", description: "Visit the Credits page and review your balance" },
];

// Off-site tasks (manual/honor system) — fewer
const OFFSITE_TASKS = [
  { title: "Study for 30 minutes", description: "Focus on your weakest subject for 30 minutes" },
  { title: "Read 10 pages", description: "Read 10 pages from your textbook" },
  { title: "Solve 5 math problems", description: "Practice with 5 problems on paper" },
  { title: "Revise yesterday's notes", description: "Go through notes from your last study session" },
];

type Difficulty = "easy" | "medium" | "difficult";

interface TaskProgress {
  id: string;
  task_id: string;
  current_count: number;
  target_count: number;
  progress_type: string;
}

function generateDailyTasks(userId: string) {
  const shuffledOnsite = [...ONSITE_TASKS].sort(() => Math.random() - 0.5).slice(0, 7);
  const shuffledOffsite = [...OFFSITE_TASKS].sort(() => Math.random() - 0.5).slice(0, 3);
  const allTasks = [...shuffledOnsite, ...shuffledOffsite].sort(() => Math.random() - 0.5);

  const difficulties = ([
    "easy", "easy", "easy", "easy",
    "medium", "medium", "medium", "medium",
    "difficult", "difficult",
  ] as Difficulty[]).sort(() => Math.random() - 0.5);

  const rewards: Record<Difficulty, number> = { easy: 5, medium: 10, difficult: 15 };

  return allTasks.map((task, i) => ({
    user_id: userId,
    title: task.title,
    description: task.description,
    difficulty: difficulties[i],
    credits_reward: rewards[difficulties[i]],
    is_completed: false,
    generated_date: new Date().toISOString().split("T")[0],
  }));
}

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("generated_date", today)
        .order("created_at");
      if (error) throw error;

      if (!data || data.length === 0) {
        const newTasks = generateDailyTasks(user.id);
        const { data: inserted, error: insertError } = await supabase
          .from("tasks")
          .insert(newTasks)
          .select();
        if (insertError) throw insertError;

        // Create task_progress rows for trackable on-site tasks
        if (inserted) {
          const progressRows = inserted
            .filter((t) => TRACKABLE_TASKS[t.title])
            .map((t) => ({
              user_id: user.id,
              task_id: t.id,
              current_count: 0,
              target_count: TRACKABLE_TASKS[t.title].target,
              progress_type: TRACKABLE_TASKS[t.title].type,
              tracked_date: today,
            }));
          if (progressRows.length > 0) {
            await supabase.from("task_progress").insert(progressRows);
          }
        }

        return inserted || [];
      }
      return data;
    },
    enabled: !!user,
  });

  // Fetch progress for all tasks today
  const { data: taskProgress = [] } = useQuery<TaskProgress[]>({
    queryKey: ["task-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("task_progress")
        .select("id, task_id, current_count, target_count, progress_type")
        .eq("user_id", user.id)
        .eq("tracked_date", today);
      if (error) throw error;
      return (data || []) as TaskProgress[];
    },
    enabled: !!user,
  });

  const getTaskProgress = (taskId: string): TaskProgress | undefined => {
    return taskProgress.find((p) => p.task_id === taskId);
  };

  const isTrackableTask = (title: string): boolean => {
    return !!TRACKABLE_TASKS[title];
  };

  const canComplete = (task: { id: string; title: string; is_completed: boolean }): boolean => {
    if (task.is_completed) return false;
    const trackable = TRACKABLE_TASKS[task.title];
    if (!trackable) return true; // off-site tasks can always be manually completed
    const progress = getTaskProgress(task.id);
    if (!progress) return false;
    return progress.current_count >= progress.target_count;
  };

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error("Not authenticated");
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.is_completed) throw new Error("Task already completed");

      if (!canComplete(task)) {
        throw new Error("Task progress not yet complete");
      }

      const { error: taskError } = await supabase
        .from("tasks")
        .update({ is_completed: true })
        .eq("id", taskId);
      if (taskError) throw taskError;

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

      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-progress"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${task.credits_reward} credits!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Cannot Complete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCreditsToday = tasks.filter((t) => t.is_completed).reduce((sum, t) => sum + t.credits_reward, 0);

  return {
    tasks,
    isLoading,
    completeTask,
    completedCount,
    totalCreditsToday,
    getTaskProgress,
    isTrackableTask,
    canComplete,
  };
}
