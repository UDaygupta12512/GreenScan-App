import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scan, Leaf, Heart, Shield, Sparkles } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const primaryCtaLabel = isAuthenticated ? "Open Dashboard" : "Start Healthy Now";
  const secondaryCtaLabel = isAuthenticated ? "Go to Dashboard" : "Start Your Journey";

  const handleGetStarted = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-300/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-300/40 to-transparent rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-purple-300/40 to-transparent rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-pink-200/20 via-yellow-200/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]" />
      </div>

      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <button
            type="button"
            aria-label="Go to landing page"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src="/logo.svg" alt="GreenScan" className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight">GreenScan</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Your Health & Planet Companion</span>
            </div>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-3 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Scan. Discover.
          </h1>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-3 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Choose Better.
          </h1>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Eat Better.
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Make informed decisions about your food with instant health and sustainability insights
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-lg px-8 py-6"
            >
              <Scan className="mr-2 h-5 w-5" />
              {primaryCtaLabel}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 text-lg px-8 py-6"
            >
              Learn More
            </Button>
          </div>
        </motion.div>

        {/* Hero Image/Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
              <img 
                src="https://harmless-tapir-303.convex.cloud/api/storage/bcfe3dcf-fd5c-4595-a4c4-9ba163e95142" 
                alt="GreenScan App Preview" 
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Why Choose Us?
            </h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive product analysis at your fingertips
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all h-full">
                <div className="p-3 rounded-xl bg-green-500/20 w-fit mb-4">
                  <Leaf className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Sustainability</h3>
                <p className="text-muted-foreground mb-4">
                  Eco-scores, certifications, and environmental impact analysis
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Color-coded eco-ratings
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Certification tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Carbon footprint insights
                  </li>
                </ul>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all h-full">
                <div className="p-3 rounded-xl bg-blue-500/20 w-fit mb-4">
                  <Heart className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Health Level</h3>
                <p className="text-muted-foreground mb-4">
                  Nutri-scores, ingredient analysis, and nutritional quality
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    A-E health grading
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Processing level detection
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Ingredient warnings
                  </li>
                </ul>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all h-full">
                <div className="p-3 rounded-xl bg-red-500/20 w-fit mb-4">
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Allergen Safety</h3>
                <p className="text-muted-foreground mb-4">
                  Comprehensive allergen detection and warnings
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Instant allergen alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Cross-contamination info
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Dietary restriction matching
                  </li>
                </ul>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Card className="p-12 bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-md border-white/20 text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Ready to Make Better Choices?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands making informed decisions about their health and the planet
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-lg px-8 py-6"
            >
              <Scan className="mr-2 h-5 w-5" />
              {secondaryCtaLabel}
            </Button>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-white/5 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="GreenScan" className="h-6 w-6" />
              <span className="font-semibold">GreenScan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 GreenScan. Making the world healthier, one scan at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}