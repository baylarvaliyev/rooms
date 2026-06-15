'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
})

export function useTheme() { return useContext(ThemeContext) }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('rooms-theme') as Theme | null
    // Also respect system preference if no saved preference
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved || (systemDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('rooms-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
