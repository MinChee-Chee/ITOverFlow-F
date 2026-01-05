"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface ThemeContextType {
  mode: string;
  setMode: (mode: string) => void;
}

// Provide a default context value to prevent undefined errors
const defaultThemeContext: ThemeContextType = {
  mode: 'light',
  setMode: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme synchronously to match the blocking script in layout
  const getInitialTheme = (): string => {
    if (typeof window === 'undefined') return 'light';
    
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark' || theme === 'light') {
        return theme;
      }
      // If no theme in localStorage, check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  };

  const [mode, setMode] = useState<string>(getInitialTheme);

  // Initialize theme on mount and sync with DOM
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleThemeChange = () => {
      if(
        localStorage.theme === 'dark' || 
        (!("theme" in localStorage) && 
        window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        setMode('dark');
        document.documentElement.classList.add('dark');
      } else {
        setMode('light');
        document.documentElement.classList.remove('dark');
      }
    };

    // Sync with what the blocking script already set
    const currentTheme = getInitialTheme();
    if (currentTheme !== mode) {
      setMode(currentTheme);
    }
    
    // Ensure DOM class matches state
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Listen for theme changes in other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        handleThemeChange();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!("theme" in localStorage)) {
        handleThemeChange();
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []) // Empty dependency array - only run on mount
  
  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Context will always have a value now (either from provider or default)
  return context;
}