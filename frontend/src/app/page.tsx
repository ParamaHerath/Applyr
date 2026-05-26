"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, Briefcase, Sparkles, Link as LinkIcon, FileText, MessageSquare, LayoutTemplate } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: LayoutTemplate,
    title: "Intelligent Job Tracker",
    description: "Keep your job search organized with our dynamic Kanban board. Move applications seamlessly from Draft to Offer, and store interview notes in a detailed view."
  },
  {
    icon: LinkIcon,
    title: "1-Click URL Parsing",
    description: "Simply paste a job link and we'll instantly extract the role, company name, and key skills required—no tedious manual entry needed."
  },
  {
    icon: FileText,
    title: "AI Resume Tailoring",
    description: "Align your resume with the job description using our interactive workspace. Instantly get match scores, missing keyword suggestions, and tailored bullet points."
  },
  {
    icon: MessageSquare,
    title: "Smart Interview Prep",
    description: "Walk into your next interview with confidence. Generate customized technical questions based on the job role, and practice with AI guidance."
  },
  {
    icon: BarChart2,
    title: "Advanced Analytics",
    description: "Visualize your success funnel. Track your application velocity and identify bottlenecks in your process with beautiful, actionable charts."
  },
  {
    icon: Briefcase,
    title: "Resume Management",
    description: "Store and manage your base resumes securely. Seamlessly switch between LaTeX and standard PDF/Text formats when tailoring your applications."
  }
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 w-full h-full bg-background overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        </div>

        <section className="container mx-auto max-w-screen-xl px-4 flex flex-col items-center justify-center text-center min-h-[calc(100dvh-4rem)] py-12">
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
            Applyr is the premium platform to organize your job search. Track applications, instantly parse job listings, tailor your resume, and prepare for interviews all in one seamless workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center w-full"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="rounded-md w-full sm:w-auto whitespace-nowrap px-8">
                Start Tracking Free
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </Link>
          </motion.div>
        </section>

        <section className="container mx-auto max-w-screen-xl px-4 py-24 border-t border-border/50">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold mb-4"
            >
              Everything you need to land your dream job
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              A complete suite of tools designed to streamline every step of your application journey.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm flex flex-col text-left hover:bg-card/60 transition-colors duration-300 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl ring-1 ring-primary/20 shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-16 mt-auto">
        <div className="container mx-auto max-w-screen-xl px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="font-bold tracking-tight text-xl">Applyr</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              The premium platform to organize your job search, tailor your resumes, and land your dream job faster.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#" className="hover:text-primary transition-colors">Job Tracker</Link>
              <Link href="#" className="hover:text-primary transition-colors">AI Tailoring</Link>
              <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Blog</Link>
              <Link href="#" className="hover:text-primary transition-colors">Help Center</Link>
              <Link href="#" className="hover:text-primary transition-colors">Interview Guides</Link>
              <Link href="#" className="hover:text-primary transition-colors">API Docs</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto max-w-screen-xl px-4 mt-16 pt-8 border-t border-border/40 text-center md:text-left text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} Applyr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
