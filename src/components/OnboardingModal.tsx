import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveLocalUserPreferences } from "@/lib/local-fallback";
import { toast } from "sonner";
import { X } from "lucide-react";

interface OnboardingModalProps {
  onComplete: () => void;
  onClose: () => void;
}

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

export function OnboardingModal({ onComplete, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [sustainabilityFocus, setSustainabilityFocus] = useState(false);

  const savePreferences = useMutation(api.userPreferences.saveUserPreferences);

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

  const handleComplete = async () => {
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

    const preferencesPayload = {
      name: normalizedName,
      age: ageNum,
      healthGoals,
      dietaryRestrictions,
      sustainabilityFocus,
    };

    try {
      await savePreferences(preferencesPayload);
      saveLocalUserPreferences(preferencesPayload);
      toast.success("Preferences saved successfully!");
      onComplete();
    } catch (error) {
      console.error("Failed to save preferences to cloud, using local fallback:", error);
      saveLocalUserPreferences(preferencesPayload);
      toast.success("Preferences saved locally.");
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl bg-white/80 dark:bg-white/10 backdrop-blur-md border-white/20 p-8 relative">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  Welcome to GreenScan! 🌱
                </h2>
                <p className="text-muted-foreground">
                  Let's start by getting to know you
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-base mb-2 block">Your Name</Label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="age" className="text-base mb-2 block">Your Age</Label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button onClick={() => {
                  if (!name.trim()) {
                    toast.error("Please enter your name");
                    return;
                  }
                  if (parseAge(age) === null) {
                    toast.error("Please enter a valid age between 1 and 100");
                    return;
                  }
                  setStep(1);
                }} size="lg">
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  Welcome to GreenScan! 🌱
                </h2>
                <p className="text-muted-foreground">
                  Let's personalize your experience. What are your health goals?
                </p>
              </div>

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
                      <Label className="cursor-pointer">{goal}</Label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-3">
                <Button onClick={() => setStep(0)} variant="outline">
                  Back
                </Button>
                <Button onClick={() => setStep(2)} size="lg">
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  Dietary Preferences 🥗
                </h2>
                <p className="text-muted-foreground">
                  Select any dietary restrictions or preferences
                </p>
              </div>

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
                      <Label className="cursor-pointer">{option}</Label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-3">
                <Button onClick={() => setStep(1)} variant="outline">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} size="lg">
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  Sustainability Focus 🌍
                </h2>
                <p className="text-muted-foreground">
                  Do you want to prioritize eco-friendly products?
                </p>
              </div>

              <div className="space-y-4">
                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    sustainabilityFocus
                      ? "border-2 border-primary bg-primary/10"
                      : "border-2 border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => setSustainabilityFocus(true)}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox checked={sustainabilityFocus} />
                    <div>
                      <h3 className="font-semibold mb-1">Yes, prioritize sustainability</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll highlight eco-scores and suggest environmentally friendly alternatives
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    !sustainabilityFocus
                      ? "border-2 border-primary bg-primary/10"
                      : "border-2 border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => setSustainabilityFocus(false)}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox checked={!sustainabilityFocus} />
                    <div>
                      <h3 className="font-semibold mb-1">Focus on health only</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll prioritize nutritional information and health scores
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between gap-3">
                <Button onClick={() => setStep(2)} variant="outline">
                  Back
                </Button>
                <Button onClick={handleComplete} size="lg">
                  Complete Setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-all ${
                s === step ? "bg-primary w-8" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
