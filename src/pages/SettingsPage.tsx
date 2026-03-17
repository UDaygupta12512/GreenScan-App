import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getLocalUserPreferences,
  saveLocalUserPreferences,
  type LocalUserPreferences,
} from "@/lib/local-fallback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Moon, Sun, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

const healthGoalsOptions = [
  "Weight Management",
  "Heart Health",
  "Digestive Health",
  "Energy & Vitality",
  "Immune Support",
  "Mental Clarity",
];

const dietaryOptions = [
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Low Sugar",
  "Low Sodium",
  "Organic Only",
];

const parseAge = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    return null;
  }

  const ageNumber = Number(trimmed);
  if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 100) {
    return null;
  }

  return ageNumber;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const [localPreferences, setLocalPreferences] =
    useState<LocalUserPreferences | null>(getLocalUserPreferences);
  const userPreferences = useQuery(
    api.userPreferences.getUserPreferences,
    convexAuthenticated ? {} : "skip",
  );

  const savePreferences = useMutation(api.userPreferences.saveUserPreferences);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [sustainabilityFocus, setSustainabilityFocus] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const resolvedPreferences = userPreferences ?? localPreferences;

  useEffect(() => {
    if (resolvedPreferences) {
      setName(resolvedPreferences.name || "");
      setAge(resolvedPreferences.age?.toString() || "");
      setHealthGoals(resolvedPreferences.healthGoals || []);
      setDietaryRestrictions(resolvedPreferences.dietaryRestrictions || []);
      setSustainabilityFocus(resolvedPreferences.sustainabilityFocus || false);
    }
  }, [resolvedPreferences]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleHealthGoalToggle = (goal: string) => {
    setHealthGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleDietaryToggle = (restriction: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleSave = async () => {
    const normalizedName = name.trim();
    const ageNum = parseAge(age);

    if (!normalizedName) {
      toast.error("Please enter your name");
      return;
    }

    if (normalizedName.length > 80) {
      toast.error("Name must be 80 characters or fewer");
      return;
    }

    if (ageNum === null) {
      toast.error("Please enter a valid age between 1 and 100");
      return;
    }

    try {
      setIsSaving(true);

      await savePreferences({
        name: normalizedName,
        age: ageNum,
        healthGoals,
        dietaryRestrictions,
        sustainabilityFocus,
      });

      const localSaved = saveLocalUserPreferences({
        name: normalizedName,
        age: ageNum,
        healthGoals,
        dietaryRestrictions,
        sustainabilityFocus,
      });
      setLocalPreferences(localSaved);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings to cloud, using local fallback:", error);
      const localSaved = saveLocalUserPreferences({
        name: normalizedName,
        age: ageNum,
        healthGoals,
        dietaryRestrictions,
        sustainabilityFocus,
      });
      setLocalPreferences(localSaved);
      toast.success("Settings saved locally.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            aria-label="Go back to home"
            className="bg-white/10 hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile Section */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base mb-2 block">Name</Label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-lg border-2 border-white/20 bg-white/5 focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div>
                <Label htmlFor="age" className="text-base mb-2 block">Age</Label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 rounded-lg border-2 border-white/20 bg-white/5 focus:border-primary focus:outline-none transition-all"
                  />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <h2 className="text-2xl font-bold mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Toggle dark theme</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
            </div>
          </Card>

          {/* Health Goals */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <h2 className="text-2xl font-bold mb-4">Health Goals</h2>
            <div className="grid grid-cols-2 gap-3">
              {healthGoalsOptions.map((goal) => (
                <div
                  key={goal}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    healthGoals.includes(goal)
                      ? "border-primary bg-primary/10"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => handleHealthGoalToggle(goal)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={healthGoals.includes(goal)} />
                    <Label className="cursor-pointer text-sm">{goal}</Label>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Dietary Preferences */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <h2 className="text-2xl font-bold mb-4">Dietary Preferences</h2>
            <div className="grid grid-cols-2 gap-3">
              {dietaryOptions.map((option) => (
                <div
                  key={option}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    dietaryRestrictions.includes(option)
                      ? "border-primary bg-primary/10"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => handleDietaryToggle(option)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={dietaryRestrictions.includes(option)} />
                    <Label className="cursor-pointer text-sm">{option}</Label>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sustainability */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <h2 className="text-2xl font-bold mb-4">Sustainability Focus</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Prioritize Eco-Friendly Products</p>
                <p className="text-sm text-muted-foreground">
                  Highlight sustainability scores
                </p>
              </div>
              <Switch
                checked={sustainabilityFocus}
                onCheckedChange={setSustainabilityFocus}
              />
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="p-6 bg-white/10 backdrop-blur-md border-2 border-gray-400 dark:border-white/30">
            <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-white/5 border-white/20 hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                <span className="text-2xl">📊</span>
                <span>Stats & Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-white/5 border-white/20 hover:bg-white/10"
                onClick={() => navigate("/compare")}
              >
                <span className="text-2xl">⚖️</span>
                <span>Compare Products</span>
              </Button>
            </div>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </motion.div>
      </main>

      <BottomNav active="settings" />
    </div>
  );
}