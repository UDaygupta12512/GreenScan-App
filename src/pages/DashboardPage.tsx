import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Scan, Leaf, Heart, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { getLocalScanHistory } from "@/lib/local-fallback";
import { getFavorites } from "@/lib/favorites";

const SCORE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  E: "#ef4444",
  "?": "#6b7280",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const scanHistoryResult = useQuery(
    api.products.getUserScanHistory,
    convexAuthenticated ? {} : "skip",
  );
  const cloudHistory = scanHistoryResult ?? [];
  const localHistory = getLocalScanHistory();
  const history = convexAuthenticated && cloudHistory.length > 0 ? cloudHistory : localHistory;
  const favorites = getFavorites();

  const stats = useMemo(() => {
    const nutriScoreDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    const ecoScoreDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    const weeklyMap: Record<string, number> = {};
    let nutriTotal = 0;
    let ecoTotal = 0;
    let nutriCount = 0;
    let ecoCount = 0;

    const scoreValue = (grade?: string) => {
      if (!grade) return 0;
      const g = grade.toUpperCase();
      return g === "A" ? 5 : g === "B" ? 4 : g === "C" ? 3 : g === "D" ? 2 : g === "E" ? 1 : 0;
    };

    for (const item of history) {
      // Nutri-Score distribution
      const ns = (item.nutriScore ?? "").toUpperCase();
      if (ns && nutriScoreDist[ns] !== undefined) {
        nutriScoreDist[ns]++;
        nutriTotal += scoreValue(ns);
        nutriCount++;
      }

      // Eco-Score distribution
      const es = (item.ecoScore ?? "").toUpperCase();
      if (es && ecoScoreDist[es] !== undefined) {
        ecoScoreDist[es]++;
        ecoTotal += scoreValue(es);
        ecoCount++;
      }

      // Weekly distribution
      const date = new Date(item._creationTime);
      const weekKey = `${date.getMonth() + 1}/${date.getDate()}`;
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
    }

    const nutriScoreData = Object.entries(nutriScoreDist).map(([name, value]) => ({ name, value }));
    const ecoScoreData = Object.entries(ecoScoreDist).map(([name, value]) => ({ name, value }));

    // Last 7 days
    const weeklyData: { name: string; scans: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      weeklyData.push({ name: key, scans: weeklyMap[key] || 0 });
    }

    const avgNutri = nutriCount > 0 ? nutriTotal / nutriCount : 0;
    const avgEco = ecoCount > 0 ? ecoTotal / ecoCount : 0;
    const avgNutriLabel = avgNutri >= 4.5 ? "A" : avgNutri >= 3.5 ? "B" : avgNutri >= 2.5 ? "C" : avgNutri >= 1.5 ? "D" : nutriCount > 0 ? "E" : "?";
    const avgEcoLabel = avgEco >= 4.5 ? "A" : avgEco >= 3.5 ? "B" : avgEco >= 2.5 ? "C" : avgEco >= 1.5 ? "D" : ecoCount > 0 ? "E" : "?";

    return { nutriScoreData, ecoScoreData, weeklyData, avgNutriLabel, avgEcoLabel, totalScans: history.length, totalFavorites: favorites.length };
  }, [history, favorites.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="mb-2">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Your scanning analytics and health journey</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Scan className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.totalScans}</p>
              <p className="text-xs text-muted-foreground">Total Scans</p>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Award className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-3xl font-bold">{stats.totalFavorites}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Heart className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold" style={{ color: SCORE_COLORS[stats.avgNutriLabel] }}>{stats.avgNutriLabel}</p>
              <p className="text-xs text-muted-foreground">Avg Nutri-Score</p>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Leaf className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold" style={{ color: SCORE_COLORS[stats.avgEcoLabel] }}>{stats.avgEcoLabel}</p>
              <p className="text-xs text-muted-foreground">Avg Eco-Score</p>
            </Card>
          </div>

          {/* Weekly Scans Chart */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Scans This Week</h3>
            </div>
            {stats.totalScans === 0 ? (
              <p className="text-center text-muted-foreground py-8">No scan data yet. Start scanning to see your activity!</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }} />
                  <Bar dataKey="scans" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Score Distribution */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h3 className="text-lg font-bold mb-4">Nutri-Score Distribution</h3>
              {stats.totalScans === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.nutriScoreData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                      {stats.nutriScoreData.map((entry) => (
                        <Cell key={entry.name} fill={SCORE_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <h3 className="text-lg font-bold mb-4">Eco-Score Distribution</h3>
              {stats.totalScans === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.ecoScoreData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                      {stats.ecoScoreData.map((entry) => (
                        <Cell key={entry.name} fill={SCORE_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-center" onClick={() => navigate("/home")}>
                <Scan className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium text-sm">Scan Product</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-center" onClick={() => navigate("/search")}>
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="font-medium text-sm">Search Products</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-center" onClick={() => navigate("/compare")}>
                <Heart className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="font-medium text-sm">Compare Products</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-center" onClick={() => navigate("/favorites")}>
                <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="font-medium text-sm">Favorites</p>
              </Card>
            </div>
          </Card>
        </motion.div>
      </main>
      <BottomNav active="dashboard" />
    </div>
  );
}
