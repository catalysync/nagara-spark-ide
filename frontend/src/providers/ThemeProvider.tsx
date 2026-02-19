import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ColorScheme = 'light' | 'dark'

interface ThemeContextValue {
  colorScheme: ColorScheme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'dark',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('nagara-theme')
    return (saved === 'light' || saved === 'dark') ? saved : 'dark'
  })

  const toggleTheme = useCallback(() => {
    setColorScheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('nagara-theme', next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
