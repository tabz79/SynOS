import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Default to 'light' mode unless explicitly chosen by user
    const [theme, setTheme] = useState(() => {
        const isExplicit = localStorage.getItem('synos_theme_explicit') === 'true';
        if (isExplicit) {
            return localStorage.getItem('synos_theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove previous classes
        root.classList.remove('light', 'dark');

        // Apply current theme
        root.classList.add(theme);

        // Persist
        localStorage.setItem('synos_theme', theme);
    }, [theme]);

    const handleSetTheme = (newTheme) => {
        localStorage.setItem('synos_theme_explicit', 'true');
        setTheme(newTheme);
    };

    const value = {
        theme,
        setTheme: handleSetTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
