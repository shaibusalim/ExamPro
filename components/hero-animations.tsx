"use client"

import { useEffect, useRef } from "react"

export function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

export function FloatingCard() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent rounded-2xl animate-pulse"></div>
    </div>
  )
}

export function TypewriterText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const letters = text.split("")
    container.innerHTML = ""

    letters.forEach((letter, index) => {
      const span = document.createElement("span")
      span.textContent = letter
      span.style.opacity = "0"
      span.style.animation = `typewriter 0.05s ease forwards`
      span.style.animationDelay = `${index * 0.05}s`
      container.appendChild(span)
    })
  }, [text])

  return <span ref={containerRef} />
}
