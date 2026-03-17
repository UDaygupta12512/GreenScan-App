import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const greetings = [
  "Small scans, giant leaps for our planet.",
  "Peel back the label. See the truth.",
  "Kind to your body. Kind to the Earth.",
  "Scan with purpose. Buy with confidence.",
  "Uncover the story behind every shelf.",
  "Your lens for a more honest world.",
];

interface DynamicGreetingProps {
  userName?: string;
}

export function DynamicGreeting({ userName }: DynamicGreetingProps) {
  const [currentGreeting, setCurrentGreeting] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGreeting((prev) => (prev + 1) % greetings.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Extract first name only
  const firstName = userName?.split(" ")[0] || "Guest";

  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Hello, {firstName}!
      </h2>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentGreeting}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
          className="text-muted-foreground text-lg"
        >
          {greetings[currentGreeting]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}