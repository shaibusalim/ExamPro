"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, CheckCircle2, Sparkles, BarChart3 } from "lucide-react"
import { AnimatedGrid } from "./hero-animations"

export function HeroSection() {
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 space-y-12 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8 z-10 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-sm font-medium text-foreground animate-scale-in backdrop-blur-md border border-primary/20">
            <Sparkles className="w-4 h-4 text-secondary animate-spin-slow" />
            <span>The Future of Education Technology</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-balance leading-tight">
              Master Computing <span className="gradient-text inline-block animate-pulse-glow">with Confidence</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary rounded-full animate-slide-in-left"></div>
          </div>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-balance leading-relaxed animate-fade-in-delay">
            ExamPro is the ultimate exam preparation platform. Create, manage, and ace exams aligned with GES Computing
            curriculum for Basic 7 & 8 students with real-time scoring and instant feedback.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 animate-slide-up-delay">
            <Link href="/register?role=teacher">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/50 text-white border-0 px-8 group w-full sm:w-auto transition-all duration-300 hover:scale-105"
              >
                For Teachers
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/register?role=student">
              <Button
                size="lg"
                variant="outline"
                className="px-8 group hover:bg-secondary/10 bg-transparent w-full sm:w-auto transition-all duration-300 hover:scale-105 border-primary/50"
              >
                For Students
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-8 text-sm text-muted-foreground animate-fade-in-delay-2">
            <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg backdrop-blur-md">
              <Users className="w-5 h-5 text-secondary" />
              <span>500+ educators trust us</span>
            </div>
            <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>100% GES Aligned</span>
            </div>
          </div>
        </div>

        {/* Right Hero Image */}
        <div className="relative h-96 md:h-full min-h-96 group animate-fade-in-right">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 rounded-2xl blur-3xl animate-pulse"></div>

          {/* Glassmorphism card */}
          <div className="relative glass-effect rounded-2xl p-1 h-full border border-primary/20 backdrop-blur-xl overflow-hidden">
            {/* Grid background */}
            <AnimatedGrid />

            {/* Main image container */}
            <div className="relative h-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20">
              {/* Floating shapes inside */}
              <div className="absolute top-6 left-6 w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-xl opacity-20 animate-float blur-xl"></div>
              <div
                className="absolute bottom-12 right-6 w-32 h-32 bg-gradient-to-tr from-secondary to-accent rounded-full opacity-15 animate-float blur-2xl"
                style={{ animationDelay: "1s" }}
              ></div>

              {/* Dashboard preview content */}
              <div className="flex flex-col items-center justify-center h-full space-y-6 p-8 relative z-10">
                <div className="space-y-4 w-full max-w-sm">
                  {/* Fake dashboard header */}
                  <div className="glass-effect rounded-lg p-4 backdrop-blur-md border border-primary/20 animate-slide-in-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary"></div>
                      <div className="space-y-1 flex-1">
                        <div className="h-2 bg-primary/20 rounded-full w-24 animate-pulse"></div>
                        <div className="h-2 bg-secondary/20 rounded-full w-16"></div>
                      </div>
                    </div>
                  </div>

                  {/* Fake stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="glass-effect rounded-lg p-3 backdrop-blur-md border border-secondary/20 animate-slide-in-left"
                      style={{ animationDelay: "0.1s" }}
                    >
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="text-lg font-bold text-secondary">85%</div>
                    </div>
                    <div
                      className="glass-effect rounded-lg p-3 backdrop-blur-md border border-accent/20 animate-slide-in-left"
                      style={{ animationDelay: "0.2s" }}
                    >
                      <div className="text-xs text-muted-foreground">Time Left</div>
                      <div className="text-lg font-bold text-accent">5:32</div>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div
                    className="glass-effect rounded-lg p-4 backdrop-blur-md border border-accent/20 space-y-2 animate-slide-in-left"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exam Progress</span>
                      <span className="text-primary font-semibold">12/15</span>
                    </div>
                    <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Floating icon */}
                <div className="absolute top-1/3 right-8 text-primary/30 animate-bounce">
                  <BarChart3 className="w-24 h-24" />
                </div>
              </div>
            </div>

            {/* Border gradient animation */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/50 via-secondary/50 to-accent/50 -z-10 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
          </div>

          {/* Glow effect on hover */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-20"></div>
        </div>
      </div>
    </section>
  )
}
