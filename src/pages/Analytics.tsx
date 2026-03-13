import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Flame, Target, Brain, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const { data: weeklyTasks = [] } = useQuery({
    queryKey: ["weekly-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("tasks")
        .select("generated_date, is_completed")
        .eq("user_id", user.id)
        .gte("generated_date", sevenDaysAgo.toISOString().split("T")[0]);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: weeklyCredits = [] } = useQuery({
    queryKey: ["weekly-credits", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount, type, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString());
      return data || [];
    },
    enabled: !!user,
  });

  const { data: chatCount = 0 } = useQuery({
    queryKey: ["chat-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user");
      return count || 0;
    },
    enabled: !!user,
  });

  // Process weekly data for charts
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const taskChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const completed = weeklyTasks.filter((t) => t.generated_date === dateStr && t.is_completed).length;
    return { day: dayNames[d.getDay()], completed };
  });

  const creditChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const earned = weeklyCredits
      .filter((c) => c.created_at.startsWith(dateStr) && c.type === "earned")
      .reduce((sum, c) => sum + c.amount, 0);
    return { day: dayNames[d.getDay()], credits: earned };
  });

  const streakMilestones = [3, 7, 14, 30];
  const currentStreak = profile?.streak_count ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Study Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your productivity and progress over time.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: "Tasks This Week", value: weeklyTasks.filter((t) => t.is_completed).length },
          { icon: TrendingUp, label: "Credits Earned", value: weeklyCredits.filter((c) => c.type === "earned").reduce((s, c) => s + c.amount, 0) },
          { icon: Brain, label: "AI Questions", value: chatCount },
          { icon: Flame, label: "Streak", value: `${currentStreak} days` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Streak Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Flame className="h-5 w-5 text-destructive" /> Study Streak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {streakMilestones.map((m) => (
              <div
                key={m}
                className={`flex-1 text-center p-4 rounded-xl border ${
                  currentStreak >= m ? "gradient-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p className="text-2xl font-bold">{m}</p>
                <p className="text-xs opacity-80">day{m > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Tasks Completed</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Credits Earned</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={creditChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="credits" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
