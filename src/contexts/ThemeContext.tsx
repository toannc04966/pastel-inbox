import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  domainAccent: string;
  setDomainAccent: (domain: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'themePreference';

// Generate a stable pastel hue from a string (domain)
function generateAccentHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map to a hue value between 0 and 360
  return Math.abs(hash) % 360;
}

// Check if current time is after 18:00
function isAfter18(): boolean {
  return new Date().getHours() >= 18;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      return stored || 'system';
    }
    return 'system';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [domainAccent, setDomainAccentState] = useState<string>('250'); // Default lilac hue

  const resolveTheme = useCallback((): 'light' | 'dark' => {
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Auto-dark after 18:00 when system preference is not forcing light
    if (isAfter18() && !window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'dark';
    }
    
    return prefersDark ? 'dark' : 'light';
  }, [themePreference]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    localStorage.setItem(STORAGE_KEY, preference);
  }, []);

  const setDomainAccent = useCallback((domain: string) => {
    if (!domain || domain === '__all__') {
      setDomainAccentState('250'); // Default lilac
      return;
    }
    const hue = generateAccentHue(domain);
    setDomainAccentState(String(hue));
  }, []);

  // Apply theme to document
  useEffect(() => {
    const resolved = resolveTheme();
    setTheme(resolved);

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
  }, [resolveTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === 'system') {
        const resolved = resolveTheme();
        setTheme(resolved);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference, resolveTheme]);

  // Apply domain accent as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--domain-accent-hue', domainAccent);
  }, [domainAccent]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference,
        domainAccent,
        setDomainAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
