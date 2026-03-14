import { useProfile } from "@/hooks/useProfile";
import { useCredits } from "@/hooks/useCredits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Coins, Upload, ArrowUp, ArrowDown, Clock } from "lucide-react";

export default function Credits() {
  const { profile } = useProfile();
  const { transactions, upgrade } = useCredits();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credits & Upgrades</h1>
        <p className="text-muted-foreground mt-1">Manage your credits and boost your AI usage.</p>
      </div>

      {/* Balance */}
      <Card className="gradient-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Credits</p>
              <p className="text-4xl font-bold">{profile?.total_credits ?? 0}</p>
            </div>
            <Coins className="h-10 w-10 opacity-50" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
            <Upload className="h-4 w-4" />
            {profile?.daily_uploads_remaining ?? 0} photo uploads remaining today
          </div>
        </CardContent>
      </Card>

      {/* Upgrades */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">+5 Photo Uploads</CardTitle>
            <CardDescription>Costs 50 credits • Once per day</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => upgrade.mutate("plus_5")}
              disabled={upgrade.isPending || (profile?.total_credits ?? 0) < 50}
            >
              <Coins className="h-4 w-4 mr-2" /> Upgrade for 50 Credits
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">+10 Photo Uploads</CardTitle>
            <CardDescription>Costs 100 credits • Once per day</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => upgrade.mutate("plus_10")}
              disabled={upgrade.isPending || (profile?.total_credits ?? 0) < 100}
            >
              <Coins className="h-4 w-4 mr-2" /> Upgrade for 100 Credits
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            )}
            {transactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === "earned" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    {tx.type === "earned" ? (
                      <ArrowUp className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
