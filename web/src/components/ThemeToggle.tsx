"use client"

import React from "react"
import { Button } from "@/components/ui/button"

const THEME_KEY = "theme-preference"

function getInitialTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === "dark" || stored === "light") return stored
    // fallback to prefers-color-scheme
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"
  } catch {
    // ignore
  }
  return "light"
}

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">(() =>
    typeof window !== "undefined" ? getInitialTheme() : "light"
  )

  React.useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? "Light" : "Dark"}
      </Button>
    </div>
  )
}
