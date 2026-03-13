import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Coins, Star } from "lucide-react";

const difficultyColors = {
  easy: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  difficult: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Tasks() {
  const { tasks, isLoading, completeTask, completedCount, totalCreditsToday } = useTasks();

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Clock className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Tasks</h1>
        <p className="text-muted-foreground mt-1">Complete tasks to earn credits. Tasks reset daily.</p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{completedCount}/{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{totalCreditsToday}</p>
              <p className="text-sm text-muted-foreground">Credits Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round((completedCount / (tasks.length || 1)) * 100)}%</p>
              <p className="text-sm text-muted-foreground">Progress</p>
            </div>
          </div>
          <Progress value={(completedCount / (tasks.length || 1)) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className={task.is_completed ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      task.is_completed ? "bg-success/10" : "bg-muted"
                    }`}>
                      {task.is_completed ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${task.is_completed ? "line-through" : ""}`}>{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={difficultyColors[task.difficulty as keyof typeof difficultyColors]}>
                      {task.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Coins className="h-3 w-3 text-warning" />
                      +{task.credits_reward}
                    </div>
                    {!task.is_completed && (
                      <Button
                        size="sm"
                        className="gradient-primary"
                        onClick={() => completeTask.mutate(task.id)}
                        disabled={completeTask.isPending}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
