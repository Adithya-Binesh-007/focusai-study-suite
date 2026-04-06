import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100];

export function useStreakTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tracked = useRef(false);

  useEffect(() => {
    if (!user || tracked.current) return;
    tracked.current = true;

    (async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("last_active_date, streak_count, total_credits")
        .eq("user_id", user.id)
        .single();

      if (error || !profile) return;

      const today = new Date().toISOString().split("T")[0];
      if (profile.last_active_date === today) return; // already tracked today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const isConsecutive = profile.last_active_date === yesterdayStr;
      const newStreak = isConsecutive ? profile.streak_count + 1 : 1;

      // Check if new streak hits a milestone
      const isMilestone = STREAK_MILESTONES.includes(newStreak);
      const bonusCredits = isMilestone ? 5 : 0;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          last_active_date: today,
          streak_count: newStreak,
          total_credits: profile.total_credits + bonusCredits,
        })
        .eq("user_id", user.id);

      if (updateError) return;

      // Record milestone credit transaction
      if (isMilestone) {
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "earned" as const,
          amount: 5,
          description: `🔥 ${newStreak}-day streak milestone reward!`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    })();
  }, [user, queryClient]);
}
