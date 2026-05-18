"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, Briefcase, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 w-full h-full bg-background overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        </div>

        <section className="w-full max-w-screen-xl px-4 py-24 sm:py-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium mb-8 bg-background/50 backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            <span>The intelligent job tracker</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6"
          >
            Take control of your <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">
              job applications
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10"
          >
            Applyr is the premium platform to organize your job search. Track applications, log interviews, and monitor your progress all in one sleek dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="rounded-md" asChild>
              <Link href="/register">
                Start Tracking Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-md" asChild>
              <Link href="/dashboard">View Demo Dashboard</Link>
            </Button>
          </motion.div>
        </section>

        <section className="w-full max-w-screen-xl px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <div className="p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm flex flex-col items-start text-left">
              <div className="p-3 bg-primary/10 rounded-lg mb-4">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Centralized Tracking</h3>
              <p className="text-muted-foreground">Keep all your job applications in one place. No more messy spreadsheets. Just clean, organized data.</p>
            </div>
            <div className="p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm flex flex-col items-start text-left">
              <div className="p-3 bg-primary/10 rounded-lg mb-4">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Insightful Analytics</h3>
              <p className="text-muted-foreground">Visualize your success rate. See how many applications lead to interviews and offers at a glance.</p>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
