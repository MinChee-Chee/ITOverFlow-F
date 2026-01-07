"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface ThemeContextType {
  mode: string;
  setMode: (mode: string) => void;
  resolvedMode: string; // The actual theme being used (resolves 'system' to 'dark' or 'light')
}

// Provide a default context value to prevent undefined errors
const defaultThemeContext: ThemeContextType = {
  mode: 'light',
  setMode: () => {},
  resolvedMode: 'light',
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Get stored mode (what user selected: 'dark', 'light', or 'system')
  const getStoredMode = (): string => {
    if (typeof window === 'undefined') return 'light';
    
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark' || theme === 'light') {
        return theme;
      }
      // No theme stored means system mode
      return 'system';
    } catch {
      return 'light';
    }
  };
  
  // Get resolved mode (actual theme being used, resolves 'system' to 'dark' or 'light')
  const getResolvedMode = (): string => {
    if (typeof window === 'undefined') return 'light';
    
    try {
      const storedMode = localStorage.getItem('theme');
      if (storedMode === 'dark' || storedMode === 'light') {
        return storedMode;
      }
      // System mode - use system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  };

  const [mode, setModeState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'light';
    return getStoredMode();
  });
  
  const [resolvedMode, setResolvedMode] = useState<string>(() => {
    if (typeof window === 'undefined') return 'light';
    return getResolvedMode();
  });

  // Custom setMode that updates state, localStorage, and DOM
  const setMode = (newMode: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Update localStorage
      if (newMode !== 'system') {
        localStorage.setItem('theme', newMode);
      } else {
        localStorage.removeItem('theme');
      }
      
      // Update state (store the selected mode, which could be 'system')
      setModeState(newMode);
      
      // Determine actual theme to apply
      const actualTheme = newMode === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : newMode;
      
      setResolvedMode(actualTheme);
      
      // Update DOM immediately
      if (actualTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  // Initialize theme on mount and sync with DOM
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Initial sync on mount
    const storedMode = getStoredMode();
    const currentResolved = getResolvedMode();
    
    if (storedMode !== mode) {
      setModeState(storedMode);
    }
    
    if (currentResolved !== resolvedMode) {
      setResolvedMode(currentResolved);
    }
    
    // Ensure DOM class matches resolved mode
    if (currentResolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Only run on mount

  // Listen for external theme changes (other tabs, system preference)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleThemeChange = () => {
      const stored = getStoredMode();
      const resolved = getResolvedMode();
      
      setModeState(stored);
      setResolvedMode(resolved);
      
      // Update DOM
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
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
      const stored = localStorage.getItem('theme');
      if (!stored || stored === 'system') {
        handleThemeChange();
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []); // Only set up listeners once
  
  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Context will always have a value now (either from provider or default)
  return context;
}