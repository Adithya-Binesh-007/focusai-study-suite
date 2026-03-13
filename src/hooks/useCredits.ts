import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upgrade = useMutation({
    mutationFn: async (upgradeType: "plus_5" | "plus_10") => {
      if (!user) throw new Error("Not authenticated");

      const cost = upgradeType === "plus_5" ? 50 : 100;
      const uploads = upgradeType === "plus_5" ? 5 : 10;
      const today = new Date().toISOString().split("T")[0];

      // Check if already used today
      const { data: existing } = await supabase
        .from("daily_upgrades")
        .select("id")
        .eq("user_id", user.id)
        .eq("upgrade_type", upgradeType)
        .eq("used_date", today);

      if (existing && existing.length > 0) {
        throw new Error("You already used this upgrade today");
      }

      // Check credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_credits, daily_uploads_remaining")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.total_credits < cost) {
        throw new Error("Not enough credits");
      }

      // Deduct and upgrade
      await supabase
        .from("profiles")
        .update({
          total_credits: profile.total_credits - cost,
          daily_uploads_remaining: profile.daily_uploads_remaining + uploads,
        })
        .eq("user_id", user.id);

      await supabase.from("daily_upgrades").insert({
        user_id: user.id,
        upgrade_type: upgradeType as string,
        used_date: today,
      });

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -cost,
        type: "spent" as const,
        description: `Upgraded: +${uploads} AI uploads`,
      });

      return { uploads, cost };
    },
    onSuccess: ({ uploads }) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      toast({ title: "Upgrade Applied! ⚡", description: `+${uploads} AI uploads added for today` });
    },
    onError: (error) => {
      toast({ title: "Upgrade Failed", description: error.message, variant: "destructive" });
    },
  });

  return { transactions, upgrade };
}
