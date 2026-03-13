import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Coins, Upload, CheckCircle, Flame, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tasks, completedCount } = useTasks();

  const stats = [
    { icon: Coins, label: "Total Credits", value: profile?.total_credits ?? 0, color: "text-warning" },
    { icon: Upload, label: "AI Uploads Left", value: profile?.daily_uploads_remaining ?? 0, color: "text-primary" },
    { icon: CheckCircle, label: "Tasks Done Today", value: `${completedCount}/${tasks.length}`, color: "text-success" },
    { icon: Flame, label: "Study Streak", value: `${profile?.streak_count ?? 0} days`, color: "text-destructive" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">
          Welcome back, <span className="gradient-text">{profile?.display_name || user?.email?.split("@")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Ready to study? Here's your dashboard overview.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
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

      {/* Tasks Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Today's Tasks</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tasks">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount} of {tasks.length} completed</span>
              <span>{tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</span>
            </div>
            <Progress value={tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0} />
            <div className="space-y-2 mt-4">
              {tasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    task.is_completed ? "bg-muted/50 opacity-60" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-4 w-4 ${task.is_completed ? "text-success" : "text-muted-foreground"}`} />
                    <span className={`text-sm ${task.is_completed ? "line-through" : ""}`}>{task.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.difficulty === "easy" ? "bg-success/10 text-success" :
                    task.difficulty === "medium" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    +{task.credits_reward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/assistant">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">AI Study Assistant</h3>
                <p className="text-sm text-muted-foreground">Ask questions, generate notes, prepare for exams</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/credits">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Credits & Upgrades</h3>
                <p className="text-sm text-muted-foreground">Manage credits and upgrade AI usage</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
