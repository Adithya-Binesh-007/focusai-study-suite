import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, CheckCircle, Coins, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

const features = [
  { icon: Brain, title: "AI Study Assistant", desc: "Voice & text powered AI that generates notes, explanations, and exam prep" },
  { icon: CheckCircle, title: "Smart Tasks", desc: "10 daily study tasks with credits — stay productive and earn rewards" },
  { icon: Coins, title: "Credit System", desc: "Earn credits from tasks, unlock extra AI usage and premium features" },
  { icon: BarChart3, title: "Study Analytics", desc: "Track your study streaks, productivity, and weekly progress" },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FocusAI</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="gradient-primary">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Sign In</Link></Button>
                <Button asChild className="gradient-primary"><Link to="/auth">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm text-accent-foreground mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Student Productivity
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Your AI <span className="gradient-text">Study Partner</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Take notes with AI, prepare for exams, complete daily tasks, and earn credits — all in one place designed for students.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="gradient-primary text-lg px-8">
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Studying <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 FocusAI. Built for students, powered by AI.
        </div>
      </footer>
    </div>
  );
}
