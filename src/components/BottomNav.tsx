import { useNavigate } from "react-router";
import { Scan, Search, History, Heart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = "scan" | "search" | "history" | "dashboard" | "settings" | "favorites" | "compare";

const NAV_ITEMS = [
  { id: "scan" as const, label: "Scan", icon: Scan, path: "/home" },
  { id: "search" as const, label: "Search", icon: Search, path: "/search" },
  { id: "history" as const, label: "History", icon: History, path: "/history" },
  { id: "favorites" as const, label: "Favorites", icon: Heart, path: "/favorites" },
  { id: "settings" as const, label: "Settings", icon: Settings, path: "/settings" },
];

export function BottomNav({ active }: { active: NavItem }) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-3">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 shadow-lg">
        <div className="flex items-center gap-4 md:gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="lg"
                onClick={() => navigate(item.path)}
                className={`flex-col h-auto py-1.5 hover:bg-white/10 rounded-full ${
                  isActive ? "bg-primary/20 dark:bg-white/10" : ""
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? "text-primary dark:text-white" : "text-gray-700 dark:text-white"}`} />
                <span className={`text-[10px] ${isActive ? "text-primary dark:text-white" : "text-gray-700 dark:text-white"}`}>
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
