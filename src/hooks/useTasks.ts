import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const STUDY_TASKS = [
  { title: "Study for 30 minutes", description: "Focus on your weakest subject for 30 uninterrupted minutes" },
  { title: "Revise yesterday's notes", description: "Go through notes from your last study session" },
  { title: "Solve 5 math problems", description: "Practice with 5 problems from your current topic" },
  { title: "Read 10 pages", description: "Read 10 pages from your textbook or study material" },
  { title: "Practice previous exam questions", description: "Attempt at least 3 past exam questions" },
  { title: "Create flashcards", description: "Make 10 flashcards for key concepts" },
  { title: "Summarize a chapter", description: "Write a one-page summary of a chapter you studied" },
  { title: "Teach a concept", description: "Explain a concept you learned to someone or write it out" },
  { title: "Watch an educational video", description: "Watch a lecture or tutorial video on your topic" },
  { title: "Organize study materials", description: "Sort and organize your notes and files" },
  { title: "Complete a practice quiz", description: "Take an online quiz on your current subject" },
  { title: "Write key formulas", description: "List all important formulas for your current subject" },
  { title: "Review mistakes", description: "Go through past errors and understand corrections" },
  { title: "Mind map a topic", description: "Create a mind map for a complex topic" },
  { title: "Study group session", description: "Discuss topics with classmates for 20 minutes" },
];

type Difficulty = "easy" | "medium" | "difficult";

function generateDailyTasks(userId: string) {
  const shuffled = [...STUDY_TASKS].sort(() => Math.random() - 0.5).slice(0, 10);
  const difficulties: Difficulty[] = [
    "easy", "easy", "easy", "easy",
    "medium", "medium", "medium", "medium",
    "difficult", "difficult",
  ].sort(() => Math.random() - 0.5);

  const rewards: Record<Difficulty, number> = { easy: 5, medium: 10, difficult: 15 };

  return shuffled.map((task, i) => ({
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
        return inserted || [];
      }
      return data;
    },
    enabled: !!user,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error("Not authenticated");
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.is_completed) throw new Error("Task already completed");

      const { error: taskError } = await supabase
        .from("tasks")
        .update({ is_completed: true })
        .eq("id", taskId);
      if (taskError) throw taskError;

      const { error: profileError } = await supabase.rpc("increment_credits" as never, {
        _user_id: user.id,
        _amount: task.credits_reward,
      } as never);

      // Fallback: update credits directly if RPC doesn't exist
      if (profileError) {
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
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${task.credits_reward} credits!`,
      });
    },
  });

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCreditsToday = tasks.filter((t) => t.is_completed).reduce((sum, t) => sum + t.credits_reward, 0);

  return { tasks, isLoading, completeTask, completedCount, totalCreditsToday };
}
