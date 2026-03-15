import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Brain, ArrowLeft } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // We use a fake email derived from username for Supabase Auth
  const toEmail = (u: string) => `${u.toLowerCase().trim()}@focusai.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = toEmail(username);
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: username },
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now sign in." });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your FocusAI account" : "Start your AI-powered study journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              )}
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers, and underscores only"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
            <div className="mt-2 text-center">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Home
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
